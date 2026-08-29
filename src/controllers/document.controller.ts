import type { Request, Response, NextFunction } from "express";
import { documentService } from "../services";

export class DocumentController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, ownerId, initialContent } = req.body;
      const result = await documentService.createDocument({
        title,
        ownerId,
        initialContent,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getDocument(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { documentId } = req.params;
      // Derived from auth context / headers (hardcoded mock for endpoint structure)
      const userId = req.headers["x-user-id"] as string;

      const result = await documentService.getDocument(
        documentId as string,
        userId,
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateSnapshot(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { documentId } = req.params;
      const { content, version } = req.body;
      const userId = req.headers["x-user-id"] as string;

      await documentService.saveSnapshot(
        documentId as string,
        userId,
        content,
        version,
      );
      res
        .status(200)
        .json({ success: true, message: "Snapshot saved successfully." });
    } catch (error) {
      next(error);
    }
  }

  async appendCRDTUpdate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { documentId } = req.params;
      const userId = req.headers["x-user-id"] as string;

      // Handle raw binary CRDT updates passed via body buffer
      const updateBlob = new Uint8Array(req.body);

      await documentService.applyCRDTUpdate(
        documentId as string,
        userId,
        updateBlob,
      );
      res.status(200).json({ success: true, message: "CRDT update received." });
    } catch (error) {
      next(error);
    }
  }
}

export const documentController = new DocumentController();
