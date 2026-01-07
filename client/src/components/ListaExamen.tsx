import { useState, useEffect } from 'react';
import { 
  Copy, 
  Trash2, 
  Share2,
  Check,
  FileText,
  Edit,
  MoreVertical,
  Calendar,
  Search,
  X,
  Plus,
  BookOpen,
  Link,
  Archive,
  Eye,
  ArchiveRestore,
  RefreshCw
} from 'lucide-react';

interface ExamenGuardado {
  codigoExamen: string;
  nombreExamen: string;
  tipoPregunta: string;
  fechaCreacion: string;
  fechaInicio?: string;
  fechaCierre?: string;
}

interface ListaExamenesProps {
  darkMode: boolean;
  onVerDetalles?: (examen: ExamenGuardado) => void;
  onCrearExamen?: () => void;
}

interface ExamenConEstado extends ExamenGuardado {
  activoManual?: boolean;
  archivado?: boolean;
}

export default function ListaExamenes({ darkMode, onVerDetalles, onCrearExamen }: ListaExamenesProps) {
  const [examenes, setExamenes] = useState<ExamenConEstado[]>([
    {
      codigoExamen: 'ABC123',
      nombreExamen: 'Examen de Matemáticas',
      tipoPregunta: 'automatico',
      fechaCreacion: '2024-01-15',
      activoManual: true,
      archivado: false
    },
    {
      codigoExamen: 'XYZ789',
      nombreExamen: 'Evaluación de Historia',
      tipoPregunta: 'pdf',
      fechaCreacion: '2024-01-20',
      activoManual: false,
      archivado: false
    },
    {
      codigoExamen: 'DEF456',
      nombreExamen: 'Quiz de Ciencias',
      tipoPregunta: 'escribir',
      fechaCreacion: '2024-01-25',
      activoManual: true,
      archivado: false
    }
  ]);
  
  const [codigoCopiado, setCodigoCopiado] = useState<string | null>(null);
  const [urlCopiada, setUrlCopiada] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [codigoGrande, setCodigoGrande] = useState<{ codigo: string; nombre: string } | null>(null);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [modalCompartir, setModalCompartir] = useState<ExamenConEstado | null>(null);
  const [correoDestino, setCorreoDestino] = useState('');
  const [compartiendoExito, setCompartiendoExito] = useState(false);

  // Función para ordenar exámenes: activos arriba, inactivos abajo
  const ordenarExamenes = (exams: ExamenConEstado[]) => {
    return [...exams].sort((a, b) => {
      // Primero por estado de archivo
      if (a.archivado !== b.archivado) {
        return a.archivado ? 1 : -1;
      }
      // Luego por estado activo
      if (a.activoManual !== b.activoManual) {
        return b.activoManual ? 1 : -1;
      }
      return 0;
    });
  };

  const examenesOrdenados = ordenarExamenes(examenes);
  const examenesActivos = examenesOrdenados.filter(ex => !ex.archivado);
  const examenesArchivados = examenesOrdenados.filter(ex => ex.archivado);
  const examenesAMostrar = mostrarArchivados ? examenesArchivados : examenesActivos;

  const toggleEstadoExamen = (codigo: string) => {
    setExamenes(prev => {
      const updated = prev.map(ex => {
        if (ex.codigoExamen === codigo) {
          return { ...ex, activoManual: !ex.activoManual };
        }
        return ex;
      });
      // Forzar re-renderizado con pequeño delay para animación
      return updated;
    });
  };

  const copiarSoloCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo).then(() => {
      setCodigoCopiado(codigo);
      setTimeout(() => setCodigoCopiado(null), 2000);
    });
  };

  const regenerarCodigo = (codigoActual: string) => {
    const nuevoCodigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    setExamenes(prev => prev.map(ex => {
      if (ex.codigoExamen === codigoActual) {
        return { ...ex, codigoExamen: nuevoCodigo };
      }
      return ex;
    }));
  };

  const copiarEnlaceExamen = (codigo: string) => {
    const url = `${window.location.origin}/acceso-examen?code=${encodeURIComponent(codigo)}`;
    navigator.clipboard.writeText(url).then(() => {
      setUrlCopiada(codigo);
      setTimeout(() => setUrlCopiada(null), 2000);
    });
  };

  const archivarExamen = (codigo: string, nombre: string) => {
    setExamenes(prev => prev.map(ex => {
      if (ex.codigoExamen === codigo) {
        return { ...ex, archivado: true, activoManual: false };
      }
      return ex;
    }));
    setMenuAbierto(null);
  };

  const desarchivarExamen = (codigo: string) => {
    setExamenes(prev => prev.map(ex => {
      if (ex.codigoExamen === codigo) {
        return { ...ex, archivado: false, activoManual: true };
      }
      return ex;
    }));
    setMenuAbierto(null);
  };

  const compartirExamen = async (examen: ExamenGuardado) => {
    setModalCompartir(examen);
    setMenuAbierto(null);
  };

  const enviarExamenPorCorreo = () => {
    if (!correoDestino.trim()) {
      alert('Por favor ingresa un correo electrónico');
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correoDestino)) {
      alert('Por favor ingresa un correo electrónico válido');
      return;
    }

    // Aquí iría la lógica para enviar el examen
    console.log('Enviando examen a:', correoDestino);
    
    // Mostrar mensaje de éxito
    setCompartiendoExito(true);
    setTimeout(() => {
      setCompartiendoExito(false);
      setModalCompartir(null);
      setCorreoDestino('');
    }, 2000);
  };

  const confirmarEliminar = (codigo: string, nombre: string) => {
    if (window.confirm(`¿Eliminar "${nombre}"?`)) {
      setExamenes(prev => prev.filter(ex => ex.codigoExamen !== codigo));
    }
    setMenuAbierto(null);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const obtenerEstadoExamen = (examen: ExamenConEstado) => {
    if (examen.archivado) return 'Archivado';
    if (examen.activoManual === false) return 'Inactivo';
    const ahora = new Date();
    if (examen.fechaInicio && new Date(examen.fechaInicio) > ahora) return 'Programado';
    if (examen.fechaCierre && new Date(examen.fechaCierre) < ahora) return 'Finalizado';
    return 'Activo';
  };

  const obtenerColorTipo = (tipo: string) => {
    switch(tipo) {
      case 'automatico': return 'bg-indigo-600';
      case 'pdf': return 'bg-rose-600';
      case 'escribir': return 'bg-amber-600';
      default: return 'bg-slate-600';
    }
  };

  const obtenerEmojiTipo = (tipo: string) => {
    switch(tipo) {
      case 'automatico': return '🤖';
      case 'pdf': return '📄';
      case 'escribir': return '✍️';
      default: return '📝';
    }
  };

  if (examenes.length === 0) {
    return (
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-xl shadow-sm p-12 text-center`}>
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6 ${darkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
          <BookOpen className="w-12 h-12 text-teal-500" />
        </div>
        <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>No tienes exámenes</h3>
        <button onClick={onCrearExamen} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium mt-4 bg-teal-600 hover:bg-teal-700 text-white transition-colors">
          <Plus className="w-5 h-5" /> Crear Primer Examen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Botón Archivados */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setMostrarArchivados(!mostrarArchivados)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm ${
            darkMode 
              ? 'bg-[#2D3748] text-gray-200 hover:bg-[#374151]'
              : 'bg-[#1e293b] text-white hover:bg-[#1e293b]/90'
          }`}
        >
          {mostrarArchivados ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
          {mostrarArchivados ? `Exámenes Activos (${examenesActivos.length})` : `Archivados (${examenesArchivados.length})`}
        </button>
      </div>

      {/* Modal Compartir */}
      {modalCompartir && (
        <div 
          className="fixed top-0 left-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-8 overflow-hidden animate-in fade-in duration-200"
          onClick={() => {
            setModalCompartir(null);
            setCorreoDestino('');
          }}
        >
          <div 
            className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-2xl p-8 max-w-lg w-full relative shadow-2xl`} 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => {
                setModalCompartir(null);
                setCorreoDestino('');
              }} 
              className={`absolute top-4 right-4 p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <X className="w-5 h-5" />
            </button>

            {compartiendoExito ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ¡Examen compartido!
                </h3>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  El examen ha sido enviado exitosamente
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Compartir Examen
                  </h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Envía una copia de "{modalCompartir.nombreExamen}" a otro usuario
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Campo de correo */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Correo electrónico del destinatario
                    </label>
                    <input
                      type="email"
                      value={correoDestino}
                      onChange={(e) => setCorreoDestino(e.target.value)}
                      placeholder="profesor@ejemplo.com"
                      className={`w-full px-4 py-3 rounded-lg border outline-none transition-all ${
                        darkMode 
                          ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  {/* Información del examen */}
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Información del examen
                    </p>
                    <div className="space-y-1">
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="font-medium">Nombre:</span> {modalCompartir.nombreExamen}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="font-medium">Tipo:</span> {modalCompartir.tipoPregunta}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setModalCompartir(null);
                      setCorreoDestino('');
                    }}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      darkMode 
                        ? 'bg-slate-800 text-gray-300 hover:bg-slate-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={enviarExamenPorCorreo}
                    className="flex-1 px-4 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Enviar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Código Grande */}
      {codigoGrande && (
        <div 
          className="fixed top-0 left-0 w-screen h-screen bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-8 overflow-hidden animate-in fade-in duration-200"
          onClick={() => setCodigoGrande(null)}
        >
          <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-3xl p-12 max-w-4xl w-full relative shadow-2xl overflow-hidden scale-100`} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setCodigoGrande(null)} className={`absolute top-6 right-6 p-3 rounded-full ${darkMode ? 'hover:bg-slate-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}>
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              <h2 className={`text-3xl font-bold mb-4 px-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{codigoGrande.nombre}</h2>
              <code className="text-8xl font-bold font-mono text-teal-500 mt-8 block">{codigoGrande.codigo}</code>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3 pb-24">
        {examenesAMostrar.length === 0 ? (
          <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'} rounded-xl p-8 text-center`}>
            <Archive className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {mostrarArchivados ? 'No hay exámenes archivados' : 'No hay exámenes activos'}
            </p>
          </div>
        ) : (
          examenesAMostrar.map((examen) => {
            const estado = obtenerEstadoExamen(examen);
            const isInactive = !examen.activoManual || examen.archivado;
            const isMenuOpen = menuAbierto === examen.codigoExamen;
            
            return (
              <div
                key={examen.codigoExamen}
                style={{
                  transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                className={`group rounded-2xl p-5 border ${
                  isMenuOpen ? 'z-50 relative shadow-xl' : 'z-0 relative'
                } ${
                  isInactive 
                    ? (darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-gray-100/70 border-gray-200/70')
                    : (darkMode ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50' : 'bg-white border-gray-200 shadow-sm hover:shadow-md')
                }`}
              >
                <div className="flex items-center gap-5">
                  
                  {/* === IZQUIERDA === */}
                  <div className={`flex-1 flex items-center gap-5 transition-all duration-300 ${isInactive ? 'opacity-50' : 'opacity-100'}`}>
                    
                    {/* Icono */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isInactive 
                        ? (darkMode ? 'bg-slate-700/50' : 'bg-gray-300/50') 
                        : obtenerColorTipo(examen.tipoPregunta)
                    }`}>
                      <FileText className={`w-7 h-7 ${isInactive ? (darkMode ? 'text-slate-500' : 'text-gray-400') : 'text-white'}`} />
                    </div>

                    {/* Textos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <h3 className={`font-bold text-lg truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {examen.nombreExamen}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          estado === 'Activo' ? (darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : 
                          estado === 'Archivado' ? (darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700') :
                          estado === 'Inactivo' ? (darkMode ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-200 text-gray-500') : 
                          (darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-700')
                        }`}>
                          {estado}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs opacity-80">
                        <span className={`flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Calendar className="w-3.5 h-3.5" /> {formatearFecha(examen.fechaCreacion)}
                        </span>
                        <span className={`flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {obtenerEmojiTipo(examen.tipoPregunta)} {examen.tipoPregunta.charAt(0).toUpperCase() + examen.tipoPregunta.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* CÓDIGO Y BOTONES */}
                    <div className="flex items-center gap-3">
                        
                        {/* 1. CAJA DE CÓDIGO */}
                        <div 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (!isInactive) copiarSoloCodigo(examen.codigoExamen); 
                          }}
                          className={`px-3.5 py-1.5 rounded-lg border text-base font-mono font-bold transition-all duration-200 shadow-sm ${
                            codigoCopiado === examen.codigoExamen 
                              ? 'bg-emerald-500 border-emerald-500 text-white' 
                              : isInactive 
                                ? (darkMode ? 'bg-slate-800/50 border-slate-700/50 text-slate-500' : 'bg-gray-200/50 border-gray-300/50 text-gray-400')
                                : (darkMode ? 'bg-slate-900/80 border-slate-600 text-teal-400 hover:border-teal-500 cursor-pointer active:scale-95' : 'bg-white border-gray-300 text-gray-900 hover:border-teal-500 cursor-pointer active:scale-95')
                          }`}
                          title={isInactive ? "" : "Clic para copiar código"}
                        >
                          {codigoCopiado === examen.codigoExamen 
                            ? <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-white"/> Copiado</span> 
                            : examen.codigoExamen
                          }
                        </div>

                        {/* COLUMNA 1: Link (arriba) y Lupa (abajo) */}
                        <div className="flex flex-col gap-1">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (!isInactive) copiarEnlaceExamen(examen.codigoExamen); 
                            }}
                            className={`p-1.5 rounded-lg transition-all duration-150 ${
                              urlCopiada === examen.codigoExamen 
                                ? 'bg-emerald-500 text-white' 
                                : isInactive
                                  ? ''
                                  : (darkMode ? 'hover:bg-white/10 active:scale-90 active:bg-white/20 text-gray-300' : 'hover:bg-black/5 active:scale-90 active:bg-black/10 text-gray-600')
                            }`}
                            title={isInactive ? "" : "Copiar link del examen"}
                          >
                            {urlCopiada === examen.codigoExamen ? <Check className="w-4 h-4" /> : <Link className={`w-4 h-4 ${isInactive ? (darkMode ? 'text-slate-600' : 'text-gray-400') : ''}`} />}
                          </button>

                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if(!isInactive) setCodigoGrande({ codigo: examen.codigoExamen, nombre: examen.nombreExamen }); 
                            }}
                            className={`p-1.5 rounded-lg transition-all duration-150 ${
                              isInactive
                                ? ''
                                : (darkMode ? 'hover:bg-white/10 active:scale-90 active:bg-white/20 text-gray-300' : 'hover:bg-black/5 active:scale-90 active:bg-black/10 text-gray-600')
                            }`}
                            title={isInactive ? "" : "Ver código grande"}
                          >
                            <Search className={`w-4 h-4 ${isInactive ? (darkMode ? 'text-slate-600' : 'text-gray-400') : ''}`} />
                          </button>
                        </div>

                        {/* COLUMNA 2: Solo Regenerar (centrado) */}
                        <div className="flex items-center">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if(!isInactive) regenerarCodigo(examen.codigoExamen); 
                            }}
                            className={`p-1.5 rounded-lg transition-all duration-150 ${
                              isInactive
                                ? ''
                                : (darkMode ? 'hover:bg-white/10 active:scale-90 active:bg-white/20 text-gray-300' : 'hover:bg-black/5 active:scale-90 active:bg-black/10 text-gray-600')
                            }`}
                            title={isInactive ? "" : "Regenerar código"}
                          >
                            <RefreshCw className={`w-4 h-4 ${isInactive ? (darkMode ? 'text-slate-600' : 'text-gray-400') : ''}`} />
                          </button>
                        </div>

                        {/* COLUMNA 3: Solo Ojo (centrado) */}
                        <div className="flex items-center">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (onVerDetalles) onVerDetalles(examen);
                            }}
                            className={`p-1.5 rounded-lg transition-all duration-150 ${
                              darkMode ? 'hover:bg-white/10 active:scale-90 active:bg-white/20 text-gray-300' : 'hover:bg-black/5 active:scale-90 active:bg-black/10 text-gray-600'
                            }`}
                            title="Visualizar examen"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                    </div>
                  </div>

                  {/* === DERECHA === */}
                  <div className={`flex items-center gap-3 pl-3 border-l ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                    
                    {/* Switch - Solo visible si no está archivado */}
                    {!examen.archivado && (
                      <button 
                        onClick={() => toggleEstadoExamen(examen.codigoExamen)}
                        className={`relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none ${
                          examen.activoManual 
                            ? (darkMode ? 'bg-emerald-600' : 'bg-emerald-500')
                            : (darkMode ? 'bg-slate-600' : 'bg-gray-300')
                        }`}
                        title={examen.activoManual ? "Desactivar examen" : "Activar examen"}
                      >
                        <span className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-200 ${
                          examen.activoManual ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    )}

                    {/* Menú Dropdown */}
                    <div className="relative z-10">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuAbierto(isMenuOpen ? null : examen.codigoExamen);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                      >
                        <MoreVertical className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      </button>
                      
                      {isMenuOpen && (
                        <>
                          {/* Backdrop para cerrar al hacer clic fuera */}
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setMenuAbierto(null)}
                          />
                          
                          <div className={`absolute right-0 top-full mt-2 w-44 rounded-xl shadow-2xl border z-50 py-1.5 ${
                            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
                          }`}>
                            
                            {/* COMPARTIR */}
                            <button 
                              onClick={() => compartirExamen(examen)} 
                              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                                darkMode ? 'text-gray-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <Share2 className="w-4 h-4 text-emerald-500" /> 
                              Compartir
                            </button>

                            {/* ARCHIVAR / DESARCHIVAR */}
                            {examen.archivado ? (
                              <button 
                                onClick={() => desarchivarExamen(examen.codigoExamen)} 
                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                                  darkMode ? 'text-gray-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <ArchiveRestore className="w-4 h-4 text-blue-500" /> 
                                Desarchivar
                              </button>
                            ) : (
                              <button 
                                onClick={() => archivarExamen(examen.codigoExamen, examen.nombreExamen)} 
                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                                  darkMode ? 'text-gray-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <Archive className="w-4 h-4 text-amber-500" /> 
                                Archivar
                              </button>
                            )}

                            <div className={`my-1 h-px ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />

                            <button 
                              onClick={() => confirmarEliminar(examen.codigoExamen, examen.nombreExamen)} 
                              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 text-red-500 transition-colors ${
                                darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" /> 
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}