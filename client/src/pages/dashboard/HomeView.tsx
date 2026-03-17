import { FileEdit, User, Bell } from 'lucide-react';
import ScrollReveal from '../../components/ScrollReveal';

interface HomeContentProps {
  darkMode: boolean;
}

export default function HomeContent({ darkMode }: HomeContentProps) {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-5 md:mb-8">
        <ScrollReveal delay={0}><StatCard title="Total Exámenes" value="0" icon={FileEdit} color="bg-blue-500" darkMode={darkMode} /></ScrollReveal>
        <ScrollReveal delay={60}><StatCard title="Estudiantes Activos" value="0" icon={User} color="bg-green-500" darkMode={darkMode} /></ScrollReveal>
        <ScrollReveal delay={120}><StatCard title="Pendientes" value="0" icon={Bell} color="bg-orange-500" darkMode={darkMode} /></ScrollReveal>
      </div>

      {/* Actividad Reciente */}
      <ScrollReveal>
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg p-6 shadow-sm transition-colors duration-300 mb-6`}>
        <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Actividad Reciente</h2>
        <div className={`p-6 rounded-lg text-center ${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No hay actividad reciente
          </p>
        </div>
      </div>
      </ScrollReveal>

      {/* Exámenes Activos y Resumen de Calificaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exámenes Activos */}
        <ScrollReveal delay={0}>
        <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg p-6 shadow-sm transition-colors duration-300`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Exámenes Activos</h2>
          <div className={`p-6 rounded-lg text-center ${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No hay exámenes activos
            </p>
          </div>
        </div>
        </ScrollReveal>

        {/* Resumen de Calificaciones */}
        <ScrollReveal delay={80}>
        <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg p-6 shadow-sm transition-colors duration-300`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Resumen de Calificaciones
          </h2>
          <div className={`p-6 rounded-lg text-center ${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
            <FileEdit className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No hay datos de calificaciones disponibles
            </p>
          </div>
        </div>
        </ScrollReveal>
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
