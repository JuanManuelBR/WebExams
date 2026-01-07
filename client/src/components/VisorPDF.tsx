interface VisorPDFProps {
  mostrar: boolean;
  pdfURL: string | null;
  pdfCargando: boolean;
  darkMode: boolean;
  onCerrar: () => void;
  onElegirOtro: () => void;
}

export default function VisorPDF({
  mostrar,
  pdfURL,
  pdfCargando,
  darkMode,
  onCerrar,
  onElegirOtro
}: VisorPDFProps) {
  if (!mostrar) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col`}>
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {pdfCargando ? 'Cargando documento...' : 'Vista previa del PDF'}
          </h3>
          <button onClick={onElegirOtro} className="px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white">
            Elegir otro documento PDF
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex items-center justify-center p-6">
          {pdfCargando ? (
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-32 bg-white border-4 border-gray-300 rounded-lg shadow-lg transform -rotate-12 animate-pulse"></div>
                  <div className="w-24 h-32 bg-white border-4 border-orange-400 rounded-lg shadow-lg transform rotate-6"></div>
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
              <p className={`text-base mt-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Puede tardar hasta un minuto...</p>
            </div>
          ) : (
            <div className="w-full h-full flex justify-center items-center bg-gray-100 rounded-lg overflow-hidden">
              <iframe
                src={`${pdfURL}#toolbar=0&navpanes=0&scrollbar=1&view=FitH` || ''}
                className="w-full h-[calc(90vh-180px)]"
                title="Vista previa PDF"
              />
            </div>
          )}
        </div>

        <div className={`flex items-center justify-center p-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <button onClick={onCerrar} className={`px-8 py-3 rounded-lg font-medium transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}