import type {
  IDocumentRepository,
  IUserRepository,
} from "../repositories/index.ts";
import type {
  IDocumentService,
  CreateDocumentInput,
  DocumentWithContent,
} from "./interfaces/document.service.interface.ts";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../errors/app.error.ts";

export class DocumentService implements IDocumentService {
  private docRepo;
  private userRepo;

  constructor(docRepo: IDocumentRepository, userRepo: IUserRepository) {
    this.docRepo = docRepo;
    this.userRepo = userRepo;
  }

  async createDocument(
    input: CreateDocumentInput,
  ): Promise<DocumentWithContent> {
    if (!input.title || input.title.trim().length === 0) {
      throw new ValidationError("Document title is required.");
    }

    // Verify owner exists
    const owner = await this.userRepo.findById(input.ownerId);
    if (!owner) {
      throw new NotFoundError("User", input.ownerId);
    }

    // 1. Create relational metadata in PostgreSQL
    const metadata = await this.docRepo.createDocument(
      input.title.trim(),
      input.ownerId,
    );

    // 2. Initialize content in MongoDB
    const initialContent = input.initialContent ?? "";
    await this.docRepo.saveContentSnapshot(metadata.id, initialContent, 1);

    const content = await this.docRepo.findContentById(metadata.id);

    return { metadata, content };
  }

  async getDocument(
    documentId: string,
    userId: string,
  ): Promise<DocumentWithContent> {
    const metadata = await this.docRepo.findMetadataById(documentId);
    if (!metadata) {
      throw new NotFoundError("Document", documentId);
    }

    // Basic ownership validation (expandable to ACL/roles)
    if (metadata.ownerId !== userId) {
      throw new ForbiddenError(
        "You do not have permission to access this document.",
      );
    }

    const content = await this.docRepo.findContentById(documentId);
    return { metadata, content };
  }

  async saveSnapshot(
    documentId: string,
    userId: string,
    content: string,
    version: number,
  ): Promise<void> {
    const metadata = await this.docRepo.findMetadataById(documentId);
    if (!metadata) {
      throw new NotFoundError("Document", documentId);
    }

    if (metadata.ownerId !== userId) {
      throw new ForbiddenError(
        "You do not have permission to modify this document.",
      );
    }

    await this.docRepo.saveContentSnapshot(documentId, content, version);
  }

  async applyCRDTUpdate(
    documentId: string,
    userId: string,
    updateBlob: Uint8Array,
  ): Promise<void> {
    if (!updateBlob || updateBlob.length === 0) {
      throw new ValidationError("CRDT update payload cannot be empty.");
    }

    const metadata = await this.docRepo.findMetadataById(documentId);
    if (!metadata) {
      throw new NotFoundError("Document", documentId);
    }

    // Validate permission before appending stream update
    if (metadata.ownerId !== userId) {
      throw new ForbiddenError(
        "You do not have permission to submit updates to this document.",
      );
    }

    await this.docRepo.appendCrdtUpdate(documentId, updateBlob);
  }
}
