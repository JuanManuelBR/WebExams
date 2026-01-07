interface HerramientasActivas {
  dibujo: boolean;
  calculadora: boolean;
  javascript: boolean;
  python: boolean;
  sqlite: boolean;
  excel: boolean;
}

interface SeccionHerramientasProps {
  darkMode: boolean;
  herramientasActivas: HerramientasActivas;
  onToggleHerramienta: (herramienta: keyof HerramientasActivas) => void;
}

export default function SeccionHerramientas({ 
  darkMode, 
  herramientasActivas, 
  onToggleHerramienta 
}: SeccionHerramientasProps) {
  return (
    <div className="px-6 pb-6 space-y-4">
      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
        Dar acceso al alumno a una herramienta.
      </p>

      {/* Herramienta de Dibujo */}
      <div 
        onClick={() => onToggleHerramienta('dibujo')} 
        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
          herramientasActivas.dibujo ? 'border-teal-500 bg-teal-500/10' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex-1">
          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Herramienta de dibujo
          </span>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Incluye tablas y diagramas estilo Lucidchart
          </p>
        </div>
        <div className={`w-12 h-6 rounded-full transition-colors ${
          herramientasActivas.dibujo ? 'bg-teal-500' : 'bg-gray-300'
        } relative`}>
          <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            herramientasActivas.dibujo ? 'translate-x-6' : ''
          }`}></div>
        </div>
      </div>

      {/* Calculadora */}
      <div 
        onClick={() => onToggleHerramienta('calculadora')} 
        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
          herramientasActivas.calculadora ? 'border-teal-500 bg-teal-500/10' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Calculadora científica
        </span>
        <div className={`w-12 h-6 rounded-full transition-colors ${
          herramientasActivas.calculadora ? 'bg-teal-500' : 'bg-gray-300'
        } relative`}>
          <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            herramientasActivas.calculadora ? 'translate-x-6' : ''
          }`}></div>
        </div>
      </div>

      {/* Hoja de Excel */}
      <div 
        onClick={() => onToggleHerramienta('excel')} 
        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
          herramientasActivas.excel ? 'border-teal-500 bg-teal-500/10' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Hoja de Excel
        </span>
        <div className={`w-12 h-6 rounded-full transition-colors ${
          herramientasActivas.excel ? 'bg-teal-500' : 'bg-gray-300'
        } relative`}>
          <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            herramientasActivas.excel ? 'translate-x-6' : ''
          }`}></div>
        </div>
      </div>

      {/* Sección de Programación */}
      <div className={`${darkMode ? 'bg-slate-800' : 'bg-gray-50'} rounded-lg p-4 space-y-3 border ${
        darkMode ? 'border-slate-700' : 'border-gray-200'
      }`}>
        <div className={`font-semibold text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
          Programación
        </div>

        {/* JavaScript */}
        <div 
          onClick={() => onToggleHerramienta('javascript')} 
          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
            herramientasActivas.javascript ? 'border-teal-500 bg-teal-500/10' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            JavaScript
          </span>
          <div className={`w-10 h-5 rounded-full transition-colors ${
            herramientasActivas.javascript ? 'bg-teal-500' : 'bg-gray-300'
          } relative`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              herramientasActivas.javascript ? 'translate-x-5' : ''
            }`}></div>
          </div>
        </div>

        {/* Python */}
        <div 
          onClick={() => onToggleHerramienta('python')} 
          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
            herramientasActivas.python ? 'border-teal-500 bg-teal-500/10' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Python
          </span>
          <div className={`w-10 h-5 rounded-full transition-colors ${
            herramientasActivas.python ? 'bg-teal-500' : 'bg-gray-300'
          } relative`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              herramientasActivas.python ? 'translate-x-5' : ''
            }`}></div>
          </div>
        </div>

        {/* SQLite */}
        <div 
          onClick={() => onToggleHerramienta('sqlite')} 
          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
            herramientasActivas.sqlite ? 'border-teal-500 bg-teal-500/10' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            SQLite
          </span>
          <div className={`w-10 h-5 rounded-full transition-colors ${
            herramientasActivas.sqlite ? 'bg-teal-500' : 'bg-gray-300'
          } relative`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              herramientasActivas.sqlite ? 'translate-x-5' : ''
            }`}></div>
          </div>
        </div>

        {/* Herramientas Próximamente */}
        <div className="pt-2 space-y-2">
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mb-2`}>
            Próximamente:
          </p>
          
          {['Java', 'PackeTTrino', 'Linux', 'PSeInt', 'Arduino', 'GeoGebra'].map(nombre => (
            <div 
              key={nombre} 
              className={`flex items-center justify-between p-3 rounded-lg border cursor-not-allowed opacity-50 ${
                darkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-gray-100'
              }`}
            >
              <span className={`font-medium text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {nombre}
              </span>
              <div className="w-10 h-5 rounded-full bg-gray-300 relative">
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}