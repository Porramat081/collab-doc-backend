import { Router, raw } from "express";
import { documentController } from "../controllers/document.controller";

const router = Router();

router.post("/", (req, res, next) => documentController.create(req, res, next));
router.get("/:documentId", (req, res, next) =>
  documentController.getDocument(req, res, next),
);
router.put("/:documentId/snapshot", (req, res, next) =>
  documentController.updateSnapshot(req, res, next),
);

// Stream binary CRDT updates using express raw parser
router.post(
  "/:documentId/crdt",
  raw({ type: "application/octet-stream", limit: "10mb" }),
  (req, res, next) => documentController.appendCRDTUpdate(req, res, next),
);

export default router;
