import mongoose, { Schema, Document } from "mongoose";

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
  createdAt: { type: Date, default: Date.now() },
});

const DocumentContentModel = mongoose.model<IDocumentContent>(
  "DocumentContent",
  DocumentContentSchema,
);

const CRDTUpdateModel = mongoose.model<ICRDTUpdate>(
  "CRDTUpdate",
  CRDTUpdateSchema,
);

export class DocumentRepository {
  async findContentById(documentId: string) {
    return await DocumentContentModel.findOne({ documentId }).exec();
  }

  async getCRDTUpdate(documentId: string): Promise<Buffer[]> {
    const records = await CRDTUpdateModel.find({ documentId })
      .sort({ createdAt: 1 })
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

  async saveSnapshotAndClearUpdates(
    documentId: string,
    compactedSnapshotBase64: string,
  ): Promise<void> {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      await DocumentContentModel.updateOne(
        { documentId },
        { $set: { content: compactedSnapshotBase64, updatedAt: new Date() } },
        { upsert: true, session },
      );

      await CRDTUpdateModel.deleteMany({ documentId }, { session });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

export const documentRepository = new DocumentRepository();
