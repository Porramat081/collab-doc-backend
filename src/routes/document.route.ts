import { Router } from "express";
import { authenticateJWT } from "../middleware/auth.middleware.js";
import { DocumentController } from "../controllers/document.controller.js";
import { requireDocumentRole } from "../middleware/rbac.middleware.js";
import { DocumentRole } from "../types/permission.js";

const router = Router();

router.use(authenticateJWT);

router.get("/", DocumentController.listDocuments);
router.post("/", DocumentController.createDocument);
router.get(
  "/:documentId/members",
  requireDocumentRole(DocumentRole.VIEWER),
  DocumentController.getMembers,
);
router.get(
  "/:documentId",
  requireDocumentRole(DocumentRole.VIEWER),
  DocumentController.getDocument,
);
router.patch(
  "/:documentId",
  requireDocumentRole(DocumentRole.EDITOR),
  DocumentController.updateDocument,
);

router.post(
  "/:documentId/members",
  requireDocumentRole(DocumentRole.ADMIN),
  DocumentController.updateMemberRole,
);
router.delete(
  "/:documentId/members/:userId",
  requireDocumentRole(DocumentRole.ADMIN),
  DocumentController.removeMember,
);

router.delete(
  "/:documentId",
  requireDocumentRole(DocumentRole.OWNER),
  DocumentController.deleteDocument,
);

export default router;
