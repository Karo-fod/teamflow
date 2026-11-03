import WorkspaceMember from "./workspaceMember.model.js";
import Task from "../tasks/task.model.js";
import { isObjectId } from "../../middleware/validateObjectId.js";

export const getWorkspaceMembers = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const members = await WorkspaceMember.find({ workspaceId })
      .populate({
        path: "userId",
        select: "name email",
      })
      .sort({ joinedAt: 1 })
      .lean();

    const formattedMembers = members
      .filter((member) => member.userId)
      .map((member) => ({
        id: member.userId._id.toString(),
        membershipId: member._id.toString(),
        name: member.userId.name,
        email: member.userId.email,
        role: member.role,
        joinedAt: member.joinedAt,
      }));

    return res.status(200).json({
      success: true,
      members: formattedMembers,
    });
  } catch (error) {
    next(error);
  }
};

// Owner only: switch a member between "admin" and "member".
export const updateMemberRole = async (req, res, next) => {
  try {
    const { workspaceId, userId } = req.params;
    const { role } = req.body ?? {};

    if (!isObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be admin or member",
      });
    }

    const target = await WorkspaceMember.findOne({ workspaceId, userId });

    if (!target) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    if (target.role === "owner") {
      return res.status(400).json({
        success: false,
        message: "The workspace owner's role can't be changed",
      });
    }

    target.role = role;
    await target.save();

    req.app.get("io")?.to(`workspace:${workspaceId}`).emit("member:updated", {
      workspaceId,
      userId,
      role,
    });

    return res.status(200).json({
      success: true,
      message: "Member role updated",
      member: { id: userId, role },
    });
  } catch (error) {
    next(error);
  }
};

// Owners can remove anyone but themselves, admins can remove plain members,
// and anyone except the owner can remove themselves (leave).
export const removeWorkspaceMember = async (req, res, next) => {
  try {
    const { workspaceId, userId } = req.params;

    if (!isObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const target = await WorkspaceMember.findOne({ workspaceId, userId });

    if (!target) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const actorRole = req.workspaceMembership.role;
    const isSelf = userId === req.userId;

    if (target.role === "owner") {
      return res.status(400).json({
        success: false,
        message: "The workspace owner can't be removed or leave the workspace",
      });
    }

    const allowed =
      isSelf ||
      actorRole === "owner" ||
      (actorRole === "admin" && target.role === "member");

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to remove this member",
      });
    }

    await target.deleteOne();

    // Their tasks go back to "unassigned".
    await Task.updateMany(
      { workspaceId, assigneeId: userId },
      { $set: { assigneeId: null } }
    );

    const io = req.app.get("io");

    if (io) {
      // Stop delivering this workspace's live events to the removed user.
      io.in(`user:${userId}`).socketsLeave(`workspace:${workspaceId}`);
      io.to(`workspace:${workspaceId}`).emit("member:removed", {
        workspaceId,
        userId,
      });
      io.to(`user:${userId}`).emit("member:removed", { workspaceId, userId });
    }

    return res.status(200).json({
      success: true,
      message: isSelf ? "You left the workspace" : "Member removed",
    });
  } catch (error) {
    next(error);
  }
};
