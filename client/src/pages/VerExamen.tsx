import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, ExternalLink } from "lucide-react";
import ExamPanel from "./ExamenPreguntas";
import { useEffect, useMemo, useState } from "react";
import { examsApi } from "../services/examsApi";
import { obtenerUsuarioActual } from "../services/examsService";

interface VerExamenProps {
  darkMode: boolean;
}

export default function VerExamen({ darkMode }: VerExamenProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [examenCompleto, setExamenCompleto] = useState<any>(null);
  const [cargando, setCargando] = useState(false);

  // Examen básico pasado por navegación (puede tener pares sin cargar)
  const examenOriginal = location.state?.examen;

  // Fetch del examen completo con todas las relaciones (pares, options, etc.)
  useEffect(() => {
    if (!examenOriginal?.id) return;
    setCargando(true);
    examsApi
      .get(`/by-id/${examenOriginal.id}`, { withCredentials: true })
      .then((res) => setExamenCompleto(res.data))
      .catch(() => setExamenCompleto(null))
      .finally(() => setCargando(false));
  }, [examenOriginal?.id]);

  // Usar el examen completo si ya cargó, sino el original del state
  const examenEfectivo = examenCompleto ?? examenOriginal;

  // Detectar si es un examen PDF
  const isPdf = Boolean(examenEfectivo?.archivoPDF);
  const pdfUrl = useMemo(() => {
    if (!isPdf || !examenEfectivo?.archivoPDF) return null;
    const examsUrl = import.meta.env.VITE_EXAMS_BASE || "http://localhost:3001";
    if (examenEfectivo.archivoPDF.startsWith("http")) {
      return `${examsUrl}/api/pdfs/proxy?url=${encodeURIComponent(examenEfectivo.archivoPDF)}`;
    }
    return `${examsUrl}/api/pdfs/${examenEfectivo.archivoPDF}`;
  }, [examenEfectivo, isPdf]);

  // Transformar datos del formato de edición al formato de visualización (ExamPanel)
  const examData = useMemo(() => {
    // Si no hay examen real, usamos un objeto base para mostrar solo los ejemplos
    const baseExamen = examenEfectivo || {
      nombre: "Vista Previa de Examen",
      descripcionExamen: "Este es un ejemplo de cómo se verá el examen.",
      questions: [],
    };

    // 1. Mapear preguntas existentes del examen real
    const mappedQuestions = (baseExamen.questions || []).map(
      (p: any, index: number) => {
        // Detectar formato: backend usa p.type (inglés), creación usa p.tipo (español)
        const isBackendFormat = p.type !== undefined;

        let type: "open" | "test" | "fill_blanks" | "match" = "open";

        if (isBackendFormat) {
          // Formato backend: type ya es el valor correcto ("test","fill_blanks","match","open")
          type = p.type;
        } else {
          // Formato creación: mapear tipo español al tipo inglés
          if (p.tipo === "seleccion-multiple") type = "test";
          else if (p.tipo === "rellenar-espacios") type = "fill_blanks";
          else if (p.tipo === "conectar") type = "match";
          else if (p.tipo === "abierta") type = "open";
        }

        // textoCorrecto: backend lo tiene como campo directo; creación lo construye
        let textoCorrecto: string | undefined;
        if (isBackendFormat) {
          textoCorrecto = p.textoCorrecto;
        } else if (p.textoCompleto) {
          const palabras = p.textoCompleto.split(/\s+/);
          textoCorrecto = palabras
            .map((palabra: string, idx: number) => {
              const seleccionada = p.palabrasSeleccionadas?.find(
                (ps: any) => ps.indice === idx,
              );
              return seleccionada ? "___" : palabra;
            })
            .join(" ");
        }

        // pares: backend tiene { itemA: { id, text }, itemB: { id, text } }
        // creación tiene paresConexion[].izquierda / .derecha
        let pares: any[] | undefined;
        if (isBackendFormat && p.pares?.length) {
          pares = p.pares;
        } else if (p.paresConexion?.length) {
          pares = p.paresConexion.map((par: any, idx: number) => ({
            id: idx,
            itemA: { id: idx, text: par.izquierda },
            itemB: { id: idx, text: par.derecha },
          }));
        }

        // options: backend usa p.options[].texto; creación usa p.opciones[].texto
        const rawOptions = isBackendFormat ? p.options : p.opciones;
        const options = rawOptions?.map((op: any) => ({
          id: parseInt(op.id) || Math.random(),
          texto: op.texto,
        }));

        return {
          id: parseInt(p.id) || index + 1000,
          enunciado: isBackendFormat ? p.enunciado : (p.titulo || "Pregunta sin título"),
          puntaje: isBackendFormat ? p.puntaje : (p.puntos || 1),
          nombreImagen: p.nombreImagen || p.imagen,
          type,
          options,
          textoCorrecto,
          pares,
        };
      },
    );

    const usuario = obtenerUsuarioActual();
    const nombreProfesor = usuario
      ? `${usuario.nombre} ${usuario.apellido}`.trim()
      : "Docente";

    return {
      nombre: baseExamen.nombre,
      nombreProfesor,
      limiteTiempo: baseExamen.limiteTiempo ?? baseExamen.limiteTiempo?.valor ?? null,
      descripcion:
        baseExamen.descripcion ||
        baseExamen.descripcionExamen ||
        "",
      questions: mappedQuestions,
    };
  }, [examenEfectivo]);

  const handleAnswerChange = (preguntaId: number, respuesta: any) => {
    setAnswers((prev) => ({
      ...prev,
      [preguntaId]: respuesta,
    }));
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full">
      {/* Estilos de Scrollbar personalizados (Sincronizados con CrearExamen) */}
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
        `
        }
      `}</style>

      {/* Cabecera simple de navegación */}
      <div
        className={`flex items-center gap-4 p-4 mb-4 rounded-xl border shadow-sm ${darkMode ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"}`}
      >
        <button
          onClick={() => navigate("/lista-examenes")}
          className={`p-2 rounded-lg transition-colors ${
            darkMode
              ? "hover:bg-slate-800 text-gray-400 hover:text-white"
              : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
          }`}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1
            className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
          >
            Vista Previa: {examData.nombre}
          </h1>
          {cargando && (
            <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Cargando preguntas completas...
            </p>
          )}
        </div>
      </div>

      {/* Panel del Examen (Reutilizando el componente del estudiante o Visor PDF) */}
      <div
        className={`flex-1 overflow-hidden rounded-xl border shadow-sm ${darkMode ? "border-slate-700" : "border-gray-200"}`}
      >
        {isPdf ? (
          <div
            className={`w-full h-full flex flex-col ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}
          >
            <div
              className={`px-4 py-3 border-b flex justify-between items-center ${darkMode ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"}`}
            >
              <div className="flex items-center gap-2">
                <FileText
                  className={`w-4 h-4 ${darkMode ? "text-blue-400" : "text-blue-600"}`}
                />
                <span
                  className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  Documento del examen (PDF)
                </span>
              </div>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 text-sm font-medium hover:underline ${darkMode ? "text-blue-400" : "text-blue-600"}`}
                >
                  <span>Abrir en nueva pestaña</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <div className="flex-1 relative bg-gray-200/50">
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  className="absolute inset-0 w-full h-full"
                  title="Vista previa PDF"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                    No se pudo cargar el archivo PDF.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <ExamPanel
            examData={examData}
            darkMode={darkMode}
            answers={answers}
            onAnswerChange={handleAnswerChange}
          />
        )}
      </div>
    </div>
  );
}
