import React from 'react';
import { Check } from 'lucide-react';

interface SeccionHerramientasProps {
  darkMode: boolean;
  herramientasActivas: {
    dibujo: boolean;
    calculadora: boolean;
    excel: boolean;
    javascript: boolean;
    python: boolean;
  };
  onToggleHerramienta: (herramienta: 'dibujo' | 'calculadora' | 'excel' | 'javascript' | 'python') => void;
}

export default function SeccionHerramientas({
  darkMode,
  herramientasActivas,
  onToggleHerramienta
}: SeccionHerramientasProps) {
  const herramientas = [
    {
      id: 'dibujo' as const,
      nombre: 'Herramienta de dibujo',
      descripcion: 'Incluye tablas y diagramas'
    },
    {
      id: 'calculadora' as const,
      nombre: 'Calculadora científica',
      descripcion: ''
    },
    {
      id: 'excel' as const,
      nombre: 'Hoja de Excel',
      descripcion: ''
    }
  ];

  const herramientasProgramacion = [
    {
      id: 'javascript' as const,
      nombre: 'JavaScript'
    },
    {
      id: 'python' as const,
      nombre: 'Python'
    }
  ];

  const borderActivo = darkMode ? 'border-teal-500' : 'border-slate-700';
  const bgActivoLight = darkMode ? 'bg-teal-500/10' : 'bg-slate-700/10';
  const bgCheckbox = darkMode ? 'bg-teal-500 border-teal-500' : 'bg-slate-700 border-slate-700';

  return (
    <div className="px-6 pb-6 space-y-6">
      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Dar acceso al alumno a una herramienta.
      </p>

      {/* Herramientas principales */}
      <div className="space-y-3">
        {herramientas.map(herramienta => (
          <div
            key={herramienta.id}
            onClick={() => onToggleHerramienta(herramienta.id)}
            className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
              herramientasActivas[herramienta.id]
                ? `${borderActivo} ${bgActivoLight}`
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div>
              <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {herramienta.nombre}
              </div>
              {herramienta.descripcion && (
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {herramienta.descripcion}
                </p>
              )}
            </div>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              herramientasActivas[herramienta.id] ? bgCheckbox : 'border-gray-300'
            }`}>
              {herramientasActivas[herramienta.id] && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
        ))}
      </div>

      {/* Sección de Programación */}
      <div className="space-y-3">
        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Programación
        </h3>
        {herramientasProgramacion.map(herramienta => (
          <div
            key={herramienta.id}
            onClick={() => onToggleHerramienta(herramienta.id)}
            className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
              herramientasActivas[herramienta.id]
                ? `${borderActivo} ${bgActivoLight}`
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {herramienta.nombre}
            </span>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              herramientasActivas[herramienta.id] ? bgCheckbox : 'border-gray-300'
            }`}>
              {herramientasActivas[herramienta.id] && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}