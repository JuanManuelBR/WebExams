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
import { GradingService } from "./GradingService";

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
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);

    const examInProgress = await progressRepo.findOne({
      where: { intento_id: data.intento_id },
    });

    if (!examInProgress) {
      throwHttpError("Intento no encontrado", 404);
    }

    if (examInProgress.estado !== AttemptState.ACTIVE) {
      throwHttpError("No se pueden guardar respuestas en este intento", 403);
    }

    const existingAnswer = await repo.findOne({
      where: {
        intento_id: data.intento_id,
        pregunta_id: data.pregunta_id,
      },
    });

    let answer;

    if (existingAnswer) {
      existingAnswer.respuesta = data.respuesta;
      existingAnswer.fecha_respuesta = data.fecha_respuesta;
      answer = await repo.save(existingAnswer);
      io.to(`attempt_${data.intento_id}`).emit("answer_updated", answer);
    } else {
      answer = repo.create(data);
      await repo.save(answer);
      io.to(`attempt_${data.intento_id}`).emit("answer_saved", answer);
    }

    // ✅ CALCULAR PROGRESO CON LOGS
    console.log(
      `🔍 Intentando calcular progreso para intento ${data.intento_id}`,
    );

    const totalAnswers = await repo.count({
      where: { intento_id: data.intento_id },
    });
    console.log(`📝 Total respuestas guardadas: ${totalAnswers}`);

    const attempt = await attemptRepo.findOne({
      where: { id: data.intento_id },
    });

    if (!attempt) {
      console.log(`❌ Intento ${data.intento_id} no encontrado`);
      return answer;
    }

    console.log(`✅ Intento encontrado, examen_id: ${attempt.examen_id}`);

    const exam = await ExamAttemptValidator.validateExamExistsById(
      attempt.examen_id,
    );

    console.log(`📚 Examen encontrado:`, {
      id: exam.id,
      nombre: exam.nombre,
      totalPreguntas: exam.questions?.length || 0,
    });

    const totalQuestions = exam.questions?.length || 0;

    if (totalQuestions === 0) {
      console.log(`⚠️ El examen no tiene preguntas`);
      return answer;
    }

    const progreso = Math.round((totalAnswers / totalQuestions) * 100);

    console.log(
      `📊 Progreso calculado: ${totalAnswers}/${totalQuestions} = ${progreso}%`,
    );
    console.log(`📝 Progreso anterior: ${attempt.progreso}`);

    attempt.progreso = progreso;

    const savedAttempt = await attemptRepo.save(attempt);

    console.log(`💾 Progreso guardado: ${savedAttempt.progreso}`);

    io.to(`exam_${attempt.examen_id}`).emit("progress_updated", {
      attemptId: data.intento_id,
      progreso,
    });

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
    event.leido = false; // ✅ NUEVO

    await eventRepo.save(event);

    // ✅ Emitir nueva alerta al profesor en tiempo real
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

    // ✅ Notificar SIEMPRE al profesor (excepto si es "ninguna")
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
      // ❌ No hacer nada
      return;
    }

    if (attempt.consecuencia === "notificar") {
      // ✅ Solo notificar al profesor, NO bloquear
      io.to(`exam_${attempt.examen_id}`).emit("fraud_alert", {
        ...baseAlert,
        blocked: false,
      });
      return;
    }

    if (attempt.consecuencia === "bloquear") {
      // ✅ Bloquear el intento
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
    console.log("\n" + "🎓".repeat(30));
    console.log("🎓 INICIANDO CALIFICACIÓN DEL INTENTO");
    console.log("🎓".repeat(30));
    console.log(`📋 Intento ID: ${attempt.id}`);
    console.log(`👤 Estudiante: ${attempt.nombre_estudiante || "Sin nombre"}`);
    console.log(`📧 Correo: ${attempt.correo_estudiante || "Sin correo"}`);
    console.log(`📚 Examen ID: ${attempt.examen_id}`);
    console.log(
      `📝 Total respuestas guardadas: ${attempt.respuestas?.length || 0}`,
    );

    try {
      // 1. Obtener la información completa del examen con sus preguntas
      const exam = await ExamAttemptValidator.validateExamExistsById(
        attempt.examen_id,
      );

      console.log(`\n📚 Examen: "${exam.nombre}"`);
      console.log(`📊 Total de preguntas: ${exam.questions?.length || 0}`);

      if (!exam.questions || exam.questions.length === 0) {
        console.warn(`⚠️ El examen ${exam.id} no tiene preguntas`);
        return 0;
      }

      let puntajeTotal = 0;
      let puntajePosibleTotal = 0;

      console.log("\n" + "📝".repeat(30));
      console.log("RECORRIENDO PREGUNTAS DEL EXAMEN");
      console.log("📝".repeat(30));

      // 2. Iterar sobre cada pregunta del examen
      for (let i = 0; i < exam.questions.length; i++) {
        const question = exam.questions[i];

        console.log(
          `\n[${i + 1}/${exam.questions.length}] 📌 Pregunta ID: ${question.id}`,
        );
        console.log(`    Tipo: ${question.type.toUpperCase()}`);
        console.log(`    Puntaje máximo: ${question.puntaje}`);
        console.log(`    Enunciado: "${question.enunciado}"`);

        puntajePosibleTotal += question.puntaje;

        // 3. Buscar la respuesta del estudiante para esta pregunta
        const studentAnswer = attempt.respuestas?.find(
          (ans) => ans.pregunta_id === question.id,
        );

        if (!studentAnswer) {
          console.log(`    ⚠️ Sin respuesta del estudiante`);
        } else {
          console.log(`    📥 Respuesta guardada: ${studentAnswer.respuesta}`);
        }

        // 4. Calificar según el tipo de pregunta
        let puntajePregunta = 0;

        switch (question.type) {
          case "test":
            puntajePregunta = GradingService.gradeTestQuestion(
              question,
              studentAnswer,
            );
            break;

          case "open":
            console.log(
              `    ⏭️ Pregunta OPEN - Calificación pendiente de implementar`,
            );
            break;

          case "fill_blanks":
            console.log(
              `    ⏭️ Pregunta FILL_BLANKS - Calificación pendiente de implementar`,
            );
            break;

          case "match":
            console.log(
              `    ⏭️ Pregunta MATCH - Calificación pendiente de implementar`,
            );
            break;

          default:
            console.warn(
              `    ⚠️ Tipo de pregunta desconocido: ${question.type}`,
            );
        }

        puntajeTotal += puntajePregunta;
        console.log(
          `    💰 Puntaje acumulado hasta ahora: ${puntajeTotal.toFixed(5)}/${puntajePosibleTotal.toFixed(5)}`,
        );
      }

      const porcentaje =
        puntajePosibleTotal > 0
          ? ((puntajeTotal / puntajePosibleTotal) * 100).toFixed(5)
          : "0.00000";

      console.log("\n" + "🏆".repeat(30));
      console.log("🏆 CALIFICACIÓN FINALIZADA");
      console.log("🏆".repeat(30));
      console.log(`📊 Puntaje obtenido: ${puntajeTotal.toFixed(5)}`);
      console.log(
        `📊 Puntaje máximo posible: ${puntajePosibleTotal.toFixed(5)}`,
      );
      console.log(`📊 Porcentaje: ${porcentaje}%`);
      console.log("🏆".repeat(30) + "\n");
      return Math.round(puntajeTotal * 100000) / 100000;
    } catch (error) {
      console.error("❌ ERROR CRÍTICO al calcular puntaje:", error);
      return 0;
    }
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

  static async getActiveAttemptsByExam(examId: number) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);
    const eventRepo = AppDataSource.getRepository(ExamEvent);

    const attempts = await attemptRepo.find({
      where: {
        examen_id: examId,
      },
      order: { fecha_inicio: "DESC" },
    });

    const attemptsWithDetails = await Promise.all(
      attempts.map(async (attempt) => {
        const progress = await progressRepo.findOne({
          where: { intento_id: attempt.id },
        });

        const allEvents = await eventRepo.find({
          where: { intento_id: attempt.id },
          order: { fecha_envio: "DESC" },
        });

        const unreadEvents = allEvents.filter((e) => !e.leido);

        const now = new Date();
        const elapsed =
          now.getTime() - new Date(attempt.fecha_inicio).getTime();
        const elapsedMinutes = Math.floor(elapsed / 60000);

        const totalAnswers = attempt.respuestas?.length || 0;

        return {
          id: attempt.id,
          nombre_estudiante: attempt.nombre_estudiante || "Sin nombre",
          correo_estudiante: attempt.correo_estudiante,
          identificacion_estudiante: attempt.identificacion_estudiante,
          estado: attempt.estado,
          fecha_inicio: attempt.fecha_inicio,
          tiempoTranscurrido: `${elapsedMinutes} min`,
          progreso: attempt.progreso || 0,
          alertas: allEvents.length,
          alertasNoLeidas: unreadEvents.length,
          codigo_acceso: progress?.codigo_acceso,
          fecha_expiracion: progress?.fecha_expiracion,
        };
      }),
    );

    return attemptsWithDetails;
  }

  static async getAttemptEvents(attemptId: number) {
    const eventRepo = AppDataSource.getRepository(ExamEvent);

    const events = await eventRepo.find({
      where: { intento_id: attemptId },
      order: { fecha_envio: "DESC" },
    });

    return events;
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

    // ✅ Solo marcar como abandonado si estaba activo
    if (attempt.estado === AttemptState.ACTIVE) {
      attempt.estado = AttemptState.ABANDONADO;
      examInProgress.estado = AttemptState.ABANDONADO;
      attempt.fecha_fin = new Date();
      examInProgress.fecha_fin = new Date();

      await attemptRepo.save(attempt);
      await progressRepo.save(examInProgress);

      // Notificar al profesor
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

  static async markEventsAsRead(attemptId: number, io: Server) {
    const eventRepo = AppDataSource.getRepository(ExamEvent);

    await eventRepo.update(
      { intento_id: attemptId, leido: false },
      { leido: true },
    );

    // Notificar al profesor que las alertas fueron leídas
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
}
