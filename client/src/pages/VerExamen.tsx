import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, ExternalLink } from "lucide-react";
import ExamPanel from "./ExamenPreguntas";
import { useMemo, useState } from "react";

interface VerExamenProps {
  darkMode: boolean;
}

export default function VerExamen({ darkMode }: VerExamenProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, any>>({});
  
  // Recuperamos el examen pasado por el estado de navegación
  const examenOriginal = location.state?.examen;

  // Detectar si es un examen PDF
  const isPdf = Boolean(examenOriginal?.archivoPDF);
  const pdfUrl = useMemo(() => {
    if (!isPdf || !examenOriginal.archivoPDF) return null;
    if (examenOriginal.archivoPDF.startsWith('http') || examenOriginal.archivoPDF.startsWith('data:')) {
      return examenOriginal.archivoPDF;
    }
    return `http://localhost:3001/api/pdfs/${examenOriginal.archivoPDF}`;
  }, [examenOriginal, isPdf]);

  // Transformar datos del formato de edición al formato de visualización (ExamPanel)
  const examData = useMemo(() => {
    // Si no hay examen real, usamos un objeto base para mostrar solo los ejemplos
    const baseExamen = examenOriginal || {
      nombre: "Vista Previa de Examen",
      descripcionExamen: "Este es un ejemplo de cómo se verá el examen.",
      questions: []
    };

    // 1. Mapear preguntas existentes del examen real
    const mappedQuestions = (baseExamen.questions || []).map((p: any, index: number) => {
      let type: "open" | "test" | "fill_blanks" | "match" = "open";
      let textoCorrecto = undefined;
      let pares = undefined;

      // Mapeo de tipos de 'CrearPreguntas' a 'ExamenPreguntas'
      if (p.tipo === 'seleccion-multiple') type = 'test';
      else if (p.tipo === 'rellenar-espacios') {
        type = 'fill_blanks';
        // Generar texto con huecos visuales (___) basado en las palabras seleccionadas
        if (p.textoCompleto) {
           const palabras = p.textoCompleto.split(/\s+/);
           textoCorrecto = palabras.map((palabra: string, idx: number) => {
             const seleccionada = p.palabrasSeleccionadas?.find((ps: any) => ps.indice === idx);
             return seleccionada ? "___" : palabra;
           }).join(" ");
        }
      }
      else if (p.tipo === 'conectar') {
        type = 'match';
        pares = p.paresConexion?.map((par: any, idx: number) => ({
          id: idx,
          itemA: { id: idx, text: par.izquierda },
          itemB: { id: idx, text: par.derecha }
        }));
      }
      else if (p.tipo === 'abierta') type = 'open';

      return {
        id: parseInt(p.id) || index + 1000, // Asegurar ID numérico
        enunciado: p.titulo || "Pregunta sin título",
        puntaje: p.puntos || 1,
        nombreImagen: p.imagen,
        type,
        options: p.opciones?.map((op: any) => ({ id: parseInt(op.id) || Math.random(), texto: op.texto })),
        textoCorrecto,
        pares
      };
    });

    // 2. Agregar Datos Dummy (1 de cada tipo) para visualización
    const dummyQuestions = [
      {
        id: 9001,
        enunciado: "Ejemplo: Pregunta de Selección Múltiple. ¿Cuál es la capital de Francia?",
        puntaje: 5,
        type: "test" as const,
        options: [
          { id: 1, texto: "Madrid" },
          { id: 2, texto: "París" },
          { id: 3, texto: "Londres" },
          { id: 4, texto: "Berlín" }
        ]
      },
      {
        id: 9002,
        enunciado: "Ejemplo: Rellenar Espacios. Completa la frase célebre.",
        puntaje: 10,
        type: "fill_blanks" as const,
        textoCorrecto: "Pienso, luego ___ ."
      },
      {
        id: 9003,
        enunciado: "Ejemplo: Conectar columnas. Relaciona el animal con su sonido.",
        puntaje: 8,
        type: "match" as const,
        pares: [
          { id: 1, itemA: { id: 1, text: "Perro" }, itemB: { id: 1, text: "Ladra" } },
          { id: 2, itemA: { id: 2, text: "Gato" }, itemB: { id: 2, text: "Maulla" } },
          { id: 3, itemA: { id: 3, text: "Vaca" }, itemB: { id: 3, text: "Muge" } }
        ]
      },
      {
        id: 9004,
        enunciado: "Ejemplo: Pregunta Abierta. Explique brevemente el ciclo del agua.",
        puntaje: 15,
        type: "open" as const
      }
    ];

    return {
      nombre: baseExamen.nombre,
      nombreProfesor: "Vista Previa Docente",
      limiteTiempo: baseExamen.limiteTiempo?.valor || 60,
      descripcion: baseExamen.descripcionExamen || "Esta es una vista previa del examen tal como lo verán los estudiantes.",
      questions: [...mappedQuestions, ...dummyQuestions]
    };
  }, [examenOriginal]);

  const handleAnswerChange = (preguntaId: number, respuesta: any) => {
    setAnswers(prev => ({
      ...prev,
      [preguntaId]: respuesta
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
      <div className={`flex items-center gap-4 p-4 mb-4 rounded-xl border shadow-sm ${darkMode ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"}`}>
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
          <h1 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
            Vista Previa: {examData.nombre}
          </h1>
        </div>
      </div>

      {/* Panel del Examen (Reutilizando el componente del estudiante o Visor PDF) */}
      <div className={`flex-1 overflow-hidden rounded-xl border shadow-sm ${darkMode ? "border-slate-700" : "border-gray-200"}`}>
        {isPdf ? (
          <div className={`w-full h-full flex flex-col ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
            <div className={`px-4 py-3 border-b flex justify-between items-center ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-2">
                <FileText className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Documento del examen (PDF)
                </span>
              </div>
              {pdfUrl && (
                <a 
                  href={pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 text-sm font-medium hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
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
                  <p className={darkMode ? "text-gray-400" : "text-gray-600"}>No se pudo cargar el archivo PDF.</p>
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
