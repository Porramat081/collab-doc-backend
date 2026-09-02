export interface UserEntity {
  id: string;
  email: string;
  name: string | null;
  passwordHash?: string;
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: { email: string; name: string; passwordHash?: string; avatarUrl?: string | null }): Promise<UserEntity>;
}
