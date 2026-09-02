import type { Request, Response, NextFunction } from "express";
import { ApplicationError } from "@/errors/app.error";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApplicationError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        name: err.name,
        message: err.message,
      },
    });
    return;
  }

  // Fallback for unhandled internal server errors
  console.error("Unhandled Error:", err);
  res.status(500).json({
    success: false,
    error: {
      name: "InternalServerError",
      message: "An unexpected internal server error occurred.",
    },
  });
}
