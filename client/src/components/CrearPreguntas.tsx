import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Image as ImageIcon, X, Check, ChevronDown, AlertCircle } from 'lucide-react';
import EditorTexto from './EditorTexto';

interface CrearPreguntasProps {
  darkMode: boolean;
  preguntasIniciales?: Pregunta[];
  onPreguntasChange?: (preguntas: Pregunta[]) => void;
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

interface EspacioBlanco {
  id: string;
  respuestaCorrecta: string;
}

export interface Pregunta {
  id: string;
  tipo: TipoPregunta;
  titulo: string;
  imagen: string | null;
  puntos: number;
  calificacionParcial?: boolean;
  opciones?: OpcionSeleccion[];
  textoConEspacios?: string;
  espacios?: EspacioBlanco[];
  paresConexion?: ParConexion[];
  respuestasCorrectas?: { [key: string]: string };
  // Nuevos campos para pregunta abierta
  metodoEvaluacion?: MetodoEvaluacionAbierta;
  palabrasClave?: string[];
  textoExacto?: string;
}

export default function CrearPreguntas({ darkMode, preguntasIniciales = [], onPreguntasChange }: CrearPreguntasProps) {
  const [preguntas, setPreguntas] = useState<Pregunta[]>(preguntasIniciales);
  const [preguntaEditando, setPreguntaEditando] = useState<string | null>(null);
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
    setPreguntaEditando(nuevaPregunta.id);
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
    if (preguntaEditando === id) setPreguntaEditando(null);
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
        cambios.textoConEspacios = '';
        cambios.espacios = [];
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
    if (pregunta?.opciones) {
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
    if (pregunta?.paresConexion) {
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

  // ========== FUNCIONES PARA RELLENAR ESPACIOS ==========
  
  const actualizarTextoConEspacios = (preguntaId: string, nuevoTexto: string) => {
    const numEspacios = (nuevoTexto.match(/___/g) || []).length;
    const pregunta = preguntas.find(p => p.id === preguntaId);
    
    let nuevosEspacios: EspacioBlanco[] = [];
    
    for (let i = 0; i < numEspacios; i++) {
      const espacioExistente = pregunta?.espacios?.[i];
      nuevosEspacios.push({
        id: (i + 1).toString(),
        respuestaCorrecta: espacioExistente?.respuestaCorrecta || ''
      });
    }
    
    actualizarPregunta(preguntaId, {
      textoConEspacios: nuevoTexto,
      espacios: nuevosEspacios
    });
  };

  const actualizarRespuestaEspacio = (preguntaId: string, espacioIndex: number, respuesta: string) => {
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (pregunta?.espacios) {
      const nuevosEspacios = [...pregunta.espacios];
      nuevosEspacios[espacioIndex] = {
        ...nuevosEspacios[espacioIndex],
        respuestaCorrecta: respuesta
      };
      actualizarPregunta(preguntaId, { espacios: nuevosEspacios });
    }
  };

  const toggleCalificacionParcial = (preguntaId: string) => {
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (pregunta) {
      actualizarPregunta(preguntaId, { 
        calificacionParcial: !pregunta.calificacionParcial 
      });
    }
  };

  // ========== NUEVAS FUNCIONES PARA PREGUNTA ABIERTA ==========
  
  const cambiarMetodoEvaluacion = (preguntaId: string, metodo: MetodoEvaluacionAbierta) => {
    actualizarPregunta(preguntaId, { metodoEvaluacion: metodo });
  };

  const agregarPalabraClave = (preguntaId: string) => {
    if (palabraClaveTemp.trim() === '') return;
    
    const pregunta = preguntas.find(p => p.id === preguntaId);
    if (pregunta) {
      const palabrasActuales = pregunta.palabrasClave || [];
      actualizarPregunta(preguntaId, {
        palabrasClave: [...palabrasActuales, palabraClaveTemp.trim()]
      });
      setPalabraClaveTemp('');
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

  // ========== FIN NUEVAS FUNCIONES ==========

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

  const renderizarPreguntaEdicion = (pregunta: Pregunta) => {
    const permiteCalificacionParcial = ['seleccion-multiple', 'rellenar-espacios', 'conectar', 'abierta'].includes(pregunta.tipo);

    return (
      <div 
        className={`rounded-lg border-l-4 border-l-blue-500 p-6 mb-4 ${
          darkMode ? 'bg-slate-800' : 'bg-white'
        } shadow-sm`}
      >
        {/* Header con input de pregunta y selector de tipo */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-1">
            <EditorTexto
              value={pregunta.titulo}
              onChange={(html) => actualizarPregunta(pregunta.id, { titulo: html })}
              darkMode={darkMode}
              placeholder="Escribe tu pregunta aquí..."
              minHeight="80px"
            />
          </div>

          <label className={`p-3 rounded-lg cursor-pointer transition-colors self-start mt-2 ${
            darkMode ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
          }`}>
            <ImageIcon className="w-5 h-5" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImagenCarga(pregunta.id, e)}
            />
          </label>

          <div className="relative self-start mt-2">
            <button
              onClick={() => setMostrarSelectorTipo(mostrarSelectorTipo === pregunta.id ? null : pregunta.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${
                darkMode 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-gray-50 border-gray-300'
              }`}
            >
              <span>{tiposPregunta.find(t => t.tipo === pregunta.tipo)?.icono}</span>
              <span>{tiposPregunta.find(t => t.tipo === pregunta.tipo)?.nombre}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {mostrarSelectorTipo === pregunta.id && (
              <div className={`absolute right-0 mt-2 w-64 rounded-lg border shadow-lg z-10 ${
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
          <div className="space-y-2 mb-4">
            {pregunta.opciones?.map((opcion, index) => (
              <div key={opcion.id} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                  darkMode ? 'border-gray-500' : 'border-gray-400'
                }`} />
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
            <button
              onClick={() => agregarOpcion(pregunta.id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${
                darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 ${
                darkMode ? 'border-gray-500' : 'border-gray-400'
              }`} />
              <span>Agregar una opción</span>
            </button>
          </div>
        )}

        {pregunta.tipo === 'rellenar-espacios' && (
          <div className="mb-4">
            <textarea
              value={pregunta.textoConEspacios}
              onChange={(e) => actualizarTextoConEspacios(pregunta.id, e.target.value)}
              placeholder="Escribe el texto con espacios en blanco. Usa ___ para indicar espacios. Ejemplo: El ___ es azul y la ___ es roja."
              rows={4}
              className={`w-full px-4 py-3 rounded-lg border resize-none ${
                darkMode 
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                  : 'bg-gray-50 border-gray-300 placeholder-gray-500'
              }`}
            />
            <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Usa "___" para crear espacios en blanco. {pregunta.espacios && pregunta.espacios.length > 0 && 
              `(${pregunta.espacios.length} ${pregunta.espacios.length === 1 ? 'espacio detectado' : 'espacios detectados'})`}
            </p>
          </div>
        )}

        {pregunta.tipo === 'conectar' && (
          <div className="space-y-3 mb-4">
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
            <button
              onClick={() => agregarParConexion(pregunta.id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${
                darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Agregar par</span>
            </button>
          </div>
        )}

        {pregunta.tipo === 'abierta' && (
          <div className="mb-4">
            <div className={`px-4 py-3 rounded-lg border ${
              darkMode ? 'bg-slate-700 border-slate-600 text-gray-400' : 'bg-gray-50 border-gray-300 text-gray-500'
            }`}>
              Texto de respuesta largo
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
            <span className="font-medium">Respuestas correctas</span>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              ({pregunta.puntos} {pregunta.puntos === 1 ? 'punto' : 'puntos'})
            </span>
            {pregunta.tipo === 'seleccion-multiple' && !pregunta.opciones?.some(o => o.esCorrecta) && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
              }`}>
                Sin configurar
              </span>
            )}
            {pregunta.tipo === 'rellenar-espacios' && pregunta.espacios && 
             pregunta.espacios.some(e => !e.respuestaCorrecta) && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
              }`}>
                Incompleto
              </span>
            )}
          </button>

          {mostrarClaveRespuesta === pregunta.id && (
            <div className={`mt-3 p-4 rounded-lg border ${
              darkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
            }`}>
              {pregunta.tipo === 'seleccion-multiple' && (
                <div className="space-y-3">
                  <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Selecciona las respuestas correctas:
                  </p>
                  {pregunta.opciones?.map((opcion) => (
                    <div
                      key={opcion.id}
                      onClick={() => toggleRespuestaCorrecta(pregunta.id, opcion.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        opcion.esCorrecta
                          ? darkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-300'
                          : darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        opcion.esCorrecta 
                          ? 'bg-green-500 border-green-500'
                          : darkMode ? 'border-gray-500' : 'border-gray-400'
                      }`}>
                        {opcion.esCorrecta && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={darkMode ? 'text-white' : 'text-gray-900'}>{opcion.texto}</span>
                      {opcion.esCorrecta && (
                        <Check className="w-4 h-4 text-green-500 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {pregunta.tipo === 'rellenar-espacios' && (
                <div className="space-y-3">
                  <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Define las respuestas correctas para cada espacio:
                  </p>
                  {pregunta.espacios && pregunta.espacios.length > 0 ? (
                    pregunta.espacios.map((espacio, index) => (
                      <div key={espacio.id} className="flex items-center gap-3">
                        <span className={`text-sm font-medium min-w-[80px] ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Espacio {index + 1}:
                        </span>
                        <input
                          type="text"
                          value={espacio.respuestaCorrecta}
                          onChange={(e) => actualizarRespuestaEspacio(pregunta.id, index, e.target.value)}
                          placeholder="Respuesta correcta"
                          className={`flex-1 px-3 py-2 rounded border ${
                            darkMode 
                              ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 placeholder-gray-500'
                          }`}
                        />
                        {espacio.respuestaCorrecta ? (
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                    ))
                  ) : (
                    <p className={`text-sm italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Primero define el texto con espacios en blanco (usando ___)
                    </p>
                  )}
                </div>
              )}

              {pregunta.tipo === 'conectar' && (
                <div className="space-y-3">
                  <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Las conexiones ya están definidas por los pares que creaste
                  </p>
                </div>
              )}

              {pregunta.tipo === 'abierta' && (
                <div className="space-y-4">
                  {/* Selector de método de evaluación */}
                  <div>
                    <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Método de evaluación:
                    </p>
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
                        <div className={`text-xs mt-1 ${
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
                        <div className={`text-xs mt-1 ${
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
                        <div className={`text-xs mt-1 ${
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
                        Define las palabras clave que deben aparecer:
                      </p>
                      
                      {/* Input para agregar palabras clave */}
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
                          className={`flex-1 px-3 py-2 rounded border ${
                            darkMode 
                              ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 placeholder-gray-500'
                          }`}
                        />
                        <button
                          onClick={() => agregarPalabraClave(pregunta.id)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            darkMode 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          Agregar
                        </button>
                      </div>

                      {/* Lista de palabras clave */}
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

                      <p className={`text-xs mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                        onChange={(e) => actualizarTextoExacto(pregunta.id, e.target.value)}
                        placeholder="Escribe la respuesta exacta que esperas del estudiante..."
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
                          <span className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                            Respuesta configurada ({pregunta.textoExacto.length} caracteres)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <span className={`text-xs ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            Define la respuesta esperada
                          </span>
                        </div>
                      )}

                      <p className={`text-xs mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
              )}

              {/* Input de puntos y opción de calificación parcial */}
              <div className="mt-4 pt-4 border-t border-gray-300 dark:border-slate-600 space-y-4">
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
                {permiteCalificacionParcial && pregunta.tipo !== 'abierta' && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Calificación parcial:
                    </label>
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
                    {pregunta.calificacionParcial && (
                      <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Se otorgarán puntos proporcionales por respuestas parcialmente correctas
                      </p>
                    )}
                  </div>
                )}

                {/* Calificación parcial para pregunta abierta */}
                {pregunta.tipo === 'abierta' && pregunta.metodoEvaluacion !== 'manual' && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Calificación parcial:
                    </label>
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
                    <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {pregunta.metodoEvaluacion === 'palabras-clave' 
                        ? 'Se otorgarán puntos proporcionales según cuántas palabras clave se encuentren'
                        : 'La respuesta debe ser exacta para obtener puntos (sin puntos parciales)'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
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
        return pregunta.espacios && pregunta.espacios.length > 0 && 
               pregunta.espacios.every(e => e.respuestaCorrecta && e.respuestaCorrecta.trim() !== '');
      }
      if (pregunta.tipo === 'conectar') {
        return pregunta.paresConexion && pregunta.paresConexion.length > 0 && 
               pregunta.paresConexion.every(p => p.izquierda && p.derecha);
      }
      return false;
    };

    const tipoInfo = tiposPregunta.find(t => t.tipo === pregunta.tipo);
    const configurada = tieneRespuestasConfiguradas();

    return (
      <div
        onClick={() => setPreguntaEditando(pregunta.id)}
        className={`rounded-lg p-6 mb-4 cursor-pointer transition-all ${
          darkMode ? 'bg-slate-800 hover:bg-slate-750' : 'bg-white hover:bg-gray-50'
        } shadow-sm border border-transparent hover:border-blue-300`}
      >
        <div className="flex gap-4">
          <div className={`text-lg font-medium flex-shrink-0 pt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {index + 1}.
          </div>
          <div className="flex-1 min-w-0">
            {/* Badges arriba - ahora a la derecha */}
            <div className="flex items-center justify-end gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                darkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}>
                <span>{tipoInfo?.icono}</span>
                <span>{tipoInfo?.nombre}</span>
              </span>
              {!configurada && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  darkMode ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700' : 'bg-yellow-50 text-yellow-700 border border-yellow-300'
                }`}>
                  <span>⚠️</span>
                  <span>Sin configurar</span>
                </span>
              )}
              {pregunta.calificacionParcial && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  darkMode ? 'bg-teal-900/30 text-teal-400 border border-teal-700' : 'bg-blue-50 text-blue-700 border border-blue-300'
                }`}>
                  <span>📊</span>
                  <span>Parcial</span>
                </span>
              )}
              <div className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {pregunta.puntos} {pregunta.puntos === 1 ? 'pt' : 'pts'}
              </div>
            </div>
            
            {/* Título de la pregunta - ahora con todo el ancho */}
            <div 
              className={`mb-2 ${darkMode ? 'text-white' : 'text-gray-900'} prose prose-sm max-w-none`}
              dangerouslySetInnerHTML={{ __html: pregunta.titulo || '<span style="color: #9ca3af;">Pregunta sin título</span>' }}
            />
            
            {pregunta.imagen && (
              <div className="mb-3">
                <img src={pregunta.imagen} alt="Pregunta" className="w-full max-w-3xl mx-auto rounded-lg" />
              </div>
            )}
            {pregunta.tipo === 'seleccion-multiple' && (
              <div className="space-y-2 mt-3">
                {pregunta.opciones?.map((opcion) => (
                  <div key={opcion.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      darkMode ? 'border-gray-500' : 'border-gray-400'
                    }`} />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {opcion.texto}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {pregunta.tipo === 'abierta' && (
              <div className="mt-3">
                <div className={`w-full p-4 rounded-lg border-2 border-dashed min-h-[100px] flex items-center justify-center ${
                  darkMode ? 'border-slate-600 bg-slate-700/30' : 'border-gray-300 bg-gray-50'
                }`}>
                  <span className={`text-sm italic ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    El estudiante escribirá su respuesta aquí...
                  </span>
                </div>
                {pregunta.metodoEvaluacion && pregunta.metodoEvaluacion !== 'manual' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pregunta.metodoEvaluacion === 'palabras-clave'
                        ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                        : darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {pregunta.metodoEvaluacion === 'palabras-clave' ? '🔑 Palabras clave' : '📝 Respuesta exacta'}
                    </span>
                  </div>
                )}
              </div>
            )}
            {pregunta.tipo === 'rellenar-espacios' && (
              <div className="space-y-3 mt-3">
                {pregunta.textoConEspacios ? (
                  <div className={`${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                    {pregunta.textoConEspacios.split('___').map((parte, idx) => (
                      <span key={idx}>
                        {parte}
                        {idx < pregunta.textoConEspacios!.split('___').length - 1 && (
                          <span className={`inline-block min-w-[100px] mx-1 px-3 py-1 border-b-2 ${
                            darkMode ? 'border-gray-500' : 'border-gray-400'
                          }`}>
                            {' '}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className={`text-sm italic ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Sin texto configurado
                  </div>
                )}
              </div>
            )}
            {pregunta.tipo === 'conectar' && (
              <div className="space-y-2 mt-3">
                {pregunta.paresConexion && pregunta.paresConexion.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Columna izquierda */}
                      <div className="space-y-2">
                        {pregunta.paresConexion.map((par, idx) => (
                          <div
                            key={`izq-${par.id}`}
                            className={`flex items-center gap-2 p-2 rounded ${
                              darkMode ? 'bg-slate-700' : 'bg-gray-100'
                            }`}
                          >
                            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              darkMode ? 'bg-slate-600 text-white' : 'bg-gray-300 text-gray-700'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {par.izquierda || '...'}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Columna derecha */}
                      <div className="space-y-2">
                        {pregunta.paresConexion.map((par, idx) => (
                          <div
                            key={`der-${par.id}`}
                            className={`flex items-center gap-2 p-2 rounded ${
                              darkMode ? 'bg-slate-700' : 'bg-gray-100'
                            }`}
                          >
                            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              darkMode ? 'bg-slate-600 text-white' : 'bg-gray-300 text-gray-700'
                            }`}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {par.derecha || '...'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className={`text-xs italic mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Conecta cada elemento de la izquierda con su correspondiente de la derecha
                    </p>
                  </>
                ) : (
                  <div className={`text-sm italic ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Sin pares configurados
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
        preguntaEditando === pregunta.id 
          ? renderizarPreguntaEdicion(pregunta)
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

      {/* Estilos globales para renderizado de HTML en modo vista */}
      <style>{`
        /* Estilos para listas en el contenido renderizado */
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

        /* Evitar que el texto se ponga en negrita automáticamente */
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

        /* Estilos para enlaces */
        .prose a {
          color: #3b82f6;
          text-decoration: underline;
        }

        /* Estilos para texto formateado - SOLO cuando se aplica explícitamente */
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

        /* Alineación de texto */
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