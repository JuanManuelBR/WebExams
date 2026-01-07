import { useState } from 'react';
import { Shield, Eye, EyeOff, RefreshCw, Check, ChevronDown } from 'lucide-react';

interface SeccionSeguridadProps {
  darkMode: boolean;
  onContraseñaChange: (contraseña: string) => void;
  onConsecuenciaChange: (consecuencia: string) => void;
  contraseñaInicial?: string;
  consecuenciaInicial?: string;
}

type OpcionConsecuenciaValida = 
  | 'pedir-explicacion-inmediata'
  | 'notificar-no-bloquear'
  | 'pedir-desbloqueo-manual'
  | 'desactivar-proteccion';

type OpcionConsecuencia = OpcionConsecuenciaValida | '';

export default function SeccionSeguridad({ 
  darkMode, 
  onContraseñaChange, 
  onConsecuenciaChange,
  contraseñaInicial = '',
  consecuenciaInicial = ''
}: SeccionSeguridadProps) {
  
  const [contraseñaExamen, setContraseñaExamen] = useState(contraseñaInicial);
  const [mostrarContraseña, setMostrarContraseña] = useState(false);
  const [errorContraseña, setErrorContraseña] = useState('');
  const [consecuenciaAbandono, setConsecuenciaAbandono] = useState<OpcionConsecuencia>(consecuenciaInicial as OpcionConsecuencia);

  // ===== FUNCIÓN PARA GENERAR CONTRASEÑA SEGURA =====
  const generarContraseñaSegura = () => {
    const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const minusculas = 'abcdefghijklmnopqrstuvwxyz';
    const numeros = '0123456789';
    const simbolos = '!@#$%&*';
    
    const todos = mayusculas + minusculas + numeros + simbolos;
    
    let contraseña = '';
    // Generar 6 caracteres aleatorios con al menos un número, letra y símbolo
    contraseña += mayusculas[Math.floor(Math.random() * mayusculas.length)];
    contraseña += minusculas[Math.floor(Math.random() * minusculas.length)];
    contraseña += numeros[Math.floor(Math.random() * numeros.length)];
    contraseña += simbolos[Math.floor(Math.random() * simbolos.length)];
    
    // Completar hasta 6 caracteres
    for (let i = 4; i < 6; i++) {
      contraseña += todos[Math.floor(Math.random() * todos.length)];
    }
    
    // Mezclar la contraseña
    contraseña = contraseña.split('').sort(() => Math.random() - 0.5).join('');
    
    setContraseñaExamen(contraseña);
    setErrorContraseña('');
    onContraseñaChange(contraseña);
  };

  // ===== VALIDAR CONTRASEÑA (6 CARACTERES CUALQUIERA) =====
  const validarContraseña = (valor: string) => {
    setContraseñaExamen(valor);
    onContraseñaChange(valor);
    
    if (valor === '') {
      setErrorContraseña('');
      return;
    }
    
    // Validar que tenga exactamente 6 caracteres (puede ser cualquier carácter)
    if (valor.length !== 6) {
      setErrorContraseña('La contraseña debe tener exactamente 6 caracteres');
    } else {
      setErrorContraseña('');
    }
  };

  // Función auxiliar para obtener el mensaje de consecuencia
  const obtenerMensajeConsecuencia = (consecuencia: OpcionConsecuenciaValida): string => {
    switch (consecuencia) {
      case 'pedir-explicacion-inmediata':
        return 'El estudiante deberá proporcionar una explicación pero podrá continuar inmediatamente con el examen.';
      case 'notificar-no-bloquear':
        return 'Se le notificará al profesor, pero el estudiante podrá continuar sin restricciones.';
      case 'pedir-desbloqueo-manual':
        return 'El estudiante quedará bloqueado y necesitará que el profesor lo desbloquee manualmente para continuar.';
      case 'desactivar-proteccion':
        return 'No se aplicará ninguna restricción. El sistema no monitoreará si el estudiante abandona el área de examen.';
    }
  };

  // ===== OPCIONES DE CONSECUENCIA PARA ABANDONO =====
  const opcionesConsecuencia = [
    { value: '', label: 'Seleccionar una consecuencia...' },
    { value: 'pedir-explicacion-inmediata', label: 'Pedir una explicación pero desbloquear inmediatamente' },
    { value: 'notificar-no-bloquear', label: 'Notificar al profesor pero no bloquear al alumno' },
    { value: 'pedir-desbloqueo-manual', label: 'Pedir una explicación y desbloqueo manual (por el profesor)' },
    { value: 'desactivar-proteccion', label: 'Desactivar por completo la protección contra trampas' }
  ];

  const handleConsecuenciaChange = (valor: string) => {
    setConsecuenciaAbandono(valor as OpcionConsecuencia);
    onConsecuenciaChange(valor);
  };

  return (
    <div className="px-6 pb-6">
      <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Configure las opciones de seguridad para el examen
      </p>
      
      <div className="space-y-6">
        {/* Campo de Contraseña del Examen */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <Shield className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Contraseña del examen
            </label>
          </div>
          
          <div className="space-y-3 ml-8">
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Ingrese una contraseña de 6 caracteres o deje en blanco para generar una automáticamente
            </p>
            
            <div className="relative">
              <input
                type={mostrarContraseña ? "text" : "password"}
                value={contraseñaExamen}
                onChange={(e) => validarContraseña(e.target.value)}
                placeholder="Dejar en blanco para generar automáticamente"
                maxLength={6}
                className={`w-full px-4 py-3 pr-24 rounded-lg border ${
                  errorContraseña 
                    ? 'border-red-500 focus:ring-red-500' 
                    : darkMode 
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 focus:ring-teal-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-teal-500'
                } focus:outline-none focus:ring-2`}
              />
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setMostrarContraseña(!mostrarContraseña)}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                  }`}
                  title={mostrarContraseña ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {mostrarContraseña ? (
                    <EyeOff className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                  ) : (
                    <Eye className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={generarContraseñaSegura}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                  }`}
                  title="Generar contraseña segura"
                >
                  <RefreshCw className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                </button>
              </div>
            </div>
            
            {errorContraseña && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <div className="w-4 h-4 rounded-full border-2 border-red-500 flex items-center justify-center">
                  <span className="text-xs font-bold">!</span>
                </div>
                {errorContraseña}
              </div>
            )}
            
            {contraseñaExamen && !errorContraseña && (
              <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                <Check className="w-4 h-4" />
                <span>Contraseña válida</span>
              </div>
            )}
          </div>
        </div>

        {/* Divisor */}
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}></div>

        {/* Selector de Consecuencias por Abandono */}
        <div className="space-y-3">
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Consecuencia si el estudiante abandona el área de examen <span className="text-red-500">*</span>
          </label>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Como profesor, verá en el monitor si el alumno intenta abandonar el área de examen. Elija aquí las consecuencias para el alumno si esto sucede.
          </p>
          
          <div className="relative">
            <select 
              value={consecuenciaAbandono} 
              onChange={(e) => handleConsecuenciaChange(e.target.value)}
              className={`w-full px-4 py-3 pr-10 rounded-lg border appearance-none cursor-pointer ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                !consecuenciaAbandono || consecuenciaAbandono.length === 0
                  ? 'border-red-300 focus:ring-red-500' 
                  : ''
              }`}
            >
              {opcionesConsecuencia.map(op => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`} />
          </div>

          {/* Información adicional según la opción seleccionada */}
          {consecuenciaAbandono && consecuenciaAbandono.length > 0 && (
            <div className={`mt-3 p-4 rounded-lg ${
              darkMode ? 'bg-blue-900/20 border border-blue-800/50' : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex gap-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full ${
                  darkMode ? 'bg-blue-800' : 'bg-blue-500'
                } flex items-center justify-center`}>
                  <span className="text-white text-xs font-bold">i</span>
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                    {obtenerMensajeConsecuencia(consecuenciaAbandono as OpcionConsecuenciaValida)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}