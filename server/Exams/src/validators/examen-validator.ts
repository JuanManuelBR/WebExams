import { AppDataSource } from "@src/data-source/AppDataSource";
import { Exam } from "@src/models/Exam";
import { throwHttpError } from "@src/utils/errors";
import axios from "axios";

const USERS_MS_URL = process.env.USERS_MS_URL;

export class examenValidator {
  static async verificarProfesor(id_profesor: number, cookies?: string) {
    try {
      const response = await axios.get(
        `${USERS_MS_URL}/api/users/${id_profesor}`,
        {
          headers: { Cookie: cookies || "" },
          timeout: 5000,
        }
      );

      const profesor = response.data;

      if (!profesor?.id) {
        throwHttpError(
          "No se encontró el profesor con el id proporcionado",
          404
        );
      }

      return profesor;
    } catch (error: any) {
      // Error del MS de usuarios
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throwHttpError(
            "No se encontró el profesor con el id proporcionado",
            404
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
}
