import http from "http";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { env, isOriginAllowed } from "./config/env.js";
import documentRoutes from "./routes/document.route.js";
import authRoutes from "./routes/auth.route.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { connectDB, disconnectDB, disconnectPrisma, prisma } from "./db/connection.js";
import { redisWSAdapter } from "./websocket/redis-adapter.js";
import { CollaborativeWebSocketServer } from "./websocket/server.js";

const app = express();
const server = http.createServer(app);

// Railway terminates TLS at its edge proxy; trust it so req.protocol/ip are correct.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, isOriginAllowed(origin, env.CORS_ORIGINS)),
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));

app.get("/", (_req, res) =>
  res.status(200).json({ message: "all right", service: "collab-doc", env: env.NODE_ENV }),
);

/**
 * Liveness probe. Deliberately dependency-free: Railway restarts the container when
 * this fails, and a transient database blip should not trigger a restart loop.
 */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

/** Readiness probe: reports the actual state of every backing service. */
app.get("/health/ready", async (_req, res) => {
  const checks: Record<string, string> = {};

  checks.mongodb = mongoose.connection.readyState === 1 ? "up" : "down";

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = "up";
  } catch {
    checks.postgres = "down";
  }

  checks.redis = !redisWSAdapter.enabled
    ? "disabled"
    : (await redisWSAdapter.ping())
      ? "up"
      : "down";

  const healthy = checks.mongodb === "up" && checks.postgres === "up" && checks.redis !== "down";
  res.status(healthy ? 200 : 503).json({ status: healthy ? "ready" : "degraded", checks });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

let wsServer: CollaborativeWebSocketServer | null = null;

async function bootstrap(): Promise<void> {
  await connectDB();

  wsServer = new CollaborativeWebSocketServer(server);
  console.log("[WebSocket] Collaborative server initialized");

  await new Promise<void>((resolve) => {
    // Bind 0.0.0.0 so the container is reachable from outside its network namespace.
    server.listen(env.PORT, env.HOST, resolve);
  });
  console.log(`[HTTP] Server listening on ${env.HOST}:${env.PORT}`);
}

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Shutdown] Received ${signal}, closing gracefully...`);

  // Force-exit if a socket refuses to drain, so Railway does not SIGKILL mid-write.
  const forceExit = setTimeout(() => {
    console.error("[Shutdown] Timed out after 15s, forcing exit");
    process.exit(1);
  }, 15_000);
  forceExit.unref();

  try {
    await wsServer?.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Promise.allSettled([redisWSAdapter.close(), disconnectDB(), disconnectPrisma()]);
    console.log("[Shutdown] Complete");
    process.exit(0);
  } catch (err) {
    console.error("[Shutdown] Error while closing:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  console.error("[Process] Unhandled rejection:", reason);
});

bootstrap().catch((err) => {
  console.error("[Bootstrap] Initialization failed:", err);
  process.exit(1);
});

export { app, server };
