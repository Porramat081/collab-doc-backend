import type { Request, Response, NextFunction } from "express";
import { DocumentRole, hasPermission } from "@/types/permission";
import { prisma } from "@/db/connection";

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string };
  documentPermission?: { role: DocumentRole };
}

export const requireDocumentRole = (requiredRole: DocumentRole) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const documentId = req.params.documentId || req.body.documentId;

      if (!userId || !documentId) {
        res.status(400).json({ error: "Missing userId or documentId" });
        return;
      }
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { members: { where: { userId } } },
      });
      if (!document) {
        res.status(404).json({ error: "Document not found" });
        return;
      }

      if (document.ownerId === userId) {
        req.documentPermission = { role: DocumentRole.OWNER };
        return next();
      }

      const member = document.members[0];
      if (
        !member ||
        !hasPermission(member.role as DocumentRole, requiredRole)
      ) {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }

      req.documentPermission = { role: member.role as DocumentRole };
      next();
    } catch (err) {
      res.status(500).json({ error: "Permission evaluation failed" });
    }
  };
};
