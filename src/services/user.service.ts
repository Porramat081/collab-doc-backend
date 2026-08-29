import type { IUserRepository, UserEntity } from "../repositories/index.ts";
import type { IUserService } from "./interfaces/user.service.interface.ts";
import { NotFoundError, ValidationError } from "../errors/app.error.ts";

export class UserService implements IUserService {
  private userRepo;
  constructor(userRepo: IUserRepository) {
    this.userRepo = userRepo;
  }

  async getUserProfile(userId: string): Promise<UserEntity> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError("User", userId);
    }
    return user;
  }

  async registerUser(email: string, name: string): Promise<UserEntity> {
    if (!email || !email.includes("@")) {
      throw new ValidationError("A valid email address is required.");
    }
    if (!name || name.trim().length === 0) {
      throw new ValidationError("Name cannot be empty.");
    }

    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new ValidationError("User with this email already exists.");
    }

    return this.userRepo.create({ email, name: name.trim() });
  }
}
