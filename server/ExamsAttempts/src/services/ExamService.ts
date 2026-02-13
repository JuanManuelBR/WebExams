import { AppDataSource } from "@src/data-source/AppDataSource";
import { Server } from "socket.io";
import { ExamAttempt, AttemptState } from "@src/models/ExamAttempt";
import { ExamAnswer, TipoRespuesta } from "@src/models/ExamAnswer";
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
import axios from "axios";
import ExcelJS from "exceljs";

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

    // Detectar si es un examen PDF (tiene archivoPDF y no tiene preguntas)
    const esExamenPDF = !!(exam.archivoPDF && (!exam.questions || exam.questions.length === 0));

    // Para exámenes PDF el puntaje máximo es 5 (calificación directa 0-5)
    const puntajeMaximo = esExamenPDF
      ? 5
      : exam.questions.reduce(
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

    // Buscar el ExamInProgress por codigo_acceso
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
      throwHttpError("Este intento está bloqueado. Contacta al profesor", 403);
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

      console.log(`🔄 Intento ${attempt.id} reanudado desde estado abandonado`);
    } else if (examInProgress.estado === AttemptState.ACTIVE) {
      // --- RECONEXIÓN NORMAL (misma sesión) ---

      // Si se proporcionó id_sesion, validar que coincida
      if (data.id_sesion && examInProgress.id_sesion !== data.id_sesion) {
        throwHttpError(
          "Ya existe una sesión activa para este intento. Solo puede haber un usuario conectado",
          409,
        );
      }

      // Si NO se proporcionó id_sesion y el intento está activo,
      // no se puede reanudar sin la sesión correcta (protección contra uso compartido)
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
    // Primero obtener el codigoExamen a partir del examen_id
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
      if (data.retroalimentacion !== undefined) {
        existingAnswer.retroalimentacion = data.retroalimentacion;
      }
      if (data.tipo_respuesta !== undefined) {
        existingAnswer.tipo_respuesta = data.tipo_respuesta;
      }
      if (data.metadata_codigo !== undefined) {
        existingAnswer.metadata_codigo = data.metadata_codigo;
      }
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

    // Para exámenes PDF, el progreso se calcula diferente (no hay preguntas)
    if (attempt.esExamenPDF) {
      const progreso = totalAnswers > 0 ? 100 : 0;
      console.log(`📊 Examen PDF - Progreso: ${progreso}% (${totalAnswers} respuesta(s))`);
      attempt.progreso = progreso;
      const savedAttempt = await attemptRepo.save(attempt);
      console.log(`💾 Progreso guardado: ${savedAttempt.progreso}`);
      io.to(`exam_${attempt.examen_id}`).emit("progress_updated", {
        attemptId: data.intento_id,
        progreso,
      });
      return answer;
    }

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

    // Para exámenes PDF: no calificar automáticamente, queda pendiente de calificación manual
    if (attempt.esExamenPDF) {
      attempt.puntaje = null;
      attempt.porcentaje = null;
      attempt.notaFinal = null;
      attempt.calificacionPendiente = true;
    } else {
      const puntaje = await this.calculateScore(attempt);
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

    // Usar limiteTiempoCumplido guardado en el attempt
    if (attempt.esExamenPDF) {
      // Exámenes PDF: no calificar automáticamente
      if (attempt.limiteTiempoCumplido === "descartar") {
        attempt.puntaje = 0;
        attempt.calificacionPendiente = false;
      } else {
        // "enviar" - guardar respuestas sin calificar
        attempt.puntaje = null;
        attempt.calificacionPendiente = true;
      }
    } else if (attempt.limiteTiempoCumplido === "descartar") {
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
      esExamenPDF: attempt.esExamenPDF,
      calificacionPendiente: attempt.calificacionPendiente,
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
      const answerRepo = AppDataSource.getRepository(ExamAnswer);

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
            puntajePregunta = GradingService.gradeOpenQuestion(
              question,
              studentAnswer,
            );
            break;

          case "fill_blanks":
            puntajePregunta = GradingService.gradeFillBlanksQuestion(
              question,
              studentAnswer,
            );
            break;

          case "match":
            puntajePregunta = GradingService.gradeMatchQuestion(
              question,
              studentAnswer,
            );
            break;

          default:
            console.warn(
              `    ⚠️ Tipo de pregunta desconocido: ${question.type}`,
            );
        }
        if (studentAnswer) {
          studentAnswer.puntaje = puntajePregunta;
          await answerRepo.save(studentAnswer);
          console.log(
            `    💾 Puntaje guardado en respuesta: ${puntajePregunta.toFixed(5)}`,
          );
        }

        puntajeTotal += puntajePregunta;
        console.log(
          `    💰 Puntaje acumulado hasta ahora: ${puntajeTotal.toFixed(5)}/${puntajePosibleTotal.toFixed(5)}`,
        );
      }

      const { porcentaje, notaFinal } = GradingService.calculateFinalGrade(
        puntajeTotal,
        puntajePosibleTotal,
      );

      console.log("\n" + "🏆".repeat(30));
      console.log("🏆 CALIFICACIÓN FINALIZADA");
      console.log("🏆".repeat(30));
      console.log(`📊 Puntaje obtenido: ${puntajeTotal.toFixed(5)}`);
      console.log(
        `📊 Puntaje máximo posible: ${puntajePosibleTotal.toFixed(5)}`,
      );
      console.log(`📊 Porcentaje: ${porcentaje.toFixed(2)}%`);
      console.log(`📊 Nota final (1-5): ${notaFinal.toFixed(2)}`);
      console.log("🏆".repeat(30) + "\n");

      // ✅ 7. GUARDAR PORCENTAJE Y NOTA FINAL EN EL INTENTO
      const attemptRepo = AppDataSource.getRepository(ExamAttempt);
      attempt.porcentaje = porcentaje;
      attempt.notaFinal = notaFinal;
      await attemptRepo.save(attempt);

      return Math.round(puntajeTotal * 100000) / 100000; // 5 decimales
    } catch (error) {
      console.error("❌ ERROR CRÍTICO al calcular puntaje:", error);
      return 0;
    }
  }

  static async unlockAttempt(intento_id: number, io: Server) {
    const progressRepo = AppDataSource.getRepository(ExamInProgress);
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);

    // Buscar por intento_id, no por id
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

    // Actualizar ambos registros
    examInProgress.estado = AttemptState.ACTIVE;
    attempt.estado = AttemptState.ACTIVE;

    await progressRepo.save(examInProgress);
    await attemptRepo.save(attempt);

    console.log(`✅ Intento ${intento_id} desbloqueado exitosamente`);

    // Notificar al estudiante
    io.to(`attempt_${intento_id}`).emit("attempt_unlocked", {
      message: "Tu examen ha sido desbloqueado por el profesor",
      attemptId: intento_id,
      estado: AttemptState.ACTIVE,
    });

    // Notificar al profesor que el desbloqueo fue exitoso
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
          esExamenPDF: attempt.esExamenPDF,
          calificacionPendiente: attempt.calificacionPendiente,
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

  /**
   * Actualiza manualmente la calificación y retroalimentación de una respuesta
   * Usado por el profesor para calificar preguntas que requieren revisión manual
   */
  static async updateManualGrade(
    respuesta_id: number,
    puntaje?: number,
    retroalimentacion?: string,
    io?: Server,
  ) {
    const answerRepo = AppDataSource.getRepository(ExamAnswer);
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);

    const answer = await answerRepo.findOne({
      where: { id: respuesta_id },
    });

    if (!answer) {
      throwHttpError("Respuesta no encontrada", 404);
    }

    // Si se proporciona puntaje, validar que esté en el rango válido
    if (puntaje !== undefined) {
      // Obtener el intento para acceder al examen
      const attempt = await attemptRepo.findOne({
        where: { id: answer.intento_id },
      });

      if (!attempt) {
        throwHttpError("Intento no encontrado", 404);
      }

      // Obtener información del examen para validar el puntaje máximo
      const exam = await ExamAttemptValidator.validateExamExistsById(
        attempt.examen_id,
      );

      // Buscar la pregunta específica
      const question = exam.questions?.find(
        (q: any) => q.id === answer.pregunta_id,
      );

      if (!question) {
        throwHttpError("Pregunta no encontrada en el examen", 404);
      }

      // Validar que el puntaje no sea negativo (ya validado en DTO, pero por seguridad)
      if (puntaje < 0) {
        throwHttpError("El puntaje no puede ser negativo", 400);
      }

      // Validar que el puntaje no exceda el máximo de la pregunta
      if (puntaje > question.puntaje) {
        throwHttpError(
          `El puntaje no puede exceder el máximo de la pregunta (${question.puntaje} puntos)`,
          400,
        );
      }

      answer.puntaje = puntaje;
    }

    // Actualizar retroalimentación si se proporciona
    if (retroalimentacion !== undefined) {
      answer.retroalimentacion = retroalimentacion;
    }

    await answerRepo.save(answer);

    // Recalcular el puntaje total del intento
    const attempt = await attemptRepo.findOne({
      where: { id: answer.intento_id },
      relations: ["respuestas"],
    });

    if (attempt) {
      const puntajeTotal = attempt.respuestas?.reduce(
        (sum, r) => sum + (r.puntaje || 0),
        0,
      ) || 0;

      attempt.puntaje = puntajeTotal;

      // Recalcular porcentaje y nota final
      const { porcentaje, notaFinal } = GradingService.calculateFinalGrade(
        puntajeTotal,
        attempt.puntajeMaximo,
      );

      attempt.porcentaje = porcentaje;
      attempt.notaFinal = notaFinal;

      await attemptRepo.save(attempt);

      // Notificar al profesor sobre la actualización
      if (io) {
        io.to(`exam_${attempt.examen_id}`).emit("grade_updated", {
          attemptId: attempt.id,
          respuestaId: respuesta_id,
          puntaje,
          retroalimentacion,
          puntajeTotal: attempt.puntaje,
        });
      }
    }

    return answer;
  }

  /**
   * Califica un intento de examen PDF a nivel general (no por pregunta)
   * El profesor asigna un puntaje global (0-5) y una retroalimentación general
   */
  static async updatePDFAttemptGrade(
    intento_id: number,
    puntaje?: number,
    retroalimentacion?: string,
    io?: Server,
  ) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);

    const attempt = await attemptRepo.findOne({
      where: { id: intento_id },
    });

    if (!attempt) {
      throwHttpError("Intento no encontrado", 404);
    }

    if (!attempt.esExamenPDF) {
      throwHttpError(
        "Este endpoint solo aplica para intentos de exámenes PDF. Use /answer/:id/manual-grade para exámenes normales",
        400,
      );
    }

    if (puntaje !== undefined) {
      if (puntaje < 0) {
        throwHttpError("El puntaje no puede ser negativo", 400);
      }
      if (puntaje > attempt.puntajeMaximo) {
        throwHttpError(
          `El puntaje no puede exceder el máximo del examen (${attempt.puntajeMaximo} puntos)`,
          400,
        );
      }

      attempt.puntaje = puntaje;

      const { porcentaje, notaFinal } = GradingService.calculateFinalGrade(
        puntaje,
        attempt.puntajeMaximo,
      );
      attempt.porcentaje = porcentaje;
      attempt.notaFinal = notaFinal;
      attempt.calificacionPendiente = false;
    }

    if (retroalimentacion !== undefined) {
      attempt.retroalimentacion = retroalimentacion;
    }

    await attemptRepo.save(attempt);

    if (io) {
      io.to(`exam_${attempt.examen_id}`).emit("grade_updated", {
        attemptId: attempt.id,
        puntaje: attempt.puntaje,
        porcentaje: attempt.porcentaje,
        notaFinal: attempt.notaFinal,
        retroalimentacion: attempt.retroalimentacion,
        calificacionPendiente: attempt.calificacionPendiente,
      });
    }

    return {
      id: attempt.id,
      puntaje: attempt.puntaje,
      puntajeMaximo: attempt.puntajeMaximo,
      porcentaje: attempt.porcentaje,
      notaFinal: attempt.notaFinal,
      retroalimentacion: attempt.retroalimentacion,
      calificacionPendiente: attempt.calificacionPendiente,
    };
  }

  /**
   * Fuerza el envío de todos los intentos activos de un examen
   * Finaliza y califica todos los intentos activos con las respuestas que tengan hasta el momento
   */
  static async forceFinishActiveAttempts(examId: number, io: Server) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);

    console.log(`\n🔴 FORZANDO ENVÍO DE INTENTOS ACTIVOS - Examen ID: ${examId}`);

    // Buscar todos los intentos activos del examen
    const activeAttempts = await attemptRepo.find({
      where: {
        examen_id: examId,
        estado: AttemptState.ACTIVE,
      },
      relations: ["respuestas"],
    });

    if (activeAttempts.length === 0) {
      console.log("⚠️ No hay intentos activos para finalizar");
      return {
        message: "No hay intentos activos para finalizar",
        finalizados: 0,
        detalles: [],
      };
    }

    console.log(`📋 Total de intentos activos encontrados: ${activeAttempts.length}`);

    const resultados = [];

    // Finalizar cada intento activo
    for (const attempt of activeAttempts) {
      try {
        console.log(`\n📝 Procesando intento ${attempt.id} - Estudiante: ${attempt.nombre_estudiante || "Sin nombre"}`);

        // Obtener el ExamInProgress asociado
        const examInProgress = await progressRepo.findOne({
          where: { intento_id: attempt.id },
        });

        if (!examInProgress) {
          console.warn(`⚠️ No se encontró ExamInProgress para el intento ${attempt.id}`);
          continue;
        }

        // Para exámenes PDF: no calificar automáticamente
        if (attempt.esExamenPDF) {
          attempt.puntaje = null;
          attempt.calificacionPendiente = true;
        } else {
          const puntaje = await this.calculateScore(attempt);
          attempt.puntaje = puntaje;
        }

        // Actualizar el intento
        attempt.fecha_fin = new Date();
        attempt.estado = AttemptState.FINISHED;

        // Actualizar el ExamInProgress
        examInProgress.estado = AttemptState.FINISHED;
        examInProgress.fecha_fin = new Date();

        await attemptRepo.save(attempt);
        await progressRepo.save(examInProgress);

        console.log(`✅ Intento ${attempt.id} finalizado - Puntaje: ${attempt.puntaje ?? "Pendiente"}/${attempt.puntajeMaximo}`);

        // Notificar al estudiante que su examen fue forzado a terminar
        io.to(`attempt_${attempt.id}`).emit("forced_finish", {
          message: "El profesor ha finalizado el examen para todos los estudiantes",
          puntaje: attempt.puntaje,
          puntajeMaximo: attempt.puntajeMaximo,
          porcentaje: attempt.porcentaje,
          notaFinal: attempt.notaFinal,
          attemptId: attempt.id,
          esExamenPDF: attempt.esExamenPDF,
          calificacionPendiente: attempt.calificacionPendiente,
        });

        resultados.push({
          intentoId: attempt.id,
          estudiante: {
            nombre: attempt.nombre_estudiante,
            correo: attempt.correo_estudiante,
            identificacion: attempt.identificacion_estudiante,
          },
          puntaje: attempt.puntaje,
          puntajeMaximo: attempt.puntajeMaximo,
          porcentaje: attempt.porcentaje,
          notaFinal: attempt.notaFinal,
          respuestasGuardadas: attempt.respuestas?.length || 0,
          esExamenPDF: attempt.esExamenPDF,
          calificacionPendiente: attempt.calificacionPendiente,
        });
      } catch (error) {
        console.error(`❌ Error al finalizar intento ${attempt.id}:`, error);
        resultados.push({
          intentoId: attempt.id,
          error: "Error al finalizar el intento",
        });
      }
    }

    // Notificar al profesor sobre los intentos finalizados
    io.to(`exam_${examId}`).emit("forced_finish_completed", {
      totalFinalizados: resultados.length,
      detalles: resultados,
    });

    console.log(`\n✅ Proceso completado - ${resultados.length} intentos finalizados`);

    return {
      message: `${resultados.length} intentos activos han sido finalizados exitosamente`,
      finalizados: resultados.length,
      detalles: resultados,
    };
  }

  /**
   * Fuerza el envío de un intento específico
   * Finaliza y califica el intento con las respuestas que tenga hasta el momento
   */
  static async forceFinishSingleAttempt(attemptId: number, io: Server) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);

    console.log(`\n🔴 FORZANDO ENVÍO DE INTENTO - ID: ${attemptId}`);

    // Buscar el intento específico
    const attempt = await attemptRepo.findOne({
      where: { id: attemptId },
      relations: ["respuestas"],
    });

    if (!attempt) {
      throwHttpError("Intento no encontrado", 404);
    }

    // Verificar que el intento esté activo
    if (attempt.estado !== AttemptState.ACTIVE) {
      throwHttpError(
        `El intento ya está en estado ${attempt.estado}. Solo se pueden forzar intentos activos.`,
        400
      );
    }

    console.log(`📝 Procesando intento ${attempt.id} - Estudiante: ${attempt.nombre_estudiante || "Sin nombre"}`);

    // Obtener el ExamInProgress asociado
    const examInProgress = await progressRepo.findOne({
      where: { intento_id: attempt.id },
    });

    if (!examInProgress) {
      throwHttpError(
        `No se encontró ExamInProgress para el intento ${attempt.id}`,
        404
      );
    }

    // Para exámenes PDF: no calificar automáticamente
    if (attempt.esExamenPDF) {
      attempt.puntaje = null;
      attempt.calificacionPendiente = true;
    } else {
      const puntaje = await this.calculateScore(attempt);
      attempt.puntaje = puntaje;
    }

    // Actualizar el intento
    attempt.fecha_fin = new Date();
    attempt.estado = AttemptState.FINISHED;

    // Actualizar el ExamInProgress
    examInProgress.estado = AttemptState.FINISHED;
    examInProgress.fecha_fin = new Date();

    await attemptRepo.save(attempt);
    await progressRepo.save(examInProgress);

    console.log(`✅ Intento ${attempt.id} finalizado - Puntaje: ${attempt.puntaje ?? "Pendiente"}/${attempt.puntajeMaximo}`);

    // Notificar al estudiante que su examen fue forzado a terminar
    io.to(`attempt_${attempt.id}`).emit("forced_finish", {
      message: "El profesor ha finalizado tu examen",
      puntaje: attempt.puntaje,
      puntajeMaximo: attempt.puntajeMaximo,
      porcentaje: attempt.porcentaje,
      notaFinal: attempt.notaFinal,
      attemptId: attempt.id,
      esExamenPDF: attempt.esExamenPDF,
      calificacionPendiente: attempt.calificacionPendiente,
    });

    // Notificar al profesor (room del examen)
    io.to(`exam_${attempt.examen_id}`).emit("single_attempt_forced_finish", {
      intentoId: attempt.id,
      estudiante: {
        nombre: attempt.nombre_estudiante,
        correo: attempt.correo_estudiante,
        identificacion: attempt.identificacion_estudiante,
      },
      puntaje: attempt.puntaje,
      puntajeMaximo: attempt.puntajeMaximo,
      porcentaje: attempt.porcentaje,
      notaFinal: attempt.notaFinal,
      esExamenPDF: attempt.esExamenPDF,
      calificacionPendiente: attempt.calificacionPendiente,
    });

    return {
      message: "Intento finalizado exitosamente",
      intentoId: attempt.id,
      estudiante: {
        nombre: attempt.nombre_estudiante,
        correo: attempt.correo_estudiante,
        identificacion: attempt.identificacion_estudiante,
      },
      puntaje: attempt.puntaje,
      puntajeMaximo: attempt.puntajeMaximo,
      porcentaje: attempt.porcentaje,
      notaFinal: attempt.notaFinal,
      respuestasGuardadas: attempt.respuestas?.length || 0,
      esExamenPDF: attempt.esExamenPDF,
      calificacionPendiente: attempt.calificacionPendiente,
    };
  }

  /**
   * Elimina completamente un intento y todos sus datos relacionados
   * Elimina: respuestas, eventos, ExamInProgress y el intento
   */
  static async deleteAttempt(attemptId: number, io?: Server) {
    return await AppDataSource.transaction(async (manager) => {
      const attemptRepo = manager.getRepository(ExamAttempt);
      const answerRepo = manager.getRepository(ExamAnswer);
      const eventRepo = manager.getRepository(ExamEvent);
      const progressRepo = manager.getRepository(ExamInProgress);

      console.log(`\n🗑️ ELIMINANDO INTENTO - ID: ${attemptId}`);

      // 1. Buscar el intento
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
      const progressDeleted = await progressRepo.delete({ intento_id: attemptId });
      console.log(`  ✓ Eliminado ExamInProgress (${progressDeleted.affected || 0} registro(s))`);

      // 5. Eliminar el intento
      await attemptRepo.delete({ id: attemptId });
      console.log(`  ✓ Eliminado intento ID: ${attemptId}`);

      console.log(`✅ Intento eliminado completamente\n`);

      // 6. Notificar vía WebSocket si se proporcionó io
      if (io) {
        // Notificar al estudiante (si está conectado)
        io.to(`attempt_${attemptId}`).emit("attempt_deleted", {
          message: "Tu intento ha sido eliminado por el profesor",
          attemptId,
        });

        // Notificar al profesor
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

  /**
   * Obtiene toda la información detallada de un intento de examen
   * Incluye: intento, respuestas con puntajes, eventos, preguntas correctas
   */
  static async getAttemptDetails(intento_id: number) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const eventRepo = AppDataSource.getRepository(ExamEvent);

    // 1. Obtener el intento con todas sus respuestas
    const attempt = await attemptRepo.findOne({
      where: { id: intento_id },
      relations: ["respuestas"],
    });

    if (!attempt) {
      throwHttpError("Intento no encontrado", 404);
    }

    // 2. Obtener todos los eventos de seguridad
    const eventos = await eventRepo.find({
      where: { intento_id },
      order: { fecha_envio: "DESC" },
    });

    // 3. Obtener el examen completo usando el código del examen
    // Primero obtenemos info básica para conseguir el código
    const examBasic = await ExamAttemptValidator.validateExamExistsById(
      attempt.examen_id,
    );

    // Ahora usamos el endpoint correcto que tiene toda la info
    const EXAM_MS_URL = process.env.EXAM_MS_URL;

    console.log(
      `🔍 Obteniendo examen completo desde: ${EXAM_MS_URL}/api/exams/forAttempt/${examBasic.codigoExamen}`,
    );

    const examResponse = await axios.get(
      `${EXAM_MS_URL}/api/exams/forAttempt/${examBasic.codigoExamen}`,
    );
    const exam = examResponse.data;

    if (!exam) {
      throwHttpError(
        "No se pudo obtener la información completa del examen",
        500,
      );
    }

    console.log(
      `✅ Examen obtenido: "${exam.nombre}" con ${exam.questions?.length || 0} preguntas`,
    );

    // Si es examen PDF, retornar estructura especial con respuestas directas
    if (attempt.esExamenPDF) {
      const respuestasPDF = (attempt.respuestas || []).map((r) => {
        let metadataParsed = null;
        if (r.metadata_codigo) {
          try {
            metadataParsed = JSON.parse(r.metadata_codigo);
          } catch {
            metadataParsed = r.metadata_codigo;
          }
        }

        // Parsear respuesta para tipos estructurados (código guarda array de celdas, diagrama guarda estado)
        let respuestaParsed: any = r.respuesta;
        const structuredTypes = [
          TipoRespuesta.DIAGRAMA,
          TipoRespuesta.PYTHON,
          TipoRespuesta.JAVASCRIPT,
          TipoRespuesta.JAVA,
        ];
        if (structuredTypes.includes(r.tipo_respuesta)) {
          try {
            respuestaParsed = JSON.parse(r.respuesta);
          } catch {
            respuestaParsed = r.respuesta;
          }
        }

        return {
          id: r.id,
          pregunta_id: r.pregunta_id,
          tipo_respuesta: r.tipo_respuesta,
          respuesta: respuestaParsed,
          metadata_codigo: metadataParsed,
          puntajeObtenido: r.puntaje,
          fecha_respuesta: r.fecha_respuesta,
          retroalimentacion: r.retroalimentacion,
        };
      });

      return {
        intento: {
          id: attempt.id,
          examen_id: attempt.examen_id,
          estado: attempt.estado,
          nombre_estudiante: attempt.nombre_estudiante,
          correo_estudiante: attempt.correo_estudiante,
          identificacion_estudiante: attempt.identificacion_estudiante,
          fecha_inicio: attempt.fecha_inicio,
          fecha_fin: attempt.fecha_fin,
          limiteTiempoCumplido: attempt.limiteTiempoCumplido,
          consecuencia: attempt.consecuencia,
          puntaje: attempt.puntaje,
          puntajeMaximo: attempt.puntajeMaximo,
          porcentaje: attempt.porcentaje,
          notaFinal: attempt.notaFinal,
          progreso: attempt.progreso,
          esExamenPDF: attempt.esExamenPDF,
          calificacionPendiente: attempt.calificacionPendiente,
          retroalimentacion: attempt.retroalimentacion || null,
        },
        examen: {
          id: exam.id,
          nombre: exam.nombre,
          descripcion: exam.descripcion,
          codigoExamen: exam.codigoExamen,
          estado: exam.estado,
          nombreProfesor: exam.nombreProfesor,
          archivoPDF: exam.archivoPDF,
        },
        estadisticas: {
          totalRespuestas: respuestasPDF.length,
          tiempoTotal:
            attempt.fecha_fin && attempt.fecha_inicio
              ? Math.floor(
                  (new Date(attempt.fecha_fin).getTime() -
                    new Date(attempt.fecha_inicio).getTime()) /
                    1000,
                )
              : null,
        },
        respuestasPDF,
        eventos: eventos.map((e) => ({
          id: e.id,
          tipo_evento: e.tipo_evento,
          fecha_envio: e.fecha_envio,
          leido: e.leido,
        })),
      };
    }

    // Flujo normal para exámenes con preguntas
    if (!exam.questions) {
      throwHttpError(
        "No se pudo obtener la información completa del examen",
        500,
      );
    }

    // 4. Función auxiliar para parsear respuesta del estudiante según tipo
    const parseStudentAnswer = (type: string, respuesta: string) => {
      try {
        return JSON.parse(respuesta);
      } catch {
        return respuesta; // Si no es JSON, retornar como string
      }
    };

    // 5. Construir respuesta detallada con información de cada pregunta
    const preguntasConRespuestas = exam.questions.map((pregunta: any) => {
      console.log(
        `📝 Procesando pregunta ${pregunta.id}: "${pregunta.enunciado}" (${pregunta.type})`,
      );

      // Buscar la respuesta del estudiante para esta pregunta
      const respuestaEstudiante = attempt.respuestas?.find(
        (r) => r.pregunta_id === pregunta.id,
      );

      // ✅ Parsear la respuesta RAW una sola vez para evitar doble escape
      let respuestaParsed = null;
      if (respuestaEstudiante) {
        respuestaParsed = parseStudentAnswer(
          pregunta.type,
          respuestaEstudiante.respuesta,
        );
      }

      // Preparar información base de la pregunta
      const preguntaDetalle: any = {
        id: pregunta.id,
        enunciado: pregunta.enunciado, // ✅ Viene del endpoint /forAttempt/
        type: pregunta.type,
        puntajeMaximo: pregunta.puntaje,
        calificacionParcial: pregunta.calificacionParcial,
        nombreImagen: pregunta.nombreImagen,

        // Respuesta del estudiante (info básica)
        respuestaEstudiante: respuestaEstudiante
          ? {
              id: respuestaEstudiante.id,
              respuestaParsed: respuestaParsed, // ✅ Ya parseada, sin escapes
              puntajeObtenido: respuestaEstudiante.puntaje || 0,
              fecha_respuesta: respuestaEstudiante.fecha_respuesta,
              retroalimentacion: respuestaEstudiante.retroalimentacion,
            }
          : null,
      };

      // Agregar información específica según el tipo de pregunta
      switch (pregunta.type) {
        case "test": {
          // Todas las opciones con indicador de correcta
          preguntaDetalle.opciones = pregunta.options?.map((opt: any) => ({
            id: opt.id,
            texto: opt.texto,
            esCorrecta: opt.esCorrecta,
          }));
          preguntaDetalle.cantidadRespuestasCorrectas =
            pregunta.cantidadRespuestasCorrectas;

          // ✅ Usar respuesta ya parseada
          if (respuestaEstudiante && respuestaParsed) {
            preguntaDetalle.respuestaEstudiante.opcionesSeleccionadas =
              pregunta.options
                ?.filter((opt: any) => respuestaParsed.includes(opt.id))
                .map((opt: any) => ({
                  id: opt.id,
                  texto: opt.texto,
                  esCorrecta: opt.esCorrecta,
                }));
          }
          break;
        }

        case "open": {
          preguntaDetalle.textoRespuesta = pregunta.textoRespuesta;
          preguntaDetalle.keywords = pregunta.keywords?.map((kw: any) => ({
            id: kw.id,
            texto: kw.texto,
          }));

          // ✅ La respuesta ya viene parseada
          if (respuestaEstudiante && respuestaParsed) {
            let textoRespuesta = respuestaParsed;

            // Si aún es string con comillas, limpiar
            if (
              typeof textoRespuesta === "string" &&
              textoRespuesta.startsWith('"') &&
              textoRespuesta.endsWith('"')
            ) {
              textoRespuesta = textoRespuesta.slice(1, -1);
            }

            preguntaDetalle.respuestaEstudiante.textoEscrito = textoRespuesta;
          }
          break;
        }

        case "fill_blanks": {
          preguntaDetalle.textoCorrecto = pregunta.textoCorrecto;
          preguntaDetalle.respuestasCorrectas = pregunta.blanks?.map(
            (r: any) => ({
              id: r.id,
              posicion: r.posicion,
              textoCorrecto: r.textoCorrecto,
            }),
          );

          // ✅ Usar respuesta ya parseada
          if (
            respuestaEstudiante &&
            respuestaParsed &&
            Array.isArray(respuestaParsed)
          ) {
            // Mapear con las respuestas correctas
            preguntaDetalle.respuestaEstudiante.espaciosLlenados =
              pregunta.blanks
                ?.sort((a: any, b: any) => a.posicion - b.posicion)
                .map((blank: any, index: number) => ({
                  posicion: blank.posicion,
                  respuestaEstudiante: respuestaParsed[index] || "",
                  respuestaCorrecta: blank.textoCorrecto,
                  esCorrecta:
                    String(respuestaParsed[index] || "")
                      .toLowerCase()
                      .trim() ===
                    String(blank.textoCorrecto || "")
                      .toLowerCase()
                      .trim(),
                }));
          }
          break;
        }

        case "match": {
          preguntaDetalle.paresCorrectos = pregunta.pares?.map((par: any) => ({
            id: par.id,
            itemA: {
              id: par.itemA.id,
              text: par.itemA.text,
            },
            itemB: {
              id: par.itemB.id,
              text: par.itemB.text,
            },
          }));

          // ✅ Usar respuesta ya parseada
          if (
            respuestaEstudiante &&
            respuestaParsed &&
            Array.isArray(respuestaParsed)
          ) {
            preguntaDetalle.respuestaEstudiante.paresSeleccionados =
              respuestaParsed.map((parEst: any) => {
                // Buscar el itemA y itemB en los pares originales
                const itemA = pregunta.pares
                  ?.flatMap((p: any) => [p.itemA, p.itemB])
                  .find((item: any) => item.id === parEst.itemA_id);

                const itemB = pregunta.pares
                  ?.flatMap((p: any) => [p.itemA, p.itemB])
                  .find((item: any) => item.id === parEst.itemB_id);

                // Verificar si este par es correcto
                const esCorrecto = pregunta.pares?.some(
                  (p: any) =>
                    p.itemA.id === parEst.itemA_id &&
                    p.itemB.id === parEst.itemB_id,
                );

                return {
                  itemA: itemA
                    ? { id: itemA.id, text: itemA.text }
                    : { id: parEst.itemA_id, text: "Desconocido" },
                  itemB: itemB
                    ? { id: itemB.id, text: itemB.text }
                    : { id: parEst.itemB_id, text: "Desconocido" },
                  esCorrecto,
                };
              });
          }
          break;
        }
      }

      return preguntaDetalle;
    });

    // 6. Calcular estadísticas adicionales
    const totalPreguntas = exam.questions.length;
    const preguntasRespondidas = attempt.respuestas?.length || 0;
    const preguntasCorrectas = preguntasConRespuestas.filter(
      (p: any) =>
        p.respuestaEstudiante &&
        p.respuestaEstudiante.puntajeObtenido === p.puntajeMaximo,
    ).length;

    // 7. Construir respuesta completa
    return {
      // Información del intento
      intento: {
        id: attempt.id,
        examen_id: attempt.examen_id,
        estado: attempt.estado,
        nombre_estudiante: attempt.nombre_estudiante,
        correo_estudiante: attempt.correo_estudiante,
        identificacion_estudiante: attempt.identificacion_estudiante,
        fecha_inicio: attempt.fecha_inicio,
        fecha_fin: attempt.fecha_fin,
        limiteTiempoCumplido: attempt.limiteTiempoCumplido,
        consecuencia: attempt.consecuencia,

        // Calificaciones
        puntaje: attempt.puntaje,
        puntajeMaximo: attempt.puntajeMaximo,
        porcentaje: attempt.porcentaje,
        notaFinal: attempt.notaFinal,
        progreso: attempt.progreso,
      },

      // Información del examen
      examen: {
        id: exam.id,
        nombre: exam.nombre,
        descripcion: exam.descripcion,
        codigoExamen: exam.codigoExamen,
        estado: exam.estado,
        nombreProfesor: exam.nombreProfesor,
      },

      // Estadísticas
      estadisticas: {
        totalPreguntas,
        preguntasRespondidas,
        preguntasCorrectas,
        preguntasIncorrectas: preguntasRespondidas - preguntasCorrectas,
        preguntasSinResponder: totalPreguntas - preguntasRespondidas,
        tiempoTotal:
          attempt.fecha_fin && attempt.fecha_inicio
            ? Math.floor(
                (new Date(attempt.fecha_fin).getTime() -
                  new Date(attempt.fecha_inicio).getTime()) /
                  1000,
              ) // segundos
            : null,
      },

      // Preguntas con respuestas y calificaciones
      preguntas: preguntasConRespuestas,

      // Eventos de seguridad
      eventos: eventos.map((e) => ({
        id: e.id,
        tipo_evento: e.tipo_evento,
        fecha_envio: e.fecha_envio,
        leido: e.leido,
      })),
    };
  }

  /**
   * Elimina todos los eventos/alertas de un intento específico
   */
  static async deleteAttemptEvents(attemptId: number, io?: Server) {
    const eventRepo = AppDataSource.getRepository(ExamEvent);
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);

    console.log(`\n🗑️ ELIMINANDO EVENTOS - Intento ID: ${attemptId}`);

    // Verificar que el intento existe
    const attempt = await attemptRepo.findOne({
      where: { id: attemptId },
    });

    if (!attempt) {
      throwHttpError("Intento no encontrado", 404);
    }

    // Obtener la cantidad de eventos antes de eliminar
    const eventCount = await eventRepo.count({
      where: { intento_id: attemptId },
    });

    console.log(`📋 Eventos a eliminar: ${eventCount}`);

    // Eliminar todos los eventos del intento
    await eventRepo.delete({ intento_id: attemptId });

    console.log(`✅ ${eventCount} eventos eliminados exitosamente`);

    // Notificar a través de WebSocket si está disponible
    if (io) {
      // Notificar al profesor en la sala del examen
      io.to(`exam_${attempt.examen_id}`).emit("events_deleted", {
        attemptId,
        deletedCount: eventCount,
      });

      // Notificar en la sala del intento específico
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

  static async getAttemptCountByExam(examId: number): Promise<number> {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    return await attemptRepo.count({ where: { examen_id: examId } });
  }

  static async getGradesForDownload(examId: number): Promise<Buffer> {
    // 1. Obtener config del examen desde Exams MS
    const exam = await ExamAttemptValidator.validateExamExistsById(examId);

    // 2. Obtener todos los intentos del examen
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const attempts = await attemptRepo.find({
      where: { examen_id: examId },
      order: { fecha_inicio: "ASC" },
    });

    if (attempts.length === 0) {
      throwHttpError("No hay intentos registrados para este examen", 404);
    }

    // 3. Determinar qué columna de ID usar según prioridad
    const usaCodigo = exam.necesitaCodigoEstudiantil;
    const usaCorreo = exam.necesitaCorreoElectrónico;

    const getIdEstudiante = (a: ExamAttempt): string => {
      if (usaCodigo && a.identificacion_estudiante) {
        return a.identificacion_estudiante;
      }
      if (usaCorreo && a.correo_estudiante) {
        return a.correo_estudiante;
      }
      return a.nombre_estudiante || "Sin identificar";
    };

    let nombreColumnaId = "Estudiante";
    if (usaCodigo) nombreColumnaId = "Código estudiantil";
    else if (usaCorreo) nombreColumnaId = "Correo";
    else nombreColumnaId = "Nombre";

    const estadoTexto: Record<string, string> = {
      [AttemptState.ACTIVE]: "En curso",
      [AttemptState.FINISHED]: "Finalizado",
      [AttemptState.BLOCKED]: "Bloqueado",
      [AttemptState.ABANDONADO]: "Abandonado",
      [AttemptState.PAUSED]: "Pausado",
    };

    // 4. Construir Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Notas");

    // Encabezados
    sheet.columns = [
      { header: nombreColumnaId, key: "id", width: 30 },
      { header: "Estado", key: "estado", width: 18 },
      { header: "Calificación Final", key: "calificacion", width: 20 },
    ];

    // Estilo del encabezado
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Filas de datos
    for (const a of attempts) {
      const id = getIdEstudiante(a);
      const estado = estadoTexto[a.estado] || a.estado;

      let calificacion: string | number;
      if (a.calificacionPendiente) {
        calificacion = "Pendiente";
      } else if (a.notaFinal !== null && a.notaFinal !== undefined) {
        calificacion = Math.round(a.notaFinal * 100) / 100;
      } else if (a.estado === AttemptState.ABANDONADO) {
        calificacion = "Abandonado";
      } else if (a.estado === AttemptState.ACTIVE || a.estado === AttemptState.BLOCKED) {
        calificacion = "En curso";
      } else {
        calificacion = 0;
      }

      const row = sheet.addRow({ id, estado, calificacion });

      // Centrar estado y calificación
      row.getCell("estado").alignment = { horizontal: "center" };
      row.getCell("calificacion").alignment = { horizontal: "center" };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Retroalimentación completa para el estudiante vía codigo_acceso.
   * Solo disponible para intentos finalizados.
   * Muestra respuestas correctas, puntajes, retroalimentación, todo excepto eventos.
   */
  static async getAttemptFeedback(codigo_acceso: string) {
    const progressRepo = AppDataSource.getRepository(ExamInProgress);
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);

    // 1. Buscar ExamInProgress por codigo_acceso
    const examInProgress = await progressRepo.findOne({
      where: { codigo_acceso },
    });

    if (!examInProgress) {
      throwHttpError("Código de acceso inválido", 404);
    }

    // 2. Obtener el intento con sus respuestas
    const attempt = await attemptRepo.findOne({
      where: { id: examInProgress.intento_id },
      relations: ["respuestas"],
    });

    if (!attempt) {
      throwHttpError("Intento no encontrado", 404);
    }

    // 3. Solo para intentos finalizados
    if (attempt.estado !== AttemptState.FINISHED) {
      throwHttpError(
        "La retroalimentación solo está disponible para exámenes finalizados",
        403,
      );
    }

    // 4. Obtener examen completo (con respuestas correctas) desde Exams MS
    const examBasic = await ExamAttemptValidator.validateExamExistsById(
      attempt.examen_id,
    );

    // 5. Si es examen PDF, retornar estructura especial
    if (attempt.esExamenPDF) {
      const respuestasPDF = (attempt.respuestas || []).map((r) => {
        let metadataParsed = null;
        if (r.metadata_codigo) {
          try {
            metadataParsed = JSON.parse(r.metadata_codigo);
          } catch {
            metadataParsed = r.metadata_codigo;
          }
        }

        let respuestaParsed: any = r.respuesta;
        const structuredTypes = [
          TipoRespuesta.DIAGRAMA,
          TipoRespuesta.PYTHON,
          TipoRespuesta.JAVASCRIPT,
          TipoRespuesta.JAVA,
        ];
        if (structuredTypes.includes(r.tipo_respuesta)) {
          try {
            respuestaParsed = JSON.parse(r.respuesta);
          } catch {
            respuestaParsed = r.respuesta;
          }
        }

        return {
          id: r.id,
          pregunta_id: r.pregunta_id,
          tipo_respuesta: r.tipo_respuesta,
          respuesta: respuestaParsed,
          metadata_codigo: metadataParsed,
          puntajeObtenido: r.puntaje,
          fecha_respuesta: r.fecha_respuesta,
          retroalimentacion: r.retroalimentacion,
        };
      });

      return {
        intento: {
          id: attempt.id,
          examen_id: attempt.examen_id,
          estado: attempt.estado,
          nombre_estudiante: attempt.nombre_estudiante,
          correo_estudiante: attempt.correo_estudiante,
          identificacion_estudiante: attempt.identificacion_estudiante,
          fecha_inicio: attempt.fecha_inicio,
          fecha_fin: attempt.fecha_fin,
          limiteTiempoCumplido: attempt.limiteTiempoCumplido,
          consecuencia: attempt.consecuencia,
          puntaje: attempt.puntaje,
          puntajeMaximo: attempt.puntajeMaximo,
          porcentaje: attempt.porcentaje,
          notaFinal: attempt.notaFinal,
          progreso: attempt.progreso,
          esExamenPDF: attempt.esExamenPDF,
          calificacionPendiente: attempt.calificacionPendiente,
          retroalimentacion: attempt.retroalimentacion || null,
        },
        examen: {
          id: examBasic.id,
          nombre: examBasic.nombre,
          descripcion: examBasic.descripcion,
          codigoExamen: examBasic.codigoExamen,
          estado: examBasic.estado,
          nombreProfesor: examBasic.nombreProfesor,
          archivoPDF: examBasic.archivoPDF,
        },
        estadisticas: {
          totalRespuestas: respuestasPDF.length,
          tiempoTotal:
            attempt.fecha_fin && attempt.fecha_inicio
              ? Math.floor(
                  (new Date(attempt.fecha_fin).getTime() -
                    new Date(attempt.fecha_inicio).getTime()) /
                    1000,
                )
              : null,
        },
        respuestasPDF,
      };
    }

    // 6. Examen con preguntas: obtener examen con respuestas correctas
    const EXAM_MS_URL = process.env.EXAM_MS_URL;
    const examResponse = await axios.get(
      `${EXAM_MS_URL}/api/exams/by-id/${attempt.examen_id}`,
    );
    const exam = examResponse.data;

    if (!exam || !exam.questions) {
      throwHttpError(
        "No se pudo obtener la información completa del examen",
        500,
      );
    }

    // 7. Parsear respuestas y construir detalles por pregunta (con respuestas correctas)
    const parseStudentAnswer = (_type: string, respuesta: string) => {
      try {
        return JSON.parse(respuesta);
      } catch {
        return respuesta;
      }
    };

    const preguntasConRespuestas = exam.questions.map((pregunta: any) => {
      const respuestaEstudiante = attempt.respuestas?.find(
        (r) => r.pregunta_id === pregunta.id,
      );

      let respuestaParsed = null;
      if (respuestaEstudiante) {
        respuestaParsed = parseStudentAnswer(
          pregunta.type,
          respuestaEstudiante.respuesta,
        );
      }

      const preguntaDetalle: any = {
        id: pregunta.id,
        enunciado: pregunta.enunciado,
        type: pregunta.type,
        puntajeMaximo: pregunta.puntaje,
        calificacionParcial: pregunta.calificacionParcial,
        nombreImagen: pregunta.nombreImagen,
        respuestaEstudiante: respuestaEstudiante
          ? {
              id: respuestaEstudiante.id,
              respuestaParsed: respuestaParsed,
              puntajeObtenido: respuestaEstudiante.puntaje || 0,
              fecha_respuesta: respuestaEstudiante.fecha_respuesta,
              retroalimentacion: respuestaEstudiante.retroalimentacion,
            }
          : null,
      };

      switch (pregunta.type) {
        case "test": {
          preguntaDetalle.opciones = pregunta.options?.map((opt: any) => ({
            id: opt.id,
            texto: opt.texto,
            esCorrecta: opt.esCorrecta,
          }));
          preguntaDetalle.cantidadRespuestasCorrectas =
            pregunta.options?.filter((opt: any) => opt.esCorrecta).length || 0;

          if (respuestaEstudiante && respuestaParsed) {
            preguntaDetalle.respuestaEstudiante.opcionesSeleccionadas =
              pregunta.options
                ?.filter((opt: any) => respuestaParsed.includes(opt.id))
                .map((opt: any) => ({
                  id: opt.id,
                  texto: opt.texto,
                  esCorrecta: opt.esCorrecta,
                }));
          }
          break;
        }

        case "open": {
          preguntaDetalle.textoRespuesta = pregunta.textoRespuesta;
          preguntaDetalle.keywords = pregunta.keywords?.map((kw: any) => ({
            id: kw.id,
            texto: kw.texto,
          }));

          if (respuestaEstudiante && respuestaParsed) {
            let textoRespuesta = respuestaParsed;
            if (
              typeof textoRespuesta === "string" &&
              textoRespuesta.startsWith('"') &&
              textoRespuesta.endsWith('"')
            ) {
              textoRespuesta = textoRespuesta.slice(1, -1);
            }
            preguntaDetalle.respuestaEstudiante.textoEscrito = textoRespuesta;
          }
          break;
        }

        case "fill_blanks": {
          preguntaDetalle.textoCorrecto = pregunta.textoCorrecto;
          preguntaDetalle.respuestasCorrectas = pregunta.respuestas?.map(
            (r: any) => ({
              id: r.id,
              posicion: r.posicion,
              textoCorrecto: r.textoCorrecto,
            }),
          );

          if (
            respuestaEstudiante &&
            respuestaParsed &&
            Array.isArray(respuestaParsed)
          ) {
            preguntaDetalle.respuestaEstudiante.espaciosLlenados =
              pregunta.respuestas
                ?.sort((a: any, b: any) => a.posicion - b.posicion)
                .map((blank: any, index: number) => ({
                  posicion: blank.posicion,
                  respuestaEstudiante: respuestaParsed[index] || "",
                  respuestaCorrecta: blank.textoCorrecto,
                  esCorrecta:
                    String(respuestaParsed[index] || "")
                      .toLowerCase()
                      .trim() ===
                    String(blank.textoCorrecto || "")
                      .toLowerCase()
                      .trim(),
                }));
          }
          break;
        }

        case "match": {
          preguntaDetalle.paresCorrectos = pregunta.pares?.map((par: any) => ({
            id: par.id,
            itemA: { id: par.itemA.id, text: par.itemA.text },
            itemB: { id: par.itemB.id, text: par.itemB.text },
          }));

          if (
            respuestaEstudiante &&
            respuestaParsed &&
            Array.isArray(respuestaParsed)
          ) {
            preguntaDetalle.respuestaEstudiante.paresSeleccionados =
              respuestaParsed.map((parEst: any) => {
                const itemA = pregunta.pares
                  ?.flatMap((p: any) => [p.itemA, p.itemB])
                  .find((item: any) => item.id === parEst.itemA_id);
                const itemB = pregunta.pares
                  ?.flatMap((p: any) => [p.itemA, p.itemB])
                  .find((item: any) => item.id === parEst.itemB_id);
                const esCorrecto = pregunta.pares?.some(
                  (p: any) =>
                    p.itemA.id === parEst.itemA_id &&
                    p.itemB.id === parEst.itemB_id,
                );
                return {
                  itemA: itemA
                    ? { id: itemA.id, text: itemA.text }
                    : { id: parEst.itemA_id, text: "Desconocido" },
                  itemB: itemB
                    ? { id: itemB.id, text: itemB.text }
                    : { id: parEst.itemB_id, text: "Desconocido" },
                  esCorrecto,
                };
              });
          }
          break;
        }
      }

      return preguntaDetalle;
    });

    // 8. Estadísticas
    const totalPreguntas = exam.questions.length;
    const preguntasRespondidas = attempt.respuestas?.length || 0;
    const preguntasCorrectas = preguntasConRespuestas.filter(
      (p: any) =>
        p.respuestaEstudiante &&
        p.respuestaEstudiante.puntajeObtenido === p.puntajeMaximo,
    ).length;

    return {
      intento: {
        id: attempt.id,
        examen_id: attempt.examen_id,
        estado: attempt.estado,
        nombre_estudiante: attempt.nombre_estudiante,
        correo_estudiante: attempt.correo_estudiante,
        identificacion_estudiante: attempt.identificacion_estudiante,
        fecha_inicio: attempt.fecha_inicio,
        fecha_fin: attempt.fecha_fin,
        limiteTiempoCumplido: attempt.limiteTiempoCumplido,
        consecuencia: attempt.consecuencia,
        puntaje: attempt.puntaje,
        puntajeMaximo: attempt.puntajeMaximo,
        porcentaje: attempt.porcentaje,
        notaFinal: attempt.notaFinal,
        progreso: attempt.progreso,
      },
      examen: {
        id: exam.id,
        nombre: exam.nombre,
        descripcion: exam.descripcion,
        codigoExamen: exam.codigoExamen,
        estado: exam.estado,
        nombreProfesor: examBasic.nombreProfesor,
      },
      estadisticas: {
        totalPreguntas,
        preguntasRespondidas,
        preguntasCorrectas,
        preguntasIncorrectas: preguntasRespondidas - preguntasCorrectas,
        preguntasSinResponder: totalPreguntas - preguntasRespondidas,
        tiempoTotal:
          attempt.fecha_fin && attempt.fecha_inicio
            ? Math.floor(
                (new Date(attempt.fecha_fin).getTime() -
                  new Date(attempt.fecha_inicio).getTime()) /
                  1000,
              )
            : null,
      },
      preguntas: preguntasConRespuestas,
    };
  }
}
