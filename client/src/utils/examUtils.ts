const EXAMS_API_URL = import.meta.env.VITE_EXAMS_URL || window.location.origin;

/**
 * Construye la URL del PDF pasando por el proxy del backend para evitar descargas forzadas.
 * Centralizado para evitar duplicación en ExamenPreguntas, VigilanciaExamen, etc.
 */
export function buildPdfViewUrl(archivoPDF: string): string {
  if (archivoPDF.startsWith("http")) {
    return `${EXAMS_API_URL}/api/pdfs/proxy?url=${encodeURIComponent(archivoPDF)}`;
  }
  return `${EXAMS_API_URL}/api/pdfs/${archivoPDF}`;
}

/**
 * Colores de gradiente para las barras de preguntas.
 */
export const QUESTION_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-purple-500 to-fuchsia-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-yellow-500 to-amber-600",
];

/**
 * Colores para los pares de emparejamiento (matching questions).
 */
export const PAIR_COLORS = [
  { border: "border-blue-500", darkBorder: "border-blue-400", bg: "bg-blue-50", darkBg: "bg-blue-900/20", text: "text-blue-700", darkText: "text-blue-300", stroke: "text-blue-500", darkStroke: "text-blue-400", fill: "fill-blue-600", darkFill: "fill-blue-400" },
  { border: "border-emerald-500", darkBorder: "border-emerald-400", bg: "bg-emerald-50", darkBg: "bg-emerald-900/20", text: "text-emerald-700", darkText: "text-emerald-300", stroke: "text-emerald-500", darkStroke: "text-emerald-400", fill: "fill-emerald-600", darkFill: "fill-emerald-400" },
  { border: "border-purple-500", darkBorder: "border-purple-400", bg: "bg-purple-50", darkBg: "bg-purple-900/20", text: "text-purple-700", darkText: "text-purple-300", stroke: "text-purple-500", darkStroke: "text-purple-400", fill: "fill-purple-600", darkFill: "fill-purple-400" },
  { border: "border-orange-500", darkBorder: "border-orange-400", bg: "bg-orange-50", darkBg: "bg-orange-900/20", text: "text-orange-700", darkText: "text-orange-300", stroke: "text-orange-500", darkStroke: "text-orange-400", fill: "fill-orange-600", darkFill: "fill-orange-400" },
  { border: "border-pink-500", darkBorder: "border-pink-400", bg: "bg-pink-50", darkBg: "bg-pink-900/20", text: "text-pink-700", darkText: "text-pink-300", stroke: "text-pink-500", darkStroke: "text-pink-400", fill: "fill-pink-600", darkFill: "fill-pink-400" },
  { border: "border-cyan-500", darkBorder: "border-cyan-400", bg: "bg-cyan-50", darkBg: "bg-cyan-900/20", text: "text-cyan-700", darkText: "text-cyan-300", stroke: "text-cyan-500", darkStroke: "text-cyan-400", fill: "fill-cyan-600", darkFill: "fill-cyan-400" },
];

/**
 * Obtiene un color pseudo-aleatorio consistente basado en un ID numérico.
 * Usa el multiplicador primo 37 para dispersar la selección y evitar patrones obvios.
 */
export function getStableColor<T>(id: number, colors: T[]): T {
  return colors[(id * 37) % colors.length];
}
