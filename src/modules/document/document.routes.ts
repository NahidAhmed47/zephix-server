import { Router } from "express";
import { DocumentController } from "./document.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import { upload } from "@/config/multer";

const router = Router();

router.use(auth);
router.get("/", requirePermission("documents.view"), DocumentController.list);
router.post(
  "/",
  requirePermission("documents.create"),
  upload.single("file"),
  DocumentController.upload
);
router.delete(
  "/:id",
  requirePermission("documents.delete"),
  DocumentController.remove
);

export const DocumentRoutes = router;
