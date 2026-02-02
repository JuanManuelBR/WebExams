import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Eraser, Square, Circle, Minus, Download, Trash2, Undo, Redo } from 'lucide-react';

interface LienzoProps {
  darkMode: boolean;
  onSave?: (data: any) => void;
}

type Tool = 'pencil' | 'eraser' | 'line' | 'rectangle' | 'circle';

interface DrawAction {
  tool: Tool;
  color: string;
  lineWidth: number;
  points?: { x: number; y: number }[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export default function Lienzo({ darkMode, onSave }: LienzoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [history, setHistory] = useState<DrawAction[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Set background
    ctx.fillStyle = darkMode ? '#1e293b' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw history
    history.slice(0, historyStep + 1).forEach(action => {
      drawAction(ctx, action);
    });
  }, [darkMode, history, historyStep]);

  const drawAction = (ctx: CanvasRenderingContext2D, action: DrawAction) => {
    ctx.strokeStyle = action.color;
    ctx.lineWidth = action.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (action.tool === 'pencil' || action.tool === 'eraser') {
      if (action.tool === 'eraser') {
        ctx.strokeStyle = darkMode ? '#1e293b' : '#ffffff';
      }
      
      if (action.points && action.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(action.points[0].x, action.points[0].y);
        action.points.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      }
    } else if (action.start && action.end) {
      ctx.beginPath();
      
      if (action.tool === 'line') {
        ctx.moveTo(action.start.x, action.start.y);
        ctx.lineTo(action.end.x, action.end.y);
      } else if (action.tool === 'rectangle') {
        const width = action.end.x - action.start.x;
        const height = action.end.y - action.start.y;
        ctx.rect(action.start.x, action.start.y, width, height);
      } else if (action.tool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(action.end.x - action.start.x, 2) + 
          Math.pow(action.end.y - action.start.y, 2)
        );
        ctx.arc(action.start.x, action.start.y, radius, 0, 2 * Math.PI);
      }
      
      ctx.stroke();
    }
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    setStartPos(pos);

    if (tool === 'pencil' || tool === 'eraser') {
      const newAction: DrawAction = {
        tool,
        color,
        lineWidth,
        points: [pos]
      };
      
      const newHistory = [...history.slice(0, historyStep + 1), newAction];
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const pos = getMousePos(e);

    if (tool === 'pencil' || tool === 'eraser') {
      const currentAction = history[historyStep];
      if (currentAction && currentAction.points) {
        currentAction.points.push(pos);
        setHistory([...history]);

        // Draw immediately
        ctx.strokeStyle = tool === 'eraser' ? (darkMode ? '#1e293b' : '#ffffff') : color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const points = currentAction.points;
        if (points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        }
      }
    } else {
      // Preview for shapes
      redrawCanvas();
      
      if (startPos) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        if (tool === 'line') {
          ctx.moveTo(startPos.x, startPos.y);
          ctx.lineTo(pos.x, pos.y);
        } else if (tool === 'rectangle') {
          const width = pos.x - startPos.x;
          const height = pos.y - startPos.y;
          ctx.rect(startPos.x, startPos.y, width, height);
        } else if (tool === 'circle') {
          const radius = Math.sqrt(
            Math.pow(pos.x - startPos.x, 2) + 
            Math.pow(pos.y - startPos.y, 2)
          );
          ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        }
        
        ctx.stroke();
      }
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const pos = getMousePos(e);

    if (tool !== 'pencil' && tool !== 'eraser' && startPos) {
      const newAction: DrawAction = {
        tool,
        color,
        lineWidth,
        start: startPos,
        end: pos
      };
      
      const newHistory = [...history.slice(0, historyStep + 1), newAction];
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
    }

    if (onSave) {
      onSave({ history: history.slice(0, historyStep + 1) });
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = darkMode ? '#1e293b' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    history.slice(0, historyStep + 1).forEach(action => {
      drawAction(ctx, action);
    });
  };

  const undo = () => {
    if (historyStep > -1) {
      setHistoryStep(historyStep - 1);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
    }
  };

  const clearCanvas = () => {
    setHistory([]);
    setHistoryStep(-1);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = darkMode ? '#1e293b' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'dibujo.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const ToolButton = ({ icon: Icon, active, onClick, title }: any) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-3 rounded-lg transition-all ${
        active
          ? darkMode
            ? 'bg-blue-600 text-white'
            : 'bg-blue-500 text-white'
          : darkMode
            ? 'bg-slate-700 hover:bg-slate-600 text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
      }`}
    >
      <Icon className="w-5 h-5" />
    </button>
  );

  return (
    <div className={`h-full w-full flex flex-col ${
      darkMode ? 'bg-slate-900' : 'bg-white'
    }`}>
      
      {/* Toolbar */}
      <div className={`flex items-center gap-3 p-4 border-b ${
        darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
      }`}>
        {/* Tools */}
        <div className="flex gap-2">
          <ToolButton 
            icon={Pencil} 
            active={tool === 'pencil'} 
            onClick={() => setTool('pencil')}
            title="Lápiz"
          />
          <ToolButton 
            icon={Eraser} 
            active={tool === 'eraser'} 
            onClick={() => setTool('eraser')}
            title="Borrador"
          />
          <ToolButton 
            icon={Minus} 
            active={tool === 'line'} 
            onClick={() => setTool('line')}
            title="Línea"
          />
          <ToolButton 
            icon={Square} 
            active={tool === 'rectangle'} 
            onClick={() => setTool('rectangle')}
            title="Rectángulo"
          />
          <ToolButton 
            icon={Circle} 
            active={tool === 'circle'} 
            onClick={() => setTool('circle')}
            title="Círculo"
          />
        </div>

        <div className={`h-8 w-px ${darkMode ? 'bg-slate-700' : 'bg-gray-300'}`}></div>

        {/* Color Picker */}
        <div className="flex items-center gap-2">
          <label className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>
            Color:
          </label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer"
          />
        </div>

        {/* Line Width */}
        <div className="flex items-center gap-2">
          <label className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>
            Grosor:
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-24"
          />
          <span className={`text-sm font-mono ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            {lineWidth}px
          </span>
        </div>

        <div className="flex-1"></div>

        {/* Actions */}
        <div className="flex gap-2">
          <ToolButton 
            icon={Undo} 
            active={false}
            onClick={undo}
            title="Deshacer"
          />
          <ToolButton 
            icon={Redo} 
            active={false}
            onClick={redo}
            title="Rehacer"
          />
          <ToolButton 
            icon={Trash2} 
            active={false}
            onClick={clearCanvas}
            title="Limpiar"
          />
          <ToolButton 
            icon={Download} 
            active={false}
            onClick={downloadImage}
            title="Descargar"
          />
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className={`w-full h-full rounded-lg border-2 cursor-crosshair ${
            darkMode 
              ? 'border-slate-700' 
              : 'border-gray-300'
          }`}
          style={{ touchAction: 'none' }}
        />
      </div>
    </div>
  );
}