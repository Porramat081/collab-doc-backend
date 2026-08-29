import mongoose from "mongoose";
import "dotenv/config";

export async function connectDB(): Promise<void> {
  const url = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME;

  if (!url) {
    throw new Error("MONGO_URL environment variable is not set");
  }

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  await mongoose.connect(url, { dbName });

  console.log(`Connected to MongoDB database "${mongoose.connection.name}"`);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
