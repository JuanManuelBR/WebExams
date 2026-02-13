import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Image as ImageIcon, X, Check, ChevronDown, AlertCircle, HelpCircle, ChevronUp, Pencil } from 'lucide-react';
import EditorTexto from './EditorTexto';

interface CrearPreguntasProps {
  darkMode: boolean;
  preguntasIniciales?: Pregunta[];
  onPreguntasChange?: (preguntas: Pregunta[]) => void;
  onValidationChange?: (isValid: boolean) => void;
}

type TipoPregunta = 'seleccion-multiple' | 'rellenar-espacios' | 'conectar' | 'abierta';
type MetodoEvaluacionAbierta = 'palabras-clave' | 'texto-exacto' | 'manual';

interface OpcionSeleccion {
  id: string;
  texto: string;
  esCorrecta: boolean;
}

interface ParConexion {
  id: string;
  izquierda: string;
  derecha: string;
}

interface PalabraSeleccionada {
  indice: number;
  palabra: string;
}

export interface Pregunta {
  id: string;
  tipo: TipoPregunta;
  titulo: string;
  imagen: string | null;
  puntos: number;
  calificacionParcial?: boolean;
  opciones?: OpcionSeleccion[];
  // Nuevos campos para rellenar espacios
  textoCompleto?: string;
  palabrasSeleccionadas?: PalabraSeleccionada[];
  paresConexion?: ParConexion[];
  respuestasCorrectas?: { [key: string]: string };
  // Campos para pregunta abierta
  metodoEvaluacion?: MetodoEvaluacionAbierta;
  palabrasClave?: string[];
  textoExacto?: string;
}

// --- CONSTANTES DE ESTILO (Igual que en ExamenPreguntas) ---
const COLOR_THEMES = [
  { border: "border-l-blue-500", gradient: "from-blue-500 to-indigo-600" },
  { border: "border-l-emerald-500", gradient: "from-emerald-500 to-teal-600" },
  { border: "border-l-orange-500", gradient: "from-orange-500 to-red-600" },
  { border: "border-l-purple-500", gradient: "from-purple-500 to-fuchsia-600" },
  { border: "border-l-pink-500", gradient: "from-pink-500 to-rose-600" },
  { border: "border-l-cyan-500", gradient: "from-cyan-500 to-blue-600" },
  { border: "border-l-yellow-500", gradient: "from-yellow-500 to-amber-600" },
];

const getTheme = (index: number) => COLOR_THEMES[index % COLOR_THEMES.length];

export default function CrearPreguntas({ darkMode, preguntasIniciales = [], onPreguntasChange, onValidationChange }: CrearPreguntasProps) {
  const [preguntas, setPreguntas] = useState<Pregunta[]>(preguntasIniciales);
  const [preguntasEditando, setPreguntasEditando] = useState<Set<string>>(new Set());
  const [mostrarSelectorTipo, setMostrarSelectorTipo] = useState<string | null>(null);
  const [mostrarClaveRespuesta, setMostrarClaveRespuesta] = useState<string | null>(null);
  const [puntosTemp, setPuntosTemp] = useState<{[key: string]: string}>({});
  const [palabraClaveTemp, setPalabraClaveTemp] = useState<string>('');

  // Notificar al padre cuando cambien las preguntas
  useEffect(() => {
    if (onPreguntasChange) {
      onPreguntasChange(preguntas);
    }
  }, [preguntas, onPreguntasChange]);

  // Verificar validación de preguntas y notificar al padre
  useEffect(() => {
    if (onValidationChange) {
      const todasConfiguradas = preguntas.every(pregunta => {
        if (pregunta.tipo === 'seleccion-multiple') {
          return pregunta.opciones?.some(o => o.esCorrecta) || false;
        }
        if (pregunta.tipo === 'abierta') {
          if (pregunta.metodoEvaluacion === 'manual') return true;
          if (pregunta.metodoEvaluacion === 'palabras-clave') {
            return pregunta.palabrasClave && pregunta.palabrasClave.length > 0;
          }
          if (pregunta.metodoEvaluacion === 'texto-exacto') {
            return pregunta.textoExacto && pregunta.textoExacto.trim() !== '';
          }
          return false;
        }
        if (pregunta.tipo === 'rellenar-espacios') {
          return pregunta.palabrasSeleccionadas && pregunta.palabrasSeleccionadas.length > 0;
        }
        if (pregunta.tipo === 'conectar') {
          return pregunta.paresConexion && pregunta.paresConexion.length > 0 && 
                 pregunta.paresConexion.every(p => p.izquierda && p.derecha);
        }
        return false;
      });
      onValidationChange(todasConfiguradas && preguntas.length > 0);
    }
  }, [preguntas, onValidationChange]);

  const toggleEditarPregunta = (id: string) => {
    setPreguntasEditando(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  };

  const crearNuevaPregunta = () => {
    const nuevaPregunta: Pregunta = {
      id: Date.now().toString(),
      tipo: 'seleccion-multiple',
      titulo: '',
      imagen: null,
      puntos: 1,
      calificacionParcial: false,
      opciones: [{ id: '1', texto: 'Opción 1', esCorrecta: false }]
    };
    setPreguntas([...preguntas, nuevaPregunta]);
    setPreguntasEditando(prev => new Set(prev).add(nuevaPregunta.id));
  };

  const duplicarPregunta = (id: string) => {
    const pregunta = preguntas.find(p => p.id === id);
    if (pregunta) {
      const nuevaPregunta = { ...pregunta, id: Date.now().toString() };
      setPreguntas([...preguntas, nuevaPregunta]);
    }
  };

  const eliminarPregunta = (id: string) => {
    setPreguntas(preguntas.filter(p => p.id !== id));
    setPreguntasEditando(prev => {
      const nuevo = new Set(prev);
      nuevo.delete(id);
      return nuevo;
    });
  };

  const actualizarPregunta = (id: string, cambios: Partial<Pregunta>) => {
    setPreguntas(preguntas.map(p => p.id === id ? { ...p, ...cambios } : p));
  };

  const cambiarTipoPregunta = (id: string, nuevoTipo: TipoPregunta) => {
    let cambios: Partial<Pregunta> = { tipo: nuevoTipo };

    switch (nuevoTipo) {
      case 'seleccion-multiple':
        cambios.opciones = [{ id: '1', texto: 'Opción 1', esCorrecta: false }];
        cambios.calificacionParcial = false;
        break;
      case 'rellenar-espacios':
        cambios.textoCompleto = '';
        cambios.palabrasSeleccionadas = [];
        cambios.calificacionParcial = false;
        break;
      case 'conectar':
        cambios.paresConexion = [{ id: '1', izquierda: '', derecha: '' }];
        cambios.respuestasCorrectas = {};
        cambios.calificacionParcial = false;
        break;
      case 'abierta':
        cambios.metodoEvaluacion = 'manual';
        cambios.palabrasClave = [];
        cambios.textoExacto = '';
        cambios.calificacionParcial = false;
        break;
    }

    actualizarPregunta(id, cambios);
    setMostrarSelectorTipo(null);
  };

  const agregarOpcion = (id: string) => {
    const pregunta = preguntas.find(p => p.id === id);
    if (pregunta?.opciones && pregunta.opciones.length < 10) {
      const nuevaOpcion: OpcionSeleccion = {
        id: Date.now().toString(),
        texto: `Opción ${pregunta.opciones.length + 1}`,
        esCorrecta: false
      };
      actualizarPregunta(id, { opciones: [...pregunta.opciones, nuevaOpcion] });
    }
  };

  const eliminarOpcion = (preguntaId: string, opcionId: string) => {
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (pregunta?.opciones) {
      actualizarPregunta(preguntaId, {
        opciones: pregunta.opciones.filter(o => o.id !== opcionId)
      });
    }
  };

  const actualizarOpcion = (preguntaId: string, opcionId: string, texto: string) => {
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (pregunta?.opciones) {
      actualizarPregunta(preguntaId, {
        opciones: pregunta.opciones.map(o => o.id === opcionId ? { ...o, texto } : o)
      });
    }
  };

  const toggleRespuestaCorrecta = (preguntaId: string, opcionId: string) => {
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (pregunta?.opciones) {
      actualizarPregunta(preguntaId, {
        opciones: pregunta.opciones.map(o => 
          o.id === opcionId ? { ...o, esCorrecta: !o.esCorrecta } : o
        )
      });
    }
  };

  const agregarParConexion = (id: string) => {
    const pregunta = preguntas.find(p => p.id === id);
    if (pregunta?.paresConexion && pregunta.paresConexion.length < 10) {
      const nuevoPar: ParConexion = {
        id: Date.now().toString(),
        izquierda: '',
        derecha: ''
      };
      actualizarPregunta(id, { paresConexion: [...pregunta.paresConexion, nuevoPar] });
    }
  };

  const eliminarParConexion = (preguntaId: string, parId: string) => {
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (pregunta?.paresConexion) {
      actualizarPregunta(preguntaId, {
        paresConexion: pregunta.paresConexion.filter(p => p.id !== parId)
      });
    }
  };

  const actualizarParConexion = (preguntaId: string, parId: string, lado: 'izquierda' | 'derecha', valor: string) => {
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (pregunta?.paresConexion) {
      actualizarPregunta(preguntaId, {
        paresConexion: pregunta.paresConexion.map(p => 
          p.id === parId ? { ...p, [lado]: valor } : p
        )
      });
    }
  };

  // ========== NUEVAS FUNCIONES PARA RELLENAR ESPACIOS ==========
  
  const actualizarTextoCompleto = (preguntaId: string, nuevoTexto: string) => {
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (!pregunta) return;

    // Obtener las palabras del nuevo texto
    const palabrasNuevas = nuevoTexto.split(/\s+/).filter(p => p.trim().length > 0);
    
    // Filtrar las palabras seleccionadas que aún existen en el nuevo texto
    const palabrasSeleccionadasActualizadas = (pregunta.palabrasSeleccionadas || []).filter(ps => {
      // Verificar si el índice todavía es válido
      if (ps.indice >= palabrasNuevas.length) return false;
      
      // Verificar si la palabra en esa posición sigue siendo la misma
      return palabrasNuevas[ps.indice] === ps.palabra;
    });

    actualizarPregunta(preguntaId, {
      textoCompleto: nuevoTexto,
      palabrasSeleccionadas: palabrasSeleccionadasActualizadas
    });
  };

  const manejarDobleClicPalabra = (preguntaId: string, e: React.MouseEvent<HTMLTextAreaElement>) => {
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (!pregunta || !pregunta.textoCompleto) return;

    const textarea = e.currentTarget as HTMLTextAreaElement;
    const posicionClick = textarea.selectionStart;
    const texto = pregunta.textoCompleto;

    // Encontrar los límites de la palabra en la posición del clic
    let inicio = posicionClick;
    let fin = posicionClick;

    // Expandir hacia atrás hasta encontrar un espacio o el inicio
    while (inicio > 0 && !/\s/.test(texto[inicio - 1])) {
      inicio--;
    }

    // Expandir hacia adelante hasta encontrar un espacio o el final
    while (fin < texto.length && !/\s/.test(texto[fin])) {
      fin++;
    }

    const palabraSeleccionada = texto.substring(inicio, fin).trim();
    
    if (!palabraSeleccionada || palabraSeleccionada.length === 0) return;

    // Contar cuántas palabras hay antes de esta posición
    const textoAntes = texto.substring(0, inicio);
    const palabrasAntes = textoAntes.split(/\s+/).filter(p => p.trim().length > 0);
    const indice = palabrasAntes.length;

    const palabrasSeleccionadas = pregunta.palabrasSeleccionadas || [];
    const yaSeleccionada = palabrasSeleccionadas.find(p => p.indice === indice);

    if (yaSeleccionada) {
      // Deseleccionar
      actualizarPregunta(preguntaId, {
        palabrasSeleccionadas: palabrasSeleccionadas.filter(p => p.indice !== indice)
      });
    } else {
      // Seleccionar (máximo 10)
      if (palabrasSeleccionadas.length < 10) {
        actualizarPregunta(preguntaId, {
          palabrasSeleccionadas: [...palabrasSeleccionadas, { indice, palabra: palabraSeleccionada }]
            .sort((a, b) => a.indice - b.indice)
        });
      }
    }

    // Restaurar el foco al textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(posicionClick, posicionClick);
    }, 0);
  };

  const eliminarPalabraSeleccionada = (preguntaId: string, indice: number) => {
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (!pregunta || !pregunta.palabrasSeleccionadas) return;

    actualizarPregunta(preguntaId, {
      palabrasSeleccionadas: pregunta.palabrasSeleccionadas.filter(p => p.indice !== indice)
    });
  };

  const generarTextoConEspacios = (pregunta: Pregunta): string => {
    if (!pregunta.textoCompleto) return '';

    const palabras = pregunta.textoCompleto.split(/\s+/);
    const palabrasSeleccionadas = pregunta.palabrasSeleccionadas || [];
    
    return palabras.map((palabra, idx) => {
      const estaSeleccionada = palabrasSeleccionadas.some(p => p.indice === idx);
      return estaSeleccionada ? '___' : palabra;
    }).join(' ');
  };

  const toggleCalificacionParcial = (preguntaId: string) => {
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (pregunta) {
      actualizarPregunta(preguntaId, { 
        calificacionParcial: !pregunta.calificacionParcial 
      });
    }
  };

  // ========== FUNCIONES PARA PREGUNTA ABIERTA ==========
  
  const cambiarMetodoEvaluacion = (preguntaId: string, metodo: MetodoEvaluacionAbierta) => {
    actualizarPregunta(preguntaId, { metodoEvaluacion: metodo });
  };

  const agregarPalabraClave = (preguntaId: string) => {
    if (palabraClaveTemp.trim() === '') return;
    
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (pregunta) {
      const palabrasActuales = pregunta.palabrasClave || [];
      if (palabrasActuales.length < 15) {
        actualizarPregunta(preguntaId, {
          palabrasClave: [...palabrasActuales, palabraClaveTemp.trim()]
        });
        setPalabraClaveTemp('');
      }
    }
  };

  const eliminarPalabraClave = (preguntaId: string, index: number) => {
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (pregunta?.palabrasClave) {
      actualizarPregunta(preguntaId, {
        palabrasClave: pregunta.palabrasClave.filter((_, i) => i !== index)
      });
    }
  };

  const actualizarTextoExacto = (preguntaId: string, texto: string) => {
    actualizarPregunta(preguntaId, { textoExacto: texto });
  };

  const handleImagenCarga = (preguntaId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        actualizarPregunta(preguntaId, { imagen: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const eliminarImagen = (preguntaId: string) => {
    actualizarPregunta(preguntaId, { imagen: null });
  };

  const tiposPregunta = [
    { tipo: 'seleccion-multiple' as TipoPregunta, nombre: 'Opción múltiple', icono: '◉' },
    { tipo: 'rellenar-espacios' as TipoPregunta, nombre: 'Rellenar espacios', icono: '_' },
    { tipo: 'conectar' as TipoPregunta, nombre: 'Conectar', icono: '⟷' },
    { tipo: 'abierta' as TipoPregunta, nombre: 'Párrafo', icono: '≡' }
  ];

  const renderizarPreguntaEdicion = (pregunta: Pregunta, index: number) => {
    const permiteCalificacionParcial = ['seleccion-multiple', 'rellenar-espacios', 'conectar', 'abierta'].includes(pregunta.tipo);
    const theme = getTheme(index);

    return (
      <div 
        className={`rounded-lg border-l-4 ${theme.border} p-6 mb-4 ${
          darkMode ? 'bg-slate-800' : 'bg-white'
        } shadow-sm`}
      >
        {/* Header con botón de colapsar */}
        <div className="flex items-center justify-between mb-4">
          <div className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Pregunta {index + 1}
          </div>
          <button
            onClick={() => toggleEditarPregunta(pregunta.id)}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Cerrar edición"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de tipo de pregunta */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Seleccione el tipo de pregunta
          </label>
          <div className="relative">
            <button
              onClick={() => setMostrarSelectorTipo(mostrarSelectorTipo === pregunta.id ? null : pregunta.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border w-full justify-between ${
                darkMode 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-gray-50 border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{tiposPregunta.find(t => t.tipo === pregunta.tipo)?.icono}</span>
                <span>{tiposPregunta.find(t => t.tipo === pregunta.tipo)?.nombre}</span>
              </div>
              <ChevronDown className="w-4 h-4" />
            </button>

            {mostrarSelectorTipo === pregunta.id && (
              <div className={`absolute left-0 right-0 mt-2 rounded-lg border shadow-lg z-10 ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
              }`}>
                {tiposPregunta.map((tipo) => (
                  <button
                    key={tipo.tipo}
                    onClick={() => cambiarTipoPregunta(pregunta.id, tipo.tipo)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      pregunta.tipo === tipo.tipo 
                        ? darkMode ? 'bg-slate-700 text-white' : 'bg-blue-50 text-gray-900'
                        : darkMode ? 'hover:bg-slate-700 text-gray-200' : 'hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    <span className="text-xl">{tipo.icono}</span>
                    <span>{tipo.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor de pregunta e imagen */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Pregunta
          </label>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <EditorTexto
                value={pregunta.titulo}
                onChange={(html) => actualizarPregunta(pregunta.id, { titulo: html })}
                darkMode={darkMode}
                placeholder="Escribe tu pregunta aquí..."
                minHeight="80px"
              />
            </div>

            <label className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg cursor-pointer transition-all border-2 border-dashed self-start mt-2 ${
              darkMode 
                ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-700 text-gray-300 hover:text-white' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600'
            }`}>
              <ImageIcon className="w-5 h-5" />
              <span className="text-xs font-medium whitespace-nowrap">Subir imagen</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImagenCarga(pregunta.id, e)}
              />
            </label>
          </div>
        </div>

        {pregunta.imagen && (
          <div className="mb-4 relative">
            <img src={pregunta.imagen} alt="Pregunta" className="w-full max-w-3xl mx-auto rounded-lg" />
            <button
              onClick={() => eliminarImagen(pregunta.id)}
              className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Contenido según tipo de pregunta */}
        {pregunta.tipo === 'seleccion-multiple' && (
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Opciones
            </label>
            <div className="space-y-2">
              {pregunta.opciones?.map((opcion, index) => (
                <div key={opcion.id} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleRespuestaCorrecta(pregunta.id, opcion.id)}
                    className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition-all ${
                      opcion.esCorrecta
                        ? 'bg-green-500 border-green-500'
                        : darkMode 
                          ? 'border-gray-500 hover:border-green-400' 
                          : 'border-gray-400 hover:border-green-500'
                    }`}
                    title={opcion.esCorrecta ? 'Respuesta correcta' : 'Marcar como correcta'}
                  >
                    {opcion.esCorrecta && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <input
                    type="text"
                    value={opcion.texto}
                    onChange={(e) => actualizarOpcion(pregunta.id, opcion.id, e.target.value)}
                    className={`flex-1 px-3 py-2 rounded border ${
                      darkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  />
                  {pregunta.opciones && pregunta.opciones.length > 1 && (
                    <button
                      onClick={() => eliminarOpcion(pregunta.id, opcion.id)}
                      className={`p-2 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {pregunta.opciones && pregunta.opciones.length < 10 ? (
                <button
                  onClick={() => agregarOpcion(pregunta.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm ${
                    darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 ${
                    darkMode ? 'border-gray-500' : 'border-gray-400'
                  }`} />
                  <span>Agregar una opción</span>
                </button>
              ) : (
                <p className={`text-sm italic ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Máximo 10 opciones alcanzado
                </p>
              )}
            </div>
          </div>
        )}

        {pregunta.tipo === 'rellenar-espacios' && (
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Texto completo
            </label>
            <div className="relative">
              {/* Capa de fondo con resaltado de palabras seleccionadas */}
              {pregunta.textoCompleto && pregunta.palabrasSeleccionadas && pregunta.palabrasSeleccionadas.length > 0 && (
                <div 
                  className={`absolute inset-0 px-4 py-3 rounded-lg pointer-events-none whitespace-pre-wrap break-words overflow-hidden`}
                  style={{ 
                    lineHeight: '1.5',
                    zIndex: 1,
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    letterSpacing: 'normal',
                    wordSpacing: 'normal'
                  }}
                  aria-hidden="true"
                >
                  {pregunta.textoCompleto.split(/(\s+)/).map((parte, idx) => {
                    // Si es un espacio, renderizarlo tal cual
                    if (/\s+/.test(parte)) {
                      return <span key={idx}>{parte}</span>;
                    }
                    
                    // Calcular el índice real de la palabra (sin contar espacios)
                    const palabrasAnteriores = pregunta.textoCompleto!
                      .substring(0, pregunta.textoCompleto!.indexOf(parte, idx > 0 ? pregunta.textoCompleto!.split(/(\s+)/).slice(0, idx).join('').length : 0))
                      .split(/\s+/)
                      .filter(p => p.trim().length > 0);
                    const indicePalabra = palabrasAnteriores.length;
                    
                    const estaSeleccionada = pregunta.palabrasSeleccionadas?.some(p => p.indice === indicePalabra);
                    
                    return (
                      <span 
                        key={idx}
                        className={estaSeleccionada 
                          ? darkMode 
                            ? 'bg-blue-500/30 border-b-2 border-blue-400 rounded-sm' 
                            : 'bg-blue-200/60 border-b-2 border-blue-500 rounded-sm'
                          : ''
                        }
                        style={{ color: 'transparent' }}
                      >
                        {parte}
                      </span>
                    );
                  })}
                </div>
              )}
              
              {/* Textarea editable encima */}
              <textarea
                value={pregunta.textoCompleto || ''}
                onChange={(e) => actualizarTextoCompleto(pregunta.id, e.target.value)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  manejarDobleClicPalabra(pregunta.id, e);
                }}
                placeholder="Escribe el texto aquí y luego haz doble clic en las palabras que quieres convertir en espacios en blanco..."
                rows={5}
                className={`w-full px-4 py-3 rounded-lg border resize-none relative ${
                  darkMode 
                    ? 'bg-transparent border-slate-600 text-white placeholder-gray-400' 
                    : 'bg-transparent border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                style={{ 
                  lineHeight: '1.5',
                  zIndex: 2,
                  position: 'relative',
                  backgroundColor: 'transparent',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div className={`mt-3 space-y-2`}>
              <p className={`text-sm flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <span className="font-medium">💡 Instrucciones:</span>
                <span>Haz doble clic en cualquier palabra para seleccionarla como espacio en blanco. Máximo 10 palabras.</span>
              </p>
              
              {pregunta.textoCompleto && pregunta.palabrasSeleccionadas && pregunta.palabrasSeleccionadas.length > 0 && (
                <div className={`flex items-center gap-2 flex-wrap p-3 rounded-lg ${
                  darkMode ? 'bg-slate-600/50' : 'bg-blue-50'
                }`}>
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Espacios seleccionados ({pregunta.palabrasSeleccionadas.length}/10):
                  </span>
                  {pregunta.palabrasSeleccionadas.map((ps, idx) => (
                    <span 
                      key={idx}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium ${
                        darkMode 
                          ? 'bg-blue-500/40 text-white border border-blue-400' 
                          : 'bg-blue-200 text-gray-900 border border-blue-400'
                      }`}
                    >
                      <span>{ps.palabra}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarPalabraSeleccionada(pregunta.id, ps.indice);
                        }}
                        className={`hover:opacity-70 transition-opacity ${
                          darkMode ? 'text-white' : 'text-gray-700'
                        }`}
                        title="Eliminar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {pregunta.palabrasSeleccionadas && pregunta.palabrasSeleccionadas.length >= 10 && (
                <p className={`text-sm ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  ⚠️ Máximo de 10 espacios alcanzado
                </p>
              )}
            </div>
          </div>
        )}

        {pregunta.tipo === 'conectar' && (
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Pares de conexión
            </label>
            <div className="space-y-3">
              {pregunta.paresConexion?.map((par) => (
                <div key={par.id} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={par.izquierda}
                    onChange={(e) => actualizarParConexion(pregunta.id, par.id, 'izquierda', e.target.value)}
                    placeholder="Elemento izquierdo"
                    className={`flex-1 px-3 py-2 rounded border ${
                      darkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  />
                  <span className={`text-2xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>⟷</span>
                  <input
                    type="text"
                    value={par.derecha}
                    onChange={(e) => actualizarParConexion(pregunta.id, par.id, 'derecha', e.target.value)}
                    placeholder="Elemento derecho"
                    className={`flex-1 px-3 py-2 rounded border ${
                      darkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  />
                  {pregunta.paresConexion && pregunta.paresConexion.length > 1 && (
                    <button
                      onClick={() => eliminarParConexion(pregunta.id, par.id)}
                      className={`p-2 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {pregunta.paresConexion && pregunta.paresConexion.length < 10 ? (
                <button
                  onClick={() => agregarParConexion(pregunta.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm ${
                    darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar par</span>
                </button>
              ) : (
                <p className={`text-sm italic ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Máximo 10 pares alcanzado
                </p>
              )}
            </div>
          </div>
        )}

        {pregunta.tipo === 'abierta' && (
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Método de evaluación
            </label>
            <div className="space-y-4">
              {/* Selector de método de evaluación */}
              <div>
                <div className="flex gap-3">
                  <button
                    onClick={() => cambiarMetodoEvaluacion(pregunta.id, 'manual')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      pregunta.metodoEvaluacion === 'manual'
                        ? darkMode 
                          ? 'border-blue-500 bg-blue-500/10 text-white' 
                          : 'border-blue-600 bg-blue-50 text-gray-900'
                        : darkMode
                          ? 'border-slate-600 text-gray-300 hover:border-slate-500'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-sm font-medium">Manual</div>
                    <div className={`text-sm mt-1 ${
                      pregunta.metodoEvaluacion === 'manual'
                        ? darkMode ? 'text-blue-300' : 'text-blue-600'
                        : darkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      Calificación manual del profesor
                    </div>
                  </button>
                  
                  <button
                    onClick={() => cambiarMetodoEvaluacion(pregunta.id, 'palabras-clave')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      pregunta.metodoEvaluacion === 'palabras-clave'
                        ? darkMode 
                          ? 'border-green-500 bg-green-500/10 text-white' 
                          : 'border-green-600 bg-green-50 text-gray-900'
                        : darkMode
                          ? 'border-slate-600 text-gray-300 hover:border-slate-500'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-sm font-medium">Palabras clave</div>
                    <div className={`text-sm mt-1 ${
                      pregunta.metodoEvaluacion === 'palabras-clave'
                        ? darkMode ? 'text-green-300' : 'text-green-600'
                        : darkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      Busca términos en la respuesta
                    </div>
                  </button>
                  
                  <button
                    onClick={() => cambiarMetodoEvaluacion(pregunta.id, 'texto-exacto')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      pregunta.metodoEvaluacion === 'texto-exacto'
                        ? darkMode 
                          ? 'border-purple-500 bg-purple-500/10 text-white' 
                          : 'border-purple-600 bg-purple-50 text-gray-900'
                        : darkMode
                          ? 'border-slate-600 text-gray-300 hover:border-slate-500'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-sm font-medium">Respuesta exacta</div>
                    <div className={`text-sm mt-1 ${
                      pregunta.metodoEvaluacion === 'texto-exacto'
                        ? darkMode ? 'text-purple-300' : 'text-purple-600'
                        : darkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      Comparación textual exacta
                    </div>
                  </button>
                </div>
              </div>

              {/* Configuración según el método seleccionado */}
              {pregunta.metodoEvaluacion === 'palabras-clave' && (
                <div className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'
                }`}>
                  <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Define las palabras clave que deben aparecer (máximo 15):
                  </p>
                  
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={palabraClaveTemp}
                      onChange={(e) => setPalabraClaveTemp(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          agregarPalabraClave(pregunta.id);
                        }
                      }}
                      placeholder="Escribe una palabra clave..."
                      disabled={(pregunta.palabrasClave?.length || 0) >= 15}
                      className={`flex-1 px-3 py-2 rounded border ${
                        darkMode 
                          ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400 disabled:opacity-50' 
                          : 'bg-white border-gray-300 placeholder-gray-500 disabled:opacity-50'
                      }`}
                    />
                    <button
                      onClick={() => agregarPalabraClave(pregunta.id)}
                      disabled={(pregunta.palabrasClave?.length || 0) >= 15}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        darkMode 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      Agregar
                    </button>
                  </div>

                  {pregunta.palabrasClave && pregunta.palabrasClave.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {pregunta.palabrasClave.map((palabra, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                            darkMode 
                              ? 'bg-green-900/30 border border-green-700 text-green-300' 
                              : 'bg-green-100 border border-green-300 text-green-800'
                          }`}
                        >
                          <span className="text-sm font-medium">{palabra}</span>
                          <button
                            onClick={() => eliminarPalabraClave(pregunta.id, index)}
                            className="hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No hay palabras clave definidas. Agrega al menos una.
                    </p>
                  )}

                  {pregunta.palabrasClave && pregunta.palabrasClave.length >= 15 && (
                    <p className={`text-sm mt-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      ⚠️ Máximo de 15 palabras clave alcanzado
                    </p>
                  )}

                  <p className={`text-sm mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    💡 El sistema buscará estas palabras en la respuesta del estudiante. 
                    Se otorgarán puntos proporcionales según cuántas palabras clave se encuentren.
                  </p>
                </div>
              )}

              {pregunta.metodoEvaluacion === 'texto-exacto' && (
                <div className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'
                }`}>
                  <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Define la respuesta exacta esperada:
                  </p>
                  
                  <textarea
                    value={pregunta.textoExacto || ''}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) {
                        actualizarTextoExacto(pregunta.id, e.target.value);
                      }
                    }}
                    placeholder="Escribe la respuesta exacta que esperas del estudiante..."
                    maxLength={1000}
                    rows={4}
                    className={`w-full px-4 py-3 rounded-lg border resize-none ${
                      darkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 placeholder-gray-500'
                    }`}
                  />

                  {pregunta.textoExacto && pregunta.textoExacto.trim() !== '' ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                        Respuesta configurada ({pregunta.textoExacto.length}/1000 caracteres)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      <span className={`text-sm ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        Define la respuesta esperada (máximo 1000 caracteres)
                      </span>
                    </div>
                  )}

                  <p className={`text-sm mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    💡 La respuesta del estudiante debe coincidir exactamente con este texto 
                    (se ignorarán espacios extra y mayúsculas/minúsculas).
                  </p>
                </div>
              )}

              {pregunta.metodoEvaluacion === 'manual' && (
                <div className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'
                }`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Esta pregunta será calificada manualmente por el profesor. 
                    No se requiere configuración de respuesta correcta.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clave de respuesta y puntos */}
        <div className="mb-4">
          <button
            onClick={() => setMostrarClaveRespuesta(mostrarClaveRespuesta === pregunta.id ? null : pregunta.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              darkMode ? 'text-blue-400 hover:bg-slate-700' : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            <Check className="w-4 h-4" />
            <span className="font-medium">Configuración de puntos</span>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              ({pregunta.puntos} {pregunta.puntos === 1 ? 'punto' : 'puntos'})
            </span>
            {pregunta.tipo === 'rellenar-espacios' && (!pregunta.palabrasSeleccionadas || pregunta.palabrasSeleccionadas.length === 0) && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
              }`}>
                Sin espacios
              </span>
            )}
          </button>

          {mostrarClaveRespuesta === pregunta.id && (
            <div className={`mt-3 p-4 rounded-lg border ${
              darkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
            }`}>
              {pregunta.tipo === 'seleccion-multiple' && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Puntos de la pregunta:
                    </label>
                    <input
                      type="text"
                      value={puntosTemp[pregunta.id] !== undefined ? puntosTemp[pregunta.id] : pregunta.puntos}
                      onChange={(e) => {
                        const valor = e.target.value;
                        if (valor === '' || /^[0-9]*[.,]?[0-9]*$/.test(valor)) {
                          setPuntosTemp({...puntosTemp, [pregunta.id]: valor});
                        }
                      }}
                      onFocus={() => {
                        if (puntosTemp[pregunta.id] === undefined) {
                          setPuntosTemp({...puntosTemp, [pregunta.id]: String(pregunta.puntos)});
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={() => {
                        const valor = puntosTemp[pregunta.id] || String(pregunta.puntos);
                        const numero = parseFloat(valor.replace(',', '.'));
                        
                        if (valor === '' || isNaN(numero) || numero <= 0) {
                          actualizarPregunta(pregunta.id, { puntos: 1 });
                          setPuntosTemp({...puntosTemp, [pregunta.id]: '1'});
                        } else {
                          actualizarPregunta(pregunta.id, { puntos: numero });
                          const temp = {...puntosTemp};
                          delete temp[pregunta.id];
                          setPuntosTemp(temp);
                        }
                      }}
                      className={`w-32 px-3 py-2 rounded border ${
                        darkMode 
                          ? 'bg-slate-600 border-slate-500 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>

                  {(pregunta.opciones?.filter(o => o.esCorrecta).length || 0) >= 2 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Calificación parcial:
                      </label>
                      <div className="relative group">
                        <HelpCircle className={`w-5 h-5 ${darkMode ? "text-gray-500" : "text-gray-400"} cursor-help`} />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-normal" style={{ minWidth: '280px' }}>
                          Se otorgarán puntos proporcionales por respuestas parcialmente correctas
                          <div className="absolute left-3 -bottom-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleCalificacionParcial(pregunta.id)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 transition-all w-40 ${
                        pregunta.calificacionParcial
                          ? darkMode 
                            ? 'border-teal-500 bg-teal-500/10' 
                            : 'border-slate-700 bg-slate-700/10'
                          : darkMode
                            ? 'border-slate-600 hover:border-slate-500'
                            : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        pregunta.calificacionParcial
                          ? darkMode 
                            ? 'bg-teal-500 border-teal-500' 
                            : 'bg-slate-700 border-slate-700'
                          : darkMode
                            ? 'border-gray-500'
                            : 'border-gray-400'
                      }`}>
                        {pregunta.calificacionParcial && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {pregunta.calificacionParcial ? 'Activada' : 'Desactivada'}
                      </span>
                    </button>
                  </div>
                  )}
                </div>
              )}

              {/* Input de puntos y opción de calificación parcial - NO para selección múltiple */}
              {pregunta.tipo !== 'seleccion-multiple' && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Puntos de la pregunta:
                  </label>
                  <input
                    type="text"
                    value={puntosTemp[pregunta.id] !== undefined ? puntosTemp[pregunta.id] : pregunta.puntos}
                    onChange={(e) => {
                      const valor = e.target.value;
                      if (valor === '' || /^[0-9]*[.,]?[0-9]*$/.test(valor)) {
                        setPuntosTemp({...puntosTemp, [pregunta.id]: valor});
                      }
                    }}
                    onFocus={() => {
                      if (puntosTemp[pregunta.id] === undefined) {
                        setPuntosTemp({...puntosTemp, [pregunta.id]: String(pregunta.puntos)});
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    onBlur={() => {
                      const valor = puntosTemp[pregunta.id] || String(pregunta.puntos);
                      const numero = parseFloat(valor.replace(',', '.'));
                      
                      if (valor === '' || isNaN(numero) || numero <= 0) {
                        actualizarPregunta(pregunta.id, { puntos: 1 });
                        setPuntosTemp({...puntosTemp, [pregunta.id]: '1'});
                      } else {
                        actualizarPregunta(pregunta.id, { puntos: numero });
                        const temp = {...puntosTemp};
                        delete temp[pregunta.id];
                        setPuntosTemp(temp);
                      }
                    }}
                    className={`w-32 px-3 py-2 rounded border ${
                      darkMode 
                        ? 'bg-slate-600 border-slate-500 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                {/* Opción de calificación parcial */}
                {permiteCalificacionParcial && 
                 ((pregunta.tipo === 'rellenar-espacios' && (pregunta.palabrasSeleccionadas?.length || 0) >= 2) ||
                  (pregunta.tipo === 'conectar' && (pregunta.paresConexion?.length || 0) >= 2)) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Calificación parcial:
                      </label>
                      <div className="relative group">
                        <HelpCircle className={`w-5 h-5 ${darkMode ? "text-gray-500" : "text-gray-400"} cursor-help`} />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg" style={{ minWidth: '280px' }}>
                          Se otorgarán puntos proporcionales por respuestas parcialmente correctas
                          <div className="absolute left-3 -bottom-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleCalificacionParcial(pregunta.id)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 transition-all w-40 ${
                        pregunta.calificacionParcial
                          ? darkMode 
                            ? 'border-teal-500 bg-teal-500/10' 
                            : 'border-slate-700 bg-slate-700/10'
                          : darkMode
                            ? 'border-slate-600 hover:border-slate-500'
                            : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        pregunta.calificacionParcial
                          ? darkMode 
                            ? 'bg-teal-500 border-teal-500' 
                            : 'bg-slate-700 border-slate-700'
                          : darkMode
                            ? 'border-gray-500'
                            : 'border-gray-400'
                      }`}>
                        {pregunta.calificacionParcial && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {pregunta.calificacionParcial ? 'Activada' : 'Desactivada'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Calificación parcial para pregunta abierta */}
                {pregunta.tipo === 'abierta' && pregunta.metodoEvaluacion === 'palabras-clave' && (pregunta.palabrasClave?.length || 0) >= 2 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Calificación parcial:
                      </label>
                      <div className="relative group">
                        <HelpCircle className={`w-5 h-5 ${darkMode ? "text-gray-500" : "text-gray-400"} cursor-help`} />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg" style={{ minWidth: '280px' }}>
                          {pregunta.metodoEvaluacion === 'palabras-clave' 
                            ? 'Se otorgarán puntos proporcionales según cuántas palabras clave se encuentren en la respuesta del estudiante'
                            : 'La respuesta del estudiante debe coincidir exactamente con el texto especificado para obtener puntos (sin puntos parciales)'}
                          <div className="absolute left-3 -bottom-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleCalificacionParcial(pregunta.id)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 transition-all w-40 ${
                        pregunta.calificacionParcial
                          ? darkMode 
                            ? 'border-teal-500 bg-teal-500/10' 
                            : 'border-slate-700 bg-slate-700/10'
                          : darkMode
                            ? 'border-slate-600 hover:border-slate-500'
                            : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        pregunta.calificacionParcial
                          ? darkMode 
                            ? 'bg-teal-500 border-teal-500' 
                            : 'bg-slate-700 border-slate-700'
                          : darkMode
                            ? 'border-gray-500'
                            : 'border-gray-400'
                      }`}>
                        {pregunta.calificacionParcial && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {pregunta.calificacionParcial ? 'Activada' : 'Desactivada'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            onClick={() => duplicarPregunta(pregunta.id)}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
            }`}
            title="Duplicar"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={() => eliminarPregunta(pregunta.id)}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
            }`}
            title="Eliminar"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderizarPreguntaVista = (pregunta: Pregunta, index: number) => {
    const tieneRespuestasConfiguradas = () => {
      if (pregunta.tipo === 'seleccion-multiple') {
        return pregunta.opciones?.some(o => o.esCorrecta) || false;
      }
      if (pregunta.tipo === 'abierta') {
        if (pregunta.metodoEvaluacion === 'manual') return true;
        if (pregunta.metodoEvaluacion === 'palabras-clave') {
          return pregunta.palabrasClave && pregunta.palabrasClave.length > 0;
        }
        if (pregunta.metodoEvaluacion === 'texto-exacto') {
          return pregunta.textoExacto && pregunta.textoExacto.trim() !== '';
        }
        return false;
      }
      if (pregunta.tipo === 'rellenar-espacios') {
        return pregunta.palabrasSeleccionadas && pregunta.palabrasSeleccionadas.length > 0;
      }
      if (pregunta.tipo === 'conectar') {
        return pregunta.paresConexion && pregunta.paresConexion.length > 0 && 
               pregunta.paresConexion.every(p => p.izquierda && p.derecha);
      }
      return false;
    };

    const configurada = tieneRespuestasConfiguradas();
    const theme = getTheme(index);

    return (
      <div
        onClick={() => toggleEditarPregunta(pregunta.id)}
        className={`group relative rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden cursor-pointer mb-6 ${
          darkMode 
            ? "bg-slate-800/60 border-slate-800 hover:border-blue-700/80" 
            : "bg-white border-gray-200 hover:shadow-lg hover:border-blue-300"
        }`}
      >
        {/* Indicador de Vista Previa / Edición */}
        <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl text-sm font-medium flex items-center gap-2 transition-colors z-10 ${
            darkMode 
              ? "bg-slate-700 text-slate-300 group-hover:bg-blue-600 group-hover:text-white" 
              : "bg-gray-100 text-gray-500 group-hover:bg-blue-500 group-hover:text-white"
        }`}>
            <span>Vista previa</span>
            <Pencil className="w-4 h-4" />
        </div>

        {/* Barra lateral de estado (decorativa) con color dinámico */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${theme.gradient}`}></div>

        <div className="p-6 md:p-8 pl-8 md:pl-10">
          {/* Encabezado de la Pregunta */}
          <div className="flex items-start gap-4 mb-6">
            <span className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm shrink-0 transition-all duration-300 ${
              configurada 
                ? (darkMode ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50" : "bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200")
                : (darkMode ? "bg-slate-700 text-slate-300" : "bg-white text-slate-600")
            }`}>
              {index + 1}
            </span>
            <div className="flex-1">
              <div 
                className={`text-xl font-medium font-serif leading-snug ${darkMode ? "text-gray-100" : "text-gray-900"} prose prose-sm max-w-none ${darkMode ? "prose-invert" : ""}`}
                dangerouslySetInnerHTML={{ __html: pregunta.titulo || '<span class="opacity-50">Pregunta sin título</span>' }}
              />
              
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`inline-block text-sm font-semibold px-3 py-1.5 rounded ${darkMode ? "bg-slate-700/50 text-slate-400" : "bg-white text-slate-500 border border-gray-100"}`}>
                  {pregunta.puntos} {pregunta.puntos === 1 ? "punto" : "puntos"}
                </span>
                {!configurada && (
                  <span className={`inline-block text-sm font-semibold px-3 py-1.5 rounded ${darkMode ? "bg-yellow-900/30 text-yellow-400 border border-yellow-700/50" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                    ⚠️ Sin configurar
                  </span>
                )}
                {pregunta.calificacionParcial && (
                  <span className={`inline-block text-sm font-semibold px-3 py-1.5 rounded ${darkMode ? "bg-teal-900/30 text-teal-400 border border-teal-700/50" : "bg-teal-50 text-teal-700 border border-teal-200"}`}>
                    📊 Parcial
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Imagen Opcional */}
          {pregunta.imagen && (
            <div className={`mb-6 rounded-xl overflow-hidden border flex justify-center p-4 ${darkMode ? "bg-slate-900/50 border-slate-700" : "bg-white border-gray-200"}`}>
              <img
                src={pregunta.imagen}
                alt="Referencia visual"
                className="max-h-80 object-contain rounded-lg shadow-sm"
              />
            </div>
          )}

          {/* Cuerpo de la pregunta según tipo */}
          <div className="mt-4">
            {pregunta.tipo === 'seleccion-multiple' && (
              <div className="grid grid-cols-1 gap-3">
                {pregunta.opciones?.map((option) => (
                  <div
                    key={option.id}
                    className={`
                      flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200
                      ${darkMode ? "border-slate-700 bg-slate-800/40" : "border-gray-200 bg-white"}
                    `}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      darkMode ? "border-slate-500" : "border-gray-300"
                    }`}>
                    </div>
                    <span className={`flex-1 font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                      {option.texto}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {pregunta.tipo === 'rellenar-espacios' && (
              <div className={`p-6 rounded-xl border leading-loose text-lg ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
                {generarTextoConEspacios(pregunta).split("___").map((parte, idx, arr) => (
                  <span key={idx}>
                    <span className={darkMode ? "text-slate-300" : "text-slate-700"}>{parte}</span>
                    {idx < arr.length - 1 && (
                      <span className="relative inline-block mx-1">
                        <input
                          type="text"
                          disabled
                          className={`w-32 px-2 py-1 text-center border-b-2 outline-none rounded-t font-medium ${darkMode ? "bg-slate-800 border-slate-600 text-slate-400" : "bg-gray-50 border-gray-300 text-gray-500"}`}
                        />
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}

            {pregunta.tipo === 'conectar' && (
              <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800/50 border-slate-700/80" : "bg-white border-gray-200"}`}>
                <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-12">
                  {/* Columna A */}
                  <div className="flex-1 space-y-4">
                    <div className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 text-center">Columna A</div>
                    {pregunta.paresConexion?.map((par, idx) => (
                      <div
                        key={`a-${par.id}`}
                        className={`p-4 rounded-xl border-2 flex items-center justify-between ${darkMode ? "border-slate-700 bg-slate-800/80" : "border-gray-200 bg-white"}`}
                      >
                        <span className={`font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{par.izquierda}</span>
                        <div className={`w-3 h-3 rounded-full border-2 ${darkMode ? "bg-slate-700 border-slate-500" : "bg-white border-gray-300"}`}></div>
                      </div>
                    ))}
                  </div>
                  {/* Columna B */}
                  <div className="flex-1 space-y-4">
                    <div className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 text-center">Columna B</div>
                    {pregunta.paresConexion?.map((par, idx) => (
                      <div
                        key={`b-${par.id}`}
                        className={`p-4 rounded-xl border-2 flex items-center ${darkMode ? "border-slate-700 bg-slate-800/80" : "border-gray-200 bg-white"}`}
                      >
                        <div className={`w-3 h-3 rounded-full border-2 mr-auto ${darkMode ? "bg-slate-700 border-slate-500" : "bg-white border-gray-300"}`}></div>
                        <span className={`font-medium text-right flex-1 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{par.derecha}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {pregunta.tipo === 'abierta' && (
              <div className="flex flex-col gap-3">
                <textarea
                  disabled
                  className={`w-full min-h-[140px] p-4 rounded-xl border-2 outline-none resize-y placeholder-slate-400 ${darkMode ? "bg-slate-800/70 border-slate-700 text-slate-200" : "bg-gray-50 border-gray-200 text-slate-700"}`}
                  placeholder="El estudiante escribirá su respuesta aquí..."
                />
                {pregunta.metodoEvaluacion !== 'manual' && (
                  <div className="flex justify-end">
                    <span className={`text-sm px-3 py-1.5 rounded-full border ${
                      pregunta.metodoEvaluacion === 'palabras-clave'
                        ? (darkMode ? "bg-green-900/30 text-green-400 border-green-700" : "bg-green-100 text-green-700 border-green-300")
                        : (darkMode ? "bg-purple-900/30 text-purple-400 border-purple-700" : "bg-purple-100 text-purple-700 border-purple-300")
                    }`}>
                      {pregunta.metodoEvaluacion === 'palabras-clave' ? 'Evaluación por palabras clave' : 'Evaluación exacta'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {preguntas.map((pregunta, index) => (
        preguntasEditando.has(pregunta.id)
          ? renderizarPreguntaEdicion(pregunta, index)
          : renderizarPreguntaVista(pregunta, index)
      ))}

      <button
        onClick={crearNuevaPregunta}
        className={`w-full py-4 rounded-lg border-2 border-dashed transition-colors ${
          darkMode 
            ? 'border-slate-600 hover:border-slate-500 text-gray-400 hover:text-gray-300' 
            : 'border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" />
          <span className="font-medium">Agregar pregunta</span>
        </div>
      </button>

      {/* Estilos globales */}
      <style>{`
        .prose ul,
        .prose ol {
          padding-left: 2em !important;
          margin: 0.5em 0 !important;
          list-style-position: outside !important;
        }
        
        .prose ul {
          list-style-type: disc !important;
        }
        
        .prose ol {
          list-style-type: decimal !important;
        }
        
        .prose li {
          display: list-item !important;
          margin: 0.25em 0 !important;
        }
        
        .prose ul li {
          list-style-type: disc !important;
        }
        
        .prose ol li {
          list-style-type: decimal !important;
        }

        .prose p {
          font-weight: normal !important;
        }

        .prose h1,
        .prose h2,
        .prose h3,
        .prose h4,
        .prose h5,
        .prose h6 {
          font-weight: normal !important;
        }

        .prose a {
          color: #3b82f6;
          text-decoration: underline;
        }

        .prose strong {
          font-weight: 700 !important;
        }

        .prose em {
          font-style: italic !important;
        }

        .prose u {
          text-decoration: underline !important;
        }

        .prose s {
          text-decoration: line-through !important;
        }

        .prose [style*="text-align: center"] {
          text-align: center;
        }

        .prose [style*="text-align: right"] {
          text-align: right;
        }

        .prose [style*="text-align: justify"] {
          text-align: justify;
        }
      `}</style>
    </div>
  );
}