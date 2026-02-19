import { Request, Response, NextFunction } from "express";
import { ExamService } from "../services/ExamService";
import { validateDTO, throwValidationErrors } from "../validators/common";
import { CreateExamAttemptDto } from "../dtos/Create-Examttempt.dto";
import { CreateExamAnswerDto } from "../dtos/Create-ExamAnswer.dto";
import { CreateExamEventDto } from "../dtos/Create-ExamEvent.dto";
import { StartExamAttemptDto } from "../dtos/Start-ExamAttempt.dto";
import { ResumeExamAttemptDto } from "../dtos/Resume-ExamAttempt.dto";
import { UpdateManualGradeDto } from "../dtos/Update-ManualGrade.dto";
import { UpdatePDFGradeDto } from "../dtos/Update-PDFGrade.dto";

export class ExamController {
  static async startAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = await validateDTO(StartExamAttemptDto, req.body);
      if (errors.length) throwValidationErrors(errors);

      const result = await ExamService.startAttempt(
        req.body,
        req.app.get("io"),
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async resumeAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = await validateDTO(ResumeExamAttemptDto, req.body);
      if (errors.length) throwValidationErrors(errors);

      const result = await ExamService.resumeAttempt(
        req.body,
        req.app.get("io"),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async saveAnswer(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = await validateDTO(CreateExamAnswerDto, req.body);
      if (errors.length) throwValidationErrors(errors);

      const result = await ExamService.saveAnswer(req.body, req.app.get("io"));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = await validateDTO(CreateExamEventDto, req.body);
      if (errors.length) throwValidationErrors(errors);

      const result = await ExamService.createEvent(req.body, req.app.get("io"));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async finishAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const intento_id = Number(req.params.intento_id);

      if (isNaN(intento_id)) {
        return res.status(400).json({ message: "ID de intento inválido" });
      }

      const result = await ExamService.finishAttempt(
        intento_id,
        req.app.get("io"),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async unlockAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const intento_id = Number(req.params.intento_id);

      if (isNaN(intento_id)) {
        return res.status(400).json({ message: "ID de intento inválido" });
      }

      const result = await ExamService.unlockAttempt(
        intento_id,
        req.app.get("io"),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getActiveAttemptsByExam(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const examId = Number(req.params.examId);

      if (isNaN(examId)) {
        return res.status(400).json({ message: "ID de examen inválido" });
      }

      const attempts = await ExamService.getActiveAttemptsByExam(examId);
      res.status(200).json(attempts);
    } catch (err) {
      next(err);
    }
  }

  static async abandonAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const intento_id = Number(req.params.intento_id);

      if (isNaN(intento_id)) {
        return res.status(400).json({ message: "ID de intento inválido" });
      }

      const result = await ExamService.abandonAttempt(
        intento_id,
        req.app.get("io"),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getAttemptEvents(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const attemptId = Number(req.params.attemptId);

      if (isNaN(attemptId)) {
        return res.status(400).json({ message: "ID de intento inválido" });
      }

      const events = await ExamService.getAttemptEvents(attemptId);
      res.status(200).json(events);
    } catch (err) {
      next(err);
    }
  }
  static async markEventsAsRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const attemptId = Number(req.params.attemptId);

      if (isNaN(attemptId)) {
        return res.status(400).json({ message: "ID de intento inválido" });
      }

      const result = await ExamService.markEventsAsRead(
        attemptId,
        req.app.get("io"),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getAttemptDetails(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const intento_id = Number(req.params.intento_id);

      if (isNaN(intento_id)) {
        return res.status(400).json({ message: "ID de intento inválido" });
      }

      const details = await ExamService.getAttemptDetails(intento_id);
      res.status(200).json(details);
    } catch (err) {
      next(err);
    }
  }

  static async updateManualGrade(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const respuesta_id = Number(req.params.respuesta_id);

      if (isNaN(respuesta_id)) {
        return res.status(400).json({ message: "ID de respuesta inválido" });
      }

      const errors = await validateDTO(UpdateManualGradeDto, req.body);
      if (errors.length) throwValidationErrors(errors);

      const result = await ExamService.updateManualGrade(
        respuesta_id,
        req.body.puntaje,
        req.body.retroalimentacion,
        req.app.get("io"),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async updatePDFAttemptGrade(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const intento_id = Number(req.params.intento_id);

      if (isNaN(intento_id)) {
        return res.status(400).json({ message: "ID de intento inválido" });
      }

      const errors = await validateDTO(UpdatePDFGradeDto, req.body);
      if (errors.length) throwValidationErrors(errors);

      const result = await ExamService.updatePDFAttemptGrade(
        intento_id,
        req.body.puntaje,
        req.body.retroalimentacion,
        req.app.get("io"),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async forceFinishActiveAttempts(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const examId = Number(req.params.examId);

      if (isNaN(examId)) {
        return res.status(400).json({ message: "ID de examen inválido" });
      }

      const result = await ExamService.forceFinishActiveAttempts(
        examId,
        req.app.get("io"),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async deleteAttemptEvents(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const attemptId = Number(req.params.attemptId);

      if (isNaN(attemptId)) {
        return res.status(400).json({ message: "ID de intento inválido" });
      }

      const result = await ExamService.deleteAttemptEvents(
        attemptId,
        req.app.get("io"),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async forceFinishSingleAttempt(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const attemptId = Number(req.params.attemptId);

      if (isNaN(attemptId)) {
        return res.status(400).json({ message: "ID de intento inválido" });
      }

      const result = await ExamService.forceFinishSingleAttempt(
        attemptId,
        req.app.get("io"),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async deleteAttempt(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const attemptId = Number(req.params.attemptId);

      if (isNaN(attemptId)) {
        return res.status(400).json({ message: "ID de intento inválido" });
      }

      const result = await ExamService.deleteAttempt(
        attemptId,
        req.app.get("io"),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getAttemptCountByExam(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const examId = Number(req.params.examId);

      if (isNaN(examId)) {
        return res.status(400).json({ message: "ID de examen inválido" });
      }

      const count = await ExamService.getAttemptCountByExam(examId);
      res.status(200).json({ count });
    } catch (err) {
      next(err);
    }
  }

  static async downloadGrades(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const examId = Number(req.params.examId);

      if (isNaN(examId)) {
        return res.status(400).json({ message: "ID de examen inválido" });
      }

      const buffer = await ExamService.getGradesForDownload(examId);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=notas_examen_${examId}.xlsx`,
      );
      res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  }

  static async getAttemptFeedback(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { codigo_acceso } = req.params;

      if (!codigo_acceso || typeof codigo_acceso !== "string") {
        return res.status(400).json({ message: "Código de acceso inválido" });
      }

      const result = await ExamService.getAttemptFeedback(codigo_acceso);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
