import * as Y from "yjs";
import { documentRepository } from "@/repositories/index";

export class SnapshotWorker {
  private processingQueue: Set<string> = new Set();

  async processDocument(documentId: string): Promise<void> {
    if (this.processingQueue.has(documentId)) return;
    this.processingQueue.add(documentId);

    try {
      const contentEntity =
        await documentRepository.findContentById(documentId);
      const rawUpdates = await documentRepository.getCRDTUpdate(documentId);

      if (!rawUpdates || rawUpdates.length === 0) return;

      const tempDoc = new Y.Doc();

      if (contentEntity?.content) {
        Y.applyUpdate(
          tempDoc,
          new Uint8Array(Buffer.from(contentEntity.content, "base64")),
        );
      }
      rawUpdates.forEach((updateBuffers) => {
        Y.applyUpdate(tempDoc, new Uint8Array(updateBuffers));
      });
      const compactedState = Y.encodeStateAsUpdate(tempDoc);
      const compactedSnapshotBase64 =
        Buffer.from(compactedState).toString("base64");

      await documentRepository.saveSnapshotAndClearUpdates(
        documentId,
        compactedSnapshotBase64,
      );

      tempDoc.destroy();
      console.log(
        `[SnapshotWorker] Compacted updates for document: ${documentId}`,
      );
    } catch (err) {
      console.error(`[SnapshotWorker] Compaction error on ${documentId}:`, err);
    } finally {
      this.processingQueue.delete(documentId);
    }
  }
}

export const snapshotWorker = new SnapshotWorker();
