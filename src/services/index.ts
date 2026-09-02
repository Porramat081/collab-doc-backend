import { userRepository, documentRepository } from "../repositories/index.js";
import { UserService } from "./user.service.js";
import { DocumentService } from "./document.service.js";

export const userService = new UserService(userRepository);
export const documentService = new DocumentService();

export * from "./interfaces/user.service.interface.js";
export * from "./interfaces/document.service.interface.js";
