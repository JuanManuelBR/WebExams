// src/services/ExamSchedulerService.ts
import { AppDataSource } from "../data-source/AppDataSource";
import { Exam } from "../models/Exam";
import { ExamenState } from "../types/Exam";
import { internalHttpClient } from "../utils/httpClient";

export class ExamSchedulerService {
  private examRepo = AppDataSource.getRepository(Exam);
  private timers: Map<number, NodeJS.Timeout[]> = new Map();

  programarCambioEstado(examen: Exam): void {
    if (!examen.cambioEstadoAutomatico || (!examen.horaApertura && !examen.horaCierre)) {
      return;
    }

    this.cancelarCambioEstado(examen.id);

    const ahora = new Date();
    const timers: NodeJS.Timeout[] = [];

    if (examen.horaApertura) {
      const horaApertura = new Date(examen.horaApertura);
      if (ahora < horaApertura) {
        const delay = horaApertura.getTime() - ahora.getTime();
        const timer = setTimeout(() => this.abrirExamen(examen.id), delay);
        timers.push(timer);
        console.log(
          `Examen ${examen.id} programado para abrir en ${Math.round(delay / 1000)}s`,
        );
      }
    }

    if (examen.horaCierre) {
      const horaCierre = new Date(examen.horaCierre);
      if (ahora < horaCierre) {
        const delay = horaCierre.getTime() - ahora.getTime();
        const timer = setTimeout(() => this.cerrarExamen(examen.id), delay);
        timers.push(timer);
        console.log(
          `Examen ${examen.id} programado para cerrar en ${Math.round(delay / 1000)}s`,
        );
      }
    }

    if (timers.length > 0) {
      this.timers.set(examen.id, timers);
    }
  }

  private async abrirExamen(examenId: number): Promise<void> {
    try {
      const examen = await this.examRepo.findOne({ where: { id: examenId } });
      if (examen && examen.estado === ExamenState.CLOSED) {
        examen.estado = ExamenState.OPEN;
        await this.examRepo.save(examen);
        console.log(`Examen ${examenId} abierto automáticamente`);
      }
    } catch (error) {
      console.error(`Error al abrir examen ${examenId}:`, error);
    }
  }

  private async cerrarExamen(examenId: number): Promise<void> {
    try {
      const examen = await this.examRepo.findOne({ where: { id: examenId } });
      // Re-check that the scheduled close wasn't cancelled via removeTimeLimit
      // (race condition: scheduler fires at same moment teacher cancels the timer)
      if (examen && examen.estado === ExamenState.OPEN && examen.cambioEstadoAutomatico && examen.horaCierre) {
        examen.estado = ExamenState.CLOSED;
        await this.examRepo.save(examen);
        console.log(`Examen ${examenId} cerrado automáticamente`);
        this.timers.delete(examenId);

        const attemptsUrl = process.env.EXAM_ATTEMPTS_MS_URL;
        if (attemptsUrl) {
          internalHttpClient
            .post(`${attemptsUrl}/api/exam/${examenId}/close-finish`)
            .catch((err) =>
              console.error(`Error al finalizar intentos al cerrar examen ${examenId}:`, err.message),
            );
        }
      }
    } catch (error) {
      console.error(`Error al cerrar examen ${examenId}:`, error);
    }
  }

  cancelarCambioEstado(examenId: number): void {
    const timers = this.timers.get(examenId);
    if (timers) {
      timers.forEach((timer) => clearTimeout(timer));
      this.timers.delete(examenId);
      console.log(`✅ Timers cancelados para examen ${examenId}`);
    }
  }

  async inicializarScheduler(): Promise<void> {
    try {
      const examenes = await this.examRepo.find({
        where: {
          cambioEstadoAutomatico: true,
        },
      });

      for (const examen of examenes) {
        this.programarCambioEstado(examen);
      }

      console.log(
        `Scheduler inicializado: ${examenes.length} exámenes programados`,
      );
    } catch (error) {
      console.error("Error al inicializar scheduler:", error);
    }
  }
}
