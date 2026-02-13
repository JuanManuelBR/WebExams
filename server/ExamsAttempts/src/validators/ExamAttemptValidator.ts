import { AppDataSource } from "@src/data-source/AppDataSource";
import { ExamInProgress } from "@src/models/ExamInProgress";
import { throwHttpError } from "@src/utils/errors";
import axios from "axios";
import { EXAM_MS_URL } from "config/config";
export class ExamAttemptValidator {
  static async validateExamExists(codigo_examen: string) {
    try {
      const response = await axios.get(
        `${EXAM_MS_URL}/api/exams/forAttempt/${codigo_examen}`,
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throwHttpError("El código de examen no existe", 404);
      }
      throwHttpError("Error al validar el examen", 500);
    }
  }

  static async validateExamExistsById(codigo_examen: number) {
    try {
      const response = await axios.get(
        `${EXAM_MS_URL}/api/exams/by-id/${codigo_examen}`,
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throwHttpError("El código de examen no existe", 404);
      }
      throwHttpError("Error al validar el examen", 500);
    }
  }

  static validateExamState(exam: any) {
    if (exam.estado === "archivado") {
      throwHttpError(
        "No se puede presentar el examen porque ha sido archivado",
        403,
      );
    }

    if (exam.estado !== "open") {
      throwHttpError(
        "No se puede presentar el examen porque está cerrado",
        403,
      );
    }
  }

  static validateRequiredStudentData(
    exam: any,
    nombre?: string,
    correo?: string,
    identificacion?: string,
  ) {
    const errors: string[] = [];

    if (exam.necesitaNombreCompleto && !nombre) {
      errors.push("El nombre completo es requerido");
    }

    if (exam.necesitaCorreoElectrónico && !correo) {
      errors.push("El correo electrónico es requerido");
    }

    if (exam.necesitaCodigoEstudiantil && !identificacion) {
      errors.push("La identificación del estudiante es requerida");
    }

    if (errors.length > 0) {
      throwHttpError(errors.join(", "), 400);
    }
  }

  static validateExamPassword(exam: any, providedPassword?: string) {
    if (exam.necesitaContrasena) {
      if (!providedPassword) {
        throwHttpError("Se requiere contraseña para este examen", 400);
      }
      if (exam.contrasena !== providedPassword) {
        throwHttpError("Contraseña incorrecta", 401);
      }
    }
  }

  static async validateSessionUniqueness(
    codigo_acceso: string,
    id_sesion: string,
  ) {
    const repo = AppDataSource.getRepository(ExamInProgress);
    const examInProgress = await repo.findOne({
      where: { codigo_acceso },
    });

    if (!examInProgress) {
      throwHttpError("Código de acceso inválido", 404);
    }

    if (examInProgress.id_sesion !== id_sesion) {
      throwHttpError(
        "Ya existe una sesión activa para este intento. Solo puede haber un usuario conectado",
        409,
      );
    }

    return examInProgress;
  }

  static validateTimeLimit(exam: any, fecha_inicio: Date): number | null {
    if (exam.limiteTiempo > 0) {
      const tiempoLimiteMs = exam.limiteTiempo * 60 * 1000;
      const fecha_expiracion = new Date(
        fecha_inicio.getTime() + tiempoLimiteMs,
      );
      return fecha_expiracion.getTime();
    }
    return null;
  }
}
