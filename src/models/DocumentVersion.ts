import { Schema, model, Document, Model } from "mongoose";
import { BlockSchema } from "@/models/DocumentContent";
import type { IBlock } from "@/models/DocumentContent";

export interface IChangeSummary {
  additions: number;
  deletions: number;
  editedBy: string[]; // List of User UUIDs
}

export interface IDocumentVersion extends Document {
  documentId: string;
  versionNumber: number;
  label?: string;
  createdById: string;
  snapshotStateVector: Buffer;
  blocksSnapshot: IBlock[];
  changeSummary: IChangeSummary;
  createdAt: Date;
}

const ChangeSummarySchema = new Schema<IChangeSummary>(
  {
    additions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
    editedBy: [{ type: String, required: true }],
  },
  { _id: false },
);

const DocumentVersionSchema = new Schema<IDocumentVersion>(
  {
    documentId: { type: String, required: true },
    versionNumber: { type: Number, required: true },
    label: { type: String, trim: true },
    createdById: { type: String, required: true },
    snapshotStateVector: { type: Buffer, required: true },
    blocksSnapshot: { type: [BlockSchema], default: [] },
    changeSummary: { type: ChangeSummarySchema, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Enforce unique version numbering per document
DocumentVersionSchema.index(
  { documentId: 1, versionNumber: -1 },
  { unique: true },
);

export const DocumentVersionModel: Model<IDocumentVersion> =
  model<IDocumentVersion>(
    "DocumentVersion",
    DocumentVersionSchema,
    "document_versions",
  );
