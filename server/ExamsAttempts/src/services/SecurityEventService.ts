import { AppDataSource } from "@src/data-source/AppDataSource";
import { Server } from "socket.io";
import { ExamAttempt, AttemptState } from "@src/models/ExamAttempt";
import { ExamEvent, AttemptEvent } from "@src/models/ExamEvent";
import { ExamInProgress } from "@src/models/ExamInProgress";
import { throwHttpError } from "@src/utils/errors";
import { CreateExamEventDto } from "@src/dtos/Create-ExamEvent.dto";

export class SecurityEventService {
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
    event.leido = false;

    await eventRepo.save(event);

    // Emitir nueva alerta al profesor en tiempo real
    io.to(`exam_${attempt.examen_id}`).emit("new_alert", {
      attemptId: data.intento_id,
      event: {
        id: event.id,
        tipo_evento: event.tipo_evento,
        fecha_envio: event.fecha_envio,
        leido: false,
      },
    });

    if (attempt.consecuencia !== "ninguna") {
      io.to(`attempt_${data.intento_id}`).emit("fraud_detected", {
        tipo_evento: data.tipo_evento,
        fecha_envio: data.fecha_envio,
      });

      await this.applyConsequence(
        attempt,
        examInProgress,
        data.tipo_evento,
        io,
      );
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
      return;
    }

    if (attempt.consecuencia === "notificar") {
      io.to(`exam_${attempt.examen_id}`).emit("fraud_alert", {
        ...baseAlert,
        blocked: false,
      });
      return;
    }

    if (attempt.consecuencia === "bloquear") {
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

  static async unlockAttempt(intento_id: number, io: Server) {
    const progressRepo = AppDataSource.getRepository(ExamInProgress);
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);

    const examInProgress = await progressRepo.findOne({
      where: { intento_id: intento_id },
    });

    if (!examInProgress) {
      throwHttpError("Examen en progreso no encontrado", 404);
    }

    const attempt = await attemptRepo.findOne({
      where: { id: intento_id },
    });

    if (!attempt) {
      throwHttpError("Intento no encontrado", 404);
    }

    if (attempt.estado !== AttemptState.BLOCKED) {
      throwHttpError("El intento no está bloqueado", 400);
    }

    examInProgress.estado = AttemptState.ACTIVE;
    attempt.estado = AttemptState.ACTIVE;

    await progressRepo.save(examInProgress);
    await attemptRepo.save(attempt);

    console.log(`✅ Intento ${intento_id} desbloqueado exitosamente`);

    io.to(`attempt_${intento_id}`).emit("attempt_unlocked", {
      message: "Tu examen ha sido desbloqueado por el profesor",
      attemptId: intento_id,
      estado: AttemptState.ACTIVE,
    });

    io.to(`exam_${attempt.examen_id}`).emit("attempt_unlocked_notification", {
      attemptId: intento_id,
      estudiante: {
        nombre: attempt.nombre_estudiante,
        correo: attempt.correo_estudiante,
        identificacion: attempt.identificacion_estudiante,
      },
      estado: AttemptState.ACTIVE,
    });

    return {
      message: "Intento desbloqueado exitosamente",
      codigo_acceso: examInProgress.codigo_acceso,
      estado: AttemptState.ACTIVE,
      attemptId: intento_id,
      estudiante: {
        nombre: attempt.nombre_estudiante,
        correo: attempt.correo_estudiante,
        identificacion: attempt.identificacion_estudiante,
      },
    };
  }

  static async getAttemptEvents(attemptId: number) {
    const eventRepo = AppDataSource.getRepository(ExamEvent);

    const events = await eventRepo.find({
      where: { intento_id: attemptId },
      order: { fecha_envio: "DESC" },
    });

    return events;
  }

  static async markEventsAsRead(attemptId: number, io: Server) {
    const eventRepo = AppDataSource.getRepository(ExamEvent);

    await eventRepo.update(
      { intento_id: attemptId, leido: false },
      { leido: true },
    );

    const attempt = await AppDataSource.getRepository(ExamAttempt).findOne({
      where: { id: attemptId },
    });

    if (attempt) {
      io.to(`exam_${attempt.examen_id}`).emit("alerts_read", {
        attemptId,
      });
    }

    return { message: "Alertas marcadas como leídas" };
  }

  static async deleteAttemptEvents(attemptId: number, io?: Server) {
    const eventRepo = AppDataSource.getRepository(ExamEvent);
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);

    console.log(`\n🗑️ ELIMINANDO EVENTOS - Intento ID: ${attemptId}`);

    const attempt = await attemptRepo.findOne({
      where: { id: attemptId },
    });

    if (!attempt) {
      throwHttpError("Intento no encontrado", 404);
    }

    const eventCount = await eventRepo.count({
      where: { intento_id: attemptId },
    });

    console.log(`📋 Eventos a eliminar: ${eventCount}`);

    await eventRepo.delete({ intento_id: attemptId });

    console.log(`✅ ${eventCount} eventos eliminados exitosamente`);

    if (io) {
      io.to(`exam_${attempt.examen_id}`).emit("events_deleted", {
        attemptId,
        deletedCount: eventCount,
      });

      io.to(`attempt_${attemptId}`).emit("events_cleared", {
        message: "Las alertas han sido eliminadas",
      });
    }

    return {
      message: `Se eliminaron ${eventCount} evento(s) del intento`,
      deletedCount: eventCount,
      attemptId,
    };
  }
}
