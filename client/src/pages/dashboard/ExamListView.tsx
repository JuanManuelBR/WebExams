// src/components/ListaExamenes.tsx
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Copy,
  Trash2,
  Share2,
  Check,
  FileText,
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
  RefreshCw,
  Loader2,
  Pencil,
  Bot,
  ClipboardList,
  FileDown,
} from "lucide-react";
import {
  examsService,
  obtenerUsuarioActual,
  type ExamenCreado,
} from "../../services/examsService";
import { examsAttemptsService } from "../../services/examsAttempts";
import ConfirmModal from "../../components/ConfirmModal";
import ExportPDFModal from "../../components/ExportPDFModal";
import PageLoader from "../../components/PageLoader";
import ScrollReveal from "../../components/ScrollReveal";

interface ListaExamenesProps {
  darkMode: boolean;
  onVerDetalles?: (examen: ExamenCreado) => void;
  onCrearExamen?: () => void;
}

interface ExamenConEstado extends ExamenCreado {
  activoManual?: boolean;
  archivado?: boolean;
}

export default function ListaExamenes({
  darkMode,
  onVerDetalles,
  onCrearExamen,
}: ListaExamenesProps) {
  const navigate = useNavigate();
  const [examenes, setExamenes] = useState<ExamenConEstado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCreatedCode] = useState<string | null>(() =>
    sessionStorage.getItem('lastCreatedExamCode')
  );

  const [codigoCopiado, setCodigoCopiado] = useState<string | null>(null);
  const [urlCopiada, setUrlCopiada] = useState<string | null>(null);
  const [regenerandoCodigo, setRegenerandoCodigo] = useState<number | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [codigoGrande, setCodigoGrande] = useState<{
    codigo: string;
    nombre: string;
  } | null>(null);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [modalCompartir, setModalCompartir] = useState<ExamenConEstado | null>(
    null,
  );
  const [correoDestino, setCorreoDestino] = useState("");
  const [compartiendoExito, setCompartiendoExito] = useState(false);
  const [enviandoExamen, setEnviandoExamen] = useState(false);
  const [errorCompartir, setErrorCompartir] = useState<string | null>(null);
  const [exportModal, setExportModal] = useState<ExamenConEstado | null>(null);

  const [modal, setModal] = useState<{ visible: boolean; tipo: "exito" | "error" | "advertencia" | "info" | "confirmar"; titulo: string; mensaje: string; onConfirmar: () => void; onCancelar?: () => void }>({ visible: false, tipo: "info", titulo: "", mensaje: "", onConfirmar: () => {} });
  const mostrarModal = (tipo: "exito" | "error" | "advertencia" | "info" | "confirmar", titulo: string, mensaje: string, onConfirmar: () => void, onCancelar?: () => void) => setModal({ visible: true, tipo, titulo, mensaje, onConfirmar, onCancelar });
  const cerrarModal = () => setModal(prev => ({ ...prev, visible: false }));

  useEffect(() => {
    cargarExamenes();
  }, []);

  useEffect(() => {
    return () => { sessionStorage.removeItem('lastCreatedExamCode'); };
  }, []);

  const cargarExamenes = async () => {
    try {
      setCargando(true);
      setError(null);

      const usuario = obtenerUsuarioActual();
      if (!usuario) {
        setError("No se pudo obtener la información del usuario");
        return;
      }

      const data = await examsService.obtenerMisExamenes(usuario.id);

      const examenesConEstado = data.map((ex) => ({
        ...ex,
        activoManual: ex.estado === "open",
        archivado: ex.estado === "archivado",
      }));

      setExamenes(examenesConEstado);
    } catch (error: any) {
      console.error("❌ [LISTA] Error:", error);
      setError(error.message || "Error al cargar los exámenes");
    } finally {
      setCargando(false);
    }
  };

  const ordenarExamenes = (exams: ExamenConEstado[]) => {
    return [...exams].sort((a, b) => {
      if (a.archivado !== b.archivado) return a.archivado ? 1 : -1;
      // Más reciente primero
      return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
    });
  };

  const examenesOrdenados = ordenarExamenes(examenes);
  const examenesActivos = examenesOrdenados.filter((ex) => !ex.archivado);
  const examenesArchivados = examenesOrdenados.filter((ex) => ex.archivado);
  const examenesAMostrar = mostrarArchivados
    ? examenesArchivados
    : examenesActivos;

  const toggleEstadoExamen = async (id: number, estadoActual: string) => {
    try {
      const nuevoEstado = estadoActual === "open" ? "closed" : "open";

      await examsService.updateExamStatus(id, nuevoEstado);

      // Actualizar estado local SIN reordenar
      setExamenes((prev) =>
        prev.map((ex) =>
          ex.id === id
            ? {
                ...ex,
                estado: nuevoEstado,
                activoManual: nuevoEstado === "open",
              }
            : ex,
        ),
      );
    } catch (error: any) {
      console.error("Error al cambiar estado:", error);
      mostrarModal("error", "Error", error.message || "Error al cambiar el estado del examen", cerrarModal);
    }
  };

  const copiarSoloCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo).then(() => {
      setCodigoCopiado(codigo);
      setTimeout(() => setCodigoCopiado(null), 2000);
    });
  };

  const COOLDOWN_MS = 60 * 60 * 1000; // 1 hora

  const getCooldownRestante = (examen: ExamenConEstado): number => {
    if (!examen.codigoRegeneradoEn) return 0;
    const transcurrido = Date.now() - new Date(examen.codigoRegeneradoEn).getTime();
    return Math.max(0, COOLDOWN_MS - transcurrido);
  };

  const regenerarCodigo = (examen: ExamenConEstado) => {
    const cooldownRestante = getCooldownRestante(examen);
    if (cooldownRestante > 0) {
      const minutos = Math.ceil(cooldownRestante / 60000);
      mostrarModal(
        "advertencia",
        "Límite de tiempo",
        `Debes esperar ${minutos} minuto${minutos !== 1 ? "s" : ""} antes de regenerar el código nuevamente.`,
        cerrarModal,
      );
      return;
    }

    const confirmar = async () => {
      cerrarModal();
      setRegenerandoCodigo(examen.id);
      try {
        const { codigoExamen, codigoRegeneradoEn } = await examsService.regenerarCodigoExamen(examen.id);
        setExamenes((prev) =>
          prev.map((ex) =>
            ex.id === examen.id ? { ...ex, codigoExamen, codigoRegeneradoEn } : ex,
          ),
        );
      } catch (error: any) {
        const msg =
          error?.response?.status === 429
            ? error.response.data?.message || "Debes esperar antes de regenerar el código."
            : error.message || "No se pudo regenerar el código. Intenta de nuevo.";
        mostrarModal("error", "Error", msg, cerrarModal);
      } finally {
        setRegenerandoCodigo(null);
      }
    };

    mostrarModal(
      "advertencia",
      "Regenerar código",
      "Se generará un nuevo código de acceso. El código anterior quedará inválido. ¿Deseas continuar?",
      confirmar,
      cerrarModal,
    );
  };

  const copiarEnlaceExamen = (codigo: string) => {
    const url = `${window.location.origin}/exam-access?code=${encodeURIComponent(codigo)}`;
    navigator.clipboard.writeText(url).then(() => {
      setUrlCopiada(codigo);
      setTimeout(() => setUrlCopiada(null), 2000);
    });
  };

  const archivarExamen = (examen: ExamenConEstado) => {
    const confirmarArchivo = async () => {
      cerrarModal();
      try {
        await examsService.archiveExam(examen.id);
        setExamenes((prev) =>
          prev.map((ex) =>
            ex.codigoExamen === examen.codigoExamen
              ? { ...ex, archivado: true, activoManual: false, estado: "closed" }
              : ex,
          ),
        );
      } catch {
        mostrarModal("advertencia", "Error", "No se pudo archivar el examen. Intenta de nuevo.", cerrarModal);
      }
    };

    if (examen.activoManual) {
      mostrarModal("advertencia", "Archivar examen", "Al archivar este examen se inhabilitará automáticamente. ¿Deseas continuar?", confirmarArchivo, cerrarModal);
    } else {
      confirmarArchivo();
    }
    setMenuAbierto(null);
  };

  const desarchivarExamen = async (codigo: string) => {
    const examen = examenes.find((ex) => ex.codigoExamen === codigo);
    if (!examen) return;
    try {
      await examsService.unarchiveExam(examen.id);
      setExamenes((prev) =>
        prev.map((ex) =>
          ex.codigoExamen === codigo
            ? { ...ex, archivado: false, activoManual: true }
            : ex,
        ),
      );
    } catch {
      mostrarModal("advertencia", "Error", "No se pudo desarchivar el examen. Intenta de nuevo.", cerrarModal);
    }
    setMenuAbierto(null);
  };

  const duplicarExamen = async (examen: ExamenConEstado) => {
    setMenuAbierto(null);
    try {
      const copia = await examsService.duplicarExamen(examen.id);
      const copiaConEstado: ExamenConEstado = {
        ...copia,
        activoManual: copia.estado === "open",
        archivado: copia.estado === "archivado",
      };
      setExamenes((prev) => ordenarExamenes([...prev, copiaConEstado]));
      mostrarModal("info", "Examen duplicado", `Se creó una copia: "${copia.nombre}"`, cerrarModal);
    } catch {
      mostrarModal("advertencia", "Error", "No se pudo duplicar el examen. Intenta de nuevo.", cerrarModal);
    }
  };

  const compartirExamen = async (examen: ExamenConEstado) => {
    setModalCompartir(examen);
    setMenuAbierto(null);
  };

  const enviarExamenPorCorreo = async () => {
    setErrorCompartir(null);

    if (!correoDestino.trim()) {
      setErrorCompartir("Por favor ingresa un correo electrónico");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correoDestino)) {
      setErrorCompartir("Por favor ingresa un correo electrónico válido");
      return;
    }

    if (!modalCompartir) return;

    setEnviandoExamen(true);
    try {
      await examsService.compartirExamen(modalCompartir.id, correoDestino.trim());
      setCompartiendoExito(true);
      setTimeout(() => {
        setCompartiendoExito(false);
        setModalCompartir(null);
        setCorreoDestino("");
      }, 2000);
    } catch (error: any) {
      const mensaje = error?.response?.data?.message || "Error al compartir el examen";
      setErrorCompartir(mensaje);
    } finally {
      setEnviandoExamen(false);
    }
  };

  const confirmarEliminar = (id: number, nombre: string) => {
    mostrarModal("confirmar", "Eliminar examen", `¿Eliminar "${nombre}"?`, async () => {
      cerrarModal();
      try {
        const usuario = obtenerUsuarioActual();
        if (!usuario) {
          mostrarModal("error", "Error", "No se pudo obtener información del usuario", cerrarModal);
          return;
        }

        const success = await examsService.eliminarExamen(id, usuario.id);

        if (success) {
          setExamenes((prev) => prev.filter((ex) => ex.id !== id));
        } else {
          mostrarModal("error", "Error", "No se pudo eliminar el examen", cerrarModal);
        }
      } catch (error) {
        console.error("❌ [LISTA] Error al eliminar:", error);
        mostrarModal("error", "Error", "Error al eliminar el examen", cerrarModal);
      }
      setMenuAbierto(null);
    }, () => {
      cerrarModal();
      setMenuAbierto(null);
    });
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const obtenerEstadoExamen = (examen: ExamenConEstado) => {
    if (examen.archivado) return "Archivado";
    if (examen.activoManual === false) return "Inactivo";

    const ahora = new Date();
    if (examen.horaApertura && new Date(examen.horaApertura) > ahora)
      return "Programado";
    if (examen.horaCierre && new Date(examen.horaCierre) < ahora)
      return "Finalizado";

    return "Activo";
  };

  const obtenerTipoExamen = (examen: ExamenConEstado): string => {
    if (examen.archivoPDF) return "pdf";
    return "automatico";
  };

  const obtenerColorTipo = (tipo: string) => {
    switch (tipo) {
      case "pdf":
        return "bg-rose-600";
      case "automatico":
        return "bg-indigo-600";
      default:
        return "bg-indigo-600";
    }
  };

  const obtenerIconoTipo = (tipo: string) => {
    switch (tipo) {
      case "pdf":
        return <FileText className="w-3.5 h-3.5" />;
      case "automatico":
        return <Bot className="w-3.5 h-3.5" />;
      default:
        return <Bot className="w-3.5 h-3.5" />;
    }
  };

  if (cargando) {
    return <PageLoader darkMode={darkMode} mensaje="Cargando exámenes..." inline />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div
          className={`text-center p-6 rounded-lg max-w-md ${
            darkMode
              ? "bg-red-900/20 border border-red-800"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <p
            className={`text-lg font-semibold mb-2 ${
              darkMode ? "text-red-400" : "text-red-700"
            }`}
          >
            Error al cargar exámenes
          </p>
          <p className={`mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            {error}
          </p>
          <button
            onClick={cargarExamenes}
            className={`px-4 py-2 rounded-lg font-medium ${
              darkMode
                ? "bg-teal-600 hover:bg-teal-700"
                : "bg-slate-700 hover:bg-slate-800"
            } text-white transition-colors`}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (examenes.length === 0) {
    return (
      <div
        className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-xl shadow-sm p-12 text-center`}
      >
        <div
          className={`inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6 ${
            darkMode ? "bg-slate-800" : "bg-gray-100"
          }`}
        >
          <BookOpen className="w-12 h-12 text-teal-500" />
        </div>
        <h3
          className={`text-2xl font-bold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}
        >
          No tienes exámenes
        </h3>
        <p className={`mb-6 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          Crea tu primer examen para comenzar
        </p>
        <button
          onClick={onCrearExamen}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-teal-600 hover:bg-teal-700 text-white transition-colors"
        >
          <Plus className="w-5 h-5" /> Crear Primer Examen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setMostrarArchivados(!mostrarArchivados)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm ${
            darkMode
              ? "bg-[#2D3E52] text-gray-200 hover:bg-[#374151]"
              : "bg-[#1e293b] text-white hover:bg-[#1e293b]/90"
          }`}
        >
          {mostrarArchivados ? (
            <ArchiveRestore className="w-4 h-4" />
          ) : (
            <Archive className="w-4 h-4" />
          )}
          {mostrarArchivados
            ? `Exámenes Activos (${examenesActivos.length})`
            : `Archivados (${examenesArchivados.length})`}
        </button>
      </div>

      {modalCompartir && (
        <div
          className="fixed top-0 left-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-8 overflow-hidden animate-in fade-in duration-200"
          onClick={() => {
            setModalCompartir(null);
            setCorreoDestino("");
            setErrorCompartir(null);
          }}
        >
          <div
            className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-2xl p-4 sm:p-8 max-w-lg w-full relative shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setModalCompartir(null);
                setCorreoDestino("");
                setErrorCompartir(null);
              }}
              className={`absolute top-4 right-4 p-2 rounded-lg ${
                darkMode
                  ? "hover:bg-slate-800 text-gray-400"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            {compartiendoExito ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h3
                  className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                >
                  ¡Examen compartido!
                </h3>
                <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                  El examen ha sido enviado exitosamente
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2
                    className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Compartir Examen
                  </h2>
                  <p
                    className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Envía una copia de "{modalCompartir.nombre}" a otro usuario
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Correo electrónico del destinatario
                    </label>
                    <input
                      type="email"
                      value={correoDestino}
                      onChange={(e) => { setCorreoDestino(e.target.value); setErrorCompartir(null); }}
                      placeholder="profesor@ejemplo.com"
                      className={`w-full px-4 py-3 rounded-lg border outline-none transition-all ${
                        errorCompartir
                          ? "border-red-500"
                          : darkMode
                          ? "bg-slate-800 border-slate-700 text-white placeholder-gray-500 focus:border-blue-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500"
                      } ${darkMode ? "bg-slate-800 text-white placeholder-gray-500" : "bg-white text-gray-900 placeholder-gray-400"}`}
                    />
                    {errorCompartir && (
                      <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                        <X className="w-3.5 h-3.5 shrink-0" />
                        {errorCompartir}
                      </p>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
                  >
                    <p
                      className={`text-xs font-medium mb-2 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Información del examen
                    </p>
                    <div className="space-y-1">
                      <p
                        className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        <span className="font-medium">Nombre:</span>{" "}
                        {modalCompartir.nombre}
                      </p>
                      <p
                        className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        <span className="font-medium">Código:</span>{" "}
                        {modalCompartir.codigoExamen}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setModalCompartir(null);
                      setCorreoDestino("");
                      setErrorCompartir(null);
                    }}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      darkMode
                        ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={enviarExamenPorCorreo}
                    disabled={enviandoExamen}
                    className="flex-1 px-4 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {enviandoExamen ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    {enviandoExamen ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {codigoGrande && (
        <div
          className="fixed top-0 left-0 w-screen h-screen bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-8 overflow-hidden animate-in fade-in duration-200"
          onClick={() => setCodigoGrande(null)}
        >
          <div
            className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-3xl p-5 sm:p-12 max-w-4xl w-full relative shadow-2xl overflow-hidden scale-100`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setCodigoGrande(null)}
              className={`absolute top-6 right-6 p-3 rounded-full ${
                darkMode
                  ? "hover:bg-slate-800 text-gray-400"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              <h2
                className={`text-3xl font-bold mb-4 px-4 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {codigoGrande.nombre}
              </h2>
              <code className="text-5xl sm:text-8xl font-bold font-mono text-teal-500 mt-4 sm:mt-8 block">
                {codigoGrande.codigo}
              </code>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 pb-24">
        {examenesAMostrar.length === 0 ? (
          <div
            className={`${darkMode ? "bg-slate-800/50" : "bg-gray-50"} rounded-xl p-8 text-center`}
          >
            <Archive
              className={`w-12 h-12 mx-auto mb-3 ${
                darkMode ? "text-gray-600" : "text-gray-400"
              }`}
            />
            <p
              className={`text-lg font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              {mostrarArchivados
                ? "No hay exámenes archivados"
                : "No hay exámenes activos"}
            </p>
          </div>
        ) : (
          examenesAMostrar.map((examen, index) => {
            const estado = obtenerEstadoExamen(examen);
            const isInactive = !examen.activoManual || examen.archivado;
            const isMenuOpen = menuAbierto === examen.codigoExamen;
            const tipoExamen = obtenerTipoExamen(examen);
            const isNew = lastCreatedCode === examen.codigoExamen;

            return (
              <ScrollReveal key={examen.id} delay={index * 55}>
              <div
                className={`group rounded-2xl p-5 border transition-all duration-500 ${
                  isNew
                    ? darkMode
                      ? "bg-violet-900/20 border-violet-500/60 shadow-lg shadow-violet-500/10"
                      : "bg-violet-50 border-violet-400 shadow-lg shadow-violet-200"
                    : isInactive
                      ? darkMode
                        ? "bg-slate-800/50 border-slate-700/50"
                        : "bg-gray-100/70 border-gray-200/70"
                      : darkMode
                        ? "bg-slate-900/80 border-slate-700/50 hover:bg-slate-900"
                        : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-2 md:gap-5">
                  <div
                    className={`flex-1 flex items-center gap-2 md:gap-5 min-w-0 transition-opacity duration-300 ${
                      isInactive ? "opacity-50" : "opacity-100"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        isInactive
                          ? darkMode
                            ? "bg-slate-700/50"
                            : "bg-gray-300/50"
                          : obtenerColorTipo(tipoExamen)
                      }`}
                    >
                      <FileText
                        className={`w-7 h-7 ${
                          isInactive
                            ? darkMode
                              ? "text-slate-500"
                              : "text-gray-400"
                            : "text-white"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <h3
                          className={`font-bold text-base sm:text-lg truncate ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {examen.nombre}
                        </h3>
                        {isNew && (
                          <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-violet-500 text-white animate-pulse">
                            Nuevo
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all duration-300 ${
                            estado === "Activo"
                              ? darkMode
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-emerald-100 text-emerald-700"
                              : estado === "Archivado"
                                ? darkMode
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-amber-100 text-amber-700"
                                : estado === "Inactivo"
                                  ? darkMode
                                    ? "bg-slate-700/50 text-slate-400"
                                    : "bg-gray-200 text-gray-500"
                                  : darkMode
                                    ? "bg-slate-700 text-slate-300"
                                    : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {estado}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-80">
                        <span
                          className={`flex items-center gap-1.5 whitespace-nowrap ${
                            darkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />{" "}
                          {formatearFecha(examen.fecha_creacion)}
                        </span>
                        <span
                          className={`flex items-center gap-1.5 ${
                            darkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {obtenerIconoTipo(tipoExamen)}{" "}
                          {tipoExamen.charAt(0).toUpperCase() +
                            tipoExamen.slice(1)}
                        </span>
                        {examen.questions && (
                          <span
                            className={`flex items-center gap-1.5 ${
                              darkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            <ClipboardList className="w-3.5 h-3.5" /> {examen.questions.length} preguntas
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (examen.codigoExamen)
                            copiarSoloCodigo(examen.codigoExamen);
                        }}
                        className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-base font-mono font-bold transition-all duration-200 shadow-sm cursor-pointer ${
                          examen.codigoExamen && codigoCopiado === examen.codigoExamen
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : isInactive
                              ? darkMode
                                ? "bg-slate-800/50 border-slate-700/50 text-slate-500 hover:border-slate-500 active:scale-95"
                                : "bg-gray-200/50 border-gray-300/50 text-gray-400 hover:border-gray-400 active:scale-95"
                              : darkMode
                                ? "bg-[#2D3E52] border-slate-600 text-teal-400 hover:border-teal-500 active:scale-95"
                                : "bg-white border-gray-300 text-gray-900 hover:border-teal-500 active:scale-95"
                        }`}
                        title={examen.codigoExamen ? "Clic para copiar código" : "Generar código"}
                      >
                        {examen.codigoExamen && codigoCopiado === examen.codigoExamen ? (
                          <span className="flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-white" /> Copiado
                          </span>
                        ) : (
                          <>
                            <span>{examen.codigoExamen}</span>
                            {!isInactive && (() => {
                              const isRegenerando = regenerandoCodigo === examen.id;
                              const cooldownMs = getCooldownRestante(examen);
                              const enCooldown = cooldownMs > 0;
                              const minRestantes = Math.ceil(cooldownMs / 60000);
                              return (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    regenerarCodigo(examen);
                                  }}
                                  disabled={isRegenerando || enCooldown}
                                  className={`p-1 -mr-1 rounded-md transition-all duration-150 ${
                                    isRegenerando || enCooldown
                                      ? "opacity-40 cursor-not-allowed"
                                      : darkMode
                                        ? "hover:bg-white/10 text-teal-500/70 hover:text-teal-300"
                                        : "hover:bg-black/5 text-gray-400 hover:text-gray-700"
                                  }`}
                                  title={
                                    isRegenerando
                                      ? "Regenerando..."
                                      : enCooldown
                                        ? `Disponible en ${minRestantes} min`
                                        : "Regenerar código"
                                  }
                                >
                                  {isRegenerando ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              );
                            })()}
                          </>
                        )}
                      </div>

                      <div className="hidden sm:flex flex-col gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copiarEnlaceExamen(examen.codigoExamen);
                          }}
                          className={`p-1.5 rounded-lg transition-all duration-150 ${
                            urlCopiada === examen.codigoExamen
                              ? "bg-emerald-500 text-white"
                              : darkMode
                                ? "hover:bg-white/10 active:scale-90 text-gray-400"
                                : "hover:bg-black/5 active:scale-90 text-gray-500"
                          }`}
                          title="Copiar link del examen"
                        >
                          {urlCopiada === examen.codigoExamen ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Link className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCodigoGrande({
                              codigo: examen.codigoExamen,
                              nombre: examen.nombre,
                            });
                          }}
                          className={`p-1.5 rounded-lg transition-all duration-150 ${
                            darkMode
                              ? "hover:bg-white/10 active:scale-90 text-gray-400"
                              : "hover:bg-black/5 active:scale-90 text-gray-500"
                          }`}
                          title="Ver código grande"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="hidden sm:flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/exam-detail", {
                              state: { examen }
                            });
                          }}
                          className={`p-1.5 rounded-lg transition-all duration-150 ${
                            darkMode
                              ? "hover:bg-white/10 active:scale-90 text-gray-300"
                              : "hover:bg-black/5 active:scale-90 text-gray-600"
                          }`}
                          title="Visualizar examen"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="hidden sm:flex items-center">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (examen.activoManual) return;
                            try {
                              const count = await examsAttemptsService.getAttemptCount(examen.id);
                              if (count > 0) {
                                mostrarModal("advertencia", "No se puede editar", `Este examen tiene ${count} intento(s) registrado(s). Crea una copia si deseas hacer cambios.`, cerrarModal);
                                return;
                              }
                            } catch {
                              // Si falla la verificación, dejar pasar y que el backend rechace
                            }
                            navigate("/editar-examen", {
                              state: { examenAEditar: examen }
                            });
                          }}
                          className={`p-1.5 rounded-lg transition-all duration-150 ${
                            examen.activoManual
                              ? (darkMode ? "text-slate-500" : "text-gray-400")
                              : (darkMode ? "hover:bg-white/10 active:scale-90 text-gray-300" : "hover:bg-black/5 active:scale-90 text-gray-600")
                          }`}
                          title={examen.activoManual ? "Desactiva el examen para editarlo" : "Editar examen"}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-1 md:gap-3 pl-2 md:pl-3 border-l flex-shrink-0 ${darkMode ? "border-slate-700" : "border-gray-200"}`}
                  >
                    {!examen.archivado && (
                      <button
                        onClick={() =>
                          toggleEstadoExamen(examen.id, examen.estado)
                        }
                        className={`relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none ${
                          examen.activoManual
                            ? darkMode
                              ? "bg-emerald-600"
                              : "bg-emerald-500"
                            : darkMode
                              ? "bg-slate-600"
                              : "bg-gray-300"
                        }`}
                        title={
                          examen.activoManual
                            ? "Desactivar examen"
                            : "Activar examen"
                        }
                      >
                        <span
                          className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-200 ${
                            examen.activoManual
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    )}

                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isMenuOpen) {
                            setMenuAbierto(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const MENU_HEIGHT = 260;
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const top = spaceBelow < MENU_HEIGHT
                              ? Math.max(8, rect.top - MENU_HEIGHT - 6)
                              : rect.bottom + 6;
                            setMenuPos({ top, right: window.innerWidth - rect.right });
                            setMenuAbierto(examen.codigoExamen);
                          }
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${darkMode ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                      >
                        <MoreVertical
                          className={`w-5 h-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                        />
                      </button>

                      {isMenuOpen && createPortal(
                        <>
                          <div
                            className="fixed inset-0 z-[1000]"
                            onClick={() => setMenuAbierto(null)}
                          />
                          <div
                            style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 1001 }}
                            className={`w-44 rounded-xl shadow-2xl border py-1.5 ${
                              darkMode
                                ? "bg-slate-800 border-slate-700"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <button
                              onClick={() => compartirExamen(examen)}
                              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                                darkMode
                                  ? "text-gray-300 hover:bg-slate-700"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <Share2 className="w-4 h-4 text-emerald-500" />
                              Compartir
                            </button>

                            <button
                              onClick={() => duplicarExamen(examen)}
                              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                                darkMode
                                  ? "text-gray-300 hover:bg-slate-700"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <Copy className="w-4 h-4 text-indigo-500" />
                              Duplicar
                            </button>

                            {examen.archivado ? (
                              <button
                                onClick={() => desarchivarExamen(examen.codigoExamen)}
                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                                  darkMode
                                    ? "text-gray-300 hover:bg-slate-700"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <ArchiveRestore className="w-4 h-4 text-blue-500" />
                                Desarchivar
                              </button>
                            ) : (
                              <button
                                onClick={() => archivarExamen(examen)}
                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                                  darkMode
                                    ? "text-gray-300 hover:bg-slate-700"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <Archive className="w-4 h-4 text-amber-500" />
                                Archivar
                              </button>
                            )}

                            <button
                              onClick={() => { setMenuAbierto(null); setExportModal(examen); }}
                              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                                darkMode
                                  ? "text-gray-300 hover:bg-slate-700"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <FileDown className="w-4 h-4 text-teal-500" />
                              Exportar a PDF
                            </button>

                            {/* Visualizar y Editar — solo visibles en mobile (sm:hidden) */}
                            <div className={`sm:hidden`}>
                              <div className={`my-1 h-px ${darkMode ? "bg-slate-700" : "bg-gray-200"}`} />
                              <button
                                onClick={() => {
                                  setMenuAbierto(null);
                                  navigate("/exam-detail", { state: { examen } });
                                }}
                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                                  darkMode
                                    ? "text-gray-300 hover:bg-slate-700"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <Eye className="w-4 h-4 text-sky-500" />
                                Visualizar examen
                              </button>
                              <button
                                onClick={async () => {
                                  setMenuAbierto(null);
                                  if (examen.activoManual) return;
                                  try {
                                    const count = await examsAttemptsService.getAttemptCount(examen.id);
                                    if (count > 0) {
                                      mostrarModal("advertencia", "No se puede editar", `Este examen tiene ${count} intento(s) registrado(s). Crea una copia si deseas hacer cambios.`, cerrarModal);
                                      return;
                                    }
                                  } catch {
                                    // Si falla la verificación, dejar pasar y que el backend rechace
                                  }
                                  navigate("/editar-examen", { state: { examenAEditar: examen } });
                                }}
                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                                  examen.activoManual
                                    ? (darkMode ? "text-slate-500" : "text-gray-400")
                                    : (darkMode ? "text-gray-300 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-50")
                                }`}
                              >
                                <Pencil className="w-4 h-4 text-violet-500" />
                                {examen.activoManual ? "Editar (desactiva primero)" : "Editar examen"}
                              </button>
                            </div>

                            <div className={`my-1 h-px ${darkMode ? "bg-slate-700" : "bg-gray-200"}`} />

                            <button
                              onClick={() => confirmarEliminar(examen.id, examen.nombre)}
                              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 text-red-500 transition-colors ${
                                darkMode ? "hover:bg-red-500/10" : "hover:bg-red-50"
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                              Eliminar
                            </button>
                          </div>
                        </>,
                        document.body
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </ScrollReveal>
            );
          })
        )}
      </div>

      <ConfirmModal
        {...modal}
        darkMode={darkMode}
        onCancelar={modal.onCancelar || cerrarModal}
      />

      {exportModal && (
        <ExportPDFModal
          examen={exportModal}
          darkMode={darkMode}
          onClose={() => setExportModal(null)}
        />
      )}
    </div>
  );
}