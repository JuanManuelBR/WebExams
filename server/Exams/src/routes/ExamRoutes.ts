import { ExamsController } from "@src/controllers/ExamController";
import { Router } from "express";
import { authMiddleware } from "@src/middlewares/auth";
import { upload } from "@src/middlewares/upload";

const router = Router();

router.get("/getForStudent/:codigoExamen", ExamsController.getExamByCodigo);

router.use(authMiddleware);
router.post("/", upload.any(), ExamsController.addExam);
router.get("/", ExamsController.listExams);

router.get("/", ExamsController.listExams);
router.get("/:id", ExamsController.getExamsByUser);

router.delete("/:id", ExamsController.deleteExamsByUser);

export default router;
