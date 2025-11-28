import { Request, Response } from "express";
import { ExamService } from "@src/services/ExamsService";

const exam_service = new ExamService();

export class ExamsController {
  static async addExam(req: Request, res: Response) {
    try {
      const data = req.body;
      const cookies = req.headers.cookie;

      const examen = await exam_service.addExam(data, cookies);

      return res.status(200).json({
        message: "Examen creado correctamente",
        examen,
      });
    } catch (error: any) {
      
      return res.status(400).json({ message: error.message });
    }
  }

  static async listExams(res: Response) {
    try {
      const profesores = await exam_service.listExams();

      return res.status(200).json(profesores);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
  
}
