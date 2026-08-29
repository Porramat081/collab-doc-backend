import { userRepository, documentRepository } from "../repositories/index.ts";
import { UserService } from "./user.service.ts";
import { DocumentService } from "./document.service.ts";

export const userService = new UserService(userRepository);
export const documentService = new DocumentService(
  documentRepository,
  userRepository,
);

export * from "./interfaces/user.service.interface.ts";
export * from "./interfaces/document.service.interface.ts";
