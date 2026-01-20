import { AppDataSource } from "@src/data-source/AppDataSource";
import { Server } from "socket.io";
import { ExamAttempt, AttemptState } from "@src/models/ExamAttempt";
import { ExamAnswer } from "@src/models/ExamAnswer";
import { ExamEvent, AttemptEvent } from "@src/models/ExamEvent";
import { ExamInProgress } from "@src/models/ExamInProgress";
import { ExamAttemptValidator } from "@src/validators/ExamAttemptValidator";
import {
  generateAccessCode,
  generateSessionId,
} from "@src/utils/CodeGenerator";
import { throwHttpError } from "@src/utils/errors";
import { CreateExamAnswerDto } from "@src/dtos/Create-ExamAnswer.dto";
import { CreateExamEventDto } from "@src/dtos/Create-ExamEvent.dto";
import { StartExamAttemptDto } from "@src/dtos/Start-ExamAttempt.dto";
import { ResumeExamAttemptDto } from "@src/dtos/Resume-ExamAttempt.dto";

export class ExamService {
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

    const puntajeMaximo = exam.questions.reduce(
      (sum: number, q: any) => sum + q.puntaje,
      0,
    );

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

    // Validar código de acceso y sesión
    const examInProgress = await ExamAttemptValidator.validateSessionUniqueness(
      data.codigo_acceso,
      data.id_sesion,
    );

    if (examInProgress.estado === AttemptState.FINISHED) {
      throwHttpError("Este intento ya ha finalizado", 403);
    }

    if (examInProgress.estado === AttemptState.BLOCKED) {
      throwHttpError("Este intento está bloqueado. Contacta al profesor", 403);
    }

    const attempt = await attemptRepo.findOne({
      where: { id: examInProgress.intento_id },
      relations: ["respuestas", "eventos"],
    });

    if (!attempt) {
      throwHttpError("Intento no encontrado", 404);
    }

    // Validar expiración si existe
    if (examInProgress.fecha_expiracion) {
      const now = new Date();
      if (now > examInProgress.fecha_expiracion) {
        // El tiempo se agotó
        await this.handleTimeExpired(attempt, examInProgress, io);
        throwHttpError("El tiempo del examen ha expirado", 403);
      }
    }

    const exam = await ExamAttemptValidator.validateExamExists(
      attempt.examen_id.toString(),
    );

    return {
      attempt,
      examInProgress,
      exam,
    };
  }

  static async saveAnswer(data: CreateExamAnswerDto, io: Server) {
    const repo = AppDataSource.getRepository(ExamAnswer);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);

    // Validar que el intento existe y está activo
    const examInProgress = await progressRepo.findOne({
      where: { intento_id: data.intento_id },
    });

    if (!examInProgress) {
      throwHttpError("Intento no encontrado", 404);
    }

    if (examInProgress.estado !== AttemptState.ACTIVE) {
      throwHttpError("No se pueden guardar respuestas en este intento", 403);
    }

    // Verificar si ya existe una respuesta para esta pregunta
    const existingAnswer = await repo.findOne({
      where: {
        intento_id: data.intento_id,
        pregunta_id: data.pregunta_id,
      },
    });

    if (existingAnswer) {
      // Actualizar respuesta existente
      existingAnswer.respuesta = data.respuesta;
      existingAnswer.fecha_respuesta = data.fecha_respuesta;
      await repo.save(existingAnswer);

      io.to(`attempt_${data.intento_id}`).emit(
        "answer_updated",
        existingAnswer,
      );
      return existingAnswer;
    }

    const answer = repo.create(data);
    await repo.save(answer);

    io.to(`attempt_${data.intento_id}`).emit("answer_saved", answer);

    return answer;
  }

  static async createEvent(data: CreateExamEventDto, io: Server) {

    const eventRepo = AppDataSource.getRepository(ExamEvent);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);

    const examInProgress = await progressRepo.findOne({
      where: { intento_id: data.intento_id },
    });

    if (!examInProgress) {
      throwHttpError("Intento no encontrado", 404);
    }

    const attempt = await attemptRepo.findOne({
      where: { id: data.intento_id },
    });

    if (!attempt) {
      throwHttpError("Intento no encontrado", 404);
    }

    // Guardar evento
    const event = new ExamEvent();
    event.tipo_evento = data.tipo_evento;
    event.fecha_envio = data.fecha_envio;
    event.intento_id = data.intento_id;

    await eventRepo.save(event);

    // ✅ Solo notificar y aplicar consecuencias si NO es "ninguna"
    if (attempt.consecuencia !== "ninguna") {
      // Notificar al estudiante
      io.to(`attempt_${data.intento_id}`).emit("fraud_detected", {
        tipo_evento: data.tipo_evento,
        fecha_envio: data.fecha_envio,
      });

      // Aplicar consecuencia (notificar o bloquear)
      await this.applyConsequence(
        attempt,
        examInProgress,
        data.tipo_evento,
        io,
      );
    } else {
    }

    return event;
  }

  static async applyConsequence(
    attempt: ExamAttempt,
    examInProgress: ExamInProgress,
    evento: AttemptEvent,
    io: Server,
  ) {
    const progressRepo = AppDataSource.getRepository(ExamInProgress);
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);

    // SIEMPRE notificar al profesor, independiente de la consecuencia
    const baseAlert = {
      attemptId: attempt.id,
      tipo_evento: evento,
      estudiante: {
        nombre: attempt.nombre_estudiante,
        correo: attempt.correo_estudiante,
        identificacion: attempt.identificacion_estudiante,
      },
      fecha_envio: new Date(),
      consecuencia: attempt.consecuencia,
      blocked: false,
    };

    if (attempt.consecuencia === "ninguna") {
      // Solo registrar, no notificar
      return;
    }

    if (attempt.consecuencia === "notificar") {
      // Notificar al profesor, NO bloquear
      io.to(`exam_${attempt.examen_id}`).emit("fraud_alert", {
        ...baseAlert,
        blocked: false,
      });
      return;
    }

    if (attempt.consecuencia === "bloquear") {
      // Bloquear el intento

      examInProgress.estado = AttemptState.BLOCKED;
      attempt.estado = AttemptState.BLOCKED;

      await progressRepo.save(examInProgress);
      await attemptRepo.save(attempt);

      // Notificar al estudiante
      io.to(`attempt_${attempt.id}`).emit("attempt_blocked", {
        message: "Tu examen ha sido bloqueado por sospecha de fraude",
        evento,
      });

      // Notificar al profesor
      io.to(`exam_${attempt.examen_id}`).emit("fraud_alert", {
        ...baseAlert,
        blocked: true,
      });


      io.to(`exam_${attempt.examen_id}`).emit("attempt_blocked_notification", {
        attemptId: attempt.id,
        estudiante: {
          nombre: attempt.nombre_estudiante,
          correo: attempt.correo_estudiante,
        },
      });
    }
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

    // ✅ Validar que no esté bloqueado
    if (attempt.estado === AttemptState.BLOCKED) {
      throwHttpError("No puedes finalizar un examen bloqueado", 403);
    }

    // ✅ Validar que no esté ya finalizado
    if (attempt.estado === AttemptState.FINISHED) {
      throwHttpError("Este examen ya fue finalizado", 400);
    }

    const puntaje = await this.calculateScore(attempt);

    attempt.puntaje = puntaje;
    attempt.fecha_fin = new Date();
    attempt.estado = AttemptState.FINISHED;

    examInProgress.estado = AttemptState.FINISHED;
    examInProgress.fecha_fin = new Date();

    await attemptRepo.save(attempt);
    await progressRepo.save(examInProgress);

    io.to(`attempt_${intento_id}`).emit("attempt_finished", {
      puntaje,
      puntajeMaximo: attempt.puntajeMaximo,
    });

    io.to(`exam_${attempt.examen_id}`).emit("student_finished_exam", {
      attemptId: intento_id,
      estudiante: {
        nombre: attempt.nombre_estudiante,
        correo: attempt.correo_estudiante,
      },
      puntaje,
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

    // Usar limiteTiempoCumplido guardado en el attempt
    if (attempt.limiteTiempoCumplido === "descartar") {
      attempt.puntaje = 0;
    } else {
      // "enviar" - calificar hasta donde llegó
      const puntaje = await this.calculateScore(attempt);
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
    });
  }

  static async calculateScore(attempt: ExamAttempt): Promise<number> {
    // Implementar lógica de calificación según tipo de pregunta
    // Por ahora retorna 0
    return 0;
  }

  static async unlockAttempt(intento_id: number, io: Server) {
    const progressRepo = AppDataSource.getRepository(ExamInProgress);

    const examInProgress = await progressRepo.findOne({
      where: { id: intento_id },
    });

    if (!examInProgress) {
      throwHttpError("Examen en progreso no encontrado", 404);
    }

    if (examInProgress.estado !== AttemptState.BLOCKED) {
      throwHttpError("El intento no está bloqueado", 400);
    }

    examInProgress.estado = AttemptState.ACTIVE;
    await progressRepo.save(examInProgress);

    io.to(`attempt_${intento_id}`).emit("attempt_unlocked", {
      message: "Tu examen ha sido desbloqueado por el profesor",
    });

    return examInProgress;
  }
}
