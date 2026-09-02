import type {
  IUserRepository,
  UserEntity,
} from "@/repositories/interfaces/user.repository.interface";
import { prisma } from "@/db/connection";

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({
      where: { id },
    }) as Promise<UserEntity | null>;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({
      where: { email },
    }) as Promise<UserEntity | null>;
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
