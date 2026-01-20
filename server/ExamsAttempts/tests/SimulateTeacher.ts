import io from "socket.io-client";
import axios from "axios";

const MS_ATTEMPTS_URL = "http://localhost:3002"; // Ajusta tu puerto

class TeacherSimulator {
  private socket: any;
  private examId: number;

  constructor(examId: number) {
    this.examId = examId;
    this.connectWebSocket();
  }

  private connectWebSocket() {
    console.log("\n👨‍🏫 PROFESOR: Iniciando monitoreo...");
    console.log(`📊 Exam ID: ${this.examId}\n`);

    this.socket = io(MS_ATTEMPTS_URL);

    this.socket.on("connect", () => {
      console.log(`✅ WebSocket conectado: ${this.socket.id}`);
      console.log(`📡 Uniéndose al room: exam_${this.examId}\n`);
      this.socket.emit("join_exam_monitoring", this.examId);
    });

    this.socket.on("student_started_exam", (data: any) => {
      console.log("\n" + "=".repeat(60));
      console.log("📢 ESTUDIANTE INICIÓ EXAMEN");
      console.log("=".repeat(60));
      console.log(JSON.stringify(data, null, 2));
      console.log("=".repeat(60) + "\n");
    });

    this.socket.on("fraud_alert", (data: any) => {
      console.log("\n" + "🚨".repeat(30));
      console.log("⚠️  ALERTA DE FRAUDE DETECTADO");
      console.log("🚨".repeat(30));
      console.log(JSON.stringify(data, null, 2));
      console.log("🚨".repeat(30) + "\n");
    });

    this.socket.on("attempt_blocked_notification", (data: any) => {
      console.log("\n" + "🔒".repeat(30));
      console.log("🚫 INTENTO BLOQUEADO");
      console.log("🔒".repeat(30));
      console.log(JSON.stringify(data, null, 2));
      console.log("🔒".repeat(30) + "\n");
    });

    this.socket.on("student_finished_exam", (data: any) => {
      console.log("\n" + "✅".repeat(30));
      console.log("🏁 ESTUDIANTE FINALIZÓ EXAMEN");
      console.log("✅".repeat(30));
      console.log(JSON.stringify(data, null, 2));
      console.log("✅".repeat(30) + "\n");
    });

    this.socket.on("disconnect", () => {
      console.log("\n❌ WebSocket desconectado del servidor\n");
    });

    this.socket.on("error", (error: any) => {
      console.error("\n❌ Error en WebSocket:", error, "\n");
    });
  }

  async unlockAttempt(attemptId: number) {
    console.log(`\n🔓 Desbloqueando intento ${attemptId}...`);

    try {
      await axios.post(
        `${MS_ATTEMPTS_URL}/api/exam/attempt/${attemptId}/unlock`
      );
      console.log("✅ Intento desbloqueado exitosamente\n");
    } catch (error: any) {
      console.error("❌ Error:", error.response?.data || error.message, "\n");
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      console.log("\n👋 Desconectado del monitoreo\n");
    }
  }
}

async function main() {
  const examId = 3; // 🔴 CAMBIA ESTO por el ID del examen que tienes en tu BD
  const teacher = new TeacherSimulator(examId);

  console.log("\n👀 Monitoreando examen... (Ctrl+C para salir)");
  console.log("⏳ Esperando eventos...\n");

  // Mantener el proceso corriendo
  process.stdin.resume();
}

if (require.main === module) {
  main();
}

export { TeacherSimulator };