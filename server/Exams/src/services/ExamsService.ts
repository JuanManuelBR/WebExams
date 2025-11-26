import { add_exam_dto } from "@src/types/Exam";
import { AppDataSource } from "../data-source/AppDataSource";
import { Exam } from "../models/Exam";
import axios from "axios";

const USER_MS_URL = process.env.USER_MS_URL;

export class ExamService {
  private examRepo = AppDataSource.getRepository(Exam);

  async addExam(data: add_exam_dto, cookies?: string) {
  try {
    const requiredFields = [
      "nombre",
      "clave",
      "fecha_creacion",
      "estado",
      "id_profesor",
    ];

    for (const field of requiredFields) {
      if (
        data[field as keyof add_exam_dto] === undefined ||
        data[field as keyof add_exam_dto] === null
      ) {
        throw new Error(`Falta el campo obligatorio: ${field}`);
      }
    }

    const id_profesor = Number(data.id_profesor);
    const response = await axios.get(
      `${USER_MS_URL}/api/users/${id_profesor}`,
      {
        headers: { Cookie: cookies || "" },
      }
    );

    const profesor = response.data;
    if (!profesor || !profesor.id) {
      throw new Error("No se encontró el profesor con el id proporcionado");
    }

    const examen_existente = await this.examRepo.findOne({
      where: { nombre: data.nombre, id_profesor: id_profesor },
    });

    if (examen_existente) {
      throw new Error("No puedes tener 2 exámenes con el mismo nombre");
    }

    const nuevo_examen = this.examRepo.create({
      nombre: data.nombre,
      clave: data.clave,
      estado: data.estado,
      id_profesor: id_profesor,
      fecha_creacion: new Date(data.fecha_creacion),
      questions: data.questions || [],
    });

    const examen_guardado = await this.examRepo.save(nuevo_examen);

    return examen_guardado;
  } catch (error: any) {
    throw new Error("Ocurrió un error: " + error.message);
  }
}

  async listExams() {
    try {
      const examenes = await this.examRepo.find({
        select: [
          "id",
          "nombre",
          "clave",
          "fecha_creacion",
          "estado",
          "id_profesor",
        ],
      });
      return examenes;
    } catch (error: any) {
      throw new Error("Ocurrió un error inesperado: " + error.message);
    }
  }
}
