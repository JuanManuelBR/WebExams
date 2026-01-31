import React, { useState, useEffect, useRef, useCallback } from "react";

// --- TIPOS E INTERFACES ---
interface Question {
  id: number;
  enunciado: string;
  puntaje: number;
  nombreImagen?: string;
  type: "open" | "test" | "fill_blanks" | "match";
  options?: Array<{ id: number; texto: string }>;
  textoCorrecto?: string;
  pares?: Array<{
    id: number;
    itemA: { id: number; text: string };
    itemB: { id: number; text: string };
  }>;
}

interface ExamData {
  nombre: string;
  nombreProfesor: string;
  limiteTiempo: number;
  descripcion: string;
  questions: Question[];
}

interface ExamPanelProps {
  examData: ExamData | null;
  darkMode: boolean;
  answers: Record<number, any>;
  onAnswerChange: (preguntaId: number, respuesta: any, delayMs?: number) => void;
}

// --- CONSTANTES DE COLOR ---
const QUESTION_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-purple-500 to-fuchsia-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-yellow-500 to-amber-600",
];

const PAIR_COLORS = [
  { border: "border-blue-500", darkBorder: "border-blue-400", bg: "bg-blue-50", darkBg: "bg-blue-900/20", text: "text-blue-700", darkText: "text-blue-300", stroke: "text-blue-500", darkStroke: "text-blue-400", fill: "fill-blue-600", darkFill: "fill-blue-400" },
  { border: "border-emerald-500", darkBorder: "border-emerald-400", bg: "bg-emerald-50", darkBg: "bg-emerald-900/20", text: "text-emerald-700", darkText: "text-emerald-300", stroke: "text-emerald-500", darkStroke: "text-emerald-400", fill: "fill-emerald-600", darkFill: "fill-emerald-400" },
  { border: "border-purple-500", darkBorder: "border-purple-400", bg: "bg-purple-50", darkBg: "bg-purple-900/20", text: "text-purple-700", darkText: "text-purple-300", stroke: "text-purple-500", darkStroke: "text-purple-400", fill: "fill-purple-600", darkFill: "fill-purple-400" },
  { border: "border-orange-500", darkBorder: "border-orange-400", bg: "bg-orange-50", darkBg: "bg-orange-900/20", text: "text-orange-700", darkText: "text-orange-300", stroke: "text-orange-500", darkStroke: "text-orange-400", fill: "fill-orange-600", darkFill: "fill-orange-400" },
  { border: "border-pink-500", darkBorder: "border-pink-400", bg: "bg-pink-50", darkBg: "bg-pink-900/20", text: "text-pink-700", darkText: "text-pink-300", stroke: "text-pink-500", darkStroke: "text-pink-400", fill: "fill-pink-600", darkFill: "fill-pink-400" },
  { border: "border-cyan-500", darkBorder: "border-cyan-400", bg: "bg-cyan-50", darkBg: "bg-cyan-900/20", text: "text-cyan-700", darkText: "text-cyan-300", stroke: "text-cyan-500", darkStroke: "text-cyan-400", fill: "fill-cyan-600", darkFill: "fill-cyan-400" },
];

// Función auxiliar para obtener color pseudo-aleatorio consistente basado en ID
const getStableColor = (id: number, colors: any[]) => {
  // Usamos un multiplicador primo (37) para dispersar la selección y evitar patrones obvios
  return colors[(id * 37) % colors.length];
};

// --- COMPONENTE PRINCIPAL ---
export default function ExamPanel({
  examData,
  darkMode,
  answers,
  onAnswerChange,
}: ExamPanelProps) {
  return (
    <div className="h-full w-full">
      <div className={`h-full overflow-auto transition-colors duration-300 ${darkMode ? "bg-slate-900 text-gray-100" : "bg-white text-gray-900"}`}>
        
        {!examData ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className={`text-xl font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Cargando examen...
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto p-6 md:p-10">
            {/* Header del Examen */}
            <header className={`mb-10 border-b pb-8 ${darkMode ? "border-slate-700" : "border-gray-200"}`}>
              <h1 className={`text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r mb-3 tracking-tight ${darkMode ? "from-blue-400 to-teal-400" : "from-blue-500 to-teal-500"}`}>
                {examData.nombre}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-sm md:text-base">
                <div className={`flex items-center gap-2 font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {examData.nombreProfesor}
                </div>
                <div className={`flex items-center gap-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {examData.limiteTiempo || 0} minutos
                </div>
              </div>

              {/* Descripción */}
              {examData.descripcion && (
                <div className={`mt-6 p-5 rounded-xl border shadow-sm ${darkMode ? "bg-slate-800/50 border-slate-800" : "bg-white border-gray-200"}`}>
                  <h4 className={`text-sm font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-teal-500" : "text-teal-600"}`}>
                    Instrucciones
                  </h4>
                  <div
                    className={`prose max-w-none font-serif leading-relaxed opacity-90 ${darkMode ? "prose-invert" : "prose-slate"}`}
                    dangerouslySetInnerHTML={{ __html: examData.descripcion }}
                  />
                </div>
              )}
            </header>

            {/* Lista de Preguntas */}
            <div className="space-y-12">
              {examData.questions?.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  answer={answers[question.id]}
                  onAnswerChange={onAnswerChange}
                  darkMode={darkMode}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- TARJETA DE PREGUNTA GENÉRICA ---
function QuestionCard({
  question,
  index,
  answer,
  onAnswerChange,
  darkMode,
}: {
  question: Question;
  index: number;
  answer: any;
  onAnswerChange: (id: number, val: any, delay?: number) => void;
  darkMode: boolean;
}) {
  // Seleccionamos un color basado en el índice de la pregunta
  const barColor = getStableColor(question.id, QUESTION_COLORS);

  // Verificar si la pregunta tiene respuesta
  const isAnswered = React.useMemo(() => {
    if (answer === undefined || answer === null) return false;
    if (Array.isArray(answer)) return answer.length > 0; // Para test, match, fill_blanks
    if (typeof answer === 'string') return answer.trim().length > 0; // Para open
    return false;
  }, [answer]);

  return (
    <div className={`group relative rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${darkMode ? "bg-slate-800/60 border-slate-800 hover:border-blue-700/80" : "bg-white border-gray-200 hover:shadow-lg hover:border-blue-300"}`}>
      {/* Barra lateral de estado (decorativa) con color dinámico */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${barColor}`}></div>

      <div className="p-6 md:p-8 pl-8 md:pl-10">
        {/* Encabezado de la Pregunta */}
        <div className="flex items-start gap-4 mb-6">
          <span className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm shrink-0 transition-all duration-300 ${
            isAnswered 
              ? (darkMode ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50" : "bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200")
              : (darkMode ? "bg-slate-700 text-slate-300" : "bg-white text-slate-600")
          }`}>
            {isAnswered ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              index + 1
            )}
          </span>
          <div className="flex-1">
            <h3 className={`text-xl font-medium font-serif leading-snug ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
              {question.enunciado}
            </h3>
            <span className={`inline-block mt-2 text-xs font-semibold px-2 py-1 rounded ${darkMode ? "bg-slate-700/50 text-slate-400" : "bg-white text-slate-500"}`}>
              {question.puntaje} {question.puntaje === 1 ? "punto" : "puntos"}
            </span>
          </div>
        </div>

        {/* Imagen Opcional */}
        {question.nombreImagen && (
          <div className={`mb-6 rounded-xl overflow-hidden border flex justify-center p-4 ${darkMode ? "bg-slate-900/50 border-slate-700" : "bg-white border-gray-200"}`}>
            <img
              src={`http://localhost:3001/api/images/${question.nombreImagen}`}
              alt="Referencia visual"
              className="max-h-80 object-contain rounded-lg shadow-sm"
            />
          </div>
        )}

        {/* Cuerpo de la pregunta según tipo */}
        <div className="mt-4">
          {question.type === "open" && (
            <OpenQuestion question={question} answer={answer} onChange={onAnswerChange} darkMode={darkMode} />
          )}
          {question.type === "test" && (
            <TestQuestion question={question} answer={answer} onChange={onAnswerChange} darkMode={darkMode} />
          )}
          {question.type === "fill_blanks" && (
            <FillBlanksQuestion question={question} answer={answer} onChange={onAnswerChange} darkMode={darkMode} />
          )}
          {question.type === "match" && (
            <MatchQuestion question={question} answer={answer} onChange={onAnswerChange} darkMode={darkMode} />
          )}
        </div>
      </div>
    </div>
  );
}

// --- TIPOS DE PREGUNTAS ---

// 1. Pregunta Abierta
function OpenQuestion({ question, answer, onChange, darkMode }: any) {
  const maxLength = 1000;
  const currentLength = (answer || "").length;

  return (
    <div className="relative">
      <textarea
        value={answer || ""}
        onChange={(e) => onChange(question.id, e.target.value, 3000)}
        maxLength={maxLength}
        className={`w-full min-h-[140px] p-4 rounded-xl border-2 outline-none transition-all resize-y placeholder-slate-400 ${darkMode ? "bg-slate-800/70 border-slate-700 focus:border-blue-500 focus:bg-slate-800 text-slate-200" : "bg-gray-50 border-gray-200 focus:border-blue-500 focus:bg-white text-slate-700"}`}
        placeholder="Escribe tu respuesta detallada aquí..."
      />
      <div className="absolute bottom-3 right-3 pointer-events-none">
        <span className={`text-xs font-medium ${currentLength >= maxLength ? "text-red-500" : "text-slate-400"}`}>
          {currentLength}/{maxLength}
        </span>
      </div>
    </div>
  );
}

// 2. Pregunta Test (Selección Múltiple)
function TestQuestion({ question, answer, onChange, darkMode }: any) {
  const selectedOptions = answer || [];

  return (
    <div className="grid grid-cols-1 gap-3">
      {question.options?.map((option: any) => {
        const isSelected = selectedOptions.includes(option.id);
        return (
          <label
            key={option.id}
            className={`
              flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group
              ${
                isSelected
                  ? (darkMode ? "border-blue-500 bg-blue-900/30" : "border-blue-500 bg-blue-50")
                  : (darkMode ? "border-slate-700 hover:border-blue-600 hover:bg-blue-900/10" : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/50")
              }
            `}
          >
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  const newSelected = e.target.checked
                    ? [...selectedOptions, option.id]
                    : selectedOptions.filter((id: number) => id !== option.id);
                  onChange(question.id, newSelected, 500); // Guardado rápido
                }}
                className="peer sr-only"
              />
              <div
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-blue-500 border-blue-500"
                    : (darkMode ? "border-slate-500 bg-slate-800/80 group-hover:border-blue-600" : "border-gray-300 bg-white group-hover:border-blue-400")
                }`}
              >
                {isSelected && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className={`flex-1 font-medium ${isSelected ? (darkMode ? "text-blue-300" : "text-blue-700") : (darkMode ? "text-slate-300" : "text-slate-700")}`}>
              {option.texto}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// 3. Completar Espacios
function FillBlanksQuestion({ question, answer, onChange, darkMode }: any) {
  const texto = question.textoCorrecto || "";
  const partes = texto.split("___");
  const respuestasArray = answer || [];

  return (
    <div className={`p-6 rounded-xl border leading-loose text-lg ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
      {partes.map((parte: string, idx: number) => (
        <React.Fragment key={idx}>
          <span className={darkMode ? "text-slate-300" : "text-slate-700"}>{parte}</span>
          {idx < partes.length - 1 && (
            <span className="relative inline-block mx-1">
              <input
                type="text"
                value={respuestasArray[idx] || ""}
                onChange={(e) => {
                  const newRespuestas = [...respuestasArray];
                  newRespuestas[idx] = e.target.value;
                  onChange(question.id, newRespuestas, 2000);
                }}
                className={`w-32 px-2 py-1 text-center border-b-2 outline-none rounded-t transition-colors font-medium ${darkMode ? "bg-slate-800 border-slate-600 focus:border-blue-400 text-blue-400" : "bg-gray-50 border-gray-300 focus:border-blue-500 text-blue-600"}`}
                placeholder="..."
              />
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// 4. Emparejamiento (MATCH) - REDISEÑADO MEJORADO
function MatchQuestion({ question, answer, onChange, darkMode }: any) {
  const respuestasPares = answer || [];
  const [selectedA, setSelectedA] = useState<number | null>(null);
  
  // Referencias para dibujar líneas
  const containerRef = useRef<HTMLDivElement>(null);
  const [itemPositions, setItemPositions] = useState<Record<string, { top: number; left: number }>>({});
  const [, setForceUpdate] = useState(0); // Para forzar re-render al cambiar tamaño ventana

  // Función para obtener posiciones de los "sockets" (puntos de conexión)
  const updatePositions = useCallback(() => {
    if (!containerRef.current) return;
    
    const positions: Record<string, { top: number; left: number }> = {};
    const containerRect = containerRef.current.getBoundingClientRect();

    question.pares?.forEach((par: any) => {
      // Elementos
      const elA = document.getElementById(`match-a-${question.id}-${par.itemA.id}`);
      const elB = document.getElementById(`match-b-${question.id}-${par.itemB.id}`);
      
      if (elA && elB) {
        // Encontrar los puntos de anclaje (sockets)
        // Socket A está a la derecha del elemento A
        const rectA = elA.getBoundingClientRect();
        const rectB = elB.getBoundingClientRect();

        // Guardamos posiciones relativas al contenedor
        positions[`a-${par.itemA.id}`] = {
            left: (rectA.right - 2) - containerRect.left, // Ajuste: centro exacto del socket (borde 2px)
            top: (rectA.top + rectA.height / 2) - containerRect.top
        };

        positions[`b-${par.itemB.id}`] = {
            left: (rectB.left + 2) - containerRect.left, // Ajuste: centro exacto del socket (borde 2px)
            top: (rectB.top + rectB.height / 2) - containerRect.top
        };
      }
    });
    setItemPositions(positions);
    setForceUpdate(prev => prev + 1);
  }, [question.pares, question.id]);

  // Actualizar posiciones al cargar y al redimensionar
  useEffect(() => {
    // Timeout para asegurar que el DOM se pintó
    const timer = setTimeout(updatePositions, 200);
    
    // Observer para detectar cambios en el tamaño del contenedor (ej. al redimensionar paneles)
    const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => updatePositions());
    });

    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updatePositions);
    return () => {
      window.removeEventListener('resize', updatePositions);
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [updatePositions, respuestasPares.length]);

  const handleSelectA = (id: number) => {
    if (selectedA === id) setSelectedA(null);
    else setSelectedA(id);
  };

  const handleSelectB = (id: number) => {
    if (selectedA === null) {
      // Si selecciono B sin tener A, y B ya tiene pareja, la borro
      const exists = respuestasPares.find((p: any) => p.itemB_id === id);
      if (exists) {
        const nuevos = respuestasPares.filter((p: any) => p.itemB_id !== id);
        onChange(question.id, nuevos);
      }
      return;
    }

    // Lógica de conexión
    // 1. Eliminar conexiones previas de este A
    let nuevos = respuestasPares.filter((p: any) => p.itemA_id !== selectedA);
    // 2. Eliminar conexiones previas de este B
    nuevos = nuevos.filter((p: any) => p.itemB_id !== id);
    // 3. Agregar nueva conexión
    nuevos.push({ itemA_id: selectedA, itemB_id: id });
    
    onChange(question.id, nuevos);
    setSelectedA(null);
  };

  // Generar path SVG tipo curva Bezier
  const getPath = (posA: any, posB: any) => {
    if (!posA || !posB) return "";
    
    // Coordenadas relativas al contenedor SVG
    const x1 = posA.left;
    const y1 = posA.top;
    const x2 = posB.left;
    const y2 = posB.top;

    // Curvatura
    const tension = 0.5;
    const delta = Math.abs(x2 - x1) * tension;

    return `M ${x1} ${y1} C ${x1 + delta} ${y1}, ${x2 - delta} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div className={`relative select-none p-4 rounded-xl border ${darkMode ? "bg-slate-800/50 border-slate-700/80" : "bg-white border-gray-200"}`} ref={containerRef}>
      {/* SVG LAYER PARA LÍNEAS */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
        {respuestasPares.map((par: any, idx: number) => {
          const posA = itemPositions[`a-${par.itemA_id}`];
          const posB = itemPositions[`b-${par.itemB_id}`];
          if (!posA || !posB) return null;
          const style = getStableColor(par.itemA_id, PAIR_COLORS);

          return (
            <g key={idx}>
              {/* Sombra de la línea para profundidad */}
              <path
                d={getPath(posA, posB)}
                fill="none"
                stroke="rgba(0,0,0,0.1)"
                strokeWidth="6"
                className={darkMode ? "stroke-black/20" : ""}
              />
              {/* Línea principal */}
              <path
                d={getPath(posA, posB)}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className={darkMode ? style.darkStroke : style.stroke}
                strokeDasharray="500"
                strokeDashoffset="0"
              >
                <animate attributeName="stroke-dashoffset" from="500" to="0" dur="0.8s" fill="freeze" />
              </path>
              {/* Puntos en los extremos */}
              <circle cx={posA.left} cy={posA.top} r="4" className={darkMode ? style.darkFill : style.fill} />
              <circle cx={posB.left} cy={posB.top} r="4" className={darkMode ? style.darkFill : style.fill} />
            </g>
          );
        })}
      </svg>

      <div className="flex flex-col md:flex-row justify-between gap-12 md:gap-24 relative z-20">
        
        {/* COLUMNA A (Izquierda) */}
        <div className="flex-1 space-y-4">
          <div className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 text-center">Columna A</div>
          {question.pares?.map((par: any) => {
            const isSelected = selectedA === par.itemA.id;
            const pair = respuestasPares.find((p: any) => p.itemA_id === par.itemA.id);
            const isConnected = !!pair;
            const style = isConnected ? getStableColor(par.itemA.id, PAIR_COLORS) : null;

            return (
              <div
                key={par.itemA.id}
                id={`match-a-${question.id}-${par.itemA.id}`}
                onClick={() => handleSelectA(par.itemA.id)}
                className={`
                  relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300
                  flex items-center justify-between group
                  ${isSelected 
                    ? (darkMode ? "border-indigo-500 bg-indigo-900/40 shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-[1.02]" : "border-indigo-500 bg-indigo-50 shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-[1.02]")
                    : isConnected
                      ? (darkMode ? `${style?.darkBorder} ${style?.darkBg}` : `${style?.border} ${style?.bg}`)
                      : (darkMode ? "border-slate-700 bg-slate-800/80 hover:border-slate-600" : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md")
                  }
                `}
              >
                <span className={`font-medium ${isSelected ? (darkMode ? "text-indigo-300" : "text-indigo-700") : isConnected ? (darkMode ? style?.darkText : style?.text) : (darkMode ? "text-slate-300" : "text-slate-700")}`}>
                  {par.itemA.text}
                </span>
                
                {/* Socket derecho (Punto de conexión) */}
                <div className={`
                  w-3 h-3 rounded-full border-2 absolute -right-1.5 top-1/2 -translate-y-1/2 transition-colors
                  ${isSelected ? "bg-indigo-500 border-indigo-500" : isConnected ? (darkMode ? `bg-slate-700 ${style?.darkBorder}` : `bg-white ${style?.border}`) : (darkMode ? "bg-slate-700 border-slate-500 group-hover:border-indigo-400" : "bg-white border-gray-300 group-hover:border-indigo-400")}
                `}></div>
              </div>
            );
          })}
        </div>

        {/* COLUMNA B (Derecha) */}
        <div className="flex-1 space-y-4">
          <div className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 text-center">Columna B</div>
          {question.pares?.map((par: any) => {
            const pair = respuestasPares.find((p: any) => p.itemB_id === par.itemB.id);
            const isConnected = !!pair;
            const style = pair ? getStableColor(pair.itemA_id, PAIR_COLORS) : null;
            const canReceive = selectedA !== null;

            return (
              <div
                key={par.itemB.id}
                id={`match-b-${question.id}-${par.itemB.id}`}
                onClick={() => handleSelectB(par.itemB.id)}
                className={`
                  relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300
                  flex items-center group
                  ${isConnected
                    ? (darkMode ? `${style?.darkBorder} ${style?.darkBg}` : `${style?.border} ${style?.bg}`)
                    : canReceive
                      ? (darkMode ? "border-dashed border-indigo-700/70 bg-indigo-900/20 hover:bg-indigo-900/40" : "border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100")
                      : (darkMode ? "border-slate-700 bg-slate-800/80 hover:border-slate-600" : "border-gray-200 bg-white hover:border-gray-300")
                  }
                `}
              >
                {/* Socket izquierdo */}
                <div className={`
                  w-3 h-3 rounded-full border-2 absolute -left-1.5 top-1/2 -translate-y-1/2 transition-colors
                  ${isConnected ? (darkMode ? `bg-slate-700 ${style?.darkBorder}` : `bg-white ${style?.border}`) : (darkMode ? "bg-slate-700 border-slate-500 group-hover:border-indigo-400" : "bg-white border-gray-300 group-hover:border-indigo-400")}
                `}></div>

                <span className={`flex-1 text-right font-medium ${isConnected ? (darkMode ? style?.darkText : style?.text) : (darkMode ? "text-slate-300" : "text-slate-700")}`}>
                  {par.itemB.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
