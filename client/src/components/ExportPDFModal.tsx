import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, FileText, CheckSquare, Square, Loader2, FileDown } from "lucide-react";
import { examsService, obtenerUsuarioActual, type ExamenCreado } from "../services/examsService";
import { generateExamPDF } from "../utils/generateExamPDF";

const EXAMS_API_URL = import.meta.env.VITE_EXAMS_URL || window.location.origin;

interface ExportarPDFModalProps {
  examen: ExamenCreado & { archivado?: boolean };
  darkMode: boolean;
  onClose: () => void;
}

export default function ExportarPDFModal({ examen, darkMode, onClose }: ExportarPDFModalProps) {
  const [incluirRespuestas, setIncluirRespuestas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPDF = !!examen.archivoPDF;

  const handleDownloadPDF = async () => {
    setLoading(true);
    setError(null);
    try {
      const pdfUrl = examen.archivoPDF!.startsWith("http")
        ? examen.archivoPDF!
        : `${EXAMS_API_URL}/api/exams/pdf/${examen.archivoPDF}`;
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${examen.nombre}.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      onClose();
    } catch {
      setError("Error al descargar el PDF. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    setError(null);
    setLoading(true);
    try {
      const fullExam = await examsService.getExamById(examen.id);
      const usuario = obtenerUsuarioActual();
      const profesorName = usuario ? `${usuario.nombre} ${usuario.apellido}` : "Profesor";
      await generateExamPDF(fullExam, incluirRespuestas, profesorName);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error al generar el PDF. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 anim-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl border transition-colors anim-scaleIn ${
        darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? "border-slate-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${darkMode ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-600"}`}>
              <FileDown className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`font-bold text-sm ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
                Exportar a PDF
              </h2>
              <p className={`text-xs truncate max-w-[240px] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                {examen.nombre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-slate-500"}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {isPDF ? (
            /* ── PDF exam ──────────────────────────────────── */
            <div className="flex flex-col gap-4">
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${darkMode ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-700"}`}>
                <FileText className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm leading-relaxed">
                  <p className="font-semibold mb-1">Examen con archivo PDF adjunto</p>
                  <p className={darkMode ? "text-indigo-400" : "text-indigo-600"}>
                    Se descargará el PDF original que fue subido al crear el examen.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* ── Manual exam ───────────────────────────────── */
            <div className="flex flex-col gap-4">
              <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                Se generará un documento PDF con todas las preguntas del examen.
              </p>

              {/* Toggle: incluir respuestas */}
              <button
                onClick={() => setIncluirRespuestas(!incluirRespuestas)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  incluirRespuestas
                    ? darkMode
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : darkMode
                      ? "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700"
                      : "bg-gray-50 border-gray-200 text-slate-600 hover:bg-gray-100"
                }`}
              >
                {incluirRespuestas
                  ? <CheckSquare className="w-5 h-5 flex-shrink-0" />
                  : <Square className="w-5 h-5 flex-shrink-0" />
                }
                <div className="text-left">
                  <p className="font-semibold text-sm">Incluir respuestas correctas</p>
                  <p className={`text-xs mt-0.5 ${
                    incluirRespuestas
                      ? darkMode ? "text-emerald-400" : "text-emerald-600"
                      : darkMode ? "text-slate-500" : "text-slate-400"
                  }`}>
                    {incluirRespuestas
                      ? "El PDF mostrará las opciones correctas, palabras clave y conexiones"
                      : "El PDF mostrará solo las preguntas y sus opciones sin marcar"}
                  </p>
                </div>
              </button>

              {error && (
                <div className={`p-3 rounded-lg border text-sm ${darkMode ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-2 px-5 py-4 border-t ${darkMode ? "border-slate-700" : "border-gray-200"}`}>
          <button
            onClick={onClose}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              darkMode ? "text-slate-400 hover:bg-slate-700 hover:text-slate-200" : "text-slate-600 hover:bg-gray-100"
            }`}
          >
            Cancelar
          </button>

          {isPDF ? (
            <button
              onClick={handleDownloadPDF}
              disabled={loading}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-colors shadow-sm ${
                loading ? "bg-indigo-400 text-white cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {loading ? "Descargando..." : "Descargar PDF"}
            </button>
          ) : (
            <button
              onClick={handleGeneratePDF}
              disabled={loading}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all shadow-sm ${
                loading
                  ? (darkMode ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-gray-200 text-gray-400 cursor-not-allowed")
                  : "bg-teal-600 hover:bg-teal-500 text-white"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Generar PDF
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
