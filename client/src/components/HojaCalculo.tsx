import React, { useState, useEffect } from 'react';
import { Download, Upload, Plus, Trash2 } from 'lucide-react';

interface HojaCalculoProps {
  darkMode: boolean;
  onSave?: (data: any) => void;
}

interface Cell {
  value: string;
  formula?: string;
}

export default function HojaCalculo({ darkMode, onSave }: HojaCalculoProps) {
  const [rows, setRows] = useState(15);
  const [cols, setCols] = useState(10);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);

  // Generar letras de columnas (A, B, C, ...)
  const getColumnLabel = (index: number): string => {
    let label = '';
    let num = index;
    while (num >= 0) {
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26) - 1;
    }
    return label;
  };

  const getCellId = (row: number, col: number) => `${getColumnLabel(col)}${row + 1}`;

  const getCellValue = (cellId: string): string => {
    const cell = cells[cellId];
    if (!cell) return '';
    
    // Si tiene fórmula, evaluarla
    if (cell.formula) {
      try {
        return evaluateFormula(cell.formula);
      } catch {
        return '#ERROR';
      }
    }
    
    return cell.value;
  };

  const evaluateFormula = (formula: string): string => {
    // Fórmulas básicas: =A1+B1, =SUM(A1:A5), etc.
    if (!formula.startsWith('=')) return formula;
    
    const expr = formula.substring(1);
    
    // SUM
    if (expr.toUpperCase().startsWith('SUM(')) {
      const match = expr.match(/SUM\(([A-Z]+\d+):([A-Z]+\d+)\)/i);
      if (match) {
        const [_, start, end] = match;
        const sum = getRangeSum(start, end);
        return sum.toString();
      }
    }
    
    // AVG
    if (expr.toUpperCase().startsWith('AVG(')) {
      const match = expr.match(/AVG\(([A-Z]+\d+):([A-Z]+\d+)\)/i);
      if (match) {
        const [_, start, end] = match;
        const values = getRangeValues(start, end);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return avg.toFixed(2);
      }
    }
    
    // Operaciones simples: =A1+B1
    let evalExpr = expr;
    Object.keys(cells).forEach(cellId => {
      const value = cells[cellId].value || '0';
      evalExpr = evalExpr.replace(new RegExp(cellId, 'g'), value);
    });
    
    try {
      // eslint-disable-next-line no-eval
      return eval(evalExpr).toString();
    } catch {
      return '#ERROR';
    }
  };

  const getRangeValues = (start: string, end: string): number[] => {
    const values: number[] = [];
    const startCol = start.match(/[A-Z]+/)?.[0] || 'A';
    const startRow = parseInt(start.match(/\d+/)?.[0] || '1');
    const endRow = parseInt(end.match(/\d+/)?.[0] || '1');
    
    for (let r = startRow; r <= endRow; r++) {
      const cellId = `${startCol}${r}`;
      const val = parseFloat(cells[cellId]?.value || '0');
      if (!isNaN(val)) values.push(val);
    }
    
    return values;
  };

  const getRangeSum = (start: string, end: string): number => {
    return getRangeValues(start, end).reduce((a, b) => a + b, 0);
  };

  const handleCellChange = (cellId: string, value: string) => {
    const newCells = { ...cells };
    
    if (value.startsWith('=')) {
      newCells[cellId] = { value: '', formula: value };
    } else {
      newCells[cellId] = { value };
    }
    
    setCells(newCells);
    
    if (onSave) {
      onSave({ cells: newCells, rows, cols });
    }
  };

  const exportToCSV = () => {
    let csv = '';
    for (let r = 0; r < rows; r++) {
      const row: string[] = [];
      for (let c = 0; c < cols; c++) {
        const cellId = getCellId(r, c);
        row.push(getCellValue(cellId) || '');
      }
      csv += row.join(',') + '\n';
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hoja-calculo.csv';
    a.click();
  };

  const addRow = () => setRows(rows + 1);
  const addColumn = () => setCols(cols + 1);

  return (
    <div className={`h-full w-full flex flex-col ${
      darkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'
    }`}>
      
      {/* Toolbar */}
      <div className={`flex items-center gap-2 p-3 border-b ${
        darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
      }`}>
        <button
          onClick={addRow}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            darkMode 
              ? 'bg-blue-600 hover:bg-blue-500 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          Fila
        </button>
        
        <button
          onClick={addColumn}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            darkMode 
              ? 'bg-blue-600 hover:bg-blue-500 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          Columna
        </button>

        <div className="flex-1"></div>

        <button
          onClick={exportToCSV}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            darkMode 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Formula Bar */}
      {selectedCell && (
        <div className={`flex items-center gap-3 p-3 border-b ${
          darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <span className="font-mono font-bold text-sm">{selectedCell}</span>
          <input
            type="text"
            value={cells[selectedCell]?.formula || cells[selectedCell]?.value || ''}
            onChange={(e) => handleCellChange(selectedCell, e.target.value)}
            className={`flex-1 px-3 py-1.5 rounded border font-mono text-sm ${
              darkMode
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="Escribe un valor o =formula"
          />
        </div>
      )}

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`sticky top-0 left-0 z-20 w-12 border ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-300'
              }`}></th>
              {Array.from({ length: cols }).map((_, c) => (
                <th
                  key={c}
                  className={`sticky top-0 z-10 min-w-[100px] p-2 text-center font-bold text-sm border ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  {getColumnLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                <td className={`sticky left-0 z-10 w-12 p-2 text-center font-bold text-sm border ${
                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-300'
                }`}>
                  {r + 1}
                </td>
                {Array.from({ length: cols }).map((_, c) => {
                  const cellId = getCellId(r, c);
                  const isSelected = selectedCell === cellId;
                  const isEditing = editingCell === cellId;
                  
                  return (
                    <td
                      key={cellId}
                      className={`min-w-[100px] p-0 border ${
                        darkMode ? 'border-slate-700' : 'border-gray-300'
                      } ${isSelected ? (darkMode ? 'ring-2 ring-blue-500' : 'ring-2 ring-blue-400') : ''}`}
                      onClick={() => setSelectedCell(cellId)}
                      onDoubleClick={() => setEditingCell(cellId)}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          autoFocus
                          value={cells[cellId]?.formula || cells[cellId]?.value || ''}
                          onChange={(e) => handleCellChange(cellId, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingCell(null);
                          }}
                          className={`w-full h-full px-2 py-1 border-0 outline-none font-mono text-sm ${
                            darkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'
                          }`}
                        />
                      ) : (
                        <div className={`px-2 py-1 font-mono text-sm ${
                          cells[cellId]?.formula ? 'text-blue-500' : ''
                        }`}>
                          {getCellValue(cellId)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}