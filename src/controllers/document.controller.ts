import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/rbac.middleware";
import { prisma } from "../db/connection";

export class DocumentController {
  static async listDocuments(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const documents = await prisma.document.findMany({
        where: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const enriched = documents.map((document) => {
        const member = document.members.find((entry) => entry.userId === userId);
        return {
          ...document,
          userRole: document.ownerId === userId ? "OWNER" : member?.role || "VIEWER",
        };
      });

      res.status(200).json(enriched);
    } catch (err) {
      res.status(500).json({ error: "Failed to list documents" });
    }
  }

  static async createDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { title } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const document = await prisma.document.create({
        data: { title: title || "Untitled Document", ownerId: userId },
      });

      res.status(201).json(document);
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
          owner: { select: { id: true, name: true, email: true } },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      if (!document) {
        res.status(404).json({ error: "Document not found" });
        return;
      }

      const member = document.members.find((entry) => entry.userId === req.user?.id);
      res.status(200).json({
        ...document,
        userRole: document.ownerId === req.user?.id ? "OWNER" : member?.role || req.documentPermission?.role || "VIEWER",
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch document" });
    }
  }

  static async updateDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;
      const { title, content } = req.body ?? {};

      const updates: Record<string, unknown> = {};
      if (title !== undefined) {
        updates.title = String(title || "Untitled Document");
      }
      if (content !== undefined) {
        updates.content = content;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: "No document changes provided" });
        return;
      }

      const updated = await prisma.document.update({
        where: { id: documentId as string },
        data: { ...updates, updatedAt: new Date() },
      });

      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to update document" });
    }
  }

  static async getMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;
      const rows = await prisma.documentMember.findMany({
        where: { documentId: documentId as string },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      });

      res.status(200).json(rows.map((row) => ({ ...row.user, role: row.role })));
    } catch (err) {
      res.status(500).json({ error: "Failed to load members" });
    }
  }

  static async updateMemberRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params as { documentId: string };
      const { email, userId, role } = req.body;

      const targetUser = userId
        ? await prisma.user.findUnique({ where: { id: userId } })
        : email
          ? await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } })
          : null;

      if (!targetUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const member = await prisma.documentMember.upsert({
        where: { documentId_userId: { documentId, userId: targetUser.id } },
        update: { role },
        create: {
          documentId,
          userId: targetUser.id,
          role,
        },
      });

      res.status(200).json({ ...member, user: targetUser });
    } catch (err) {
      res.status(500).json({ error: "Failed to update permissions" });
    }
  }

  static async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      const documentId = Array.isArray(req.params.documentId)
        ? req.params.documentId[0]
        : req.params.documentId;
      const userId = Array.isArray(req.params.userId)
        ? req.params.userId[0]
        : req.params.userId;

      if (!userId || !documentId) {
        res.status(400).json({ error: "Missing user id" });
        return;
      }

      await prisma.documentMember.delete({
        where: {
          documentId_userId: {
            documentId,
            userId,
          },
        },
      });

      res.status(200).json({ ok: true, removedUserId: userId });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove collaborator" });
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
