import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import documentRoutes from "@/routes/document.route";
import authRoutes from "@/routes/auth.route";
import mongoose from "mongoose";
import { CollaborativeWebSocketServer } from "@/websocket/server";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.status(200).json({ message: "all right" }));

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);

const PORT = Number(process.env.PORT || 3001);
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/collaborative_docs?authSource=admin&retryWrites=false";

async function bootstrap() {
  try {
    await mongoose.connect(MONGO_URI, { retryWrites: false });
    console.log("[MongoDB] Connected successfully");

    new CollaborativeWebSocketServer(server);
    console.log("[Websocket] Collaborative server initialized");

    server.listen(PORT, () => {
      console.log(`[HTTP] Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Initialization failed: ", err);
    process.exit(1);
  }
}

bootstrap();
