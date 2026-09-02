import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ValidationError } from "../errors/app.error.js";
import type { AnyZodObject } from "zod/v3";

interface RequestValidationSchema {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
}

export function validateRequest(schemas: RequestValidationSchema) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a single human-readable message
        const formattedErrors = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");

        next(new ValidationError(`Validation failed: ${formattedErrors}`));
      } else {
        next(error);
      }
    }
  };
}
