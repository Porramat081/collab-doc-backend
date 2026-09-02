import { z } from "zod";

export const CreateDocumentSchema = z.object({
  title: z
    .string()
    .min(1, "Document title is required")
    .max(255, "Title too long"),
  initialContent: z.string().optional(),
});

export const UpdateSnapshotSchema = z.object({
  content: z.string({ message: "Content is required" }),
  version: z.number().int().positive("Version must be a positive integer"),
});

export const DocumentParamSchema = z.object({
  documentId: z.string().uuid("Document ID must be a valid UUID"),
});

export type CreateDocumentInputSchema = z.infer<typeof CreateDocumentSchema>;
