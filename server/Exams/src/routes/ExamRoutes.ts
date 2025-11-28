import { ExamsController } from "@src/controllers/ExamController";
import { Router } from "express";
import { authMiddleware } from "@src/middlewares/auth";


const router = Router();


router.use(authMiddleware);
router.post("/", ExamsController.addExam);
router.get("/", ExamsController.listExams);

export default router;
