import { z } from "zod";

export const RegisterUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export const UserParamSchema = z.object({
  userId: z.string().uuid("User ID must be a valid UUID"),
});

export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
