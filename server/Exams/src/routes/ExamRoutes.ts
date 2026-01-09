import { ExamsController } from "@src/controllers/ExamController";
import { Router } from "express";
import { authMiddleware } from "@src/middlewares/auth";
import { upload } from "@src/middlewares/upload";

const router = Router();

router.use(authMiddleware);
router.post("/", upload.any(), ExamsController.addExam);
router.get("/", ExamsController.listExams);

router.get("/", ExamsController.listExams);
router.get("/by-user/:id", ExamsController.getExamsByUser);
router.delete("/by-user/:id", ExamsController.deleteExamsByUser);

export default router;
