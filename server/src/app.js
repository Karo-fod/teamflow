import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./modules/auth/auth.routes.js";
import workspaceRoutes from "./modules/workspaces/workspace.routes.js"; 
import projectRoutes from "./modules/projects/project.routes.js";
import taskRoutes from "./modules/tasks/task.routes.js";
import commentRoutes from "./modules/comments/comment.routes.js";
import activityRoutes from "./modules/activity/activity.routes.js";
import workspaceInvitationAcceptanceRoutes from "./modules/workspaces/workspaceInvitationAcceptance.routes.js";

const app = express();

// Set TRUST_PROXY=1 when running behind a reverse proxy (Render, Railway,
// Nginx...) so rate limiting and logs see the real client IP.
if (process.env.TRUST_PROXY) {
  app.set(
    "trust proxy",
    Number.isNaN(Number(process.env.TRUST_PROXY))
      ? process.env.TRUST_PROXY
      : Number(process.env.TRUST_PROXY)
  );
}

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

app.use(express.json({ limit: "20kb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "TeamFlow API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use(
  "/api/workspaces/:workspaceId/projects",
  projectRoutes
);
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/tasks",
  taskRoutes
);
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments",
  commentRoutes
);
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/activity",
  activityRoutes
);
app.use(
  "/api/workspace-invitations",
  workspaceInvitationAcceptanceRoutes
);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Malformed JSON, oversized bodies and other client errors raised by Express.
  const status = err.status ?? err.statusCode;

  if (status >= 400 && status < 500) {
    return res.status(status).json({
      success: false,
      message:
        err.type === "entity.parse.failed"
          ? "Request body is not valid JSON"
          : err.type === "entity.too.large"
            ? "Request body is too large"
            : "Invalid request",
    });
  }

  // Mongoose cast/validation problems caused by bad input.
  if (err.name === "CastError" || err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
    });
  }

  console.error(err);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred",
  });
});

export default app;