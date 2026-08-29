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

  return await mongoose.connect(url, { dbName });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
