import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

type ModalTipo = "exito" | "error" | "advertencia" | "info" | "confirmar";

interface ModalConfirmacionProps {
  visible: boolean;
  tipo?: ModalTipo;
  titulo: string;
  mensaje: string;
  darkMode?: boolean;
  textoConfirmar?: string;
  textoCancelar?: string;
  onConfirmar: () => void;
  onCancelar?: () => void;
}

const configTipo: Record<ModalTipo, {
  icon: typeof AlertTriangle;
  iconBg: [string, string];
  iconColor: [string, string];
  borderColor: [string, string];
  tituloColor: [string, string];
  btnColor: string;
}> = {
  exito: {
    icon: CheckCircle2,
    iconBg: ["bg-emerald-900/30", "bg-emerald-50"],
    iconColor: ["text-emerald-400", "text-emerald-600"],
    borderColor: ["border-emerald-800", "border-emerald-200"],
    tituloColor: ["text-emerald-400", "text-emerald-700"],
    btnColor: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20",
  },
  error: {
    icon: XCircle,
    iconBg: ["bg-red-900/30", "bg-red-50"],
    iconColor: ["text-red-400", "text-red-600"],
    borderColor: ["border-red-800", "border-red-200"],
    tituloColor: ["text-red-400", "text-red-700"],
    btnColor: "bg-red-600 hover:bg-red-700 shadow-red-900/20",
  },
  advertencia: {
    icon: AlertTriangle,
    iconBg: ["bg-amber-900/30", "bg-amber-50"],
    iconColor: ["text-amber-400", "text-amber-600"],
    borderColor: ["border-amber-800", "border-amber-200"],
    tituloColor: ["text-amber-400", "text-amber-700"],
    btnColor: "bg-amber-600 hover:bg-amber-700 shadow-amber-900/20",
  },
  info: {
    icon: Info,
    iconBg: ["bg-blue-900/30", "bg-blue-50"],
    iconColor: ["text-blue-400", "text-blue-600"],
    borderColor: ["border-blue-800", "border-blue-200"],
    tituloColor: ["text-blue-400", "text-blue-700"],
    btnColor: "bg-blue-600 hover:bg-blue-700 shadow-blue-900/20",
  },
  confirmar: {
    icon: AlertTriangle,
    iconBg: ["bg-red-900/30", "bg-red-50"],
    iconColor: ["text-red-400", "text-red-600"],
    borderColor: ["border-red-800", "border-red-200"],
    tituloColor: ["text-red-400", "text-red-700"],
    btnColor: "bg-red-600 hover:bg-red-700 shadow-red-900/20",
  },
};

export default function ModalConfirmacion({
  visible,
  tipo = "info",
  titulo,
  mensaje,
  darkMode = false,
  textoConfirmar,
  textoCancelar,
  onConfirmar,
  onCancelar,
}: ModalConfirmacionProps) {
  if (!visible) return null;

  const config = configTipo[tipo];
  const Icon = config.icon;
  const d = darkMode ? 0 : 1;

  const esSoloAlerta = tipo !== "confirmar";
  const btnConfirmarTexto = textoConfirmar || (esSoloAlerta ? "Aceptar" : "Sí, confirmar");
  const btnCancelarTexto = textoCancelar || "Cancelar";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border-2 ${
          darkMode ? `bg-slate-800 ${config.borderColor[0]}` : `bg-white ${config.borderColor[1]}`
        }`}
      >
        <div className="flex flex-col items-center text-center gap-4">
          {/* Botón cerrar */}
          {esSoloAlerta && (
            <button
              onClick={onConfirmar}
              className={`absolute top-3 right-3 p-1 rounded-lg transition-colors ${
                darkMode ? "text-slate-500 hover:text-white hover:bg-slate-700" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Icono */}
          <div className={`p-3 rounded-full ${config.iconBg[d]} ${config.iconColor[d]}`}>
            <Icon className="w-8 h-8" />
          </div>

          {/* Titulo */}
          <h3 className={`text-xl font-bold ${config.tituloColor[d]}`}>{titulo}</h3>

          {/* Mensaje */}
          <p className={`text-sm ${darkMode ? "text-slate-400" : "text-gray-600"}`}>{mensaje}</p>

          {/* Botones */}
          <div className="flex gap-3 w-full mt-2">
            {!esSoloAlerta && onCancelar && (
              <button
                onClick={onCancelar}
                className={`flex-1 py-2.5 rounded-xl font-medium transition-colors ${
                  darkMode
                    ? "bg-slate-700 text-white hover:bg-slate-600"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
                }`}
              >
                {btnCancelarTexto}
              </button>
            )}
            <button
              onClick={onConfirmar}
              className={`flex-1 py-2.5 rounded-xl font-medium text-white transition-colors shadow-lg ${config.btnColor}`}
            >
              {btnConfirmarTexto}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
