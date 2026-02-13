import React, { useState, useEffect } from 'react';
import Editor from "@monaco-editor/react";
import { Play, Trash2, Plus, Code, Type, Terminal, Download, Copy, Eraser } from 'lucide-react';

interface EditorJavaProps {
  darkMode: boolean;
  initialCells: any[];
  onSave: (data: { cells: any[] }) => void;
  zoomLevel: number;
}

export default function EditorJava({ darkMode, initialCells, onSave, zoomLevel }: EditorJavaProps) {
  const [cells, setCells] = useState(initialCells);

  useEffect(() => {
    setCells(initialCells);
  }, [initialCells]);

  const updateCell = (id: string, content: string) => {
    const newCells = cells.map(cell => 
      cell.id === id ? { ...cell, content } : cell
    );
    setCells(newCells);
    onSave({ cells: newCells });
  };

  const addCell = (type: 'code' | 'markdown') => {
    const newCell = {
      id: Date.now().toString(),
      type,
      content: type === 'code' 
        ? 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hola Java!");\n    }\n}' 
        : '### Nueva nota',
      status: 'idle',
      output: ''
    };
    const newCells = [...cells, newCell];
    setCells(newCells);
    onSave({ cells: newCells });
  };

  const removeCell = (id: string) => {
    const newCells = cells.filter(c => c.id !== id);
    setCells(newCells);
    onSave({ cells: newCells });
  };

  const downloadCode = (content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "Main.java";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const clearConsole = (id: string) => {
    const newCells = cells.map(cell => 
      cell.id === id ? { ...cell, output: '' } : cell
    );
    setCells(newCells);
    onSave({ cells: newCells });
  };

  const runCell = (id: string) => {
    // Simulación de ejecución
    const newCells = cells.map(cell => {
      if (cell.id === id) {
        return {
          ...cell,
          status: 'success',
          output: 'Compilando Main.java...\nEjecutando...\n\nHola Java!\n\nProcess finished with exit code 0'
        };
      }
      return cell;
    });
    setCells(newCells);
    onSave({ cells: newCells });
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {cells.map((cell, index) => (
          <div 
            key={cell.id} 
            className={`rounded-xl border overflow-hidden transition-all ${
              darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white shadow-sm'
            }`}
          >
            {/* Header de la celda */}
            <div className={`flex items-center justify-between px-4 py-2 border-b ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  [{index + 1}]
                </span>
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  cell.type === 'code' 
                    ? (darkMode ? 'text-orange-400' : 'text-orange-600') 
                    : (darkMode ? 'text-slate-400' : 'text-slate-600')
                }`}>
                  {cell.type === 'code' ? <Code className="w-3 h-3" /> : <Type className="w-3 h-3" />}
                  {cell.type === 'code' ? 'Java' : 'Texto'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {cell.type === 'code' && (
                  <button
                    onClick={() => downloadCode(cell.content)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      darkMode 
                        ? 'hover:bg-blue-500/20 text-blue-400' 
                        : 'hover:bg-blue-100 text-blue-600'
                    }`}
                    title="Descargar .java"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                {cell.type === 'code' && (
                  <button
                    onClick={() => copyToClipboard(cell.content)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      darkMode 
                        ? 'hover:bg-purple-500/20 text-purple-400' 
                        : 'hover:bg-purple-100 text-purple-600'
                    }`}
                    title="Copiar código"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
                {cell.type === 'code' && (
                  <button
                    onClick={() => runCell(cell.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      darkMode 
                        ? 'hover:bg-green-500/20 text-green-400' 
                        : 'hover:bg-green-100 text-green-600'
                    }`}
                    title="Ejecutar código"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => removeCell(cell.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    darkMode 
                      ? 'hover:bg-red-500/20 text-red-400' 
                      : 'hover:bg-red-100 text-red-600'
                  }`}
                  title="Eliminar celda"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Área de edición */}
            <div className="relative">
              {cell.type === 'code' ? (
                <Editor
                  height="200px"
                  defaultLanguage="java"
                  theme={darkMode ? "vs-dark" : "light"}
                  value={cell.content}
                  onChange={(val: string | undefined) => updateCell(cell.id, val || '')}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14 * (zoomLevel / 100),
                    fontFamily: "'Fira Code', 'Consolas', monospace",
                    fontLigatures: true,
                    padding: { top: 16, bottom: 16 },
                  }}
                />
              ) : (
                <textarea
                  value={cell.content}
                  onChange={(e) => updateCell(cell.id, e.target.value)}
                  className={`w-full p-4 bg-transparent outline-none resize-y min-h-[100px] ${
                    darkMode ? 'text-slate-200 placeholder-slate-600' : 'text-slate-800 placeholder-gray-400'
                  }`}
                  placeholder="Escribe tus notas aquí..."
                  style={{ fontSize: `${14 * (zoomLevel / 100)}px` }}
                />
              )}
            </div>

            {/* Salida de consola (Fake) */}
            {cell.type === 'code' && cell.output && (
              <div className={`border-t p-4 font-mono text-sm ${
                darkMode ? 'border-slate-700 bg-black/40 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-800'
              }`}>
                <div className="flex items-center justify-between mb-2 opacity-50">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3 h-3" />
                    <span className="text-xs uppercase font-bold">Consola</span>
                  </div>
                  <button 
                    onClick={() => clearConsole(cell.id)}
                    className="hover:text-red-500 transition-colors"
                    title="Limpiar consola"
                  >
                    <Eraser className="w-3 h-3" />
                  </button>
                </div>
                <pre className="whitespace-pre-wrap">{cell.output}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Barra de herramientas inferior */}
      <div className={`p-4 border-t flex gap-3 ${
        darkMode ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'
      }`}>
        <button
          onClick={() => addCell('code')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            darkMode 
              ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-900/20' 
              : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Código Java</span>
        </button>
        <button
          onClick={() => addCell('markdown')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            darkMode 
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' 
              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>Texto</span>
        </button>
      </div>
    </div>
  );
}