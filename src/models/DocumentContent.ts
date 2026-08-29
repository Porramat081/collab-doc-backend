import { Schema, model, Document, Model } from "mongoose";

export interface IBlock {
  id: string;
  type: string;
  properties: Record<string, any>;
  children?: IBlock[];
}

export interface IDocumentContent extends Document {
  documentId: string; // Foreign key -> PostgreSQL documents.id (UUID)
  activeStateVector: Buffer; // Compressed Yjs state vector binary
  blocks: IBlock[];
  updatedAt: Date;
}

export const BlockSchema = new Schema<IBlock>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true, index: true },
    properties: { type: Schema.Types.Mixed, default: {} },
    children: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false },
);

const DocumentContentSchema = new Schema<IDocumentContent>(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    activeStateVector: {
      type: Buffer,
      required: true,
    },
    blocks: {
      type: [BlockSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  },
);

export const DocumentContentModel: Model<IDocumentContent> =
  model<IDocumentContent>(
    "DocumentContent",
    DocumentContentSchema,
    "documents_content",
  );
