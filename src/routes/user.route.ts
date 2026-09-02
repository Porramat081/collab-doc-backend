import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import { RegisterUserSchema, UserParamSchema } from "../schemas/user.schema.js";
import type { AnyZodObject } from "zod/v3";

const router = Router();

router.post(
  "/register",
  validateRequest({ body: RegisterUserSchema as unknown as AnyZodObject }),
  (req, res, next) => userController.register(req, res, next),
);
router.get(
  "/:userId",
  validateRequest({ params: UserParamSchema as unknown as AnyZodObject }),
  (req, res, next) => userController.getProfile(req, res, next),
);

export default router;
