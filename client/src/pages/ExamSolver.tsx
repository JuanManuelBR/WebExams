import React, { useState, useEffect, useRef } from "react";
import {
  Moon,
  Sun,
  Clock,
  User,
  X,
  Maximize2,
  Minimize2,
  Columns,
  Rows,
  Calculator,
  FileSpreadsheet,
  Code,
  Pencil,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Battery,
  BatteryCharging,
  GripVertical,
  FileText,
  LayoutGrid,
  CheckCircle2,
  LogOut
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import ExamPanel from "./ExamenPreguntas";
import MonitoreoSupervisado from "./ExamenAcceso";
import EditorTexto from '../components/EditorTexto';
import Calculadora from '../components/Calculadora';
import HojaCalculo from '../components/HojaCalculo';
import Lienzo from '../components/Lienzo';
import EditorJavaScript from '../components/EditorJavaScript';
import EditorPython from '../components/EditorPython';
import logoUniversidad from "../../assets/logo-universidad.webp";
import logoUniversidadNoche from "../../assets/logo-universidad-noche.webp";

// --- INTERFACES ---
interface StudentData {
  nombre?: string;
  correoElectronico?: string;
  codigoEstudiante?: string;
  attemptId?: number;
  codigo_acceso?: string;
  id_sesion?: string;
  fecha_expiracion?: string | null;
  examCode: string;
  startTime: string;
  contrasena?: string;
}

interface ExamData {
  nombre: string;
  nombreProfesor: string;
  limiteTiempo: number;
  consecuencia: string;
  incluirHerramientaDibujo: boolean;
  incluirCalculadoraCientifica: boolean;
  incluirHojaExcel: boolean;
  incluirJavascript: boolean;
  incluirPython: boolean;
  descripcion: string;
  questions: any;
  archivoPDF?: string | null;
}

type PanelType =
  | "exam"
  | "answer"
  | "dibujo"
  | "calculadora"
  | "excel"
  | "javascript"
  | "python";
type Layout = "horizontal" | "vertical";

// --- INDICADOR DE GUARDADO ---
function SavingIndicator({
  savingStates,
  darkMode,
}: {
  savingStates: Record<number, boolean>;
  darkMode: boolean;
}) {
  const isSaving = Object.values(savingStates).some((s) => s);

  if (!isSaving) return null;

  return (
    <div
      className={`fixed bottom-6 left-24 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl z-50 border transition-all animate-in slide-in-from-bottom-5 duration-300 ${
        darkMode 
          ? "bg-slate-800 border-blue-500/50 text-blue-200" 
          : "bg-white border-blue-100 text-blue-800"
      }`}
    >
      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
      <span className="text-sm font-bold tracking-tight">
        Guardando...
      </span>
    </div>
  );
}

// --- COMPONENTE NOTIFICACIÓN TIMER ---
function TimerNotification({ alert, onClose, darkMode }: { alert: {message: string, type: 'warning' | 'critical'} | null, onClose: () => void, darkMode: boolean }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (alert) {
      const showTimer = setTimeout(() => setIsVisible(true), 10);
      const hideTimer = setTimeout(() => setIsVisible(false), 6000); // 6 segundos de duración
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [alert]);

  useEffect(() => {
    if (!isVisible && alert) {
      const closeTimer = setTimeout(onClose, 500); // Esperar a que termine la animación de salida
      return () => clearTimeout(closeTimer);
    }
  }, [isVisible, alert, onClose]);

  if (!alert) return null;
  
  const isCritical = alert.type === 'critical';
  
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-max px-6 py-3 rounded-xl shadow-2xl border backdrop-blur-md flex items-center gap-4 transition-all duration-500 ease-in-out ${
        isVisible 
        ? "opacity-100 scale-100" 
        : "opacity-0 scale-95 pointer-events-none"
    } ${
        isCritical 
        ? (darkMode ? "bg-red-900/90 border-red-500 text-red-100" : "bg-red-50 border-red-200 text-red-800")
        : (darkMode ? "bg-amber-900/90 border-amber-500 text-amber-100" : "bg-amber-50 border-amber-200 text-amber-800")
    }`}>
       <div className={`p-2 rounded-full flex-shrink-0 ${
           isCritical 
           ? (darkMode ? "bg-red-800 text-red-200" : "bg-red-100 text-red-600")
           : (darkMode ? "bg-amber-800 text-amber-200" : "bg-amber-100 text-amber-600")
       }`}>
           {isCritical ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
       </div>
       <div>
         <h4 className="font-bold text-sm">{isCritical ? "¡Atención!" : "Recordatorio"}</h4>
         <p className="text-xs opacity-90 font-medium">{alert.message}</p>
       </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
const ATTEMPTS_API_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3002";
const EXAMS_API_URL = import.meta.env.VITE_EXAMS_URL || "http://localhost:3001";

export default function SecureExamPlatform() {
  // ----------------------------------------------------------------------
  // 1. ESTADOS
  // ----------------------------------------------------------------------
  const [examStarted, setExamStarted] = useState(false);
  const [examBlocked, setExamBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [wasForced, setWasForced] = useState(false);
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const [remainingTime, setRemainingTime] = useState("02:30:00");
  const [timerStatus, setTimerStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [timerAlert, setTimerAlert] = useState<{message: string, type: 'warning' | 'critical'} | null>(null);
  const alertsShownRef = useRef<{warning: boolean, critical: boolean}>({ warning: false, critical: false });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const [openPanels, setOpenPanels] = useState<PanelType[]>([]);
  const [layout, setLayout] = useState<Layout>("vertical");
  const [panelSizes, setPanelSizes] = useState<number[]>([]);
  const [panelZooms, setPanelZooms] = useState<number[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const [startPos, setStartPos] = useState(0);

  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [answerPanelContent, setAnswerPanelContent] = useState<string>("");
  const [savingStates, setSavingStates] = useState<Record<number, boolean>>({});
  const saveTimersRef = useRef<Record<number, number>>({});
  const [lastSavedAnswers, setLastSavedAnswers] = useState<Record<number, string>>({});

  const [draggedPanelIndex, setDraggedPanelIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [securityViolations, setSecurityViolations] = useState<string[]>([]);

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const integrityCheckRef = useRef<number>(0);

  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [examData, setExamData] = useState<ExamData | null>(null);

  // Estado persistente para el editor de Python
  const [pythonCells, setPythonCells] = useState<any[]>([
    {
      id: '1',
      type: 'markdown',
      content: '# Editor Python\n',
      status: 'idle'
    }
  ]);

  // Estado persistente para el editor de JavaScript
  const [jsCells, setJsCells] = useState<any[]>([
    {
      id: '1',
      type: 'markdown',
      content: '# Editor JavaScript\n',
      status: 'idle'
    }
  ]);

  // Estado persistente para Lienzo (Dibujo)
  const [lienzoState, setLienzoState] = useState<any>(null);

  // Estados para Modales de Confirmación
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // --- HELPERS DE DIMENSIONAMIENTO ---
  const getMinSize = (type: PanelType, panelCount: number) => {
      if (type === "dibujo") return 50; // Lienzo requiere 60% mínimo
      // Si hay 3 paneles, relajamos un poco los mínimos para que quepan
      if (type === "exam") return 50;
      if (type === "python" || type === "javascript") return panelCount === 3 ? 30 : 40;
      if (type === "answer") return 30;
      return 20; // Calculadora, Excel, etc.
  };

  const calculateOptimalSizes = (panels: PanelType[]) => {
      const count = panels.length;
      const minSizes = panels.map(p => getMinSize(p, count));
      const totalMin = minSizes.reduce((a, b) => a + b, 0);
      
      // Si los mínimos superan el 100% (raro con la lógica actual), escalamos
      if (totalMin > 100) return minSizes.map(m => (m / totalMin) * 100);
      
      // Si sobra espacio, se lo damos al primer panel (Examen)
      const sizes = [...minSizes];
      sizes[0] += (100 - totalMin);
      return sizes;
  };

  // ----------------------------------------------------------------------
  // 2. EFECTOS LÓGICOS (Carga, Seguridad, Timer)
  // ----------------------------------------------------------------------

  useEffect(() => {
    const storedStudentData = localStorage.getItem("studentData");
    const storedExamData = localStorage.getItem("currentExam");

    if (storedStudentData) {
      const parsedStudent = JSON.parse(storedStudentData);
      setStudentData(parsedStudent);
    }

    if (storedExamData) {
      const parsedExam = JSON.parse(storedExamData);
      setExamData(parsedExam);
    }
  }, []);

  // Verificación de integridad
  useEffect(() => {
    integrityCheckRef.current = Math.random();
    if (!examStarted || examBlocked) return;
    const checkIntegrity = setInterval(() => {
      if (examStarted && !examBlocked) {
        const elements = document.querySelectorAll("[data-protected]");
        elements.forEach((el) => {
          if (el.getAttribute("data-integrity") !== integrityCheckRef.current.toString()) {
            blockExam("Manipulación del código detectada", "CRITICAL");
          }
        });
        const widthThreshold = window.outerWidth - window.innerWidth > 200;
        const heightThreshold = window.outerHeight - window.innerHeight > 200;
        if (widthThreshold || heightThreshold) {
          addSecurityViolation("Posible DevTools detectado");
        }
      }
    }, 2000);
    return () => clearInterval(checkIntegrity);
  }, [examStarted, examBlocked]);

  // Prevenir copia y pegado
  useEffect(() => {
    if (examStarted) {
      const style = document.createElement("style");
      style.innerHTML = `
        * { user-select: none !important; -webkit-user-select: none !important; }
        textarea, input { user-select: text !important; -webkit-user-select: text !important; }
      `;
      document.head.appendChild(style);
      const preventCopy = (e: ClipboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== "TEXTAREA" && target.tagName !== "INPUT") {
          e.preventDefault();
          blockExam("Intento de copiar contenido del examen", "CRITICAL");
        }
      };
      const preventCut = (e: ClipboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== "TEXTAREA" && target.tagName !== "INPUT") {
          e.preventDefault();
          blockExam("Intento de cortar contenido del examen", "CRITICAL");
        }
      };
      const preventPrint = (e: Event) => {
        e.preventDefault();
        blockExam("Intento de impresión detectado", "CRITICAL");
      };
      const preventContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };

      document.addEventListener("copy", preventCopy);
      document.addEventListener("cut", preventCut);
      window.addEventListener("beforeprint", preventPrint);
      document.addEventListener("contextmenu", preventContextMenu);
      return () => {
        document.head.removeChild(style);
        document.removeEventListener("copy", preventCopy);
        document.removeEventListener("cut", preventCut);
        window.removeEventListener("beforeprint", preventPrint);
        document.removeEventListener("contextmenu", preventContextMenu);
      };
    }
  }, [examStarted]);

  // Reloj
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Batería
  useEffect(() => {
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);
        const handleLevelChange = () => {
          const level = Math.round(battery.level * 100);
          setBatteryLevel(level);
          if (level <= 10 && !battery.charging && examStarted) {
            addSecurityViolation(`Batería baja: ${level}%`);
          }
          if (level === 0 && examStarted) {
            blockExam("Batería agotada", "CRITICAL");
          }
        };
        battery.addEventListener("levelchange", handleLevelChange);
      });
    }
  }, [examStarted]);

  // Timer del examen
  useEffect(() => {
    if (!examStarted || !studentData || !examData) return;
    if (!examData.limiteTiempo || examData.limiteTiempo === 0) {
      setRemainingTime("Sin límite");
      return;
    }
    if (examBlocked) return;

    // Calcular tiempo final una sola vez para evitar fluctuaciones
    const startTime = new Date(studentData.startTime).getTime();
    const duration = examData.limiteTiempo * 60 * 1000;
    const endTime = startTime + duration;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        setRemainingTime("00:00:00");
        blockExam("Tiempo finalizado", "INFO");
        return;
      }

      const remHours = Math.floor(remaining / (1000 * 60 * 60));
      const remMinutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const remSeconds = Math.floor((remaining % (1000 * 60)) / 1000);
      
      const timeString = `${String(remHours).padStart(2, "0")}:${String(remMinutes).padStart(2,"0")}:${String(remSeconds).padStart(2, "0")}`;
      
      // --- LÓGICA DE ALERTAS DE TIEMPO ---
      const percentage = (remaining / duration) * 100;
      let newStatus: 'normal' | 'warning' | 'critical' = 'normal';

      if (percentage <= 10) {
          newStatus = 'critical';
          if (!alertsShownRef.current.critical) {
              setTimerAlert({ message: `Queda ${timeString} para terminar el examen.`, type: 'critical' });
              alertsShownRef.current.critical = true;
          }
      } else if (percentage <= 40) {
          newStatus = 'warning';
          if (!alertsShownRef.current.warning) {
              setTimerAlert({ message: `Queda ${timeString} para terminar el examen.`, type: 'warning' });
              alertsShownRef.current.warning = true;
          }
      }
      
      setTimerStatus(newStatus);
      // Solo actualizamos si el texto cambia, evitando renders innecesarios
      setRemainingTime(prev => prev !== timeString ? timeString : prev);
    };

    // Sincronización precisa con el reloj del sistema
    updateTimer();
    const now = Date.now();
    const msToNextSecond = 1000 - (now % 1000);
    
 
    let interval: any;
    const timeout = setTimeout(() => {
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }, msToNextSecond);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [examStarted, studentData, examData, examBlocked]);

  // Guardar respuestas pendientes al cambiar panel
  useEffect(() => {
    return () => {
      Object.entries(saveTimersRef.current).forEach(([preguntaIdStr, timer]) => {
        const preguntaId = Number(preguntaIdStr);
        clearTimeout(timer);
        if (answers[preguntaId] !== undefined) {
          saveAnswer(preguntaId, answers[preguntaId]);
        }
      });
      saveTimersRef.current = {};
    };
  }, [openPanels]);

  // ----------------------------------------------------------------------
  // 3. FUNCIONES DE ACCIÓN (StartExam, Save, Block)
  // ----------------------------------------------------------------------

  const addSecurityViolation = (violation: string) => {
    setSecurityViolations((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${violation}`]);
  };

  const saveAnswer = async (preguntaId: number, respuesta: any) => {
    if (!studentData?.attemptId) return;
    const respuestaStr = JSON.stringify(respuesta);
    if (lastSavedAnswers[preguntaId] === respuestaStr) return;

    setSavingStates((prev) => ({ ...prev, [preguntaId]: true }));
    try {
      const response = await fetch(`${ATTEMPTS_API_URL}/api/exam/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intento_id: studentData.attemptId,
          pregunta_id: preguntaId,
          respuesta: respuestaStr,
          fecha_respuesta: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Error al guardar respuesta");
      setLastSavedAnswers((prev) => ({ ...prev, [preguntaId]: respuestaStr }));
    } catch (error) {
      console.error("❌ Error guardando respuesta:", error);
    } finally {
      setSavingStates((prev) => ({ ...prev, [preguntaId]: false }));
    }
  };

  const handleAnswerChange = (preguntaId: number, respuesta: any, delayMs: number = 3000) => {
    setAnswers((prev) => ({ ...prev, [preguntaId]: respuesta }));
    if (saveTimersRef.current[preguntaId]) clearTimeout(saveTimersRef.current[preguntaId]);
    saveTimersRef.current[preguntaId] = window.setTimeout(() => {
      saveAnswer(preguntaId, respuesta);
      delete saveTimersRef.current[preguntaId];
    }, delayMs);
  };

  const mapReasonToEventType = (reason: string): string => {
    if (reason.includes("pantalla completa")) return "pantalla_completa_cerrada";
    if (reason.includes("combinación") || reason.includes("tecla")) return "combinacion_teclas_prohibida";
    if (reason.includes("foco")) return "foco_perdido";
    if (reason.includes("copiar") || reason.includes("pegar") || reason.includes("imprimir")) return "intento_copiar_pegar_imprimir";
    if (reason.includes("código")) return "manipulacion_codigo";
    if (reason.includes("pestaña")) return "pestana_cambiada";
    return "pestana_cambiada";
  };

  const blockExam = async (reason: string, severity: "INFO" | "WARNING" | "CRITICAL" = "CRITICAL") => {
    if (examBlocked) return;
    if (examData?.consecuencia === "ninguna") return;
    
    const tipoEvento = mapReasonToEventType(reason);
    addSecurityViolation(`[${severity}] ${reason}`);
    
    if (studentData?.attemptId) {
        try {
             await fetch(`${ATTEMPTS_API_URL}/api/exam/event`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    intento_id: studentData.attemptId,
                    tipo_evento: tipoEvento,
                    fecha_envio: new Date().toISOString(),
                }),
            });
        } catch(e) { console.error("Error enviando evento:", e) }
    }

    if (examData?.consecuencia === "notificar") return;
    setExamBlocked(true);
    setBlockReason(reason);
  };

  // Función para cerrar la página / salir
  const handleCloseApp = () => {
      try {
          window.close();
      } catch (e) {
          console.log("No se pudo cerrar la ventana automáticamente");
      }
      window.location.href = '/';
  };

  // Calcular preguntas sin responder
  const getUnansweredCount = () => {
      if (!examData?.questions || !Array.isArray(examData.questions)) return 0;
      let answered = 0;
      examData.questions.forEach((q: any) => {
          const ans = answers[q.id];
          if (ans) {
              if (Array.isArray(ans) && ans.length > 0) {
                   // Verificar si es fill_blanks que tenga al menos un campo lleno
                   if (q.type === 'fill_blanks') {
                       if (ans.some((s: string) => s && s.trim().length > 0)) answered++;
                   } else {
                       answered++;
                   }
              }
              else if (typeof ans === 'string' && ans.trim().length > 0) answered++;
          }
      });
      return examData.questions.length - answered;
  };

  // Lógica de entrega final
  const submitExam = async () => {
      setIsSubmitting(true);
      console.log("💾 Guardando respuestas pendientes antes de entregar...");
      const savePromises = Object.entries(saveTimersRef.current).map(async ([preguntaIdStr, timer]) => {
          const preguntaId = Number(preguntaIdStr);
          clearTimeout(timer);
          if (answers[preguntaId] !== undefined) await saveAnswer(preguntaId, answers[preguntaId]);
      });
      await Promise.all(savePromises);
      saveTimersRef.current = {};
      console.log("✅ Todas las respuestas guardadas, entregando examen...");
      
      if (studentData?.attemptId) {
          try {
              await fetch(`${ATTEMPTS_API_URL}/api/exam/attempt/${studentData.attemptId}/finish`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" }
              });
              // Mostrar pantalla de finalización
              setExamFinished(true);
              
              // Salir de pantalla completa
              if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
              }

              try {
                  window.close();
              } catch (e) { console.log("No se pudo cerrar automáticamente"); }
          } catch (error) { 
              console.error("Error:", error); 
              alert("Error al entregar el examen");
              setIsSubmitting(false);
          }
      } else {
          setIsSubmitting(false);
      }
  };

  // Función auxiliar para mezclar array (Fisher-Yates Shuffle)
  const shuffleArray = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // ✅ FUNCION startExam RESTAURADA COMPLETAMENTE
  const startExam = async () => {
    try {
      if (!studentData || !examData) {
        console.error("No hay datos del estudiante o examen");
        return;
      }

      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      if (widthDiff > 200 || heightDiff > 200) {
        alert("Por favor cierra las herramientas de desarrollador antes de iniciar el examen.");
        return;
      }

      const attemptPayload = {
        codigo_examen: studentData.examCode,
        nombre_estudiante: studentData.nombre || undefined,
        correo_estudiante: studentData.correoElectronico || undefined,
        identificacion_estudiante: studentData.codigoEstudiante || undefined,
        contrasena: studentData.contrasena || undefined,
      };

      console.log("🚀 Creando intento con:", attemptPayload);

      const res = await fetch(`${ATTEMPTS_API_URL}/api/exam/attempt/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attemptPayload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al crear intento");
      }

      const result = await res.json();
      const { attempt, examInProgress } = result;

      console.log("✅ Intento creado:", attempt);
      console.log("📘 Cargando preguntas del examen...");
      
      const examDetailsRes = await fetch(
        `${EXAMS_API_URL}/api/exams/forAttempt/${studentData.examCode}`
      );

      if (!examDetailsRes.ok) throw new Error("Error al cargar detalles del examen");

      const examDetails = await examDetailsRes.json();
      
      // Aleatorizar el orden de las preguntas
      if (examDetails.questions && Array.isArray(examDetails.questions)) {
        examDetails.questions = shuffleArray(examDetails.questions);
      }
      
      console.log("✅ Preguntas cargadas:", examDetails);

      setExamData(examDetails);

      const updatedStudentData: StudentData = {
        ...studentData,
        attemptId: attempt.id,
        codigo_acceso: examInProgress.codigo_acceso,
        id_sesion: examInProgress.id_sesion,
        fecha_expiracion: examInProgress.fecha_expiracion,
      };

      setStudentData(updatedStudentData);
      localStorage.setItem("studentData", JSON.stringify(updatedStudentData));

      const newSocket = io(ATTEMPTS_API_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      newSocket.on("connect", () => {
        console.log("✅ Conectado al WebSocket");
        // Re-join en cada conexión (incluye reconexiones)
        newSocket.emit("join_attempt", {
          attemptId: attempt.id,
          sessionId: examInProgress.id_sesion,
        });
      });

      newSocket.on("session_conflict", (data) => {
        blockExam(data.message, "CRITICAL");
        newSocket.disconnect();
      });
      newSocket.on("time_expired", () => {
        setExamFinished(true);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      });
      newSocket.on("fraud_detected", (data) => addSecurityViolation(`Fraude: ${data.tipo_evento}`));
      newSocket.on("attempt_blocked", (data) => { setExamBlocked(true); setBlockReason(data.message); });
      newSocket.on("attempt_unlocked", () => { setExamBlocked(false); setBlockReason(""); });
      newSocket.on("attempt_finished", () => {
        setExamFinished(true);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      });

      newSocket.on("forced_finish", (data) => {
        console.log("⚠️ Examen forzado a terminar por el profesor", data);
        setWasForced(true);
        setExamFinished(true);

        // Salir de pantalla completa
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        // Desconectar el socket
        newSocket.disconnect();
      });

      setSocket(newSocket);
      setExamStarted(true);
      
      // Resetear alertas de tiempo
      alertsShownRef.current = { warning: false, critical: false };
      setTimerStatus('normal');
      setTimerAlert(null);

      setOpenPanels(["exam"]);
      setPanelSizes([100]);
      setPanelZooms([100]);

      setTimeout(async () => {
        if (fullscreenRef.current) {
            try { await fullscreenRef.current.requestFullscreen(); } 
            catch (err) { addSecurityViolation("No se pudo activar pantalla completa"); }
        }
      }, 100);
    } catch (error: any) {
        console.error("❌ Error al iniciar examen:", error);
        alert(error.message || "Error al iniciar el examen");
    }
  };

  // ----------------------------------------------------------------------
  // 4. HANDLERS DE UI Y EVENTOS
  // ----------------------------------------------------------------------

  useEffect(() => {
    let fullscreenTimeout: ReturnType<typeof setTimeout>;
    const handleFullscreenChange = () => {
      clearTimeout(fullscreenTimeout);
      fullscreenTimeout = setTimeout(() => {
        if (examStarted && !document.fullscreenElement && !examBlocked && !isSubmitting && !examFinished) {
          blockExam("Salida de pantalla completa detectada", "CRITICAL");
        }
      }, 100);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!examStarted || examBlocked) return;
      const blockedKeys = ["F11", "F12", "F1", "F5", "PrintScreen"];
      if (e.metaKey || blockedKeys.includes(e.key)) {
        e.preventDefault();
        blockExam(`Tecla bloqueada: ${e.key}`, "CRITICAL");
      }
    };

    const handleVisibilityChange = () => {
      if (examStarted && document.hidden && !examBlocked && !isSubmitting && !examFinished) blockExam("Cambio de pestaña detectado", "CRITICAL");
    };

    const handleBlur = () => {
      if (examStarted && !examBlocked && !isSubmitting && !examFinished) blockExam("Pérdida de foco detectada", "CRITICAL");
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      clearTimeout(fullscreenTimeout);
    };
  }, [examStarted, examBlocked, isSubmitting, examFinished]);

  const handleEscapeFromBlock = () => {
    if (document.fullscreenElement) document.exitFullscreen();
  };

  const openPanel = (panelType: PanelType) => {
    const panelIndex = openPanels.indexOf(panelType);
    if (panelIndex !== -1) {
      closePanel(panelIndex);
      return;
    }

    // Lógica para reemplazar herramientas si ya hay una abierta
    const tools: PanelType[] = ["calculadora", "excel", "dibujo", "javascript", "python"];
    if (tools.includes(panelType)) {
      const existingToolIndex = openPanels.findIndex((p) => tools.includes(p));
      if (existingToolIndex !== -1) {
        let newPanels = [...openPanels];
        newPanels[existingToolIndex] = panelType;
        
        // Restricción Lienzo: Si hay dibujo, máximo 2 paneles para evitar bugs visuales
        if (newPanels.includes("dibujo") && newPanels.length > 2) {
             newPanels = [newPanels[0], panelType];
             setOpenPanels(newPanels);
             setPanelSizes(calculateOptimalSizes(newPanels));
             setPanelZooms([panelZooms[0], 100]);
             return;
        }

        setOpenPanels(newPanels);
        const newZooms = [...panelZooms];
        newZooms[existingToolIndex] = 100;
        setPanelZooms(newZooms);

        // Recalcular tamaños óptimos al cambiar de herramienta
        setPanelSizes(calculateOptimalSizes(newPanels));
        return;
      }
    }

    // Restricción Lienzo al agregar nuevo panel: Si ya hay 2 y uno es dibujo o el nuevo es dibujo -> Reemplazar el segundo
    if (openPanels.length >= 2 && (panelType === "dibujo" || openPanels.includes("dibujo"))) {
         const newPanels = [openPanels[0], panelType];
         setOpenPanels(newPanels);
         setPanelSizes(calculateOptimalSizes(newPanels));
         setPanelZooms([panelZooms[0], 100]);
         return;
    }

    if (openPanels.length >= 2) { alert("Máximo 2 paneles"); return; }
    const newPanels = [...openPanels, panelType];
    setOpenPanels(newPanels);
    
    // Calcular tamaños iniciales basados en los mínimos de cada panel
    setPanelSizes(calculateOptimalSizes(newPanels));
    setPanelZooms([...panelZooms, 100]);
  };

  const closePanel = (index: number) => {
    const newPanels = openPanels.filter((_, i) => i !== index);
    setOpenPanels(newPanels);
    setPanelSizes(newPanels.map(() => 100 / newPanels.length));
    setPanelZooms(panelZooms.filter((_, i) => i !== index));
  };

  const adjustPanelZoom = (index: number, delta: number) => {
    const newZooms = [...panelZooms];
    newZooms[index] = Math.max(50, Math.min(200, newZooms[index] + delta));
    setPanelZooms(newZooms);
  };

  const handleDragStart = (index: number) => setDraggedPanelIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); if (draggedPanelIndex !== null && draggedPanelIndex !== index) setDragOverIndex(index); };
  const handleDrop = (index: number) => { 
      if (draggedPanelIndex !== null && draggedPanelIndex !== index) {
        const newPanels = [...openPanels];
        const newSizes = [...panelSizes];
        const newZooms = [...panelZooms];

        [newPanels[draggedPanelIndex], newPanels[index]] = [newPanels[index], newPanels[draggedPanelIndex]];
        [newSizes[draggedPanelIndex], newSizes[index]] = [newSizes[index], newSizes[draggedPanelIndex]];
        [newZooms[draggedPanelIndex], newZooms[index]] = [newZooms[index], newZooms[draggedPanelIndex]];

        setOpenPanels(newPanels);
        setPanelSizes(newSizes);
        setPanelZooms(newZooms);
      }
      setDraggedPanelIndex(null); setDragOverIndex(null); 
  };
  
  const startResize = (index: number, e: React.MouseEvent) => {
    setIsResizing(true);
    setResizingIndex(index);
    setStartPos(layout === "vertical" ? e.clientX : e.clientY);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && resizingIndex !== null) {
        const currentPos = layout === "vertical" ? e.clientX : e.clientY;
        const containerSize = layout === "vertical" ? window.innerWidth - (sidebarCollapsed ? 80 : 256) : window.innerHeight; 
        const delta = ((currentPos - startPos) / containerSize) * 100;
        const newSizes = [...panelSizes];
        
        const minSizeLeft = getMinSize(openPanels[resizingIndex], openPanels.length);
        const minSizeRight = getMinSize(openPanels[resizingIndex + 1], openPanels.length);

        if (newSizes[resizingIndex] + delta >= minSizeLeft && newSizes[resizingIndex + 1] - delta >= minSizeRight) {
            newSizes[resizingIndex] += delta;
            newSizes[resizingIndex + 1] -= delta;
            setPanelSizes(newSizes);
            setStartPos(currentPos);
        }
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizingIndex, layout, sidebarCollapsed, panelSizes, openPanels]);

  // ----------------------------------------------------------------------
  // 5. RENDERIZADO DE PANELES - ✅ AQUÍ ESTÁN LAS HERRAMIENTAS INTEGRADAS
  // ----------------------------------------------------------------------
  
  const renderPanel = (panel: PanelType, zoomLevel: number = 100) => {
    switch (panel) {
        case "exam": 
          return <ExamPanel examData={examData} darkMode={darkMode} answers={answers} onAnswerChange={handleAnswerChange} />;
        
        case "answer": 
          return (
            <div className="h-full w-full">
              <EditorTexto 
                value={answerPanelContent} 
                onChange={setAnswerPanelContent} 
                darkMode={darkMode} 
                fullHeight={true} 
                maxLength={10000} 
              />
            </div>
          );
        
        case "calculadora": 
          return <Calculadora darkMode={darkMode} />;
        
        case "excel": 
          return <HojaCalculo darkMode={darkMode} />;
        
        case "dibujo": 
          return <Lienzo darkMode={darkMode} initialData={lienzoState} onSave={setLienzoState} />;
        
        case "javascript": 
          return (
            <EditorJavaScript 
              darkMode={darkMode} 
              initialCells={jsCells}
              onSave={(data) => setJsCells(data.cells)}
              zoomLevel={zoomLevel}
            />
          );
        
        case "python": 
          return (
            <EditorPython 
              darkMode={darkMode} 
              initialCells={pythonCells}
              onSave={(data) => setPythonCells(data.cells)}
              zoomLevel={zoomLevel}
            />
          );
        
        default: 
          return null;
    }
  };

  // ----------------------------------------------------------------------
  // 6. RENDERIZADO PRINCIPAL (Layout Dashboard)
  // ----------------------------------------------------------------------

  if (examFinished) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${darkMode ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900"}`}>
        <div className="text-center space-y-6 max-w-lg">
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${
              wasForced
                ? darkMode ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-600"
                : darkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-600"
            }`}>
                <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold">
              {wasForced ? "¡Examen Finalizado por el Profesor!" : "¡Examen Entregado!"}
            </h1>
            <p className={`text-lg ${darkMode ? "text-slate-400" : "text-gray-600"}`}>
                {wasForced
                  ? "El profesor ha finalizado el examen para todos los estudiantes. Tus respuestas han sido guardadas correctamente."
                  : "Tus respuestas han sido guardadas correctamente."
                }
                <br />
                Ya puedes cerrar esta ventana.
            </p>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className={`min-h-screen ${darkMode ? "bg-slate-900" : "bg-gray-50"}`}>
        <button onClick={toggleTheme} className={`fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg border ${darkMode ? "bg-slate-800 border-slate-700 text-yellow-400" : "bg-white border-gray-200 text-gray-600"}`}>
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <MonitoreoSupervisado darkMode={darkMode} onStartExam={startExam} />
      </div>
    );
  }

  if (examBlocked) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-red-900 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-10 text-center max-w-lg">
                <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4"/>
                <h1 className="text-2xl font-bold text-gray-900">Examen Bloqueado</h1>
                <p className="text-gray-600 mb-6">{blockReason}</p>
                <button onClick={handleEscapeFromBlock} className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold">Salir de Pantalla Completa</button>
            </div>
        </div>
    );
  }

  return (
    <div 
      ref={fullscreenRef} 
      className={`h-screen relative font-sans ${darkMode ? 'bg-slate-900' : 'bg-white'}`}
    >
      {/* Estilos de Scrollbar personalizados (Sincronizados con CrearExamen) */}
      <style>{`
          /* Estilos Base (Modo Día) */
          ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          ::-webkit-scrollbar-track {
            background: #f3f4f6;
          }
          ::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 5px;
            border: 2px solid #f3f4f6;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }
          * {
            scrollbar-width: thin;
            scrollbar-color: #d1d5db #f3f4f6;
          }

          /* Estilos Modo Noche (Overrides) */
          .dark ::-webkit-scrollbar-track {
            background: #0f172a;
          }
          .dark ::-webkit-scrollbar-thumb {
            background: #334155;
            border: 2px solid #0f172a;
          }
          .dark ::-webkit-scrollbar-thumb:hover {
            background: #475569;
          }
          .dark * {
            scrollbar-color: #334155 #0f172a;
          }
      `}</style>

      {/* --- MODALES DE CONFIRMACIÓN --- */}
      {showExitModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl transform transition-all scale-100 ${darkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-100"}`}>
                  <div className="flex flex-col items-center text-center gap-4">
                      <div className={`p-3 rounded-full ${darkMode ? "bg-red-900/30 text-red-400" : "bg-red-50 text-red-600"}`}>
                          <LogOut className="w-8 h-8" />
                      </div>
                      <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>¿Salir del examen?</h3>
                      <p className={`text-sm ${darkMode ? "text-slate-400" : "text-gray-600"}`}>
                          Si abandonas ahora, <strong>no se enviarán tus respuestas</strong> y perderás todo el progreso. ¿Estás seguro de que quieres salir?
                      </p>
                      <div className="flex gap-3 w-full mt-2">
                          <button onClick={() => setShowExitModal(false)} className={`flex-1 py-2.5 rounded-xl font-medium transition-colors ${darkMode ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"}`}>Cancelar</button>
                          <button onClick={handleCloseApp} className="flex-1 py-2.5 rounded-xl font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20">Sí, salir</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showSubmitModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl transform transition-all scale-100 ${darkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-100"}`}>
                  <div className="flex flex-col items-center text-center gap-4">
                      <div className={`p-3 rounded-full ${getUnansweredCount() > 0 ? (darkMode ? "bg-amber-900/30 text-amber-400" : "bg-amber-50 text-amber-600") : (darkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-600")}`}>
                          {getUnansweredCount() > 0 ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                      </div>
                      <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>¿Entregar examen?</h3>
                      
                      <div className={`text-sm ${darkMode ? "text-slate-400" : "text-gray-600"}`}>
                          {getUnansweredCount() > 0 ? (
                              <p>
                                  <span className="block text-amber-500 font-bold mb-1">¡Atención!</span>
                                  Te faltan <strong>{getUnansweredCount()} preguntas</strong> por contestar.
                                  <br/>¿Estás seguro de que deseas entregar así?
                              </p>
                          ) : (
                              <p>Has contestado todas las preguntas.<br/>¿Estás listo para finalizar?</p>
                          )}
                      </div>

                      <div className="flex gap-3 w-full mt-2">
                          <button onClick={() => setShowSubmitModal(false)} className={`flex-1 py-2.5 rounded-xl font-medium transition-colors ${darkMode ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"}`}>Revisar</button>
                          <button onClick={() => { setShowSubmitModal(false); submitExam(); }} className={`flex-1 py-2.5 rounded-xl font-medium text-white transition-colors shadow-lg ${getUnansweredCount() > 0 ? "bg-amber-600 hover:bg-amber-700 shadow-amber-900/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20"}`}>Sí, entregar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className={`absolute inset-0 backdrop-blur-sm transition-all duration-300 ${
        darkMode
          ? "bg-gradient-to-br from-gray-900/80 via-slate-900/70 to-gray-900/80"
          : "bg-white"
      }`}></div>

      <div className="relative z-10 h-full w-full flex overflow-hidden">
        <SavingIndicator savingStates={savingStates} darkMode={darkMode} />
        <TimerNotification alert={timerAlert} onClose={() => setTimerAlert(null)} darkMode={darkMode} />

        {/* --- SIDEBAR REFACTORIZADO (Estilo Dashboard) --- */}
        <div className={`relative z-30 flex flex-col transition-all duration-300 ease-in-out border-r ${
            sidebarCollapsed ? "w-20" : "w-64"
          } ${
            darkMode 
              ? "bg-slate-900/80 backdrop-blur-md border-slate-800" 
              : "bg-white border-gray-200"
          }`}>
          
          {/* Botón de contraer/expandir flotante en el borde (Estilo Pestaña) */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`absolute -right-2.5 top-1/2 transform -translate-y-1/2 z-50 flex items-center justify-center w-5 h-12 rounded-full shadow-md border transition-all duration-200 ${
              darkMode 
                ? "bg-slate-800 border-slate-700 text-gray-400 hover:text-white hover:bg-slate-700" 
                : "bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
            title={sidebarCollapsed ? "Expandir menú" : "Contraer menú"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
          
          {/* Header Sidebar */}
          <div className="p-4">
            <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 ${darkMode ? "bg-blue-900/50 text-blue-100" : "bg-slate-800"}`}>
                 <User className="w-5 h-5 text-white" />
              </div>
              {!sidebarCollapsed && (
                  <div className="overflow-hidden transition-all duration-300">
                      <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Candidato</p>
                      <p className={`font-bold text-sm truncate ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{studentData?.nombre || "Usuario"}</p>
                  </div>
              )}
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
              {!sidebarCollapsed && <p className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-gray-400"}`}>Evaluación</p>}
              
              <SidebarNavItem 
                  icon={FileText} 
                  label="Examen" 
                  active={openPanels.includes("exam")} 
                  collapsed={sidebarCollapsed} 
                  darkMode={darkMode} 
                  onClick={() => openPanel("exam")} 
              />
              {examData?.archivoPDF && (
                <SidebarNavItem
                    icon={Pencil}
                    label="Responder"
                    active={openPanels.includes("answer")}
                    collapsed={sidebarCollapsed}
                    darkMode={darkMode}
                    onClick={() => openPanel("answer")}
                />
              )}

              {!sidebarCollapsed && <p className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-gray-400"}`}>Herramientas</p>}
              
              {examData?.incluirCalculadoraCientifica && (
                  <SidebarNavItem icon={Calculator} label="Calculadora" active={openPanels.includes("calculadora")} collapsed={sidebarCollapsed} darkMode={darkMode} onClick={() => openPanel("calculadora")} />
              )}
              {examData?.incluirHojaExcel && (
                  <SidebarNavItem icon={FileSpreadsheet} label="Excel" active={openPanels.includes("excel")} collapsed={sidebarCollapsed} darkMode={darkMode} onClick={() => openPanel("excel")} />
              )}
              {examData?.incluirHerramientaDibujo && (
                  <SidebarNavItem icon={Pencil} label="Dibujo" active={openPanels.includes("dibujo")} collapsed={sidebarCollapsed} darkMode={darkMode} onClick={() => openPanel("dibujo")} />
              )}
              {examData?.incluirJavascript && (
                  <SidebarNavItem icon={Code} label="JavaScript" active={openPanels.includes("javascript")} collapsed={sidebarCollapsed} darkMode={darkMode} onClick={() => openPanel("javascript")} />
              )}
              {examData?.incluirPython && (
                  <SidebarNavItem icon={Code} label="Python" active={openPanels.includes("python")} collapsed={sidebarCollapsed} darkMode={darkMode} onClick={() => openPanel("python")} />
              )}
          </nav>

          {/* Footer Sidebar (Botones de acción) */}
          <div className={`p-3 space-y-2 ${darkMode ? "bg-slate-900/50" : "bg-gray-50/50"}`}>
              
              {/* Botón Entregar */}
              <button
                  onClick={() => setShowSubmitModal(true)}
                  className={`w-full flex items-center rounded-lg transition-all shadow-md group ${
                      sidebarCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3"
                  } bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white`}
                  title="Entregar Examen"
              >
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="font-bold text-sm">Entregar</span>}
              </button>

              {/* Botón Salir */}
              <div className={`${sidebarCollapsed ? "flex justify-center" : "px-1"}`}>
                   <button onClick={() => setShowExitModal(true)} className={`flex items-center rounded-lg p-2 transition-colors w-full ${sidebarCollapsed ? "justify-center" : "gap-3"} ${darkMode ? "text-red-400 hover:bg-red-900/20" : "text-red-600 hover:bg-red-50"}`}>
                      <LogOut className="w-5 h-5" />
                      {!sidebarCollapsed && <span className="text-sm font-medium">Salir</span>}
                   </button>
              </div>
          </div>
        </div>

        {/* --- ÁREA PRINCIPAL --- */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Header Superior Flotante */}
          <div className="h-24 px-6 flex items-center justify-between absolute top-0 left-0 right-0 z-20">
              {/* Left: Control Layout */}
              <div className={`flex p-1 rounded-lg ${darkMode ? "bg-slate-900/50 backdrop-blur-sm border border-slate-700" : "bg-white/50 backdrop-blur-sm border-gray-200/50 shadow-md"}`}>
                  <button onClick={() => setLayout("vertical")} className={`p-1.5 rounded ${layout === "vertical" ? (darkMode ? "bg-blue-900/50 text-blue-100 border border-blue-800/50" : "bg-slate-800 text-white shadow-sm") : (darkMode ? "text-slate-400" : "text-slate-400")}`}><Columns className="w-4 h-4"/></button>
                  <button onClick={() => setLayout("horizontal")} className={`p-1.5 rounded ${layout === "horizontal" ? (darkMode ? "bg-blue-900/50 text-blue-100 border border-blue-800/50" : "bg-slate-800 text-white shadow-sm") : (darkMode ? "text-slate-400" : "text-slate-400")}`}><Rows className="w-4 h-4"/></button>
              </div>

              {/* Right: Timer and logo */}
              <div className="flex items-center gap-4">
                  {/* Info Hora y Batería */}
                  <div className={`hidden md:flex items-center gap-5 px-5 py-2 rounded-xl border ${darkMode ? "bg-slate-900/50 backdrop-blur-sm border-slate-700" : "bg-white/50 backdrop-blur-sm border-gray-200/50 shadow-md"}`}>
                      <span className={`font-mono text-xl font-bold tracking-widest ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                          {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <div className={`w-px h-6 ${darkMode ? "bg-slate-700" : "bg-gray-300"}`}></div>
                      <div className={`flex items-center gap-2 font-mono text-lg font-bold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                          <span>{batteryLevel ?? "--"}%</span>
                          {isCharging ? (
                              <BatteryCharging className="w-6 h-6 text-emerald-500"/>
                          ) : (
                              <Battery className={`w-6 h-6 ${batteryLevel !== null && batteryLevel <= 20 ? "text-red-500 animate-pulse" : ""}`}/>
                          )}
                      </div>
                      <div className={`w-px h-6 ${darkMode ? "bg-slate-700" : "bg-gray-300"}`}></div>
                      <div className={`flex items-center gap-3 ${
                          timerStatus === 'critical' ? "text-red-500 animate-pulse" : 
                          timerStatus === 'warning' ? "text-amber-500" : 
                          (darkMode ? "text-blue-400" : "text-blue-700")
                      }`}>
                          <Clock className="w-5 h-5" />
                          <span className={`font-mono text-xl font-bold ${
                              timerStatus === 'critical' ? "text-red-500" : 
                              timerStatus === 'warning' ? "text-amber-500" : 
                              (darkMode ? "text-white" : "text-slate-800")
                          }`}>{remainingTime}</span>
                      </div>
                  </div>
                  
                  {/* Logo */}
                  <img
                    src={darkMode ? logoUniversidadNoche : logoUniversidad}
                    alt="Logo Universidad"
                    className="h-14 w-auto object-contain transition-opacity duration-300"
                  />
              </div>
          </div>

          {/* Contenedor de Paneles */}
          <div className={`flex-1 flex ${layout === "vertical" ? "flex-row" : "flex-col"} p-4 pt-24 gap-2 overflow-hidden`}>
              {openPanels.length === 0 ? (
                  <div className={`flex-1 flex flex-col items-center justify-center opacity-50 ${darkMode ? "text-slate-600" : "text-gray-300"}`}>
                      <LayoutGrid className="w-24 h-24 mb-4" />
                      <p className="text-xl font-medium">Selecciona una herramienta para comenzar</p>
                  </div>
              ) : (
                  openPanels.map((panel, index) => (
                      <React.Fragment key={panel}>
                          <div 
                              onDragOver={(e) => handleDragOver(e, index)} 
                              onDrop={() => handleDrop(index)}
                              style={{ [layout === "vertical" ? "width" : "height"]: `${panelSizes[index]}%` }}
                              className={`flex flex-col rounded-xl border shadow-sm overflow-hidden ${darkMode ? "bg-slate-900/80 backdrop-blur-md border-slate-800" : "bg-white border-gray-200"}`}
                          >
                              {/* Panel Header */}
                              <div 
                                draggable  
                                onDragStart={() => handleDragStart(index)}
                                className={`h-10 flex items-center justify-between px-4 border-b cursor-move ${darkMode ? "bg-blue-900/20 border-blue-800/30" : "bg-slate-800 border-slate-800"}`}
                              >
                                  <div className="flex items-center gap-2">
                                      <GripVertical className={`w-4 h-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
                                      <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-white"}`}>{panel}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                      {panel !== 'calculadora' && (
                                          <>
                                              <button onClick={() => adjustPanelZoom(index, -10)} className={`p-1 rounded ${darkMode ? "hover:bg-gray-200/20" : "hover:bg-white/10"}`}><Minimize2 className={`w-3 h-3 ${darkMode ? "text-gray-400" : "text-gray-300"}`}/></button>
                                              <button onClick={() => adjustPanelZoom(index, 10)} className={`p-1 rounded ${darkMode ? "hover:bg-gray-200/20" : "hover:bg-white/10"}`}><Maximize2 className={`w-3 h-3 ${darkMode ? "text-gray-400" : "text-gray-300"}`}/></button>
                                          </>
                                      )}
                                      <button onClick={() => closePanel(index)} className={`p-1 rounded ml-2 ${darkMode ? "hover:bg-red-500/10 text-gray-400 hover:text-red-500" : "hover:bg-red-500/20 text-gray-300 hover:text-red-400"}`}><X className="w-4 h-4"/></button>
                                  </div>
                              </div>
                              <div className="flex-1 overflow-hidden relative">
                                  <div 
                                    className="h-full w-full" 
                                    style={
                                      panel === 'python' || panel === 'javascript'
                                        ? {} // Sin zoom para editores persistentes
                                        : { transform: `scale(${panelZooms[index] / 100})`, transformOrigin: "top left", width: `${10000/panelZooms[index]}%`, height: `${10000/panelZooms[index]}%` }
                                    }
                                  >
                                      {renderPanel(panel, panelZooms[index])}
                                  </div>
                              </div>
                          </div>
                          {index < openPanels.length - 1 && panel !== 'calculadora' && openPanels[index + 1] !== 'calculadora' && !((panel === 'exam' && openPanels[index + 1] === 'dibujo') || (panel === 'dibujo' && openPanels[index + 1] === 'exam')) && (
                              <div onMouseDown={(e) => startResize(index, e)} className={`${layout === "vertical" ? "w-2 cursor-col-resize" : "h-2 cursor-row-resize"} transition-all z-20 flex-shrink-0 rounded-full ${darkMode ? "bg-slate-700 hover:bg-blue-500" : "bg-gray-200 hover:bg-blue-400"}`} />
                          )}
                      </React.Fragment>
                  ))
              )}
          </div>
        </div>
        {/* Botón de tema flotante */}
        <button
          onClick={toggleTheme}
          className={`fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-300 border ${
            darkMode
              ? "bg-slate-800/90 backdrop-blur-md text-yellow-400 hover:bg-slate-700/90 border-slate-700"
              : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
          }`}
          title={darkMode ? "Cambiar a modo día" : "Cambiar a modo noche"}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTE NAV ITEM (Estilo Dashboard) ---
function SidebarNavItem({ icon: Icon, label, active, collapsed, darkMode, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center rounded-lg text-sm transition-all duration-200 group ${
                collapsed ? "justify-center p-2" : "px-3 py-2.5 gap-3"
            } ${
                active
                    ? darkMode
                        ? "bg-blue-900/30 text-blue-100 border border-blue-800/50"
                        : "bg-slate-800 text-white shadow-md"
                    : darkMode
                        ? "text-gray-400 hover:bg-slate-800 hover:text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
            title={collapsed ? label : ""}
        >
            <div className={`relative flex-shrink-0 transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-105"}`}>
                <Icon className="w-5 h-5" />
            </div>
            {!collapsed && (
                <span className="font-medium truncate transition-opacity duration-300">
                    {label}
                </span>
            )}
        </button>
    );
}