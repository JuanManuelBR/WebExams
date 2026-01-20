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
  AlertTriangle,
  Battery,
  BatteryCharging,
  GripVertical,
  Lock,
  Shield,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
interface StudentData {
  nombre?: string;
  correoElectronico?: string;
  codigoEstudiante?: string;

  // Se llenan DESPUÉS de iniciar intento
  attemptId?: number;
  codigo_acceso?: string;
  id_sesion?: string;
  fecha_expiracion?: string | null;

  examCode: string;
  startTime: string;
}

interface ExamData {
  nombre: string;
  nombreProfesor: string;
  limiteTiempo: number;
  incluirHerramientaDibujo: boolean;
  incluirCalculadoraCientifica: boolean;
  incluirHojaExcel: boolean;
  incluirJavascript: boolean;
  incluirPython: boolean;
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

export default function SecureExamPlatform() {
  const [examStarted, setExamStarted] = useState(false);
  const [examBlocked, setExamBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [remainingTime, setRemainingTime] = useState("02:30:00");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [multipleScreens, setMultipleScreens] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const [openPanels, setOpenPanels] = useState<PanelType[]>([]);
  const [layout, setLayout] = useState<Layout>("vertical");
  const [panelSizes, setPanelSizes] = useState<number[]>([]);
  const [panelZooms, setPanelZooms] = useState<number[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const [startPos, setStartPos] = useState(0);

  const [draggedPanelIndex, setDraggedPanelIndex] = useState<number | null>(
    null,
  );
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [securityViolations, setSecurityViolations] = useState<string[]>([]);

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const integrityCheckRef = useRef<number>(0);

  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [examData, setExamData] = useState<ExamData | null>(null);

  useEffect(() => {
    const storedStudentData = localStorage.getItem("studentData");

    if (storedStudentData) {
      const parsedStudent = JSON.parse(storedStudentData);
      setStudentData(parsedStudent);

      // 🔹 Llamar al endpoint real del examen
      fetch(
        `http://localhost:3001/api/exams/forAttempt/${parsedStudent.examCode}`,
      )
        .then((res) => {
          if (!res.ok) throw new Error("Error al cargar examen");
          return res.json();
        })
        .then((data) => {
          console.log("📘 Examen recibido del backend:", data);
          setExamData(data);
        })
        .catch((err) => {
          console.error("❌ Error cargando examen:", err);
        });
    }
  }, []);

  useEffect(() => {
    integrityCheckRef.current = Math.random();

    if (!examStarted || examBlocked) return;

    const checkIntegrity = setInterval(() => {
      if (examStarted && !examBlocked) {
        const elements = document.querySelectorAll("[data-protected]");
        elements.forEach((el) => {
          if (
            el.getAttribute("data-integrity") !==
            integrityCheckRef.current.toString()
          ) {
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

  useEffect(() => {
    if (examStarted) {
      const style = document.createElement("style");
      style.innerHTML = `
        * {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        textarea, input {
          user-select: text !important;
          -webkit-user-select: text !important;
        }
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

      document.addEventListener("copy", preventCopy);
      document.addEventListener("cut", preventCut);
      window.addEventListener("beforeprint", preventPrint);

      return () => {
        document.head.removeChild(style);
        document.removeEventListener("copy", preventCopy);
        document.removeEventListener("cut", preventCut);
        window.removeEventListener("beforeprint", preventPrint);
      };
    }
  }, [examStarted]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

    if (typeof window !== "undefined" && "screen" in window) {
      const hasMultipleScreens =
        window.screen.availWidth > window.screen.width * 1.5;
      setMultipleScreens(hasMultipleScreens);
    }
  }, [examStarted]);

  useEffect(() => {
    if (!examStarted || !studentData || !examData) return;

    const interval = setInterval(() => {
      const start = new Date(studentData.startTime);
      const now = new Date();
      const diff = now.getTime() - start.getTime();
      const totalDuration = examData.limiteTiempo * 60 * 1000;
      const remaining = totalDuration - diff;

      if (remaining <= 0) {
        setRemainingTime("00:00:00");
        blockExam("Tiempo finalizado", "INFO");
        return;
      }

      const remHours = Math.floor(remaining / (1000 * 60 * 60));
      const remMinutes = Math.floor(
        (remaining % (1000 * 60 * 60)) / (1000 * 60),
      );
      const remSeconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setRemainingTime(
        `${String(remHours).padStart(2, "0")}:${String(remMinutes).padStart(2, "0")}:${String(remSeconds).padStart(2, "0")}`,
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [examStarted, studentData, examData]);

  const addSecurityViolation = (violation: string) => {
    setSecurityViolations((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${violation}`,
    ]);
  };

  const blockExam = (
    reason: string,
    severity: "INFO" | "WARNING" | "CRITICAL" = "CRITICAL",
  ) => {
    if (examBlocked) return;
    setExamBlocked(true);
    setBlockReason(reason);
    addSecurityViolation(`[${severity}] ${reason}`);
  };

  const startExam = async () => {
    try {
      if (!studentData || !examData) {
        console.error("No hay datos del estudiante o examen");
        return;
      }

      // 🟢 1. Crear intento en el backend
      const attemptPayload = {
        codigo_examen: studentData.examCode,
        nombre_estudiante: studentData.nombre || undefined,
        correo_estudiante: studentData.correoElectronico || undefined,
        identificacion_estudiante: studentData.codigoEstudiante || undefined,
      };

      console.log("🚀 Creando intento con:", attemptPayload);

      const res = await fetch("http://localhost:3002/api/exam/attempt/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(attemptPayload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al crear intento");
      }

      const result = await res.json();

      const { attempt, examInProgress } = result;

      console.log("✅ Intento creado:", attempt);
      console.log("⏳ Exam en progreso:", examInProgress);

      // 🟢 2. Actualizar studentData con datos del intento
      const updatedStudentData: StudentData = {
        ...studentData,
        attemptId: attempt.id,
        codigo_acceso: examInProgress.codigo_acceso,
        id_sesion: examInProgress.id_sesion,
        fecha_expiracion: examInProgress.fecha_expiracion,
      };

      setStudentData(updatedStudentData);
      localStorage.setItem("studentData", JSON.stringify(updatedStudentData));

      // 🟢 3. Conectar al WebSocket YA con attempt válido
      const newSocket = io("http://localhost:3002", {
        transports: ["websocket", "polling"],
      });

      newSocket.on("connect", () => {
        console.log("✅ Conectado al WebSocket");

        newSocket.emit("join_attempt", {
          attemptId: attempt.id,
          sessionId: examInProgress.id_sesion,
        });
      });

      newSocket.on("joined_attempt", (data) => {
        console.log("✅ Unido al intento:", data);
      });

      newSocket.on("error", (error) => {
        console.error("❌ Error en WebSocket:", error);
        blockExam(error.message, "CRITICAL");
      });

      newSocket.on("session_conflict", (data) => {
        console.error("⚠️ Conflicto de sesión:", data);
        blockExam(data.message, "CRITICAL");
        newSocket.disconnect();
      });

      newSocket.on("time_expired", (data) => {
        console.log("⏰ Tiempo expirado:", data);
        blockExam("El tiempo del examen ha expirado", "INFO");
      });

      newSocket.on("timer_tick", (data) => {
        const seconds = data.remainingTimeSeconds;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        setRemainingTime(
          `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
            2,
            "0",
          )}:${String(secs).padStart(2, "0")}`,
        );
      });

      newSocket.on("fraud_detected", (data) => {
        console.log("🚨 Fraude detectado:", data);
        addSecurityViolation(`Fraude detectado: ${data.tipo_evento}`);
      });

      newSocket.on("attempt_blocked", (data) => {
        console.log("🔒 Intento bloqueado:", data);
        blockExam(data.message, "CRITICAL");
      });

      newSocket.on("attempt_unlocked", (data) => {
        console.log("🔓 Intento desbloqueado:", data);
        setExamBlocked(false);
        setBlockReason("");
      });

      newSocket.on("attempt_finished", (data) => {
        console.log("✅ Intento finalizado:", data);
        blockExam(
          `Examen finalizado. Puntaje: ${data.puntaje}/${data.puntajeMaximo}`,
          "INFO",
        );
      });

      setSocket(newSocket);

      // 🟢 4. Ahora sí: marcar examen como iniciado
      setExamStarted(true);
      setOpenPanels(["exam"]);
      setPanelSizes([100]);
      setPanelZooms([100]);

      // Pantalla completa
      setTimeout(async () => {
        if (fullscreenRef.current) {
          try {
            await fullscreenRef.current.requestFullscreen();
          } catch (err) {
            addSecurityViolation("No se pudo activar pantalla completa");
          }
        }
      }, 100);
    } catch (error: any) {
      console.error("❌ Error al iniciar examen:", error);
      alert(error.message || "Error al iniciar el examen");
    }
  };

  useEffect(() => {
    let fullscreenTimeout: ReturnType<typeof setTimeout>;

    const handleFullscreenChange = () => {
      clearTimeout(fullscreenTimeout);
      fullscreenTimeout = setTimeout(() => {
        if (examStarted && !document.fullscreenElement && !examBlocked) {
          blockExam("Salida de pantalla completa detectada", "CRITICAL");
        }
      }, 100);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!examStarted || examBlocked) return;

      const blockedKeys = [
        "F11",
        "F12",
        "F1",
        "F2",
        "F3",
        "F4",
        "F5",
        "F6",
        "F7",
        "F8",
        "F9",
        "F10",
        "PrintScreen",
        "Print",
      ];

      if (e.metaKey || e.key === "Meta") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        blockExam("Tecla Windows/Command bloqueada", "CRITICAL");
        return false;
      }

      const isBlockedCombo =
        e.key === "Escape" ||
        (e.ctrlKey && e.key === "w") ||
        (e.ctrlKey && e.key === "r") ||
        (e.ctrlKey && e.shiftKey && e.key === "r") ||
        (e.altKey && e.key === "F4") ||
        (e.ctrlKey && e.key === "q") ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.ctrlKey && e.shiftKey && e.key === "C") ||
        (e.ctrlKey && e.key === "u") ||
        (e.ctrlKey && e.key === "p") ||
        (e.ctrlKey && e.key === "s") ||
        e.key === "PrintScreen" ||
        blockedKeys.includes(e.key) ||
        (e.altKey && e.key === "Tab");

      if (isBlockedCombo) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const keyCombo = `${e.key}${e.ctrlKey ? "+Ctrl" : ""}${e.altKey ? "+Alt" : ""}${e.shiftKey ? "+Shift" : ""}`;
        blockExam(`Combinación bloqueada: ${keyCombo}`, "CRITICAL");
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (examStarted && !examBlocked) {
        e.preventDefault();
        addSecurityViolation("Intento de menú contextual");
      }
    };

    const handleVisibilityChange = () => {
      if (examStarted && document.hidden && !examBlocked) {
        blockExam("Cambio de pestaña detectado", "CRITICAL");
      }
    };

    const handleBlur = () => {
      if (examStarted && !examBlocked) {
        blockExam("Pérdida de foco detectada", "CRITICAL");
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (examStarted && !examBlocked) {
        e.preventDefault();
        e.returnValue = "El examen está en progreso.";
        blockExam("Intento de cerrar página", "CRITICAL");
        return e.returnValue;
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearTimeout(fullscreenTimeout);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [examStarted, examBlocked]);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
        console.log("🔌 Socket desconectado");
      }
    };
  }, [socket]);

  const handleEscapeFromBlock = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedPanelIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedPanelIndex !== null && draggedPanelIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (index: number) => {
    if (draggedPanelIndex !== null && draggedPanelIndex !== index) {
      const newPanels = [...openPanels];
      const newSizes = [...panelSizes];
      const newZooms = [...panelZooms];

      [newPanels[draggedPanelIndex], newPanels[index]] = [
        newPanels[index],
        newPanels[draggedPanelIndex],
      ];
      [newSizes[draggedPanelIndex], newSizes[index]] = [
        newSizes[index],
        newSizes[draggedPanelIndex],
      ];
      [newZooms[draggedPanelIndex], newZooms[index]] = [
        newZooms[index],
        newZooms[draggedPanelIndex],
      ];

      setOpenPanels(newPanels);
      setPanelSizes(newSizes);
      setPanelZooms(newZooms);
    }
    setDraggedPanelIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedPanelIndex(null);
    setDragOverIndex(null);
  };

  const openPanel = (panel: PanelType) => {
    const toolPanels: PanelType[] = [
      "dibujo",
      "calculadora",
      "excel",
      "javascript",
      "python",
    ];
    const isToolPanel = toolPanels.includes(panel);

    const panelIndex = openPanels.indexOf(panel);
    if (panelIndex !== -1) {
      closePanel(panelIndex);
      return;
    }

    let newPanels = [...openPanels];

    if (isToolPanel) {
      const toolIndex = newPanels.findIndex((p) => toolPanels.includes(p));
      if (toolIndex !== -1) {
        newPanels[toolIndex] = panel;
      } else {
        newPanels.push(panel);
      }
    } else {
      if (newPanels.length >= 3) return;
      newPanels.push(panel);
    }

    setOpenPanels(newPanels);

    const equalSize = 100 / newPanels.length;
    setPanelSizes(new Array(newPanels.length).fill(equalSize));
    setPanelZooms(new Array(newPanels.length).fill(100));
  };

  const closePanel = (index: number) => {
    const newPanels = openPanels.filter((_, i) => i !== index);
    setOpenPanels(newPanels);

    if (newPanels.length > 0) {
      const equalSize = 100 / newPanels.length;
      setPanelSizes(new Array(newPanels.length).fill(equalSize));

      const newZooms = panelZooms.filter((_, i) => i !== index);
      setPanelZooms(newZooms);
    } else {
      setPanelSizes([]);
      setPanelZooms([]);
    }
  };

  const adjustPanelZoom = (index: number, delta: number) => {
    const newZooms = [...panelZooms];
    newZooms[index] = Math.max(50, Math.min(200, newZooms[index] + delta));
    setPanelZooms(newZooms);
  };

  const startResize = (index: number, e: React.MouseEvent) => {
    if (openPanels.length < 2) return;
    e.preventDefault();
    setIsResizing(true);
    setResizingIndex(index);
    setStartPos(layout === "vertical" ? e.clientX : e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || resizingIndex === null) return;

      const currentPos = layout === "vertical" ? e.clientX : e.clientY;
      const container = fullscreenRef.current;
      if (!container) return;

      const containerSize =
        layout === "vertical"
          ? container.clientWidth - 256
          : container.clientHeight - 56;
      const delta = ((currentPos - startPos) / containerSize) * 100;

      const newSizes = [...panelSizes];
      const nextIndex = resizingIndex + 1;

      if (nextIndex < openPanels.length) {
        const newSize1 = Math.max(
          15,
          Math.min(70, newSizes[resizingIndex] + delta),
        );
        const newSize2 = Math.max(
          15,
          Math.min(70, newSizes[nextIndex] - delta),
        );

        newSizes[resizingIndex] = newSize1;
        newSizes[nextIndex] = newSize2;

        setPanelSizes(newSizes);
        setStartPos(currentPos);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizingIndex(null);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isResizing,
    resizingIndex,
    startPos,
    panelSizes,
    layout,
    openPanels.length,
  ]);

  const renderPanel = (panel: PanelType) => {
    const bgColor = darkMode ? "#1a1f2e" : "#ffffff";
    const textColor = darkMode ? "#e5e7eb" : "#1f2937";

    switch (panel) {
      case "exam":
        return (
          <div
            className="h-full overflow-auto p-6"
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h2
                  className="text-3xl font-bold mb-2"
                  style={{
                    fontFamily: '"Georgia", serif',
                    color: darkMode ? "#fbbf24" : "#d97706",
                  }}
                >
                  FINAL YEAR EXAMINATION 2020
                </h2>
                <h3
                  className="text-xl font-semibold"
                  style={{ color: darkMode ? "#60a5fa" : "#2563eb" }}
                >
                  PHYSICS - PAPER 2 - FORM 4
                </h3>
                <p className="text-lg mt-2 opacity-80">2 HOURS & 30 MINUTES</p>
              </div>

              <div
                className="border-t-4 border-b-4 my-6 py-6"
                style={{
                  borderColor: darkMode ? "#fbbf24" : "#d97706",
                }}
              >
                <p
                  className="text-center font-bold text-lg tracking-wide"
                  style={{
                    fontFamily: '"Georgia", serif',
                  }}
                >
                  PLEASE DO NOT OPEN THIS PAPER UNTIL TOLD TO DO SO
                </p>
              </div>

              <div
                className="space-y-4 mt-6 leading-relaxed"
                style={{
                  fontFamily: '"Georgia", serif',
                }}
              >
                <p>
                  <strong>1.</strong> This question paper consists of three
                  sections: Section A, Section B and Section C.
                </p>
                <p>
                  <strong>2.</strong> Answer all questions in Section A. Write
                  your answers for Section A in the spaces provided in the
                  question paper.
                </p>
                <p>
                  <strong>3.</strong> Write your answers for Section B and
                  Section C in the answer booklet provided.
                </p>
              </div>
            </div>
          </div>
        );
      case "answer":
        return (
          <div className="h-full p-4">
            <textarea
              className="w-full h-full p-4 rounded-lg resize-none transition-colors focus:outline-none focus:ring-2"
              style={{
                backgroundColor: darkMode ? "#1a1f2e" : "#ffffff",
                color: darkMode ? "#e5e7eb" : "#1f2937",
                border: `2px solid ${darkMode ? "#374151" : "#d1d5db"}`,
                fontFamily: '"Georgia", serif',
                fontSize: "16px",
                lineHeight: "1.6",
              }}
              placeholder="Escriba sus respuestas aquí..."
            />
          </div>
        );
      case "calculadora":
        return (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-center" style={{ color: textColor }}>
              <div
                className="inline-block p-6 rounded-2xl mb-4"
                style={{
                  backgroundColor: darkMode ? "#374151" : "#f3f4f6",
                }}
              >
                <Calculator
                  className="w-16 h-16"
                  style={{ color: darkMode ? "#fbbf24" : "#d97706" }}
                />
              </div>
              <p className="text-xl font-semibold mb-2">
                Calculadora Científica
              </p>
              <p className="text-sm opacity-60">(En desarrollo)</p>
            </div>
          </div>
        );
      case "dibujo":
        return (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-center" style={{ color: textColor }}>
              <div
                className="inline-block p-6 rounded-2xl mb-4"
                style={{
                  backgroundColor: darkMode ? "#374151" : "#f3f4f6",
                }}
              >
                <Pencil
                  className="w-16 h-16"
                  style={{ color: darkMode ? "#60a5fa" : "#2563eb" }}
                />
              </div>
              <p className="text-xl font-semibold mb-2">
                Herramienta de Dibujo
              </p>
              <p className="text-sm opacity-60">(En desarrollo)</p>
            </div>
          </div>
        );
      case "excel":
        return (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-center" style={{ color: textColor }}>
              <div
                className="inline-block p-6 rounded-2xl mb-4"
                style={{
                  backgroundColor: darkMode ? "#374151" : "#f3f4f6",
                }}
              >
                <FileSpreadsheet
                  className="w-16 h-16"
                  style={{ color: darkMode ? "#34d399" : "#059669" }}
                />
              </div>
              <p className="text-xl font-semibold mb-2">Hoja de Excel</p>
              <p className="text-sm opacity-60">(En desarrollo)</p>
            </div>
          </div>
        );
      case "javascript":
      case "python":
        return (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-center" style={{ color: textColor }}>
              <div
                className="inline-block p-6 rounded-2xl mb-4"
                style={{
                  backgroundColor: darkMode ? "#374151" : "#f3f4f6",
                }}
              >
                <Code
                  className="w-16 h-16"
                  style={{ color: darkMode ? "#a78bfa" : "#7c3aed" }}
                />
              </div>
              <p className="text-xl font-semibold mb-2">
                Editor {panel === "javascript" ? "JavaScript" : "Python"}
              </p>
              <p className="text-sm opacity-60">(En desarrollo)</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!examStarted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #003876 0%, #00508f 100%)",
        }}
      >
        <div
          className="rounded-2xl shadow-2xl max-w-4xl w-full p-10 relative z-10"
          style={{
            backgroundColor: "#ffffff",
          }}
        >
          <div
            className="flex items-center gap-4 mb-8 pb-6 border-b-2"
            style={{
              borderColor: "#e5e7eb",
            }}
          >
            <div
              className="p-4 rounded-2xl"
              style={{
                backgroundColor: "#003876",
              }}
            >
              <Shield className="w-12 h-12 text-white" />
            </div>
            <div>
              <h1
                className="text-3xl font-bold mb-1"
                style={{
                  color: "#003876",
                }}
              >
                Sistema de Exámenes Seguros
              </h1>
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "14px",
                }}
              >
                Universidad de Ibagué - Plataforma de Evaluación
              </p>
            </div>
          </div>

          <div
            className="space-y-3 mb-8 p-6 rounded-xl"
            style={{
              backgroundColor: "#f0f9ff",
              border: "1px solid #bfdbfe",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#003876" }}
              ></div>
              <p className="text-base">
                <strong style={{ color: "#1f2937" }}>Nombre del examen:</strong>
                <span className="ml-2" style={{ color: "#4b5563" }}>
                  {examData?.nombre || "Cargando..."}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#003876" }}
              ></div>
              <p className="text-base">
                <strong style={{ color: "#1f2937" }}>Profesor:</strong>
                <span className="ml-2" style={{ color: "#4b5563" }}>
                  {examData?.nombreProfesor || "Cargando..."}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#003876" }}
              ></div>
              <p className="text-base">
                <strong style={{ color: "#1f2937" }}>Duración:</strong>
                <span className="ml-2" style={{ color: "#4b5563" }}>
                  {examData?.limiteTiempo || 0} minutos
                </span>
              </p>
            </div>
          </div>

          <div
            className="border-l-4 p-5 rounded-r-xl mb-6"
            style={{
              borderColor: "#dc2626",
              backgroundColor: "#fef2f2",
            }}
          >
            <div className="flex items-start gap-4">
              <AlertTriangle
                className="w-7 h-7 flex-shrink-0 mt-0.5"
                style={{ color: "#dc2626" }}
              />
              <div>
                <h3
                  className="font-bold text-base mb-3"
                  style={{
                    color: "#991b1b",
                  }}
                >
                  Medidas de Seguridad Activas
                </h3>
                <ul
                  className="text-sm space-y-2"
                  style={{
                    color: "#7f1d1d",
                  }}
                >
                  <li className="flex items-start gap-2">
                    <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Pantalla completa OBLIGATORIA</strong> - Salir
                      bloqueará el examen
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Detección de cambio de pestañas o aplicaciones</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Registro de todas las violaciones de seguridad</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Bloqueo automático ante comportamiento sospechoso
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {multipleScreens && (
            <div
              className="border-l-4 p-5 rounded-r-xl mb-6"
              style={{
                borderColor: "#f59e0b",
                backgroundColor: "#fffbeb",
              }}
            >
              <div className="flex items-start gap-4">
                <AlertTriangle
                  className="w-7 h-7 flex-shrink-0 mt-0.5"
                  style={{ color: "#f59e0b" }}
                />
                <div>
                  <h3
                    className="font-bold text-base mb-2"
                    style={{ color: "#92400e" }}
                  >
                    ⚠️ Múltiples Pantallas Detectadas
                  </h3>
                  <p className="text-sm" style={{ color: "#78350f" }}>
                    Usar otra pantalla durante el examen será considerado trampa
                    y puede resultar en anulación.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={startExam}
            className="w-full font-semibold py-4 px-6 rounded-xl text-base transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            style={{
              backgroundColor: "#003876",
              color: "white",
            }}
          >
            Iniciar Examen Seguro
          </button>

          <p className="text-center text-sm mt-4" style={{ color: "#6b7280" }}>
            Al iniciar, acepta las condiciones de seguridad e integridad
            académica
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={fullscreenRef}
      className="h-screen flex overflow-hidden relative"
      data-protected="true"
      data-integrity={integrityCheckRef.current}
      style={{
        backgroundColor: darkMode ? "#0f172a" : "#f8fafc",
        transition: "background-color 0.3s ease",
      }}
    >
      {examBlocked && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-10 m-4 border-t-8 border-red-600">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-full p-6 shadow-lg">
                <AlertTriangle className="w-20 h-20 text-white" />
              </div>
            </div>

            <h2
              className="text-3xl font-bold text-gray-900 mb-6 text-center"
              style={{
                fontFamily: '"Georgia", serif',
              }}
            >
              Examen Bloqueado
            </h2>

            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-2xl p-6 mb-6 shadow-inner">
              <p className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Razón del bloqueo:
              </p>
              <p className="text-red-800 font-medium text-lg">{blockReason}</p>
            </div>

            {securityViolations.length > 0 && (
              <div className="bg-gray-50 border border-gray-300 rounded-2xl p-6 mb-6 max-h-48 overflow-y-auto">
                <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Violaciones registradas ({securityViolations.length}):
                </p>
                <ul className="text-xs text-gray-700 space-y-1 font-mono">
                  {securityViolations
                    .slice(-10)
                    .reverse()
                    .map((violation, idx) => (
                      <li
                        key={idx}
                        className="pb-1 border-b border-gray-200 last:border-0"
                      >
                        {violation}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <p className="text-gray-700 text-center mb-8 leading-relaxed">
              Contacte a su profesor{" "}
              <strong>{examData?.nombreProfesor || "su profesor"}</strong>{" "}
              inmediatamente.
            </p>

            <button
              onClick={handleEscapeFromBlock}
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl"
            >
              Salir del Examen
            </button>
          </div>
        </div>
      )}

      <div
        className="w-64 flex flex-col shadow-2xl"
        style={{
          backgroundColor: darkMode ? "#1e293b" : "#003876",
          borderRight: `1px solid ${darkMode ? "#334155" : "#00508f"}`,
          transition: "all 0.3s ease",
        }}
      >
        <div
          className="p-5 border-b"
          style={{
            borderColor: darkMode ? "#334155" : "#00508f",
            background: darkMode
              ? "linear-gradient(135deg, #1e293b 0%, #334155 100%)"
              : "linear-gradient(135deg, #003876 0%, #00508f 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-xl"
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
              }}
            >
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg text-white">
                {studentData?.nombre || "Estudiante"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <button
            onClick={() => openPanel("exam")}
            className="w-full px-5 py-4 text-left transition-all flex items-center gap-3 group text-white"
            style={{
              backgroundColor: openPanels.includes("exam")
                ? darkMode
                  ? "#334155"
                  : "#00508f"
                : "transparent",
            }}
          >
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <span className="font-medium">Ver Examen</span>
          </button>

          <button
            onClick={() => openPanel("answer")}
            className="w-full px-5 py-4 text-left transition-all flex items-center gap-3 group text-white"
            style={{
              backgroundColor: openPanels.includes("answer")
                ? darkMode
                  ? "#334155"
                  : "#00508f"
                : "transparent",
            }}
          >
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <span className="font-medium">Responder</span>
          </button>

          <div
            className="mt-6 px-5 py-3 text-xs font-bold tracking-wider"
            style={{ color: darkMode ? "#94a3b8" : "#bfdbfe" }}
          >
            HERRAMIENTAS
          </div>

          {examData?.incluirHerramientaDibujo && (
            <button
              onClick={() => openPanel("dibujo")}
              className="w-full px-5 py-4 text-left transition-all flex items-center gap-3 group text-white"
              style={{
                backgroundColor: openPanels.includes("dibujo")
                  ? darkMode
                    ? "#334155"
                    : "#00508f"
                  : "transparent",
              }}
            >
              <Pencil className="w-5 h-5" />
              <span className="font-medium">Dibujo</span>
            </button>
          )}

          {examData?.incluirCalculadoraCientifica && (
            <button
              onClick={() => openPanel("calculadora")}
              className="w-full px-5 py-4 text-left transition-all flex items-center gap-3 group text-white"
              style={{
                backgroundColor: openPanels.includes("calculadora")
                  ? darkMode
                    ? "#334155"
                    : "#00508f"
                  : "transparent",
              }}
            >
              <Calculator className="w-5 h-5" />
              <span className="font-medium">Calculadora</span>
            </button>
          )}

          {examData?.incluirHojaExcel && (
            <button
              onClick={() => openPanel("excel")}
              className="w-full px-5 py-4 text-left transition-all flex items-center gap-3 group text-white"
              style={{
                backgroundColor: openPanels.includes("excel")
                  ? darkMode
                    ? "#334155"
                    : "#00508f"
                  : "transparent",
              }}
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span className="font-medium">Excel</span>
            </button>
          )}

          {examData?.incluirJavascript && (
            <button
              onClick={() => openPanel("javascript")}
              className="w-full px-5 py-4 text-left transition-all flex items-center gap-3 group text-white"
              style={{
                backgroundColor: openPanels.includes("javascript")
                  ? darkMode
                    ? "#334155"
                    : "#00508f"
                  : "transparent",
              }}
            >
              <Code className="w-5 h-5" />
              <span className="font-medium">JavaScript</span>
            </button>
          )}

          {examData?.incluirPython && (
            <button
              onClick={() => openPanel("python")}
              className="w-full px-5 py-4 text-left transition-all flex items-center gap-3 group text-white"
              style={{
                backgroundColor: openPanels.includes("python")
                  ? darkMode
                    ? "#334155"
                    : "#00508f"
                  : "transparent",
              }}
            >
              <Code className="w-5 h-5" />
              <span className="font-medium">Python</span>
            </button>
          )}
        </div>

        <div
          className="p-5 border-t space-y-4"
          style={{ borderColor: darkMode ? "#334155" : "#00508f" }}
        >
          <button
            className="w-full font-bold py-4 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-white"
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            }}
          >
            Entregar Examen
          </button>

          <div
            className="text-sm space-y-3 pt-3 border-t"
            style={{
              color: darkMode ? "#cbd5e1" : "#e0f2fe",
              borderColor: darkMode ? "#334155" : "#00508f",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {currentTime.toLocaleDateString("es-ES")}
              </span>
              <span className="font-mono">
                {currentTime.toLocaleTimeString("es-ES", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
            {batteryLevel !== null && (
              <div className="flex items-center gap-2">
                {isCharging ? (
                  <BatteryCharging className="w-5 h-5 text-green-400" />
                ) : (
                  <Battery
                    className={`w-5 h-5 ${batteryLevel <= 20 ? "text-red-400" : "text-current"}`}
                  />
                )}
                <span className="font-mono">{batteryLevel}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div
          className="h-16 flex items-center justify-between px-6 shadow-sm"
          style={{
            backgroundColor: darkMode ? "#1e293b" : "#f8fafc",
            borderBottom: `2px solid ${darkMode ? "#334155" : "#003876"}`,
            transition: "all 0.3s ease",
          }}
        >
          <div className="flex items-center gap-6">
            <div className="flex gap-2">
              <button
                onClick={() => setLayout("vertical")}
                className="p-3 rounded-xl transition-all shadow-sm hover:shadow"
                style={{
                  backgroundColor:
                    layout === "vertical"
                      ? "#003876"
                      : darkMode
                        ? "#334155"
                        : "#e0e7ff",
                  color:
                    layout === "vertical"
                      ? "white"
                      : darkMode
                        ? "#cbd5e1"
                        : "#003876",
                }}
              >
                <Columns className="w-5 h-5" />
              </button>
              <button
                onClick={() => setLayout("horizontal")}
                className="p-3 rounded-xl transition-all shadow-sm hover:shadow"
                style={{
                  backgroundColor:
                    layout === "horizontal"
                      ? "#003876"
                      : darkMode
                        ? "#334155"
                        : "#e0e7ff",
                  color:
                    layout === "horizontal"
                      ? "white"
                      : darkMode
                        ? "#cbd5e1"
                        : "#003876",
                }}
              >
                <Rows className="w-5 h-5" />
              </button>
            </div>

            <div
              className="text-sm font-medium"
              style={{ color: darkMode ? "#cbd5e1" : "#64748b" }}
            >
              Paneles: {openPanels.length}/3
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div
              className="flex items-center gap-4 px-6 py-3 rounded-xl shadow-lg"
              style={{
                background: darkMode
                  ? "linear-gradient(135deg, #1e293b 0%, #334155 100%)"
                  : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                border: `2px solid ${darkMode ? "#475569" : "#003876"}`,
              }}
            >
              <Clock
                className="w-7 h-7"
                style={{
                  color:
                    remainingTime.startsWith("00:") &&
                    parseInt(remainingTime.split(":")[1]) < 10
                      ? "#ef4444"
                      : "#003876",
                }}
              />
              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-wide mb-1"
                  style={{ color: darkMode ? "#64748b" : "#64748b" }}
                >
                  Tiempo restante
                </div>
                <div
                  className="font-mono text-2xl font-bold"
                  style={{
                    color:
                      remainingTime.startsWith("00:") &&
                      parseInt(remainingTime.split(":")[1]) < 10
                        ? "#ef4444"
                        : darkMode
                          ? "#f1f5f9"
                          : "#003876",
                  }}
                >
                  {remainingTime}
                </div>
              </div>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 rounded-xl transition-all shadow-sm hover:shadow"
              style={{
                backgroundColor: darkMode ? "#fbbf24" : "#1e293b",
                color: darkMode ? "#1e293b" : "#fbbf24",
              }}
            >
              {darkMode ? (
                <Sun className="w-6 h-6" />
              ) : (
                <Moon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        <div
          className={`flex-1 flex ${layout === "vertical" ? "flex-row" : "flex-col"} overflow-hidden`}
        >
          {openPanels.length === 0 ? (
            <div
              className="flex-1 flex items-center justify-center"
              style={{ color: darkMode ? "#64748b" : "#94a3b8" }}
            >
              <p className="text-lg">Seleccione una opción del menú</p>
            </div>
          ) : (
            openPanels.map((panel, index) => (
              <React.Fragment key={index}>
                <div
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    [layout === "vertical" ? "width" : "height"]:
                      openPanels.length > 1 ? `${panelSizes[index]}%` : "100%",
                    backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                    border:
                      dragOverIndex === index
                        ? `3px dashed ${darkMode ? "#6366f1" : "#818cf8"}`
                        : "none",
                    transition:
                      dragOverIndex === index ? "none" : "all 0.2s ease",
                  }}
                  className="relative shadow-lg"
                >
                  <div
                    className="h-12 flex items-center justify-between px-4 border-b cursor-move"
                    style={{
                      backgroundColor: darkMode ? "#0f172a" : "#f8fafc",
                      borderColor: darkMode ? "#334155" : "#e2e8f0",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical
                        className="w-5 h-5"
                        style={{ color: darkMode ? "#64748b" : "#94a3b8" }}
                      />
                      <span
                        className="font-semibold capitalize"
                        style={{ color: darkMode ? "#f1f5f9" : "#1e293b" }}
                      >
                        {panel === "exam"
                          ? "Examen"
                          : panel === "answer"
                            ? "Respuestas"
                            : panel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 mr-2">
                        <button
                          onClick={() => adjustPanelZoom(index, -10)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                          style={{
                            color: darkMode ? "#94a3b8" : "#64748b",
                          }}
                        >
                          <Minimize2 className="w-4 h-4" />
                        </button>
                        <span
                          className="text-xs px-2 font-mono font-semibold min-w-[3rem] text-center"
                          style={{ color: darkMode ? "#64748b" : "#94a3b8" }}
                        >
                          {panelZooms[index]}%
                        </span>
                        <button
                          onClick={() => adjustPanelZoom(index, 10)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                          style={{
                            color: darkMode ? "#94a3b8" : "#64748b",
                          }}
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => closePanel(index)}
                        className="p-1.5 rounded-lg transition-all hover:bg-red-100"
                        style={{ color: "#ef4444" }}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="h-[calc(100%-3rem)] overflow-hidden">
                    <div
                      style={{
                        transform: `scale(${panelZooms[index] / 100})`,
                        transformOrigin: "top left",
                        width: `${10000 / panelZooms[index]}%`,
                        height: `${10000 / panelZooms[index]}%`,
                        willChange: "transform",
                      }}
                    >
                      {renderPanel(panel)}
                    </div>
                  </div>
                </div>

                {index < openPanels.length - 1 && (
                  <div
                    onMouseDown={(e) => startResize(index, e)}
                    className={`${
                      layout === "vertical"
                        ? "w-1 cursor-col-resize"
                        : "h-1 cursor-row-resize"
                    } transition-colors hover:bg-blue-500`}
                    style={{
                      backgroundColor:
                        isResizing && resizingIndex === index
                          ? "#3b82f6"
                          : darkMode
                            ? "#334155"
                            : "#e2e8f0",
                      flexShrink: 0,
                    }}
                  />
                )}
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
