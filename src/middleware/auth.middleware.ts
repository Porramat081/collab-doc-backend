import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./rbac.middleware";
import { decodeKey } from "@/utils/jwt";

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = decodeKey(token);
      req.user = { id: decoded.userId, email: decoded.email };
      return next();
    } catch (err) {
      res.status(403).json({ error: "Invalid or Expired token" });
      return;
    }
  }
  res.status(401).json({ error: "Authorization header missing" });
};
