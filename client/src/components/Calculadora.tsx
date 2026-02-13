import React, { useState, useEffect, useRef } from 'react';
import {
  Delete, Divide, X, Minus, Plus, Equal,
  RotateCcw,
  Calculator as CalcIcon, FlaskConical,
  MessageSquare
} from 'lucide-react';
import { evaluate, format, derivative, simplify, rationalize } from 'mathjs';

interface CalculadoraProps {
  darkMode: boolean;
  initialState?: any;
  onSave?: (data: any) => void;
}

// Helper para factorización de números primos
const primeFactors = (n: number): string => {
  if (!Number.isInteger(n)) return n.toString();
  if (n < 2) return n.toString();
  const factors: number[] = [];
  let d = 2;
  let temp = n;
  while (d * d <= temp) {
    while (temp % d === 0) {
      factors.push(d);
      temp /= d;
    }
    d++;
  }
  if (temp > 1) factors.push(temp);
  
  const counts: Record<number, number> = {};
  factors.forEach(f => counts[f] = (counts[f] || 0) + 1);
  return Object.entries(counts)
    .map(([base, exp]) => exp === 1 ? base : `${base}^${exp}`)
    .join(' * ');
};

type ButtonVariant = 'default' | 'operator' | 'function' | 'equal' | 'clear' | 'memory' | 'scientific';

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  darkMode: boolean;
}

const Button = React.memo(({ children, onClick, className = '', variant = 'default', disabled = false, darkMode }: ButtonProps) => {
  const baseClass = `relative overflow-hidden h-14 md:h-16 rounded-xl font-bold text-xl transition-transform duration-75 active:scale-95 flex items-center justify-center shadow-sm select-none border border-transparent ${
    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-105'
  }`;
  
  const variants: Record<ButtonVariant, string> = {
    default: darkMode 
      ? 'bg-slate-800 text-slate-200 text-xl' 
      : 'bg-white text-gray-700 border-gray-100 text-xl',
    operator: darkMode
      ? 'bg-blue-900/20 text-blue-400 text-xl'
      : 'bg-blue-50 text-blue-600 text-xl',
    function: darkMode
      ? 'bg-slate-700 text-slate-300 text-lg'
      : 'bg-gray-100 text-gray-700 text-lg',
    scientific: darkMode
      ? 'bg-purple-900/20 text-purple-300 text-base'
      : 'bg-purple-50 text-purple-700 text-base',
    equal: darkMode 
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 text-2xl' 
      : 'bg-blue-600 text-white shadow-lg shadow-blue-200 text-2xl',
    clear: darkMode 
      ? 'bg-red-900/20 text-red-400 text-xl' 
      : 'bg-red-50 text-red-600 text-xl',
    memory: darkMode
      ? 'bg-transparent text-xs text-slate-400 hover:bg-slate-800'
      : 'bg-transparent text-xs text-gray-500 hover:bg-gray-100'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
});

export default function Calculadora({ darkMode, initialState, onSave }: CalculadoraProps) {
  const [display, setDisplay] = useState(initialState?.display || '0');
  const [resultPreview, setResultPreview] = useState('');
  const [history, setHistory] = useState<{expr: string, res: string}[]>(initialState?.history || []);
  const [memory, setMemory] = useState<number>(initialState?.memory || 0);
  const [scope, setScope] = useState<any>(initialState?.scope || {});
  const [ans, setAns] = useState<string>(initialState?.ans || '0');
  const [mode, setMode] = useState<'basic' | 'scientific'>(initialState?.mode || 'basic');
  const [scientificTab, setScientificTab] = useState<'trig' | 'algebra' | 'calculus'>(initialState?.scientificTab || 'trig');
  const [angleUnit, setAngleUnit] = useState<'RAD' | 'DEG'>(initialState?.angleUnit || 'RAD');
  const [lastWasResult, setLastWasResult] = useState(false);
  const [cursor, setCursor] = useState<number>(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  // Soporte para teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key;

      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        handleInsert(key);
      }
      else if (['+', '-', '*', '/', '%', '^', '(', ')', '!', '.'].includes(key)) {
        e.preventDefault();
        handleInsert(key);
      }
      else if (key === ',') {
        e.preventDefault();
        handleInsert('.');
      }
      else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleCalculate();
      }
      else if (key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
      else if (key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
      else if (key === 'ArrowLeft') {
        e.preventDefault();
        moveCursor(-1);
      }
      else if (key === 'ArrowRight') {
        e.preventDefault();
        moveCursor(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, cursor, lastWasResult, scope, angleUnit, ans, history]);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    }
  }, [history]);

  // Guardar estado automáticamente cuando cambia
  useEffect(() => {
    if (onSave) {
      onSave({
        display,
        history,
        memory,
        scope,
        ans,
        mode,
        scientificTab,
        angleUnit
      });
    }
  }, [display, history, memory, scope, ans, mode, scientificTab, angleUnit, onSave]);

  // Auto-scroll del display para seguir el cursor
  useEffect(() => {
    if (displayRef.current) {
      const container = displayRef.current;
      const cursorPosition = cursor * 12; // Aproximación del ancho de caracteres
      const containerWidth = container.clientWidth;
      const scrollLeft = container.scrollLeft;
      
      // Si el cursor está fuera de la vista, hacer scroll
      if (cursorPosition < scrollLeft) {
        container.scrollLeft = Math.max(0, cursorPosition - 50);
      } else if (cursorPosition > scrollLeft + containerWidth - 50) {
        container.scrollLeft = cursorPosition - containerWidth + 50;
      }
    }
  }, [cursor, display]);

  const handleInsert = (value: string) => {
    if (lastWasResult && !['+', '-', '*', '/', '%', '^', '=', '(', ')'].includes(value)) {
      setDisplay(value);
      setCursor(value.length);
      setLastWasResult(false);
    } else {
      if (display === '0' && value !== '.') {
        setDisplay(value);
        setCursor(value.length);
      } else {
        const newDisplay = display.slice(0, cursor) + value + display.slice(cursor);
        setDisplay(newDisplay);
        setCursor(cursor + value.length);
      }
      setLastWasResult(false);
    }
  };

  const moveCursor = (delta: number) => {
    setCursor(prev => Math.max(0, Math.min(display.length, prev + delta)));
  };

  const handleClear = () => {
    setDisplay('0');
    setCursor(1);
    setResultPreview('');
  };

  const handleReset = () => {
    setDisplay('0');
    setResultPreview('');
    setHistory([]);
    setMemory(0);
    setAngleUnit('RAD');
    setMode('basic');
    setScope({});
    setCursor(1);
  };

  const handleBackspace = () => {
    if (display.length > 0 && cursor > 0) {
      const newDisplay = display.slice(0, cursor - 1) + display.slice(cursor);
      setDisplay(newDisplay.length === 0 ? '0' : newDisplay);
      setCursor(cursor - 1);
    } else {
      setDisplay('0');
      setCursor(1);
    }
  };

  const handleCalculate = () => {
    try {
      const expr = display
        .replace(/√\(/g, 'sqrt(')
        .replace(/π/g, 'pi')
        .replace(/÷/g, '/')
        .replace(/×/g, '*');

      const evalScope = {
        ...scope,
        sin: (x: number) => Math.sin(angleUnit === 'DEG' ? x * (Math.PI / 180) : x),
        cos: (x: number) => Math.cos(angleUnit === 'DEG' ? x * (Math.PI / 180) : x),
        tan: (x: number) => Math.tan(angleUnit === 'DEG' ? x * (Math.PI / 180) : x),
        asin: (x: number) => { const res = Math.asin(x); return angleUnit === 'DEG' ? res * (180 / Math.PI) : res; },
        acos: (x: number) => { const res = Math.acos(x); return angleUnit === 'DEG' ? res * (180 / Math.PI) : res; },
        atan: (x: number) => { const res = Math.atan(x); return angleUnit === 'DEG' ? res * (180 / Math.PI) : res; },
        sinh: (x: number) => Math.sinh(x),
        cosh: (x: number) => Math.cosh(x),
        tanh: (x: number) => Math.tanh(x),
        cross: (a: any, b: any) => evaluate(`cross([${a}], [${b}])`),
        derivative: (expr: any, variable: any) => derivative(expr, variable).toString(),
        simplify: (expr: any) => simplify(expr).toString(),
        rationalize: (expr: any) => rationalize(expr).toString(),
        factor: (n: any) => {
            if (typeof n === 'number' && Number.isInteger(n)) return primeFactors(n);
            try { return simplify(n).toString(); } catch (e) { return n; }
        },
        Ans: parseFloat(ans) || 0
      };

      const res = evaluate(expr, evalScope);
      const formattedResult = format(res, { precision: 14 });
      
      const newScope = { ...scope };
      Object.keys(evalScope).forEach(key => {
          if (typeof evalScope[key] !== 'function' && !['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','cross','derivative','simplify','rationalize','factor','Ans'].includes(key)) {
              newScope[key] = evalScope[key];
          }
      });
      setScope(newScope);
      setAns(formattedResult);

      setHistory(prev => [...prev, { expr: display, res: formattedResult }].slice(-50));
      setDisplay(formattedResult);
      setCursor(formattedResult.length);
      setResultPreview('');
      setLastWasResult(true);
    } catch (error) {
      setDisplay('Error');
      setTimeout(() => setDisplay('0'), 1500);
    }
  };

  const handleMemory = (action: 'MC' | 'MR' | 'M+' | 'M-' | 'MS') => {
    const currentVal = parseFloat(display) || 0;
    switch(action) {
      case 'MC': setMemory(0); break;
      case 'MR': handleInsert(String(memory)); break;
      case 'M+': setMemory(memory + currentVal); break;
      case 'M-': setMemory(memory - currentVal); break;
      case 'MS': setMemory(currentVal); break;
    }
  };

  const handleFunction = (func: string) => {
    try {
      switch(func) {
        case 'sqrt':
          handleInsert('√(');
          return;
        case 'pow':
          handleInsert('^(');
          return;
        case 'sin':
        case 'cos':
        case 'tan':
        case 'asin':
        case 'acos':
        case 'atan':
        case 'sinh':
        case 'cosh':
        case 'tanh':
        case 'log':
        case 'ln':
          handleInsert(`${func}(`);
          return;
        case 'pi':
          handleInsert('π');
          return;
        case 'e':
          handleInsert('e');
          return;
        case 'inv':
          handleInsert('^(-1)');
          return;
        case 'fact':
          handleInsert('!');
          return;
        case 'cbrt':
          handleInsert('cbrt(');
          return;
        case 'abs':
          handleInsert('abs(');
          return;
        case 'det':
        case 'transpose':
        case 'cross':
        case 'dot':
        case 'gcd':
        case 'lcm':
          handleInsert(`${func}(`);
          return;
        case 'derivative':
          handleInsert(`derivative(`);
          return;
        case 'simplify':
          handleInsert(`simplify(`);
          return;
        case 'rationalize':
          handleInsert(`rationalize(`);
          return;
        case 'factor':
          handleInsert(`factor(`);
          return;
        default:
          return;
      }
    } catch (error) {
      setDisplay('Error');
    }
  };

  const renderContent = (content: string) => {
    if (content.startsWith('[') && content.endsWith(']') && content.includes('[')) {
      try {
        const inner = content.replace(/^\[|\]$/g, '');
        const rows = inner.split('],').map(r => r.replace(/[\[\]]/g, '').split(','));
        
        if (rows.length > 0 && rows[0].length > 0) {
          return (
            <div className="inline-grid gap-1 p-2 my-1 rounded border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
                 style={{ gridTemplateColumns: `repeat(${rows[0].length}, min-content)` }}>
              {rows.map((row, i) => (
                row.map((cell, j) => (
                  <div key={`${i}-${j}`} className="px-2 py-1 text-center text-sm font-mono rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 min-w-[2rem]">
                    {cell.trim()}
                  </div>
                ))
              ))}
            </div>
          );
        }
      } catch (e) { return content; }
    }
    return content;
  };

  return (
    <div className={`h-full w-full flex flex-col ${
      darkMode ? 'bg-slate-900' : 'bg-white'
    }`}>
      
      {/* Header */}
      <div className={`flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b z-20 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMode('basic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              mode === 'basic' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700') : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100')
            }`}
          >
            <CalcIcon size={14} /> Básica
          </button>
          <button 
            onClick={() => setMode('scientific')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              mode === 'scientific' ? (darkMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700') : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100')
            }`}
          >
            <FlaskConical size={14} /> Científica
          </button>
          
          {mode === 'scientific' && (
            <button 
              onClick={() => setAngleUnit(prev => prev === 'RAD' ? 'DEG' : 'RAD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {angleUnit}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={handleReset}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'}`}
            title="Restablecer todo"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-0" ref={scrollRef}>
        {history.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full opacity-30 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <MessageSquare size={40} className="mb-3" />
                <p className="text-base font-medium">¿Qué quieres resolver hoy?</p>
            </div>
        ) : (
            history.map((item, i) => (
                <div key={i} className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="self-end max-w-[85%]">
                        <div className={`p-2.5 rounded-2xl rounded-tr-sm text-right shadow-sm ${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900'}`}>
                            <div className="font-mono text-sm md:text-base">{renderContent(item.expr)}</div>
                        </div>
                    </div>
                    <div className="self-start max-w-[85%]">
                        <div className={`p-2.5 rounded-2xl rounded-tl-sm shadow-sm border ${darkMode ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-white border-gray-100 text-blue-600'}`}>
                            <div className="font-mono text-lg md:text-xl font-bold">{renderContent(item.res)}</div>
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* INPUT & KEYPAD */}
      <div className={`flex-shrink-0 border-t shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-30 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          
          {/* Input Display */}
          <div className="px-4 pb-0 pt-2">
              <div 
                ref={displayRef}
                className={`relative w-full text-right p-2.5 rounded-xl border-2 transition-colors overflow-x-auto ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-slate-900'}`}
                style={{ scrollBehavior: 'smooth' }}
              >
                  <div className="text-xs absolute top-1.5 left-2.5 opacity-50">{resultPreview}</div>
                  <div className="text-3xl md:text-4xl font-mono tracking-tight whitespace-nowrap min-h-[2.5rem] md:min-h-[3rem] flex justify-end items-center">
                      {display.slice(0, cursor)}<span className="w-0.5 h-6 md:h-7 bg-blue-500 animate-pulse mx-0.5"></span>{display.slice(cursor)}
                  </div>
              </div>
          </div>

          {/* Memory Bar */}
          <div className="flex items-center justify-between px-4 py-1.5">
            <div className="flex gap-1">
                <Button darkMode={darkMode} variant="memory" onClick={() => handleMemory('MC')} disabled={memory === 0}>MC</Button>
                <Button darkMode={darkMode} variant="memory" onClick={() => handleMemory('MR')} disabled={memory === 0}>MR</Button>
                <Button darkMode={darkMode} variant="memory" onClick={() => handleMemory('M+')}>M+</Button>
                <Button darkMode={darkMode} variant="memory" onClick={() => handleMemory('M-')}>M-</Button>
                <Button darkMode={darkMode} variant="memory" onClick={() => handleMemory('MS')}>MS</Button>
            </div>
            <span className={`text-xs font-mono font-bold ${memory !== 0 ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'opacity-0'}`}>
              MEM
            </span>
          </div>

          {/* Scientific Tabs */}
          {mode === 'scientific' && (
            <div className="flex gap-1 px-4 pb-1.5">
              <button
                onClick={() => setScientificTab('trig')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  scientificTab === 'trig'
                    ? (darkMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700')
                    : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600')
                }`}
              >
                Trigonometría
              </button>
              <button
                onClick={() => setScientificTab('algebra')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  scientificTab === 'algebra'
                    ? (darkMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700')
                    : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600')
                }`}
              >
                Álgebra
              </button>
              <button
                onClick={() => setScientificTab('calculus')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  scientificTab === 'calculus'
                    ? (darkMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700')
                    : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600')
                }`}
              >
                Cálculo
              </button>
            </div>
          )}

          {/* Keypad Grid */}
          <div className="p-4 pt-0">
            <div className={`grid gap-1.5 ${mode === 'scientific' ? 'grid-cols-5' : 'grid-cols-4'}`}>
        
        {/* Scientific Buttons - Organizados por pestañas */}
        {mode === 'scientific' && scientificTab === 'trig' && (
          <>
            {/* Fila 1: Funciones trigonométricas */}
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('sin')}>sin</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('cos')}>cos</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('tan')}>tan</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('sinh')}>sinh</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('cosh')}>cosh</Button>
            
            {/* Fila 2: Funciones inversas */}
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('asin')}>sin⁻¹</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('acos')}>cos⁻¹</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('atan')}>tan⁻¹</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('tanh')}>tanh</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('log')}>log</Button>
            
            {/* Fila 3: Constantes y operaciones */}
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('pi')}>π</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('e')}>e</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('ln')}>ln</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleInsert('(')}>(</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleInsert(')')}>)</Button>
          </>
        )}

        {mode === 'scientific' && scientificTab === 'algebra' && (
          <>
            {/* Fila 1: Potencias y raíces */}
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleInsert('^')}>x^y</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('sqrt')}>√</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('cbrt')}>∛</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('abs')}>|x|</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('fact')}>x!</Button>
            
            {/* Fila 2: Variables y asignación */}
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleInsert('x')}>x</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleInsert('y')}>y</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleInsert('z')}>z</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleInsert('=')}>=</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleInsert('Ans')}>Ans</Button>
            
            {/* Fila 3: Operaciones */}
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('gcd')}>MCD</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('lcm')}>MCM</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('inv')}>1/x</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleInsert(',')}>,</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleInsert('%')}>%</Button>
          </>
        )}

        {mode === 'scientific' && scientificTab === 'calculus' && (
          <>
            {/* Fila 1: Cálculo */}
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('derivative')}>d/dx</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('simplify')}>Simpl</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('rationalize')}>Racio</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('factor')}>Factor</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleInsert(',')}>,</Button>
            
            {/* Fila 2: Funciones adicionales */}
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('det')}>det</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('transpose')}>T</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('cross')}>×</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleFunction('dot')}>·</Button>
            <Button darkMode={darkMode} variant="scientific" onClick={() => handleInsert('[')}>[</Button>
            
            {/* Fila 3: Espacios */}
            <div className="col-span-5"></div>
          </>
        )}

        {/* Standard Keypad - Siempre visible */}
        <Button darkMode={darkMode} variant="clear" onClick={handleClear} className={mode === 'scientific' ? "col-span-3" : "col-span-2"}>AC</Button>
        <Button darkMode={darkMode} variant="operator" onClick={handleBackspace} className={mode === 'scientific' ? "col-span-2" : "col-span-2"}><Delete size={20}/></Button>
        
        <Button darkMode={darkMode} onClick={() => handleInsert('7')}>7</Button>
        <Button darkMode={darkMode} onClick={() => handleInsert('8')}>8</Button>
        <Button darkMode={darkMode} onClick={() => handleInsert('9')}>9</Button>
        <Button darkMode={darkMode} variant="operator" onClick={() => handleInsert('/')}><Divide size={20}/></Button>
        {mode === 'scientific' && <Button darkMode={darkMode} variant="operator" onClick={() => handleInsert('^')}>^</Button>}

        <Button darkMode={darkMode} onClick={() => handleInsert('4')}>4</Button>
        <Button darkMode={darkMode} onClick={() => handleInsert('5')}>5</Button>
        <Button darkMode={darkMode} onClick={() => handleInsert('6')}>6</Button>
        <Button darkMode={darkMode} variant="operator" onClick={() => handleInsert('*')}><X size={20}/></Button>
        {mode === 'scientific' && <Button darkMode={darkMode} variant="operator" onClick={() => handleInsert('sqrt(')}>√</Button>}

        <Button darkMode={darkMode} onClick={() => handleInsert('1')}>1</Button>
        <Button darkMode={darkMode} onClick={() => handleInsert('2')}>2</Button>
        <Button darkMode={darkMode} onClick={() => handleInsert('3')}>3</Button>
        <Button darkMode={darkMode} variant="operator" onClick={() => handleInsert('-')}><Minus size={20}/></Button>
        {mode === 'scientific' && <Button darkMode={darkMode} variant="operator" onClick={() => handleInsert('(')}>( )</Button>}

        <Button darkMode={darkMode} onClick={() => handleInsert('0')}>0</Button>
        <Button darkMode={darkMode} onClick={() => handleInsert('.')}>.</Button>
        <Button darkMode={darkMode} variant="equal" onClick={handleCalculate}><Equal size={24}/></Button>
        <Button darkMode={darkMode} variant="operator" onClick={() => handleInsert('+')}><Plus size={20}/></Button>
        {mode === 'scientific' && <Button darkMode={darkMode} variant="operator" onClick={() => handleInsert('pi')}>π</Button>}
      </div>
      </div>
    </div>
    </div>
  );
}