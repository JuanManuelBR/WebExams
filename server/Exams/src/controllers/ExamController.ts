// src/controllers/ExamController.ts
import { NextFunction, Request, Response } from "express";
import { ExamService } from "@src/services/ExamsService";
import { throwHttpError } from "@src/utils/errors";
import { imageService } from "@src/services/ImageService";

const exam_service = new ExamService();

export class ExamsController {
  static async addExam(req: Request, res: Response, next: NextFunction) {
    const uploadedImages: string[] = [];

    try {
      const data = JSON.parse(req.body.data);
      const cookies = req.headers.cookie;

      const files = req.files as any[];

      if (files && files.length > 0) {
        for (const file of files) {
          const match = file.fieldname.match(/^image_(\d+)$/);
          if (match) {
            const index = parseInt(match[1]);
            if (data.questions[index]) {
              const fileName = await imageService.saveImage(file);
              uploadedImages.push(fileName);
              data.questions[index].nombreImagen = fileName;
            }
          }
        }
      }

      const examen = await exam_service.addExam(data, cookies);

      return res.status(201).json({
        message: "Examen creado correctamente",
        examen,
      });
    } catch (error) {
      for (const fileName of uploadedImages) {
        await imageService.deleteImage(fileName);
      }
      next(error);
    }
  }

  static async listExams(req: Request, res: Response, next: NextFunction) {
    try {
      const examenes = await exam_service.listExams();

      return res.status(200).json(examenes);
    } catch (error) {
      next(error);
    }
  }

  static async getExamsByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.id);

      if (isNaN(userId)) {
        throwHttpError("ID de usuario inválido", 400);
      }

      const examenes = await exam_service.getExamsByUser(
        userId,
        req.headers.cookie
      );

      return res.status(200).json(examenes);
    } catch (error) {
      next(error);
    }
  }

  static async deleteExamsByUser(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = Number(req.params.id);

      if (isNaN(userId)) {
        throwHttpError("ID de usuario inválido", 400);
      }

      const examenes = await exam_service.getExamsByUser(
        userId,
        req.headers.cookie
      );

      for (const examen of examenes) {
        if (examen.questions) {
          for (const question of examen.questions) {
            if ((question as any).nombreImagen) {
              await imageService.deleteImage((question as any).nombreImagen);
            }
          }
        }
      }

      await exam_service.deleteExamsByUser(userId, req.headers.cookie);

      return res.status(200).json({
        message: "Exámenes eliminados correctamente",
      });
    } catch (error) {
      next(error);
    }
  }
}
