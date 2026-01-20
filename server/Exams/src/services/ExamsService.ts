// src/services/ExamsService.ts
import { AppDataSource } from "../data-source/AppDataSource";
import { Exam } from "../models/Exam";
import { CommonValidator } from "@src/validators/common";
import { generateExamCode } from "@src/utils/generetaExamCode";
import { add_exam_dto } from "@src/dtos/add-exam.dto";
import { Question } from "@src/models/Question";
import { examenValidator } from "@src/validators/examen-validator";
import { QuestionValidator } from "@src/validators/question-validator";
import { throwHttpError } from "@src/utils/errors";
import { schedulerService } from "@src/scheduler/examScheduler";
import { omit } from "lodash";

import { NextFunction } from "express";
import axios from "axios";

export class ExamService {
  private examRepo = AppDataSource.getRepository(Exam);

  async addExam(rawData: any, cookies?: string) {
    const validator = new CommonValidator();
    const data = await validator.validateDto(add_exam_dto, rawData);

    if (data.horaApertura && data.horaCierre) {
      const apertura = new Date(data.horaApertura);
      const cierre = new Date(data.horaCierre);

      if (isNaN(apertura.getTime()) || isNaN(cierre.getTime())) {
        throwHttpError(
          "Formato de fecha inválido en horaApertura u horaCierre",
          400,
        );
      }

      if (apertura >= cierre) {
        throwHttpError(
          "La fecha y hora de apertura deben ser anteriores a la fecha y hora de cierre",
          400,
        );
      }
    }
    const id_profesor = Number(data.id_profesor);
    if (isNaN(id_profesor)) {
      throwHttpError("ID de profesor inválido", 400);
    }

    await examenValidator.verificarProfesor(id_profesor, cookies);
    await examenValidator.verificarExamenDuplicado(data.nombre, id_profesor);

    const cambioEstadoAutomatico = !!(data.horaApertura && data.horaCierre);

    if (data.horaApertura && data.horaCierre) {
      if (data.horaApertura >= data.horaCierre) {
        throwHttpError(
          "La hora de apertura debe ser anterior a la hora de cierre",
          400,
        );
      }
    }

    return await AppDataSource.transaction(async (manager) => {
      let codigoExamen: string;
      let codigoExiste = true;
      let intentos = 0;
      const MAX_INTENTOS = 10;

      while (codigoExiste && intentos < MAX_INTENTOS) {
        codigoExamen = generateExamCode();
        const examenConCodigo = await manager.findOne(Exam, {
          where: { codigoExamen },
        });
        codigoExiste = !!examenConCodigo;
        intentos++;
      }

      if (codigoExiste) {
        throwHttpError(
          "No se pudo generar un código único para el examen",
          500,
        );
      }

      const nuevo_examen = manager.create(Exam, {
        nombre: data.nombre,
        contrasena: data.contrasena,
        estado: data.estado,
        id_profesor,
        fecha_creacion: new Date(data.fecha_creacion),
        necesitaNombreCompleto: data.necesitaNombreCompleto,
        necesitaCodigoEstudiantil: data.necesitaCodigoEstudiantil,
        necesitaCorreoElectrónico: data.necesitaCorreoElectrónico,
        descripcion: data.descripcion,
        incluirHerramientaDibujo: data.incluirHerramientaDibujo,
        incluirCalculadoraCientifica: data.incluirCalculadoraCientifica,
        incluirHojaExcel: data.incluirHojaExcel,
        incluirJavascript: data.incluirJavascript,
        incluirPython: data.incluirPython,
        horaApertura: data.horaApertura || null,
        horaCierre: data.horaCierre || null,
        limiteTiempo: data.limiteTiempo,
        limiteTiempoCumplido: data.limiteTiempoCumplido,
        consecuencia: data.consecuencia,
        codigoExamen: codigoExamen!,
        archivoPDF: data.archivoPDF || null,
        cambioEstadoAutomatico,
      });

      const examen_guardado = await manager.save(Exam, nuevo_examen);

      if (data.questions?.length) {
        const preguntas = QuestionValidator.crearPreguntasDesdeDto(
          data.questions,
          examen_guardado,
        );
        const preguntas_guardadas = await manager.save(Question, preguntas);
        examen_guardado.questions = preguntas_guardadas.map((q: any) => {
          delete q.exam;
          if (q.type === "matching" && q.pares) {
            q.pares.forEach((p: any) => {
              delete p.question;
            });
          }
          return q;
        });
      }

      if (cambioEstadoAutomatico) {
        schedulerService.programarCambioEstado(examen_guardado);
      }

      return examen_guardado;
    });
  }

  async listExams() {
    const examenes = await this.examRepo.find({
      relations: ["questions"],
    });
    return examenes;
  }

  async getExamsByUser(userId: number, cookies?: string) {
    await examenValidator.verificarProfesor(userId, cookies);

    const examenes = await this.examRepo.find({
      where: { id_profesor: userId },
      relations: ["questions"],
    });

    return examenes;
  }

  async deleteExamsByUser(userId: number, cookies?: string) {
    await examenValidator.verificarProfesor(userId, cookies);
    await this.examRepo.delete({
      id_profesor: userId,
    });
  }

  async getExamByCodigo(codigoExamen: string) {
    const examen = await this.examRepo.findOne({
      where: { codigoExamen: codigoExamen },
      relations: ["questions"],
    });

    if (!examen) {
      throwHttpError("Examen no encontrado", 404);
    }

    let nombreProfesor = "Profesor no disponible";
    try {
      const usersMsUrl = process.env.USERS_MS_URL;
      const response = await axios.get(
        `${usersMsUrl}/api/users/${examen.id_profesor}`,
      );
      const profesor = response.data;
      nombreProfesor = `${profesor.nombres} ${profesor.apellidos}`.trim();
    } catch (error) {
      console.error("Error al obtener profesor:", error);
    }

    const examSinRespuestas = {
      nombre: examen.nombre,
      codigoExamen: examen.codigoExamen,
      necesitaNombreCompleto: examen.necesitaNombreCompleto,
      necesitaCorreoElectrónico: examen.necesitaCorreoElectrónico,
      necesitaCodigoEstudiantil: examen.necesitaCodigoEstudiantil,
      necesitaContrasena: examen.necesitaContrasena,
      estado: examen.estado,
      incluirHerramientaDibujo: examen.incluirHerramientaDibujo,
      incluirCalculadoraCientifica: examen.incluirCalculadoraCientifica,
      incluirHojaExcel: examen.incluirHojaExcel,
      incluirJavascript: examen.incluirJavascript,
      incluirPython: examen.incluirPython,
      nombreProfesor: nombreProfesor,
      limiteTiempo: examen.limiteTiempo,
    };

    return examSinRespuestas;
  }
  async getExamById(id: number) {
    const repo = AppDataSource.getRepository(Exam);
    const exam = await repo.findOne({
      where: { id },
      relations: ["questions"],
    });

    if (!exam) {
      throwHttpError("Examen no encontrado", 404);
    }

    return exam;
  }

  async getExamForAttempt(codigo: string) {
    const examRepo = AppDataSource.getRepository(Exam);

    const exam = await examRepo.findOne({
      where: { codigoExamen: codigo },
      relations: [
        "questions",
        "questions.options",
        "questions.respuestas",
        "questions.keywords",
        "questions.pares",
        "questions.pares.itemA",
        "questions.pares.itemB",
      ],
    });

    if (!exam) return null;
    let nombreProfesor = "Profesor no disponible";
    try {
      const usersMsUrl = process.env.USERS_MS_URL;
      const response = await axios.get(
        `${usersMsUrl}/api/users/${exam.id_profesor}`,
      );
      const profesor = response.data;
      nombreProfesor = `${profesor.nombres} ${profesor.apellidos}`.trim();
    } catch (error) {
      console.error("Error al obtener profesor:", error);
    }

    // Limpiar preguntas según tipo
    const sanitizedQuestions = exam.questions.map((q: any) => {
      const baseQuestion: any = {
        id: q.id,
        enunciado: q.enunciado,
        puntaje: q.puntaje,
        type: q.type,
        calificacionParcial: q.calificacionParcial,
        nombreImagen: q.nombreImagen,
        shuffleOptions: q.shuffleOptions,
      };

      switch (q.type) {
        case "open":
          // ❌ eliminar keywords
          // No se envía nada de respuestas
          return {
            ...baseQuestion,
          };

        case "match": {
          return {
            ...baseQuestion,

            pares: q.pares.map((pair: any) => ({
              id: pair.id,

              // 🔴 ENVÍA TODO itemA
              itemA: {
                ...pair.itemA,
              },

              // 🔴 ENVÍA TODO itemB
              itemB: {
                ...pair.itemB,
              },
            })),
          };
        }

        case "fill_blanks":
          // ❌ eliminar textoCorrecto y respuestas correctas
          return {
            ...baseQuestion,
            // Si necesitas la estructura de huecos, puedes enviar solo posiciones
            blanks: q.respuestas?.map((r: any) => ({
              id: r.id,
              posicion: r.posicion,
            })),
          };

        case "test":
          return {
            ...baseQuestion,
            options: q.options?.map((opt: any) => ({
              id: opt.id,
              texto: opt.texto,
              // ❌ eliminar esCorrecta
            })),
          };

        default:
          return baseQuestion;
      }
    });

    // Construir respuesta final
    const publicExam = {
      id: exam.id,
      nombre: exam.nombre,
      descripcion: exam.descripcion,
      codigoExamen: exam.codigoExamen,
      fecha_creacion: exam.fecha_creacion,
      estado: exam.estado,
      horaApertura: exam.horaApertura,
      horaCierre: exam.horaCierre,
      limiteTiempo: exam.limiteTiempo,
      limiteTiempoCumplido: exam.limiteTiempoCumplido,
      consecuencia: exam.consecuencia,

      // flags
      necesitaNombreCompleto: exam.necesitaNombreCompleto,
      necesitaCorreoElectrónico: exam.necesitaCorreoElectrónico,
      necesitaCodigoEstudiantil: exam.necesitaCodigoEstudiantil,

      incluirHerramientaDibujo: exam.incluirHerramientaDibujo,
      incluirCalculadoraCientifica: exam.incluirCalculadoraCientifica,
      incluirHojaExcel: exam.incluirHojaExcel,
      incluirJavascript: exam.incluirJavascript,
      incluirPython: exam.incluirPython,

      questions: sanitizedQuestions,
      nombreProfesor: nombreProfesor,
    };

    return publicExam;
  }
}
