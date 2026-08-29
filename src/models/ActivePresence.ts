import { Schema, model, Document, Model } from "mongoose";

export interface ICursor {
  blockId: string;
  offset: number;
}

export interface IActivePresence extends Document {
  documentId: string;
  userId: string;
  socketId: string;
  cursor?: ICursor;
  color: string;
  lastHeartbeat: Date;
}

const ActivePresenceSchema = new Schema<IActivePresence>(
  {
    documentId: { type: String, required: true },
    userId: { type: String, required: true },
    socketId: { type: String, required: true, unique: true },
    cursor: {
      blockId: { type: String },
      offset: { type: Number, default: 0 },
    },
    color: { type: String, default: "#3B82F6" },
    lastHeartbeat: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

// TTL Index: Automatically drops cursor session if no heartbeat received for 30 seconds
ActivePresenceSchema.index({ lastHeartbeat: 1 }, { expireAfterSeconds: 30 });
ActivePresenceSchema.index({ documentId: 1, userId: 1 }, { unique: true });

export const ActivePresenceModel: Model<IActivePresence> =
  model<IActivePresence>(
    "ActivePresence",
    ActivePresenceSchema,
    "active_presence",
  );
