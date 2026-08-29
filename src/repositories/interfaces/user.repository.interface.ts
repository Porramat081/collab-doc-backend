export interface UserEntity {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: { email: string; name: string }): Promise<UserEntity>;
}
