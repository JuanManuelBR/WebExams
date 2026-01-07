import { useState, useEffect } from 'react';
import { 
  obtenerMisExamenes, 
  eliminarExamen, 
  type ExamenGuardado 
} from '../services/examenService';
import { 
  Copy, 
  Trash2, 
  Share2,
  Check,
  FileText,
  Edit,
  Eye,
  Users,
  MoreVertical,
  Calendar,
  Clock,
  ChevronRight,
  Search,
  X,
  Plus,
  BookOpen
} from 'lucide-react';

interface ListaExamenesProps {
  darkMode: boolean;
  onVerDetalles?: (examen: ExamenGuardado) => void;
  onCrearExamen?: () => void;
}

export default function ListaExamenes({ darkMode, onVerDetalles, onCrearExamen }: ListaExamenesProps) {
  const [examenes, setExamenes] = useState<ExamenGuardado[]>([]);
  const [codigoCopiado, setCodigoCopiado] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [codigoGrande, setCodigoGrande] = useState<{ codigo: string; nombre: string } | null>(null);

  useEffect(() => {
    cargarExamenes();
  }, []);

  const cargarExamenes = () => {
    const misExamenes = obtenerMisExamenes();
    // Filtrar por codigoExamen en lugar de id
    const examenesUnicos = misExamenes.filter((examen, index, self) =>
      index === self.findIndex((e) => e.codigoExamen === examen.codigoExamen)
    );
    setExamenes(examenesUnicos);
  };

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo).then(() => {
      setCodigoCopiado(codigo);
      setTimeout(() => setCodigoCopiado(null), 2000);
    });
  };

  const compartirExamen = async (examen: ExamenGuardado) => {
    const url = `${window.location.origin}/acceso-examen?code=${encodeURIComponent(examen.codigoExamen)}`;
    const texto = `Examen: ${examen.nombreExamen}\nCódigo: ${examen.codigoExamen}\nLink: ${url}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: examen.nombreExamen,
          text: texto
        });
      } catch (error) {
        console.log('Error al compartir:', error);
      }
    } else {
      navigator.clipboard.writeText(texto);
      alert('Información del examen copiada al portapapeles');
    }
    setMenuAbierto(null);
  };

  const confirmarEliminar = (codigo: string, nombre: string) => {
    if (window.confirm(`¿Está seguro que desea eliminar el examen "${nombre}"?`)) {
      if (eliminarExamen(codigo)) {
        alert('Examen eliminado exitosamente');
        cargarExamenes();
      } else {
        alert('Error al eliminar el examen');
      }
    }
    setMenuAbierto(null);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const obtenerEstadoExamen = (examen: ExamenGuardado): 'Activo' | 'Finalizado' | 'Programado' => {
    const ahora = new Date();
    
    if (examen.fechaInicio && new Date(examen.fechaInicio) > ahora) {
      return 'Programado';
    }
    
    if (examen.fechaCierre && new Date(examen.fechaCierre) < ahora) {
      return 'Finalizado';
    }
    
    return 'Activo';
  };

  const contarEstudiantes = (examen: ExamenGuardado): number => {
    return 0;
  };

  if (examenes.length === 0) {
    return (
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-xl shadow-sm p-12 text-center`}>
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6 ${
          darkMode ? 'bg-slate-800' : 'bg-gray-100'
        }`}>
          <BookOpen className={`w-12 h-12 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
        </div>
        
        <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          No tienes exámenes creados
        </h3>
        
        <p className={`text-base mb-8 max-w-md mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Comienza creando tu primer examen para evaluar a tus estudiantes
        </p>
        
        <button 
          onClick={onCrearExamen}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            darkMode 
              ? 'bg-slate-700 hover:bg-slate-600 text-white' 
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
        >
          <Plus className="w-5 h-5" />
          Crear Primer Examen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modal de código grande */}
      {codigoGrande && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
          onClick={() => setCodigoGrande(null)}
        >
          <div 
            className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-3xl p-12 max-w-4xl w-full relative shadow-2xl border-none`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setCodigoGrande(null)}
              className={`absolute top-6 right-6 p-3 rounded-full transition-all ${
                darkMode ? 'hover:bg-slate-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center">
              <h2 className={`text-3xl font-bold mb-4 break-words px-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {codigoGrande.nombre}
              </h2>
              <p className={`text-lg mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Código de acceso al examen
              </p>
              
              <div className={`${
                darkMode 
                  ? 'bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600' 
                  : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
              } border-4 rounded-3xl p-16`}>
                <code className={`text-8xl font-bold font-mono tracking-widest block ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {codigoGrande.codigo}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de exámenes */}
      <div className="space-y-3">
        {examenes.map((examen) => {
          const estado = obtenerEstadoExamen(examen);
          const estudiantes = contarEstudiantes(examen);

          return (
            <div
              key={examen.codigoExamen}
              className={`group ${
                darkMode 
                  ? 'bg-slate-800/40 hover:bg-slate-800/60 border-slate-700/50 hover:border-slate-600' 
                  : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300'
              } rounded-2xl p-5 transition-all duration-300 border hover:shadow-lg`}
            >
              <div className="flex items-center gap-5">
                {/* Icono y color según estado */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  estado === 'Activo' 
                    ? darkMode ? 'bg-slate-700' : 'bg-slate-700'
                    : estado === 'Programado'
                    ? darkMode ? 'bg-slate-600' : 'bg-slate-600'
                    : darkMode ? 'bg-slate-800' : 'bg-gray-400'
                }`}>
                  <FileText className="w-7 h-7 text-white" />
                </div>

                {/* Información del examen */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`font-bold text-lg truncate ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {examen.nombreExamen}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      estado === 'Activo' 
                        ? darkMode ? 'bg-slate-700 text-white' : 'bg-slate-700 text-white'
                        : estado === 'Programado'
                        ? darkMode ? 'bg-slate-600 text-white' : 'bg-slate-600 text-white'
                        : darkMode ? 'bg-slate-800 text-gray-300' : 'bg-gray-300 text-gray-700'
                    }`}>
                      {estado}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Calendar className="w-4 h-4" />
                      {formatearFecha(examen.fechaCreacion)}
                    </span>
                    <span className={`flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Users className="w-4 h-4" />
                      {estudiantes} estudiantes
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                      darkMode ? 'bg-slate-700/50 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {examen.tipoPregunta === 'automatico' ? '🤖 Automático' : 
                       examen.tipoPregunta === 'pdf' ? '📄 PDF' :
                       examen.tipoPregunta === 'escribir' ? '✍️ Escrito' : '📋 No digital'}
                    </span>
                  </div>
                </div>

                {/* Código con efecto hover */}
                <div className={`group/code relative px-4 py-3 rounded-xl transition-all ${
                  darkMode 
                    ? 'bg-slate-900/60 hover:bg-slate-900 border border-slate-700' 
                    : 'bg-gray-100 hover:bg-gray-200 border border-gray-200'
                }`}>
                  <div className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Código
                  </div>
                  <div className="flex items-center gap-2">
                    <code className={`text-lg font-bold font-mono tracking-wider ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {examen.codigoExamen}
                    </code>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCodigoGrande({ codigo: examen.codigoExamen, nombre: examen.nombreExamen })}
                        className={`p-1.5 rounded-lg transition-all opacity-0 group-hover/code:opacity-100 ${
                          darkMode 
                            ? 'hover:bg-slate-700 text-gray-400 hover:text-white' 
                            : 'hover:bg-gray-300 text-gray-600 hover:text-gray-900'
                        }`}
                        title="Ver código grande"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => copiarCodigo(examen.codigoExamen)}
                        className={`p-1.5 rounded-lg transition-all ${
                          codigoCopiado === examen.codigoExamen
                            ? darkMode ? 'bg-slate-700 text-white scale-110' : 'bg-gray-300 text-gray-900 scale-110'
                            : `opacity-0 group-hover/code:opacity-100 ${
                                darkMode 
                                  ? 'hover:bg-slate-700 text-gray-400 hover:text-white' 
                                  : 'hover:bg-gray-300 text-gray-600 hover:text-gray-900'
                              }`
                        }`}
                      >
                        {codigoCopiado === examen.codigoExamen ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onVerDetalles && onVerDetalles(examen)}
                    className={`p-2.5 rounded-xl transition-all ${
                      darkMode 
                        ? 'hover:bg-slate-700 text-gray-400 hover:text-white' 
                        : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                    }`}
                    title="Editar"
                  >
                    <Edit className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => onVerDetalles && onVerDetalles(examen)}
                    className={`p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${
                      darkMode 
                        ? 'hover:bg-slate-700 text-gray-400 hover:text-white' 
                        : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                    }`}
                    title="Ver detalles"
                  >
                    <Eye className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => compartirExamen(examen)}
                    className={`p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${
                      darkMode 
                        ? 'hover:bg-slate-700 text-gray-400 hover:text-white' 
                        : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                    }`}
                    title="Compartir"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setMenuAbierto(menuAbierto === examen.codigoExamen ? null : examen.codigoExamen)}
                      className={`p-2.5 rounded-xl transition-all ${
                        darkMode 
                          ? 'hover:bg-slate-700 text-gray-400' 
                          : 'hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {menuAbierto === examen.codigoExamen && (
                      <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl z-50 py-2 ${
                        darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
                      }`}>
                        <button
                          onClick={() => confirmarEliminar(examen.codigoExamen, examen.nombreExamen)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            darkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar examen
                        </button>
                      </div>
                    )}
                  </div>

                  <ChevronRight className={`w-5 h-5 opacity-0 group-hover:opacity-100 transition-all ${
                    darkMode ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}