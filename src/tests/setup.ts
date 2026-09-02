import mongoose from "mongoose";
import { disconnectPrisma } from "../db/connection.js";

afterAll(async () => {
  await mongoose.disconnect();
  // No-op unless a test actually constructed the client, so unit tests do not
  // require DATABASE_URL to be present.
  await disconnectPrisma();
});
