import { ExamsController } from "@src/controllers/ExamsController";
import { Router } from "express";
import { authMiddleware } from "@src/middlewares/auth";
//import { authMiddleware } from "@src/middlewares/auth";

const router = Router();
router.use(authMiddleware);
router.post("/", ExamsController.addExam);


export default router;
