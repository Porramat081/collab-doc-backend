import { UserRepository } from "./user.repository.ts";
import { DocumentRepository } from "./document.repository.ts";

export const userRepository = new UserRepository();
export const documentRepository = new DocumentRepository();

export * from "./interfaces/user.repository.interface.ts";
export * from "./interfaces/document.repository.interface.ts";
