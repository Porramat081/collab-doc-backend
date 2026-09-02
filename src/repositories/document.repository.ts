import mongoose, { Schema, Document, Model } from "mongoose";

interface IDocumentContent extends Document {
  documentId: string;
  content: string;
  updatedAt: Date;
}

interface ICRDTUpdate extends Document {
  documentId: string;
  userId: string;
  update: Buffer;
  createdAt: Date;
}

const DocumentContentSchema = new Schema<IDocumentContent>({
  documentId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

const CRDTUpdateSchema = new Schema<ICRDTUpdate>({
  documentId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  update: { type: Buffer, required: true },
  // Pass the function, not its result: `Date.now()` would freeze every document at
  // module-load time and destroy the createdAt ordering the CRDT replay depends on.
  createdAt: { type: Date, default: Date.now, index: true },
});

/**
 * Distinct model names from src/models/* (which describe the same collections with a
 * different shape) so that importing both in one process cannot throw OverwriteModelError.
 * Collection names are pinned so the storage location is unchanged.
 */
function defineModel<T>(
  name: string,
  schema: Schema<T>,
  collection: string,
): Model<T> {
  return (
    (mongoose.models[name] as Model<T> | undefined) ??
    mongoose.model<T>(name, schema, collection)
  );
}

const DocumentContentModel = defineModel<IDocumentContent>(
  "DocumentContentStore",
  DocumentContentSchema,
  "documentcontents",
);

const CRDTUpdateModel = defineModel<ICRDTUpdate>(
  "CRDTUpdateStore",
  CRDTUpdateSchema,
  "crdtupdates",
);

/** MongoDB rejects transactions unless it runs as a replica set or mongos. */
function isUnsupportedTransactionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Transaction numbers are only allowed") ||
    message.includes("Transactions are not supported") ||
    message.includes("replica set") ||
    (error as { code?: number } | null)?.code === 20
  );
}

export class DocumentRepository {
  async findContentById(documentId: string) {
    return await DocumentContentModel.findOne({ documentId }).exec();
  }

  async getCRDTUpdate(documentId: string): Promise<Buffer[]> {
    const records = await CRDTUpdateModel.find({ documentId })
      .sort({ createdAt: 1, _id: 1 })
      .exec();
    return records.map((r) => r.update);
  }

  async saveCRDTUpdate(
    documentId: string,
    userId: string,
    update: Uint8Array,
  ): Promise<void> {
    await CRDTUpdateModel.create({
      documentId,
      userId,
      update: Buffer.from(update),
    });
  }

  /**
   * Persists the compacted snapshot and drops the updates it subsumes.
   *
   * Uses a transaction where the deployment supports one, and falls back to two
   * sequential writes on a standalone server (which is what Railway's MongoDB is).
   * The fallback writes the snapshot first, so a crash between the two statements
   * leaves duplicate-but-idempotent CRDT updates rather than data loss.
   */
  async saveSnapshotAndClearUpdates(
    documentId: string,
    compactedSnapshotBase64: string,
  ): Promise<void> {
    const cutoff = new Date();
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      await DocumentContentModel.updateOne(
        { documentId },
        { $set: { content: compactedSnapshotBase64, updatedAt: cutoff } },
        { upsert: true, session },
      );

      // Only remove what the snapshot already contains; concurrent edits survive.
      await CRDTUpdateModel.deleteMany(
        { documentId, createdAt: { $lte: cutoff } },
        { session },
      );

      await session.commitTransaction();
      return;
    } catch (error) {
      await session.abortTransaction().catch(() => undefined);

      if (!isUnsupportedTransactionError(error)) throw error;
    } finally {
      await session.endSession();
    }

    // Standalone MongoDB: same writes, no transaction.
    await DocumentContentModel.updateOne(
      { documentId },
      { $set: { content: compactedSnapshotBase64, updatedAt: cutoff } },
      { upsert: true },
    );
    await CRDTUpdateModel.deleteMany({
      documentId,
      createdAt: { $lte: cutoff },
    });
  }
}

export const documentRepository = new DocumentRepository();
