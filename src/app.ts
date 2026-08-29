import express, { type Express, type Request, type Response } from "express";
import "dotenv/config";
import { connectDB, disconnectDB } from "./db/connection.ts";
import "./models/index.ts";

const app: Express = express();
const port = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

async function start() {
  await connectDB();
  app.listen(port, () => console.log("server's running on port : ", port));
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await disconnectDB();
    process.exit(0);
  });
}
