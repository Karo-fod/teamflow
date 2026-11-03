import { randomBytes, createHash } from "node:crypto";

export const INVITATION_TTL_DAYS = 7;
export const INVITATION_TTL_MS = INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000;

export const createInvitationToken = () =>
  randomBytes(32).toString("hex");

export const hashInvitationToken = (token) =>
  createHash("sha256").update(token).digest("hex");
