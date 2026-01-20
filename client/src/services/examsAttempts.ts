import { examsAttemptsApi } from "./api";

export const examsAttemptService = {
  async startAttempt(data: {
    codigo_examen: string;
    nombre_estudiante?: string;
    correo_estudiante?: string;
    identificacion_estudiante?: string;
    contrasena?: string;
  }) {
    const response = await examsAttemptsApi.post("/attempt/start", data);
    return response.data;
  },
};
