import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import AlertasModal from "./AlertasModal";
import { examsService } from "../services/examsService";
import { examsAttemptsService } from "../services/examsAttempts";

// ============================================
// INTERFACES
// ============================================
interface Examen {
  id: number;
  nombre: string;
  codigoExamen: string;
  descripcion?: string;
  duracion?: number;
  mostrarCalificaciones?: boolean;
}

interface ExamenVigilanciaProps {
  selectedExam: Examen;
  onVolver: () => void;
  darkMode: boolean;
  usuarioData: any;
}

interface ExamAttempt {
  id: number;
  nombre_estudiante: string;
  correo_estudiante: string | null;
  estado: string;
  tiempoTranscurrido: string;
  progreso: number;
  alertas: number;
  alertasNoLeidas?: number;
  calificacion?: number;
}

interface Alerta {
  id: number;
  tipo_evento: string;
  descripcion?: string;
  fecha_envio: string;
  leida: boolean;
  leido: boolean;
  leida_ts?: string | null;
}

type EstadoDisplay = "Activo" | "Bloqueado" | "Pausado" | "Terminado" | "Abandonado";

// ============================================
// COMPONENTE DE TARJETA DE ESTUDIANTE
// ============================================
interface StudentCardProps {
  id: number;
  nombre: string;
  email: string;
  examen: string;
  estado: EstadoDisplay;
  tiempoTranscurrido: string;
  progreso: number;
  alertas: number;
  alertasNoLeidas: number;
  calificacion?: number;
  mostrarCalificacion: boolean;
  darkMode: boolean;
  onRestablecerAcceso: (id: number) => void;
  onVerDetalles: (id: number) => void;
  onVerAlertas: (id: number) => void;
}

function StudentCard({
  id,
  nombre,
  email,
  examen,
  estado,
  tiempoTranscurrido,
  progreso,
  alertas,
  alertasNoLeidas,
  calificacion,
  mostrarCalificacion,
  darkMode,
  onRestablecerAcceso,
  onVerDetalles,
  onVerAlertas,
}: StudentCardProps) {
  return (
    <div
      className={`${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"} border rounded-lg p-4 hover:shadow-md transition-shadow`}
    >
      {/* Header con nombre y estado */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {nombre
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
          <div>
            <h3
              className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              {nombre}
            </h3>
            <p
              className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              {email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge de estado */}
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              estado === "Activo"
                ? "bg-green-100 text-green-800"
                : estado === "Bloqueado" || estado === "Pausado"
                  ? "bg-red-100 text-red-800"
                  : estado === "Terminado"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
            }`}
          >
            {estado}
          </span>

          {/* Badge de alertas */}
          {alertas > 0 && (
            <button
              onClick={() => onVerAlertas(id)}
              className="relative px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors"
            >
              {alertas} alerta{alertas > 1 ? "s" : ""}
              {alertasNoLeidas > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 animate-pulse border-2 border-white"></span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Info del examen */}
      <div
        className={`text-sm mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
      >
        <p className="mb-1">
          <span className="font-medium">Examen:</span> {examen}
        </p>
        <p>
          <span className="font-medium">Tiempo:</span> {tiempoTranscurrido}
        </p>
        {mostrarCalificacion && calificacion !== undefined && (
          <p className="mt-1">
            <span className="font-medium">Calificación:</span>{" "}
            <span className="text-teal-600 font-semibold">{calificacion}/100</span>
          </p>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            Progreso
          </span>
          <span
            className={`text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            {progreso}%
          </span>
        </div>
        <div
          className={`w-full h-2 ${darkMode ? "bg-slate-700" : "bg-gray-200"} rounded-full overflow-hidden`}
        >
          <div
            className="h-full bg-teal-600 rounded-full transition-all duration-300"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        {estado === "Abandonado" && (
          <button
            onClick={() => onRestablecerAcceso(id)}
            className="flex-1 py-2 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Restablecer Acceso
          </button>
        )}
        <button
          onClick={() => onVerDetalles(id)}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
            darkMode
              ? "bg-slate-700 text-gray-200 hover:bg-slate-600"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Ver Detalles
        </button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL DE VIGILANCIA
// ============================================
export default function ExamenVigilancia({
  selectedExam,
  onVolver,
  darkMode,
  usuarioData,
}: ExamenVigilanciaProps) {
  // ============================================
  // ESTADOS
  // ============================================
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [alertasDetalle, setAlertasDetalle] = useState<Alerta[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [modalAlertas, setModalAlertas] = useState({
    show: false,
    attemptId: null as number | null,
    nombre: "",
  });
  const [mostrarCalificaciones, setMostrarCalificaciones] = useState(false);
  const [modoVigilancia, setModoVigilancia] = useState(true);

  // ============================================
  // SOCKET.IO - MONITOREO EN TIEMPO REAL
  // ============================================
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!selectedExam) return;

    const socketUrl =
      import.meta.env.VITE_API_URL || "http://localhost:3000";
    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket conectado:", newSocket.id);
      newSocket.emit("joinExamMonitoring", selectedExam.id);
    });

    newSocket.on("examAttemptUpdate", (data) => {
      console.log("📊 Actualización de intento recibida:", data);
      setExamAttempts((prev) => {
        const index = prev.findIndex((a) => a.id === data.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data };
          return updated;
        }
        return [...prev, data];
      });
    });

    newSocket.on("newAlert", (data) => {
      console.log("🚨 Nueva alerta recibida:", data);
      setExamAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id === data.attemptId
            ? {
                ...attempt,
                alertas: (attempt.alertas || 0) + 1,
                alertasNoLeidas: (attempt.alertasNoLeidas || 0) + 1,
              }
            : attempt
        )
      );
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Socket desconectado");
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("leaveExamMonitoring", selectedExam.id);
      newSocket.disconnect();
    };
  }, [selectedExam]);

  // ============================================
  // CARGAR INTENTOS INICIALES
  // ============================================
  useEffect(() => {
    if (!selectedExam) return;

    const cargarIntentos = async () => {
      try {
        const data = await examsAttemptsService.getActiveAttemptsByExam(
          selectedExam.id
        );
        console.log("📥 Intentos cargados:", data);
        setExamAttempts(data);
      } catch (error) {
        console.error("❌ Error al cargar intentos:", error);
      }
    };

    cargarIntentos();
  }, [selectedExam]);

  // ============================================
  // FUNCIONES DE MANEJO
  // ============================================
  const handleUnlockAttempt = async (attemptId: number) => {
    try {
      await examsAttemptsService.unlockAttempt(attemptId);
      console.log(`🔓 Intento ${attemptId} desbloqueado`);

      setExamAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id === attemptId
            ? { ...attempt, estado: "activo" }
            : attempt
        )
      );
    } catch (error) {
      console.error("❌ Error al desbloquear intento:", error);
    }
  };

  const handleViewDetails = (attemptId: number) => {
    console.log(`👁️ Ver detalles del intento ${attemptId}`);
  };

  const handleVerAlertas = async (attemptId: number, nombre: string) => {
    try {
      const eventos = await examsAttemptsService.getAttemptEvents(attemptId);
      setAlertasDetalle(eventos);
      setModalAlertas({ show: true, attemptId, nombre });

      await examsAttemptsService.markEventsAsRead(attemptId);

      setExamAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id === attemptId
            ? { ...attempt, alertasNoLeidas: 0 }
            : attempt
        )
      );
    } catch (error) {
      console.error("❌ Error al cargar eventos/alertas:", error);
      setAlertasDetalle([]);
      setModalAlertas({ show: true, attemptId, nombre });
    }
  };

  const handleDescargarCalificaciones = async () => {
    try {
      console.log("📥 Descargando calificaciones en PDF...");
      // Aquí iría la lógica para descargar el PDF
      // Por ejemplo: await examsService.downloadGradesPDF(selectedExam.id);
      alert("Funcionalidad de descarga de PDF en desarrollo");
    } catch (error) {
      console.error("❌ Error al descargar calificaciones:", error);
    }
  };

  const handleForzarEnvio = async () => {
    try {
      console.log("📤 Forzando envío de exámenes...");
      // Aquí iría la lógica para forzar el envío
      alert("Funcionalidad de forzar envío en desarrollo");
    } catch (error) {
      console.error("❌ Error al forzar envío:", error);
    }
  };

  // ============================================
  // FUNCIONES AUXILIARES
  // ============================================
  const traducirEstado = (estado: string): EstadoDisplay => {
    const traducciones: Record<string, EstadoDisplay> = {
      active: "Activo",
      activo: "Activo",
      blocked: "Bloqueado",
      bloqueado: "Bloqueado",
      paused: "Pausado",
      pausado: "Pausado",
      finished: "Terminado",
      terminado: "Terminado",
      abandonado: "Abandonado",
      abandoned: "Abandonado",
    };
    return traducciones[estado.toLowerCase()] || "Abandonado";
  };

  const normalizarEstado = (estado: string): string => {
    return traducirEstado(estado).toLowerCase();
  };

  // ============================================
  // FILTRADO Y CONTADORES
  // ============================================
  const intentosFiltrados = examAttempts.filter((attempt) => {
    if (filtroEstado === "todos") return true;
    return normalizarEstado(attempt.estado) === filtroEstado.toLowerCase();
  });

  const contadores = {
    total: examAttempts.length,
    activos: examAttempts.filter((a) => normalizarEstado(a.estado) === "activo")
      .length,
    bloqueados: examAttempts.filter(
      (a) => normalizarEstado(a.estado) === "bloqueado"
    ).length,
    pausados: examAttempts.filter((a) => normalizarEstado(a.estado) === "pausado")
      .length,
    terminados: examAttempts.filter(
      (a) => normalizarEstado(a.estado) === "terminado"
    ).length,
    abandonados: examAttempts.filter(
      (a) => normalizarEstado(a.estado) === "abandonado"
    ).length,
    enCurso: examAttempts.filter(
      (a) => normalizarEstado(a.estado) === "activo" || normalizarEstado(a.estado) === "pausado"
    ).length,
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* Header mejorado */}
      <div
        className={`${darkMode ? "bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700" : "bg-gradient-to-r from-white to-gray-50 border-gray-200"} border rounded-xl shadow-lg p-6`}
      >
        {/* Botón volver y título */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onVolver}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 ${
                darkMode
                  ? "bg-slate-700 hover:bg-slate-600 text-gray-300"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Volver
            </button>
            
            <div className="h-8 w-px bg-gray-700"></div>
            
            <div>
              <h1
                className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
              >
                {selectedExam.nombre}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Código: <span className="font-mono font-semibold">{selectedExam.codigoExamen}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Vigilancia:
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modoVigilancia}
                      onChange={(e) => setModoVigilancia(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div
            className={`${darkMode ? "bg-slate-700/50" : "bg-blue-50"} rounded-lg p-4 text-center border ${darkMode ? "border-slate-600" : "border-blue-200"}`}
          >
            <div className="text-3xl font-bold text-blue-500 mb-1">
              {contadores.total}
            </div>
            <div
              className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              Han empezado
            </div>
          </div>

          <div
            className={`${darkMode ? "bg-slate-700/50" : "bg-green-50"} rounded-lg p-4 text-center border ${darkMode ? "border-slate-600" : "border-green-200"}`}
          >
            <div className="text-3xl font-bold text-green-500 mb-1">
              {contadores.terminados}
            </div>
            <div
              className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              Han enviado
            </div>
          </div>

          <div
            className={`${darkMode ? "bg-slate-700/50" : "bg-orange-50"} rounded-lg p-4 text-center border ${darkMode ? "border-slate-600" : "border-orange-200"}`}
          >
            <div className="text-3xl font-bold text-orange-500 mb-1">
              {contadores.enCurso}
            </div>
            <div
              className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              En curso
            </div>
          </div>

          <div
            className={`${darkMode ? "bg-slate-700/50" : "bg-red-50"} rounded-lg p-4 text-center border ${darkMode ? "border-slate-600" : "border-red-200"}`}
          >
            <div className="text-3xl font-bold text-red-500 mb-1">
              {contadores.bloqueados}
            </div>
            <div
              className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              Bloqueados
            </div>
          </div>
        </div>

        {/* Acciones principales - Rediseñadas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleForzarEnvio}
            className={`group flex items-center gap-3 p-4 rounded-lg transition-all hover:scale-105 ${
              darkMode
                ? "bg-gradient-to-r from-red-900/40 to-red-800/40 hover:from-red-900/60 hover:to-red-800/60 border border-red-700/50"
                : "bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border border-red-200"
            }`}
          >
            <div className="flex-shrink-0 w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </div>
            <div className="text-left flex-1">
              <div className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                Forzar envío
              </div>
              <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Finalizar para todos
              </div>
            </div>
          </button>

          <button
            onClick={() => setMostrarCalificaciones(!mostrarCalificaciones)}
            className={`group flex items-center gap-3 p-4 rounded-lg transition-all hover:scale-105 ${
              mostrarCalificaciones
                ? "bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 border border-teal-500"
                : darkMode
                  ? "bg-gradient-to-r from-blue-900/40 to-blue-800/40 hover:from-blue-900/60 hover:to-blue-800/60 border border-blue-700/50"
                  : "bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200"
            }`}
          >
            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow ${
              mostrarCalificaciones ? "bg-white" : "bg-blue-500"
            }`}>
              <svg
                className={`w-6 h-6 ${mostrarCalificaciones ? "text-teal-600" : "text-white"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-left flex-1">
              <div className={`font-semibold ${mostrarCalificaciones ? "text-white" : darkMode ? "text-white" : "text-gray-900"}`}>
                {mostrarCalificaciones ? "Ocultar" : "Mostrar"} notas
              </div>
              <div className={`text-xs ${mostrarCalificaciones ? "text-teal-100" : darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Calificaciones
              </div>
            </div>
          </button>

          <button
            onClick={handleDescargarCalificaciones}
            className={`group flex items-center gap-3 p-4 rounded-lg transition-all hover:scale-105 ${
              darkMode
                ? "bg-gradient-to-r from-purple-900/40 to-purple-800/40 hover:from-purple-900/60 hover:to-purple-800/60 border border-purple-700/50"
                : "bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border border-purple-200"
            }`}
          >
            <div className="flex-shrink-0 w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="text-left flex-1">
              <div className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                Descargar PDF
              </div>
              <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Reporte completo
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Filtros de estado - Rediseñados */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroEstado("todos")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filtroEstado === "todos"
              ? "bg-teal-600 text-white shadow-lg scale-105"
              : darkMode
                ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Todos <span className="ml-1 opacity-75">({contadores.total})</span>
        </button>

        <button
          onClick={() => setFiltroEstado("activo")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filtroEstado === "activo"
              ? "bg-green-600 text-white shadow-lg scale-105"
              : darkMode
                ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Activos <span className="ml-1 opacity-75">({contadores.activos})</span>
        </button>

        <button
          onClick={() => setFiltroEstado("bloqueado")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filtroEstado === "bloqueado"
              ? "bg-red-600 text-white shadow-lg scale-105"
              : darkMode
                ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Bloqueados <span className="ml-1 opacity-75">({contadores.bloqueados})</span>
        </button>

        <button
          onClick={() => setFiltroEstado("pausado")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filtroEstado === "pausado"
              ? "bg-yellow-600 text-white shadow-lg scale-105"
              : darkMode
                ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          En Pausa <span className="ml-1 opacity-75">({contadores.pausados})</span>
        </button>

        <button
          onClick={() => setFiltroEstado("terminado")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filtroEstado === "terminado"
              ? "bg-blue-600 text-white shadow-lg scale-105"
              : darkMode
                ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Terminados <span className="ml-1 opacity-75">({contadores.terminados})</span>
        </button>

        <button
          onClick={() => setFiltroEstado("abandonado")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filtroEstado === "abandonado"
              ? "bg-gray-600 text-white shadow-lg scale-105"
              : darkMode
                ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Abandonados <span className="ml-1 opacity-75">({contadores.abandonados})</span>
        </button>
      </div>

      {/* Lista de estudiantes */}
      {intentosFiltrados.length === 0 ? (
        <div
          className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-lg shadow-sm p-12 text-center`}
        >
          <svg
            className={`w-16 h-16 mx-auto mb-4 ${darkMode ? "text-gray-600" : "text-gray-400"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p
            className={`text-lg font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            {filtroEstado === "todos"
              ? "No hay estudiantes realizando el examen"
              : `No hay estudiantes en estado "${filtroEstado}"`}
          </p>
          <p
            className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-500"}`}
          >
            Los estudiantes aparecerán aquí cuando comiencen el examen
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {intentosFiltrados.map((attempt) => (
            <StudentCard
              key={attempt.id}
              id={attempt.id}
              nombre={attempt.nombre_estudiante}
              email={attempt.correo_estudiante || "Sin correo"}
              examen={selectedExam.nombre}
              estado={traducirEstado(attempt.estado)}
              tiempoTranscurrido={attempt.tiempoTranscurrido}
              progreso={attempt.progreso}
              alertas={attempt.alertas}
              alertasNoLeidas={attempt.alertasNoLeidas || 0}
              calificacion={attempt.calificacion}
              mostrarCalificacion={mostrarCalificaciones}
              darkMode={darkMode}
              onRestablecerAcceso={handleUnlockAttempt}
              onVerDetalles={handleViewDetails}
              onVerAlertas={(id) =>
                handleVerAlertas(id, attempt.nombre_estudiante)
              }
            />
          ))}
        </div>
      )}

      {/* Modal de Alertas */}
      {modalAlertas.show && (
        <AlertasModal
          mostrar={modalAlertas.show}
          darkMode={darkMode}
          alertas={alertasDetalle}
          nombreEstudiante={modalAlertas.nombre}
          onCerrar={() =>
            setModalAlertas({ show: false, attemptId: null, nombre: "" })
          }
        />
      )}
    </div>
  );
}