import { ExamsController } from "@src/controllers/ExamController";
import { Router } from "express";

import { authenticateToken } from "@src/middlewares/auth";
import { upload } from "@src/middlewares/upload";
import { authorizeExamOwner } from "@src/middlewares/authorization";

const router = Router();
router.get(
  "/me",
  authenticateToken,
  ExamsController.getExamsByUser,
  authorizeExamOwner,
);

router.post("/", upload.any(), ExamsController.addExam, authenticateToken);

router.put("/:id", authenticateToken, upload.any(), ExamsController.updateExam);

router.get("/", ExamsController.listExams, authenticateToken);

router.delete("/:id", ExamsController.deleteExamsByUser, authenticateToken);

router.get("/by-id/:id", ExamsController.getExamById, authenticateToken);
router.get("/:codigoExamen", ExamsController.getExamByCodigo);
router.get("/forAttempt/:codigo", ExamsController.getExamForAttempt);
router.post("/validate-password", ExamsController.validatePassword);

router.patch(
  "/:id/status",
  authenticateToken,
  ExamsController.updateExamStatus,
);

router.patch(
  "/:id/archive",
  authenticateToken,
  ExamsController.archiveExam,
);

router.delete("/:id/single", authenticateToken, ExamsController.deleteExamById);

router.post("/:id/copy", authenticateToken, ExamsController.copyExam);

router.patch("/:id/regenerate-code", authenticateToken, ExamsController.regenerateExamCode);

export default router;
