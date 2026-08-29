import { Router } from "express";
import { userController } from "../controllers/user.controller";

const router = Router();

router.post("/register", (req, res, next) =>
  userController.register(req, res, next),
);
router.get("/:userId", (req, res, next) =>
  userController.getProfile(req, res, next),
);

export default router;
