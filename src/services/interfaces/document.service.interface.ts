export interface DocumentContentResult {
  documentId: string;
  baseSnapshot?: string;
  crdtUpdates: Uint8Array[];
}

export interface IDocumentService {
  getDocumentContent(documentId: string): Promise<DocumentContentResult>;
  applyCRDTUpdate(
    documentId: string,
    userId: string,
    update: Uint8Array,
  ): Promise<void>;
}
