import { Request, Response, NextFunction } from "express";
import { ExamService } from "@src/services/ExamService";
import { validateDTO, throwValidationErrors } from "@src/validators/common";
import { CreateExamAttemptDto } from "@src/dtos/Create-Examttempt.dto";
import { CreateExamAnswerDto } from "@src/dtos/Create-ExamAnswer.dto";
import { CreateExamEventDto } from "@src/dtos/Create-ExamEvent.dto";
import { StartExamAttemptDto } from "@src/dtos/Start-ExamAttempt.dto";
import { ResumeExamAttemptDto } from "@src/dtos/Resume-ExamAttempt.dto";

export class ExamController {
  static async startAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = await validateDTO(StartExamAttemptDto, req.body);
      if (errors.length) throwValidationErrors(errors);

      const result = await ExamService.startAttempt(req.body, req.app.get("io"));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async resumeAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = await validateDTO(ResumeExamAttemptDto, req.body);
      if (errors.length) throwValidationErrors(errors);

      const result = await ExamService.resumeAttempt(req.body, req.app.get("io"));
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

      const result = await ExamService.finishAttempt(intento_id, req.app.get("io"));
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

      const result = await ExamService.unlockAttempt(intento_id, req.app.get("io"));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}