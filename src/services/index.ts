import { userRepository, documentRepository } from "@/repositories/index";
import { UserService } from "@/services/user.service";
import { DocumentService } from "@/services/document.service";

export const userService = new UserService(userRepository);
export const documentService = new DocumentService();

export * from "@/services/interfaces/user.service.interface";
export * from "@/services/interfaces/document.service.interface";
