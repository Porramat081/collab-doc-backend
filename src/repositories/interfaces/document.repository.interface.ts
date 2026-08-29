export interface DocumentMetadataEntity {
  id: string;
  title: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentContentEntity {
  documentId: string;
  content: string;
  version: number;
}

export interface IDocumentRepository {
  createDocument(
    title: string,
    ownerId: string,
  ): Promise<DocumentMetadataEntity>;
  findMetadataById(id: string): Promise<DocumentMetadataEntity | null>;
  findContentById(documentId: string): Promise<DocumentContentEntity | null>;
  saveContentSnapshot(
    documentId: string,
    content: string,
    version: number,
  ): Promise<void>;
  appendCrdtUpdate(documentId: string, updateBlob: Uint8Array): Promise<void>;
}
