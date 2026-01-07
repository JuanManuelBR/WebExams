import { useState } from 'react';
import { FileEdit, User, Bell, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface HomeContentProps {
  darkMode: boolean;
}

interface Examen {
  id: string;
  nombre: string;
  estado: 'Activo' | 'Programado';
  detalles: string;
  estadoColor: string;
  estadoTexto: string;
  calificaciones: {
    promedio: number;
    aprobacion: number;
    tendencia: string | null;
    mensaje: string;
  };
}

export default function HomeContent({ darkMode }: HomeContentProps) {
  const [selectedExam, setSelectedExam] = useState('matematicas');

  // Datos de los exámenes
  const examenes: Examen[] = [
    {
      id: 'matematicas',
      nombre: 'Matemáticas - Parcial 1',
      estado: 'Activo',
      detalles: '15 estudiantes en progreso',
      estadoColor: 'bg-green-500/20 text-green-400',
      estadoTexto: 'Activo',
      calificaciones: {
        promedio: 87.5,
        aprobacion: 92,
        tendencia: '+5%',
        mensaje: 'El promedio ha aumentado un 5% este mes'
      }
    },
    {
      id: 'fisica',
      nombre: 'Física - Quiz Semanal',
      estado: 'Activo',
      detalles: '8 estudiantes en progreso',
      estadoColor: 'bg-green-500/20 text-green-400',
      estadoTexto: 'Activo',
      calificaciones: {
        promedio: 78.3,
        aprobacion: 85,
        tendencia: '+2%',
        mensaje: 'El promedio ha aumentado un 2% este mes'
      }
    },
    {
      id: 'quimica',
      nombre: 'Química - Laboratorio',
      estado: 'Programado',
      detalles: 'Inicia mañana a las 10:00 AM',
      estadoColor: 'bg-blue-500/20 text-blue-400',
      estadoTexto: 'Programado',
      calificaciones: {
        promedio: 0,
        aprobacion: 0,
        tendencia: null,
        mensaje: 'El examen aún no ha comenzado'
      }
    }
  ];

  const examenActual = examenes.find(e => e.id === selectedExam) || examenes[0];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Exámenes" value="12" icon={FileEdit} color="bg-blue-500" darkMode={darkMode} />
        <StatCard title="Estudiantes Activos" value="245" icon={User} color="bg-green-500" darkMode={darkMode} />
        <StatCard title="Pendientes" value="5" icon={Bell} color="bg-orange-500" darkMode={darkMode} />
      </div>

      {/* Actividad Reciente */}
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg p-6 shadow-sm transition-colors duration-300 mb-6`}>
        <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Actividad Reciente</h2>
        <div className="space-y-4">
          {/* Actividad 1 */}
          <div className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
            <div className="bg-green-500 p-2 rounded-lg flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Juan Pérez completó el examen de Matemáticas
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Calificación: 85% • Hace 5 min
              </p>
            </div>
          </div>

          {/* Actividad 2 */}
          <div className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
            <div className="bg-red-500 p-2 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Alerta de seguridad - María González
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Examen de Física bloqueado • Hace 15 min
              </p>
            </div>
          </div>

          {/* Actividad 3 */}
          <div className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
            <div className="bg-green-500 p-2 rounded-lg flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Ana Martínez completó el examen de Química
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Calificación: 92% • Hace 2 horas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Exámenes Activos y Resumen de Calificaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exámenes Activos */}
        <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg p-6 shadow-sm transition-colors duration-300`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Exámenes Activos</h2>
          <div className="space-y-3">
            {examenes.map((examen) => (
              <button
                key={examen.id}
                onClick={() => setSelectedExam(examen.id)}
                className={`w-full p-3 rounded-lg border transition-all ${
                  selectedExam === examen.id
                    ? darkMode 
                      ? 'border-teal-500 bg-teal-900/20' 
                      : 'border-teal-500 bg-teal-50'
                    : darkMode 
                      ? 'border-slate-700 bg-slate-800/30 hover:bg-slate-800/50' 
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-medium text-left ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {examen.nombre}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${examen.estadoColor}`}>
                    {examen.estadoTexto}
                  </span>
                </div>
                <p className={`text-xs text-left ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {examen.detalles}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Resumen de Calificaciones */}
        <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg p-6 shadow-sm transition-colors duration-300`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Resumen de Calificaciones
          </h2>
          
          {examenActual.estado === 'Programado' ? (
            <div className={`p-6 rounded-lg text-center ${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
              <FileEdit className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {examenActual.calificaciones.mensaje}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Promedio General</span>
                  <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {examenActual.calificaciones.promedio}%
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-gray-200'}`}>
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-teal-500 transition-all duration-500" 
                    style={{ width: `${examenActual.calificaciones.promedio}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tasa de Aprobación</span>
                  <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {examenActual.calificaciones.aprobacion}%
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-gray-200'}`}>
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500" 
                    style={{ width: `${examenActual.calificaciones.aprobacion}%` }}
                  ></div>
                </div>
              </div>

              {examenActual.calificaciones.tendencia && (
                <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-teal-900/20 border border-teal-700/30' : 'bg-teal-50 border border-teal-200'}`}>
                  <div className="flex items-start gap-3">
                    <TrendingUp className={`w-5 h-5 ${darkMode ? 'text-teal-400' : 'text-teal-600'} flex-shrink-0 mt-0.5`} />
                    <div>
                      <p className={`text-sm font-medium ${darkMode ? 'text-teal-300' : 'text-teal-900'}`}>
                        Mejora continua
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-teal-400/70' : 'text-teal-700'} mt-1`}>
                        {examenActual.calificaciones.mensaje}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, darkMode }: {
  title: string;
  value: string;
  icon: any;
  color: string;
  darkMode: boolean;
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