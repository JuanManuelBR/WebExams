import { NextFunction, Request, Response } from "express";
import { ExamService } from "../services/ExamsService";
import { throwHttpError } from "../utils/errors";
import { imageService } from "../services/ImageService";
import { pdfService } from "../services/PDFService";
import { AuthenticatedRequest } from "../middlewares/auth";

const exam_service = new ExamService();

export class ExamsController {
  static async addExam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const uploadedImages: string[] = [];
    let uploadedPDF: string | null = null;

    try {
      const data = JSON.parse(req.body.data);
      const cookies = req.headers.cookie;
      const files = req.files as any[];

      if (files && files.length > 0) {
        for (const file of files) {
          if (file.fieldname === "examPDF") {
            const { url } = await pdfService.savePDF(file);
            uploadedPDF = url;
            data.archivoPDF = url;
          } else {
            const match = file.fieldname.match(/^image_(\d+)$/);
            if (match) {
              const index = parseInt(match[1]);
              if (data.questions[index]) {
                const { url } = await imageService.saveImage(file);
                uploadedImages.push(url);
                data.questions[index].nombreImagen = url;
              }
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
      for (const url of uploadedImages) {
        await imageService.deleteImage(url);
      }
      if (uploadedPDF) {
        await pdfService.deletePDF(uploadedPDF);
      }
      next(error);
    }
  }

  static async listExams(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const examenes = await exam_service.listExams();
      return res.status(200).json(examenes);
    } catch (error) {
      next(error);
    }
  }

  static async getExamByCodigo(req: Request, res: Response, next: NextFunction) {
    try {
      const codigo = req.params.codigoExamen;
      const examen = await exam_service.getExamByCodigo(codigo);
      return res.status(200).json(examen);
    } catch (error) {
      next(error);
    }
  }

  static async getExamsByUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      if (isNaN(userId)) throwHttpError("ID de usuario inválido", 400);
      const examenes = await exam_service.getExamsByUser(userId, req.headers.cookie);
      return res.status(200).json(examenes);
    } catch (error) {
      next(error);
    }
  }

  static async deleteExamsByUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.id);
      if (isNaN(userId)) throwHttpError("ID de usuario inválido", 400);

      const examenes = await exam_service.getExamsByUser(userId, req.headers.cookie);

      for (const examen of examenes) {
        if ((examen as any).archivoPDF) {
          await pdfService.deletePDF((examen as any).archivoPDF);
        }
        if (examen.questions) {
          for (const question of examen.questions) {
            if ((question as any).nombreImagen) {
              await imageService.deleteImage((question as any).nombreImagen);
            }
          }
        }
      }

      await exam_service.deleteExamsByUser(userId, req.headers.cookie);

      return res.status(200).json({ message: "Exámenes eliminados correctamente" });
    } catch (error) {
      next(error);
    }
  }

  static async getExamById(req: Request, res: Response, next: NextFunction) {
    try {
      const examId = Number(req.params.id);
      if (isNaN(examId)) throwHttpError("ID de examen inválido", 400);
      const examen = await exam_service.getExamById(examId);
      return res.status(200).json(examen);
    } catch (error) {
      next(error);
    }
  }

  static async getExamForAttempt(req: Request, res: Response) {
    try {
      const { codigo } = req.params;
      const exam = await exam_service.getExamForAttempt(codigo);
      if (!exam) {
        return res.status(404).json({ message: "Examen no encontrado" });
      }
      return res.json(exam);
    } catch (error) {
      console.error("❌ Error obteniendo examen público:", error);
      return res.status(500).json({ message: "Error al obtener el examen" });
    }
  }

  static async validatePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { codigo_examen, contrasena } = req.body;
      const isValid = await exam_service.validatePassword(codigo_examen, contrasena);
      return res.status(200).json({ valid: isValid });
    } catch (error) {
      next(error);
    }
  }

  static async updateExamStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const examId = Number(req.params.id);
      const { estado } = req.body;
      const profesorId = req.user.id;

      if (isNaN(examId)) throwHttpError("ID de examen inválido", 400);
      if (!["open", "closed", "archivado"].includes(estado)) {
        throwHttpError("Estado inválido. Debe ser 'open', 'closed' o 'archivado'", 400);
      }

      const examen = await exam_service.updateExamStatus(examId, estado, profesorId, req.headers.cookie);

      return res.status(200).json({ message: "Estado actualizado correctamente", examen });
    } catch (error) {
      next(error);
    }
  }

  static async deleteExamById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const examId = Number(req.params.id);
      const profesorId = req.user.id;
      if (isNaN(examId)) throwHttpError("ID de examen inválido", 400);
      await exam_service.deleteExamById(examId, profesorId, req.headers.cookie);
      return res.status(200).json({ message: "Examen eliminado correctamente" });
    } catch (error) {
      next(error);
    }
  }

  static async updateExam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const uploadedImages: string[] = [];
    let uploadedPDF: string | null = null;

    try {
      const examId = Number(req.params.id);
      const profesorId = req.user.id;

      if (isNaN(examId)) throwHttpError("ID de examen inválido", 400);
      if (!req.body.data) throwHttpError("El campo 'data' es requerido en el body", 400);

      const data = JSON.parse(req.body.data);
      const cookies = req.headers.cookie;
      const files = req.files as any[];

      if (files && files.length > 0) {
        for (const file of files) {
          if (file.fieldname === "examPDF") {
            const { url } = await pdfService.savePDF(file);
            uploadedPDF = url;
            data.archivoPDF = url;
          } else {
            const match = file.fieldname.match(/^image_(\d+)$/);
            if (match) {
              const index = parseInt(match[1]);
              if (data.questions && data.questions[index]) {
                const { url } = await imageService.saveImage(file);
                uploadedImages.push(url);
                data.questions[index].nombreImagen = url;
              }
            }
          }
        }
      }

      const examen = await exam_service.updateExam(examId, data, profesorId, cookies);

      return res.status(200).json({ message: "Examen actualizado correctamente", examen });
    } catch (error) {
      for (const url of uploadedImages) {
        await imageService.deleteImage(url);
      }
      if (uploadedPDF) {
        await pdfService.deletePDF(uploadedPDF);
      }
      next(error);
    }
  }

  static async archiveExam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const examId = Number(req.params.id);
      const profesorId = req.user.id;
      if (isNaN(examId)) throwHttpError("ID de examen inválido", 400);
      const examen = await exam_service.archiveExam(examId, profesorId, req.headers.cookie);
      return res.status(200).json({ message: "Examen archivado correctamente", examen });
    } catch (error) {
      next(error);
    }
  }

  static async copyExam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const examId = Number(req.params.id);
      const profesorId = req.user.id;
      if (isNaN(examId)) throwHttpError("ID de examen inválido", 400);
      const examen = await exam_service.copyExam(examId, profesorId, req.headers.cookie);
      return res.status(201).json({ message: "Examen copiado correctamente", examen });
    } catch (error) {
      next(error);
    }
  }

  static async regenerateExamCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const examId = Number(req.params.id);
      const profesorId = req.user.id;
      if (isNaN(examId)) throwHttpError("ID de examen inválido", 400);
      const result = await exam_service.regenerateExamCode(examId, profesorId, req.headers.cookie);
      return res.status(200).json({ message: "Código de examen regenerado correctamente", ...result });
    } catch (error) {
      next(error);
    }
  }
}