import { Server, Socket } from "socket.io";
import { AppDataSource } from "../data-source/AppDataSource";
import { AttemptState, ExamInProgress } from "../models/ExamInProgress";
import { ExamAttempt } from "../models/ExamAttempt";
import { ExamService } from "../services/ExamService";

const DISCONNECT_GRACE_MS = 60000; // 60 segundos de gracia para reconexión

export class SocketHandler {
  private io: Server;
  private timers: Map<number, NodeJS.Timeout> = new Map();
  private connections: Map<string, { type: string; id: string | number }> =
    new Map();
  // Mapa attemptId -> timeout para gracia de desconexión
  private disconnectGraceTimers: Map<number, NodeJS.Timeout> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`✅ Cliente conectado: ${socket.id}`);

      socket.on(
        "join_attempt",
        (data: { attemptId: number; sessionId: string }) => {
          this.handleJoinAttempt(socket, data);
        },
      );

      socket.on("join_exam_monitoring", (examId: number) => {
        socket.join(`exam_${examId}`);
        this.connections.set(socket.id, { type: "teacher", id: examId });
        console.log(`👨‍🏫 Profesor ${socket.id} monitoreando exam_${examId}`);
      });

      socket.on("leave_exam_monitoring", (examId: number) => {
        socket.leave(`exam_${examId}`);
        this.connections.delete(socket.id);
        console.log(
          `👋 Profesor ${socket.id} dejó de monitorear exam_${examId}`,
        );
      });

      socket.on("join_professor_dashboard", (profesorId: number) => {
        socket.join(`professor_${profesorId}`);
        this.connections.set(socket.id, {
          type: "professor_dashboard",
          id: profesorId,
        });
        console.log(
          `🔔 Profesor ${socket.id} unido a dashboard professor_${profesorId}`,
        );
      });

      socket.on("leave_attempt", (attemptId: number) => {
        socket.leave(`attempt_${attemptId}`);
        this.stopTimer(attemptId);
        this.connections.delete(socket.id);
        console.log(`❌ Cliente ${socket.id} abandonó attempt_${attemptId}`);
      });

      socket.on("disconnect", async () => {
        const connection = this.connections.get(socket.id);

        if (connection) {
          if (connection.type === "student") {
            const attemptId = connection.id as number;
            console.log(
              `🔌 Estudiante desconectado: ${socket.id} (attempt_${attemptId}). Esperando ${DISCONNECT_GRACE_MS / 1000}s para reconexión...`,
            );

            // Cancelar timer de gracia anterior si existe (doble desconexión)
            const existingGrace = this.disconnectGraceTimers.get(attemptId);
            if (existingGrace) {
              clearTimeout(existingGrace);
            }

            // Notificar al estudiante (si sigue conectado brevemente) y al profesor
            const graceSeconds = DISCONNECT_GRACE_MS / 1000;
            this.io.to(`attempt_${attemptId}`).emit("connection_lost", {
              message:
                "Tu conexión se ha perdido. Tienes 60 segundos para reconectarte.",
              graceSeconds,
            });

            // Notificar al profesor que el estudiante perdió conexión
            try {
              const attemptRepo = AppDataSource.getRepository(ExamAttempt);
              const attempt = await attemptRepo.findOne({
                where: { id: attemptId },
              });
              if (attempt) {
                this.io
                  .to(`exam_${attempt.examen_id}`)
                  .emit("student_connection_lost", {
                    attemptId,
                    estudiante: { nombre: attempt.nombre_estudiante },
                    graceSeconds,
                  });
              }
            } catch (e) {
              console.error("Error notificando desconexión al profesor:", e);
            }

            // Iniciar periodo de gracia antes de marcar como abandonado
            const graceTimer = setTimeout(async () => {
              this.disconnectGraceTimers.delete(attemptId);

              // Verificar si el estudiante se reconectó (otro socket en la misma room)
              const room = this.io.sockets.adapter.rooms.get(
                `attempt_${attemptId}`,
              );
              if (room && room.size > 0) {
                console.log(
                  `✅ Estudiante se reconectó a attempt_${attemptId}, no se marca como abandonado`,
                );
                return;
              }

              console.log(
                `⏰ Periodo de gracia expirado para attempt_${attemptId}. Marcando como abandonado.`,
              );
              // Notificar al estudiante antes de marcar (por si reconectó justo al final)
              this.io
                .to(`attempt_${attemptId}`)
                .emit("attempt_auto_abandoned", {
                  message:
                    "Tu conexión estuvo inactiva demasiado tiempo. El examen fue marcado como abandonado.",
                });
              try {
                await this.handleStudentDisconnect(attemptId);
              } catch (error) {
                console.error(
                  "❌ Error al marcar intento como abandonado:",
                  error,
                );
              }
            }, DISCONNECT_GRACE_MS);

            this.disconnectGraceTimers.set(attemptId, graceTimer);
          } else {
            console.log(`🔌 Profesor desconectado: ${socket.id}`);
          }

          this.connections.delete(socket.id);
        } else {
          console.log(`🔌 Cliente desconectado: ${socket.id}`);
        }
      });
    });

    // Mostrar conexiones activas cada 30 segundos
    setInterval(() => {
      const sockets = this.io.sockets.sockets;
      console.log(`\n📊 Conexiones activas: ${sockets.size}`);
      this.connections.forEach((conn, socketId) => {
        console.log(`  - ${socketId}: ${conn.type} (${conn.id})`);
      });
      console.log("");
    }, 30000);
  }

  private async handleJoinAttempt(
    socket: Socket,
    data: { attemptId: number; sessionId: string },
  ) {
    const { attemptId, sessionId } = data;

    const repo = AppDataSource.getRepository(ExamInProgress);
    const examInProgress = await repo.findOne({
      where: { intento_id: attemptId },
    });

    if (!examInProgress) {
      socket.emit("error", { message: "Intento no encontrado" });
      return;
    }

    if (examInProgress.id_sesion !== sessionId) {
      socket.emit("session_conflict", {
        message: "Ya existe otra sesión activa",
      });
      return;
    }

    // Si el timer de gracia ya expiró → intento ABANDONADO, notificar y salir
    const attemptCheckRepo = AppDataSource.getRepository(ExamAttempt);
    const attemptCheck = await attemptCheckRepo.findOne({
      where: { id: attemptId },
    });
    if (attemptCheck && attemptCheck.estado === AttemptState.ABANDONADO) {
      console.log(
        `⚠️ Estudiante reconectó en attempt_${attemptId} pero ya estaba ABANDONADO`,
      );
      socket.emit("attempt_auto_abandoned", {
        message:
          "Tu conexión estuvo inactiva demasiado tiempo. El examen fue marcado como abandonado.",
      });
      return;
    }

    // Cancelar timer de gracia si el estudiante se está reconectando
    const graceTimer = this.disconnectGraceTimers.get(attemptId);
    if (graceTimer) {
      clearTimeout(graceTimer);
      this.disconnectGraceTimers.delete(attemptId);
      console.log(
        `✅ Reconexión detectada para attempt_${attemptId}, timer de gracia cancelado`,
      );
      // Notificar al estudiante que su conexión fue restaurada
      socket.emit("connection_restored", {
        message: "¡Conexión restaurada! Puedes continuar.",
      });
      // Notificar al profesor
      if (attemptCheck) {
        this.io
          .to(`exam_${attemptCheck.examen_id}`)
          .emit("student_reconnected", {
            attemptId,
            estudiante: { nombre: attemptCheck.nombre_estudiante },
          });
      }
    }

    socket.join(`attempt_${attemptId}`);
    this.connections.set(socket.id, { type: "student", id: attemptId });
    console.log(`👨‍🎓 Estudiante ${socket.id} unido a attempt_${attemptId}`);

    if (examInProgress.fecha_expiracion) {
      this.startTimer(attemptId, examInProgress.fecha_expiracion);
    }

    socket.emit("joined_attempt", {
      attemptId,
      estado: examInProgress.estado,
      fecha_expiracion: examInProgress.fecha_expiracion,
    });
  }

  private startTimer(attemptId: number, fecha_expiracion: Date) {
    if (this.timers.has(attemptId)) {
      return;
    }

    const now = new Date().getTime();
    const expiration = new Date(fecha_expiracion).getTime();
    const remainingTime = expiration - now;

    if (remainingTime <= 0) {
      this.handleTimerExpired(attemptId);
      return;
    }

    const interval = setInterval(() => {
      const currentTime = new Date().getTime();
      const timeLeft = expiration - currentTime;

      if (timeLeft <= 0) {
        this.handleTimerExpired(attemptId);
        this.stopTimer(attemptId);
      } else {
        this.io.to(`attempt_${attemptId}`).emit("timer_tick", {
          remainingTimeMs: timeLeft,
          remainingTimeSeconds: Math.floor(timeLeft / 1000),
        });
      }
    }, 1000);

    this.timers.set(attemptId, interval);
  }

  /**
   * Cuando el timer expira, finalizar el intento server-side
   * (calificar, cambiar estado) y notificar al estudiante y profesor
   */
  private async handleTimerExpired(attemptId: number) {
    try {
      const attemptRepo = AppDataSource.getRepository(ExamAttempt);
      const progressRepo = AppDataSource.getRepository(ExamInProgress);

      const examInProgress = await progressRepo.findOne({
        where: { intento_id: attemptId },
      });

      // Si fecha_expiracion fue eliminada (removeTimeLimit), abortar
      if (!examInProgress || !examInProgress.fecha_expiracion) {
        console.log(
          `ℹ️ Tiempo límite eliminado para intento ${attemptId}, ignorando expiración`,
        );
        this.stopTimer(attemptId);
        return;
      }

      const attempt = await attemptRepo.findOne({
        where: { id: attemptId },
        relations: ["respuestas"],
      });

      if (!attempt) {
        console.log(`⚠️ Intento ${attemptId} no encontrado al expirar timer`);
        return;
      }

      // Solo procesar si el intento sigue activo
      if (attempt.estado !== AttemptState.ACTIVE) {
        console.log(
          `ℹ️ Intento ${attemptId} ya no está activo (${attempt.estado}), ignorando expiración`,
        );
        return;
      }

      console.log(
        `⏰ Tiempo expirado para intento ${attemptId}. Finalizando...`,
      );

      // Usar ExamService.handleTimeExpired para calificar y finalizar
      await ExamService.handleTimeExpired(attempt, examInProgress, this.io);

      // Notificar al profesor
      this.io.to(`exam_${attempt.examen_id}`).emit("student_finished_exam", {
        attemptId: attemptId,
        estudiante: {
          nombre: attempt.nombre_estudiante,
          correo: attempt.correo_estudiante,
        },
        puntaje: attempt.puntaje,
      });

      console.log(
        `✅ Intento ${attemptId} finalizado por expiración de tiempo`,
      );
    } catch (error) {
      console.error(
        `❌ Error al finalizar intento ${attemptId} por timer:`,
        error,
      );
      // Fallback: al menos emitir el evento al cliente
      this.io.to(`attempt_${attemptId}`).emit("time_expired", {
        message: "El tiempo ha expirado",
      });
    }
  }

  stopTimer(attemptId: number) {
    const timer = this.timers.get(attemptId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(attemptId);
      console.log(`⏱️ Timer detenido para attempt_${attemptId}`);
    }
  }

  private async handleStudentDisconnect(attemptId: number) {
    const attemptRepo = AppDataSource.getRepository(ExamAttempt);
    const progressRepo = AppDataSource.getRepository(ExamInProgress);

    const attempt = await attemptRepo.findOne({
      where: { id: attemptId },
    });

    if (!attempt) {
      console.log(`⚠️ Intento ${attemptId} no encontrado`);
      return;
    }

    const examInProgress = await progressRepo.findOne({
      where: { intento_id: attemptId },
    });

    if (!examInProgress) {
      console.log(`⚠️ ExamInProgress no encontrado para intento ${attemptId}`);
      return;
    }

    // Solo marcar como abandonado si estaba activo
    if (attempt.estado === AttemptState.ACTIVE) {
      attempt.estado = AttemptState.ABANDONADO;
      examInProgress.estado = AttemptState.ABANDONADO;
      attempt.fecha_fin = new Date();
      examInProgress.fecha_fin = new Date();

      await attemptRepo.save(attempt);
      await progressRepo.save(examInProgress);

      console.log(`🚪 Intento ${attemptId} marcado como ABANDONADO`);

      // Notificar al profesor
      this.io.to(`exam_${attempt.examen_id}`).emit("student_abandoned_exam", {
        attemptId: attemptId,
        estudiante: {
          nombre: attempt.nombre_estudiante,
          correo: attempt.correo_estudiante,
          identificacion: attempt.identificacion_estudiante,
        },
        fecha_abandono: new Date(),
      });

      // Detener timer si existe
      this.stopTimer(attemptId);
    } else {
      console.log(
        `ℹ️ Intento ${attemptId} ya estaba en estado: ${attempt.estado}`,
      );
    }
  }

  public emitToAttempt(attemptId: number, event: string, data: any) {
    this.io.to(`attempt_${attemptId}`).emit(event, data);
  }

  public emitToExam(examId: number, event: string, data: any) {
    this.io.to(`exam_${examId}`).emit(event, data);
  }

  public emitToProfessor(profesorId: number, event: string, data: any) {
    this.io.to(`professor_${profesorId}`).emit(event, data);
  }
}
