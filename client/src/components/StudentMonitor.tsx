interface StudentMonitorProps {
  id: number;
  nombre: string;
  email: string;
  examen: string;
  estado: 'Activo' | 'Desconectado' | 'Sospechoso';
  tiempoTranscurrido: string;
  progreso: number; // 0-100
  alertas: number;
  darkMode: boolean;
  onRestablecerAcceso?: (id: number) => void;
  onVerDetalles?: (id: number) => void;
}

export default function StudentMonitor({ 
  id,
  nombre,
  email,
  examen,
  estado,
  tiempoTranscurrido,
  progreso,
  alertas,
  darkMode,
  onRestablecerAcceso,
  onVerDetalles
}: StudentMonitorProps) {
  return (
    <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-lg p-4 hover:shadow-md transition-shadow`}>
      {/* Header con nombre y estado */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {nombre.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {nombre}
            </h3>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {email}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Badge de estado */}
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            estado === 'Activo' 
              ? 'bg-green-100 text-green-800' 
              : estado === 'Sospechoso'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {estado}
          </span>
          
          {/* Badge de alertas */}
          {alertas > 0 && (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
              {alertas} alerta{alertas > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Info del examen */}
      <div className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <p className="mb-1">
          <span className="font-medium">Examen:</span> {examen}
        </p>
        <p>
          <span className="font-medium">Tiempo:</span> {tiempoTranscurrido}
        </p>
      </div>

      {/* Barra de progreso */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Progreso
          </span>
          <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {progreso}%
          </span>
        </div>
        <div className={`w-full h-2 ${darkMode ? 'bg-slate-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
          <div 
            className="h-full bg-teal-600 rounded-full transition-all duration-300"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        {estado === 'Desconectado' && (
          <button 
            onClick={() => onRestablecerAcceso?.(id)}
            className="flex-1 py-2 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Restablecer Acceso
          </button>
        )}
        <button 
          onClick={() => onVerDetalles?.(id)}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
            darkMode
              ? 'bg-slate-700 text-gray-200 hover:bg-slate-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Ver Detalles
        </button>
      </div>
    </div>
  );
}