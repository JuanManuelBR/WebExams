// src/components/ListaExamenes.tsx
import { useState, useEffect } from "react";
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
} from "lucide-react";
import {
  examsService,
  obtenerUsuarioActual,
  type ExamenCreado,
} from "../services/examsService";
import ModalConfirmacion from "../components/ModalConfirmacion";

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

  const [codigoCopiado, setCodigoCopiado] = useState<string | null>(null);
  const [urlCopiada, setUrlCopiada] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
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

  const [modal, setModal] = useState<{ visible: boolean; tipo: "exito" | "error" | "advertencia" | "info" | "confirmar"; titulo: string; mensaje: string; onConfirmar: () => void; onCancelar?: () => void }>({ visible: false, tipo: "info", titulo: "", mensaje: "", onConfirmar: () => {} });
  const mostrarModal = (tipo: "exito" | "error" | "advertencia" | "info" | "confirmar", titulo: string, mensaje: string, onConfirmar: () => void, onCancelar?: () => void) => setModal({ visible: true, tipo, titulo, mensaje, onConfirmar, onCancelar });
  const cerrarModal = () => setModal(prev => ({ ...prev, visible: false }));

  useEffect(() => {
    cargarExamenes();
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

      console.log("📚 [LISTA] Cargando exámenes...");
      const data = await examsService.obtenerMisExamenes(usuario.id);

      const examenesConEstado = data.map((ex) => ({
        ...ex,
        activoManual: ex.estado === "open",
        archivado: false,
      }));

      setExamenes(examenesConEstado);
      console.log("✅ [LISTA] Exámenes cargados:", examenesConEstado.length);
    } catch (error: any) {
      console.error("❌ [LISTA] Error:", error);
      setError(error.message || "Error al cargar los exámenes");
    } finally {
      setCargando(false);
    }
  };

  // CAMBIO: Eliminamos el reordenamiento automático por estado
  // Solo ordenamos por archivado/no archivado
  const ordenarExamenes = (exams: ExamenConEstado[]) => {
    return [...exams].sort((a, b) => {
      // Solo ordenar por archivado
      if (a.archivado !== b.archivado) return a.archivado ? 1 : -1;
      // Mantener el orden original (por ID o fecha de creación)
      return 0;
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

  const regenerarCodigo = (codigoActual: string) => {
    console.warn("⚠️ Regenerar código no implementado en el backend");
    mostrarModal("info", "Próximamente", "Esta funcionalidad estará disponible próximamente", cerrarModal);
  };

  const copiarEnlaceExamen = (codigo: string) => {
    const url = `${window.location.origin}/acceso-examen?code=${encodeURIComponent(codigo)}`;
    navigator.clipboard.writeText(url).then(() => {
      setUrlCopiada(codigo);
      setTimeout(() => setUrlCopiada(null), 2000);
    });
  };

  const archivarExamen = (examen: ExamenConEstado) => {
    const confirmarArchivo = () => {
      setExamenes((prev) =>
        prev.map((ex) =>
          ex.codigoExamen === examen.codigoExamen
            ? { ...ex, archivado: true, activoManual: false, estado: "closed" }
            : ex,
        ),
      );
      cerrarModal();
    };

    if (examen.activoManual) {
      mostrarModal("advertencia", "Archivar examen", "Al archivar este examen se inhabilitará automáticamente. ¿Deseas continuar?", confirmarArchivo, cerrarModal);
    } else {
      confirmarArchivo();
    }
    setMenuAbierto(null);
  };

  const desarchivarExamen = (codigo: string) => {
    setExamenes((prev) =>
      prev.map((ex) =>
        ex.codigoExamen === codigo
          ? { ...ex, archivado: false, activoManual: true }
          : ex,
      ),
    );
    setMenuAbierto(null);
  };

  const compartirExamen = async (examen: ExamenConEstado) => {
    setModalCompartir(examen);
    setMenuAbierto(null);
  };

  const enviarExamenPorCorreo = () => {
    if (!correoDestino.trim()) {
      mostrarModal("advertencia", "Campo requerido", "Por favor ingresa un correo electrónico", cerrarModal);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correoDestino)) {
      mostrarModal("advertencia", "Correo inválido", "Por favor ingresa un correo electrónico válido", cerrarModal);
      return;
    }

    console.log("📧 Enviando examen a:", correoDestino);

    setCompartiendoExito(true);
    setTimeout(() => {
      setCompartiendoExito(false);
      setModalCompartir(null);
      setCorreoDestino("");
    }, 2000);
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

        console.log("🗑️ [LISTA] Eliminando examen...");
        const success = await examsService.eliminarExamen(id, usuario.id);

        if (success) {
          setExamenes((prev) => prev.filter((ex) => ex.id !== id));
          console.log("✅ [LISTA] Examen eliminado");
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

  const obtenerEmojiTipo = (tipo: string) => {
    switch (tipo) {
      case "pdf":
        return "📄";
      case "automatico":
        return "🤖";
      default:
        return "🤖";
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2
            className={`w-12 h-12 animate-spin mx-auto mb-4 ${
              darkMode ? "text-teal-500" : "text-slate-700"
            }`}
          />
          <p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Cargando exámenes...
          </p>
        </div>
      </div>
    );
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
          }}
        >
          <div
            className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-2xl p-8 max-w-lg w-full relative shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setModalCompartir(null);
                setCorreoDestino("");
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
                      onChange={(e) => setCorreoDestino(e.target.value)}
                      placeholder="profesor@ejemplo.com"
                      className={`w-full px-4 py-3 rounded-lg border outline-none transition-all ${
                        darkMode
                          ? "bg-slate-800 border-slate-700 text-white placeholder-gray-500 focus:border-blue-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500"
                      }`}
                    />
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

      {codigoGrande && (
        <div
          className="fixed top-0 left-0 w-screen h-screen bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-8 overflow-hidden animate-in fade-in duration-200"
          onClick={() => setCodigoGrande(null)}
        >
          <div
            className={`${darkMode ? "bg-slate-900" : "bg-white"} rounded-3xl p-12 max-w-4xl w-full relative shadow-2xl overflow-hidden scale-100`}
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
              <code className="text-8xl font-bold font-mono text-teal-500 mt-8 block">
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
          examenesAMostrar.map((examen) => {
            const estado = obtenerEstadoExamen(examen);
            const isInactive = !examen.activoManual || examen.archivado;
            const isMenuOpen = menuAbierto === examen.codigoExamen;
            const tipoExamen = obtenerTipoExamen(examen);

            return (
              <div
                key={examen.id}
                className={`group rounded-2xl p-5 border transition-all duration-300 ${
                  isMenuOpen ? "z-50 relative shadow-xl" : "z-0 relative"
                } ${
                  isInactive
                    ? darkMode
                      ? "bg-slate-800/50 border-slate-700/50"
                      : "bg-gray-100/70 border-gray-200/70"
                    : darkMode
                      ? "bg-slate-900/80 border-slate-700/50 hover:bg-slate-900"
                      : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-5">
                  <div
                    className={`flex-1 flex items-center gap-5 transition-opacity duration-300 ${
                      isInactive ? "opacity-50" : "opacity-100"
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
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
                          className={`font-bold text-lg truncate ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {examen.nombre}
                        </h3>
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
                      <div className="flex items-center gap-3 text-xs opacity-80">
                        <span
                          className={`flex items-center gap-1.5 ${
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
                          {obtenerEmojiTipo(tipoExamen)}{" "}
                          {tipoExamen.charAt(0).toUpperCase() +
                            tipoExamen.slice(1)}
                        </span>
                        {examen.questions && (
                          <span
                            className={`flex items-center gap-1.5 ${
                              darkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            📝 {examen.questions.length} preguntas
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isInactive)
                            copiarSoloCodigo(examen.codigoExamen);
                        }}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-base font-mono font-bold transition-all duration-200 shadow-sm ${
                          codigoCopiado === examen.codigoExamen
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : isInactive
                              ? darkMode
                                ? "bg-slate-800/50 border-slate-700/50 text-slate-500"
                                : "bg-gray-200/50 border-gray-300/50 text-gray-400"
                              : darkMode
                                ? "bg-[#2D3E52] border-slate-600 text-teal-400 hover:border-teal-500 cursor-pointer active:scale-95"
                                : "bg-white border-gray-300 text-gray-900 hover:border-teal-500 cursor-pointer active:scale-95"
                        }`}
                        title={isInactive ? "" : "Clic para copiar código"}
                      >
                        {codigoCopiado === examen.codigoExamen ? (
                          <span className="flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-white" /> Copiado
                          </span>
                        ) : (
                          <>
                            <span>{examen.codigoExamen}</span>
                            {!isInactive && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  regenerarCodigo(examen.codigoExamen);
                                }}
                                className={`p-1 -mr-1 rounded-md transition-all duration-150 ${
                                  darkMode
                                    ? "hover:bg-white/10 text-teal-500/70 hover:text-teal-300"
                                    : "hover:bg-black/5 text-gray-400 hover:text-gray-700"
                                }`}
                                title="Regenerar código"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isInactive)
                              copiarEnlaceExamen(examen.codigoExamen);
                          }}
                          className={`p-1.5 rounded-lg transition-all duration-150 ${
                            urlCopiada === examen.codigoExamen
                              ? "bg-emerald-500 text-white"
                              : isInactive
                                ? ""
                                : darkMode
                                  ? "hover:bg-white/10 active:scale-90 text-gray-300"
                                  : "hover:bg-black/5 active:scale-90 text-gray-600"
                          }`}
                          title={isInactive ? "" : "Copiar link del examen"}
                        >
                          {urlCopiada === examen.codigoExamen ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Link
                              className={`w-4 h-4 ${isInactive ? (darkMode ? "text-slate-600" : "text-gray-400") : ""}`}
                            />
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isInactive)
                              setCodigoGrande({
                                codigo: examen.codigoExamen,
                                nombre: examen.nombre,
                              });
                          }}
                          className={`p-1.5 rounded-lg transition-all duration-150 ${
                            isInactive
                              ? ""
                              : darkMode
                                ? "hover:bg-white/10 active:scale-90 text-gray-300"
                                : "hover:bg-black/5 active:scale-90 text-gray-600"
                          }`}
                          title={isInactive ? "" : "Ver código grande"}
                        >
                          <Search
                            className={`w-4 h-4 ${isInactive ? (darkMode ? "text-slate-600" : "text-gray-400") : ""}`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/ver-examen", {
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

                      <div className="flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (examen.activoManual) return;
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
                    className={`flex items-center gap-3 pl-3 border-l ${darkMode ? "border-slate-700" : "border-gray-200"}`}
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

                    <div className="relative z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuAbierto(
                            isMenuOpen ? null : examen.codigoExamen,
                          );
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${darkMode ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                      >
                        <MoreVertical
                          className={`w-5 h-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                        />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMenuAbierto(null)}
                          />

                          <div
                            className={`absolute right-0 top-full mt-2 w-44 rounded-xl shadow-2xl border z-50 py-1.5 ${
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

                            {examen.archivado ? (
                              <button
                                onClick={() =>
                                  desarchivarExamen(examen.codigoExamen)
                                }
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
                                onClick={() =>
                                  archivarExamen(examen)
                                }
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

                            <div
                              className={`my-1 h-px ${darkMode ? "bg-slate-700" : "bg-gray-200"}`}
                            />

                            <button
                              onClick={() =>
                                confirmarEliminar(examen.id, examen.nombre)
                              }
                              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 text-red-500 transition-colors ${
                                darkMode
                                  ? "hover:bg-red-500/10"
                                  : "hover:bg-red-50"
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

      <ModalConfirmacion
        {...modal}
        darkMode={darkMode}
        onCancelar={modal.onCancelar || cerrarModal}
      />
    </div>
  );
}