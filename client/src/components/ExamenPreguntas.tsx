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

// --- COMPONENTE PRINCIPAL ---
export default function ExamPanel({
  examData,
  darkMode,
  answers,
  onAnswerChange,
}: ExamPanelProps) {
  // Envolvemos todo en una clase "dark" si el prop darkMode es true.
  // Esto permite usar las clases nativas de Tailwind `dark:bg-xyz`.
  return (
    <div className={`${darkMode ? "dark" : ""} h-full w-full`}>
      <div className="h-full overflow-auto bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-gray-100 transition-colors duration-300">
        
        {!examData ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xl font-medium text-slate-500 dark:text-slate-400">
                Cargando examen...
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto p-6 md:p-10">
            {/* Header del Examen */}
            <header className="mb-10 border-b border-gray-200 dark:border-slate-700 pb-8">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 mb-3 tracking-tight">
                {examData.nombre}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-sm md:text-base">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {examData.nombreProfesor}
                </div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {examData.limiteTiempo || 0} minutos
                </div>
              </div>

              {/* Descripción */}
              {examData.descripcion && (
                <div className="mt-6 p-5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-2">
                    Instrucciones
                  </h4>
                  <div
                    className="prose prose-slate dark:prose-invert max-w-none font-serif leading-relaxed opacity-90"
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
}: {
  question: Question;
  index: number;
  answer: any;
  onAnswerChange: (id: number, val: any, delay?: number) => void;
}) {
  return (
    <div className="group relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300 overflow-hidden">
      {/* Barra lateral de estado (decorativa) */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-indigo-600"></div>

      <div className="p-6 md:p-8 pl-8 md:pl-10">
        {/* Encabezado de la Pregunta */}
        <div className="flex items-start gap-4 mb-6">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm shrink-0">
            {index + 1}
          </span>
          <div className="flex-1">
            <h3 className="text-xl font-medium font-serif leading-snug text-gray-900 dark:text-gray-100">
              {question.enunciado}
            </h3>
            <span className="inline-block mt-2 text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
              {question.puntaje} {question.puntaje === 1 ? "punto" : "puntos"}
            </span>
          </div>
        </div>

        {/* Imagen Opcional */}
        {question.nombreImagen && (
          <div className="mb-6 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex justify-center p-4">
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
            <OpenQuestion question={question} answer={answer} onChange={onAnswerChange} />
          )}
          {question.type === "test" && (
            <TestQuestion question={question} answer={answer} onChange={onAnswerChange} />
          )}
          {question.type === "fill_blanks" && (
            <FillBlanksQuestion question={question} answer={answer} onChange={onAnswerChange} />
          )}
          {question.type === "match" && (
            <MatchQuestion question={question} answer={answer} onChange={onAnswerChange} />
          )}
        </div>
      </div>
    </div>
  );
}

// --- TIPOS DE PREGUNTAS ---

// 1. Pregunta Abierta
function OpenQuestion({ question, answer, onChange }: any) {
  return (
    <div className="relative">
      <textarea
        value={answer || ""}
        onChange={(e) => onChange(question.id, e.target.value, 3000)}
        className="w-full min-h-[140px] p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all resize-y text-slate-700 dark:text-slate-200 placeholder-slate-400"
        placeholder="Escribe tu respuesta detallada aquí..."
      />
      <div className="absolute bottom-3 right-3 pointer-events-none">
        <span className="text-xs text-slate-400 font-medium">Texto libre</span>
      </div>
    </div>
  );
}

// 2. Pregunta Test (Selección Múltiple)
function TestQuestion({ question, answer, onChange }: any) {
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
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-transparent"
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
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-blue-500 border-blue-500"
                    : "border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800"
                }`}
              >
                {isSelected && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className={`flex-1 font-medium ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-300"}`}>
              {option.texto}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// 3. Completar Espacios
function FillBlanksQuestion({ question, answer, onChange }: any) {
  const texto = question.textoCorrecto || "";
  const partes = texto.split("___");
  const respuestasArray = answer || [];

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 leading-loose text-lg">
      {partes.map((parte: string, idx: number) => (
        <React.Fragment key={idx}>
          <span className="text-slate-700 dark:text-slate-300">{parte}</span>
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
                className="w-32 px-2 py-1 text-center bg-white dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 outline-none rounded-t transition-colors font-medium text-blue-600 dark:text-blue-400"
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
function MatchQuestion({ question, answer, onChange }: any) {
  const respuestasPares = answer || [];
  const [selectedA, setSelectedA] = useState<number | null>(null);
  
  // Referencias para dibujar líneas
  const containerRef = useRef<HTMLDivElement>(null);
  const [itemPositions, setItemPositions] = useState<Record<string, DOMRect>>({});
  const [, setForceUpdate] = useState(0); // Para forzar re-render al cambiar tamaño ventana

  // Función para obtener posiciones de los "sockets" (puntos de conexión)
  const updatePositions = useCallback(() => {
    if (!containerRef.current) return;
    
    const positions: Record<string, DOMRect> = {};
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
            ...rectA, // Guardamos todo el rect por si acaso
            left: rectA.right - 12, // Ajuste visual hacia el socket
            top: rectA.top + rectA.height / 2
        } as DOMRect;

        positions[`b-${par.itemB.id}`] = {
            ...rectB,
            left: rectB.left + 12, // Ajuste visual hacia el socket
            top: rectB.top + rectB.height / 2
        } as DOMRect;
      }
    });
    setItemPositions(positions);
    setForceUpdate(prev => prev + 1);
  }, [question.pares, question.id]);

  // Actualizar posiciones al cargar y al redimensionar
  useEffect(() => {
    // Timeout para asegurar que el DOM se pintó
    const timer = setTimeout(updatePositions, 200);
    window.addEventListener('resize', updatePositions);
    return () => {
      window.removeEventListener('resize', updatePositions);
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
    if (!containerRef.current || !posA || !posB) return "";
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Coordenadas relativas al contenedor SVG
    const x1 = posA.left - containerRect.left;
    const y1 = posA.top - containerRect.top;
    const x2 = posB.left - containerRect.left;
    const y2 = posB.top - containerRect.top;

    // Curvatura
    const tension = 0.5;
    const delta = Math.abs(x2 - x1) * tension;

    return `M ${x1} ${y1} C ${x1 + delta} ${y1}, ${x2 - delta} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div className="relative select-none" ref={containerRef}>
      {/* SVG LAYER PARA LÍNEAS */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
        {respuestasPares.map((par: any, idx: number) => {
          const posA = itemPositions[`a-${par.itemA_id}`];
          const posB = itemPositions[`b-${par.itemB_id}`];
          if (!posA || !posB) return null;

          return (
            <g key={idx}>
              {/* Sombra de la línea para profundidad */}
              <path
                d={getPath(posA, posB)}
                fill="none"
                stroke="rgba(0,0,0,0.1)"
                strokeWidth="6"
              />
              {/* Línea principal */}
              <path
                d={getPath(posA, posB)}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-indigo-500 dark:text-indigo-400"
                strokeDasharray="500"
                strokeDashoffset="0"
              >
                <animate attributeName="stroke-dashoffset" from="500" to="0" dur="0.8s" fill="freeze" />
              </path>
              {/* Puntos en los extremos */}
              <circle cx={posA.left - (containerRef.current?.getBoundingClientRect().left || 0)} cy={posA.top - (containerRef.current?.getBoundingClientRect().top || 0)} r="4" className="fill-indigo-600 dark:fill-indigo-400" />
              <circle cx={posB.left - (containerRef.current?.getBoundingClientRect().left || 0)} cy={posB.top - (containerRef.current?.getBoundingClientRect().top || 0)} r="4" className="fill-indigo-600 dark:fill-indigo-400" />
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
            const isConnected = respuestasPares.some((p: any) => p.itemA_id === par.itemA.id);

            return (
              <div
                key={par.itemA.id}
                id={`match-a-${question.id}-${par.itemA.id}`}
                onClick={() => handleSelectA(par.itemA.id)}
                className={`
                  relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300
                  flex items-center justify-between group
                  ${isSelected 
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-[1.02]" 
                    : isConnected
                      ? "border-indigo-200 dark:border-indigo-800 bg-slate-50 dark:bg-slate-800"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-slate-500 hover:shadow-md"
                  }
                `}
              >
                <span className={`font-medium ${isSelected || isConnected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}`}>
                  {par.itemA.text}
                </span>
                
                {/* Socket derecho (Punto de conexión) */}
                <div className={`
                  w-3 h-3 rounded-full border-2 absolute -right-1.5 top-1/2 -translate-y-1/2 transition-colors
                  ${isSelected || isConnected ? "bg-indigo-500 border-indigo-500" : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 group-hover:border-indigo-400"}
                `}></div>
              </div>
            );
          })}
        </div>

        {/* COLUMNA B (Derecha) */}
        <div className="flex-1 space-y-4">
          <div className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 text-center">Columna B</div>
          {question.pares?.map((par: any) => {
            const isConnected = respuestasPares.some((p: any) => p.itemB_id === par.itemB.id);
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
                    ? "border-indigo-200 dark:border-indigo-800 bg-slate-50 dark:bg-slate-800"
                    : canReceive
                      ? "border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300"
                  }
                `}
              >
                {/* Socket izquierdo */}
                <div className={`
                  w-3 h-3 rounded-full border-2 absolute -left-1.5 top-1/2 -translate-y-1/2 transition-colors
                  ${isConnected ? "bg-indigo-500 border-indigo-500" : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 group-hover:border-indigo-400"}
                `}></div>

                <span className={`flex-1 text-right font-medium ${isConnected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}`}>
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