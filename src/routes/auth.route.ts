import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../db/connection.js";
import { createKey } from "../utils/jwt.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const hashPassword = (password: string): string =>
  crypto.createHash("sha256").update(password).digest("hex");

const respondWithUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, avatarUrl: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name || "Collaborator",
    avatarUrl: user.avatarUrl || undefined,
  };
};

router.post("/register", async (req, res) => {
  try {
    const payload = registerSchema.parse(req.body ?? {});
    const passwordHash = hashPassword(payload.password);

    const existing = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });

    if (existing) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const user = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase(),
        name: payload.name.trim(),
        passwordHash,
      },
    });

    const token = createKey({
      userId: user.id,
      email: user.email,
      name: user.name || payload.name.trim(),
    });

    res.status(201).json({
      token,
      user: await respondWithUser(user.id),
    });
  } catch (error) {
    res.status(400).json({ error: "Registration failed. Please verify the form values." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const payload = loginSchema.parse(req.body ?? {});
    const user = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });

    if (!user || user.passwordHash !== hashPassword(payload.password)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = createKey({
      userId: user.id,
      email: user.email,
      name: user.name || "Collaborator",
    });

    res.status(200).json({
      token,
      user: await respondWithUser(user.id),
    });
  } catch (error) {
    res.status(400).json({ error: "Login failed. Please check your email and password." });
  }
});

router.post("/logout", (_req, res) => {
  res.status(200).json({ ok: true, message: "Logged out successfully" });
});

router.post("/token", async (req, res) => {
  try {
    const payload = loginSchema.parse(req.body ?? {});
    const user = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });

    if (!user || user.passwordHash !== hashPassword(payload.password)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = createKey({
      userId: user.id,
      email: user.email,
      name: user.name || "Collaborator",
    });

    res.status(200).json({
      token,
      user: await respondWithUser(user.id),
    });
  } catch (error) {
    res.status(400).json({ error: "Invalid token payload" });
  }
});

export default router;
