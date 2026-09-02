import type { Request, Response, NextFunction } from "express";
import { userService } from "../services/index.js";

export class UserController {
  async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { email, name } = req.body;
      const user = await userService.registerUser(email, name);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await userService.getUserProfile(userId as string);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
