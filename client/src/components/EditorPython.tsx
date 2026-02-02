import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Trash2, 
  Plus, 
  Code, 
  Type,
  GripVertical,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  GripHorizontal,
  Square,
  RefreshCw
} from 'lucide-react';

interface EditorPythonProps {
  darkMode: boolean;
  onSave?: (data: any) => void;
  initialCells?: Cell[];
  zoomLevel?: number;
}

type CellType = 'code' | 'markdown';
type CellStatus = 'idle' | 'running' | 'success' | 'error';

interface Cell {
  id: string;
  type: CellType;
  content: string;
  output?: string[];
  status: CellStatus;
  executionTime?: number;
  height?: number;
}

// Declaración global para TypeScript
declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

export default function EditorPython({ darkMode, onSave, initialCells, zoomLevel = 100 }: EditorPythonProps) {
  const [cells, setCells] = useState<Cell[]>(initialCells || []);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  
  const pyodideRef = useRef<any>(null);
  const lineNumbersRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const executionRefs = useRef<Map<string, number>>(new Map());
  const isMounted = useRef(true);
  const activeCellId = useRef<string | null>(null);
  const loadedPackages = useRef<Set<string>>(new Set());

  // Estado para redimensionar celdas
  const [resizingCellId, setResizingCellId] = useState<string | null>(null);
  const resizingRef = useRef<{ startY: number, startHeight: number } | null>(null);

  // --- 1. CONFIGURACIÓN DEL ENTORNO (Solución al problema de carga) ---
  useEffect(() => {
    isMounted.current = true;

    // Función global para que Python pueda "imprimir" hacia React
    // La definimos fuera del ciclo de carga para que siempre esté disponible
    (window as any).handlePythonPrint = (text: string) => {
      if (!isMounted.current || !activeCellId.current) return;
      
      setCells(prev => {
        const index = prev.findIndex(c => c.id === activeCellId.current);
        if (index === -1) return prev;
        
        const cell = prev[index];
        // Evitamos duplicados exactos si Python manda buffering raro
        const newOutput = [...(cell.output || [])];
        if (text) newOutput.push(text);

        const newCells = [...prev];
        newCells[index] = { ...cell, output: newOutput };
        return newCells;
      });
    };

    const initPyodide = async () => {
      // Si ya está cargado globalmente (al volver de otra pestaña), lo reusamos
      if (window.pyodide) {
        pyodideRef.current = window.pyodide;
        setPyodideReady(true);
        return;
      }

      // Si ya estamos cargando, no hacer nada
      if (pyodideLoading) return;

      setPyodideLoading(true);
      setLoadingProgress('Cargando motor Python...');

      try {
        // 1. Cargar Script si no existe
        if (!window.loadPyodide) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
          script.async = true;
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // 2. Inicializar Pyodide
        setLoadingProgress('Iniciando intérprete...');
        const pyodide = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
        });

        // 3. Configuración Base (Input y Salida)
        await pyodide.runPythonAsync(`
import sys
import js

# Redirigir stdout y stderr a JS
class JSPrinter:
    def write(self, text):
        if hasattr(js, 'handlePythonPrint'):
            js.handlePythonPrint(text)
    def flush(self):
        pass

if not isinstance(sys.stdout, JSPrinter):
    sys.stdout = JSPrinter()
    sys.stderr = JSPrinter()

# Sobreescribir input() para usar prompt del navegador
def input(p=""):
    return js.prompt(p) or ""

__builtins__.input = input
        `);

        // 4. Guardar referencia
        window.pyodide = pyodide;
        pyodideRef.current = pyodide;
        
        if (isMounted.current) {
          setPyodideReady(true);
          setLoadingProgress('');
        }

      } catch (err) {
        console.error("Error cargando Pyodide:", err);
        if (isMounted.current) {
          setLoadingProgress('Error de conexión. Revisa tu internet.');
        }
      } finally {
        if (isMounted.current) setPyodideLoading(false);
      }
    };

    initPyodide();

    return () => {
      isMounted.current = false;
    };
  }, []); // Se ejecuta una vez al montar

  // Auto-guardado
  useEffect(() => {
    if (onSave) onSave({ cells });
  }, [cells, onSave]);

  // Manejo de redimensionado
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingCellId && resizingRef.current) {
        const delta = e.clientY - resizingRef.current.startY;
        const newHeight = Math.min(1000, Math.max(100, resizingRef.current.startHeight + delta));
        setCells(prev => prev.map(c => c.id === resizingCellId ? { ...c, height: newHeight } : c));
      }
    };
    const handleMouseUp = () => {
      setResizingCellId(null);
      resizingRef.current = null;
      document.body.style.cursor = '';
    };
    if (resizingCellId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [resizingCellId]);

  // --- 2. EJECUCIÓN DE CÓDIGO (Solución al "se queda pensando") ---
  const runCell = async (cellId: string) => {
    if (!pyodideReady || !pyodideRef.current) {
      alert('Python aún se está iniciando. Por favor espera.');
      return;
    }

    const cellIndex = cells.findIndex(c => c.id === cellId);
    if (cellIndex === -1) return;
    const cell = cells[cellIndex];
    if (cell.type !== 'code') return;

    // Actualizar UI
    activeCellId.current = cellId;
    const updatedCells = [...cells];
    updatedCells[cellIndex] = { ...cell, status: 'running', output: [] };
    setCells(updatedCells);

    const runId = Date.now();
    executionRefs.current.set(cellId, runId);
    const startTime = Date.now();

    try {
      const pyodide = pyodideRef.current;

      // Detectar paquetes necesarios (NumPy, Pandas, etc.)
      await pyodide.loadPackagesFromImports(cell.content);

      // Si usa matplotlib, configurarlo antes
      if (cell.content.includes('matplotlib') || cell.content.includes('plt.')) {
         if (!loadedPackages.current.has('matplotlib')) {
             await pyodide.loadPackage('matplotlib');
             await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io, base64

def get_plot_base64():
    if plt.get_fignums():
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        return img_str
    return None

def show_custom(*args, **kwargs):
    if plt.get_fignums():
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        print(f"data:image/png;base64,{img_str}")
        plt.close()

plt.show = show_custom
             `);
             loadedPackages.current.add('matplotlib');
         }
      }

      // EJECUCIÓN PRINCIPAL
      const result = await pyodide.runPythonAsync(cell.content);

      // Capturar Gráficos
      const outputAdditions: string[] = [];
      if (loadedPackages.current.has('matplotlib')) {
        try {
            const plot = await pyodide.runPythonAsync('get_plot_base64()');
            if (plot && String(plot) !== 'None') {
                outputAdditions.push(`data:image/png;base64,${plot}`);
            }
        } catch (e) { /* Ignorar errores de graficación */ }
      }

      // Capturar Resultado final (última línea)
      if (result !== undefined && result !== null && String(result) !== 'None') {
        outputAdditions.push(`▶ ${result}`);
      }
      
      if (outputAdditions.length === 0 && (!updatedCells[cellIndex].output || updatedCells[cellIndex].output?.length === 0)) {
         outputAdditions.push('✓ Ejecutado');
      }

      const executionTime = Date.now() - startTime;

      if (isMounted.current && executionRefs.current.get(cellId) === runId) {
        setCells(prev => {
           const idx = prev.findIndex(c => c.id === cellId);
           if (idx === -1) return prev;
           const current = prev[idx];
           const finalOutput = [...(current.output || []), ...outputAdditions];
           
           const nextState = [...prev];
           nextState[idx] = { 
               ...current, 
               status: 'success', 
               output: finalOutput, 
               executionTime 
           };
           return nextState;
        });
      }

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(error);
      
      if (isMounted.current && executionRefs.current.get(cellId) === runId) {
          setCells(prev => {
            const idx = prev.findIndex(c => c.id === cellId);
            if (idx === -1) return prev;
            const current = prev[idx];
            const finalOutput = [...(current.output || []), `❌ Error: ${error.message || String(error)}`];
            
            const nextState = [...prev];
            nextState[idx] = { 
                ...current, 
                status: 'error', 
                output: finalOutput, 
                executionTime 
            };
            return nextState;
          });
      }
    }
  };

  const restartPython = () => {
     if (window.confirm("¿Reiniciar el entorno Python? Se perderán las variables definidas.")) {
         window.pyodide = null;
         pyodideRef.current = null;
         loadedPackages.current.clear();
         setPyodideReady(false);
         // Forzar recarga
         window.location.reload(); // En un entorno real, intentaríamos reinicializar sin reload, pero para Pyodide global reload es más seguro.
     }
  };

  // --- RESTO DE FUNCIONES DE UI ---
  const stopCell = (cellId: string) => {
    // Nota: Pyodide en el main thread NO se puede detener realmente si está en un bucle infinito.
    // Solo podemos dejar de escuchar la respuesta.
    executionRefs.current.set(cellId, 0);
    setCells(prev => prev.map(c => c.id === cellId ? { ...c, status: 'idle' } : c));
    alert("Nota: Si Python está en un bucle infinito, es posible que debas recargar la página.");
  };

  const runAllCells = async () => {
    for (const cell of cells) {
      if (cell.type === 'code') {
        await runCell(cell.id);
        await new Promise(r => setTimeout(r, 100));
      }
    }
  };

  const addCell = (type: CellType, afterId?: string) => {
    const newCell: Cell = {
      id: Date.now().toString(),
      type,
      content: type === 'code' ? '# Escribe tu código aquí\n' : '# Texto Markdown\n',
      status: 'idle',
      height: 400
    };
    if (afterId) {
      const idx = cells.findIndex(c => c.id === afterId);
      const newCells = [...cells];
      newCells.splice(idx + 1, 0, newCell);
      setCells(newCells);
    } else {
      setCells([...cells, newCell]);
    }
    setSelectedCell(newCell.id);
  };

  const deleteCell = (id: string) => setCells(cells.filter(c => c.id !== id));
  
  const updateCellContent = (id: string, content: string) => {
      setCells(prev => prev.map(c => c.id === id ? { ...c, content } : c));
  };

  const moveCell = (id: string, direction: 'up' | 'down') => {
      const idx = cells.findIndex(c => c.id === id);
      if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === cells.length - 1)) return;
      const newCells = [...cells];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newCells[idx], newCells[swapIdx]] = [newCells[swapIdx], newCells[idx]];
      setCells(newCells);
  };

  const startResize = (e: React.MouseEvent, cellId: string, currentHeight: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCellId(cellId);
    resizingRef.current = { startY: e.clientY, startHeight: currentHeight };
  };

  const renderMarkdown = (content: string) => {
    return content
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded font-mono text-sm">$1</code>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className={`h-full w-full flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}>
      
      {/* Toolbar */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                pyodideReady 
                ? darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                : darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
            }`}>
                {pyodideReady ? <CheckCircle2 className="w-3 h-3"/> : <Loader2 className="w-3 h-3 animate-spin"/>}
                <span>{pyodideReady ? 'Python Listo' : 'Cargando Motor...'}</span>
            </div>
            {loadingProgress && <span className="text-xs opacity-70">{loadingProgress}</span>}
        </div>

        <div className="flex gap-2">
           <button onClick={() => addCell('code')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
             <Plus className="w-4 h-4"/> <Code className="w-4 h-4"/>
           </button>
           <button onClick={() => addCell('markdown')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'}`}>
             <Plus className="w-4 h-4"/> <Type className="w-4 h-4"/>
           </button>
           <button onClick={runAllCells} disabled={!pyodideReady} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${darkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50' : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50'}`}>
             <Play className="w-4 h-4"/> Ejecutar Todo
           </button>
           <button onClick={restartPython} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`} title="Reiniciar Python (Recarga página)">
             <RefreshCw className="w-4 h-4"/>
           </button>
           <button onClick={() => setCells([])} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-700 hover:bg-red-900/50 text-white' : 'bg-gray-200 hover:bg-red-100 text-gray-800'}`}>
             <Trash2 className="w-4 h-4"/>
           </button>
        </div>
      </div>

      {/* Cells Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {cells.map((cell, index) => (
          <div key={cell.id} 
               onClick={() => setSelectedCell(cell.id)}
               className={`group border rounded-lg overflow-hidden transition-all ${
                 selectedCell === cell.id 
                 ? (darkMode ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-blue-400 shadow-lg shadow-blue-400/20')
                 : (darkMode ? 'border-slate-700 hover:border-slate-600' : 'border-gray-200 hover:border-gray-300')
               } ${darkMode ? 'bg-slate-800' : 'bg-white'}`}
          >
            {/* Cell Header */}
            <div className={`flex items-center justify-between px-3 py-2 border-b ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <GripVertical className={`w-4 h-4 ${darkMode ? 'text-slate-600' : 'text-gray-400'}`} />
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${cell.type === 'code' ? (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700') : (darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700')}`}>
                  {cell.type === 'code' ? 'Código' : 'Texto'}
                </span>
                {cell.executionTime !== undefined && <span className="text-xs opacity-50">{cell.executionTime}ms</span>}
                {cell.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-500"/>}
                {cell.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500"/>}
                {cell.status === 'error' && <XCircle className="w-4 h-4 text-red-500"/>}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); moveCell(cell.id, 'up'); }} disabled={index===0} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"><ChevronUp className="w-4 h-4"/></button>
                <button onClick={(e) => { e.stopPropagation(); moveCell(cell.id, 'down'); }} disabled={index===cells.length-1} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"><ChevronDown className="w-4 h-4"/></button>
                {cell.type === 'code' && (
                  cell.status === 'running' 
                  ? <button onClick={(e) => { e.stopPropagation(); stopCell(cell.id); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded"><Square className="w-4 h-4 fill-current"/></button>
                  : <button onClick={(e) => { e.stopPropagation(); runCell(cell.id); }} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-500 rounded"><Play className="w-4 h-4"/></button>
                )}
                <button onClick={(e) => { e.stopPropagation(); addCell('code', cell.id); }} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"><Plus className="w-4 h-4"/></button>
                <button onClick={(e) => { e.stopPropagation(); deleteCell(cell.id); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded"><X className="w-4 h-4"/></button>
              </div>
            </div>

            {/* Content */}
            {cell.type === 'code' ? (
              <>
                 <div className="relative flex flex-col">
                    <div className="relative flex-1">
                        <div ref={(el) => { if(el) lineNumbersRefs.current.set(cell.id, el); }} 
                             className={`absolute left-0 top-0 bottom-0 w-12 pt-3 text-right pr-3 font-mono select-none overflow-hidden ${darkMode ? 'bg-slate-900 text-slate-600' : 'bg-white text-gray-400'}`}
                             style={{ fontSize: `${Math.max(12, 16 * (zoomLevel / 100))}px`, lineHeight: `${Math.max(12, 16 * (zoomLevel / 100)) * 1.5}px` }}>
                             {cell.content.split('\n').map((_,i) => <div key={i}>{i+1}</div>)}
                        </div>
                        <textarea 
                             value={cell.content}
                             onChange={(e) => updateCellContent(cell.id, e.target.value)}
                             onScroll={(e) => { const n = lineNumbersRefs.current.get(cell.id); if(n) n.scrollTop = e.currentTarget.scrollTop; }}
                             onKeyDown={(e) => {
                                 if(e.key === 'Tab') {
                                     e.preventDefault();
                                     const t = e.currentTarget;
                                     const s = t.selectionStart, end = t.selectionEnd;
                                     updateCellContent(cell.id, cell.content.substring(0,s) + '    ' + cell.content.substring(end));
                                     setTimeout(() => { t.selectionStart = t.selectionEnd = s+4; }, 0);
                                 }
                                 if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runCell(cell.id); }
                             }}
                             spellCheck={false}
                             className={`w-full pl-16 pr-4 py-3 font-mono resize-none focus:outline-none ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}
                             style={{ tabSize: 4, height: cell.height ? `${cell.height}px` : '300px', fontSize: `${Math.max(12, 16 * (zoomLevel / 100))}px`, lineHeight: `${Math.max(12, 16 * (zoomLevel / 100)) * 1.5}px` } as any}
                        />
                    </div>
                    <div onMouseDown={(e) => startResize(e, cell.id, cell.height || 300)} className={`h-4 flex items-center justify-center cursor-row-resize hover:bg-blue-500/10 border-t ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
                       <GripHorizontal className={`w-8 h-4 ${darkMode ? 'text-slate-600' : 'text-gray-400'}`} />
                    </div>
                 </div>
                 
                 {/* Output Area */}
                 {cell.output && cell.output.length > 0 && (
                     <div className={`border-t px-4 py-3 overflow-x-auto ${darkMode ? 'border-slate-700 bg-slate-950' : 'border-gray-200 bg-gray-50'}`}>
                         <div className="font-mono space-y-1" style={{ fontSize: '13px' }}>
                             {cell.output.map((line, i) => (
                                 <div key={i} className={line.startsWith('❌') ? 'text-red-500' : line.startsWith('✓') ? 'text-emerald-500' : darkMode ? 'text-slate-300' : 'text-gray-700'}>
                                     {line.startsWith('data:image') 
                                        ? <img src={line} alt="Gráfico" className="bg-white p-2 rounded max-w-full"/> 
                                        : line}
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
              </>
            ) : (
                <div className="p-4">
                    {selectedCell === cell.id ? (
                        <textarea value={cell.content} onChange={(e) => updateCellContent(cell.id, e.target.value)} className={`w-full p-3 rounded border font-mono text-sm resize-none focus:outline-none min-h-[100px] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="Markdown..."/>
                    ) : (
                        <div className={`prose max-w-none ${darkMode ? 'prose-invert' : ''}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.content) }}/>
                    )}
                </div>
            )}
          </div>
        ))}

        {!pyodideReady && !pyodideLoading && (
            <div className="text-center p-10 opacity-50">Inicializando Python...</div>
        )}
      </div>
    </div>
  );
}