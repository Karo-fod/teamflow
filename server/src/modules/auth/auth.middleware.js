import mongoose from "mongoose";
import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const token = authorization.slice("Bearer ".length);
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    return res.status(500).json({
      success: false,
      message: "Authentication is not configured correctly",
    });
  }

  try {
    const payload = jwt.verify(token, secret, {
      issuer: "teamflow-api",
      audience: "teamflow-client",
    });

    if ( typeof payload === "string" || typeof payload.sub !== "string" || !/^[a-f\d]{24}$/i.test(payload.sub) || !mongoose.Types.ObjectId.isValid(payload.sub)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}