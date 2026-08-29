import http from "http";
import app from "./app";
import { CollaborativeWebSocketServer } from "./websocket/server";
import { disconnectDB } from "./db/connection";

const PORT = process.env.PORT || 3000;

// Create shared HTTP Server
const server = http.createServer(app);

// Attach WebSocket Server instance
new CollaborativeWebSocketServer(server);

// Start Server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(
    `WebSocket server listening on ws://localhost:${PORT}/ws/documents`,
  );
});

// Graceful Shutdown Handler
const shutdown = async () => {
  console.log("Shutting down server...");
  server.close(async () => {
    await disconnectDB();
    console.log("Databases disconnected. Server exited safely.");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
