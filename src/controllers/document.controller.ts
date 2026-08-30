import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/rbac.middleware";
import { prisma } from "../db/connection";

export class DocumentController {
  static async createDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { title } = req.body;
      if (userId) {
        const document = await prisma.document.create({
          data: { title: title || "Untitled Document", ownerId: userId },
        });

        res.status(201).json(document);
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to create document" });
    }
  }
  static async getDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;
      const document = await prisma.document.findUnique({
        where: { id: documentId as string },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });
      res
        .status(200)
        .json({ ...document, userRole: req.documentPermission?.role });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch document" });
    }
  }

  static async updateDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;
      const { title } = req.body;

      const updated = await prisma.document.update({
        where: { id: documentId as string },
        data: { title, updatedAt: new Date() },
      });

      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to update document" });
    }
  }

  static async updateMemberRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params as { documentId: string };
      const { targetUserId, role } = req.body;

      const member = await prisma.documentMember.upsert({
        where: { documentId_userId: { documentId, userId: targetUserId } },
        update: { role },
        create: {
          documentId: documentId as string,
          userId: targetUserId,
          role,
        },
      });
      res.status(200).json(member);
    } catch (err) {
      res.status(500).json({ error: "Failed to update permissions" });
    }
  }

  static async deleteDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;
      await prisma.document.delete({ where: { id: documentId as string } });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  }
}
