// components/ModalExamenCreado.tsx
import { X, Copy, Share2, Check } from 'lucide-react';
import { useState } from 'react';

interface ModalExamenCreadoProps {
  mostrar: boolean;
  codigo: string; // Código de 6 caracteres
  url: string;
  darkMode: boolean;
  onCerrar: () => void;
}

export default function ModalExamenCreado({ 
  mostrar, 
  codigo, 
  url, 
  darkMode, 
  onCerrar 
}: ModalExamenCreadoProps) {
  const [codigoCopiado, setCodigoCopiado] = useState(false);
  const [urlCopiada, setUrlCopiada] = useState(false);

  if (!mostrar) return null;

  const copiarAlPortapapeles = (texto: string, tipo: 'codigo' | 'url') => {
    navigator.clipboard.writeText(texto).then(() => {
      if (tipo === 'codigo') {
        setCodigoCopiado(true);
        setTimeout(() => setCodigoCopiado(false), 2000);
      } else {
        setUrlCopiada(true);
        setTimeout(() => setUrlCopiada(false), 2000);
      }
    });
  };

  const compartir = async () => {
    const texto = `Código de examen: ${codigo}\nLink: ${url}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Código de Examen',
          text: texto,
          url: url
        });
      } catch (error) {
        console.log('Error al compartir:', error);
      }
    } else {
      copiarAlPortapapeles(texto, 'url');
      alert('Información copiada al portapapeles');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'} rounded-lg border shadow-2xl w-full max-w-lg`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                ¡Examen creado exitosamente!
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Comparte el código con tus estudiantes
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'text-gray-400 hover:text-white hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Código del examen (6 caracteres) */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Código del examen
            </label>
            <div className={`flex items-center gap-2 p-6 rounded-lg border ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <code className={`flex-1 text-4xl font-bold tracking-widest text-center ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                {codigo}
              </code>
              <button
                onClick={() => copiarAlPortapapeles(codigo, 'codigo')}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  codigoCopiado 
                    ? 'bg-green-500 text-white' 
                    : darkMode 
                      ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {codigoCopiado ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* URL del examen */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Link del examen
            </label>
            <div className={`flex items-center gap-2 p-4 rounded-lg border ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex-1 text-sm break-all hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
              >
                {url}
              </a>
              <button
                onClick={() => copiarAlPortapapeles(url, 'url')}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  urlCopiada 
                    ? 'bg-green-500 text-white' 
                    : darkMode 
                      ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {urlCopiada ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Botón compartir */}
          <button
            onClick={compartir}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors font-medium"
          >
            <Share2 className="w-5 h-5" />
            <span>Compartir código</span>
          </button>


        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 p-6 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={onCerrar}
            className="px-6 py-3 rounded-lg font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}