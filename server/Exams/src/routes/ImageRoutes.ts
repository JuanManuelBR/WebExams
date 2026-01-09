// src/routes/image.routes.ts
import { Router } from "express";
import { ImageController } from "@src/controllers/ImageController";

import { upload } from "@src/middlewares/upload";

const router = Router();

router.post("/upload", upload.single("image"), ImageController.upload);
router.get("/:fileName", ImageController.get);
router.delete("/:fileName", ImageController.delete);

export default router;
