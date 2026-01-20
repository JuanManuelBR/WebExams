import { Router } from "express";
import { ExamController } from "@src/controllers/ExamController";

const router = Router();

// Iniciar intento de examen
router.post("/attempt/start", ExamController.startAttempt);

// Reanudar intento de examen
router.post("/attempt/resume", ExamController.resumeAttempt);

// Guardar respuesta
router.post("/answer", ExamController.saveAnswer);

// Registrar evento (fraude)
router.post("/event", ExamController.createEvent);

// Finalizar intento
router.post("/attempt/:intento_id/finish", ExamController.finishAttempt);

// Desbloquear intento (solo profesor)
router.post("/attempt/:intento_id/unlock", ExamController.unlockAttempt);

export default router;