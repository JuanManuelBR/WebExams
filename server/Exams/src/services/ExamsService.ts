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
    return await this.examRepo.find({
      where: { id_profesor: userId },
      relations: ["questions"],
    });
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
    return examen;
  }
}
