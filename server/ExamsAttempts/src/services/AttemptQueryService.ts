import { AppDataSource } from "../data-source/AppDataSource";
import { ExamAttempt, AttemptState } from "../models/ExamAttempt";
import { ExamEvent } from "../models/ExamEvent";
import { ExamInProgress } from "../models/ExamInProgress";
import { ExamAttemptValidator } from "../validators/ExamAttemptValidator";
import { throwHttpError } from "../utils/errors";
import { QuestionResponseBuilder } from "./QuestionResponseBuilder";
import axios from "axios";
import ExcelJS from "exceljs";

export class AttemptQueryService {
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
    const examBasic = await ExamAttemptValidator.validateExamExistsById(
      attempt.examen_id,
    );

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

    const eventosFormatted = eventos.map((e) => ({
      id: e.id,
      tipo_evento: e.tipo_evento,
      fecha_envio: e.fecha_envio,
      leido: e.leido,
    }));

    // Si es examen PDF, retornar estructura especial
    if (attempt.esExamenPDF) {
      const respuestasPDF = QuestionResponseBuilder.buildPDFResponses(
        attempt.respuestas || [],
      );

      return {
        intento: QuestionResponseBuilder.buildAttemptSummary(attempt, true),
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
          tiempoTotal: QuestionResponseBuilder.buildTimeTotalSeconds(attempt),
        },
        respuestasPDF,
        eventos: eventosFormatted,
      };
    }

    // Flujo normal para exámenes con preguntas
    if (!exam.questions) {
      throwHttpError(
        "No se pudo obtener la información completa del examen",
        500,
      );
    }

    const preguntasConRespuestas =
      QuestionResponseBuilder.buildQuestionsWithAnswers(
        exam.questions,
        attempt.respuestas || [],
      );

    return {
      intento: QuestionResponseBuilder.buildAttemptSummary(attempt),
      examen: {
        id: exam.id,
        nombre: exam.nombre,
        descripcion: exam.descripcion,
        codigoExamen: exam.codigoExamen,
        estado: exam.estado,
        nombreProfesor: exam.nombreProfesor,
      },
      estadisticas: QuestionResponseBuilder.buildStatistics(
        attempt,
        exam.questions.length,
        preguntasConRespuestas,
      ),
      preguntas: preguntasConRespuestas,
      eventos: eventosFormatted,
    };
  }

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
      const respuestasPDF = QuestionResponseBuilder.buildPDFResponses(
        attempt.respuestas || [],
      );

      return {
        intento: QuestionResponseBuilder.buildAttemptSummary(attempt, true),
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
          tiempoTotal: QuestionResponseBuilder.buildTimeTotalSeconds(attempt),
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

    // 7. Usar QuestionResponseBuilder para construir preguntas con respuestas
    const preguntasConRespuestas =
      QuestionResponseBuilder.buildQuestionsWithAnswers(
        exam.questions,
        attempt.respuestas || [],
      );

    return {
      intento: QuestionResponseBuilder.buildAttemptSummary(attempt),
      examen: {
        id: exam.id,
        nombre: exam.nombre,
        descripcion: exam.descripcion,
        codigoExamen: exam.codigoExamen,
        estado: exam.estado,
        nombreProfesor: examBasic.nombreProfesor,
      },
      estadisticas: QuestionResponseBuilder.buildStatistics(
        attempt,
        exam.questions.length,
        preguntasConRespuestas,
      ),
      preguntas: preguntasConRespuestas,
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
          notaFinal: attempt.notaFinal,
        };
      }),
    );

    return attemptsWithDetails;
  }

  static async getAttemptCountByExam(examId: number): Promise<number> {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    return await attemptRepo.count({ where: { examen_id: examId } });
  }

  static async getGradesForDownload(examId: number): Promise<Buffer> {
    const exam = await ExamAttemptValidator.validateExamExistsById(examId);

    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const attempts = await attemptRepo.find({
      where: { examen_id: examId },
      order: { fecha_inicio: "ASC" },
    });

    if (attempts.length === 0) {
      throwHttpError("No hay intentos registrados para este examen", 404);
    }

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

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Notas");

    sheet.columns = [
      { header: nombreColumnaId, key: "id", width: 30 },
      { header: "Estado", key: "estado", width: 18 },
      { header: "Calificación Final", key: "calificacion", width: 20 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    for (const a of attempts) {
      const id = getIdEstudiante(a);
      const estado = estadoTexto[a.estado] || a.estado;

      let calificacion: string | number | null;
      if (a.estado === AttemptState.FINISHED) {
        if (a.calificacionPendiente) {
          calificacion = "Pendiente";
        } else if (a.notaFinal !== null && a.notaFinal !== undefined) {
          calificacion = Math.round(a.notaFinal * 100) / 100;
        } else {
          calificacion = 0;
        }
      } else {
        calificacion = null;
      }

      const row = sheet.addRow({ id, estado, calificacion });

      row.getCell("estado").alignment = { horizontal: "center" };
      row.getCell("calificacion").alignment = { horizontal: "center" };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
