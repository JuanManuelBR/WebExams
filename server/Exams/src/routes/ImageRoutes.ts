// src/routes/image.routes.ts
import { Router } from "express";
import { ImageController } from "../controllers/ImageController";

import { upload } from "../middlewares/upload";

const router = Router();

router.post("/upload", upload.single("image"), ImageController.upload);
router.get("/:fileName", ImageController.get);
router.delete("/:fileName", ImageController.delete);

export default router;
