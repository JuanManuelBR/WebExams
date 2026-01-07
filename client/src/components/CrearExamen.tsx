import { useState, useEffect } from 'react';
import { Upload, Check, ChevronDown, ChevronUp, Calendar, X } from 'lucide-react';
import EditorTexto from '../../src/components/EditorTexto'
import SeccionSeguridad from './SeccionSeguridad';
import SeccionHerramientas from './SeccionHerramientas';
import VisorPDF from '../../src/components/VisorPDF';
import CrearPreguntas, { type Pregunta } from './CrearPreguntas';
import ModalExamenCreado from './ModalExamenCreado';
import { crearExamen, inicializarUsuarioDemo } from '../services/examenService';

interface CrearExamenProps {
  darkMode: boolean;
}

type TipoPregunta = 'no-digital' | 'pdf' | 'escribir' | 'automatico';
type OpcionTiempoAgotado = 'envio-automatico' | 'debe-enviarse' | '';

interface CampoEstudiante {
  id: string;
  nombre: string;
  activo: boolean;
}

export default function CrearExamen({ darkMode }: CrearExamenProps) {
  const [nombreExamen, setNombreExamen] = useState('');
  const [descripcionExamen, setDescripcionExamen] = useState('');
  const [tipoPregunta, setTipoPregunta] = useState<TipoPregunta | null>(null);
  const [archivoPDF, setArchivoPDF] = useState<File | null>(null);
  const [preguntasEscritas, setPreguntasEscritas] = useState('');
  const [preguntasTemp, setPreguntasTemp] = useState('');
  
  const [preguntasAutomaticas, setPreguntasAutomaticas] = useState<Pregunta[]>([]);
  const [preguntasAutomaticasTemp, setPreguntasAutomaticasTemp] = useState<Pregunta[]>([]);
  
  const [mostrarModalPreguntas, setMostrarModalPreguntas] = useState(false);
  const [mostrarModalPreguntasAutomaticas, setMostrarModalPreguntasAutomaticas] = useState(false);
  const [mostrarVistaPreviaPDF, setMostrarVistaPreviaPDF] = useState(false);
  const [pdfCargando, setPdfCargando] = useState(false);
  const [pdfURL, setPdfURL] = useState<string | null>(null);
  const [tienePreguntasAutomaticas, setTienePreguntasAutomaticas] = useState(false);
  
  const [guardando, setGuardando] = useState(false);
  const [examenCreado, setExamenCreado] = useState<{
    codigo: string;
    url: string;
  } | null>(null);
  
  const [camposEstudiante, setCamposEstudiante] = useState<CampoEstudiante[]>([
    { id: 'nombre', nombre: 'Nombre', activo: false },
    { id: 'apellido', nombre: 'Apellido', activo: false },
    { id: 'correo', nombre: 'Correo electrónico', activo: false },
    { id: 'nombreProfesor', nombre: 'Nombre del profesor', activo: false },
    { id: 'numeroTelefono', nombre: 'Numero de telefono', activo: false },
    { id: 'codigoEstudiante', nombre: 'Código estudiante', activo: false },
  ]);

  const [fechaInicio, setFechaInicio] = useState('2024-01-15T07:00');
  const [fechaCierre, setFechaCierre] = useState('2024-01-15T07:40');
  const [fechaInicioHabilitada, setFechaInicioHabilitada] = useState(false);
  const [fechaCierreHabilitada, setFechaCierreHabilitada] = useState(false);
  const [limiteHabilitado, setLimiteHabilitado] = useState(false);
  const [limiteTiempo, setLimiteTiempo] = useState(30);
  const [unidadTiempo, setUnidadTiempo] = useState<'minutos' | 'horas'>('minutos');
  const [opcionTiempoAgotado, setOpcionTiempoAgotado] = useState<OpcionTiempoAgotado>('');

  const [contraseñaExamen, setContraseñaExamen] = useState('');
  const [consecuenciaAbandono, setConsecuenciaAbandono] = useState('');

  const [seccion1Abierta, setSeccion1Abierta] = useState(true);
  const [seccion2Abierta, setSeccion2Abierta] = useState(false);
  const [seccion3Abierta, setSeccion3Abierta] = useState(false);
  const [seccion4Abierta, setSeccion4Abierta] = useState(false);
  const [seccion5Abierta, setSeccion5Abierta] = useState(false);
  const [seccion6Abierta, setSeccion6Abierta] = useState(false);

  const [herramientasActivas, setHerramientasActivas] = useState({
    dibujo: false,
    calculadora: false,
    javascript: false,
    python: false,
    sqlite: false,
    excel: false
  });

  useEffect(() => {
    inicializarUsuarioDemo();
  }, []);

  const toggleCampo = (id: string) => {
    setCamposEstudiante(campos => campos.map(campo => campo.id === id ? { ...campo, activo: !campo.activo } : campo));
  };

  const toggleHerramienta = (herramienta: keyof typeof herramientasActivas) => {
    setHerramientasActivas(prev => ({
      ...prev,
      [herramienta]: !prev[herramienta]
    }));
  };

  const handlePDFSelection = (file: File) => {
    setArchivoPDF(file);
    setMostrarVistaPreviaPDF(true);
    setPdfCargando(true);
    const url = URL.createObjectURL(file);
    setTimeout(() => {
      setPdfURL(url);
      setPdfCargando(false);
    }, 1500);
  };

  const cerrarVistaPreviaPDF = () => {
    setMostrarVistaPreviaPDF(false);
    if (pdfURL) {
      URL.revokeObjectURL(pdfURL);
      setPdfURL(null);
    }
  };

  const elegirOtroPDF = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (pdfURL) {
          URL.revokeObjectURL(pdfURL);
        }
        setArchivoPDF(file);
        setPdfCargando(true);
        const url = URL.createObjectURL(file);
        setTimeout(() => {
          setPdfURL(url);
          setPdfCargando(false);
        }, 1500);
      }
    };
    input.click();
  };

  const abrirModalPreguntas = () => {
    setPreguntasTemp(preguntasEscritas);
    setMostrarModalPreguntas(true);
  };

  const guardarPreguntas = () => {
    setPreguntasEscritas(preguntasTemp);
    setMostrarModalPreguntas(false);
  };

  const cancelarPreguntas = () => {
    setPreguntasTemp(preguntasEscritas);
    setMostrarModalPreguntas(false);
  };

  const abrirModalPreguntasAutomaticas = () => {
    setPreguntasAutomaticasTemp([...preguntasAutomaticas]);
    setMostrarModalPreguntasAutomaticas(true);
  };

  const guardarPreguntasAutomaticas = () => {
    setPreguntasAutomaticas([...preguntasAutomaticasTemp]);
    setTienePreguntasAutomaticas(preguntasAutomaticasTemp.length > 0);
    setMostrarModalPreguntasAutomaticas(false);
  };

  const cancelarPreguntasAutomaticas = () => {
    setPreguntasAutomaticasTemp([...preguntasAutomaticas]);
    setMostrarModalPreguntasAutomaticas(false);
  };

  const handlePreguntasChange = (nuevasPreguntas: Pregunta[]) => {
    setPreguntasAutomaticasTemp(nuevasPreguntas);
  };

  const resetearFormulario = () => {
    setNombreExamen('');
    setDescripcionExamen('');
    setTipoPregunta(null);
    setArchivoPDF(null);
    setPreguntasEscritas('');
    setPreguntasAutomaticas([]);
    setPreguntasTemp('');
    setPreguntasAutomaticasTemp([]);
    setCamposEstudiante(campos => campos.map(c => ({ ...c, activo: false })));
    setFechaInicioHabilitada(false);
    setFechaCierreHabilitada(false);
    setLimiteHabilitado(false);
    setContraseñaExamen('');
    setConsecuenciaAbandono('');
    setHerramientasActivas({
      dibujo: false,
      calculadora: false,
      javascript: false,
      python: false,
      sqlite: false,
      excel: false
    });
    setSeccion1Abierta(true);
    setSeccion2Abierta(false);
    setSeccion3Abierta(false);
    setSeccion4Abierta(false);
    setSeccion5Abierta(false);
    setSeccion6Abierta(false);
  };

  const handleCrearExamen = async () => {
    if (!nombreExamen.trim()) {
      alert('Por favor, ingrese el nombre del examen');
      return;
    }
    
    if (!tipoPregunta) {
      alert('Por favor, seleccione un tipo de pregunta');
      return;
    }
    
    if (!consecuenciaAbandono) {
      alert('Por favor, seleccione una consecuencia de abandono');
      return;
    }
    
    if (tipoPregunta === 'pdf' && !archivoPDF) {
      alert('Por favor, seleccione un archivo PDF');
      return;
    }
    
    if (tipoPregunta === 'escribir' && !preguntasEscritas.trim()) {
      alert('Por favor, escriba las preguntas del examen');
      return;
    }
    
    if (tipoPregunta === 'automatico' && preguntasAutomaticas.length === 0) {
      alert('Por favor, agregue al menos una pregunta');
      return;
    }
    
    setGuardando(true);
    
    try {
      let contraseñaFinal = contraseñaExamen;
      if (contraseñaExamen === '') {
        const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const minusculas = 'abcdefghijklmnopqrstuvwxyz';
        const numeros = '0123456789';
        const simbolos = '!@#$%&*';
        const todos = mayusculas + minusculas + numeros + simbolos;
        let temp = '';
        temp += mayusculas[Math.floor(Math.random() * mayusculas.length)];
        temp += minusculas[Math.floor(Math.random() * minusculas.length)];
        temp += numeros[Math.floor(Math.random() * numeros.length)];
        temp += simbolos[Math.floor(Math.random() * simbolos.length)];
        for (let i = 4; i < 6; i++) {
          temp += todos[Math.floor(Math.random() * todos.length)];
        }
        contraseñaFinal = temp.split('').sort(() => Math.random() - 0.5).join('');
        setContraseñaExamen(contraseñaFinal);
      }
      
      const datosExamen = {
        nombreExamen,
        descripcionExamen,
        tipoPregunta,
        archivoPDF,
        nombreArchivoPDF: archivoPDF?.name,
        preguntasEscritas: tipoPregunta === 'escribir' ? preguntasEscritas : undefined,
        preguntasAutomaticas: tipoPregunta === 'automatico' ? preguntasAutomaticas : undefined,
        camposActivos: camposEstudiante.filter(c => c.activo),
        fechaInicio: fechaInicioHabilitada ? fechaInicio : null,
        fechaCierre: fechaCierreHabilitada ? fechaCierre : null,
        limiteTiempo: limiteHabilitado ? { valor: limiteTiempo, unidad: unidadTiempo } : null,
        opcionTiempoAgotado: limiteHabilitado ? opcionTiempoAgotado : '',
        seguridad: { 
          contraseña: contraseñaFinal, 
          consecuenciaAbandono 
        },
        herramientasActivas: Object.entries(herramientasActivas)
          .filter(([_, activo]) => activo)
          .map(([herramienta, _]) => herramienta)
      };
      
      const resultado = await crearExamen(datosExamen);
      
      if (resultado.success) {
        setExamenCreado({
          codigo: resultado.codigoExamen,
          url: resultado.url
        });
      } else {
        throw new Error(resultado.error || 'Error al crear el examen');
      }
      
    } catch (error: any) {
      console.error('Error al crear examen:', error);
      alert(`Error al crear el examen: ${error.message || 'Error desconocido'}`);
    } finally {
      setGuardando(false);
    }
  };

  const opcionesTiempoAgotado = [
    { value: '', label: 'Seleccionar una opción...' },
    { value: 'envio-automatico', label: 'Los intentos abiertos son enviado automáticamente' },
    { value: 'debe-enviarse', label: 'Los intentos deben enviarse antes de que se agote el tiempo, o no serán contados' }
  ];

  // Colores dinámicos según darkMode
  const bgNumero = darkMode ? 'bg-teal-500' : 'bg-slate-700';
  const textCheck = darkMode ? 'text-teal-500' : 'text-slate-700';
  const borderActivo = darkMode ? 'border-teal-500' : 'border-slate-700';
  const bgActivoLight = darkMode ? 'bg-teal-500/10' : 'bg-slate-700/10';
  const bgRadio = darkMode ? 'bg-teal-500' : 'bg-slate-700';
  const borderRadio = darkMode ? 'border-teal-500' : 'border-slate-700';
  const bgCheckbox = darkMode ? 'bg-teal-500 border-teal-500' : 'bg-slate-700 border-slate-700';
  const bgBoton = darkMode ? 'bg-teal-600' : 'bg-slate-700';
  const bgBotonHover = darkMode ? 'hover:bg-teal-700' : 'hover:bg-slate-800';

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <style>{`
        ${darkMode ? `
          ::-webkit-scrollbar {
            width: 12px;
            height: 12px;
          }
          
          ::-webkit-scrollbar-track {
            background: #1e293b;
            border-radius: 10px;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 10px;
            border: 2px solid #1e293b;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          
          * {
            scrollbar-width: thin;
            scrollbar-color: #475569 #1e293b;
          }
          
          /* Mejorar visibilidad de inputs de fecha en modo oscuro */
          input[type="datetime-local"]::-webkit-calendar-picker-indicator {
            filter: invert(1);
            cursor: pointer;
          }
          
          input[type="datetime-local"] {
            color-scheme: dark;
          }
        ` : `
          ::-webkit-scrollbar {
            width: 12px;
            height: 12px;
          }
          
          ::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
            border: 2px solid #f1f5f9;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          
          * {
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 #f1f5f9;
          }
        `}
      `}</style>

      {/* Sección 1 */}
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg shadow-sm overflow-hidden`}>
        <button onClick={() => setSeccion1Abierta(!seccion1Abierta)} className="w-full flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${bgNumero} text-white font-semibold text-sm`}>1</div>
            <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Información básica</div>
          </div>
          {seccion1Abierta ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {seccion1Abierta && (
          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nombre del examen</label>
              <input type="text" value={nombreExamen} onChange={(e) => setNombreExamen(e.target.value)} placeholder="Examen Parcial #1" className={`w-full px-4 py-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Descripción</label>
              <EditorTexto value={descripcionExamen} onChange={setDescripcionExamen} darkMode={darkMode} placeholder="Instrucciones..." />
            </div>
          </div>
        )}
      </div>

      {/* Sección 2 */}
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg shadow-sm overflow-hidden`}>
        <button onClick={() => setSeccion2Abierta(!seccion2Abierta)} className="w-full flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${bgNumero} text-white font-semibold text-sm`}>2</div>
            <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Preguntas del examen</div>
            {tipoPregunta && <Check className={`w-5 h-5 ${textCheck}`} />}
          </div>
          {seccion2Abierta ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {seccion2Abierta && (
          <div className="px-6 pb-6 space-y-4">
            {[
              { tipo: 'no-digital', titulo: 'No hay preguntas de examen digital', desc: 'Las preguntas se dan fuera del sistema.' },
              { tipo: 'pdf', titulo: 'Usar un archivo PDF', desc: 'Añada o cambie el archivo PDF que quiera.' },
              { tipo: 'escribir', titulo: 'Escribir preguntas', desc: 'Escriba o pegue sus preguntas aquí.' },
              { tipo: 'automatico', titulo: 'Calificados automáticamente', desc: 'Cree exámenes con diferentes tipos de preguntas.' }
            ].map(({tipo, titulo, desc}) => (
              <div key={tipo} onClick={() => setTipoPregunta(tipo as TipoPregunta)} className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${tipoPregunta === tipo ? `${borderActivo} ${bgActivoLight}` : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${tipoPregunta === tipo ? `${borderRadio} ${bgRadio}` : 'border-gray-300'}`}>
                    {tipoPregunta === tipo && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{titulo}</div>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{desc}</p>
                    {tipoPregunta === 'pdf' && tipo === 'pdf' && (
                      <div className="mt-4">
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm font-medium">{archivoPDF ? archivoPDF.name : 'Seleccionar PDF'}</span>
                          <input type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handlePDFSelection(e.target.files[0])} />
                        </label>
                      </div>
                    )}
                    {tipoPregunta === 'escribir' && tipo === 'escribir' && (
                      <div className="mt-4">
                        <button onClick={(e) => { e.stopPropagation(); abrirModalPreguntas(); }} className={`px-4 py-2 rounded-lg ${bgBoton} text-white ${bgBotonHover} transition-colors font-medium`}>
                          {preguntasEscritas ? 'Editar preguntas' : 'Escribir preguntas'}
                        </button>
                        {preguntasEscritas && (
                          <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>✓ Preguntas agregadas</p>
                        )}
                      </div>
                    )}
                    {tipoPregunta === 'automatico' && tipo === 'automatico' && (
                      <div className="mt-4">
                        <button onClick={(e) => { e.stopPropagation(); abrirModalPreguntasAutomaticas(); }} className={`px-4 py-2 rounded-lg ${bgBoton} text-white ${bgBotonHover} transition-colors font-medium`}>
                          {preguntasAutomaticas.length > 0 ? `Editar preguntas (${preguntasAutomaticas.length})` : 'Agregar preguntas'}
                        </button>
                        {preguntasAutomaticas.length > 0 && (
                          <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            ✓ {preguntasAutomaticas.length} {preguntasAutomaticas.length === 1 ? 'pregunta agregada' : 'preguntas agregadas'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección 3 */}
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg shadow-sm overflow-hidden`}>
        <button onClick={() => setSeccion3Abierta(!seccion3Abierta)} className="w-full flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${bgNumero} text-white font-semibold text-sm`}>3</div>
            <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Datos del estudiante</div>
            {camposEstudiante.some(c => c.activo) && <Check className={`w-5 h-5 ${textCheck}`} />}
          </div>
          {seccion3Abierta ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {seccion3Abierta && (
          <div className="px-6 pb-6 space-y-3">
            {camposEstudiante.map(campo => (
              <div key={campo.id} onClick={() => toggleCampo(campo.id)} className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${campo.activo ? `${borderActivo} ${bgActivoLight}` : 'border-gray-200 hover:border-gray-300'}`}>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{campo.nombre}</span>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${campo.activo ? bgCheckbox : 'border-gray-300'}`}>
                  {campo.activo && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección 4 */}
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg shadow-sm overflow-hidden`}>
        <button onClick={() => setSeccion4Abierta(!seccion4Abierta)} className="w-full flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${bgNumero} text-white font-semibold text-sm`}>4</div>
            <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Tiempo</div>
            {(fechaInicioHabilitada || fechaCierreHabilitada || limiteHabilitado) && <Check className={`w-5 h-5 ${textCheck}`} />}
          </div>
          {seccion4Abierta ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {seccion4Abierta && (
          <div className="px-6 pb-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Abrir el examen</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <button onClick={() => setFechaInicioHabilitada(!fechaInicioHabilitada)} className={`w-5 h-5 rounded border-2 flex items-center justify-center ${fechaInicioHabilitada ? bgCheckbox : 'border-gray-300'}`}>
                    {fechaInicioHabilitada && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Habilitar</span>
                </div>
              </div>
              {fechaInicioHabilitada && (
                <input 
                  type="datetime-local" 
                  value={fechaInicio} 
                  onChange={(e) => setFechaInicio(e.target.value)} 
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    darkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300'
                  }`} 
                />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Cerrar el examen</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <button onClick={() => setFechaCierreHabilitada(!fechaCierreHabilitada)} className={`w-5 h-5 rounded border-2 flex items-center justify-center ${fechaCierreHabilitada ? bgCheckbox : 'border-gray-300'}`}>
                    {fechaCierreHabilitada && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Habilitar</span>
                </div>
              </div>
              {fechaCierreHabilitada && (
                <input 
                  type="datetime-local" 
                  value={fechaCierre} 
                  onChange={(e) => setFechaCierre(e.target.value)} 
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    darkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300'
                  }`} 
                />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Límite de tiempo</label>
                <button onClick={() => setLimiteHabilitado(!limiteHabilitado)} className={`w-5 h-5 rounded border-2 flex items-center justify-center ${limiteHabilitado ? bgCheckbox : 'border-gray-300'}`}>
                  {limiteHabilitado && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Habilitar</span>
              </div>
              {limiteHabilitado && (
                <div className="flex gap-3 items-center">
                  <input type="number" value={limiteTiempo} onChange={(e) => setLimiteTiempo(Number(e.target.value))} className={`w-28 px-4 py-2.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`} />
                  <select value={unidadTiempo} onChange={(e) => setUnidadTiempo(e.target.value as 'minutos' | 'horas')} className={`px-4 py-2.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`}>
                    <option value="minutos">minutos</option>
                    <option value="horas">horas</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Cuando se agote el tiempo</label>
              <select value={opcionTiempoAgotado} onChange={(e) => setOpcionTiempoAgotado(e.target.value as OpcionTiempoAgotado)} className={`w-full px-4 py-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`}>
                {opcionesTiempoAgotado.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Sección 5 */}
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg shadow-sm overflow-hidden`}>
        <button onClick={() => setSeccion5Abierta(!seccion5Abierta)} className="w-full flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${bgNumero} text-white font-semibold text-sm`}>5</div>
            <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Herramientas</div>
            {Object.values(herramientasActivas).some(v => v) && <Check className={`w-5 h-5 ${textCheck}`} />}
          </div>
          {seccion5Abierta ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {seccion5Abierta && (
          <SeccionHerramientas 
            darkMode={darkMode}
            herramientasActivas={herramientasActivas}
            onToggleHerramienta={toggleHerramienta}
          />
        )}
      </div>

      {/* Sección 6 */}
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg shadow-sm overflow-hidden`}>
        <button onClick={() => setSeccion6Abierta(!seccion6Abierta)} className="w-full flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${bgNumero} text-white font-semibold text-sm`}>6</div>
            <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Seguridad</div>
            {consecuenciaAbandono && <Check className={`w-5 h-5 ${textCheck}`} />}
          </div>
          {seccion6Abierta ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {seccion6Abierta && (
          <SeccionSeguridad 
            darkMode={darkMode}
            onContraseñaChange={setContraseñaExamen}
            onConsecuenciaChange={setConsecuenciaAbandono}
            contraseñaInicial={contraseñaExamen}
            consecuenciaInicial={consecuenciaAbandono}
          />
        )}
      </div>

      {/* Botones Finales */}
      <div className="flex justify-end gap-3 pt-4">
        <button 
          className="px-6 py-3 rounded-lg font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
          onClick={() => {
            if (window.confirm('¿Está seguro que desea cancelar? Se perderán todos los datos.')) {
              resetearFormulario();
            }
          }}
          disabled={guardando}
        >
          Cancelar
        </button>
        <button 
          onClick={handleCrearExamen} 
          disabled={!nombreExamen.trim() || !tipoPregunta || !consecuenciaAbandono || guardando}
          className={`px-6 py-3 rounded-lg font-medium ${bgBoton} text-white disabled:opacity-50 disabled:cursor-not-allowed ${bgBotonHover} transition-colors flex items-center gap-2`}
        >
          {guardando ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Guardando...</span>
            </>
          ) : (
            <span>Crear Examen</span>
          )}
        </button>
      </div>

      {/* Modal Preguntas */}
      {mostrarModalPreguntas && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'} rounded-lg border shadow-2xl w-full max-w-4xl h-[95vh] flex flex-col`}>
            <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Escribir preguntas del examen
              </h3>
              <button onClick={cancelarPreguntas} className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:text-white hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              <style>{`.modal-editor-full .ProseMirror { min-height: calc(95vh - 280px) !important; }`}</style>
              <div className="modal-editor-full">
                <EditorTexto value={preguntasTemp} onChange={setPreguntasTemp} darkMode={darkMode} placeholder="Escriba o pegue las preguntas del examen aquí..." />
              </div>
            </div>
            <div className={`flex justify-end gap-3 p-6 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <button onClick={cancelarPreguntas} className={`px-6 py-3 rounded-lg font-medium transition-colors ${darkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                Cancelar y cerrar
              </button>
              <button onClick={guardarPreguntas} className={`px-6 py-3 rounded-lg font-medium ${bgBoton} text-white ${bgBotonHover} transition-colors`}>
                Ok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preguntas Automáticas */}
      {mostrarModalPreguntasAutomaticas && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'} rounded-lg border shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col`}>
            <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Crear preguntas del examen
              </h3>
              <button onClick={cancelarPreguntasAutomaticas} className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:text-white hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              <CrearPreguntas darkMode={darkMode} preguntasIniciales={preguntasAutomaticasTemp} onPreguntasChange={handlePreguntasChange} />
            </div>
            <div className={`flex items-center justify-between gap-3 p-6 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              {preguntasAutomaticasTemp.length > 0 && (
                <div className="flex items-center gap-6">
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Total de preguntas: {preguntasAutomaticasTemp.length}
                  </span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Puntos totales: {preguntasAutomaticasTemp.reduce((acc, p) => acc + p.puntos, 0)}
                  </span>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={cancelarPreguntasAutomaticas} className={`px-6 py-3 rounded-lg font-medium transition-colors ${darkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                  Cancelar y cerrar
                </button>
                <button onClick={guardarPreguntasAutomaticas} className={`px-6 py-3 rounded-lg font-medium ${bgBoton} text-white ${bgBotonHover} transition-colors`}>
                  Ok
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Examen Creado */}
      {examenCreado && (
        <ModalExamenCreado
          mostrar={!!examenCreado}
          codigo={examenCreado.codigo}
          url={examenCreado.url}
          darkMode={darkMode}
          onCerrar={() => {
            setExamenCreado(null);
            resetearFormulario();
          }}
        />
      )}

      {/* Visor PDF */}
      <VisorPDF 
        mostrar={mostrarVistaPreviaPDF}
        pdfURL={pdfURL}
        pdfCargando={pdfCargando}
        darkMode={darkMode}
        onCerrar={cerrarVistaPreviaPDF}
        onElegirOtro={elegirOtroPDF}
      />
    </div>
  );
}