import type { UserEntity } from "../../repositories/index.js";

export interface IUserService {
  getUserProfile(userId: string): Promise<UserEntity>;
  registerUser(email: string, name: string): Promise<UserEntity>;
}
