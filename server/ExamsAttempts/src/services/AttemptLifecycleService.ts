import { AppDataSource } from "../data-source/AppDataSource";
import { Server } from "socket.io";
import { ExamAttempt, AttemptState } from "../models/ExamAttempt";
import { ExamAnswer } from "../models/ExamAnswer";
import { ExamEvent } from "../models/ExamEvent";
import { ExamInProgress } from "../models/ExamInProgress";
import { ExamAttemptValidator } from "../validators/ExamAttemptValidator";
import {
  generateAccessCode,
  generateSessionId,
} from "../utils/CodeGenerator";
import { throwHttpError } from "../utils/errors";
import { StartExamAttemptDto } from "../dtos/Start-ExamAttempt.dto";
import { ResumeExamAttemptDto } from "../dtos/Resume-ExamAttempt.dto";
import { ScoringService } from "./ScoringService";

export class AttemptLifecycleService {
  static async startAttempt(data: StartExamAttemptDto, io: Server) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);

    const exam = await ExamAttemptValidator.validateExamExists(
      data.codigo_examen,
    );
    ExamAttemptValidator.validateExamState(exam);
    ExamAttemptValidator.validateRequiredStudentData(
      exam,
      data.nombre_estudiante,
      data.correo_estudiante,
      data.identificacion_estudiante,
    );
    ExamAttemptValidator.validateExamPassword(exam, data.contrasena);

    // Detectar si es un examen PDF (tiene archivoPDF y no tiene preguntas)
    const esExamenPDF = !!(
      exam.archivoPDF &&
      (!exam.questions || exam.questions.length === 0)
    );

    // Para exámenes PDF el puntaje máximo es 5 (calificación directa 0-5)
    const puntajeMaximo = esExamenPDF
      ? 5
      : exam.questions.reduce((sum: number, q: any) => sum + q.puntaje, 0);

    const fecha_inicio = new Date();

    const attempt = attemptRepo.create({
      examen_id: exam.id,
      limiteTiempoCumplido: exam.limiteTiempoCumplido,
      consecuencia: exam.consecuencia,
      estado: AttemptState.ACTIVE,
      nombre_estudiante: data.nombre_estudiante || null,
      correo_estudiante: data.correo_estudiante || null,
      identificacion_estudiante: data.identificacion_estudiante || null,
      puntajeMaximo,
      fecha_inicio,
      esExamenPDF,
      calificacionPendiente: esExamenPDF,
    });

    await attemptRepo.save(attempt);

    const codigo_acceso = generateAccessCode();
    const id_sesion = generateSessionId();

    const fecha_expiracion_timestamp = ExamAttemptValidator.validateTimeLimit(
      exam,
      fecha_inicio,
    );

    const examInProgress = progressRepo.create({
      codigo_acceso,
      estado: AttemptState.ACTIVE,
      fecha_inicio,
      id_sesion,
      fecha_expiracion: fecha_expiracion_timestamp
        ? new Date(fecha_expiracion_timestamp)
        : null,
      intento_id: attempt.id,
    });

    await progressRepo.save(examInProgress);

    const room = `attempt_${attempt.id}`;
    io.to(room).emit("attempt_started", {
      attemptId: attempt.id,
      codigo_acceso,
      id_sesion,
      limiteTiempo: exam.limiteTiempo,
      fecha_expiracion: examInProgress.fecha_expiracion,
    });

    io.to(`exam_${exam.id}`).emit("student_started_exam", {
      attemptId: attempt.id,
      estudiante: {
        nombre: attempt.nombre_estudiante,
        correo: attempt.correo_estudiante,
        identificacion: attempt.identificacion_estudiante,
      },
      fecha_inicio,
    });

    return {
      attempt,
      examInProgress,
      exam,
    };
  }

  static async resumeAttempt(data: ResumeExamAttemptDto, io: Server) {
    const progressRepo = AppDataSource.getRepository(ExamInProgress);
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);

    const examInProgress = await progressRepo.findOne({
      where: { codigo_acceso: data.codigo_acceso },
    });

    if (!examInProgress) {
      throwHttpError("Código de acceso inválido", 404);
    }

    if (examInProgress.estado === AttemptState.FINISHED) {
      throwHttpError("Este intento ya ha finalizado", 403);
    }

    if (examInProgress.estado === AttemptState.BLOCKED) {
      throwHttpError(
        "Este intento está bloqueado. Contacta al profesor",
        403,
      );
    }

    const attempt = await attemptRepo.findOne({
      where: { id: examInProgress.intento_id },
      relations: ["respuestas"],
    });

    if (!attempt) {
      throwHttpError("Intento no encontrado", 404);
    }

    if (examInProgress.estado === AttemptState.ABANDONADO) {
      // --- REANUDAR INTENTO ABANDONADO ---

      // Verificar que el tiempo no haya expirado
      if (examInProgress.fecha_expiracion) {
        const now = new Date();
        if (now > examInProgress.fecha_expiracion) {
          await this.handleTimeExpired(attempt, examInProgress, io);
          throwHttpError("El tiempo del examen ha expirado", 403);
        }
      }

      // Generar nueva sesión (invalida cualquier sesión anterior)
      const nuevoIdSesion = generateSessionId();

      examInProgress.estado = AttemptState.ACTIVE;
      examInProgress.id_sesion = nuevoIdSesion;
      examInProgress.fecha_fin = null;
      await progressRepo.save(examInProgress);

      attempt.estado = AttemptState.ACTIVE;
      attempt.fecha_fin = null;
      await attemptRepo.save(attempt);

      // Notificar al profesor
      io.to(`exam_${attempt.examen_id}`).emit("student_resumed_exam", {
        attemptId: attempt.id,
        estudiante: {
          nombre: attempt.nombre_estudiante,
          correo: attempt.correo_estudiante,
          identificacion: attempt.identificacion_estudiante,
        },
      });

      console.log(
        `🔄 Intento ${attempt.id} reanudado desde estado abandonado`,
      );
    } else if (examInProgress.estado === AttemptState.ACTIVE) {
      // --- RECONEXIÓN NORMAL (misma sesión) ---

      if (data.id_sesion && examInProgress.id_sesion !== data.id_sesion) {
        throwHttpError(
          "Ya existe una sesión activa para este intento. Solo puede haber un usuario conectado",
          409,
        );
      }

      if (!data.id_sesion) {
        throwHttpError(
          "El intento aún está activo. Si perdiste la conexión, espera unos segundos e intenta de nuevo",
          409,
        );
      }

      // Verificar expiración
      if (examInProgress.fecha_expiracion) {
        const now = new Date();
        if (now > examInProgress.fecha_expiracion) {
          await this.handleTimeExpired(attempt, examInProgress, io);
          throwHttpError("El tiempo del examen ha expirado", 403);
        }
      }
    }

    // Obtener examen sanitizado (mismo formato que startAttempt)
    const examBasic = await ExamAttemptValidator.validateExamExistsById(
      attempt.examen_id,
    );
    const exam = await ExamAttemptValidator.validateExamExists(
      examBasic.codigoExamen,
    );

    return {
      attempt,
      examInProgress,
      exam,
    };
  }

  static async finishAttempt(intento_id: number, io: Server) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);

    const attempt = await attemptRepo.findOne({
      where: { id: intento_id },
      relations: ["respuestas"],
    });

    if (!attempt) {
      throwHttpError("Intento no encontrado", 404);
    }

    const examInProgress = await progressRepo.findOne({
      where: { intento_id },
    });

    if (!examInProgress) {
      throwHttpError("Examen en progreso no encontrado", 404);
    }

    if (attempt.estado === AttemptState.BLOCKED) {
      throwHttpError("No puedes finalizar un examen bloqueado", 403);
    }

    if (attempt.estado === AttemptState.FINISHED) {
      throwHttpError("Este examen ya fue finalizado", 400);
    }

    // Para exámenes PDF: no calificar automáticamente
    if (attempt.esExamenPDF) {
      attempt.puntaje = null;
      attempt.porcentaje = null;
      attempt.notaFinal = null;
      attempt.calificacionPendiente = true;
    } else {
      const puntaje = await ScoringService.calculateScore(attempt);
      attempt.puntaje = puntaje;
    }

    attempt.fecha_fin = new Date();
    attempt.estado = AttemptState.FINISHED;

    examInProgress.estado = AttemptState.FINISHED;
    examInProgress.fecha_fin = new Date();

    await attemptRepo.save(attempt);
    await progressRepo.save(examInProgress);

    io.to(`attempt_${intento_id}`).emit("attempt_finished", {
      puntaje: attempt.puntaje,
      puntajeMaximo: attempt.puntajeMaximo,
      esExamenPDF: attempt.esExamenPDF,
      calificacionPendiente: attempt.calificacionPendiente,
    });

    io.to(`exam_${attempt.examen_id}`).emit("student_finished_exam", {
      attemptId: intento_id,
      estudiante: {
        nombre: attempt.nombre_estudiante,
        correo: attempt.correo_estudiante,
      },
      puntaje: attempt.puntaje,
      notaFinal: attempt.notaFinal,
      esExamenPDF: attempt.esExamenPDF,
      calificacionPendiente: attempt.calificacionPendiente,
    });

    return attempt;
  }

  static async handleTimeExpired(
    attempt: ExamAttempt,
    examInProgress: ExamInProgress,
    io: Server,
  ) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);

    if (attempt.esExamenPDF) {
      if (attempt.limiteTiempoCumplido === "descartar") {
        attempt.puntaje = 0;
        attempt.calificacionPendiente = false;
      } else {
        attempt.puntaje = null;
        attempt.calificacionPendiente = true;
      }
    } else if (attempt.limiteTiempoCumplido === "descartar") {
      attempt.puntaje = 0;
    } else {
      const puntaje = await ScoringService.calculateScore(attempt);
      attempt.puntaje = puntaje;
    }

    attempt.fecha_fin = new Date();
    attempt.estado = AttemptState.FINISHED;
    examInProgress.estado = AttemptState.FINISHED;
    examInProgress.fecha_fin = new Date();

    await attemptRepo.save(attempt);
    await progressRepo.save(examInProgress);

    io.to(`attempt_${attempt.id}`).emit("time_expired", {
      message: "El tiempo del examen ha expirado",
      puntaje: attempt.puntaje,
      esExamenPDF: attempt.esExamenPDF,
      calificacionPendiente: attempt.calificacionPendiente,
    });
  }

  static async abandonAttempt(intento_id: number, io: Server) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);

    const attempt = await attemptRepo.findOne({
      where: { id: intento_id },
    });

    if (!attempt) {
      throwHttpError("Intento no encontrado", 404);
    }

    const examInProgress = await progressRepo.findOne({
      where: { intento_id },
    });

    if (!examInProgress) {
      throwHttpError("Examen en progreso no encontrado", 404);
    }

    if (attempt.estado === AttemptState.ACTIVE) {
      attempt.estado = AttemptState.ABANDONADO;
      examInProgress.estado = AttemptState.ABANDONADO;
      attempt.fecha_fin = new Date();
      examInProgress.fecha_fin = new Date();

      await attemptRepo.save(attempt);
      await progressRepo.save(examInProgress);

      io.to(`exam_${attempt.examen_id}`).emit("student_abandoned_exam", {
        attemptId: intento_id,
        estudiante: {
          nombre: attempt.nombre_estudiante,
          correo: attempt.correo_estudiante,
        },
      });

      console.log(`🚪 Intento ${intento_id} marcado como abandonado`);
    }

    return attempt;
  }

  static async deleteAttempt(attemptId: number, io?: Server) {
    return await AppDataSource.transaction(async (manager) => {
      const attemptRepo = manager.getRepository(ExamAttempt);
      const answerRepo = manager.getRepository(ExamAnswer);
      const eventRepo = manager.getRepository(ExamEvent);
      const progressRepo = manager.getRepository(ExamInProgress);

      console.log(`\n🗑️ ELIMINANDO INTENTO - ID: ${attemptId}`);

      const attempt = await attemptRepo.findOne({
        where: { id: attemptId },
      });

      if (!attempt) {
        throwHttpError("Intento no encontrado", 404);
      }

      const examId = attempt.examen_id;
      const studentInfo = {
        nombre: attempt.nombre_estudiante,
        correo: attempt.correo_estudiante,
        identificacion: attempt.identificacion_estudiante,
      };

      // 2. Contar y eliminar respuestas
      const answersCount = await answerRepo.count({
        where: { intento_id: attemptId },
      });
      await answerRepo.delete({ intento_id: attemptId });
      console.log(`  ✓ Eliminadas ${answersCount} respuesta(s)`);

      // 3. Contar y eliminar eventos
      const eventsCount = await eventRepo.count({
        where: { intento_id: attemptId },
      });
      await eventRepo.delete({ intento_id: attemptId });
      console.log(`  ✓ Eliminados ${eventsCount} evento(s)`);

      // 4. Eliminar ExamInProgress
      const progressDeleted = await progressRepo.delete({
        intento_id: attemptId,
      });
      console.log(
        `  ✓ Eliminado ExamInProgress (${progressDeleted.affected || 0} registro(s))`,
      );

      // 5. Eliminar el intento
      await attemptRepo.delete({ id: attemptId });
      console.log(`  ✓ Eliminado intento ID: ${attemptId}`);

      console.log(`✅ Intento eliminado completamente\n`);

      // 6. Notificar vía WebSocket si se proporcionó io
      if (io) {
        io.to(`attempt_${attemptId}`).emit("attempt_deleted", {
          message: "Tu intento ha sido eliminado por el profesor",
          attemptId,
        });

        io.to(`exam_${examId}`).emit("attempt_deleted_notification", {
          attemptId,
          estudiante: studentInfo,
          deletedData: {
            respuestas: answersCount,
            eventos: eventsCount,
          },
        });
      }

      return {
        message: "Intento eliminado exitosamente",
        attemptId,
        estudiante: studentInfo,
        deletedData: {
          respuestas: answersCount,
          eventos: eventsCount,
          examInProgress: progressDeleted.affected || 0,
        },
      };
    });
  }
}
