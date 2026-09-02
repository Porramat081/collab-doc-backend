import type {
  IDocumentService,
  DocumentContentResult,
} from "@/services/interfaces/document.service.interface";
import { documentRepository } from "@/repositories/document.repository";

export class DocumentService implements IDocumentService {
  async getDocumentContent(documentId: string): Promise<DocumentContentResult> {
    const contentEntity = await documentRepository.findContentById(documentId);
    const rawUpdates = await documentRepository.getCRDTUpdate(documentId);

    return {
      documentId,
      baseSnapshot: contentEntity?.content || undefined,
      crdtUpdates: rawUpdates.map((buf) => new Uint8Array(buf)),
    };
  }

  async applyCRDTUpdate(
    documentId: string,
    userId: string,
    update: Uint8Array,
  ): Promise<void> {
    await documentRepository.saveCRDTUpdate(documentId, userId, update);
  }
}

export const documentService = new DocumentService();
