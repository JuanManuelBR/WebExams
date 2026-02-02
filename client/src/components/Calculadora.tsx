import React, { useState } from 'react';
import { Delete, Divide, X, Minus, Plus, Equal } from 'lucide-react';
import { evaluate } from 'mathjs';

interface CalculadoraProps {
  darkMode: boolean;
  onSave?: (data: any) => void;
}

export default function Calculadora({ darkMode, onSave }: CalculadoraProps) {
  const [display, setDisplay] = useState('0');
  const [history, setHistory] = useState<string[]>([]);

  const handleButtonClick = (value: string) => {
    if (display === '0' && value !== '.') {
      setDisplay(value);
    } else {
      setDisplay(display + value);
    }
  };

  const handleClear = () => {
    setDisplay('0');
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleCalculate = () => {
    try {
      const result = evaluate(display);
      const calculation = `${display} = ${result}`;
      setHistory([calculation, ...history.slice(0, 9)]);
      setDisplay(String(result));
      
      // Guardar estado
      if (onSave) {
        onSave({
          display: String(result),
          history: [calculation, ...history.slice(0, 9)]
        });
      }
    } catch (error) {
      setDisplay('Error');
      setTimeout(() => setDisplay('0'), 1500);
    }
  };

  const handleFunction = (func: string) => {
    try {
      let result;
      const num = parseFloat(display);
      
      switch(func) {
        case 'sqrt':
          result = Math.sqrt(num);
          break;
        case 'pow':
          setDisplay(display + '^');
          return;
        case 'sin':
          result = Math.sin(num);
          break;
        case 'cos':
          result = Math.cos(num);
          break;
        case 'tan':
          result = Math.tan(num);
          break;
        case 'log':
          result = Math.log10(num);
          break;
        case 'ln':
          result = Math.log(num);
          break;
        default:
          return;
      }
      
      setDisplay(String(result));
    } catch (error) {
      setDisplay('Error');
    }
  };

  type ButtonVariant = 'default' | 'operator' | 'function' | 'equal' | 'clear';

  interface ButtonProps {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
    variant?: ButtonVariant;
  }

  const Button = ({ children, onClick, className = '', variant = 'default' }: ButtonProps) => {
    const baseClass = `p-4 rounded-lg font-semibold transition-all text-lg ${
      darkMode ? 'text-white' : 'text-gray-800'
    }`;
    
    const variants: Record<ButtonVariant, string> = {
      default: darkMode 
        ? 'bg-slate-700 hover:bg-slate-600' 
        : 'bg-gray-200 hover:bg-gray-300',
      operator: darkMode
        ? 'bg-blue-600 hover:bg-blue-500'
        : 'bg-blue-500 hover:bg-blue-600 text-white',
      function: darkMode
        ? 'bg-slate-600 hover:bg-slate-500'
        : 'bg-gray-300 hover:bg-gray-400',
      equal: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      clear: 'bg-red-600 hover:bg-red-500 text-white'
    };

    return (
      <button
        onClick={onClick}
        className={`${baseClass} ${variants[variant]} ${className}`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className={`h-full w-full flex flex-col p-6 ${
      darkMode ? 'bg-slate-900' : 'bg-white'
    }`}>
      
      {/* Display */}
      <div className={`mb-4 p-6 rounded-xl ${
        darkMode ? 'bg-slate-800' : 'bg-gray-100'
      }`}>
        <div className={`text-right text-4xl font-mono overflow-x-auto ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {display}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className={`mb-4 p-3 rounded-lg max-h-24 overflow-y-auto ${
          darkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-gray-50 text-gray-600'
        }`}>
          <div className="text-xs font-mono space-y-1">
            {history.slice(0, 3).map((item, i) => (
              <div key={i}>{item}</div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons Grid */}
      <div className="grid grid-cols-5 gap-2 flex-1">
        {/* Row 1 - Functions */}
        <Button variant="function" onClick={() => handleFunction('sin')}>sin</Button>
        <Button variant="function" onClick={() => handleFunction('cos')}>cos</Button>
        <Button variant="function" onClick={() => handleFunction('tan')}>tan</Button>
        <Button variant="function" onClick={() => handleFunction('sqrt')}>√</Button>
        <Button variant="function" onClick={() => handleFunction('pow')}>x^y</Button>

        {/* Row 2 - More Functions */}
        <Button variant="function" onClick={() => handleFunction('log')}>log</Button>
        <Button variant="function" onClick={() => handleFunction('ln')}>ln</Button>
        <Button variant="function" onClick={() => handleButtonClick('(')}>(</Button>
        <Button variant="function" onClick={() => handleButtonClick(')')}>)</Button>
        <Button variant="clear" onClick={handleClear}>C</Button>

        {/* Row 3 */}
        <Button onClick={() => handleButtonClick('7')}>7</Button>
        <Button onClick={() => handleButtonClick('8')}>8</Button>
        <Button onClick={() => handleButtonClick('9')}>9</Button>
        <Button variant="operator" onClick={() => handleButtonClick('/')}>
          <Divide className="w-5 h-5 mx-auto" />
        </Button>
        <Button variant="operator" onClick={handleBackspace}>
          <Delete className="w-5 h-5 mx-auto" />
        </Button>

        {/* Row 4 */}
        <Button onClick={() => handleButtonClick('4')}>4</Button>
        <Button onClick={() => handleButtonClick('5')}>5</Button>
        <Button onClick={() => handleButtonClick('6')}>6</Button>
        <Button variant="operator" onClick={() => handleButtonClick('*')}>
          <X className="w-5 h-5 mx-auto" />
        </Button>
        <Button variant="function" onClick={() => handleButtonClick('%')}>%</Button>

        {/* Row 5 */}
        <Button onClick={() => handleButtonClick('1')}>1</Button>
        <Button onClick={() => handleButtonClick('2')}>2</Button>
        <Button onClick={() => handleButtonClick('3')}>3</Button>
        <Button variant="operator" onClick={() => handleButtonClick('-')}>
          <Minus className="w-5 h-5 mx-auto" />
        </Button>
        <Button variant="equal" onClick={handleCalculate} className="row-span-2">
          <Equal className="w-6 h-6 mx-auto" />
        </Button>

        {/* Row 6 */}
        <Button onClick={() => handleButtonClick('0')} className="col-span-2">0</Button>
        <Button onClick={() => handleButtonClick('.')}>.</Button>
        <Button variant="operator" onClick={() => handleButtonClick('+')}>
          <Plus className="w-5 h-5 mx-auto" />
        </Button>
      </div>
    </div>
  );
}