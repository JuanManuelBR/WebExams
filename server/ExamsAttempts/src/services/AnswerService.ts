import { AppDataSource } from "../data-source/AppDataSource";
import { Server } from "socket.io";
import { ExamAttempt } from "../models/ExamAttempt";
import { ExamAnswer } from "../models/ExamAnswer";
import { ExamInProgress, } from "../models/ExamInProgress";
import { AttemptState } from "../models/ExamAttempt";
import { ExamAttemptValidator } from "../validators/ExamAttemptValidator";
import { throwHttpError } from "../utils/errors";
import { CreateExamAnswerDto } from "../dtos/Create-ExamAnswer.dto";
import { GradingService } from "./GradingService";

export class AnswerService {
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

    // Calcular progreso
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

    if (puntaje !== undefined) {
      const attempt = await attemptRepo.findOne({
        where: { id: answer.intento_id },
      });

      if (!attempt) {
        throwHttpError("Intento no encontrado", 404);
      }

      const exam = await ExamAttemptValidator.validateExamExistsById(
        attempt.examen_id,
      );

      const question = exam.questions?.find(
        (q: any) => q.id === answer.pregunta_id,
      );

      if (!question) {
        throwHttpError("Pregunta no encontrada en el examen", 404);
      }

      if (puntaje < 0) {
        throwHttpError("El puntaje no puede ser negativo", 400);
      }

      if (puntaje > question.puntaje) {
        throwHttpError(
          `El puntaje no puede exceder el máximo de la pregunta (${question.puntaje} puntos)`,
          400,
        );
      }

      answer.puntaje = puntaje;
    }

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
      const puntajeTotal =
        attempt.respuestas?.reduce((sum, r) => sum + (r.puntaje || 0), 0) || 0;

      attempt.puntaje = puntajeTotal;

      const { porcentaje, notaFinal } = GradingService.calculateFinalGrade(
        puntajeTotal,
        attempt.puntajeMaximo,
      );

      attempt.porcentaje = porcentaje;
      attempt.notaFinal = notaFinal;

      await attemptRepo.save(attempt);

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
}
