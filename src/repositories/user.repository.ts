import type {
  IUserRepository,
  UserEntity,
} from "./interfaces/user.repository.interface.ts";
import { prisma } from "../db/connection.ts";

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async create(data: { email: string; name: string }): Promise<UserEntity> {
    return prisma.user.create({ data });
  }
}
