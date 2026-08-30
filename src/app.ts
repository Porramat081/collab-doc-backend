import http from "http";
import express from "express";
import cors from "cors";
import documentRoutes from "@/routes/document.route";
import mongoose from "mongoose";
import { CollaborativeWebSocketServer } from "./websocket/server";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use("/api/documents", documentRoutes);

const PORT = parseInt(process.env.PORT || "", 10);
const MONGO_URI = process.env.MONGO_URI || "";

async function bootstrap() {
  try {
    await mongoose.connect(MONGO_URI);
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
