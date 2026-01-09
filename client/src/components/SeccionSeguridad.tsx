import { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Check } from 'lucide-react';

interface SeccionSeguridadProps {
  darkMode: boolean;
  onContraseñaChange: (contraseña: string) => void;
  onConsecuenciaChange: (consecuencia: string) => void;
  contraseñaInicial: string;
  consecuenciaInicial: string;
  onContraseñaHabilitadaChange?: (habilitada: boolean) => void;
  contraseñaHabilitadaInicial?: boolean;
}

export default function SeccionSeguridad({
  darkMode,
  onContraseñaChange,
  onConsecuenciaChange,
  contraseñaInicial,
  consecuenciaInicial,
  onContraseñaHabilitadaChange,
  contraseñaHabilitadaInicial = false
}: SeccionSeguridadProps) {
  const [contraseña, setContraseña] = useState(contraseñaInicial);
  const [mostrarContraseña, setMostrarContraseña] = useState(false);
  const [consecuencia, setConsecuencia] = useState(consecuenciaInicial);
  const [contraseñaHabilitada, setContraseñaHabilitada] = useState(contraseñaHabilitadaInicial);
  const [contraseñaValida, setContraseñaValida] = useState(false);

  useEffect(() => {
    validarContraseña(contraseña);
  }, [contraseña]);

  const validarContraseña = (pass: string) => {
    if (!contraseñaHabilitada || pass === '') {
      setContraseñaValida(true);
      return;
    }
    
    const tieneMayuscula = /[A-Z]/.test(pass);
    const tieneMinuscula = /[a-z]/.test(pass);
    const tieneNumero = /[0-9]/.test(pass);
    const tieneSimbolo = /[!@#$%&*]/.test(pass);
    const longitudValida = pass.length >= 6;

    setContraseñaValida(
      tieneMayuscula && tieneMinuscula && tieneNumero && tieneSimbolo && longitudValida
    );
  };

  const handleContraseñaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevaContraseña = e.target.value;
    setContraseña(nuevaContraseña);
    onContraseñaChange(nuevaContraseña);
  };

  const handleConsecuenciaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevaConsecuencia = e.target.value;
    setConsecuencia(nuevaConsecuencia);
    onConsecuenciaChange(nuevaConsecuencia);
  };

  const handleContraseñaHabilitadaToggle = () => {
    const nuevoEstado = !contraseñaHabilitada;
    setContraseñaHabilitada(nuevoEstado);
    
    if (onContraseñaHabilitadaChange) {
      onContraseñaHabilitadaChange(nuevoEstado);
    }
    
    if (!nuevoEstado) {
      setContraseña('');
      onContraseñaChange('');
    }
  };

  const bgCheckbox = darkMode ? 'bg-teal-500 border-teal-500' : 'bg-slate-700 border-slate-700';
  const borderActivo = darkMode ? 'border-teal-500' : 'border-slate-700';
  const bgActivoLight = darkMode ? 'bg-teal-500/10' : 'bg-slate-700/10';

  return (
    <div className="px-6 pb-6 space-y-6">
      {/* Contraseña del examen */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Shield className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Contraseña del examen
          </label>
          <button 
            onClick={handleContraseñaHabilitadaToggle}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              contraseñaHabilitada ? bgCheckbox : 'border-gray-300'
            }`}
          >
            {contraseñaHabilitada && <Check className="w-3 h-3 text-white" />}
          </button>
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Habilitar
          </span>
        </div>

        {contraseñaHabilitada && (
          <>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Ingrese una contraseña de 6 caracteres o más
            </p>
            
            <div className="relative">
              <input
                type={mostrarContraseña ? 'text' : 'password'}
                value={contraseña}
                onChange={handleContraseñaChange}
                placeholder="Ingrese la contraseña del examen"
                className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 placeholder-gray-400'
                }`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setMostrarContraseña(!mostrarContraseña)}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'hover:bg-slate-700 text-gray-400' 
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title={mostrarContraseña ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarContraseña ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {contraseña && (
              <div className="flex items-center gap-2">
                {contraseñaValida ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-500">Contraseña válida</span>
                  </>
                ) : (
                  <span className="text-xs text-red-500">
                    La contraseña debe tener al menos 6 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos (!@#$%&*)
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Consecuencia de abandono */}
      <div className="space-y-3">
        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Consecuencia de abandono <span className="text-red-500">*</span>
        </label>
        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          ¿Qué sucede si el estudiante abandona la ventana del examen?
        </p>
        <select
          value={consecuencia}
          onChange={handleConsecuenciaChange}
          className={`w-full px-4 py-3 rounded-lg border ${
            darkMode 
              ? 'bg-slate-800 border-slate-700 text-white' 
              : 'bg-white border-gray-300'
          }`}
        >
          <option value="">Seleccionar una consecuencia...</option>
          <option value="notificar-profesor">Notificar al profesor pero no bloquear al alumno</option>
          <option value="desbloqueo-manual">Pedir una explicación y desbloqueo manual (por el profesor)</option>
          <option value="desactivar-proteccion">Desactivar por completo la protección contra trampas</option>
        </select>
      </div>

      {/* Información adicional */}
      <div className={`p-4 rounded-lg border ${
        darkMode 
          ? 'bg-slate-800/50 border-slate-700' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-blue-900'}`}>
          <strong>Nota:</strong> Las opciones de seguridad ayudan a mantener la integridad del examen.
          {contraseñaHabilitada && ' Los estudiantes necesitarán la contraseña para acceder al examen.'}
        </p>
      </div>
    </div>
  );
}