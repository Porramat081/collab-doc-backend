import mongoose, { Mongoose } from "mongoose";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export async function connectDB(): Promise<Mongoose> {
  const url = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME;

  if (!url) {
    throw new Error("MONGO_URL environment variable is not set");
  }

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  console.log(`Connected to MongoDB database "${mongoose.connection.name}"`);

  return await mongoose.connect(url, {
    dbName,
    retryWrites: false,
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

export const prisma = new PrismaClient();
