// ============================================
// LMSDashboard.tsx - VERSIÓN MEJORADA
// Con mejor integración de vigilancia/resultados
// ============================================

// Importar componentes reutilizables
import ListaExamenes from "../components/ListaExamen";
import NotificationItem from "../components/NotificationItem";
import MiPerfil from "../components/MiPerfil";
import CrearExamen from "../components/CrearExamen";
import HomeContent from "../components/Homecontent";
import ExamenVigilancia from "../components/ExamenVigilancia";
import logoUniversidad from "../../assets/logo-universidad.webp";
import logoUniversidadNoche from "../../assets/logo-universidad-noche.webp";
import fondoImagen from "../../assets/fondo.webp";
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
      className="flex h-screen relative bg-cover bg-center transition-colors duration-300"
      style={{ backgroundImage: `url(${fondoImagen})` }}
    >
      {/* Overlay de fondo con diferentes colores según el tema */}
      <div className={`absolute inset-0 backdrop-blur-sm transition-all duration-300 ${
        darkMode
          ? "bg-gradient-to-br from-gray-900/95 via-slate-900/90 to-gray-900/95"
          : "bg-gradient-to-br from-white/88 via-gray-50/85 to-white/88"
      }`}></div>

      {/* Sidebar */}
      <div
        className={`relative z-10 ${darkMode ? "bg-slate-900/80 backdrop-blur-md" : "bg-white border-r border-gray-200"} flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? "w-16" : "w-64"}`}
      >
        <div
          className={`p-4 ${darkMode ? "border-slate-800/50" : "border-gray-200"} relative`}
        >
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2"} ${darkMode ? "hover:bg-slate-800/50" : "hover:bg-gray-100/50"} rounded-lg p-1 transition-colors`}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500 shadow-lg">
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
                className={`text-xs truncate ${darkMode ? "text-gray-400" : "text-gray-600"}`}
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
              className={`absolute left-4 top-16 right-4 ${darkMode ? "bg-slate-800/95 backdrop-blur-md border-slate-700/50" : "bg-white/95 backdrop-blur-md border-gray-200/50"} border rounded-lg shadow-2xl z-50 py-1`}
            >
              <button
                onClick={() => handleMenuItemClick("mi-perfil")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? "text-gray-200 hover:bg-slate-700/50" : "text-gray-700 hover:bg-gray-100/50"} transition-colors`}
              >
                <User className="w-4 h-4" />
                <span>Mi Perfil</span>
              </button>
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? "text-gray-200 hover:bg-slate-700/50" : "text-gray-700 hover:bg-gray-100/50"} transition-colors`}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                <span>Cambiar Tema</span>
              </button>
              <div
                className={`border-t ${darkMode ? "border-slate-700/50" : "border-gray-100/50"} my-1`}
              ></div>
              <button
                onClick={handleLogout}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? "text-red-400 hover:bg-red-900/20" : "text-red-600 hover:bg-red-50/50"} transition-colors`}
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </div>
          )}
        </div>

        <nav className="p-4 space-y-1">
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

        {/* Espaciador flexible */}
        <div className="flex-1 min-h-[4px]"></div>

        {/* Botón de Salir pegado al botón de minimizar */}
        <div className="px-4">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center rounded-lg text-sm transition-colors ${
              sidebarCollapsed ? "justify-center px-2 py-2" : "px-3 py-2 gap-3"
            } ${
              darkMode
                ? "text-red-400 hover:bg-red-900/20"
                : "text-red-600 hover:bg-red-50"
            }`}
            title={sidebarCollapsed ? "Salir" : ""}
          >
            <div className="relative flex-shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <span
              className={`whitespace-nowrap transition-all duration-200 ease-in-out overflow-hidden ${
                sidebarCollapsed ? "opacity-0 w-0" : "opacity-100 delay-100"
              }`}
            >
              Salir
            </span>
          </button>
        </div>

        {/* Botón de contraer/expandir */}
        <div className="p-3 flex justify-end">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-2 ${darkMode ? "hover:bg-slate-800/50" : "hover:bg-gray-100/50"} rounded-lg transition-colors`}
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
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header
          className="bg-transparent px-8 py-4 transition-colors duration-300"
        >
          <div className="flex items-center justify-end">
            <div className="flex items-center">
              <img
                src={darkMode ? logoUniversidadNoche : logoUniversidad}
                alt="Logo Universidad"
                className="h-13 w-auto object-contain transition-opacity duration-300 drop-shadow-lg"
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
            <VigilanciaContent darkMode={darkMode} usuarioData={usuarioData} />
          )}
          {activeMenu === "mi-perfil" && <MiPerfil darkMode={darkMode} />}
        </main>
      </div>

      {/* Botón de tema - Posición fija abajo a la derecha */}
      <button
        onClick={toggleTheme}
        className={`fixed bottom-6 right-6 z-20 p-3 rounded-full shadow-lg transition-all duration-300 ${
          darkMode
            ? "bg-slate-800/90 backdrop-blur-md text-yellow-400 hover:bg-slate-700/90 border border-slate-700/50"
            : "bg-white text-gray-700 hover:bg-gray-50"
        }`}
        title={darkMode ? "Cambiar a modo día" : "Cambiar a modo noche"}
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
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
            ? "bg-slate-800/70 text-white font-medium shadow-lg"
            : "bg-[#2c3e50] text-white font-medium"
          : darkMode
            ? "text-gray-300 hover:bg-slate-800/50"
            : "text-gray-700 hover:bg-gray-50"
      }`}
      title={collapsed ? label : ""}
    >
      <div className="relative flex-shrink-0">
        <Icon className="w-5 h-5" />
        {showBadge && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full w-2 h-2 border-2 border-slate-900"></span>
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
        className={`${darkMode ? "bg-slate-900/80 backdrop-blur-md border-slate-800/50" : "bg-white border-gray-200"} rounded-lg shadow-xl transition-colors duration-300 overflow-hidden border`}
      >
        <div
          className={`p-6 flex items-center justify-between ${darkMode ? "bg-slate-800/80" : "bg-[#1e293b]/90"}`}
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

function VigilanciaContent({ 
  darkMode,
  usuarioData
}: { 
  darkMode: boolean;
  usuarioData: any;
}) {
  const [selectedExam, setSelectedExam] = useState<any>(null);

  // Si hay un examen seleccionado, mostrar directamente la vista de vigilancia
  if (selectedExam) {
    return (
      <ExamenVigilancia
        selectedExam={selectedExam}
        onVolver={() => setSelectedExam(null)}
        darkMode={darkMode}
        usuarioData={usuarioData}
      />
    );
  }

  // Vista de selección de examen - versión simplificada
  return (
    <ExamenesAbiertosLista
      darkMode={darkMode}
      onSelectExam={setSelectedExam}
      usuarioData={usuarioData}
    />
  );
}

// Componente para mostrar la lista de exámenes abiertos - REDISEÑADO
function ExamenesAbiertosLista({
  darkMode,
  onSelectExam,
  usuarioData,
}: {
  darkMode: boolean;
  onSelectExam: (exam: any) => void;
  usuarioData: any;
}) {
  const [openExams, setOpenExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar exámenes abiertos del profesor
  useEffect(() => {
    const loadOpenExams = async () => {
      try {
        setLoading(true);
        const examsServiceModule = await import("../services/examsService");
        const exams = await examsServiceModule.examsService.obtenerMisExamenes(usuarioData.id);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
          <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Cargando exámenes...
          </p>
        </div>
      </div>
    );
  }

  if (openExams.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${darkMode ? "bg-slate-800" : "bg-gray-100"}`}>
            <Monitor className={`w-12 h-12 ${darkMode ? "text-gray-600" : "text-gray-400"}`} />
          </div>
          <h3 className={`text-2xl font-bold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
            No hay exámenes activos
          </h3>
          <p className={`text-base ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Los exámenes que abras aparecerán aquí para que puedas monitorear a tus estudiantes en tiempo real.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
            Vigilancia de Exámenes
          </h1>
          <p className={`mt-2 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Selecciona un examen para monitorear a los estudiantes
          </p>
        </div>
        <div className={`px-4 py-2 rounded-lg ${darkMode ? "bg-teal-900/30" : "bg-teal-50"}`}>
          <span className={`text-sm font-medium ${darkMode ? "text-teal-400" : "text-teal-700"}`}>
            {openExams.length} {openExams.length === 1 ? "examen activo" : "exámenes activos"}
          </span>
        </div>
      </div>

      {/* Grid de exámenes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {openExams.map((exam: any) => (
          <button
            key={exam.id}
            onClick={() => onSelectExam(exam)}
            className={`group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
              darkMode
                ? "bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 hover:border-teal-500/50"
                : "bg-white border-2 border-gray-200 hover:border-teal-500 shadow-lg"
            }`}
          >
            {/* Efecto de brillo en hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            
            {/* Contenido */}
            <div className="relative p-6">
              {/* Badge de estado */}
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  En vivo
                </span>
                <div className={`p-2 rounded-lg ${darkMode ? "bg-slate-700/50" : "bg-gray-100"}`}>
                  <Monitor className={`w-5 h-5 ${darkMode ? "text-gray-400" : "text-gray-600"}`} />
                </div>
              </div>

              {/* Título del examen */}
              <h3 className={`text-xl font-bold mb-3 line-clamp-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                {exam.nombre}
              </h3>

              {/* Código */}
              <div className="mb-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${darkMode ? "bg-slate-700/50" : "bg-gray-100"}`}>
                  <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <span className={`text-sm font-mono font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    {exam.codigoExamen}
                  </span>
                </div>
              </div>

              {/* Descripción (si existe) */}
              {exam.descripcion && (
                <p className={`text-sm mb-4 line-clamp-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {exam.descripcion}
                </p>
              )}

              {/* Botón de acción */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
                <span className="text-teal-400 font-semibold text-sm group-hover:text-teal-300 transition-colors">
                  Ir a vigilancia
                </span>
                <svg 
                  className="w-5 h-5 text-teal-400 transform group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}