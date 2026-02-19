import { FileText, Lock, User, Clock, ShieldCheck, GripVertical, Maximize2, ChevronRight, Columns, Rows } from "lucide-react";
import logoUniversidad from "../../assets/logo-universidad.webp";
import logoUniversidadNoche from "../../assets/logo-universidad-noche.webp";

interface MonitoreoSupervisadoProps {
  darkMode: boolean;
  onStartExam: () => void;
  isStarting?: boolean;
  studentData?: any;
  examData?: any;
}

export default function MonitoreoSupervisado({
  darkMode,
  onStartExam,
  isStarting = false,
  studentData,
  examData
}: MonitoreoSupervisadoProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center relative overflow-hidden font-sans select-none ${darkMode ? "bg-slate-900" : "bg-gray-50"}`}>
      
      {/* ================================================================================== */}
      {/* FONDO SIMULADO (INTERFAZ DE EXAMEN REAL) - CON BLUR */}
      {/* ================================================================================== */}
      <div className={`absolute inset-0 z-0 flex pointer-events-none ${darkMode ? "bg-slate-900" : "bg-gray-50"}`}>
        
        {/* 1. Sidebar Simulado (Izquierda) */}
        <div className={`w-64 flex flex-col h-full border-r ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`}>
           {/* Header del Sidebar */}
           <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
                   <User className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-1">
                   <div className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-blue-600"}`}>Estudiante</div>
                   <div className={`font-bold text-sm ${darkMode ? "text-white" : "text-gray-800"}`}>{studentData?.nombre || "Estudiante"}</div>
                </div>
              </div>
           </div>
           
           {/* Items del Sidebar */}
           <div className="p-3 space-y-2 opacity-70">
              <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-gray-400"}`}>Evaluación</div>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                 <FileText className="w-5 h-5" />
                 <span className="font-medium text-sm">Examen</span>
              </div>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                 <div className="w-5 h-5 rounded bg-current opacity-20"></div>
                 <span className="font-medium text-sm">Responder</span>
              </div>
              
              <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-gray-400"}`}>Herramientas</div>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                 <div className="w-5 h-5 rounded bg-current opacity-20"></div>
                 <span className="font-medium text-sm">Calculadora</span>
              </div>
           </div>

           {/* Footer del Sidebar */}
           <div className={`mt-auto p-3 space-y-2 ${darkMode ? "bg-slate-900/50" : "bg-gray-50/50"}`}>
              <div className="w-full h-10 rounded-lg bg-emerald-600/20 border border-emerald-600/30"></div>
              <div className="w-full h-10 rounded-lg bg-red-600/10 border border-red-600/20"></div>
           </div>
        </div>

        {/* 2. Área Principal Simulada (Derecha) */}
        <div className="flex-1 flex flex-col h-full relative">
           {/* Header Superior */}
           <div className="h-20 px-6 flex items-center justify-between absolute top-0 left-0 right-0 z-20">
              <div className={`flex p-1 rounded-lg ${darkMode ? "bg-slate-900/50 border border-slate-700" : "bg-white/50 border border-gray-200/50"}`}>
                  <div className={`p-1.5 rounded ${darkMode ? "bg-blue-600" : "bg-white shadow-sm"}`}><Columns className="w-4 h-4"/></div>
                  <div className="p-1.5"><Rows className="w-4 h-4 opacity-50"/></div>
              </div>
              <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${darkMode ? "bg-slate-900/50 border-slate-700" : "bg-white/50 border-gray-200/50"}`}>
                      <Clock className="w-5 h-5 text-blue-500" />
                      <span className={`font-mono text-xl font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>00:00:00</span>
                  </div>
                  <img src={darkMode ? logoUniversidadNoche : logoUniversidad} className="h-14 w-auto object-contain opacity-50" />
              </div>
           </div>

           {/* Contenido (Paneles Simulados) */}
           <div className="flex-1 p-4 pt-24 flex gap-4">
              {/* Panel Izquierdo (Examen) */}
              <div className={`flex-1 rounded-xl border shadow-sm overflow-hidden ${darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-gray-200"}`}>
                  <div className={`h-10 flex items-center justify-between px-4 border-b ${darkMode ? "bg-slate-800/50 border-slate-800" : "bg-[#2c3e50] border-[#2c3e50]"}`}>
                      <div className="flex items-center gap-2">
                          <GripVertical className={`w-4 h-4 ${darkMode ? "text-gray-400" : "text-white/50"}`} />
                          <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-white"}`}>EXAMEN</span>
                      </div>
                  </div>
                  <div className="p-8 space-y-6 opacity-50">
                      <div className={`h-8 w-3/4 rounded ${darkMode ? "bg-slate-800" : "bg-gray-100"}`}></div>
                      <div className={`h-4 w-full rounded ${darkMode ? "bg-slate-800" : "bg-gray-100"}`}></div>
                      <div className={`h-4 w-full rounded ${darkMode ? "bg-slate-800" : "bg-gray-100"}`}></div>
                      <div className={`h-32 w-full rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-100"}`}></div>
                  </div>
              </div>
              
              {/* Panel Derecho (Respuesta) */}
              <div className={`w-1/3 rounded-xl border shadow-sm overflow-hidden ${darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-gray-200"}`}>
                  <div className={`h-10 flex items-center justify-between px-4 border-b ${darkMode ? "bg-slate-800/50 border-slate-800" : "bg-[#2c3e50] border-[#2c3e50]"}`}>
                      <div className="flex items-center gap-2">
                          <GripVertical className={`w-4 h-4 ${darkMode ? "text-gray-400" : "text-white/50"}`} />
                          <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-white"}`}>ANSWER</span>
                      </div>
                  </div>
                  <div className="p-4 space-y-3 opacity-50">
                      <div className={`h-4 w-full rounded ${darkMode ? "bg-slate-800" : "bg-gray-100"}`}></div>
                      <div className={`h-4 w-5/6 rounded ${darkMode ? "bg-slate-800" : "bg-gray-100"}`}></div>
                  </div>
              </div>
           </div>
        </div>
      </div>

      {/* ================================================================================== */}
      {/* CAPA DE OSCURECIMIENTO (OVERLAY) */}
      {/* ================================================================================== */}
      <div className={`absolute inset-0 z-10 transition-colors duration-500 ${
        darkMode ? "bg-slate-900/80" : "bg-white/60 backdrop-blur-[2px]"
      }`}></div>


      {/* ================================================================================== */}
      {/* CONTENIDO DEL MODAL (PRIMER PLANO) */}
      {/* ================================================================================== */}
      
      <div className="relative z-20 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
          
          <div className={`p-5 rounded-full shadow-2xl mb-2 ${darkMode ? "bg-blue-600 text-white shadow-blue-900/50" : "bg-white text-blue-600 shadow-xl"}`}>
             <Lock className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-lg">
            <h1 className={`text-4xl font-extrabold tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
               {examData?.nombre || "Examen"}
            </h1>
            <p className={`text-lg ${darkMode ? "text-slate-300" : "text-gray-600"}`}>
               Hola, <span className="font-bold">{studentData?.nombre?.split(" ")[0] || "Estudiante"}</span>. Todo está listo para comenzar.
            </p>
          </div>

          <button
            onClick={onStartExam}
            disabled={isStarting}
            className="group relative inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xl font-bold rounded-full shadow-2xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          >
            <span>{isStarting ? "Iniciando..." : "Comenzar Examen"}</span>
            {!isStarting && <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />}
          </button>
          
          <div className={`flex items-center gap-6 text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-gray-400"}`}>
             <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Ambiente Seguro</span>
             <span className="flex items-center gap-2"><Maximize2 className="w-4 h-4" /> Pantalla Completa</span>
          </div>
      </div>
    </div>
  );
}
