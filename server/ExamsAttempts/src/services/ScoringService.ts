import { AppDataSource } from "../data-source/AppDataSource";
import { Server } from "socket.io";
import { Not } from "typeorm";
import { ExamAttempt, AttemptState } from "../models/ExamAttempt";
import { ExamAnswer } from "../models/ExamAnswer";
import { ExamInProgress } from "../models/ExamInProgress";
import { ExamAttemptValidator } from "../validators/ExamAttemptValidator";
import { throwHttpError } from "../utils/errors";
import { generateAccessCode } from "../utils/CodeGenerator";
import { GradingService } from "./GradingService";
import { internalHttpClient } from "../utils/httpClient";

export class ScoringService {
  static async calculateScore(attempt: ExamAttempt): Promise<number> {


    try {
      const exam = await ExamAttemptValidator.validateExamExistsById(
        attempt.examen_id,
      );


      if (!exam.questions || exam.questions.length === 0) {
        console.warn(`⚠️ El examen ${exam.id} no tiene preguntas`);
        return 0;
      }

      let puntajeTotal = 0;
      let puntajePosibleTotal = 0;
      const answerRepo = AppDataSource.getRepository(ExamAnswer);


      for (let i = 0; i < exam.questions.length; i++) {
        const question = exam.questions[i];

        puntajePosibleTotal += question.puntaje;

        const studentAnswer = attempt.respuestas?.find(
          (ans) => ans.pregunta_id === question.id,
        );

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

        }

        puntajeTotal += puntajePregunta;

      }

      const { porcentaje, notaFinal } = GradingService.calculateFinalGrade(
        puntajeTotal,
        puntajePosibleTotal,
      );



      const attemptRepo = AppDataSource.getRepository(ExamAttempt);
      attempt.porcentaje = porcentaje;
      attempt.notaFinal = notaFinal;
      await attemptRepo.save(attempt);

      return Math.round(puntajeTotal * 100000) / 100000;
    } catch (error) {
      console.error("❌ ERROR CRÍTICO al calcular puntaje:", error);
      return 0;
    }
  }

  static async forceFinishActiveAttempts(examId: number, io: Server) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);


    const activeAttempts = await attemptRepo.find({
      where: {
        examen_id: examId,
        estado: Not(AttemptState.FINISHED),
      },
      relations: ["respuestas"],
    });

    if (activeAttempts.length === 0) {
      return {
        message: "No hay intentos pendientes para finalizar",
        finalizados: 0,
        detalles: [],
      };
    }


    const resultados = [];

    for (const attempt of activeAttempts) {
      try {

        const examInProgress = await progressRepo.findOne({
          where: { intento_id: attempt.id },
        });

        if (!examInProgress) {
          console.warn(`⚠️ No se encontró ExamInProgress para el intento ${attempt.id}`);
          continue;
        }

        if (attempt.esExamenPDF) {
          attempt.puntaje = null;
          attempt.calificacionPendiente = true;
        } else {
          const puntaje = await this.calculateScore(attempt);
          attempt.puntaje = puntaje;
        }

        attempt.fecha_fin = new Date();
        attempt.estado = AttemptState.FINISHED;
        attempt.codigoRevision = generateAccessCode();

        await attemptRepo.save(attempt);
        await progressRepo.delete({ intento_id: attempt.id });


        io.to(`attempt_${attempt.id}`).emit("forced_finish", {
          message: "El profesor ha finalizado el examen para todos los estudiantes",
          tipo: "todos",
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

    io.to(`exam_${examId}`).emit("forced_finish_completed", {
      totalFinalizados: resultados.length,
      detalles: resultados,
    });


    return {
      message: `${resultados.length} intentos activos han sido finalizados exitosamente`,
      finalizados: resultados.length,
      detalles: resultados,
    };
  }

  /**
   * Finaliza todos los intentos activos de un examen cuando éste se cierra
   * (automáticamente por horaCierre o manualmente por el profesor).
   * Aplica la política limiteTiempoCumplido y emite time_expired al estudiante.
   */
  static async finishByExamClose(examId: number, io: Server) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);


    const activeAttempts = await attemptRepo.find({
      where: { examen_id: examId, estado: Not(AttemptState.FINISHED) },
      relations: ["respuestas"],
    });

    if (activeAttempts.length === 0) {
      return { message: "No hay intentos pendientes para finalizar", finalizados: 0 };
    }

    const resultados = [];

    for (const attempt of activeAttempts) {
      try {
        const examInProgress = await progressRepo.findOne({
          where: { intento_id: attempt.id },
        });

        if (!examInProgress) {
          console.warn(`⚠️ No se encontró ExamInProgress para el intento ${attempt.id}`);
          continue;
        }

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
          const puntaje = await this.calculateScore(attempt);
          attempt.puntaje = puntaje;
        }

        attempt.fecha_fin = new Date();
        attempt.estado = AttemptState.FINISHED;
        attempt.codigoRevision = generateAccessCode();

        await attemptRepo.save(attempt);
        await progressRepo.delete({ intento_id: attempt.id });


        io.to(`attempt_${attempt.id}`).emit("time_expired", {
          message: "El examen ha sido cerrado",
          puntaje: attempt.puntaje,
          esExamenPDF: attempt.esExamenPDF,
          calificacionPendiente: attempt.calificacionPendiente,
          limiteTiempoCumplido: attempt.limiteTiempoCumplido,
        });

        resultados.push({
          intentoId: attempt.id,
          estudiante: {
            nombre: attempt.nombre_estudiante,
            correo: attempt.correo_estudiante,
            identificacion: attempt.identificacion_estudiante,
          },
          puntaje: attempt.puntaje,
          limiteTiempoCumplido: attempt.limiteTiempoCumplido,
        });
      } catch (error) {
        console.error(`❌ Error al finalizar intento ${attempt.id}:`, error);
      }
    }

    io.to(`exam_${examId}`).emit("exam_closed_completed", {
      totalFinalizados: resultados.length,
      detalles: resultados,
    });


    return {
      message: `${resultados.length} intentos finalizados por cierre de examen`,
      finalizados: resultados.length,
      detalles: resultados,
    };
  }

  static async forceFinishSingleAttempt(attemptId: number, io: Server) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);


    const attempt = await attemptRepo.findOne({
      where: { id: attemptId },
      relations: ["respuestas"],
    });

    if (!attempt) {
      throwHttpError("Intento no encontrado", 404);
    }

    if (attempt.estado === AttemptState.FINISHED) {
      throwHttpError("El intento ya está finalizado.", 400);
    }


    const examInProgress = await progressRepo.findOne({
      where: { intento_id: attempt.id },
    });

    if (!examInProgress) {
      throwHttpError(
        `No se encontró ExamInProgress para el intento ${attempt.id}`,
        404,
      );
    }

    if (attempt.esExamenPDF) {
      attempt.puntaje = null;
      attempt.calificacionPendiente = true;
    } else {
      const puntaje = await this.calculateScore(attempt);
      attempt.puntaje = puntaje;
    }

    attempt.fecha_fin = new Date();
    attempt.estado = AttemptState.FINISHED;
    attempt.codigoRevision = generateAccessCode();

    await attemptRepo.save(attempt);
    await progressRepo.delete({ intento_id: attempt.id });


    io.to(`attempt_${attempt.id}`).emit("forced_finish", {
      message: "El profesor ha finalizado tu examen",
      tipo: "individual",
      puntaje: attempt.puntaje,
      puntajeMaximo: attempt.puntajeMaximo,
      porcentaje: attempt.porcentaje,
      notaFinal: attempt.notaFinal,
      attemptId: attempt.id,
      esExamenPDF: attempt.esExamenPDF,
      calificacionPendiente: attempt.calificacionPendiente,
    });

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

  static async removeTimeLimit(examId: number, io: Server) {
    const progressRepo = AppDataSource.getRepository(ExamInProgress);

    // Encontrar todos los intentos activos del examen
    const activeProgress = await progressRepo
      .createQueryBuilder("p")
      .innerJoin("exam_attempts", "a", "a.id = p.intento_id")
      .where("a.examen_id = :examId", { examId })
      .andWhere("p.estado = :estado", { estado: AttemptState.ACTIVE })
      .getMany();

    // Quitar fecha_expiracion de cada intento activo y notificar al estudiante
    for (const progress of activeProgress) {
      progress.fecha_expiracion = null;
      await progressRepo.save(progress);

      io.to(`attempt_${progress.intento_id}`).emit("time_limit_removed", {
        message: "El profesor ha quitado el tiempo límite del examen",
      });
    }

    // Notificar al panel del profesor
    io.to(`exam_${examId}`).emit("time_limit_removed_completed", {
      intentosActualizados: activeProgress.length,
    });

    // Limpiar en el Exams MS: horaCierre, limiteTiempo, scheduler
    const EXAM_MS_URL = process.env.EXAM_MS_URL;
    if (EXAM_MS_URL) {
      await internalHttpClient
        .patch(`${EXAM_MS_URL}/api/exams/${examId}/remove-time-limit`)
        .catch((err) =>
          console.error(`Error al limpiar tiempo límite en Exams MS para examen ${examId}:`, err.message),
        );
    }
    return {
      message: "Tiempo límite eliminado exitosamente",
      intentosActualizados: activeProgress.length,
      intentoIds: activeProgress.map((p) => p.intento_id),
    };
  }
}
