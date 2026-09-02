import { UserRepository } from "./user.repository.js";
import { DocumentRepository } from "./document.repository.js";

export const userRepository = new UserRepository();
export const documentRepository = new DocumentRepository();

export * from "./interfaces/user.repository.interface.js";
export * from "./interfaces/document.repository.interface.js";
