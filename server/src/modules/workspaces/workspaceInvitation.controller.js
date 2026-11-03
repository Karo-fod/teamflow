import mongoose from "mongoose";
import WorkspaceInvitation from "./workspaceInvitation.model.js";
import WorkspaceMember from "./workspaceMember.model.js";
import Workspace from "./workspace.model.js";
import {
  INVITATION_TTL_MS,
  createInvitationToken,
  hashInvitationToken,
} from "./workspaceInvitation.utils.js";
import User from "../auth/user.model.js";
import { sendWorkspaceInvitation } from "../../services/email.service.js";
import { isObjectId } from "../../middleware/validateObjectId.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const activeInvitationFilter = () => ({
  acceptedAt: null,
  revokedAt: null,
  expiresAt: { $gt: new Date() },
});

// Route middleware already guarantees the caller is an owner or admin.
export const createWorkspaceInvitation = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { email, role = "member" } = req.body ?? {};
    const inviterId = req.userId;

    if (typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invitation role must be admin or member.",
      });
    }

    // Only owners may hand out admin rights.
    if (role === "admin" && req.workspaceMembership.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only the workspace owner can invite admins.",
      });
    }

    const invitedUser = await User.findOne({ email: normalizedEmail }).select("_id");

    if (invitedUser) {
      const existingMembership = await WorkspaceMember.exists({
        workspaceId,
        userId: invitedUser._id,
      });

      if (existingMembership) {
        return res.status(409).json({
          success: false,
          message: "This person is already a workspace member.",
        });
      }
    }

    const existingInvitation = await WorkspaceInvitation.findOne({
      workspaceId,
      email: normalizedEmail,
      ...activeInvitationFilter(),
    });

    if (existingInvitation) {
      return res.status(409).json({
        success: false,
        message:
          "An active invitation already exists for this email. Revoke it first to send a new one.",
      });
    }

    const rawToken = createInvitationToken();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const invitation = await WorkspaceInvitation.create({
      workspaceId,
      email: normalizedEmail,
      role,
      tokenHash: hashInvitationToken(rawToken),
      invitedBy: inviterId,
      expiresAt,
    });

    try {
      const inviter = await User.findById(inviterId).select("name").lean();

      await sendWorkspaceInvitation({
        to: normalizedEmail,
        inviterName: inviter?.name || "A TeamFlow teammate",
        workspaceName: req.workspace.name,
        role,
        token: rawToken,
        expiresAt,
      });
    } catch (emailError) {
      // Don't leave an active invitation nobody received.
      try {
        await WorkspaceInvitation.deleteOne({ _id: invitation._id, acceptedAt: null });
      } catch (cleanupError) {
        console.error("Failed to clean up unsent invitation:", cleanupError);
      }

      console.error("Workspace invitation email failed:", emailError);

      return res.status(502).json({
        success: false,
        message: "The invitation email could not be sent. Please try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message: `Invitation email sent to ${normalizedEmail}.`,
      invitation: {
        id: invitation._id.toString(),
        email: normalizedEmail,
        role,
        expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const acceptWorkspaceInvitation = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.userId;

    if (typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invitation token is required.",
      });
    }

    const tokenHash = hashInvitationToken(token.trim());

    const invitation = await WorkspaceInvitation.findOne({
      tokenHash,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: "This invitation is invalid, expired, or already used.",
      });
    }

    const user = await User.findById(userId).select("email");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (user.email.toLowerCase() !== invitation.email) {
      return res.status(403).json({
        success: false,
        message:
          "This invitation was sent to a different email address. Sign in with the invited email to accept it.",
      });
    }

    // Atomically claim the invitation so concurrent requests
    // cannot both accept it.
    const claimedInvitation = await WorkspaceInvitation.findOneAndUpdate(
      {
        _id: invitation._id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { acceptedAt: new Date() },
      },
      { new: true }
    );

    if (!claimedInvitation) {
      return res.status(409).json({
        success: false,
        message: "This invitation has already been used.",
      });
    }

    try {
      await WorkspaceMember.create({
        workspaceId: claimedInvitation.workspaceId,
        userId,
        role: claimedInvitation.role,
      });
    } catch (error) {
      // If membership already exists, don't leave the invitation
      // marked accepted.
      await WorkspaceInvitation.updateOne(
        { _id: claimedInvitation._id },
        { $set: { acceptedAt: null } }
      );

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You are already a member of this workspace.",
        });
      }

      throw error;
    }

    const workspace = await Workspace.findById(claimedInvitation.workspaceId)
      .select("name slug")
      .lean();

    return res.status(200).json({
      success: true,
      message: "You have joined the workspace.",
      workspaceId: claimedInvitation.workspaceId.toString(),
      workspace: workspace
        ? { id: workspace._id.toString(), name: workspace.name, slug: workspace.slug }
        : undefined,
      role: claimedInvitation.role,
    });
  } catch (error) {
    next(error);
  }
};
export const getWorkspaceInvitations = async (req, res, next) => {
  try {
    const invitations = await WorkspaceInvitation.find({
      workspaceId: req.params.workspaceId,
      ...activeInvitationFilter(),
    })
      .select("email role expiresAt createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      invitations: invitations.map((invitation) => ({
        id: invitation._id.toString(),
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const revokeWorkspaceInvitation = async (req, res, next) => {
  try {
    const { workspaceId, invitationId } = req.params;

    if (!isObjectId(invitationId)) {
      return res.status(400).json({ success: false, message: "Invalid invitation ID." });
    }

    const invitation = await WorkspaceInvitation.findOneAndUpdate(
      { _id: invitationId, workspaceId, acceptedAt: null, revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { new: true }
    );

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found or no longer active.",
      });
    }

    return res.status(200).json({ success: true, message: "Invitation revoked." });
  } catch (error) {
    next(error);
  }
};
