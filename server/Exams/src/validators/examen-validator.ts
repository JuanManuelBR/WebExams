import { AppDataSource } from "../data-source/AppDataSource";
import { Exam } from "../models/Exam";
import { throwHttpError } from "../utils/errors";
import axios, { isAxiosError } from "axios";

const USERS_MS_URL = process.env.USERS_MS_URL;

export class examenValidator {
  static async verificarProfesor(id_profesor: number, cookies?: string) {
    try {
      const response = await axios.get<any>(
        `${USERS_MS_URL}/api/users/${id_profesor}`,
        {
          headers: { Cookie: cookies || "" },
          timeout: 5000,
        },
      );

      const profesor = response.data;

      if (!profesor?.id) {
        throwHttpError(
          "No se encontró el profesor con el id proporcionado",
          404,
        );
      }

      return profesor;
    } catch (error: any) {
      // Error del MS de usuarios
      if (isAxiosError(error)) {
        if (error.response?.status === 404) {
          throwHttpError(
            "No se encontró el profesor con el id proporcionado",
            404,
          );
        }

        if (error.response?.status === 401) {
          throwHttpError("No autorizado para verificar profesor", 401);
        }

        if (error.code === "ECONNABORTED") {
          throwHttpError("Timeout al verificar el profesor", 504);
        }

        throwHttpError("Error al comunicarse con el servicio de usuarios", 503);
      }

      // Error no esperado
      throwHttpError("Error interno al verificar profesor", 500);
    }
  }

  static async verificarExamenDuplicado(nombre: string, id_profesor: number) {
    const examRepo = AppDataSource.getRepository(Exam);

    const examen_existente = await examRepo.findOne({
      where: { nombre, id_profesor },
    });

    if (examen_existente) {
      throwHttpError("No puedes tener 2 exámenes con el mismo nombre", 409);
    }
  }

  /**
   * Verifica que el profesor sea dueño del examen que quiere actualizar
   */
  static async verificarPropietarioExamen(
    examId: number,
    profesorId: number,
    cookies?: string,
  ): Promise<Exam> {
    await this.verificarProfesor(profesorId, cookies);

    const examRepo = AppDataSource.getRepository(Exam);
    const exam = await examRepo.findOne({
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

    if (!exam) {
      throwHttpError("Examen no encontrado", 404);
    }

    if (exam.id_profesor !== profesorId) {
      throwHttpError("No tienes permiso para modificar este examen", 403);
    }

    return exam;
  }

  /**
   * Verifica que el nuevo nombre no esté duplicado (excepto el mismo examen)
   */
  static async verificarNombreDuplicadoUpdate(
    nuevoNombre: string,
    profesorId: number,
    examIdActual: number,
  ) {
    const examRepo = AppDataSource.getRepository(Exam);
    const examenDuplicado = await examRepo.findOne({
      where: { nombre: nuevoNombre, id_profesor: profesorId },
    });

    if (examenDuplicado && examenDuplicado.id !== examIdActual) {
      throwHttpError("Ya tienes un examen con ese nombre", 409);
    }
  }
}
