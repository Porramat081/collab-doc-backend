import type {
  IUserRepository,
  UserEntity,
} from "./interfaces/user.repository.interface.ts";
import { prisma } from "../db/connection.ts";

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({ where: { id } }) as Promise<UserEntity | null>;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({ where: { email } }) as Promise<UserEntity | null>;
  }

  async create(data: {
    email: string;
    name: string;
    passwordHash?: string;
    avatarUrl?: string | null;
  }): Promise<UserEntity> {
    return prisma.user.create({ data }) as Promise<UserEntity>;
  }
}
