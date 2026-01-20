import { Server, Socket } from "socket.io";
import { AppDataSource } from "@src/data-source/AppDataSource";
import { ExamInProgress } from "@src/models/ExamInProgress";

export class SocketHandler {
  private io: Server;
  private timers: Map<number, NodeJS.Timeout> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`Cliente conectado: ${socket.id}`);

      socket.on("join_attempt", (data: { attemptId: number; sessionId: string }) => {
        this.handleJoinAttempt(socket, data);
      });

      socket.on("join_exam_monitoring", (examId: number) => {
        socket.join(`exam_${examId}`);
        console.log(`Profesor monitoreando exam_${examId}`);
      });

      socket.on("leave_attempt", (attemptId: number) => {
        socket.leave(`attempt_${attemptId}`);
        this.stopTimer(attemptId);
      });

      socket.on("disconnect", () => {
        console.log(`Cliente desconectado: ${socket.id}`);
      });
    });
  }

  private async handleJoinAttempt(
    socket: Socket,
    data: { attemptId: number; sessionId: string }
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

    socket.join(`attempt_${attemptId}`);
    console.log(`Socket ${socket.id} unido a attempt_${attemptId}`);

    // Iniciar timer si hay fecha de expiración
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
      return; // Timer ya existe
    }

    const now = new Date().getTime();
    const expiration = new Date(fecha_expiracion).getTime();
    const remainingTime = expiration - now;

    if (remainingTime <= 0) {
      this.io.to(`attempt_${attemptId}`).emit("time_expired", {
        message: "El tiempo ha expirado",
      });
      return;
    }

    // Emitir tiempo restante cada segundo
    const interval = setInterval(() => {
      const currentTime = new Date().getTime();
      const timeLeft = expiration - currentTime;

      if (timeLeft <= 0) {
        this.io.to(`attempt_${attemptId}`).emit("time_expired", {
          message: "El tiempo ha expirado",
        });
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

  private stopTimer(attemptId: number) {
    const timer = this.timers.get(attemptId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(attemptId);
      console.log(`Timer detenido para attempt_${attemptId}`);
    }
  }

  public emitToAttempt(attemptId: number, event: string, data: any) {
    this.io.to(`attempt_${attemptId}`).emit(event, data);
  }

  public emitToExam(examId: number, event: string, data: any) {
    this.io.to(`exam_${examId}`).emit(event, data);
  }
}