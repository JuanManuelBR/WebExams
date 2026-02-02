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
  LayoutTemplate,
  RefreshCw,
  Eye,
  EyeOff,
  Square
} from 'lucide-react';

interface EditorJavaScriptProps {
  darkMode: boolean;
  onSave?: (data: any) => void;
  initialCells?: Cell[];
  zoomLevel?: number;
}

type CellType = 'code' | 'markdown' | 'html';
type CellStatus = 'idle' | 'running' | 'success' | 'error';

interface Cell {
  id: string;
  type: CellType;
  content: string;
  output?: string[];
  status: CellStatus;
  executionTime?: number;
  height?: number;
  hasActiveTimers?: boolean;
}

export default function EditorJavaScript({ darkMode, onSave, initialCells, zoomLevel = 100 }: EditorJavaScriptProps) {
  const [cells, setCells] = useState<Cell[]>(initialCells || []);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lineNumbersRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [showPreview, setShowPreview] = useState(true);
  const iframeReadyRef = useRef(false);
  const isMounted = useRef(true);
  const [isReady, setIsReady] = useState(false);
  
  // Estado para redimensionar celdas
  const [resizingCellId, setResizingCellId] = useState<string | null>(null);
  const resizingRef = useRef<{ startY: number, startHeight: number } | null>(null);

  // Inicializar Iframe (Sandbox)
  useEffect(() => {
    isMounted.current = true;
    let timeoutId: any;
    
    const init = () => {
      if (!isMounted.current) return;
      // Verificamos que el iframe exista y tenga contentWindow
      if (iframeRef.current && iframeRef.current.contentWindow) {
        resetEnvironment();
      } else {
        timeoutId = setTimeout(init, 200); // Reintento un poco más lento
      }
    };
    
    // Damos un pequeño respiro al renderizado inicial antes de inyectar
    timeoutId = setTimeout(init, 300);
    
    return () => { 
      clearTimeout(timeoutId); 
      isMounted.current = false; 
    };
  }, []);

  const resetEnvironment = () => {
    if (!iframeRef.current) return;
    
    iframeReadyRef.current = false;
    setIsReady(false);
    
    // Detener visualmente todas las celdas al reiniciar el entorno
    setCells(prev => prev.map(c => ({ ...c, status: 'idle', hasActiveTimers: false })));

    // Forzar limpieza
    iframeRef.current.srcdoc = '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: sans-serif; 
              padding: 0; 
              margin: 0; 
              color: ${darkMode ? '#e2e8f0' : '#1e293b'}; 
              background-color: ${darkMode ? '#0f172a' : '#ffffff'}; 
              width: 100%;
              height: 100vh;
            }
            canvas { display: block; max-width: 100%; }
            img, video { max-width: 100%; height: auto; }
            
            /* Scrollbars estilo ExamSolver */
            ::-webkit-scrollbar { width: 10px; height: 10px; }
            ::-webkit-scrollbar-track { background: ${darkMode ? '#0f172a' : '#f1f5f9'}; }
            ::-webkit-scrollbar-thumb { background: ${darkMode ? '#334155' : '#cbd5e1'}; border-radius: 5px; border: 2px solid ${darkMode ? '#0f172a' : '#f1f5f9'}; }
            ::-webkit-scrollbar-thumb:hover { background: ${darkMode ? '#475569' : '#94a3b8'}; }
          </style>
          <script>
            let currentCellId = null;
            
            // Función segura para enviar mensajes al padre
            function sendToParent(data) {
                try {
                    window.parent.postMessage(data, '*');
                } catch(e) {
                    console.error("Error enviando mensaje al host:", e);
                }
            }

            // Interceptar consola
            window.console = {
              log: (...args) => sendToParent({ type: 'log', cellId: currentCellId, args: [args.map(String).join(' ')] }),
              error: (...args) => sendToParent({ type: 'error', cellId: currentCellId, args: [args.map(String).join(' ')] }),
              warn: (...args) => sendToParent({ type: 'warn', cellId: currentCellId, args: [args.map(String).join(' ')] }),
              info: (...args) => sendToParent({ type: 'info', cellId: currentCellId, args: [args.map(String).join(' ')] }),
              clear: () => sendToParent({ type: 'clear', cellId: currentCellId })
            };
            
            window.onerror = function(msg, url, line) {
              sendToParent({ type: 'error', cellId: currentCellId, args: [msg] });
            };

            // --- GESTIÓN DE TIMERS ---
            const cellTimers = new Map(); 
            const cellAnimationFrames = new Map();
            const cellEventListeners = new Map(); // Rastrear eventos por celda
            
            function updateActiveState(cellId, isActive) {
                 sendToParent({ type: 'state_change', cellId, active: isActive });
            }

            // Interceptar addEventListener para limpieza automática
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

            EventTarget.prototype.addEventListener = function(type, listener, options) {
                if (currentCellId) {
                    if (!cellEventListeners.has(currentCellId)) {
                        cellEventListeners.set(currentCellId, new Set());
                    }
                    // Guardamos referencia para borrarla luego
                    cellEventListeners.get(currentCellId).add({ target: this, type, listener, options });
                }
                return originalAddEventListener.call(this, type, listener, options);
            };

            EventTarget.prototype.removeEventListener = function(type, listener, options) {
                if (currentCellId && cellEventListeners.has(currentCellId)) {
                    const listeners = cellEventListeners.get(currentCellId);
                    for (const record of listeners) {
                        if (record.target === this && record.type === type && record.listener === listener) {
                            listeners.delete(record);
                            break;
                        }
                    }
                }
                return originalRemoveEventListener.call(this, type, listener, options);
            };

            function registerTimer(id, cellId) {
                if (!cellId) return;
                if (!cellTimers.has(cellId)) {
                    cellTimers.set(cellId, new Set());
                    updateActiveState(cellId, true);
                }
                cellTimers.get(cellId).add(id);
            }

            function registerAnimationFrame(id, cellId) {
                if (!cellId) return;
                if (!cellAnimationFrames.has(cellId)) {
                    cellAnimationFrames.set(cellId, new Set());
                    updateActiveState(cellId, true);
                }
                cellAnimationFrames.get(cellId).add(id);
            }

            const originalSetInterval = window.setInterval;
            window.setInterval = (handler, timeout, ...args) => {
                const capturedCellId = currentCellId;
                const wrapper = (...wArgs) => {
                    const prev = currentCellId;
                    currentCellId = capturedCellId;
                    try {
                        if (typeof handler === 'function') handler(...wArgs);
                        else window.eval(handler);
                    } finally {
                        currentCellId = prev;
                    }
                };
                const id = originalSetInterval(wrapper, timeout, ...args);
                registerTimer(id, capturedCellId);
                return id;
            };
            
            const originalSetTimeout = window.setTimeout;
            window.setTimeout = (handler, timeout, ...args) => {
                const capturedCellId = currentCellId;
                const wrapper = (...wArgs) => {
                    const prev = currentCellId;
                    currentCellId = capturedCellId;
                    try {
                        if (typeof handler === 'function') handler(...wArgs);
                        else window.eval(handler);
                    } finally {
                        currentCellId = prev;
                    }
                };
                const id = originalSetTimeout(wrapper, timeout, ...args);
                registerTimer(id, capturedCellId);
                return id;
            };

            const originalRequestAnimationFrame = window.requestAnimationFrame;
            window.requestAnimationFrame = (callback) => {
                const capturedCellId = currentCellId;
                let id;
                const wrapper = (timestamp) => {
                    const prev = currentCellId;
                    currentCellId = capturedCellId;
                    try {
                        if (capturedCellId && cellAnimationFrames.has(capturedCellId)) {
                            cellAnimationFrames.get(capturedCellId).delete(id);
                        }
                        callback(timestamp);
                    } finally {
                        currentCellId = prev;
                    }
                };
                id = originalRequestAnimationFrame(wrapper);
                registerAnimationFrame(id, capturedCellId);
                return id;
            };

            function clearCellTimers(cellId) {
                if (cellTimers.has(cellId)) {
                    cellTimers.get(cellId).forEach(id => {
                        window.clearInterval(id);
                        window.clearTimeout(id);
                    });
                    cellTimers.get(cellId).clear();
                    cellTimers.delete(cellId);
                }
                if (cellAnimationFrames.has(cellId)) {
                    cellAnimationFrames.get(cellId).forEach(id => {
                        window.cancelAnimationFrame(id);
                    });
                    cellAnimationFrames.get(cellId).clear();
                    cellAnimationFrames.delete(cellId);
                }
                // Limpiar Event Listeners (Teclado, Mouse, etc.)
                if (cellEventListeners.has(cellId)) {
                    cellEventListeners.get(cellId).forEach(({ target, type, listener, options }) => {
                        try {
                            originalRemoveEventListener.call(target, type, listener, options);
                        } catch(e) { console.error("Error limpiando evento:", e); }
                    });
                    cellEventListeners.get(cellId).clear();
                    cellEventListeners.delete(cellId);
                }
                updateActiveState(cellId, false);
            }

            window.process = { 
                stdin: { on: () => {} }, 
                stdout: { write: (msg) => console.log(msg) },
                argv: [],
                env: {}
            };

            window.require = function(module) {
                if (module === 'readline') return { createInterface: () => ({ question: (q,c) => c(prompt(q)||""), on:()=>{}, close:()=>{} }) };
                throw new Error("Módulo '" + module + "' no soportado en navegador");
            };

            // Notificar que estamos listos
            window.onload = function() {
              sendToParent({ type: 'system_ready' });
            };

            // Listener de ejecución
            window.addEventListener('message', async (event) => {
              const { type, content, cellId } = event.data;
              
              if (type === 'stop') {
                  clearCellTimers(cellId);
                  const existingContainer = document.getElementById('cell-container-' + cellId);
                  if (existingContainer) existingContainer.remove();
                  return;
              }

              if (type === 'js' || type === 'html') {
                  clearCellTimers(cellId);
                  const existingContainer = document.getElementById('cell-container-' + cellId);
                  if (existingContainer) existingContainer.remove();
              }

              currentCellId = cellId;
              
              try {
                if (type === 'html') {
                  const cellContainer = document.createElement('div');
                  cellContainer.id = 'cell-container-' + cellId;
                  document.body.appendChild(cellContainer);
                  
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(content, 'text/html');
                  
                  // Inyectar Estilos del Head (CSS del usuario)
                  Array.from(doc.head.childNodes).forEach(node => {
                      if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
                          document.head.appendChild(node.cloneNode(true));
                      }
                  });

                  // Inyectar HTML
                  Array.from(doc.body.childNodes).forEach(node => {
                    cellContainer.appendChild(node.cloneNode(true));
                  });
                  
                  // Ejecutar scripts dentro del HTML
                  const scripts = doc.getElementsByTagName('script');
                  for (let script of scripts) {
                      if (!script.src) {
                          try { window.eval(script.innerText); } 
                          catch (e) { sendToParent({ type: 'error', args: [e.toString()] }); }
                      } else {
                          const s = document.createElement('script');
                          s.src = script.src;
                          document.head.appendChild(s);
                      }
                  }
                  sendToParent({ type: 'success', cellId });
                } 
                else if (type === 'js') {
                  if (content.trim().startsWith('<')) throw new Error("⚠️ Error: Parece código HTML en celda JS.");
                  
                  const result = window.eval(content);
                  sendToParent({ 
                    type: 'success', 
                    cellId, 
                    result: result !== undefined ? String(result) : undefined 
                  });
                }
              } catch (err) {
                sendToParent({ type: 'exec_error', cellId, error: err.toString() });
              }
            });
          </script>
        </head>
        <body></body>
      </html>
    `;

    // Usamos setTimeout para asegurar que React y el navegador procesen el cambio
    setTimeout(() => {
      if (isMounted.current && iframeRef.current) {
        iframeRef.current.srcdoc = htmlContent;
      }
    }, 50);
  };

  // Escuchar mensajes del iframe
  useEffect(() => {
    let animationFrameId: number;
    const pendingMessages: any[] = [];
    let isProcessing = false;

    const processMessages = () => {
      if (!isMounted.current) return;
      if (pendingMessages.length === 0) {
        isProcessing = false;
        return;
      }

      const batch = pendingMessages.splice(0);

      setCells(prevCells => {
        let nextCells = [...prevCells];
        let hasChanges = false;

        batch.forEach(data => {
            const { type, cellId, args, result, error } = data;
            
            if (type === 'system_ready') {
                iframeReadyRef.current = true;
                setIsReady(true);
                return;
            }

            if (type === 'state_change') {
                 nextCells = nextCells.map(c => c.id === cellId ? { ...c, hasActiveTimers: args?.active ?? data.active } : c);
                 hasChanges = true;
                 return;
            }

            if (!cellId) return;

            const cellIndex = nextCells.findIndex(c => c.id === cellId);
            if (cellIndex === -1) return;
            
            const cell = { ...nextCells[cellIndex] };
            const newOutput = [...(cell.output || [])];

            if (type === 'clear') {
                cell.output = [];
                nextCells[cellIndex] = cell;
                hasChanges = true;
                return;
            }
            
            if (type === 'log') newOutput.push(...args);
            if (type === 'error' || type === 'exec_error') newOutput.push(`❌ ${error || args.join(' ')}`);
            if (type === 'warn') newOutput.push(`⚠️ ${args.join(' ')}`);
            if (type === 'success' && result) newOutput.push(`▶ ${result}`);
            if (type === 'success' && !result && newOutput.length === 0) newOutput.push('✓ Ejecutado');

            if (newOutput.length > 500) {
                newOutput.splice(0, newOutput.length - 500);
                if (newOutput[0] !== '... (salida truncada)') newOutput.unshift('... (salida truncada)');
            }

            cell.output = newOutput;
            if (type === 'exec_error') cell.status = 'error';
            else if (type === 'success') cell.status = 'success';
            
            if (onSave) onSave({ cells: nextCells });
            nextCells[cellIndex] = cell;
            hasChanges = true;
        });

        return hasChanges ? nextCells : prevCells;
      });

      animationFrameId = requestAnimationFrame(processMessages);
    };

    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      pendingMessages.push(e.data);
      
      if (!isProcessing) {
          isProcessing = true;
          animationFrameId = requestAnimationFrame(processMessages);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
        window.removeEventListener('message', handleMessage);
        cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Efecto para redimensionado
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

  const runCell = async (cellId: string) => {
    const cellIndex = cells.findIndex(c => c.id === cellId);
    if (cellIndex === -1) return;
    const cell = cells[cellIndex];
    if (cell.type === 'markdown') return;

    // --- VALIDACIÓN DE CÓDIGO ANTES DE EJECUTAR ---
    if (cell.type === 'code') {
        const code = cell.content.trim();
        let errorMsg = null;

        // Detectar HTML en celda JS
        if (code.startsWith('<') && code.includes('>')) {
            errorMsg = "⚠️ Error: Estás intentando ejecutar código HTML en una celda de JavaScript. Cambia el tipo de celda a 'HTML'.";
        }
        // Detectar Python
        else if (/^(def\s+|import\s+|from\s+.*import|print\s*\(.*\)|class\s+.*:)/m.test(code) && !code.includes('console.log') && !code.includes('function')) {
            errorMsg = "⚠️ Error: Parece código Python. Este es el editor de JavaScript.";
        }
        // Detectar Java/C++
        else if (code.includes('public static void') || code.includes('#include') || code.includes('System.out.println')) {
            errorMsg = "⚠️ Error: Parece código Java o C++. Este editor solo soporta JavaScript.";
        }

        if (errorMsg) {
            const updatedCells = [...cells];
            updatedCells[cellIndex] = { 
                ...cell, 
                status: 'error', 
                output: [`❌ ${errorMsg}`] 
            };
            setCells(updatedCells);
            return; // Detener ejecución
        }
    } else if (cell.type === 'html') {
        const code = cell.content.trim();
        // Detectar intento de escribir JS sin etiquetas <script> en celda HTML
        if (!code.includes('<') && (code.includes('alert(') || code.includes('console.') || code.includes('document.') || code.includes('window.') || code.includes('var ') || code.includes('let ') || code.includes('const ') || code.includes('function '))) {
            const updatedCells = [...cells];
            updatedCells[cellIndex] = { 
                ...cell, 
                status: 'error', 
                output: ["⚠️ Error: En una celda HTML, el código JavaScript debe ir dentro de etiquetas <script>.\n\nEjemplo:\n<script>\n  alert('Hola mundo');\n</script>"] 
            };
            setCells(updatedCells);
            return;
        }
    }

    const updatedCells = [...cells];
    updatedCells[cellIndex] = { ...cell, status: 'running', output: [] };
    setCells(updatedCells);

    // Esperar si el iframe no está listo (retry simple)
    if (!iframeReadyRef.current) {
        let attempts = 0;
        while(attempts < 20 && !iframeReadyRef.current) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
    }

    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: cell.type === 'html' ? 'html' : 'js',
        content: cell.content,
        cellId: cell.id
      }, '*');
    }
  };

  const stopCell = (cellId: string) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'stop', cellId }, '*');
    }
    setCells(prev => prev.map(c => c.id === cellId ? { ...c, status: 'idle', hasActiveTimers: false } : c));
  };

  const runAllCells = async () => {
    resetEnvironment();
    await new Promise(resolve => setTimeout(resolve, 500)); 
    for (const cell of cells) {
      if (cell.type !== 'markdown') {
        await runCell(cell.id);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  const addCell = (type: CellType, afterId?: string) => {
    const newCell: Cell = {
      id: Date.now().toString(),
      type,
      content: type === 'code' ? '// Código JS\n' : type === 'html' ? '\n<div></div>' : '# Texto\n',
      status: 'idle',
      height: 400
    };

    if (afterId) {
      const index = cells.findIndex(c => c.id === afterId);
      const newCells = [...cells];
      newCells.splice(index + 1, 0, newCell);
      setCells(newCells);
    } else {
      setCells([...cells, newCell]);
    }
    setSelectedCell(newCell.id);
  };

  const deleteCell = (cellId: string) => {
    setCells(cells.filter(c => c.id !== cellId));
  };

  const deleteAllCells = () => {
    setCells([]);
    resetEnvironment();
  };

  const updateCellContent = (cellId: string, content: string) => {
    const updatedCells = cells.map(c => c.id === cellId ? { ...c, content } : c);
    setCells(updatedCells);
    if (onSave) onSave({ cells: updatedCells });
  };

  const moveCellUp = (cellId: string) => {
    const index = cells.findIndex(c => c.id === cellId);
    if (index > 0) {
      const newCells = [...cells];
      [newCells[index - 1], newCells[index]] = [newCells[index], newCells[index - 1]];
      setCells(newCells);
    }
  };

  const moveCellDown = (cellId: string) => {
    const index = cells.findIndex(c => c.id === cellId);
    if (index < cells.length - 1) {
      const newCells = [...cells];
      [newCells[index], newCells[index + 1]] = [newCells[index + 1], newCells[index]];
      setCells(newCells);
    }
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
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-sm">$1</code>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className={`h-full w-full flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}>
      
      {/* Toolbar */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
            isReady 
              ? (darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
              : (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700')
          }`}>
            {isReady ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>JS Listo</span>
              </>
            ) : (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Cargando...</span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => addCell('code')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`} title="Agregar código">
            <Plus className="w-4 h-4" /> <Code className="w-4 h-4" />
          </button>
          <button onClick={() => addCell('html')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`} title="Agregar HTML">
            <Plus className="w-4 h-4" /> <LayoutTemplate className="w-4 h-4" />
          </button>
          <button onClick={() => addCell('markdown')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'}`} title="Agregar texto">
            <Plus className="w-4 h-4" /> <Type className="w-4 h-4" />
          </button>
          <button onClick={runAllCells} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${darkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`} title="Ejecutar todo">
            <Play className="w-4 h-4" /> Ejecutar Todo
          </button>
          <button onClick={() => setShowPreview(!showPreview)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`} title={showPreview ? "Ocultar Vista Previa" : "Mostrar Vista Previa"}>
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button onClick={resetEnvironment} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`} title="Reiniciar Entorno">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={deleteAllCells} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-700 hover:bg-red-900/50 text-white hover:text-red-400' : 'bg-gray-200 hover:bg-red-100 text-gray-800 hover:text-red-600'}`} title="Borrar todo">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Overlay de Carga Inicial */}
        {!isReady && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm transition-opacity duration-300">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Inicializando entorno seguro...</p>
                </div>
            </div>
        )}

        {/* Área de Celdas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {cells.map((cell, index) => (
          <div key={cell.id} className={`group border rounded-lg overflow-hidden transition-all ${selectedCell === cell.id ? (darkMode ? 'border-yellow-500 shadow-lg shadow-yellow-500/10' : 'border-yellow-400 shadow-lg shadow-yellow-400/20') : (darkMode ? 'border-slate-700 hover:border-slate-600' : 'border-gray-200 hover:border-gray-300')} ${darkMode ? 'bg-slate-800' : 'bg-white'}`} onClick={() => setSelectedCell(cell.id)}>
            
            {/* Header Celda */}
            <div className={`flex items-center justify-between px-3 py-2 border-b ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <GripVertical className={`w-4 h-4 ${darkMode ? 'text-slate-600' : 'text-gray-400'}`} />
                <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                  cell.type === 'code' ? (darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700') : 
                  cell.type === 'html' ? (darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700') :
                  (darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700')
                }`}>
                  {cell.type === 'code' ? 'JS' : cell.type === 'html' ? 'HTML' : 'Texto'}
                </div>
                {cell.executionTime !== undefined && <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>{cell.executionTime}ms</span>}
                {cell.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                {cell.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {cell.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); moveCellUp(cell.id); }} disabled={index === 0} className={`p-1 rounded transition-colors disabled:opacity-30 ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}><ChevronUp className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); moveCellDown(cell.id); }} disabled={index === cells.length - 1} className={`p-1 rounded transition-colors disabled:opacity-30 ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}><ChevronDown className="w-4 h-4" /></button>
                {cell.type !== 'markdown' && (
                  cell.status === 'running' || cell.hasActiveTimers ? (
                    <button onClick={(e) => { e.stopPropagation(); stopCell(cell.id); }} className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-100 text-red-600'}`} title="Detener">
                      <Square className="w-4 h-4 fill-current" />
                    </button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); runCell(cell.id); }} className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-emerald-900/30 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-600'}`} title="Ejecutar">
                      <Play className="w-4 h-4" />
                    </button>
                  )
                )}
                <button onClick={(e) => { e.stopPropagation(); addCell('code', cell.id); }} className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}><Plus className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); deleteCell(cell.id); }} className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-100 text-red-600'}`}><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Contenido */}
            {cell.type !== 'markdown' ? (
              <>
                <div className="relative flex flex-col">
                  <div className="relative flex-1">
                    {/* Números de línea */}
                    {cell.type === 'code' && (
                      <div 
                        ref={(el) => { if (el) lineNumbersRefs.current.set(cell.id, el); else lineNumbersRefs.current.delete(cell.id); }}
                        className={`absolute left-0 top-0 bottom-0 w-12 pt-3 text-right pr-3 font-mono select-none overflow-hidden ${darkMode ? 'bg-slate-900 text-slate-600' : 'bg-white text-gray-400'}`}
                        style={{ fontSize: `${Math.max(12, 16 * (zoomLevel / 100))}px`, lineHeight: `${Math.max(12, 16 * (zoomLevel / 100)) * 1.5}px` }}
                      >
                        {cell.content.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
                      </div>
                    )}
                    <textarea
                      value={cell.content}
                      onChange={(e) => updateCellContent(cell.id, e.target.value)}
                      onScroll={(e) => { const numbersDiv = lineNumbersRefs.current.get(cell.id); if (numbersDiv) numbersDiv.scrollTop = e.currentTarget.scrollTop; }}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          const target = e.currentTarget;
                          const start = target.selectionStart;
                          const end = target.selectionEnd;
                          const newContent = cell.content.substring(0, start) + '    ' + cell.content.substring(end);
                          updateCellContent(cell.id, newContent);
                          setTimeout(() => { target.selectionStart = target.selectionEnd = start + 4; }, 0);
                        }
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runCell(cell.id); }
                      }}
                      spellCheck={false}
                      className={`w-full ${cell.type === 'code' ? 'pl-16' : 'pl-4'} pr-4 py-3 font-mono resize-none focus:outline-none ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}
                      style={{ tabSize: 4, height: cell.height ? `${cell.height}px` : '400px', fontSize: `${Math.max(12, 16 * (zoomLevel / 100))}px`, lineHeight: `${Math.max(12, 16 * (zoomLevel / 100)) * 1.5}px` } as any}
                    />
                  </div>
                  <div className={`h-4 flex items-center justify-center cursor-row-resize hover:bg-blue-500/10 transition-colors border-t ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`} onMouseDown={(e) => startResize(e, cell.id, cell.height || 400)}>
                    <GripHorizontal className={`w-8 h-4 ${darkMode ? 'text-slate-600' : 'text-gray-400'}`} />
                  </div>
                </div>
                {cell.output && cell.output.length > 0 && (
                  <div className={`border-t px-4 py-3 overflow-x-auto ${darkMode ? 'border-slate-700 bg-slate-950' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="font-mono space-y-1" style={{ fontSize: `${Math.max(12, 14 * (zoomLevel / 100))}px`, lineHeight: `${Math.max(12, 14 * (zoomLevel / 100)) * 1.5}px` }}>
                      {cell.output.map((line, i) => (
                        <div key={i} className={`${line.startsWith('❌') ? 'text-red-500' : line.startsWith('⚠️') ? 'text-yellow-500' : line.startsWith('✓') ? 'text-emerald-500' : darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4">
                {selectedCell === cell.id ? (
                  <textarea value={cell.content} onChange={(e) => updateCellContent(cell.id, e.target.value)} className={`w-full p-3 rounded border font-mono text-sm resize-none focus:outline-none min-h-[100px] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="Escribe en Markdown..." />
                ) : (
                  <div className={`prose max-w-none ${darkMode ? 'prose-invert' : ''}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.content) }} />
                )}
              </div>
            )}
          </div>
        ))}
        </div>

        {/* Panel de Vista Previa (Iframe) */}
        <div 
          className={`flex flex-col transition-all duration-300 ease-in-out ${
            darkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
          }`}
          style={{
            width: showPreview ? '33.333333%' : '0px',
            opacity: showPreview ? 1 : 0,
            borderLeftWidth: showPreview ? '1px' : '0px',
            overflow: 'hidden'
          }}
        >
          <div className={`px-3 py-2 border-b text-xs font-bold uppercase tracking-wider flex justify-between items-center ${darkMode ? 'border-slate-700 text-slate-400' : 'border-gray-200 text-gray-500'}`}>
            <span>Vista Previa (DOM)</span>
            <div className="flex items-center gap-1">
              <button onClick={runAllCells} className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700`} title="Recargar y Ejecutar"><RefreshCw className="w-3 h-3" /></button>
              <button onClick={() => setShowPreview(false)} className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700`} title="Cerrar Vista"><X className="w-3 h-3" /></button>
            </div>
          </div>
          <div className={`flex-1 relative ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <iframe 
              ref={iframeRef}
              className="absolute inset-0 w-full h-full"
              sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
              title="Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}