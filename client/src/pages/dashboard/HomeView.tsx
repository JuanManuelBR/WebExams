import { useState, useEffect } from 'react';
import {
  FileEdit, User, Bell, CheckCircle, AlertTriangle,
  Clock, XCircle, PauseCircle, BookOpen,
} from 'lucide-react';
import ScrollReveal from '../../components/ScrollReveal';
import { examsService, type ExamenCreado } from '../../services/examsService';
import { examsAttemptsService } from '../../services/examsAttempts';

interface HomeContentProps {
  darkMode: boolean;
}

interface AttemptDashboard {
  id: number;
  nombre_estudiante: string | null;
  correo_estudiante?: string | null;
  identificacion_estudiante?: string | null;
  estado: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
  notaFinal?: number | null;
  calificacionPendiente?: boolean;
  examenNombre: string;
  examenId: number;
}

export default function HomeContent({ darkMode }: HomeContentProps) {
  const [loading, setLoading] = useState(true);
  const [examenes, setExamenes] = useState<ExamenCreado[]>([]);
  const [allAttempts, setAllAttempts] = useState<AttemptDashboard[]>([]);
  const [examSeleccionado, setExamSeleccionado] = useState<ExamenCreado | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const exams = await examsService.obtenerMisExamenes(0);
        setExamenes(exams);

        // Traer intentos solo de exámenes no archivados (máx 10)
        const noArchivados = exams.filter(e => e.estado !== 'archivado').slice(0, 10);

        const results = await Promise.all(
          noArchivados.map(async (exam) => {
            try {
              const attempts = await examsAttemptsService.getActiveAttemptsByExam(exam.id);
              return (attempts as any[]).map(a => ({
                ...a,
                examenNombre: exam.nombre,
                examenId: exam.id,
              }));
            } catch {
              return [];
            }
          })
        );

        setAllAttempts(results.flat());
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // --- Estadísticas globales ---
  const totalExamenes = examenes.length;
  const estudiantesActivos = allAttempts.filter(a => a.estado === 'activo').length;
  // Pendientes = solo bloqueados (necesitan acción manual del profesor)
  const pendientes = allAttempts.filter(a => a.estado === 'blocked').length;

  // Actividad reciente: últimos 6 intentos ordenados por fecha
  const actividadReciente = [...allAttempts]
    .sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())
    .slice(0, 6);

  // Intentos del examen seleccionado (o todos si no hay selección)
  const intentosFiltrados = examSeleccionado
    ? allAttempts.filter(a => a.examenId === examSeleccionado.id)
    : allAttempts;

  const intentosCalificados = intentosFiltrados.filter(
    a => a.estado === 'finished' && a.notaFinal !== null && a.notaFinal !== undefined
  );

  const promedioNota =
    intentosCalificados.length > 0
      ? intentosCalificados.reduce((s, a) => s + (a.notaFinal ?? 0), 0) / intentosCalificados.length
      : null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-5 md:mb-8">
        <ScrollReveal delay={0}>
          <StatCard title="Total Exámenes" value={loading ? '...' : String(totalExamenes)} icon={FileEdit} color="bg-blue-500" darkMode={darkMode} />
        </ScrollReveal>
        <ScrollReveal delay={60}>
          <StatCard title="Estudiantes Activos" value={loading ? '...' : String(estudiantesActivos)} icon={User} color="bg-green-500" darkMode={darkMode} />
        </ScrollReveal>
        <ScrollReveal delay={120}>
          <StatCard title="Pendientes" value={loading ? '...' : String(pendientes)} icon={Bell} color="bg-orange-500" darkMode={darkMode} />
        </ScrollReveal>
      </div>

      {/* Actividad Reciente */}
      <ScrollReveal>
        <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg p-6 shadow-sm transition-colors duration-300 mb-6`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Actividad Reciente
          </h2>
          {loading ? (
            <Spinner />
          ) : actividadReciente.length === 0 ? (
            <EmptyState darkMode={darkMode} mensaje="No hay actividad reciente" />
          ) : (
            <div className="space-y-2">
              {actividadReciente.map(attempt => (
                <AttemptRow key={attempt.id} attempt={attempt} darkMode={darkMode} />
              ))}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Todos los Exámenes + Resumen de Calificaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Lista de todos los exámenes */}
        <ScrollReveal delay={0}>
          <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg p-6 shadow-sm transition-colors duration-300`}>
            <h2 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Exámenes
            </h2>
            <p className={`text-xs mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Selecciona uno para ver sus calificaciones
            </p>
            {loading ? (
              <Spinner />
            ) : examenes.length === 0 ? (
              <EmptyState darkMode={darkMode} mensaje="No tienes exámenes creados" />
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {/* Opción: ver todos */}
                <button
                  onClick={() => setExamSeleccionado(null)}
                  className={`w-full text-left flex items-center justify-between p-3 rounded-lg border transition-all ${
                    examSeleccionado === null
                      ? darkMode
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-blue-500 bg-blue-50'
                      : darkMode
                        ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Todos los exámenes
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    {examenes.length}
                  </span>
                </button>

                {examenes.map(exam => {
                  const intentosExamen = allAttempts.filter(a => a.examenId === exam.id);
                  const terminados = intentosExamen.filter(a => a.estado === 'finished').length;
                  const selected = examSeleccionado?.id === exam.id;

                  return (
                    <button
                      key={exam.id}
                      onClick={() => setExamSeleccionado(exam)}
                      className={`w-full text-left flex items-center justify-between p-3 rounded-lg border transition-all ${
                        selected
                          ? darkMode
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-blue-500 bg-blue-50'
                          : darkMode
                            ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {exam.nombre}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {terminados} intento{terminados !== 1 ? 's' : ''} terminado{terminados !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <EstadoBadge estado={exam.estado} darkMode={darkMode} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Resumen de Calificaciones (reactivo al examen seleccionado) */}
        <ScrollReveal delay={80}>
          <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg p-6 shadow-sm transition-colors duration-300`}>
            <h2 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Resumen de Calificaciones
            </h2>
            <p className={`text-xs mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {examSeleccionado ? examSeleccionado.nombre : 'Todos los exámenes'}
            </p>

            {loading ? (
              <Spinner />
            ) : intentosCalificados.length === 0 ? (
              <div className={`p-6 rounded-lg text-center ${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                <BookOpen className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {examSeleccionado
                    ? 'Este examen no tiene calificaciones aún'
                    : 'No hay datos de calificaciones disponibles'}
                </p>
              </div>
            ) : (
              <GradeSummary
                intentos={intentosCalificados}
                promedio={promedioNota}
                darkMode={darkMode}
              />
            )}
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

// ==================== SUB-COMPONENTES ====================

function StatCard({ title, value, icon: Icon, color, darkMode }: {
  title: string; value: string; icon: any; color: string; darkMode: boolean;
}) {
  return (
    <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg p-6 shadow-sm transition-colors duration-300`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
          <p className={`text-2xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
        </div>
        <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function AttemptRow({ attempt, darkMode }: { attempt: AttemptDashboard; darkMode: boolean }) {
  const { icon: Icon, color, label } = getEstadoConfig(attempt.estado);
  const fecha = formatFecha(attempt.fecha_inicio);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
      <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {attempt.nombre_estudiante?.trim() || attempt.identificacion_estudiante?.trim() || attempt.correo_estudiante?.trim() || 'Sin identificar'}
        </p>
        <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {attempt.examenNombre}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getBadgeClass(attempt.estado)}`}>
          {label}
        </span>
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{fecha}</p>
      </div>
    </div>
  );
}

function EstadoBadge({ estado, darkMode }: { estado: string; darkMode: boolean }) {
  if (estado === 'open') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 flex-shrink-0">
        Abierto
      </span>
    );
  }
  if (estado === 'archivado') {
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${darkMode ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
        Archivado
      </span>
    );
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${darkMode ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
      Cerrado
    </span>
  );
}

function GradeSummary({ intentos, promedio, darkMode }: {
  intentos: AttemptDashboard[]; promedio: number | null; darkMode: boolean;
}) {
  const aprobados = intentos.filter(a => (a.notaFinal ?? 0) >= 3).length;
  const reprobados = intentos.length - aprobados;
  const pct = intentos.length > 0 ? Math.round((aprobados / intentos.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg text-center ${darkMode ? 'bg-slate-800/50' : 'bg-blue-50'}`}>
        <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-blue-600'}`}>
          Promedio general
        </p>
        <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-blue-700'}`}>
          {promedio !== null ? promedio.toFixed(1) : '—'}
        </p>
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-blue-400'}`}>
          sobre 5.0 · {intentos.length} intento{intentos.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
          <p className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>{aprobados}</p>
          <p className={`text-xs ${darkMode ? 'text-green-500' : 'text-green-600'}`}>Aprobados</p>
        </div>
        <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
          <p className={`text-lg font-bold ${darkMode ? 'text-red-400' : 'text-red-700'}`}>{reprobados}</p>
          <p className={`text-xs ${darkMode ? 'text-red-500' : 'text-red-600'}`}>Reprobados</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Tasa de aprobación</span>
          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pct}%</span>
        </div>
        <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div
            className="h-2 rounded-full bg-green-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ darkMode, mensaje }: { darkMode: boolean; mensaje: string }) {
  return (
    <div className={`p-6 rounded-lg text-center ${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{mensaje}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
    </div>
  );
}

// ==================== HELPERS ====================

function getEstadoConfig(estado: string) {
  switch (estado) {
    case 'activo':    return { icon: Clock,         color: 'text-blue-500',   label: 'En curso'   };
    case 'finished':  return { icon: CheckCircle,   color: 'text-green-500',  label: 'Terminado'  };
    case 'blocked':   return { icon: AlertTriangle, color: 'text-orange-500', label: 'Bloqueado'  };
    case 'paused':    return { icon: PauseCircle,   color: 'text-yellow-500', label: 'Pausado'    };
    case 'abandonado':return { icon: XCircle,       color: 'text-red-400',    label: 'Abandonado' };
    default:          return { icon: Clock,         color: 'text-gray-400',   label: estado       };
  }
}

function getBadgeClass(estado: string): string {
  switch (estado) {
    case 'activo':    return 'bg-blue-100 text-blue-700';
    case 'finished':  return 'bg-green-100 text-green-700';
    case 'blocked':   return 'bg-orange-100 text-orange-700';
    case 'paused':    return 'bg-yellow-100 text-yellow-700';
    case 'abandonado':return 'bg-red-100 text-red-700';
    default:          return 'bg-gray-100 text-gray-600';
  }
}

function formatFecha(fecha: string): string {
  try {
    const diffMs = Date.now() - new Date(fecha).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)  return 'Ahora';
    if (diffMin < 60) return `hace ${diffMin}m`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `hace ${diffHrs}h`;
    return `hace ${Math.floor(diffHrs / 24)}d`;
  } catch { return ''; }
}
