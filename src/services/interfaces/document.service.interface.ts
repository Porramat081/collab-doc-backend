import type {
  DocumentMetadataEntity,
  DocumentContentEntity,
} from "../../repositories/index.ts";

export interface CreateDocumentInput {
  title: string;
  ownerId: string;
  initialContent?: string;
}

export interface DocumentWithContent {
  metadata: DocumentMetadataEntity;
  content: DocumentContentEntity | null;
}

export interface IDocumentService {
  createDocument(input: CreateDocumentInput): Promise<DocumentWithContent>;
  getDocument(documentId: string, userId: string): Promise<DocumentWithContent>;
  saveSnapshot(
    documentId: string,
    userId: string,
    content: string,
    version: number,
  ): Promise<void>;
  applyCRDTUpdate(
    documentId: string,
    userId: string,
    updateBlob: Uint8Array,
  ): Promise<void>;
}
