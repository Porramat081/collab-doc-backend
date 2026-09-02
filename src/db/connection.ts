import mongoose, { Mongoose } from "mongoose";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

let mongoConnection: Promise<Mongoose> | null = null;

mongoose.connection.on("error", (err) => {
  console.error("[MongoDB] Connection error:", err);
});
mongoose.connection.on("disconnected", () => {
  console.warn("[MongoDB] Disconnected");
});

/**
 * Connects (once) to MongoDB, retrying until DB_CONNECT_TIMEOUT_MS elapses.
 * Railway starts the app container before the database finishes booting, so the
 * first few attempts are expected to fail on a cold deploy.
 */
export async function connectDB(): Promise<Mongoose> {
  if (mongoConnection) return mongoConnection;

  if (!env.MONGO_URI) {
    throw new Error(
      "MONGO_URI is not set. Attach a MongoDB service in Railway and reference it " +
        "as ${{MongoDB.MONGO_URL}}.",
    );
  }
  const mongoUri = env.MONGO_URI;

  mongoConnection = (async () => {
    const deadline = Date.now() + env.DB_CONNECT_TIMEOUT_MS;
    let lastError: unknown;

    for (let attempt = 1; ; attempt++) {
      try {
        const conn = await mongoose.connect(mongoUri, {
          dbName: env.MONGO_DB_NAME,
          retryWrites: false,
          serverSelectionTimeoutMS: 5_000,
        });
        console.log(
          `[MongoDB] Connected to database "${mongoose.connection.name}"`,
        );
        return conn;
      } catch (error) {
        lastError = error;
        if (Date.now() >= deadline) break;
        console.warn(
          `[MongoDB] Connection attempt ${attempt} failed, retrying in 2s...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }

    mongoConnection = null;
    throw lastError;
  })();

  return mongoConnection;
}

export async function disconnectDB(): Promise<void> {
  mongoConnection = null;
  await mongoose.disconnect();
}

/**
 * PrismaClient is created lazily: constructing it eagerly throws when DATABASE_URL
 * is absent, which would break unit tests and the `/health` endpoint on a partially
 * configured deploy. The proxy keeps `import { prisma }` working unchanged.
 */
let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    if (!env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set. Attach a PostgreSQL service in Railway and " +
          "reference it as ${{Postgres.DATABASE_URL}}.",
      );
    }
    prismaInstance = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  }
  return prismaInstance;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma() as unknown as Record<string | symbol, unknown>;
    const value = client[property];
    // Bind methods ($transaction, $disconnect, ...) so `this` stays the real client.
    return typeof value === "function" ? value.bind(client) : value;
  },
  has: (_target, property) => property in (getPrisma() as object),
});

export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
