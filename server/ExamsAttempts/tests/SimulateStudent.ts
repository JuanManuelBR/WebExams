import io from "socket.io-client";
import axios from "axios";

const MS_ATTEMPTS_URL = "http://localhost:3002";
const MS_EXAMS_URL = "http://localhost:3001";

interface StudentConfig {
  codigoExamen: string;
  nombre: string;
  correo: string;
  contrasena?: string;
}

class StudentSimulator {
  private socket: any;
  private attemptId?: number;
  private sessionId?: string;
  private examData?: any;

  async startExam(config: StudentConfig) {
    console.log("\n🎓 INICIANDO EXAMEN...\n");

    try {
      // Paso 1: Obtener info del examen
      console.log(`📋 Obteniendo examen: ${config.codigoExamen}`);
      const examResponse = await axios.get(
        `${MS_EXAMS_URL}/api/exams/${config.codigoExamen}`,
      );
      this.examData = examResponse.data;
      console.log(`✅ Examen encontrado: ${this.examData.nombre}`);

      // Paso 2: Iniciar intento
      console.log("\n🚀 Iniciando intento...");
      const attemptResponse = await axios.post(
        `${MS_ATTEMPTS_URL}/api/exam/attempt/start`,
        {
          codigo_examen: config.codigoExamen,
          nombre_estudiante: config.nombre,
          correo_estudiante: config.correo,
          contrasena: config.contrasena,
        },
      );

      const { attempt, examInProgress } = attemptResponse.data;
      this.attemptId = attempt.id;
      this.sessionId = examInProgress.id_sesion;

      console.log(`✅ Intento creado: ID ${this.attemptId}`);
      console.log(`🔑 Código de acceso: ${examInProgress.codigo_acceso}`);
      console.log(`🆔 Session ID: ${this.sessionId}`);

      // Paso 3: Conectar WebSocket
      this.connectWebSocket();

      return {
        attemptId: this.attemptId,
        codigoAcceso: examInProgress.codigo_acceso,
        sessionId: this.sessionId,
      };
    } catch (error: any) {
      console.error("❌ Error:", error.response?.data || error.message);
      throw error;
    }
  }

  private connectWebSocket() {
    console.log("\n🔌 Conectando WebSocket...");

    this.socket = io(MS_ATTEMPTS_URL);

    this.socket.on("connect", () => {
      console.log(`✅ WebSocket conectado: ${this.socket.id}`);

      this.socket.emit("join_attempt", {
        attemptId: this.attemptId,
        sessionId: this.sessionId,
      });
    });

    this.socket.on("joined_attempt", (data: any) => {
      console.log("✅ Unido al intento:", data);
    });

    this.socket.on("timer_tick", (data: any) => {
      const minutes = Math.floor(data.remainingTimeSeconds / 60);
      const seconds = data.remainingTimeSeconds % 60;
      process.stdout.write(
        `\r⏱️  Tiempo restante: ${minutes}:${seconds.toString().padStart(2, "0")}`,
      );
    });

    this.socket.on("time_expired", (data: any) => {
      console.log("\n\n⏰ TIEMPO EXPIRADO:", data.message);
    });

    this.socket.on("fraud_detected", (data: any) => {
      console.log("\n\n⚠️  FRAUDE DETECTADO:", data);
    });

    this.socket.on("attempt_blocked", (data: any) => {
      console.log("\n\n🚫 EXAMEN BLOQUEADO:", data.message);
    });

    this.socket.on("attempt_unlocked", (data: any) => {
      console.log("\n\n🔓 EXAMEN DESBLOQUEADO:", data.message);
    });

    this.socket.on("attempt_finished", (data: any) => {
      console.log("\n\n✅ EXAMEN FINALIZADO:", data);
      this.disconnect();
    });

    this.socket.on("error", (data: any) => {
      console.error("\n❌ Error WebSocket:", data);
    });

    this.socket.on("session_conflict", (data: any) => {
      console.error("\n❌ Conflicto de sesión:", data.message);
    });

    this.socket.on("disconnect", () => {
      console.log("\n🔌 WebSocket desconectado");
    });
  }

  async answerQuestion(preguntaId: number, respuesta: string) {
    if (!this.attemptId) {
      throw new Error("No hay intento activo");
    }

    console.log(`\n📝 Respondiendo pregunta ${preguntaId}...`);

    try {
      await axios.post(`${MS_ATTEMPTS_URL}/api/exam/answer`, {
        pregunta_id: preguntaId,
        respuesta,
        fecha_respuesta: new Date(),
        intento_id: this.attemptId,
      });

      console.log(`✅ Respuesta guardada`);
    } catch (error: any) {
      console.error("❌ Error:", error.response?.data || error.message);
    }
  }

  async sendFraudEvent(tipoEvento: string) {
    if (!this.attemptId) {
      throw new Error("No hay intento activo");
    }

    console.log(`\n⚠️  Enviando evento de fraude: ${tipoEvento}...`);

    try {
      await axios.post(`${MS_ATTEMPTS_URL}/api/exam/event`, {
        tipo_evento: tipoEvento,
        fecha_envio: new Date(),
        intento_id: this.attemptId,
      });

      console.log(`✅ Evento enviado`);
    } catch (error: any) {
      console.error("❌ Error:", error.response?.data || error.message);
    }
  }

  async finishExam() {
    if (!this.attemptId) {
      throw new Error("No hay intento activo");
    }

    console.log("\n🏁 Finalizando examen...");

    try {
      await axios.post(
        `${MS_ATTEMPTS_URL}/api/exam/attempt/${this.attemptId}/finish`,
      );

      console.log("✅ Examen finalizado");
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.log("⚠️  No se puede finalizar: Examen bloqueado por fraude");
      } else {
        console.error("❌ Error:", error.response?.data || error.message);
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Función principal
async function main() {
  const student = new StudentSimulator();
  let isBlocked = false;

  try {
    await student.startExam({
      codigoExamen: "W71kN9wX",
      nombre: "Juan Pérez",
      correo: "juan@example.com",
      contrasena: "test123",
    });

    await sleep(3000);

    await student.answerQuestion(1, "Respuesta a pregunta 1");
    await sleep(2000);

    await student.answerQuestion(2, "Respuesta a pregunta 2");
    await sleep(2000);

    // Simular evento de fraude
    await student.sendFraudEvent("pantalla_completa_cerrada");
    await sleep(3000); // Esperar a que se procese el bloqueo

    // ✅ Escuchar si se bloqueó
    // (El WebSocket ya emitió el evento, pero aquí solo intentamos finalizar)
    await student.finishExam();

    await sleep(2000);
    process.exit(0);
  } catch (error) {
    console.error("Error en simulación:", error);
    student.disconnect();
    process.exit(1);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main();
}

export { StudentSimulator };
