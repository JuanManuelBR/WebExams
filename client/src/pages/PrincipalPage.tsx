// ============================================
// LMSDashboard.tsx - CÓDIGO COMPLETO
// Con sistema de estado activo, heartbeat y verificación de sesión
// ============================================

// Importar componentes reutilizables
import ListaExamenes from "../components/ListaExamen";
import StudentMonitor from "../components/StudentMonitor";
import NotificationItem from "../components/NotificationItem";
import MiPerfil from "../components/MiPerfil";
import CrearExamen from "../components/CrearExamen";
import HomeContent from "../components/Homecontent";
import logoUniversidad from "../../assets/logo-universidad.webp";
import logoUniversidadNoche from "../../assets/logo-universidad-noche.webp";
import { io, Socket } from "socket.io-client";
import { useState, useEffect } from "react";
import {
  Home,
  Bell,
  FileEdit,
  List,
  Monitor,
  ChevronDown,
  User,
  Moon,
  Sun,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { examsService } from "../services/examsService";
import { examsAttemptsService } from "../services/examsAttempts";
import AlertasModal from "../components/AlertasModal";

export default function LMSDashboard() {
  const [activeMenu, setActiveMenu] = useState("home");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Estado para notificaciones
  const [notificaciones, setNotificaciones] = useState([
    {
      id: 1,
      type: "exam_completed" as const,
      read: false,
      studentName: "Juan Pérez",
      examName: "Matemáticas",
      score: 85,
      time: "Hace 5 min",
    },
    {
      id: 2,
      type: "exam_blocked" as const,
      read: false,
      studentName: "María González",
      examName: "Física",
      reason: "Salir de pantalla completa",
      time: "Hace 15 min",
    },
    {
      id: 3,
      type: "exam_shared" as const,
      read: false,
      professorName: "Dr. Carlos Rodríguez",
      examName: "Cálculo Diferencial - Parcial 2",
      examId: "exam_123",
      time: "Hace 1 hora",
    },
    {
      id: 4,
      type: "exam_completed" as const,
      read: true,
      studentName: "Ana Martínez",
      examName: "Química",
      score: 92,
      time: "Hace 2 horas",
    },
  ]);

  const unreadCount = notificaciones.filter((n) => !n.read).length;

  // Estado para el modo oscuro - lee desde localStorage al iniciar
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  // Guardar preferencia de modo oscuro cuando cambie
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // ============================================
  // OBTENER DATOS DEL USUARIO - CON REACTIVIDAD
  // ============================================

  const [usuarioData, setUsuarioData] = useState(() => {
    const usuarioStorage = localStorage.getItem("usuario");
    return usuarioStorage ? JSON.parse(usuarioStorage) : null;
  });

  // ============================================
  // VERIFICAR SESIÓN AL CARGAR Y PERIÓDICAMENTE
  // ============================================
  useEffect(() => {
    const verificarSesion = async () => {
      try {
        const usuarioStorage = localStorage.getItem("usuario");

        if (!usuarioStorage) {
          console.log("❌ No hay usuario en localStorage, redirigiendo...");
          window.location.href = "/login";
          return;
        }

        const usuario = JSON.parse(usuarioStorage);

        if (!usuario.id) {
          console.log("❌ Usuario sin ID, redirigiendo...");
          localStorage.removeItem("usuario");
          window.location.href = "/login";
          return;
        }

        // Verificar con el backend si la sesión es válida
        const response = await fetch(`/api/users/${usuario.id}`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401) {
          console.log("❌ Sesión expirada (401), redirigiendo al login...");
          localStorage.removeItem("usuario");
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          console.log("❌ Error al verificar sesión, redirigiendo...");
          localStorage.removeItem("usuario");
          window.location.href = "/login";
          return;
        }

        console.log("✅ Sesión válida");
      } catch (error) {
        console.error("❌ Error al verificar sesión:", error);
        localStorage.removeItem("usuario");
        window.location.href = "/login";
      }
    };

    // Verificar inmediatamente al cargar
    verificarSesion();

    // Verificar cada 2 minutos
    const verificacionInterval = setInterval(verificarSesion, 2 * 60 * 1000);

    return () => clearInterval(verificacionInterval);
  }, []);

  // Escuchar cambios en localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const usuarioStorage = localStorage.getItem("usuario");
      setUsuarioData(usuarioStorage ? JSON.parse(usuarioStorage) : null);
    };

    // Escuchar evento de storage (para otros tabs)
    window.addEventListener("storage", handleStorageChange);

    // Escuchar evento personalizado (para el mismo tab)
    window.addEventListener("usuarioActualizado", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("usuarioActualizado", handleStorageChange);
    };
  }, []);

  // Función auxiliar para capitalizar (Primera letra mayúscula, resto minúscula)
  const capitalizeWord = (word: string): string => {
    if (!word) return "";
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };

  // Función para obtener nombre corto (Primer Nombre + Primer Apellido)
  const getNombreCorto = (): string => {
    if (!usuarioData) return "Usuario";

    // Obtener nombre y apellido del localStorage
    const nombre: string = usuarioData?.nombre || "";
    const apellido: string = usuarioData?.apellido || "";

    // Si tenemos nombre y apellido separados, usarlos directamente
    if (nombre && apellido) {
      // Tomar solo la primera palabra de cada uno y capitalizar
      const primerNombre = capitalizeWord(nombre.trim().split(" ")[0]);
      const primerApellido = capitalizeWord(apellido.trim().split(" ")[0]);

      return `${primerNombre} ${primerApellido}`;
    }

    // Fallback: si solo tenemos nombre completo
    if (nombre) {
      const partes: string[] = nombre
        .trim()
        .split(" ")
        .filter((p: string) => p.length > 0);
      if (partes.length > 1) {
        return `${capitalizeWord(partes[0])} ${capitalizeWord(partes[1])}`;
      }
      return capitalizeWord(partes[0]);
    }

    return "Usuario";
  };

  const nombreCorto = getNombreCorto();

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    setShowProfileMenu(false);
  };

  const handleLogout = async () => {
    try {
      if (usuarioData?.id) {
        // Llamar al backend para marcar como inactivo
        await fetch("/api/users/logout", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: usuarioData.id }),
        });
        console.log("✅ Usuario marcado como inactivo en logout");
      }
    } catch (error) {
      console.error("❌ Error al hacer logout:", error);
    } finally {
      // Limpiar localStorage y redirigir
      localStorage.removeItem("usuario");
      window.location.href = "/login";
    }
  };

  const handleMenuItemClick = (menu: string) => {
    setActiveMenu(menu);
    setShowProfileMenu(false);
  };

  // Handlers para notificaciones
  const handleMarkAsRead = (id: number) => {
    setNotificaciones(
      notificaciones.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    );
  };

  const handleDeleteNotification = (id: number) => {
    setNotificaciones(notificaciones.filter((item) => item.id !== id));
  };

  const handleClearAllNotifications = () => {
    setNotificaciones([]);
  };

  const handleAcceptExam = (id: number, examId: string) => {
    console.log(`Aceptando examen compartido: ${examId}`);
    alert("Examen aceptado y agregado a tu lista");
    handleDeleteNotification(id);
  };

  return (
    <div
      className={`flex h-screen transition-colors duration-300 ${darkMode ? "bg-gray-950" : "bg-gray-50"}`}
    >
      {/* Sidebar */}
      <div
        className={`${darkMode ? "bg-slate-900 border-slate-900" : "bg-white border-white"} border-r flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? "w-16" : "w-64"}`}
      >
        <div
          className={`p-4 border-b ${darkMode ? "border-slate-900" : "border-white"} relative`}
        >
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2"} ${darkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"} rounded-lg p-1 transition-colors`}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500">
              {usuarioData?.picture || usuarioData?.foto_perfil ? (
                <img
                  src={usuarioData.picture || usuarioData.foto_perfil}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-white" />
              )}
            </div>
            <div
              className={`flex-1 text-left min-w-0 transition-all duration-200 ease-in-out overflow-hidden ${
                sidebarCollapsed
                  ? "opacity-0 scale-95 w-0"
                  : "opacity-100 scale-100 delay-100"
              }`}
            >
              <div
                className={`font-semibold text-sm truncate ${darkMode ? "text-white" : "text-gray-900"}`}
              >
                {nombreCorto}
              </div>
              <div
                className={`text-xs truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Docente
              </div>
            </div>
            {!sidebarCollapsed && (
              <ChevronDown
                className={`w-4 h-4 ${darkMode ? "text-gray-400" : "text-gray-400"} transition-transform flex-shrink-0 ${showProfileMenu ? "rotate-180" : ""}`}
              />
            )}
          </button>

          {showProfileMenu && !sidebarCollapsed && (
            <div
              className={`absolute left-4 top-16 right-4 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"} border rounded-lg shadow-lg z-50 py-1`}
            >
              <button
                onClick={() => handleMenuItemClick("mi-perfil")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? "text-gray-200 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-50"} transition-colors`}
              >
                <User className="w-4 h-4" />
                <span>Mi Perfil</span>
              </button>
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? "text-gray-200 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-50"} transition-colors`}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                <span>Cambiar Tema</span>
              </button>
              <div
                className={`border-t ${darkMode ? "border-slate-700" : "border-gray-100"} my-1`}
              ></div>
              <button
                onClick={handleLogout}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? "text-red-400 hover:bg-red-900/20" : "text-red-600 hover:bg-red-50"} transition-colors`}
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem
            icon={Home}
            label="Inicio"
            collapsed={sidebarCollapsed}
            darkMode={darkMode}
            active={activeMenu === "home"}
            onClick={() => setActiveMenu("home")}
          />
          <NavItem
            icon={Bell}
            label="Notificaciones"
            collapsed={sidebarCollapsed}
            darkMode={darkMode}
            active={activeMenu === "notifications"}
            onClick={() => setActiveMenu("notifications")}
            badge={unreadCount}
          />

          <div className="pt-4 pb-2">
            <div className="space-y-1">
              <NavItem
                icon={FileEdit}
                label="Nuevo Examen"
                collapsed={sidebarCollapsed}
                darkMode={darkMode}
                active={activeMenu === "nuevo-examen"}
                onClick={() => setActiveMenu("nuevo-examen")}
              />
              <NavItem
                icon={List}
                label="Lista de Exámenes"
                collapsed={sidebarCollapsed}
                darkMode={darkMode}
                active={activeMenu === "lista-examenes"}
                onClick={() => setActiveMenu("lista-examenes")}
              />
              <NavItem
                icon={Monitor}
                label="Vigilancia/Resultados"
                collapsed={sidebarCollapsed}
                darkMode={darkMode}
                active={activeMenu === "vigilancia-resultados"}
                onClick={() => setActiveMenu("vigilancia-resultados")}
              />
            </div>
          </div>
        </nav>

        <div
          className={`p-3 border-t ${darkMode ? "border-slate-900" : "border-white"} flex justify-end`}
        >
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-2 ${darkMode ? "hover:bg-slate-800" : "hover:bg-gray-100"} rounded-lg transition-colors`}
            title={sidebarCollapsed ? "Expandir menú" : "Contraer menú"}
          >
            {sidebarCollapsed ? (
              <ChevronRight
                className={`w-4 h-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
              />
            ) : (
              <ChevronLeft
                className={`w-4 h-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
              />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className={`${darkMode ? "bg-gray-950 border-gray-950" : "bg-gray-50 border-gray-50"} border-b px-8 py-4 transition-colors duration-300`}
        >
          <div className="flex items-center justify-between">
            <div>
              {activeMenu === "home" && (
                <>
                  <h1
                    className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"} flex items-center gap-2`}
                  >
                    Hey, {nombreCorto} 👋
                  </h1>
                  <p
                    className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"} mt-1`}
                  >
                    Crea, supervisa y evalúa exámenes con total seguridad
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center">
              <img
                src={darkMode ? logoUniversidadNoche : logoUniversidad}
                alt="Logo Universidad"
                className="h-13 w-auto object-contain transition-opacity duration-300"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {activeMenu === "home" && <HomeContent darkMode={darkMode} />}
          {activeMenu === "notifications" && (
            <NotificationsContent
              darkMode={darkMode}
              notificaciones={notificaciones}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDeleteNotification}
              onClearAll={handleClearAllNotifications}
              onAcceptExam={handleAcceptExam}
            />
          )}
          {activeMenu === "nuevo-examen" && (
            <NuevoExamenContent
              darkMode={darkMode}
              onNavigate={setActiveMenu}
            />
          )}
          {activeMenu === "lista-examenes" && (
            <ListaExamenesContent
              darkMode={darkMode}
              onCrearExamen={() => setActiveMenu("nuevo-examen")}
            />
          )}
          {activeMenu === "vigilancia-resultados" && (
            <VigilanciaContent darkMode={darkMode} />
          )}
          {activeMenu === "mi-perfil" && <MiPerfil darkMode={darkMode} />}
        </main>
      </div>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  collapsed = false,
  darkMode = false,
  onClick,
  badge,
}: {
  icon: any;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  darkMode?: boolean;
  onClick: () => void;
  badge?: number;
}) {
  const showBadge = badge !== undefined && badge > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center rounded-lg text-sm transition-colors ${
        collapsed ? "justify-center px-2 py-2" : "px-3 py-2 gap-3"
      } ${
        active
          ? darkMode
            ? "bg-slate-800 text-white font-medium"
            : "bg-slate-700 text-white font-medium"
          : darkMode
            ? "text-gray-300 hover:bg-slate-800"
            : "text-gray-700 hover:bg-gray-50"
      }`}
      title={collapsed ? label : ""}
    >
      <div className="relative flex-shrink-0">
        <Icon className="w-5 h-5" />
        {showBadge && (
          <span className="absolute -top-0.5 -right-0.5 bg-white rounded-full w-2 h-2 border-2 border-slate-900"></span>
        )}
      </div>
      <span
        className={`whitespace-nowrap transition-all duration-200 ease-in-out overflow-hidden ${
          collapsed ? "opacity-0 w-0" : "opacity-100 delay-100"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// ========== SECCIONES ==========

function NotificationsContent({
  darkMode,
  notificaciones,
  onMarkAsRead,
  onDelete,
  onClearAll,
  onAcceptExam,
}: {
  darkMode: boolean;
  notificaciones: any[];
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
  onAcceptExam: (id: number, examId: string) => void;
}) {
  const unreadCount = notificaciones.filter((n) => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div
        className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-lg shadow-sm transition-colors duration-300 overflow-hidden`}
      >
        <div
          className={`p-6 flex items-center justify-between ${darkMode ? "bg-slate-800" : "bg-[#1e293b]"}`}
        >
          <h2 className="text-lg font-semibold text-white">Notificaciones</h2>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ${darkMode ? "bg-teal-900/40 text-teal-400" : "bg-teal-100 text-teal-700"}`}
              >
                {unreadCount} sin leer
              </span>
            )}
            {notificaciones.length > 0 && (
              <button
                onClick={onClearAll}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                title="Limpiar todas las notificaciones"
              >
                Limpiar todo
              </button>
            )}
          </div>
        </div>
        <div className="p-6 space-y-0">
          {notificaciones.length > 0 ? (
            notificaciones.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                darkMode={darkMode}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
                onAcceptExam={onAcceptExam}
              />
            ))
          ) : (
            <p
              className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              No tienes notificaciones
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NuevoExamenContent({
  darkMode,
  onNavigate,
}: {
  darkMode: boolean;
  onNavigate: (menu: string) => void;
}) {
  return (
    <CrearExamen
      darkMode={darkMode}
      onExamenCreado={() => onNavigate("lista-examenes")}
    />
  );
}

function ListaExamenesContent({
  darkMode,
  onCrearExamen,
}: {
  darkMode: boolean;
  onCrearExamen: () => void;
}) {
  return (
    <div className="max-w-7xl mx-auto">
      <ListaExamenes darkMode={darkMode} onCrearExamen={onCrearExamen} />
    </div>
  );
}

function VigilanciaContent({ darkMode }: { darkMode: boolean }) {
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [openExams, setOpenExams] = useState<any[]>([]);
  const [activeAttempts, setActiveAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [modalAlertas, setModalAlertas] = useState<{
    show: boolean;
    attemptId: number | null;
    nombre: string;
  }>({
    show: false,
    attemptId: null,
    nombre: "",
  });
  const [alertasDetalle, setAlertasDetalle] = useState<any[]>([]);

  // ✅ NUEVO: Estado para el filtro
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");

  const usuarioData = JSON.parse(localStorage.getItem("usuario") || "{}");

  const traducirEstado = (
    estado: string,
  ): "Activo" | "Bloqueado" | "Pausado" | "Terminado" | "Abandonado" => {
    const traducciones: Record<
      string,
      "Activo" | "Bloqueado" | "Pausado" | "Terminado" | "Abandonado"
    > = {
      activo: "Activo",
      blocked: "Bloqueado",
      paused: "Pausado",
      finished: "Terminado",
      abandonado: "Abandonado",
    };
    return traducciones[estado] || "Abandonado";
  };

  // ✅ NUEVO: Función para obtener estado normalizado (para comparación)
  const normalizarEstado = (estado: string): string => {
    const normalizaciones: Record<string, string> = {
      blocked: "bloqueado",
      paused: "pausado",
      finished: "terminado",
    };
    return normalizaciones[estado] || estado;
  };

  // ✅ NUEVO: Calcular contadores por estado
  const contadores = {
    activos: activeAttempts.filter(
      (a) => normalizarEstado(a.estado) === "activo",
    ).length,
    bloqueados: activeAttempts.filter(
      (a) => normalizarEstado(a.estado) === "bloqueado",
    ).length,
    pausados: activeAttempts.filter(
      (a) => normalizarEstado(a.estado) === "pausado",
    ).length,
    terminados: activeAttempts.filter(
      (a) => normalizarEstado(a.estado) === "terminado",
    ).length,
    abandonados: activeAttempts.filter(
      (a) => normalizarEstado(a.estado) === "abandonado",
    ).length,
    total: activeAttempts.length,
  };

  // ✅ NUEVO: Filtrar intentos según el estado seleccionado
  const intentosFiltrados =
    filtroEstado === "todos"
      ? activeAttempts
      : activeAttempts.filter((a) => a.estado === filtroEstado);

  // Cargar exámenes abiertos del profesor
  useEffect(() => {
    const loadOpenExams = async () => {
      try {
        setLoading(true);
        const exams = await examsService.obtenerMisExamenes(usuarioData.id);
        const open = exams.filter((e: any) => e.estado === "open");
        setOpenExams(open);
      } catch (error) {
        console.error("Error cargando exámenes:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOpenExams();
  }, [usuarioData.id]);

  // Conectar a WebSocket cuando se selecciona un examen
  useEffect(() => {
    if (!selectedExam) return;

    console.log("🔌 Conectando a WebSocket para examen:", selectedExam.id);

    const newSocket = io("http://localhost:3002");

    newSocket.on("connect", () => {
      console.log("✅ Conectado al WebSocket");
      newSocket.emit("join_exam_monitoring", selectedExam.id);

      // ✅ Cargar intentos iniciales
      examsAttemptsService
        .getActiveAttemptsByExam(selectedExam.id)
        .then((attempts) => {
          console.log("📊 Intentos iniciales cargados:", attempts);
          setActiveAttempts(attempts);
        });
    });

    // ✅ Estudiante inició examen
    newSocket.on("student_started_exam", (data) => {
      console.log("👨‍🎓 Estudiante inició examen:", data);

      setActiveAttempts((prev) => {
        // Si ya existe, actualizar solo el estado y fecha_inicio
        if (prev.some((a) => a.id === data.attemptId)) {
          return prev.map((a) =>
            a.id === data.attemptId
              ? { ...a, estado: "activo", fecha_inicio: data.fecha_inicio }
              : a,
          );
        }

        // Si no existe, agregarlo (mantener alertas que vengan de la BD)
        return [
          ...prev,
          {
            id: data.attemptId,
            nombre_estudiante: data.estudiante.nombre || "Sin nombre",
            correo_estudiante: data.estudiante.correo,
            identificacion_estudiante: data.estudiante.identificacion,
            estado: "activo",
            fecha_inicio: data.fecha_inicio,
            tiempoTranscurrido: "0 min",
            progreso: 0,
            alertas: data.alertas || 0,
            alertasNoLeidas: data.alertasNoLeidas || 0,
          },
        ];
      });
    });

    // ✅ Intento bloqueado
    newSocket.on("attempt_blocked_notification", (data) => {
      console.log("🔒 Intento bloqueado:", data);

      setActiveAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id === data.attemptId
            ? { ...attempt, estado: "blocked" }
            : attempt,
        ),
      );
    });

    // ✅ Estudiante abandonó
    newSocket.on("student_abandoned_exam", (data) => {
      console.log("🚪 Estudiante abandonó examen:", data);

      setActiveAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id === data.attemptId
            ? { ...attempt, estado: "abandonado" }
            : attempt,
        ),
      );
    });

    // ✅ Estudiante terminó
    newSocket.on("student_finished_exam", (data) => {
      console.log("✅ Estudiante terminó examen:", data);

      setActiveAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id === data.attemptId
            ? { ...attempt, estado: "finished" }
            : attempt,
        ),
      );
    });

    newSocket.on("progress_updated", (data) => {
      console.log("📊 Progreso actualizado:", data);

      setActiveAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id === data.attemptId
            ? { ...attempt, progreso: data.progreso }
            : attempt,
        ),
      );
    });

    // ✅ MODIFICADO: Actualizar tiempo transcurrido solo para intentos ACTIVOS
    const timeInterval = setInterval(() => {
      setActiveAttempts((prev) =>
        prev.map((attempt) => {
          // ✅ Solo actualizar tiempo si está activo
          if (normalizarEstado(attempt.estado) !== "activo") {
            return attempt; // No modificar el tiempo si no está activo
          }

          const now = new Date();
          const elapsed =
            now.getTime() - new Date(attempt.fecha_inicio).getTime();
          const elapsedMinutes = Math.floor(elapsed / 60000);

          return {
            ...attempt,
            tiempoTranscurrido: `${elapsedMinutes} min`,
          };
        }),
      );
    }, 60000); // Cada minuto

    setSocket(newSocket);

    return () => {
      console.log("🔌 Desconectando WebSocket");
      clearInterval(timeInterval);
      newSocket.disconnect();
    };
  }, [selectedExam]);

  // ✅ Escuchar nuevas alertas por WebSocket
  useEffect(() => {
    if (!socket) return;

    socket.on("new_alert", (data) => {
      console.log("🆕 Nueva alerta:", data);

      setActiveAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id === data.attemptId
            ? {
                ...attempt,
                alertasNoLeidas: (attempt.alertasNoLeidas || 0) + 1,
                alertas: attempt.alertas + 1,
              }
            : attempt,
        ),
      );
    });

    socket.on("alerts_read", (data) => {
      console.log("✅ Alertas marcadas como leídas:", data);

      setActiveAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id === data.attemptId
            ? { ...attempt, alertasNoLeidas: 0 }
            : attempt,
        ),
      );
    });

    return () => {
      socket.off("new_alert");
      socket.off("alerts_read");
      socket.off("progress_updated");
    };
  }, [socket]);

  const handleUnlockAttempt = async (attemptId: number) => {
    try {
      await examsAttemptsService.unlockAttempt(attemptId);

      setActiveAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id === attemptId ? { ...attempt, estado: "activo" } : attempt,
        ),
      );
    } catch (error) {
      console.error("Error desbloqueando intento:", error);
    }
  };

  const handleVerAlertas = async (attemptId: number, nombre: string) => {
    try {
      const alertas = await examsAttemptsService.getAttemptEvents(attemptId);
      setAlertasDetalle(alertas);
      setModalAlertas({ show: true, attemptId, nombre });

      // Marcar como leídas
      await examsAttemptsService.markEventsAsRead(attemptId);
    } catch (error) {
      console.error("Error cargando alertas:", error);
    }
  };

  const handleViewDetails = (attemptId: number) => {
    console.log("Ver detalles del intento:", attemptId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}
        >
          Cargando exámenes...
        </div>
      </div>
    );
  }

  if (!selectedExam) {
    return (
      <div className="max-w-4xl mx-auto">
        <div
          className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-lg shadow-sm p-6 transition-colors duration-300`}
        >
          <h2
            className={`text-xl font-semibold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}
          >
            Selecciona un Examen para Monitorear
          </h2>

          {openExams.length === 0 ? (
            <div className="text-center py-12">
              <p
                className={`text-lg mb-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                No tienes exámenes abiertos en este momento
              </p>
              <p
                className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-500"}`}
              >
                Los exámenes deben estar en estado "abierto" para ser
                monitoreados
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {openExams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => setSelectedExam(exam)}
                  className={`p-6 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                    darkMode
                      ? "bg-slate-800 border-slate-700 hover:border-blue-500"
                      : "bg-gray-50 border-gray-200 hover:border-blue-500"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3
                        className={`text-lg font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                      >
                        {exam.nombre}
                      </h3>
                      <p
                        className={`text-sm mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                      >
                        {exam.descripcion
                          ?.replace(/<[^>]*>/g, "")
                          .substring(0, 100) || "Sin descripción"}
                      </p>
                      <div
                        className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-500"}`}
                      >
                        Código: {exam.codigoExamen}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                      Abierto
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header con botón volver */}
      <div
        className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-lg shadow-sm p-6 mb-6 transition-colors duration-300`}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              setSelectedExam(null);
              setActiveAttempts([]);
              setFiltroEstado("todos");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              darkMode
                ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <svg
              className="w-4 h-4"
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
        </div>

        <div className="mb-6">
          <h2
            className={`text-xl font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
          >
            {selectedExam.nombre}
          </h2>
          <div
            className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            Código: {selectedExam.codigoExamen}
          </div>
        </div>

        {/* ✅ Contadores por estado */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
          >
            <div
              className={`text-xs font-semibold mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              Total
            </div>
            <div
              className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              {contadores.total}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
          >
            <div className="text-xs font-semibold mb-1 text-green-400">
              Activos
            </div>
            <div className="text-2xl font-bold text-green-400">
              {contadores.activos}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
          >
            <div className="text-xs font-semibold mb-1 text-red-400">
              Bloqueados
            </div>
            <div className="text-2xl font-bold text-red-400">
              {contadores.bloqueados}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
          >
            <div className="text-xs font-semibold mb-1 text-yellow-400">
              En Pausa
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              {contadores.pausados}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
          >
            <div className="text-xs font-semibold mb-1 text-blue-400">
              Terminados
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {contadores.terminados}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
          >
            <div className="text-xs font-semibold mb-1 text-gray-400">
              Abandonados
            </div>
            <div className="text-2xl font-bold text-gray-400">
              {contadores.abandonados}
            </div>
          </div>
        </div>

        {/* ✅ NUEVO: Botones de filtro */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroEstado("todos")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "todos"
                ? darkMode
                  ? "bg-blue-600 text-white"
                  : "bg-blue-600 text-white"
                : darkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todos ({contadores.total})
          </button>

          <button
            onClick={() => setFiltroEstado("activo")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "activo"
                ? "bg-green-600 text-white"
                : darkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Activos ({contadores.activos})
          </button>

          <button
            onClick={() => setFiltroEstado("blocked")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "blocked"
                ? "bg-red-600 text-white"
                : darkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Bloqueados ({contadores.bloqueados})
          </button>

          <button
            onClick={() => setFiltroEstado("paused")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "paused"
                ? "bg-yellow-600 text-white"
                : darkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            En Pausa ({contadores.pausados})
          </button>

          <button
            onClick={() => setFiltroEstado("finished")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "finished"
                ? "bg-blue-600 text-white"
                : darkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Terminados ({contadores.terminados})
          </button>

          <button
            onClick={() => setFiltroEstado("abandonado")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "abandonado"
                ? "bg-gray-600 text-white"
                : darkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Abandonados ({contadores.abandonados})
          </button>
        </div>
      </div>

      {/* Lista de estudiantes FILTRADA */}
      {intentosFiltrados.length === 0 ? (
        <div
          className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-lg shadow-sm p-12 text-center`}
        >
          <p
            className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            {filtroEstado === "todos"
              ? "No hay estudiantes en este momento"
              : `No hay estudiantes en estado "${filtroEstado}"`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {intentosFiltrados.map((attempt) => (
            <StudentMonitor
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
              darkMode={darkMode}
              onRestablecerAcceso={handleUnlockAttempt}
              onVerDetalles={handleViewDetails}
              onVerAlertas={(id) =>
                handleVerAlertas(id, attempt.nombre_estudiante)
              }
            />
          ))}
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
      )}
    </div>
  );
}
