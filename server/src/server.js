// Load environment variables before anything else reads process.env.
import "dotenv/config";

import http from "node:http";
import app from "./app.js";
import { configureSocket } from "./socket.js";
import { connectDB } from "./config/db.js";

async function start() {
  await connectDB();

  const server = http.createServer(app);

  configureSocket(server, app);

  const PORT = process.env.PORT || 3000;

  server.listen(PORT, () => {
    console.log(`TeamFlow API running on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start TeamFlow API:", error);
  process.exit(1);
});
