import { UserRepository } from "@/repositories/user.repository";
import { DocumentRepository } from "@/repositories/document.repository";

export const userRepository = new UserRepository();
export const documentRepository = new DocumentRepository();

export * from "@/repositories/interfaces/user.repository.interface";
export * from "@/repositories/interfaces/document.repository.interface";
