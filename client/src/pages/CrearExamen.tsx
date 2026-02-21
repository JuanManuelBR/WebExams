import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Check,
  ChevronDown,
  ChevronUp,
  Calendar,
  X,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import EditorTexto from "../components/EditorTexto";
import SeccionSeguridad from "../components/SeccionSeguridad";
import SeccionHerramientas from "../components/SeccionHerramientas";
import VisorPDF from "../components/VisorPDF";
import CrearPreguntas, { type Pregunta } from "../components/CrearPreguntas";
import ModalExamenCreado from "../components/ModalExamenCreado";
import { examsService, obtenerUsuarioActual } from "../services/examsService";
import { examsApi } from "../services/examsApi";
import ModalConfirmacion from "../components/ModalConfirmacion";

// Convierte una pregunta del formato backend al formato Pregunta del editor
function mapearPreguntaBackendAFrontend(p: any): any {
  const tipoMap: Record<string, string> = {
    test: "seleccion-multiple",
    open: "abierta",
    fill_blanks: "rellenar-espacios",
    match: "conectar",
  };

  const base = {
    id: String(p.id),
    tipo: tipoMap[p.type] || "abierta",
    titulo: p.enunciado || "",
    puntos: p.puntaje || 1,
    calificacionParcial: p.calificacionParcial || false,
    imagen: (p.nombreImagen || null) as string | null,
  };

  switch (p.type) {
    case "test":
      return {
        ...base,
        opciones: (p.options || []).map((o: any) => ({
          id: String(o.id),
          texto: o.texto,
          esCorrecta: o.esCorrecta,
        })),
      };

    case "open":
      return {
        ...base,
        metodoEvaluacion: p.textoRespuesta
          ? "texto-exacto"
          : p.keywords?.length
            ? "palabras-clave"
            : "manual",
        textoExacto: p.textoRespuesta || "",
        palabrasClave: (p.keywords || []).map((k: any) => k.texto),
      };

    case "fill_blanks": {
      // Reconstruir textoCompleto y palabrasSeleccionadas desde textoCorrecto y respuestas
      const words: string[] = (p.textoCorrecto || "").split(/\s+/);
      const answers = [...(p.respuestas || [])].sort(
        (a: any, b: any) => a.posicion - b.posicion,
      );
      let answerIdx = 0;
      const palabrasSeleccionadas: { indice: number; palabra: string }[] = [];
      const fullWords = words.map((w: string, idx: number) => {
        if (w === "___" && answerIdx < answers.length) {
          const answer = answers[answerIdx++];
          palabrasSeleccionadas.push({ indice: idx, palabra: answer.textoCorrecto });
          return answer.textoCorrecto;
        }
        return w;
      });
      return {
        ...base,
        textoCompleto: fullWords.join(" "),
        palabrasSeleccionadas,
      };
    }

    case "match":
      return {
        ...base,
        paresConexion: (p.pares || []).map((par: any, idx: number) => ({
          id: String(par.id ?? idx),
          izquierda: par.itemA?.text || "",
          derecha: par.itemB?.text || "",
        })),
      };

    default:
      return base;
  }
}

interface CrearExamenProps {
  darkMode: boolean;
  onExamenCreado?: () => void;
}

type TipoPregunta = "pdf" | "automatico";
type OpcionTiempoAgotado = "envio-automatico" | "debe-enviarse" | "";

interface CampoEstudiante {
  id: string;
  nombre: string;
  activo: boolean;
}

export default function CrearExamen({
  darkMode,
  onExamenCreado,
}: CrearExamenProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const examenAEditar = location.state?.examenAEditar;
  const isEditMode = !!examenAEditar;

  const [nombreExamen, setNombreExamen] = useState("");
  const [descripcionExamen, setDescripcionExamen] = useState("");
  const [tipoPregunta, setTipoPregunta] = useState<TipoPregunta | null>(null);
  const [archivoPDF, setArchivoPDF] = useState<File | null>(null);
  const [pdfExistente, setPdfExistente] = useState<string | null>(null);

  const [preguntasAutomaticas, setPreguntasAutomaticas] = useState<Pregunta[]>(
    [],
  );
  const [preguntasAutomaticasTemp, setPreguntasAutomaticasTemp] = useState<
    Pregunta[]
  >([]);
  // ⭐ NUEVO: Estado para validación de preguntas
  const [preguntasValidas, setPreguntasValidas] = useState(false);

  const [
    mostrarModalPreguntasAutomaticas,
    setMostrarModalPreguntasAutomaticas,
  ] = useState(false);
  const [mostrarVistaPreviaPDF, setMostrarVistaPreviaPDF] = useState(false);
  const [pdfCargando, setPdfCargando] = useState(false);
  const [pdfURL, setPdfURL] = useState<string | null>(null);
  const [tienePreguntasAutomaticas, setTienePreguntasAutomaticas] =
    useState(false);

  const [guardando, setGuardando] = useState(false);
  const [examenCreado, setExamenCreado] = useState<{
    codigo: string;
    url: string;
  } | null>(null);

  const [camposEstudiante, setCamposEstudiante] = useState<CampoEstudiante[]>([
    { id: "nombre", nombre: "Nombre completo", activo: false },
    { id: "correo", nombre: "Correo electrónico", activo: false },
    { id: "codigoEstudiante", nombre: "Código estudiante", activo: false },
  ]);

  const obtenerFechaActual = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [fechaInicio, setFechaInicio] = useState(obtenerFechaActual());
  const [fechaCierre, setFechaCierre] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 40);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });
  const [fechaInicioHabilitada, setFechaInicioHabilitada] = useState(false);
  const [fechaCierreHabilitada, setFechaCierreHabilitada] = useState(false);
  const [limiteHabilitado, setLimiteHabilitado] = useState(false);
  const [limiteTiempo, setLimiteTiempo] = useState<number | string>(30);
  const [opcionTiempoAgotado, setOpcionTiempoAgotado] =
    useState<OpcionTiempoAgotado>("");

  const [contraseñaExamen, setContraseñaExamen] = useState("");
  const [contraseñaHabilitada, setContraseñaHabilitada] = useState(false);
  const [contraseñaValida, setContraseñaValida] = useState(true);
  const [consecuenciaAbandono, setConsecuenciaAbandono] = useState("");

  const [seccion1Abierta, setSeccion1Abierta] = useState(true);
  const [seccion2Abierta, setSeccion2Abierta] = useState(false);
  const [seccion3Abierta, setSeccion3Abierta] = useState(false);
  const [seccion4Abierta, setSeccion4Abierta] = useState(false);
  const [seccion5Abierta, setSeccion5Abierta] = useState(false);
  const [seccion6Abierta, setSeccion6Abierta] = useState(false);
  const [seccion4Visitada, setSeccion4Visitada] = useState(false);
  const [seccion5Visitada, setSeccion5Visitada] = useState(false);

  const [mostrarTooltipNombre, setMostrarTooltipNombre] = useState(false);
  const [mostrarTooltipTipoPregunta, setMostrarTooltipTipoPregunta] = useState(false);
  const [mostrarTooltipPregunta, setMostrarTooltipPregunta] = useState(false);
  const [mostrarTooltipDatosEstudiante, setMostrarTooltipDatosEstudiante] = useState(false);
  const [mostrarTooltipTiempo, setMostrarTooltipTiempo] = useState(false);
  const [mostrarTooltipHerramientas, setMostrarTooltipHerramientas] = useState(false);
  const [mostrarTooltipSeguridad, setMostrarTooltipSeguridad] = useState(false);

  const [modal, setModal] = useState<{ visible: boolean; tipo: "exito" | "error" | "advertencia" | "info" | "confirmar"; titulo: string; mensaje: string; onConfirmar: () => void; onCancelar?: () => void }>({ visible: false, tipo: "info", titulo: "", mensaje: "", onConfirmar: () => {} });
  const mostrarModal = (tipo: "exito" | "error" | "advertencia" | "info" | "confirmar", titulo: string, mensaje: string, onConfirmar: () => void, onCancelar?: () => void) => setModal({ visible: true, tipo, titulo, mensaje, onConfirmar, onCancelar });
  const cerrarModal = () => setModal(prev => ({ ...prev, visible: false }));

  const [herramientasActivas, setHerramientasActivas] = useState({
    dibujo: false,
    calculadora: false,
    excel: false,
    javascript: false,
    python: false,
    java: false,
  });

  // Efecto para cargar datos si estamos en modo edición
  useEffect(() => {
    if (!examenAEditar?.id) return;

    examsApi
      .get(`/by-id/${examenAEditar.id}`, { withCredentials: true })
      .then((res) => {
        const ex = res.data;
        console.log("📝 Cargando datos para edición:", ex);

        // Campos básicos
        setNombreExamen(ex.nombre || "");
        setDescripcionExamen(ex.descripcion || "");

        // Tipo de examen y contenido
        if (ex.archivoPDF) {
          setTipoPregunta("pdf");
          setPdfExistente(ex.archivoPDF);
        } else if (ex.questions && ex.questions.length > 0) {
          setTipoPregunta("automatico");
          const preguntasMapeadas = ex.questions.map((p: any) => mapearPreguntaBackendAFrontend(p));
          setPreguntasAutomaticas(preguntasMapeadas);
          setPreguntasAutomaticasTemp(preguntasMapeadas);
          setTienePreguntasAutomaticas(true);
          setPreguntasValidas(true);
        }

        // Fechas
        if (ex.horaApertura) {
          setFechaInicioHabilitada(true);
          setFechaInicio(new Date(ex.horaApertura).toISOString().slice(0, 16));
        }
        if (ex.horaCierre) {
          setFechaCierreHabilitada(true);
          setFechaCierre(new Date(ex.horaCierre).toISOString().slice(0, 16));
        }

        // Límite de tiempo
        if (ex.limiteTiempo) {
          setLimiteHabilitado(true);
          setLimiteTiempo(ex.limiteTiempo);
          setOpcionTiempoAgotado(
            ex.limiteTiempoCumplido === "descartar" ? "debe-enviarse" : "envio-automatico"
          );
        }

        // Campos requeridos del estudiante (booleanos individuales en backend)
        setCamposEstudiante((prev) =>
          prev.map((c) => ({
            ...c,
            activo:
              (c.id === "nombre" && ex.necesitaNombreCompleto) ||
              (c.id === "correo" && ex.necesitaCorreoElectrónico) ||
              (c.id === "codigoEstudiante" && ex.necesitaCodigoEstudiantil) ||
              false,
          }))
        );

        // Herramientas (booleanos individuales en backend)
        setHerramientasActivas({
          dibujo: ex.incluirHerramientaDibujo || false,
          calculadora: ex.incluirCalculadoraCientifica || false,
          excel: ex.incluirHojaExcel || false,
          javascript: ex.incluirJavascript || false,
          python: ex.incluirPython || false,
          java: ex.incluirJava || false,
        });

        // Consecuencia de abandono (backend: "notificar"/"bloquear"/"ninguna")
        const consecuenciaMap: Record<string, string> = {
          notificar: "notificar-profesor",
          bloquear: "desbloqueo-manual",
          ninguna: "desactivar-proteccion",
        };
        setConsecuenciaAbandono(consecuenciaMap[ex.consecuencia] || "");

        // Contraseña
        if (ex.necesitaContrasena && ex.contrasena) {
          setContraseñaHabilitada(true);
          setContraseñaExamen(ex.contrasena);
        }

        // Marcar secciones como visitadas para habilitar el guardado
        setSeccion4Visitada(true);
        setSeccion5Visitada(true);
      })
      .catch((err) => {
        console.error("❌ Error cargando datos del examen para edición:", err);
      });
  }, [examenAEditar?.id]);

  const obtenerFechaMinima = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleFechaInicioChange = (nuevaFecha: string) => {
    setFechaInicio(nuevaFecha);
    if (fechaCierreHabilitada && nuevaFecha >= fechaCierre) {
      const fecha = new Date(nuevaFecha);
      fecha.setHours(fecha.getHours() + 1);
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      const hours = String(fecha.getHours()).padStart(2, '0');
      const minutes = String(fecha.getMinutes()).padStart(2, '0');
      setFechaCierre(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  };

  const handleFechaCierreChange = (nuevaFecha: string) => {
    setFechaCierre(nuevaFecha);
  };

  const validarFechaCierre = () => {
    if (fechaInicioHabilitada && fechaCierre) {
      const fechaInicioDate = new Date(fechaInicio);
      const fechaCierreDate = new Date(fechaCierre);
      
      if (fechaCierreDate <= fechaInicioDate) {
        const fechaAjustada = new Date(fechaInicioDate);
        fechaAjustada.setHours(fechaAjustada.getHours() + 1);
        
        const year = fechaAjustada.getFullYear();
        const month = String(fechaAjustada.getMonth() + 1).padStart(2, '0');
        const day = String(fechaAjustada.getDate()).padStart(2, '0');
        const hours = String(fechaAjustada.getHours()).padStart(2, '0');
        const minutes = String(fechaAjustada.getMinutes()).padStart(2, '0');
        
        setFechaCierre(`${year}-${month}-${day}T${hours}:${minutes}`);
      }
    }
  };

  const toggleCampo = (id: string) => {
    setCamposEstudiante((campos) =>
      campos.map((campo) =>
        campo.id === id ? { ...campo, activo: !campo.activo } : campo,
      ),
    );
  };

  const toggleHerramienta = (herramienta: keyof typeof herramientasActivas) => {
    setHerramientasActivas((prev) => ({
      ...prev,
      [herramienta]: !prev[herramienta],
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
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
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

  // ⭐ NUEVO: Handler para validación de preguntas
  const handleValidationChange = (isValid: boolean) => {
    setPreguntasValidas(isValid);
  };

  const resetearFormulario = () => {
    setNombreExamen("");
    setDescripcionExamen("");
    setTipoPregunta(null);
    setArchivoPDF(null);
    setPreguntasAutomaticas([]);
    setPreguntasAutomaticasTemp([]);
    setPreguntasValidas(false); // ⭐ NUEVO
    setCamposEstudiante((campos) =>
      campos.map((c) => ({ ...c, activo: false })),
    );
    setFechaInicioHabilitada(false);
    setFechaCierreHabilitada(false);
    setLimiteHabilitado(false);
    setOpcionTiempoAgotado("");
    setContraseñaExamen("");
    setContraseñaHabilitada(false);
    setContraseñaValida(true);
    setConsecuenciaAbandono("");
    setHerramientasActivas({
      dibujo: false,
      calculadora: false,
      excel: false,
      javascript: false,
      python: false,
      java: false,
    });
    setSeccion1Abierta(true);
    setSeccion2Abierta(false);
    setSeccion3Abierta(false);
    setSeccion4Abierta(false);
    setSeccion5Abierta(false);
    setSeccion6Abierta(false);
    setSeccion4Visitada(false);
    setSeccion5Visitada(false);
  };

  const handleContraseñaValidaChange = (valida: boolean) => {
    setContraseñaValida(valida);
  };

  const handleCrearExamen = async () => {
    if (!nombreExamen.trim()) {
      mostrarModal("advertencia", "Campo requerido", "Por favor, ingrese el nombre del examen", cerrarModal);
      return;
    }

    if (!tipoPregunta) {
      mostrarModal("advertencia", "Campo requerido", "Por favor, seleccione un tipo de pregunta", cerrarModal);
      return;
    }

    if (!camposEstudiante.some((c) => c.activo)) {
      mostrarModal("advertencia", "Campo requerido", "Por favor, seleccione al menos un dato del estudiante", cerrarModal);
      return;
    }

    if (!seccion4Visitada) {
      mostrarModal("advertencia", "Sección pendiente", "Por favor, revise la sección de Tiempo", cerrarModal);
      return;
    }

    if (!seccion5Visitada) {
      mostrarModal("advertencia", "Sección pendiente", "Por favor, revise la sección de Herramientas", cerrarModal);
      return;
    }

    if (!consecuenciaAbandono) {
      mostrarModal("advertencia", "Campo requerido", "Por favor, seleccione una consecuencia de abandono", cerrarModal);
      return;
    }

    if (tipoPregunta === "pdf" && !archivoPDF) {
      if (!isEditMode || !pdfExistente) { mostrarModal("advertencia", "Campo requerido", "Por favor, seleccione un archivo PDF", cerrarModal); return; }
    }

    if (tipoPregunta === "automatico" && preguntasAutomaticas.length === 0) {
      mostrarModal("advertencia", "Campo requerido", "Por favor, agregue al menos una pregunta", cerrarModal);
      return;
    }

    if (contraseñaHabilitada) {
      if (!contraseñaExamen.trim()) {
        mostrarModal("advertencia", "Campo requerido", "Por favor, ingrese una contraseña para el examen", cerrarModal);
        return;
      }

      if (contraseñaExamen.length < 5 || contraseñaExamen.length > 10) {
        mostrarModal("advertencia", "Contraseña inválida", "La contraseña debe tener entre 5 y 10 caracteres", cerrarModal);
        return;
      }
    }


    // ✅ NUEVA VALIDACIÓN: Verificar límite de tiempo y opción de tiempo agotado
    if (limiteHabilitado) {
      if (!opcionTiempoAgotado) {
        mostrarModal("advertencia", "Campo requerido", "Por favor, seleccione qué hacer cuando se agote el tiempo", cerrarModal);
        return;
      }
    }
    setGuardando(true);

    try {
      console.log("🎯 [CREAR EXAMEN] Iniciando creación...");

      const usuario = obtenerUsuarioActual();
      if (!usuario) {
        mostrarModal("error", "Error de sesión", "No se pudo obtener la información del usuario. Por favor, inicie sesión nuevamente.", cerrarModal);
        return;
      }

      const datosExamen = {
        nombreExamen,
        descripcionExamen,
        tipoPregunta,
        archivoPDF: tipoPregunta === "pdf" ? (archivoPDF || pdfExistente) : null,
        preguntasAutomaticas:
          tipoPregunta === "automatico" ? preguntasAutomaticas : undefined,
        camposActivos: camposEstudiante.filter((c) => c.activo),
        fechaInicio: fechaInicioHabilitada ? fechaInicio : null,
        fechaCierre: fechaCierreHabilitada ? fechaCierre : null,
        limiteTiempo: limiteHabilitado
          ? { valor: (limiteTiempo && Number(limiteTiempo) > 0) ? Number(limiteTiempo) : 30, unidad: "minutos" as const }
          : null,
        opcionTiempoAgotado: limiteHabilitado ? opcionTiempoAgotado : "envio-automatico",
        seguridad: {
          contraseña: contraseñaHabilitada ? contraseñaExamen : "",
          consecuenciaAbandono,
        },
        herramientasActivas: Object.entries(herramientasActivas)
          .filter(([_, activo]) => activo)
          .map(([herramienta, _]) => herramienta),
      };

      console.log("📤 [CREAR EXAMEN] Enviando datos al backend...");
      console.log("📋 [DEBUG] Datos del examen:", {
        ...datosExamen,
        archivoPDF: datosExamen.archivoPDF ? "FILE" : null,
      });
      
      let resultado;
      if (isEditMode) {
        console.log("🔄 [EDITAR EXAMEN] Actualizando examen ID:", examenAEditar.id);
        resultado = await examsService.actualizarExamen(examenAEditar.id, datosExamen as any);
      } else {
        resultado = await examsService.crearExamen(datosExamen as any, usuario.id);
      }

      if (resultado.success) {
        console.log(`✅ [${isEditMode ? "EDITAR" : "CREAR"} EXAMEN] Operación exitosa`);
        console.log("🔑 [CREAR EXAMEN] Código:", resultado.codigoExamen);

        setExamenCreado({
          codigo: resultado.codigoExamen,
          url: `${window.location.origin}/acceso-examen?code=${encodeURIComponent(resultado.codigoExamen)}`,
        });
      } else {
        throw new Error(resultado.error || `Error al ${isEditMode ? "actualizar" : "crear"} el examen`);
      }
    } catch (error: any) {
      console.error("❌ [CREAR EXAMEN] Error:", error);
      mostrarModal("error", "Error", `Error al ${isEditMode ? "actualizar" : "crear"} el examen: ${error.message || "Error desconocido"}`, cerrarModal);
    } finally {
      setGuardando(false);
    }
  };

  const opcionesTiempoAgotado = [
    { value: "", label: "Seleccionar una opción..." },
    {
      value: "envio-automatico",
      label: "Los intentos abiertos son enviado automáticamente",
    },
    {
      value: "debe-enviarse",
      label:
        "Los intentos deben enviarse antes de que se agote el tiempo, o no serán contados",
    },
  ];

  const bgNumero = darkMode ? "bg-teal-500" : "bg-slate-700";
  const textCheck = darkMode ? "text-teal-500" : "text-slate-700";
  const borderActivo = darkMode ? "border-teal-500" : "border-slate-700";
  const bgActivoLight = darkMode ? "bg-teal-500/10" : "bg-slate-700/10";
  const bgRadio = darkMode ? "bg-teal-500" : "bg-slate-700";
  const borderRadio = darkMode ? "border-teal-500" : "border-slate-700";
  const bgCheckbox = darkMode
    ? "bg-teal-500 border-teal-500"
    : "bg-slate-700 border-slate-700";
  const bgBoton = darkMode ? "bg-teal-600" : "bg-slate-700";
  const bgBotonHover = darkMode ? "hover:bg-teal-700" : "hover:bg-slate-800";

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header de navegación */}
      {isEditMode && (
      <div className={`flex items-center gap-4 p-4 rounded-xl border shadow-sm ${darkMode ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"}`}>
        <button
          onClick={() => {
            mostrarModal("confirmar", "Salir sin guardar", "¿Está seguro que desea salir? Se perderán los cambios no guardados.", () => {
              cerrarModal();
              navigate("/lista-examenes");
            }, cerrarModal);
          }}
          className={`p-2 rounded-lg transition-colors ${
            darkMode 
              ? "hover:bg-slate-800 text-gray-400 hover:text-white" 
              : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
          }`}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
            Editar Examen
          </h1>
        </div>
      </div>
      )}

      <style>{`
        ${
          darkMode
            ? `
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

          input[type="datetime-local"]::-webkit-datetime-edit-fields-wrapper {
            background: transparent;
          }
          
          input[type="datetime-local"]::-webkit-datetime-edit {
            background: transparent;
          }
          
          input[type="datetime-local"]::-webkit-calendar-picker-indicator {
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>');
            cursor: pointer;
            width: 20px;
            height: 20px;
          }
        `
            : `
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
          
          input[type="datetime-local"]::-webkit-calendar-picker-indicator {
            cursor: pointer;
          }
        `
        }
      `}</style>

      {/* Sección 1 */}
      <div
        className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-lg shadow-sm overflow-hidden`}
      >
        <button
          onClick={() => setSeccion1Abierta(!seccion1Abierta)}
          className="w-full flex items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${bgNumero} text-white font-semibold text-sm`}
            >
              1
            </div>
            <div
              className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              Información básica
            </div>
            {nombreExamen.trim() ? (
              <Check className={`w-5 h-5 ${textCheck}`} />
            ) : (
              <div className="relative">
                <AlertCircle
                  className="w-5 h-5 text-red-500 cursor-pointer"
                  onMouseEnter={() => setMostrarTooltipNombre(true)}
                  onMouseLeave={() => setMostrarTooltipNombre(false)}
                />
                {mostrarTooltipNombre && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 ml-7 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                    Debes escribir el nombre del examen
                    <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                  </div>
                )}
              </div>
            )}
          </div>
          {seccion1Abierta ? (
            <ChevronUp
              className={`w-5 h-5 ${darkMode ? "text-white" : "text-gray-900"}`}
            />
          ) : (
            <ChevronDown
              className={`w-5 h-5 ${darkMode ? "text-white" : "text-gray-900"}`}
            />
          )}
        </button>
        {seccion1Abierta && (
          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  Nombre del examen <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-xs ${nombreExamen.length > 100 ? "text-red-500" : darkMode ? "text-gray-500" : "text-gray-400"}`}
                >
                  {nombreExamen.length}/100
                </span>
              </div>
              <input
                type="text"
                value={nombreExamen}
                onChange={(e) => {
                  const nuevoValor = e.target.value;
                  if (nuevoValor.length <= 100) {
                    setNombreExamen(nuevoValor);
                  }
                }}
                placeholder="Examen Parcial #1"
                maxLength={100}
                className={`w-full px-4 py-3 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-gray-300"}`}
              />
            </div>
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
              >
                Descripción
              </label>
              <EditorTexto
                value={descripcionExamen}
                onChange={(value) => setDescripcionExamen(value)}
                darkMode={darkMode}
                placeholder="Instrucciones..."
                maxLength={1000}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sección 2 */}
      <div
        className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-lg shadow-sm overflow-hidden`}
      >
        <button
          onClick={() => setSeccion2Abierta(!seccion2Abierta)}
          className="w-full flex items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${bgNumero} text-white font-semibold text-sm`}
            >
              2
            </div>
            <div
              className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              Preguntas del examen
            </div>
            {tipoPregunta && 
              ((tipoPregunta === "pdf" && archivoPDF) || 
               (tipoPregunta === "automatico" && preguntasAutomaticas.length > 0)) ? (
              <Check className={`w-5 h-5 ${textCheck}`} />
            ) : (
              <div className="relative">
                <AlertCircle
                  className="w-5 h-5 text-red-500 cursor-pointer"
                  onMouseEnter={() => setMostrarTooltipPregunta(true)}
                  onMouseLeave={() => setMostrarTooltipPregunta(false)}
                />
                {mostrarTooltipPregunta && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 ml-7 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                    {!tipoPregunta 
                      ? "Debes seleccionar una opción"
                      : tipoPregunta === "pdf" 
                      ? "Debes subir un archivo PDF" 
                      : "Debes añadir al menos una pregunta"}
                    <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                  </div>
                )}
              </div>
            )}
          </div>
          {seccion2Abierta ? (
            <ChevronUp
              className={`w-5 h-5 ${darkMode ? "text-white" : "text-gray-900"}`}
            />
          ) : (
            <ChevronDown
              className={`w-5 h-5 ${darkMode ? "text-white" : "text-gray-900"}`}
            />
          )}
        </button>
        {seccion2Abierta && (
          <div className="px-6 pb-6 space-y-4">
            {[
              {
                tipo: "pdf",
                titulo: "Usar un archivo PDF",
                desc: "Sube el archivo del examen en formato .PDF",
              },
              {
                tipo: "automatico",
                titulo: "Crear examen manualmente",
                desc: "Cree un exámen con diferentes tipos de preguntas.",
              },
            ].map(({ tipo, titulo, desc }) => (
              <div
                key={tipo}
                onClick={() => setTipoPregunta(tipo as TipoPregunta)}
                className={`p-5 rounded-lg border cursor-pointer transition-all ${tipoPregunta === tipo ? `${borderActivo} ${bgActivoLight}` : "border-gray-200 hover:border-gray-300"}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${tipoPregunta === tipo ? bgCheckbox : "border-gray-300"}`}
                  >
                    {tipoPregunta === tipo && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div
                      className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {titulo}
                      {tipoPregunta === tipo && <span className="text-red-500 ml-1">*</span>}
                    </div>
                    <p
                      className={`text-base mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                    >
                      {desc}
                    </p>
                    {tipoPregunta === "pdf" && tipo === "pdf" && (
                      <div className="mt-4">
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {archivoPDF ? archivoPDF.name : "Seleccionar PDF"}
                          </span>
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) =>
                              e.target.files?.[0] &&
                              handlePDFSelection(e.target.files[0])
                            }
                          />
                        </label>
                      </div>
                    )}
                    {/* Mostrar PDF existente si estamos editando y no se ha subido uno nuevo */}
                    {tipoPregunta === "pdf" && tipo === "pdf" && isEditMode && pdfExistente && !archivoPDF && (
                      <div className={`mt-2 text-sm ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                        📄 Archivo actual: {pdfExistente.split('/').pop()}
                      </div>
                    )}
                    {tipoPregunta === "automatico" && tipo === "automatico" && (
                      <div className="mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModalPreguntasAutomaticas();
                          }}
                          className={`px-4 py-2 rounded-lg ${bgBoton} text-white ${bgBotonHover} transition-colors font-medium`}
                        >
                          {preguntasAutomaticas.length > 0
                            ? `Editar preguntas (${preguntasAutomaticas.length})`
                            : "Agregar preguntas"}
                        </button>
                        {preguntasAutomaticas.length > 0 && (
                          <p
                            className={`text-xs mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                          >
                            ✓ {preguntasAutomaticas.length}{" "}
                            {preguntasAutomaticas.length === 1
                              ? "pregunta agregada"
                              : "preguntas agregadas"}
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
      <div
        className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-lg shadow-sm overflow-hidden`}
      >
        <button
          onClick={() => setSeccion3Abierta(!seccion3Abierta)}
          className="w-full flex items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${bgNumero} text-white font-semibold text-sm`}
            >
              3
            </div>
            <div
              className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              Datos del estudiante
            </div>
            {camposEstudiante.some((c) => c.activo) ? (
              <Check className={`w-5 h-5 ${textCheck}`} />
            ) : (
              <div className="relative">
                <AlertCircle
                  className="w-5 h-5 text-red-500 cursor-pointer"
                  onMouseEnter={() => setMostrarTooltipDatosEstudiante(true)}
                  onMouseLeave={() => setMostrarTooltipDatosEstudiante(false)}
                />
                {mostrarTooltipDatosEstudiante && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 ml-7 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                    Debes seleccionar al menos un dato del estudiante
                    <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                  </div>
                )}
              </div>
            )}
          </div>
          {seccion3Abierta ? (
            <ChevronUp
              className={`w-5 h-5 ${darkMode ? "text-white" : "text-gray-900"}`}
            />
          ) : (
            <ChevronDown
              className={`w-5 h-5 ${darkMode ? "text-white" : "text-gray-900"}`}
            />
          )}
        </button>
        {seccion3Abierta && (
          <div className="px-6 pb-6 space-y-3">
            <p
              className={`text-base ${darkMode ? "text-gray-400" : "text-gray-600"} mb-4`}
            >
              Seleccione qué información deberá proporcionar el estudiante antes
              de iniciar el examen. <span className="text-red-500">*</span>
            </p>
            {camposEstudiante.map((campo) => (
              <div
                key={campo.id}
                onClick={() => toggleCampo(campo.id)}
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${campo.activo ? `${borderActivo} ${bgActivoLight}` : "border-gray-200 hover:border-gray-300"}`}
              >
                <span
                  className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                >
                  {campo.nombre}
                </span>
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${campo.activo ? bgCheckbox : "border-gray-300"}`}
                >
                  {campo.activo && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección 4 */}
      <div
        className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-lg shadow-sm overflow-hidden`}
      >
        <button
          onClick={() => {
            setSeccion4Abierta(!seccion4Abierta);
            if (!seccion4Abierta) setSeccion4Visitada(true);
          }}
          className="w-full flex items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${bgNumero} text-white font-semibold text-sm`}
            >
              4
            </div>
            <div
              className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              Tiempo
            </div>
            {!seccion4Visitada || (limiteHabilitado && !opcionTiempoAgotado) ? (
              <div className="relative">
                <AlertCircle
                  className="w-5 h-5 text-red-500 cursor-pointer"
                  onMouseEnter={() => setMostrarTooltipTiempo(true)}
                  onMouseLeave={() => setMostrarTooltipTiempo(false)}
                />
                {mostrarTooltipTiempo && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 ml-7 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                    {!seccion4Visitada 
                      ? "Debes revisar las opciones de tiempo" 
                      : "Debes seleccionar qué pasa cuando se agote el tiempo"}
                    <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                  </div>
                )}
              </div>
            ) : (
              <Check className={`w-5 h-5 ${textCheck}`} />
            )}
          </div>
          {seccion4Abierta ? (
            <ChevronUp
              className={`w-5 h-5 ${darkMode ? "text-white" : "text-gray-900"}`}
            />
          ) : (
            <ChevronDown
              className={`w-5 h-5 ${darkMode ? "text-white" : "text-gray-900"}`}
            />
          )}
        </button>
        {seccion4Abierta && (
          <div className="px-6 pb-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label
                  className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  Abrir el examen
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
                  <button
                    onClick={() =>
                      setFechaInicioHabilitada(!fechaInicioHabilitada)
                    }
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${fechaInicioHabilitada ? bgCheckbox : darkMode ? "border-gray-600" : "border-gray-300"}`}
                  >
                    {fechaInicioHabilitada && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                  <span
                    className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Habilitar
                  </span>
                </div>
              </div>
              {fechaInicioHabilitada && (
                <input
                  type="datetime-local"
                  value={fechaInicio}
                  onChange={(e) => handleFechaInicioChange(e.target.value)}
                  min={obtenerFechaMinima()}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-white [color-scheme:dark]"
                      : "bg-white border-gray-300"
                  }`}
                />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label
                  className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  Cerrar el examen
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
                  <button
                    onClick={() =>
                      setFechaCierreHabilitada(!fechaCierreHabilitada)
                    }
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${fechaCierreHabilitada ? bgCheckbox : darkMode ? "border-gray-600" : "border-gray-300"}`}
                  >
                    {fechaCierreHabilitada && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                  <span
                    className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Habilitar
                  </span>
                </div>
              </div>
              {fechaCierreHabilitada && (
                <input
                  type="datetime-local"
                  value={fechaCierre}
                  onChange={(e) => handleFechaCierreChange(e.target.value)}
                  onBlur={validarFechaCierre}
                  min={fechaInicioHabilitada ? fechaInicio : obtenerFechaMinima()}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-white [color-scheme:dark]"
                      : "bg-white border-gray-300"
                  }`}
                />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label
                  className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  Límite de tiempo
                </label>
                <div className="relative group">
                  <HelpCircle className={`w-5 h-5 ${darkMode ? "text-gray-500" : "text-gray-400"} cursor-help`} />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg" style={{ minWidth: '200px' }}>
                    Establece un tiempo máximo para completar el examen
                    <div className="absolute left-3 -bottom-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                  </div>
                </div>
                <button
                  onClick={() => setLimiteHabilitado(!limiteHabilitado)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${limiteHabilitado ? bgCheckbox : darkMode ? "border-gray-600" : "border-gray-300"}`}
                >
                  {limiteHabilitado && <Check className="w-3 h-3 text-white" />}
                </button>
                <span
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Habilitar
                </span>
              </div>
              {limiteHabilitado && (
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    value={limiteTiempo}
                    onChange={(e) => setLimiteTiempo(e.target.value === "" ? "" : Number(e.target.value))}
                    onBlur={() => {
                      if (!limiteTiempo || Number(limiteTiempo) <= 0) {
                        setLimiteTiempo(30);
                      }
                    }}
                    className={`w-28 px-4 py-2.5 rounded-lg border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-gray-300"}`}
                  />
                  <span
                    className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    minutos
                  </span>
                </div>
              )}
            </div>

            {limiteHabilitado && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label
                    className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Cuando se agote el tiempo
                  </label>
                  <span className="text-red-500">*</span>
                  <div className="relative group">
                    <HelpCircle className={`w-5 h-5 ${darkMode ? "text-gray-500" : "text-gray-400"} cursor-help`} />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg" style={{ minWidth: '220px', maxWidth: '280px' }}>
                      Define qué sucede cuando el tiempo límite se agota
                      <div className="absolute left-3 -bottom-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                  </div>
                </div>
                <select
                  value={opcionTiempoAgotado}
                  onChange={(e) =>
                    setOpcionTiempoAgotado(e.target.value as OpcionTiempoAgotado)
                  }
                  className={`w-full px-4 py-3 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-gray-300"}`}
                >
                  {opcionesTiempoAgotado.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sección 5 */}
      <div
        className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-lg shadow-sm overflow-hidden`}
      >
        <button
          onClick={() => {
            setSeccion5Abierta(!seccion5Abierta);
            if (!seccion5Abierta) setSeccion5Visitada(true);
          }}
          className="w-full flex items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${bgNumero} text-white font-semibold text-sm`}
            >
              5
            </div>
            <div
              className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              Herramientas
            </div>
            {!seccion5Visitada ? (
              <div className="relative">
                <AlertCircle
                  className="w-5 h-5 text-red-500 cursor-pointer"
                  onMouseEnter={() => setMostrarTooltipHerramientas(true)}
                  onMouseLeave={() => setMostrarTooltipHerramientas(false)}
                />
                {mostrarTooltipHerramientas && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 ml-7 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                    Debes revisar las herramientas permitidas
                    <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                  </div>
                )}
              </div>
            ) : (
              <Check className={`w-5 h-5 ${textCheck}`} />
            )}
          </div>
          {seccion5Abierta ? (
            <ChevronUp
              className={`w-5 h-5 ${darkMode ? "text-white" : "text-gray-900"}`}
            />
          ) : (
            <ChevronDown
              className={`w-5 h-5 ${darkMode ? "text-white" : "text-gray-900"}`}
            />
          )}
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
      <div
        className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-lg shadow-sm overflow-hidden`}
      >
        <button
          onClick={() => setSeccion6Abierta(!seccion6Abierta)}
          className="w-full flex items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${bgNumero} text-white font-semibold text-sm`}
            >
              6
            </div>
            <div
              className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              Seguridad
            </div>
            {consecuenciaAbandono && (!contraseñaHabilitada || (contraseñaHabilitada && contraseñaValida && contraseñaExamen.trim())) ? (
              <Check className={`w-5 h-5 ${textCheck}`} />
            ) : (
              <div className="relative">
                <AlertCircle
                  className="w-5 h-5 text-red-500 cursor-pointer"
                  onMouseEnter={() => setMostrarTooltipSeguridad(true)}
                  onMouseLeave={() => setMostrarTooltipSeguridad(false)}
                />
                {mostrarTooltipSeguridad && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 ml-7 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                    {!consecuenciaAbandono 
                      ? "Debes seleccionar la consecuencia de abandono"
                      : "Debes ingresar una contraseña válida"}
                    <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                  </div>
                )}
              </div>
            )}
          </div>
          {seccion6Abierta ? (
            <ChevronUp
              className={`w-5 h-5 ${darkMode ? "text-white" : "text-gray-900"}`}
            />
          ) : (
            <ChevronDown
              className={`w-5 h-5 ${darkMode ? "text-white" : "text-gray-900"}`}
            />
          )}
        </button>
        {seccion6Abierta && (
          <SeccionSeguridad
            darkMode={darkMode}
            onContraseñaChange={setContraseñaExamen}
            onConsecuenciaChange={setConsecuenciaAbandono}
            onContraseñaHabilitadaChange={setContraseñaHabilitada}
            onContraseñaValidaChange={handleContraseñaValidaChange}
            contraseñaInicial={contraseñaExamen}
            consecuenciaInicial={consecuenciaAbandono}
            contraseñaHabilitadaInicial={contraseñaHabilitada}
          />
        )}
      </div>

      {/* Botones Finales */}
      <div className="flex justify-end gap-3 pt-4">
        {!isEditMode && (
        <button
          className="px-6 py-3 rounded-lg font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
          onClick={() => {
            mostrarModal("confirmar", "Cancelar creación", "¿Está seguro que desea cancelar? Se perderán todos los datos.", () => {
              cerrarModal();
              resetearFormulario();
            }, cerrarModal);
          }}
          disabled={guardando}
        >
          Cancelar
        </button>
        )}
        <button
          onClick={handleCrearExamen}
          disabled={
            !nombreExamen.trim() ||
            !tipoPregunta ||
            !camposEstudiante.some((c) => c.activo) ||
            !consecuenciaAbandono ||
            !seccion4Visitada ||
            !seccion5Visitada ||
            guardando ||
            (contraseñaHabilitada && !contraseñaValida)
          }
          className={`px-6 py-3 rounded-lg font-medium ${bgBoton} text-white disabled:opacity-50 disabled:cursor-not-allowed ${bgBotonHover} transition-colors flex items-center gap-2`}
        >
          {guardando ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Guardando...</span>
            </>
          ) : (
            <span>{isEditMode ? "Guardar Cambios" : "Crear Examen"}</span>
          )}
        </button>
      </div>

      {/* Modal Preguntas Automáticas - ⭐ MODIFICADO */}
      {mostrarModalPreguntasAutomaticas && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"} rounded-lg border shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col`}
          >
            <div
              className={`flex items-center justify-between p-6 border-b ${darkMode ? "border-slate-700" : "border-gray-200"}`}
            >
              <h3
                className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
              >
                Crear preguntas del examen
              </h3>
              <button
                onClick={cancelarPreguntasAutomaticas}
                className={`p-2 rounded-lg transition-colors ${darkMode ? "text-gray-400 hover:text-white hover:bg-slate-800" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              {/* ⭐ AGREGADA PROP onValidationChange */}
              <CrearPreguntas
                darkMode={darkMode}
                preguntasIniciales={preguntasAutomaticasTemp}
                onPreguntasChange={handlePreguntasChange}
                onValidationChange={handleValidationChange}
              />
            </div>
            <div
              className={`flex items-center justify-between gap-3 p-6 border-t ${darkMode ? "border-slate-700" : "border-gray-200"}`}
            >
              {preguntasAutomaticasTemp.length > 0 && (
                <div className="flex items-center gap-6">
                  <span
                    className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Total de preguntas: {preguntasAutomaticasTemp.length}
                  </span>
                  <span
                    className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Puntos totales:{" "}
                    {preguntasAutomaticasTemp.reduce(
                      (acc, p) => acc + p.puntos,
                      0,
                    )}
                  </span>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={cancelarPreguntasAutomaticas}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${darkMode ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-gray-100 text-gray-900 hover:bg-gray-200"}`}
                >
                  Cancelar y cerrar
                </button>
                {/* ⭐ BOTÓN OK BLOQUEADO SI HAY PREGUNTAS SIN CONFIGURAR */}
                <button
                  onClick={guardarPreguntasAutomaticas}
                  disabled={!preguntasValidas}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    preguntasValidas
                      ? `${bgBoton} ${bgBotonHover} text-white cursor-pointer`
                      : darkMode
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-60'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                  }`}
                  title={!preguntasValidas ? 'Configura las respuestas correctas para continuar' : 'Guardar preguntas'}
                >
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
            onExamenCreado?.();
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

      <ModalConfirmacion
        {...modal}
        darkMode={darkMode}
        onCancelar={modal.onCancelar || cerrarModal}
      />
    </div>
  );
}