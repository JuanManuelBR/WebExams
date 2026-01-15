// src/scheduler/examScheduler.ts
import { ExamSchedulerService } from "@src/services/ExamsSchedulerService";

export const schedulerService = new ExamSchedulerService();

export const iniciarSchedulerExamenes = async () => {
  await schedulerService.inicializarScheduler();
};
