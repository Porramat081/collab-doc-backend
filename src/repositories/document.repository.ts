import { prisma, connectDB } from "../db/connection.ts";
import type {
  IDocumentRepository,
  DocumentMetadataEntity,
  DocumentContentEntity,
} from "./interfaces/document.repository.interface.ts";

export class DocumentRepository implements IDocumentRepository {
  // PostgreSQL Operations (Metadata)
  async createDocument(
    title: string,
    ownerId: string,
  ): Promise<DocumentMetadataEntity> {
    return prisma.document.create({
      data: { title, ownerId },
    });
  }

  async findMetadataById(id: string): Promise<DocumentMetadataEntity | null> {
    return prisma.document.findUnique({ where: { id } });
  }

  // MongoDB Operations (Document State & CRDT Stream)
  async findContentById(
    documentId: string,
  ): Promise<DocumentContentEntity | null> {
    const db = await connectDB();
    const doc = await db
      .collection("document_contents")
      .findOne({ documentId });
    if (!doc) return null;

    return {
      documentId: doc.documentId,
      content: doc.content,
      version: doc.version,
    };
  }

  async saveContentSnapshot(
    documentId: string,
    content: string,
    version: number,
  ): Promise<void> {
    const db = await connectDB();
    await db
      .collection("document_contents")
      .updateOne(
        { documentId },
        { $set: { content, version, updatedAt: new Date() } },
        { upsert: true },
      );
  }

  async appendCrdtUpdate(
    documentId: string,
    updateBlob: Uint8Array,
  ): Promise<void> {
    const db = await connectDB();
    await db.collection("crdt_updates").insertOne({
      documentId,
      update: updateBlob,
      timestamp: new Date(),
    });
  }
}
