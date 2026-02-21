import { AppDataSource } from "../data-source/AppDataSource";
import { Server } from "socket.io";
import { Not } from "typeorm";
import { ExamAttempt, AttemptState } from "../models/ExamAttempt";
import { ExamAnswer } from "../models/ExamAnswer";
import { ExamInProgress } from "../models/ExamInProgress";
import { ExamAttemptValidator } from "../validators/ExamAttemptValidator";
import { throwHttpError } from "../utils/errors";
import { GradingService } from "./GradingService";

export class ScoringService {
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

      for (let i = 0; i < exam.questions.length; i++) {
        const question = exam.questions[i];

        console.log(
          `\n[${i + 1}/${exam.questions.length}] 📌 Pregunta ID: ${question.id}`,
        );
        console.log(`    Tipo: ${question.type.toUpperCase()}`);
        console.log(`    Puntaje máximo: ${question.puntaje}`);
        console.log(`    Enunciado: "${question.enunciado}"`);

        puntajePosibleTotal += question.puntaje;

        const studentAnswer = attempt.respuestas?.find(
          (ans) => ans.pregunta_id === question.id,
        );

        if (!studentAnswer) {
          console.log(`    ⚠️ Sin respuesta del estudiante`);
        } else {
          console.log(`    📥 Respuesta guardada: ${studentAnswer.respuesta}`);
        }

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

    console.log(`\n🔴 FORZANDO ENVÍO DE TODOS LOS INTENTOS - Examen ID: ${examId}`);

    const activeAttempts = await attemptRepo.find({
      where: {
        examen_id: examId,
        estado: Not(AttemptState.FINISHED),
      },
      relations: ["respuestas"],
    });

    if (activeAttempts.length === 0) {
      console.log("⚠️ No hay intentos pendientes para finalizar");
      return {
        message: "No hay intentos pendientes para finalizar",
        finalizados: 0,
        detalles: [],
      };
    }

    console.log(`📋 Total de intentos pendientes encontrados: ${activeAttempts.length}`);

    const resultados = [];

    for (const attempt of activeAttempts) {
      try {
        console.log(`\n📝 Procesando intento ${attempt.id} - Estudiante: ${attempt.nombre_estudiante || "Sin nombre"}`);

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
        examInProgress.estado = AttemptState.FINISHED;
        examInProgress.fecha_fin = new Date();

        await attemptRepo.save(attempt);
        await progressRepo.save(examInProgress);

        console.log(`✅ Intento ${attempt.id} finalizado - Puntaje: ${attempt.puntaje ?? "Pendiente"}/${attempt.puntajeMaximo}`);

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

    console.log(`\n✅ Proceso completado - ${resultados.length} intentos finalizados`);

    return {
      message: `${resultados.length} intentos activos han sido finalizados exitosamente`,
      finalizados: resultados.length,
      detalles: resultados,
    };
  }

  static async forceFinishSingleAttempt(attemptId: number, io: Server) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);

    console.log(`\n🔴 FORZANDO ENVÍO DE INTENTO - ID: ${attemptId}`);

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

    console.log(`📝 Procesando intento ${attempt.id} - Estudiante: ${attempt.nombre_estudiante || "Sin nombre"}`);

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
    examInProgress.estado = AttemptState.FINISHED;
    examInProgress.fecha_fin = new Date();

    await attemptRepo.save(attempt);
    await progressRepo.save(examInProgress);

    console.log(`✅ Intento ${attempt.id} finalizado - Puntaje: ${attempt.puntaje ?? "Pendiente"}/${attempt.puntajeMaximo}`);

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
}
