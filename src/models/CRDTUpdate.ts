import { Schema, model, Document, Model } from "mongoose";

export interface ICRDTUpdate extends Document {
  documentId: string; // Foreign key -> PostgreSQL documents.id
  clientId: number; // Yjs client identifier
  userId: string; // Foreign key -> PostgreSQL users.id
  update: Buffer; // Binary Uint8Array from Yjs
  createdAt: Date;
}

const CRDTUpdateSchema = new Schema<ICRDTUpdate>(
  {
    documentId: { type: String, required: true },
    clientId: { type: Number, required: true },
    userId: { type: String, required: true },
    update: { type: Buffer, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Compound index for efficient sequence retrieval and compaction queries
CRDTUpdateSchema.index({ documentId: 1, createdAt: 1 });

export const CRDTUpdateModel: Model<ICRDTUpdate> = model<ICRDTUpdate>(
  "CRDTUpdate",
  CRDTUpdateSchema,
  "crdt_updates",
);
