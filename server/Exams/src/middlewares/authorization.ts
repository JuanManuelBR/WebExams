import { AppDataSource } from "../data-source/AppDataSource";
import { Exam } from "../models/Exam";
import { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "./auth";

export const authorizeExamOwner = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const examId = Number(req.params.id);
    const userId = req.user.id; // del JWT o sesión

    const exam = await AppDataSource.getRepository(Exam).findOne({
      where: { id: examId },
      select: ["id", "id_profesor"],
    });

    if (!exam) {
      return res.status(404).json({ message: "Examen no encontrado" });
    }

    if (exam.id_profesor !== userId) {
      return res.status(403).json({
        message: "No tienes permiso para acceder a ese recurso",
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};
