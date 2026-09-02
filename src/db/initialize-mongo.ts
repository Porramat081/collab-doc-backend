import mongoose from "mongoose";
import { connectDB, disconnectDB } from "./connection.js";
import {
  ActivePresenceModel,
  CRDTUpdateModel,
  DocumentContentModel,
  DocumentVersionModel,
} from "../models/index.js";

async function initializeMongo(): Promise<void> {
  await connectDB();

  try {
    await Promise.all([
      ActivePresenceModel.init(),
      CRDTUpdateModel.init(),
      DocumentContentModel.init(),
      DocumentVersionModel.init(),
    ]);

    console.log("MongoDB collections and indexes initialized");
  } finally {
    await disconnectDB();
  }
}

initializeMongo().catch(async (error: unknown) => {
  console.error("Failed to initialize MongoDB:", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
