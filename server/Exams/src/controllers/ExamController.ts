// src/controllers/ExamController.ts
import { NextFunction, Request, Response } from "express";
import { ExamService } from "@src/services/ExamsService";
import { throwHttpError } from "@src/utils/errors";
import { imageService } from "@src/services/ImageService";
import { pdfService } from "@src/services/PDFService";
import { AuthenticatedRequest } from "@src/middlewares/auth";

const exam_service = new ExamService();

export class ExamsController {
  static async addExam(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    const uploadedImages: string[] = [];
    let uploadedPDF: string | null = null;

    try {
      const data = JSON.parse(req.body.data);
      const cookies = req.headers.cookie;

      const files = req.files as any[];

      if (files && files.length > 0) {
        for (const file of files) {
          // Manejar archivo PDF
          if (file.fieldname === "examPDF") {
            const pdfFileName = await pdfService.savePDF(file);
            uploadedPDF = pdfFileName;
            data.archivoPDF = pdfFileName;
          }
          // Manejar imágenes de preguntas
          else {
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
      }

      const examen = await exam_service.addExam(data, cookies);

      return res.status(201).json({
        message: "Examen creado correctamente",
        examen,
      });
    } catch (error) {
      // Limpiar archivos subidos en caso de error
      for (const fileName of uploadedImages) {
        await imageService.deleteImage(fileName);
      }

      if (uploadedPDF) {
        await pdfService.deletePDF(uploadedPDF);
      }

      next(error);
    }
  }

  static async listExams(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const examenes = await exam_service.listExams();

      return res.status(200).json(examenes);
    } catch (error) {
      next(error);
    }
  }

  static async getExamByCodigo(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const codigo = req.params.codigoExamen;
      const examen = await exam_service.getExamByCodigo(codigo);

      return res.status(200).json(examen);
    } catch (error) {
      next(error);
    }
  }

  static async getExamsByUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user.id;

      if (isNaN(userId)) {
        throwHttpError("ID de usuario inválido", 400);
      }

      const examenes = await exam_service.getExamsByUser(
        userId,
        req.headers.cookie,
      );

      return res.status(200).json(examenes);
    } catch (error) {
      next(error);
    }
  }

  static async deleteExamsByUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = Number(req.params.id);

      if (isNaN(userId)) {
        throwHttpError("ID de usuario inválido", 400);
      }

      const examenes = await exam_service.getExamsByUser(
        userId,
        req.headers.cookie,
      );

      for (const examen of examenes) {
        // Eliminar PDF del examen si existe
        if ((examen as any).archivoPDF) {
          await pdfService.deletePDF((examen as any).archivoPDF);
        }

        // Eliminar imágenes de preguntas
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

  static async getExamById(req: Request, res: Response, next: NextFunction) {
    try {
      const examId = Number(req.params.id);

      if (isNaN(examId)) {
        throwHttpError("ID de examen inválido", 400);
      }

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
        return res.status(404).json({
          message: "Examen no encontrado",
        });
      }

      return res.json(exam);
    } catch (error) {
      console.error("❌ Error obteniendo examen público:", error);
      return res.status(500).json({
        message: "Error al obtener el examen",
      });
    }
  }
  static async validatePassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { codigo_examen, contrasena } = req.body;

      const isValid = await exam_service.validatePassword(
        codigo_examen,
        contrasena,
      );

      return res.status(200).json({ valid: isValid });
    } catch (error) {
      next(error);
    }
  }

  static async updateExamStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const examId = Number(req.params.id);
      const { estado } = req.body;
      const profesorId = req.user.id;

      if (isNaN(examId)) {
        throwHttpError("ID de examen inválido", 400);
      }

      if (!["open", "closed", "archivado"].includes(estado)) {
        throwHttpError("Estado inválido. Debe ser 'open', 'closed' o 'archivado'", 400);
      }

      const examen = await exam_service.updateExamStatus(
        examId,
        estado,
        profesorId,
        req.headers.cookie,
      );

      return res.status(200).json({
        message: "Estado actualizado correctamente",
        examen,
      });
    } catch (error) {
      next(error);
    }
  }
  static async deleteExamById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const examId = Number(req.params.id);
      const profesorId = req.user.id;

      if (isNaN(examId)) {
        throwHttpError("ID de examen inválido", 400);
      }

      await exam_service.deleteExamById(examId, profesorId, req.headers.cookie);

      return res.status(200).json({
        message: "Examen eliminado correctamente",
      });
    } catch (error) {
      next(error);
    }
  }
  static async updateExam(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    const uploadedImages: string[] = [];
    let uploadedPDF: string | null = null;

    try {
      const examId = Number(req.params.id);
      const profesorId = req.user.id;

      if (isNaN(examId)) {
        throwHttpError("ID de examen inválido", 400);
      }

      // ✅ DEBUG: Ver qué contiene req.body
      console.log("📦 req.body completo:", req.body);
      console.log("📦 req.body.data:", req.body.data);
      console.log("📦 req.files:", req.files);

      // ✅ Verificar si req.body.data existe
      if (!req.body.data) {
        throwHttpError("El campo 'data' es requerido en el body", 400);
      }

      const data = JSON.parse(req.body.data);
      const cookies = req.headers.cookie;
      const files = req.files as any[];

      if (files && files.length > 0) {
        for (const file of files) {
          // Manejar archivo PDF
          if (file.fieldname === "examPDF") {
            const pdfFileName = await pdfService.savePDF(file);
            uploadedPDF = pdfFileName;
            data.archivoPDF = pdfFileName;
          }
          // Manejar imágenes de preguntas
          else {
            const match = file.fieldname.match(/^image_(\d+)$/);
            if (match) {
              const index = parseInt(match[1]);
              if (data.questions && data.questions[index]) {
                const fileName = await imageService.saveImage(file);
                uploadedImages.push(fileName);
                data.questions[index].nombreImagen = fileName;
              }
            }
          }
        }
      }

      const examen = await exam_service.updateExam(
        examId,
        data,
        profesorId,
        cookies,
      );

      return res.status(200).json({
        message: "Examen actualizado correctamente",
        examen,
      });
    } catch (error) {
      // Limpiar archivos subidos en caso de error
      for (const fileName of uploadedImages) {
        await imageService.deleteImage(fileName);
      }

      if (uploadedPDF) {
        await pdfService.deletePDF(uploadedPDF);
      }

      next(error);
    }
  }

  static async archiveExam(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const examId = Number(req.params.id);
      const profesorId = req.user.id;

      if (isNaN(examId)) {
        throwHttpError("ID de examen inválido", 400);
      }

      const examen = await exam_service.archiveExam(
        examId,
        profesorId,
        req.headers.cookie,
      );

      return res.status(200).json({
        message: "Examen archivado correctamente",
        examen,
      });
    } catch (error) {
      next(error);
    }
  }
}
