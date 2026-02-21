import { examsAttemptsApi } from "./api";

export const examsAttemptsService = {
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

  async getActiveAttemptsByExam(examId: number) {
    const response = await examsAttemptsApi.get(`/${examId}/active-attempts`);
    return response.data;
  },
  async unlockAttempt(attemptId: number) {
    const response = await examsAttemptsApi.post(
      `/attempt/${attemptId}/unlock`,
    );
    return response.data;
  },

  getAttemptEvents: async (attemptId: number) => {
    try {
      const response = await examsAttemptsApi.get(
        `/attempt/${attemptId}/events`,
      );
      return response.data;
    } catch (error: any) {
      console.error("Error obteniendo eventos:", error);
      throw error;
    }
  },

  markEventsAsRead: async (attemptId: number) => {
    try {
      await examsAttemptsApi.patch(`/attempt/${attemptId}/events/read`);
    } catch (error: any) {
      console.error("Error marcando eventos como leídos:", error);
      throw error;
    }
  },

  async deleteAttemptEvents(attemptId: number) {
    const response = await examsAttemptsApi.delete(`/attempt/${attemptId}/events`);
    return response.data;
  },

  async deleteAttempt(attemptId: number) {
    const response = await examsAttemptsApi.delete(`/attempt/${attemptId}`);
    return response.data;
  },

  async forceFinishExam(examId: number) {
    const response = await examsAttemptsApi.post(`/${examId}/force-finish`);
    return response.data;
  },

  async forceFinishAttempt(attemptId: number) {
    const response = await examsAttemptsApi.post(`/attempt/${attemptId}/force-finish`);
    return response.data;
  },

  async getAttemptCount(examId: number): Promise<number> {
    const response = await examsAttemptsApi.get(`/${examId}/attempt-count`);
    return response.data.count;
  },

  async downloadGrades(examId: number): Promise<Blob> {
    const response = await examsAttemptsApi.get(`/${examId}/grades/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
