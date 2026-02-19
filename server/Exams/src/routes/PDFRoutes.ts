// src/routes/PDFRoutes.ts
import { Router } from "express";
import { PDFController } from "../controllers/PDFController";

const router = Router();


router.get("/proxy", PDFController.proxy);
router.get("/:fileName", PDFController.get);
router.get("/:fileName/info", PDFController.getInfo);
router.delete("/:fileName", PDFController.delete);

export default router;