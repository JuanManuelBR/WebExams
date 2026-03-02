import { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Check, HelpCircle, ListOrdered, ChevronLeft, Shuffle } from 'lucide-react';

interface SeccionSeguridadProps {
  darkMode: boolean;
  onContraseñaChange: (contraseña: string) => void;
  onConsecuenciaChange: (consecuencia: string) => void;
  contraseñaInicial: string;
  consecuenciaInicial: string;
  onContraseñaHabilitadaChange?: (habilitada: boolean) => void;
  contraseñaHabilitadaInicial?: boolean;
  onContraseñaValidaChange?: (valida: boolean) => void;
  tipoPregunta?: string | null;
  navegacionSecuencial?: boolean;
  onNavegacionSecuencialChange?: (habilitada: boolean) => void;
  permitirVolverPreguntas?: boolean;
  onPermitirVolverPreguntasChange?: (habilitada: boolean) => void;
  ordenAleatorio?: boolean;
  onOrdenAleatorioChange?: (habilitada: boolean) => void;
}

export default function SeccionSeguridad({
  darkMode,
  onContraseñaChange,
  onConsecuenciaChange,
  contraseñaInicial,
  consecuenciaInicial,
  onContraseñaHabilitadaChange,
  contraseñaHabilitadaInicial = false,
  onContraseñaValidaChange,
  tipoPregunta,
  navegacionSecuencial = false,
  onNavegacionSecuencialChange,
  permitirVolverPreguntas = false,
  onPermitirVolverPreguntasChange,
  ordenAleatorio = false,
  onOrdenAleatorioChange
}: SeccionSeguridadProps) {
  const [contraseña, setContraseña] = useState(contraseñaInicial);
  const [mostrarContraseña, setMostrarContraseña] = useState(false);
  const [consecuencia, setConsecuencia] = useState(consecuenciaInicial);
  const [contraseñaHabilitada, setContraseñaHabilitada] = useState(contraseñaHabilitadaInicial);
  const [contraseñaValida, setContraseñaValida] = useState(false);

  useEffect(() => {
    validarContraseña(contraseña);
  }, [contraseña, contraseñaHabilitada]);

  const validarContraseña = (pass: string) => {
    if (!contraseñaHabilitada) {
      setContraseñaValida(true);
      if (onContraseñaValidaChange) {
        onContraseñaValidaChange(true);
      }
      return;
    }
    
    if (pass === '') {
      setContraseñaValida(false);
      if (onContraseñaValidaChange) {
        onContraseñaValidaChange(false);
      }
      return;
    }
    
    const longitudValida = pass.length >= 5 && pass.length <= 10;
    setContraseñaValida(longitudValida);
    if (onContraseñaValidaChange) {
      onContraseñaValidaChange(longitudValida);
    }
  };

  const handleContraseñaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevaContraseña = e.target.value;
    if (nuevaContraseña.length <= 10) {
      setContraseña(nuevaContraseña);
      onContraseñaChange(nuevaContraseña);
    }
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
              Ingrese una contraseña de 5 a 10 caracteres (puede incluir letras, números y símbolos)
            </p>
            
            <div className="relative">
              <input
                type={mostrarContraseña ? 'text' : 'password'}
                value={contraseña}
                onChange={handleContraseñaChange}
                placeholder="Ingrese la contraseña del examen"
                maxLength={10}
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

            {contraseña.length > 0 && (
              <div className="flex items-center gap-2">
                {contraseñaValida ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-500">
                      Contraseña válida ({contraseña.length}/10 caracteres)
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-red-500">
                    {contraseña.length < 5 
                      ? `La contraseña debe tener al menos 5 caracteres (${contraseña.length}/5)`
                      : 'La contraseña no puede tener más de 10 caracteres'}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Preguntas secuenciales (Solo para examen manual) */}
      {tipoPregunta === 'automatico' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ListOrdered className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Preguntas secuenciales
            </label>
            <div className="relative group">
              <HelpCircle className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'} cursor-help`} />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg" style={{ minWidth: '240px', maxWidth: '320px' }}>
                Muestra las preguntas una por una. El estudiante no podrá volver a las preguntas anteriores una vez que haya avanzado.
                <div className="absolute left-3 -bottom-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
              </div>
            </div>
            <button
              onClick={() => {
                const nuevoValor = !navegacionSecuencial;
                onNavegacionSecuencialChange && onNavegacionSecuencialChange(nuevoValor);
                if (!nuevoValor) {
                  onPermitirVolverPreguntasChange && onPermitirVolverPreguntasChange(false);
                }
              }}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                navegacionSecuencial ? bgCheckbox : 'border-gray-300'
              }`}
            >
              {navegacionSecuencial && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Habilitar
            </span>
          </div>

          {/* Permitir volver a preguntas (solo cuando secuencial está activo) */}
          {navegacionSecuencial && (
            <div className="flex items-center gap-3">
              <ChevronLeft className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Permitir ver preguntas ya respondidas
              </label>
              <div className="relative group">
                <HelpCircle className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'} cursor-help`} />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg" style={{ minWidth: '240px', maxWidth: '320px' }}>
                  Permite al estudiante devolverse para revisar y cambiar preguntas que ya haya contestado.
                  <div className="absolute left-3 -bottom-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
              <button
                onClick={() => onPermitirVolverPreguntasChange && onPermitirVolverPreguntasChange(!permitirVolverPreguntas)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  permitirVolverPreguntas ? bgCheckbox : 'border-gray-300'
                }`}
              >
                {permitirVolverPreguntas && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Habilitar
              </span>
            </div>
          )}
        </div>
      )}

      {/* Orden aleatorio de preguntas */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Shuffle className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Orden aleatorio de preguntas
          </label>
          <div className="relative group">
            <HelpCircle className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'} cursor-help`} />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg" style={{ minWidth: '240px', maxWidth: '320px' }}>
              Si está activo, las preguntas se mostrarán en orden aleatorio a cada estudiante. Si no, se mostrarán en el orden exacto en que el profesor las creó.
              <div className="absolute left-3 -bottom-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>
          <button
            onClick={() => onOrdenAleatorioChange && onOrdenAleatorioChange(!ordenAleatorio)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              ordenAleatorio ? bgCheckbox : 'border-gray-300'
            }`}
          >
            {ordenAleatorio && <Check className="w-3 h-3 text-white" />}
          </button>
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Habilitar
          </span>
        </div>
      </div>

      {/* Consecuencia de abandono */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Consecuencia de abandono <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <HelpCircle className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'} cursor-help`} />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg" style={{ minWidth: '240px', maxWidth: '320px' }}>
              Define qué sucede si el estudiante cambia de pestaña o abandona la ventana del examen durante su realización
              <div className="absolute left-3 -bottom-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>
        </div>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
          <option value="desbloqueo-manual">Desbloqueo manual (por el profesor)</option>
          <option value="desactivar-proteccion">Desactivar por completo la protección contra trampas</option>
        </select>
      </div>
    </div>
  );
}