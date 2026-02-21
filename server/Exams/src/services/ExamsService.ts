// src/services/ExamsService.ts
import { AppDataSource } from "../data-source/AppDataSource";
import { Exam } from "../models/Exam";
import { CommonValidator } from "../validators/common";
import { generateExamCode } from "../utils/generetaExamCode";
import { add_exam_dto } from "../dtos/add-exam.dto";
import { Question } from "../models/Question";
import { examenValidator } from "../validators/examen-validator";
import { QuestionValidator } from "../validators/question-validator";
import { throwHttpError } from "../utils/errors";
import { schedulerService } from "../scheduler/examScheduler";
import axios from "axios";
import { ExamenState } from "../types/Exam";
import { UpdateExamDto } from "../dtos/update-exam.dto";
import { BaseQuestionDto } from "../dtos/base-question.dto";

export class ExamService {
  private examRepo = AppDataSource.getRepository(Exam);
  EXAM_ATTEMPTS_MS_URL = process.env.EXAM_ATTEMPTS_MS_URL!;
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
        necesitaContrasena: !!data.necesitaContrasena,
        descripcion: data.descripcion,
        incluirHerramientaDibujo: data.incluirHerramientaDibujo,
        incluirCalculadoraCientifica: data.incluirCalculadoraCientifica,
        incluirHojaExcel: data.incluirHojaExcel,
        incluirJavascript: data.incluirJavascript,
        incluirPython: data.incluirPython,
        incluirJava: data.incluirJava,
        horaApertura: data.horaApertura || null,
        horaCierre: data.horaCierre || null,
        limiteTiempo: data.limiteTiempo,
        limiteTiempoCumplido: data.limiteTiempo
          ? data.limiteTiempoCumplido
          : null,
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

        // Actualizar flag tienePreguntasAbiertas
        const tienePreguntasAbiertas = preguntas_guardadas.some(
          (q: any) => q.type === "open",
        );
        examen_guardado.tienePreguntasAbiertas = tienePreguntasAbiertas;
        await manager.save(Exam, examen_guardado);
      } else {
        // Si no hay preguntas, el flag debe estar en false
        examen_guardado.tienePreguntasAbiertas = false;
        await manager.save(Exam, examen_guardado);
      }

      if (cambioEstadoAutomatico) {
        schedulerService.programarCambioEstado(examen_guardado);
      }

      return examen_guardado;
    });
  }

  async updateExam(
    examId: number,
    rawData: any,
    profesorId: number,
    cookies?: string,
  ) {
    const validator = new CommonValidator();
    const data = await validator.validateDto(UpdateExamDto, rawData);

    // Validar fechas si se envían
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

    // Verificar que el profesor es dueño del examen
    const existingExam = await examenValidator.verificarPropietarioExamen(
      examId,
      profesorId,
      cookies,
    );

    // Verificar que el examen no tenga intentos
    try {
      const attemptsRes = await axios.get<{ count: number }>(
        `${this.EXAM_ATTEMPTS_MS_URL}/api/exam/${examId}/attempt-count`,
      );
      if (attemptsRes.data.count > 0) {
        throwHttpError(
          `No se puede editar este examen porque tiene ${attemptsRes.data.count} intento(s) registrado(s). Crea una copia del examen si deseas hacer cambios.`,
          400,
        );
      }
    } catch (err: any) {
      if (err.status) throw err;
      console.error("Error al verificar intentos del examen:", err.message);
    }

    // Si se cambia el nombre, verificar que no esté duplicado
    if (data.nombre && data.nombre !== existingExam.nombre) {
      await examenValidator.verificarNombreDuplicadoUpdate(
        data.nombre,
        profesorId,
        examId,
      );
    }

    return await AppDataSource.transaction(async (manager) => {
      const { imageService } = await import("./ImageService");
      const { pdfService } = await import("./PDFService");

      // 1. MANEJAR PDF
      let pdfAnterior = existingExam.archivoPDF;

      if (data.archivoPDF !== undefined) {
        // Si envían un nuevo PDF o null
        if (pdfAnterior && pdfAnterior !== data.archivoPDF) {
          // Eliminar PDF anterior
          await pdfService.deletePDF(pdfAnterior);
        }
        existingExam.archivoPDF = data.archivoPDF || null;
      }

      // 2. MANEJAR PREGUNTAS
      const imagenesAEliminar: string[] = [];

      if (data.questions !== undefined) {
        // ✅ Las preguntas vienen del DTO validado, tienen nombreImagen
        // pero necesitamos acceder a 'id' que solo existe en runtime
        const questionsFromRequest = data.questions as (BaseQuestionDto & {
          id?: number;
        })[];

        // Obtener IDs de preguntas en el request (las que tienen id son existentes)
        const preguntasNuevasIds = questionsFromRequest
          .filter((q) => q.id !== undefined)
          .map((q) => q.id!);

        // Identificar preguntas que se eliminaron
        const preguntasEliminadas = existingExam.questions.filter(
          (q: any) => !preguntasNuevasIds.includes(q.id),
        );

        // Guardar imágenes de preguntas eliminadas para borrarlas
        for (const pregunta of preguntasEliminadas) {
          if ((pregunta as any).nombreImagen) {
            imagenesAEliminar.push((pregunta as any).nombreImagen);
          }
        }

        // Eliminar preguntas viejas completamente
        if (preguntasEliminadas.length > 0) {
          for (const preguntaVieja of preguntasEliminadas) {
            await manager.remove(preguntaVieja);
          }
        }

        // Procesar preguntas actualizadas y nuevas
        const preguntasProcesadas = QuestionValidator.crearPreguntasDesdeDto(
          data.questions,
          existingExam,
        );

        // Identificar cambios en imágenes de preguntas existentes
        for (let i = 0; i < questionsFromRequest.length; i++) {
          const preguntaDto = questionsFromRequest[i];
          const preguntaProcesada = preguntasProcesadas[i];

          if (preguntaDto.id !== undefined) {
            // Es una pregunta existente
            const preguntaExistente = existingExam.questions.find(
              (q: any) => q.id === preguntaDto.id,
            );

            if (preguntaExistente) {
              const imagenAnterior = (preguntaExistente as any).nombreImagen;
              const imagenNueva = preguntaDto.nombreImagen; // ✅ Ahora existe en BaseQuestionDto

              // Si la imagen cambió, marcar la anterior para eliminar
              if (
                imagenAnterior &&
                imagenAnterior !== imagenNueva &&
                !imagenesAEliminar.includes(imagenAnterior)
              ) {
                imagenesAEliminar.push(imagenAnterior);
              }

              // Mantener el ID de la pregunta existente
              (preguntaProcesada as any).id = preguntaDto.id;
            }
          }
        }

        // Guardar preguntas (actualiza existentes, crea nuevas)
        const preguntasGuardadas = await manager.save(
          Question,
          preguntasProcesadas,
        );

        existingExam.questions = preguntasGuardadas.map((q: any) => {
          delete q.exam;
          if (q.type === "matching" && q.pares) {
            q.pares.forEach((p: any) => {
              delete p.question;
            });
          }
          return q;
        });

        // Actualizar flag tienePreguntasAbiertas basado en las preguntas guardadas
        const tienePreguntasAbiertas = preguntasGuardadas.some(
          (q: any) => q.type === "open",
        );
        existingExam.tienePreguntasAbiertas = tienePreguntasAbiertas;
      }

      // 3. ACTUALIZAR CAMPOS DEL EXAMEN
      if (data.nombre !== undefined) existingExam.nombre = data.nombre;
      if (data.descripcion !== undefined)
        existingExam.descripcion = data.descripcion;
      if (data.contrasena !== undefined)
        existingExam.contrasena = data.contrasena;
      if (data.estado !== undefined) existingExam.estado = data.estado;
      if (data.necesitaNombreCompleto !== undefined)
        existingExam.necesitaNombreCompleto = data.necesitaNombreCompleto;
      if (data.necesitaCorreoElectrónico !== undefined)
        existingExam.necesitaCorreoElectrónico = data.necesitaCorreoElectrónico;
      if (data.necesitaCodigoEstudiantil !== undefined)
        existingExam.necesitaCodigoEstudiantil = data.necesitaCodigoEstudiantil;
      if (data.necesitaContrasena !== undefined)
        existingExam.necesitaContrasena = data.necesitaContrasena;
      if (data.incluirHerramientaDibujo !== undefined)
        existingExam.incluirHerramientaDibujo = data.incluirHerramientaDibujo;
      if (data.incluirCalculadoraCientifica !== undefined)
        existingExam.incluirCalculadoraCientifica =
          data.incluirCalculadoraCientifica;
      if (data.incluirHojaExcel !== undefined)
        existingExam.incluirHojaExcel = data.incluirHojaExcel;
      if (data.incluirJavascript !== undefined)
        existingExam.incluirJavascript = data.incluirJavascript;
      if (data.incluirPython !== undefined)
        existingExam.incluirPython = data.incluirPython;
      if (data.incluirJava !== undefined)
        existingExam.incluirJava = data.incluirJava;
      if (data.horaApertura !== undefined)
        existingExam.horaApertura = data.horaApertura;
      if (data.horaCierre !== undefined)
        existingExam.horaCierre = data.horaCierre;
      if (data.limiteTiempo !== undefined)
        existingExam.limiteTiempo = data.limiteTiempo;
      if (data.limiteTiempoCumplido !== undefined)
        existingExam.limiteTiempoCumplido = data.limiteTiempo
          ? data.limiteTiempoCumplido
          : null;
      if (data.consecuencia !== undefined)
        existingExam.consecuencia = data.consecuencia;

      // Actualizar cambio de estado automático
      const cambioEstadoAutomatico = !!(
        existingExam.horaApertura && existingExam.horaCierre
      );
      existingExam.cambioEstadoAutomatico = cambioEstadoAutomatico;

      // Guardar examen actualizado
      const examActualizado = await manager.save(Exam, existingExam);

      // 4. ELIMINAR IMÁGENES ANTIGUAS
      for (const imagenAEliminar of imagenesAEliminar) {
        try {
          await imageService.deleteImage(imagenAEliminar);
        } catch (error) {
          console.error(`Error al eliminar imagen ${imagenAEliminar}:`, error);
        }
      }

      // 5. ACTUALIZAR SCHEDULER
      if (cambioEstadoAutomatico) {
        schedulerService.programarCambioEstado(examActualizado);
      } else if (existingExam.cambioEstadoAutomatico) {
        // Si antes tenía cambio automático y ahora no
        schedulerService.cancelarCambioEstado(examId);
      }

      return examActualizado;
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
      const response = await axios.get<any>(
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
      incluirJava: examen.incluirJava,
      nombreProfesor: nombreProfesor,
      limiteTiempo: examen.limiteTiempo,
    };

    return examSinRespuestas;
  }
  async getExamById(id: number) {
    const repo = AppDataSource.getRepository(Exam);
    const exam = await repo.findOne({
      where: { id },
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
      const response = await axios.get<any>(
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
            textoCorrecto: q.textoCorrecto,
            // Si necesitas la estructura de huecos, puedes enviar solo posiciones
            blanks: q.respuestas?.map((r: any) => ({
              id: r.id,
              posicion: r.posicion,
            })),
          };

        case "test":
          // Contar cuántas opciones son correctas
          const cantidadRespuestasCorrectas =
            q.options?.filter((opt: any) => opt.esCorrecta).length || 0;

          return {
            ...baseQuestion,
            cantidadRespuestasCorrectas,
            options: q.options?.map((opt: any) => ({
              id: opt.id,
              texto: opt.texto,
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
      archivoPDF: exam.archivoPDF || null,
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
      incluirJava: exam.incluirJava,

      questions: sanitizedQuestions,
      nombreProfesor: nombreProfesor,
    };

    return publicExam;
  }

  async validatePassword(
    codigoExamen: string,
    contrasena?: string,
  ): Promise<boolean> {
    const examen = await this.examRepo.findOne({
      where: { codigoExamen },
    });

    if (!examen) {
      throwHttpError("Examen no encontrado", 404);
    }

    if (!examen.necesitaContrasena) {
      return true;
    }

    if (!contrasena) {
      throwHttpError("Se requiere contraseña", 400);
    }

    if (examen.contrasena !== contrasena) {
      throwHttpError("Contraseña incorrecta", 400);
    }

    return true;
  }

  async updateExamStatus(
    examId: number,
    newStatus: ExamenState,
    profesorId: number,
    cookies?: string,
  ): Promise<Exam> {
    await examenValidator.verificarProfesor(profesorId, cookies);

    const exam = await this.examRepo.findOne({ where: { id: examId } });

    if (!exam) {
      throwHttpError("Examen no encontrado", 404);
    }

    if (exam.id_profesor !== profesorId) {
      throwHttpError("No autorizado para modificar este examen", 403);
    }

    exam.estado = newStatus;
    exam.cambioEstadoAutomatico = false;

    if (exam.cambioEstadoAutomatico) {
      schedulerService.cancelarCambioEstado(examId);
    }

    return await this.examRepo.save(exam);
  }

  async archiveExam(
    examId: number,
    profesorId: number,
    cookies?: string,
  ): Promise<Exam> {
    await examenValidator.verificarProfesor(profesorId, cookies);

    const exam = await this.examRepo.findOne({ where: { id: examId } });
    if (!exam) {
      throwHttpError("Examen no encontrado", 404);
    }

    // Verificar que el profesor es dueño del examen
    if (exam.id_profesor !== profesorId) {
      throwHttpError("No tienes permiso para archivar este examen", 403);
    }

    // Verificar que el examen no esté ya archivado
    if (exam.estado === ExamenState.ARCHIVED) {
      throwHttpError("El examen ya está archivado", 400);
    }

    console.log(`📦 Archivando examen ID: ${examId}`);
    exam.estado = ExamenState.ARCHIVED;
    const archivedExam = await this.examRepo.save(exam);
    console.log(`✅ Examen ${examId} archivado exitosamente`);

    return archivedExam;
  }

  async regenerateExamCode(
    examId: number,
    profesorId: number,
    cookies?: string,
  ): Promise<{ codigoExamen: string }> {
    const exam = await examenValidator.verificarPropietarioExamen(
      examId,
      profesorId,
      cookies,
    );

    let nuevoCodigoExamen: string = "";
    let codigoExiste = true;
    let intentos = 0;
    const MAX_INTENTOS = 10;

    while (codigoExiste && intentos < MAX_INTENTOS) {
      nuevoCodigoExamen = generateExamCode();
      const examenConCodigo = await this.examRepo.findOne({
        where: { codigoExamen: nuevoCodigoExamen },
      });
      codigoExiste = !!examenConCodigo;
      intentos++;
    }

    if (codigoExiste) {
      throwHttpError("No se pudo generar un código único para el examen", 500);
    }

    exam.codigoExamen = nuevoCodigoExamen;
    await this.examRepo.save(exam);

    return { codigoExamen: nuevoCodigoExamen };
  }

  async deleteExamById(
    examId: number,
    profesorId: number,
    cookies?: string,
  ): Promise<void> {
    await examenValidator.verificarProfesor(profesorId, cookies);

    return await AppDataSource.transaction(async (manager) => {
      const exam = await manager.findOne(Exam, {
        where: { id: examId },
        relations: [
          "questions",
          "questions.pares",
          "questions.pares.itemA",
          "questions.pares.itemB",
        ],
      });

      if (!exam) {
        throwHttpError("Examen no encontrado", 404);
      }

      if (exam.id_profesor !== profesorId) {
        throwHttpError("No autorizado para eliminar este examen", 403);
      }

      const { imageService } = await import("./ImageService");
      const { pdfService } = await import("./PDFService");
      const { MatchItemA } = await import("../models/MatchItemA");
      const { MatchItemB } = await import("../models/MatchItemB");

      if (exam.archivoPDF) {
        await pdfService.deletePDF(exam.archivoPDF);
      }

      if (exam.questions) {
        for (const question of exam.questions) {
          if ((question as any).nombreImagen) {
            await imageService.deleteImage((question as any).nombreImagen);
          }

          if ((question as any).pares) {
            for (const par of (question as any).pares) {
              if (par.itemA) {
                await manager.remove(MatchItemA, par.itemA);
              }
              if (par.itemB) {
                await manager.remove(MatchItemB, par.itemB);
              }
            }
          }
        }
      }

      if (exam.cambioEstadoAutomatico) {
        schedulerService.cancelarCambioEstado(examId);
      }

      await manager.remove(Exam, exam);
    });
  }

  async copyExam(
    examId: number,
    profesorId: number,
    cookies?: string,
  ): Promise<Exam> {
    // Verificar que el profesor es dueño del examen
    await examenValidator.verificarPropietarioExamen(
      examId,
      profesorId,
      cookies,
    );

    // Cargar examen completo con todas las relaciones
    const repo = AppDataSource.getRepository(Exam);
    const original = await repo.findOne({
      where: { id: examId },
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

    if (!original) {
      throwHttpError("Examen no encontrado", 404);
    }

    const nuevoNombre = `Copia de ${original.nombre}`;

    return await AppDataSource.transaction(async (manager) => {
      const { imageService } = await import("./ImageService");
      const { pdfService } = await import("./PDFService");

      // Generar código único
      let codigoExamen: string = "";
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

      // Duplicar PDF si existe
      let nuevoPDF: string | null = null;
      if (original.archivoPDF) {
        nuevoPDF = await pdfService.duplicatePDF(original.archivoPDF);
      }

      // Crear examen copia
      const nuevoExamen = manager.create(Exam, {
        nombre: nuevoNombre,
        descripcion: original.descripcion,
        contrasena: original.contrasena,
        estado: ExamenState.CLOSED,
        id_profesor: profesorId,
        fecha_creacion: new Date(),
        necesitaNombreCompleto: original.necesitaNombreCompleto,
        necesitaCorreoElectrónico: original.necesitaCorreoElectrónico,
        necesitaCodigoEstudiantil: original.necesitaCodigoEstudiantil,
        necesitaContrasena: original.necesitaContrasena,
        incluirHerramientaDibujo: original.incluirHerramientaDibujo,
        incluirCalculadoraCientifica: original.incluirCalculadoraCientifica,
        incluirHojaExcel: original.incluirHojaExcel,
        incluirJavascript: original.incluirJavascript,
        incluirPython: original.incluirPython,
        incluirJava: original.incluirJava,
        horaApertura: null,
        horaCierre: null,
        limiteTiempo: original.limiteTiempo,
        limiteTiempoCumplido: original.limiteTiempoCumplido,
        consecuencia: original.consecuencia,
        codigoExamen,
        archivoPDF: nuevoPDF,
        cambioEstadoAutomatico: false,
        tienePreguntasAbiertas: original.tienePreguntasAbiertas,
      });

      const examenGuardado = await manager.save(Exam, nuevoExamen);

      // Copiar preguntas
      if (original.questions?.length) {
        // Convertir entidades a DTOs para crearPreguntasDesdeDto
        const questionDtos = await Promise.all(
          original.questions.map(async (q: any) => {
            // Duplicar imagen si existe
            let nuevaImagen: string | null = null;
            if (q.nombreImagen) {
              nuevaImagen = await imageService.duplicateImage(q.nombreImagen);
            }

            // Mapear tipo de entidad a tipo de DTO ("match" en DB -> "matching" en DTO)
            const tipoDto = q.type === "match" ? "matching" : q.type;

            const baseDto: any = {
              enunciado: q.enunciado,
              puntaje: q.puntaje,
              type: tipoDto,
              calificacionParcial: q.calificacionParcial,
              nombreImagen: nuevaImagen,
            };

            switch (q.type) {
              case "test":
                baseDto.shuffleOptions = q.shuffleOptions ?? false;
                baseDto.options =
                  q.options?.map((opt: any) => ({
                    texto: opt.texto,
                    esCorrecta: opt.esCorrecta,
                  })) || [];
                break;

              case "open":
                baseDto.textoRespuesta = q.textoRespuesta ?? null;
                if (q.keywords?.length) {
                  baseDto.palabrasClave = q.keywords.map((kw: any) => ({
                    texto: kw.texto,
                  }));
                }
                break;

              case "fill_blanks":
                baseDto.textoCorrecto = q.textoCorrecto;
                baseDto.respuestas =
                  q.respuestas?.map((r: any) => ({
                    posicion: r.posicion,
                    textoCorrecto: r.textoCorrecto,
                  })) || [];
                break;

              case "match":
                baseDto.pares =
                  q.pares?.map((p: any) => ({
                    itemA: p.itemA?.text,
                    itemB: p.itemB?.text,
                  })) || [];
                break;
            }

            return baseDto;
          }),
        );

        const preguntasNuevas = QuestionValidator.crearPreguntasDesdeDto(
          questionDtos,
          examenGuardado,
        );

        const preguntasGuardadas = await manager.save(
          Question,
          preguntasNuevas,
        );

        examenGuardado.questions = preguntasGuardadas.map((q: any) => {
          delete q.exam;
          if (q.type === "matching" && q.pares) {
            q.pares.forEach((p: any) => {
              delete p.question;
            });
          }
          return q;
        });
      }

      return examenGuardado;
    });
  }
}
