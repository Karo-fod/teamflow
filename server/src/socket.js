import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import WorkspaceMember from "./modules/workspaces/workspaceMember.model.js";

export function configureSocket(server, app) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: "teamflow-api",
        audience: "teamflow-client",
      });

      if (!mongoose.isValidObjectId(payload.sub)) {
        return next(new Error("Invalid user"));
      }

      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    // Personal room, used to reach every tab of one user (e.g. when removed
    // from a workspace).
    socket.join(`user:${socket.data.userId}`);

    socket.on("workspace:leave", async (workspaceId) => {
      if (mongoose.isValidObjectId(workspaceId)) {
        await socket.leave(`workspace:${workspaceId}`);
      }
    });

    socket.on("workspace:join", async (workspaceId, acknowledge) => {
      const reply =
        typeof acknowledge === "function" ? acknowledge : () => {};

      try {
        if (!mongoose.isValidObjectId(workspaceId)) {
          return reply({
            success: false,
            message: "Invalid workspace ID",
          });
        }

        const membership = await WorkspaceMember.exists({
          workspaceId,
          userId: socket.data.userId,
        });

        if (!membership) {
          return reply({
            success: false,
            message: "You do not have access to this workspace",
          });
        }

        await socket.join(`workspace:${workspaceId}`);

        reply({ success: true });
      } catch {
        reply({
          success: false,
          message: "Unable to join workspace",
        });
      }
    });
  });

  app.set("io", io);

  return io;
}