import mongoose from "mongoose";
import { prisma } from "@/db/connection";

afterAll(async () => {
  await mongoose.disconnect();
  await prisma.$disconnect();
});
