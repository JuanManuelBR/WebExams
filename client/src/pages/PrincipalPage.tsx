// ============================================
// LMSDashboard.tsx - CÓDIGO COMPLETO
// Con actualización automática del perfil
// ============================================

// Importar componentes reutilizables
import ListaExamenes from '../components/ListaExamen';
import StudentMonitor from '../components/StudentMonitor';
import NotificationItem from '../components/NotificationItem';
import MiPerfil from '../components/MiPerfil';
import CrearExamen from '../components/CrearExamen';
import HomeContent from '../components/Homecontent';
import logoUniversidad from '../../assets/logo-universidad.png';
import logoUniversidadNoche from '../../assets/logo-universidad-noche.png';

import { useState, useEffect } from 'react';
import { Home, Bell, FileEdit, List, Monitor, ChevronDown, User, Moon, Sun, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

export default function LMSDashboard() {
  const [activeMenu, setActiveMenu] = useState('home');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Estado para notificaciones
  const [notificaciones, setNotificaciones] = useState([
    { 
      id: 1, 
      type: 'exam_completed' as const, 
      read: false,
      studentName: "Juan Pérez",
      examName: "Matemáticas",
      score: 85,
      time: "Hace 5 min"
    },
    { 
      id: 2, 
      type: 'exam_blocked' as const, 
      read: false,
      studentName: "María González",
      examName: "Física",
      reason: "Salir de pantalla completa",
      time: "Hace 15 min"
    },
    { 
      id: 3, 
      type: 'exam_shared' as const, 
      read: false,
      professorName: "Dr. Carlos Rodríguez",
      examName: "Cálculo Diferencial - Parcial 2",
      examId: "exam_123",
      time: "Hace 1 hora"
    },
    { 
      id: 4, 
      type: 'exam_completed' as const, 
      read: true,
      studentName: "Ana Martínez",
      examName: "Química",
      score: 92,
      time: "Hace 2 horas"
    },
  ]);
  
  const unreadCount = notificaciones.filter(n => !n.read).length;
  
  // Estado para el modo oscuro - lee desde localStorage al iniciar
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Guardar preferencia de modo oscuro cuando cambie
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // ============================================
  // OBTENER DATOS DEL USUARIO - CON REACTIVIDAD
  // ============================================
  
  const [usuarioData, setUsuarioData] = useState(() => {
    const usuarioStorage = localStorage.getItem('usuario');
    return usuarioStorage ? JSON.parse(usuarioStorage) : null;
  });

  // Escuchar cambios en localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const usuarioStorage = localStorage.getItem('usuario');
      setUsuarioData(usuarioStorage ? JSON.parse(usuarioStorage) : null);
    };

    // Escuchar evento de storage (para otros tabs)
    window.addEventListener('storage', handleStorageChange);

    // Escuchar evento personalizado (para el mismo tab)
    window.addEventListener('usuarioActualizado', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('usuarioActualizado', handleStorageChange);
    };
  }, []);
  
  // Función auxiliar para capitalizar (Primera letra mayúscula, resto minúscula)
  const capitalizeWord = (word: string): string => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };

  // Función para obtener nombre corto (Primer Nombre + Primer Apellido)
  const getNombreCorto = (): string => {
    if (!usuarioData) return 'Usuario';

    // Obtener nombre y apellido del localStorage
    const nombre: string = usuarioData?.nombre || '';
    const apellido: string = usuarioData?.apellido || '';

    // Si tenemos nombre y apellido separados, usarlos directamente
    if (nombre && apellido) {
      // Tomar solo la primera palabra de cada uno y capitalizar
      const primerNombre = capitalizeWord(nombre.trim().split(' ')[0]);
      const primerApellido = capitalizeWord(apellido.trim().split(' ')[0]);
      
      return `${primerNombre} ${primerApellido}`;
    }

    // Fallback: si solo tenemos nombre completo
    if (nombre) {
      const partes: string[] = nombre.trim().split(' ').filter((p: string) => p.length > 0);
      if (partes.length > 1) {
        return `${capitalizeWord(partes[0])} ${capitalizeWord(partes[1])}`;
      }
      return capitalizeWord(partes[0]);
    }

    return 'Usuario';
  };

  const nombreCorto = getNombreCorto();

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    setShowProfileMenu(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    window.location.href = '/login';
  };

  const handleMenuItemClick = (menu: string) => {
    setActiveMenu(menu);
    setShowProfileMenu(false);
  };

  // Handlers para notificaciones
  const handleMarkAsRead = (id: number) => {
    setNotificaciones(notificaciones.map(item => 
      item.id === id ? { ...item, read: true } : item
    ));
  };

  const handleDeleteNotification = (id: number) => {
    setNotificaciones(notificaciones.filter(item => item.id !== id));
  };

  const handleClearAllNotifications = () => {
    setNotificaciones([]);
  };

  const handleAcceptExam = (id: number, examId: string) => {
    console.log(`Aceptando examen compartido: ${examId}`);
    alert('Examen aceptado y agregado a tu lista');
    handleDeleteNotification(id);
  };

  return (
    <div className={`flex h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <div className={`${darkMode ? 'bg-slate-900 border-slate-900' : 'bg-white border-white'} border-r flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className={`p-4 border-b ${darkMode ? 'border-slate-900' : 'border-white'} relative`}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'} ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'} rounded-lg p-1 transition-colors`}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500">
              {usuarioData?.picture || usuarioData?.foto_perfil ? (
                <img src={usuarioData.picture || usuarioData.foto_perfil} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-white" />
              )}
            </div>
            <div className={`flex-1 text-left min-w-0 transition-all duration-200 ease-in-out overflow-hidden ${
              sidebarCollapsed ? 'opacity-0 scale-95 w-0' : 'opacity-100 scale-100 delay-100'
            }`}>
              <div className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {nombreCorto}
              </div>
              <div className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Docente</div>
            </div>
            {!sidebarCollapsed && (
              <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'} transition-transform flex-shrink-0 ${showProfileMenu ? 'rotate-180' : ''}`} />
            )}
          </button>

          {showProfileMenu && !sidebarCollapsed && (
            <div className={`absolute left-4 top-16 right-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-50 py-1`}>
              <button 
                onClick={() => handleMenuItemClick('mi-perfil')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? 'text-gray-200 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors`}
              >
                <User className="w-4 h-4" />
                <span>Mi Perfil</span>
              </button>
              <button 
                onClick={toggleTheme}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? 'text-gray-200 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors`}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>Cambiar Tema</span>
              </button>
              <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-gray-100'} my-1`}></div>
              <button 
                onClick={handleLogout}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'} transition-colors`}
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem icon={Home} label="Inicio" collapsed={sidebarCollapsed} darkMode={darkMode} active={activeMenu === 'home'} onClick={() => setActiveMenu('home')} />
          <NavItem icon={Bell} label="Notificaciones" collapsed={sidebarCollapsed} darkMode={darkMode} active={activeMenu === 'notifications'} onClick={() => setActiveMenu('notifications')} badge={unreadCount} />
          
          <div className="pt-4 pb-2">
            <div className="space-y-1">
              <NavItem icon={FileEdit} label="Nuevo Examen" collapsed={sidebarCollapsed} darkMode={darkMode} active={activeMenu === 'nuevo-examen'} onClick={() => setActiveMenu('nuevo-examen')} />
              <NavItem icon={List} label="Lista de Exámenes" collapsed={sidebarCollapsed} darkMode={darkMode} active={activeMenu === 'lista-examenes'} onClick={() => setActiveMenu('lista-examenes')} />
              <NavItem icon={Monitor} label="Vigilancia/Resultados" collapsed={sidebarCollapsed} darkMode={darkMode} active={activeMenu === 'vigilancia-resultados'} onClick={() => setActiveMenu('vigilancia-resultados')} />
            </div>
          </div>
        </nav>

        <div className={`p-3 border-t ${darkMode ? 'border-slate-900' : 'border-white'} flex justify-end`}>
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-2 ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
            title={sidebarCollapsed ? "Expandir menú" : "Contraer menú"}
          >
            {sidebarCollapsed ? <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} /> : <ChevronLeft className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`${darkMode ? 'bg-gray-950 border-gray-950' : 'bg-gray-50 border-gray-50'} border-b px-8 py-4 transition-colors duration-300`}>
          <div className="flex items-center justify-between">
            <div>
              {activeMenu === 'home' && (
                <>
                  <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                    Hey, {nombreCorto} 👋
                  </h1>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
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
          {activeMenu === 'home' && <HomeContent darkMode={darkMode} />}
          {activeMenu === 'notifications' && (
            <NotificationsContent 
              darkMode={darkMode} 
              notificaciones={notificaciones}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDeleteNotification}
              onClearAll={handleClearAllNotifications}
              onAcceptExam={handleAcceptExam}
            />
          )}
          {activeMenu === 'nuevo-examen' && <NuevoExamenContent darkMode={darkMode} />}
          {activeMenu === 'lista-examenes' && <ListaExamenesContent darkMode={darkMode} onCrearExamen={() => setActiveMenu('nuevo-examen')} />}
          {activeMenu === 'vigilancia-resultados' && <VigilanciaContent darkMode={darkMode} />}
          {activeMenu === 'mi-perfil' && <MiPerfil darkMode={darkMode} />}
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active = false, collapsed = false, darkMode = false, onClick, badge }: { 
  icon: any; label: string; active?: boolean; collapsed?: boolean; darkMode?: boolean; onClick: () => void; badge?: number;
}) {
  const showBadge = badge !== undefined && badge > 0;
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center rounded-lg text-sm transition-colors ${
        collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2 gap-3'
      } ${
        active
          ? darkMode ? 'bg-slate-800 text-white font-medium' : 'bg-slate-700 text-white font-medium'
          : darkMode ? 'text-gray-300 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-50'
      }`}
      title={collapsed ? label : ''}
    >
      <div className="relative flex-shrink-0">
        <Icon className="w-5 h-5" />
        {showBadge && (
          <span className="absolute -top-0.5 -right-0.5 bg-white rounded-full w-2 h-2 border-2 border-slate-900"></span>
        )}
      </div>
      <span className={`whitespace-nowrap transition-all duration-200 ease-in-out overflow-hidden ${
        collapsed ? 'opacity-0 w-0' : 'opacity-100 delay-100'
      }`}>
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
  onAcceptExam
}: { 
  darkMode: boolean; 
  notificaciones: any[];
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
  onAcceptExam: (id: number, examId: string) => void;
}) {
  const unreadCount = notificaciones.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg shadow-sm transition-colors duration-300 overflow-hidden`}>
        <div className={`p-6 flex items-center justify-between ${darkMode ? 'bg-slate-800' : 'bg-[#1e293b]'}`}>
          <h2 className="text-lg font-semibold text-white">Notificaciones</h2>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${darkMode ? 'bg-teal-900/40 text-teal-400' : 'bg-teal-100 text-teal-700'}`}>
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
            notificaciones.map(n => (
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
            <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No tienes notificaciones
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NuevoExamenContent({ darkMode }: { darkMode: boolean }) {
  return <CrearExamen darkMode={darkMode} />;
}

function ListaExamenesContent({ darkMode, onCrearExamen }: { darkMode: boolean; onCrearExamen: () => void }) {
  return (
    <div className="max-w-7xl mx-auto">
      <ListaExamenes 
        darkMode={darkMode} 
        onCrearExamen={onCrearExamen}
      />
    </div>
  );
}

function VigilanciaContent({ darkMode }: { darkMode: boolean }) {
  const estudiantes = [
    { id: 1, nombre: 'Juan Pérez', email: 'juan@universidad.edu', examen: 'Matemáticas', estado: 'Activo' as const, tiempoTranscurrido: '45 min', progreso: 75, alertas: 0 },
    { id: 2, nombre: 'María González', email: 'maria@universidad.edu', examen: 'Física', estado: 'Activo' as const, tiempoTranscurrido: '32 min', progreso: 60, alertas: 1 },
    { id: 3, nombre: 'Carlos Rodríguez', email: 'carlos@universidad.edu', examen: 'Matemáticas', estado: 'Desconectado' as const, tiempoTranscurrido: '28 min', progreso: 45, alertas: 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg shadow-sm p-6 mb-6 transition-colors duration-300`}>
        <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Vigilancia en Tiempo Real</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {estudiantes.map(e => (
          <StudentMonitor 
            key={e.id} {...e} darkMode={darkMode} 
            onRestablecerAcceso={(id) => alert(`Acceso restablecido: ${id}`)}
            onVerDetalles={(id) => console.log(id)}
          />
        ))}
      </div>
    </div>
  );
}