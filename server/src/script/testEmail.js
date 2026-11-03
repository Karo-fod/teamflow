import "dotenv/config";
import { verifyEmailConnection } from "../services/email.service.js";

try {
  await verifyEmailConnection();
  console.log("SMTP connection verified successfully.");
  process.exitCode = 0;
} catch (error) {
  console.error("SMTP verification failed:", error.message);
  process.exitCode = 1;
}