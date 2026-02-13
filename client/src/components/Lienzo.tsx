import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  MousePointer2, Share2, Trash2,
  Undo, Redo, Type, X, Plus, Image as ImageIcon,
  Layout, Diamond, Grid3x3,
  PenTool, Eraser, Square, Circle, User, Braces, Hexagon, Cloud,
  ChevronDown, ChevronRight, Highlighter, Minus, Triangle, Star
} from 'lucide-react';
// --- DEFINICIÓN DE TIPOS ---

interface LienzoProps {
  darkMode: boolean;
  initialData?: LienzoState;
  onSave?: (data: LienzoState) => void;
}

type Tool = 'select' | 'hand' | 'text' | 'relation' | 
            'table' | 'table_keys' | 'process' | 'decision' | 'io' | 'start' | 
            'subprocess' | 'document' | 'manual_input' | 'display' | 'off_page' | 'delay' |
            'uml_actor' | 'uml_usecase' | 'uml_class' | 'uml_note' |
            'pencil' | 'marker' | 'eraser' | 'rect_shape' | 'circle_shape' | 'triangle_shape' | 'star_shape' | 'hexagon_shape' | 'cloud_shape' |
            'er_entity' | 'er_relationship' | 'er_attribute' | 'er_inheritance';

// Tipos de relaciones extendidos y corregidos
type RelationType = '1:1' | '1:N' | 'N:M' | 'Flow' | 'BiFlow' | 'Inheritance' | 'Generalization' | 'Realization' | 'Composition' | 'Aggregation' | 'Dependency';

interface DiagramNode {
  id: string;
  type: Tool;
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  fields: { name: string; type: string; key?: string; visibility?: string }[]; // Estructura de campos mejorada (key: PK, FK, N)
  methods?: { name: string; type: string; visibility: string }[];
  color: string;
  fontSize: number;
  doubleBorder?: boolean;
  underline?: boolean;
  bold?: boolean;
  textInParentheses?: boolean;
}

interface Connection {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  style: 'solid' | 'dashed'; // Nueva funcionalidad
  color?: string;
  label?: string;
  startMarker?: string;
  endMarker?: string;
  width?: number;
}

interface PaintAction {
  id: string;
  tool: 'pencil' | 'marker' | 'eraser' | 'rect_shape' | 'circle_shape' | 'triangle_shape' | 'star_shape' | 'hexagon_shape' | 'cloud_shape';
  points: {x: number, y: number}[];
  start?: {x: number, y: number};
  end?: {x: number, y: number};
  color: string;
  width: number;
}

export interface Sheet {
  id: string;
  name: string;
  nodes: DiagramNode[];
  connections: Connection[];
  paintActions: PaintAction[];
  history: string[];
  historyIndex: number;
  pan: {x: number, y: number};
  scale: number;
}

export interface LienzoState {
  sheets: Sheet[];
  activeSheetIndex: number;
}

// --- CONSTANTES ---
const GRID_SIZE = 20;
const generateId = () => Math.random().toString(36).substring(2, 9);

const MARKERS = [
    { value: 'None', label: 'Ninguno' },
    { value: 'Arrow', label: 'Flecha' },
    { value: 'OpenArrow', label: 'Flecha Abierta' },
    { value: 'Triangle', label: 'Triángulo' },
    { value: 'DiamondFilled', label: 'Rombo Relleno' },
    { value: 'DiamondHollow', label: 'Rombo Hueco' },
    { value: 'CrowFoot', label: 'Pata de Gallo' },
    { value: 'CrowFootOne', label: 'Pata de Gallo (1)' },
    { value: 'OneBar', label: 'Uno (Barra)' }
];

// --- ICONOS PERSONALIZADOS (Para coincidir con las formas reales) ---
const StartIcon = ({ size = 18, ...props }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="2" y="6" width="20" height="12" rx="6" />
    </svg>
);

const ProcessIcon = ({ size = 18, ...props }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="6" width="18" height="12" />
    </svg>
);

const DecisionIcon = ({ size = 18, ...props }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 3L20 12L12 21L4 12L12 3Z" />
    </svg>
);

const IOIcon = ({ size = 18, ...props }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M6 4H20L18 20H4L6 4Z" />
    </svg>
);

const SubprocessIcon = ({ size = 18, ...props }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="4" y="4" width="16" height="16" />
        <line x1="8" y1="4" x2="8" y2="20" />
        <line x1="16" y1="4" x2="16" y2="20" />
    </svg>
);

const DocumentIcon = ({ size = 18, ...props }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4 2H20V18C20 21 16 21 12 18C8 15 4 21 4 18V2Z" />
    </svg>
);

const ManualInputIcon = ({ size = 18, ...props }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4 10L20 6V20H4V10Z" />
    </svg>
);

const DisplayIcon = ({ size = 18, ...props }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M2 12L6 4H16C20 4 22 8 22 12C22 16 20 20 16 20H6L2 12Z" />
    </svg>
);

const OffPageIcon = ({ size = 18, ...props }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M5 3H19V14L12 21L5 14V3Z" />
    </svg>
);

const DelayIcon = ({ size = 18, ...props }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4 4H12C17 4 20 8 20 12C20 16 17 20 12 20H4V4Z" />
    </svg>
);

const TableIcon = ({ size = 18, ...props }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="12" y1="9" x2="12" y2="21" />
    </svg>
);

const TableKeysIcon = ({ size = 18, ...props }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="9" x2="9" y2="21" />
        <line x1="15" y1="9" x2="15" y2="21" />
        <path d="M5 14h2" />
    </svg>
);

const InheritanceIcon = ({ size = 18, ...props }: any) => (
    <Triangle size={size} {...props} className="rotate-180" />
);

// --- COMPONENTES UI EXTRAÍDOS (Para evitar re-renders) ---

const Accordion = ({ title, children, defaultOpen = false }: any) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
      <div className="border-b border-gray-200 dark:border-slate-700">
          <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 text-xs font-bold uppercase tracking-wider opacity-70 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 transition-colors">
              {title} {open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
          </button>
          {open && <div className="p-2 grid grid-cols-4 gap-1 bg-white dark:bg-transparent">{children}</div>}
      </div>
  );
};

const ToolBtn = ({ icon: Icon, label, isSelected, onClick }: any) => (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 ${isSelected ? 'bg-slate-800 dark:bg-blue-900/30 text-white dark:text-blue-100 border border-transparent dark:border-blue-800/50 shadow-sm' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-white'}`}
      title={label}
    >
        <Icon size={18} />
        <span className="text-[9px] mt-1 truncate w-full text-center">{label}</span>
    </button>
);

export default function Lienzo({ darkMode, initialData, onSave }: LienzoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  // Gestión de Hojas
  const [sheets, setSheets] = useState<Sheet[]>(initialData?.sheets || [
      { 
          id: 'sheet-1', 
          name: 'Hoja 1', 
          nodes: [], 
          connections: [], 
          paintActions: [], 
          history: [], 
          historyIndex: -1, 
          pan: {x: 0, y: 0}, 
          scale: 1 
      }
  ]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(initialData?.activeSheetIndex || 0);
  
  // Helper para inicializar datos de la hoja activa
  const getInitialActiveData = () => {
      if (initialData && initialData.sheets[initialData.activeSheetIndex]) {
          return initialData.sheets[initialData.activeSheetIndex];
      }
      return null;
  };
  const init = getInitialActiveData();
  
  // Datos
  const [nodes, setNodes] = useState<DiagramNode[]>(init?.nodes || []);
  const [connections, setConnections] = useState<Connection[]>(init?.connections || []);
  const [paintActions, setPaintActions] = useState<PaintAction[]>(init?.paintActions || []);
  
  // Interacción
  const [tool, setTool] = useState<Tool>('select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [relationType, setRelationType] = useState<RelationType>('Flow');
  
  // Configuración Paint
  const [paintColor, setPaintColor] = useState('#ef4444');
  const [paintWidth, setPaintWidth] = useState(3);
  
  // Viewport
  const [scale, setScale] = useState(init?.scale || 1);
  const [pan, setPan] = useState(init?.pan || { x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{start: {x:number, y:number}, end: {x:number, y:number}} | null>(null);

  // Drag & Draw
  const [isDrawing, setIsDrawing] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [drawStartPos, setDrawStartPos] = useState<{x:number, y:number} | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState({ x: 0, y: 0 });

  // Historial
  const [history, setHistory] = useState<string[]>(init?.history || []);
  const [historyIndex, setHistoryIndex] = useState(init?.historyIndex ?? -1);

  // Inicializar historial para permitir deshacer desde el primer cambio
  useEffect(() => {
      if (history.length === 0) {
          const initialState = JSON.stringify({ nodes: [], connections: [], paintActions: [] });
          setHistory([initialState]);
          setHistoryIndex(0);
      }
  }, [activeSheetIndex]);

  // Persistencia Global: Guardar estado completo cuando algo cambia
  useEffect(() => {
      if (onSave) {
          const currentState: Sheet = {
              id: sheets[activeSheetIndex].id,
              name: sheets[activeSheetIndex].name,
              nodes,
              connections,
              paintActions,
              history,
              historyIndex,
              pan,
              scale
          };
          
          const updatedSheets = [...sheets];
          updatedSheets[activeSheetIndex] = currentState;
          
          onSave({
              sheets: updatedSheets,
              activeSheetIndex
          });
      }
  }, [nodes, connections, paintActions, history, historyIndex, pan, scale, sheets, activeSheetIndex, onSave]);

  const isPaintTool = ['pencil', 'marker', 'eraser', 'rect_shape', 'circle_shape', 'triangle_shape', 'star_shape', 'hexagon_shape', 'cloud_shape'].includes(tool);

  // --- HELPERS ---
  
  const getAutoDimensions = (type: string, name: string, fontSize: number, fields: any[] = [], methods: any[] = []) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return null;
    
    // Factor de escala proporcional (Base 14px)
    const s = (val: number) => (val / 14) * fontSize;

    // Tablas y Clases (Cálculo dinámico de ancho y alto)
    if (['table', 'table_keys', 'uml_class'].includes(type)) {
        ctx.font = `bold ${fontSize}px sans-serif`;
        const titleW = ctx.measureText(name).width + s(40);
        
        let maxRowW = 0;
        ctx.font = `${fontSize - 1}px monospace`;
        if (fields) {
            fields.forEach(f => {
                const typeW = ctx.measureText(f.type).width;
                const nameW = ctx.measureText(f.name).width;
                let rowW = 0;
                if (type === 'table_keys') {
                    const keyWidth = fontSize * 2.5;
                    rowW = keyWidth + s(10) + nameW + s(30) + typeW + s(10); 
                } else if (type === 'uml_class') {
                    const visW = ctx.measureText(f.visibility || '+').width;
                    rowW = s(10) + visW + s(5) + nameW + s(30) + typeW + s(10);
                } else {
                    rowW = s(10) + nameW + s(30) + typeW + s(10);
                }
                if (rowW > maxRowW) maxRowW = rowW;
            });
        }

        if (type === 'uml_class' && methods) {
            methods.forEach(m => {
                const w = ctx.measureText((m.visibility || '+') + ' ' + m.name + '(): ' + m.type).width + s(20);
                if (w > maxRowW) maxRowW = w;
            });
        }
        
        const w = Math.max(titleW, maxRowW, s(140));
        const headerH = fontSize + s(16);
        const rowH = fontSize + s(10);
        let h = headerH + (fields.length * rowH) + s(10);
        
        if (type === 'uml_class' && methods && methods.length > 0) {
            h += (methods.length * rowH) + s(10); // Espacio para métodos y separador
        }
        
        return { w, h };
    }

    ctx.font = `${fontSize}px sans-serif`;
    const tm = ctx.measureText(name);
    const tw = tm.width;
    const th = fontSize;
    
    if (type === 'text') return { w: tw + s(20), h: th + s(20) };

    // Ajuste proporcional para formas ER (Evitar deformación excesiva)
    if (type === 'er_attribute') {
        const w = Math.max(s(100), tw + s(50));
        return { w, h: Math.max(s(60), w * 0.6) }; 
    }
    if (['decision', 'er_relationship'].includes(type)) {
        const w = Math.max(s(120), tw + s(80));
        return { w, h: Math.max(s(80), w * 0.65) }; 
    }

    if (['process', 'uml_note', 'subprocess', 'document', 'display', 'manual_input', 'er_entity'].includes(type)) return { w: Math.max(s(100), tw + s(40)), h: Math.max(s(60), th + s(40)) };
    if (['start', 'uml_usecase', 'delay'].includes(type)) return { w: Math.max(s(100), tw + s(60)), h: Math.max(s(60), th + s(50)) };
    if (type === 'io') return { w: Math.max(s(100), tw + s(60)), h: Math.max(s(60), th + s(40)) };
    if (type === 'off_page') return { w: Math.max(s(80), tw + s(40)), h: Math.max(s(80), th + s(40)) };
    if (type === 'uml_actor') return { w: 60 * (fontSize/14), h: 120 * (fontSize/14) };
    if (type === 'er_inheritance') return { w: Math.max(s(70), tw + s(40)), h: Math.max(s(60), th + s(40)) };
    return null;
  };

  const screenToCanvas = (e: React.MouseEvent | React.WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / scale,
      y: (e.clientY - rect.top - pan.y) / scale
    };
  };

  const snapToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  const getRectIntersection = (p1: {x: number, y: number}, rect: DiagramNode) => {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const dx = p1.x - cx;
    const dy = p1.y - cy;
    
    // Elipses
    if (['uml_usecase', 'circle_shape', 'uml_actor', 'er_attribute'].includes(rect.type)) {
        const angle = Math.atan2(dy, dx);
        return {
            x: cx + Math.cos(angle) * (rect.w/2),
            y: cy + Math.sin(angle) * (rect.h/2)
        };
    }
    
    // Decision (Rombo / Diamante)
    if (['decision', 'er_relationship'].includes(rect.type)) {
        // Intersección con |x|/(w/2) + |y|/(h/2) = 1
        const t = 1 / (Math.abs(dx)*2/rect.w + Math.abs(dy)*2/rect.h);
        return { x: cx + dx * t, y: cy + dy * t };
    }

    // Herencia (Triángulo Invertido)
    if (rect.type === 'er_inheritance') {
        // Top: y = -h/2
        // Slopes: 2(h/w)|x| + y = h/2
        // Si el vector apunta hacia arriba y es más "vertical" que la esquina, pega arriba.
        if (dy < 0 && Math.abs(dx) * rect.h < Math.abs(dy) * rect.w) {
             // Hit Top
             const t = (-rect.h / 2) / dy;
             return { x: cx + dx * t, y: cy + dy * t };
        } else {
             // Hit Slope
             const k = (2 * rect.h) / rect.w;
             const t = (rect.h / 2) / (dy + k * Math.abs(dx));
             return { x: cx + dx * t, y: cy + dy * t };
        }
    }

    // Triángulo
    if (rect.type === 'triangle_shape') {
        // Aproximación simple para triángulo equilátero apuntando arriba
        // Si está en la mitad inferior (base), es rect normal. Si es superior, es diagonales.
        // Por simplicidad y robustez, usamos la caja para la base y un ajuste para la punta.
        // (Se puede refinar más si es necesario, pero esto evita que la flecha entre en la punta vacía)
    }

    // Referencia (Pentágono hacia abajo)
    if (rect.type === 'off_page') {
        // Aproximación simple a caja por ahora para facilitar la conexión
    }

    // Rectángulos (Liang-Barsky simplificado)
    if (Math.abs(dx) / (rect.w/2) > Math.abs(dy) / (rect.h/2)) {
        return { x: dx > 0 ? rect.x + rect.w : rect.x, y: cy + dy * ((rect.w/2) / Math.abs(dx)) };
    } else {
        return { x: cx + dx * ((rect.h/2) / Math.abs(dy)), y: dy > 0 ? rect.y + rect.h : rect.y };
    }
  };

  // Nueva función para calcular la ruta exacta de la curva Bezier (Centralizada)
  const getBezierPath = (conn: Connection, from: DiagramNode, to: DiagramNode) => {
    const start = getRectIntersection({x: to.x + to.w/2, y: to.y + to.h/2}, from);
    const end = getRectIntersection({x: from.x + from.w/2, y: from.y + from.h/2}, to);

    const getExitVector = (p: {x:number, y:number}, node: DiagramNode) => {
        const cx = node.x + node.w/2;
        const cy = node.y + node.h/2;
        const dx = p.x - cx;
        const dy = p.y - cy;
        if (Math.abs(dx) / node.w < Math.abs(dy) / node.h) {
            return { x: 0, y: dy > 0 ? 1 : -1 };
        } else {
            return { x: dx > 0 ? 1 : -1, y: 0 };
        }
    };

    const startDir = getExitVector(start, from);
    const endDir = getExitVector(end, to);
    const dist = Math.hypot(end.x - start.x, end.y - start.y) * 0.5;

    let cp1 = { x: start.x + startDir.x * dist, y: start.y + startDir.y * dist };
    let cp2 = { x: end.x + endDir.x * dist, y: end.y + endDir.y * dist };

    const isBidirectional = connections.some(c => c.from === conn.to && c.to === conn.from);
    if (isBidirectional && conn.type !== 'BiFlow') {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.hypot(dx, dy);
        if (len > 0) {
            const nx = -dy / len * 40;
            const ny = dx / len * 40;
            cp1 = { x: cp1.x + nx, y: cp1.y + ny };
            cp2 = { x: cp2.x + nx, y: cp2.y + ny };
        }
    }

    return { start, cp1, cp2, end };
  };

  // Hit test preciso sobre la curva Bezier
  const isPointNearBezier = (p: {x:number, y:number}, start: {x:number, y:number}, cp1: {x:number, y:number}, cp2: {x:number, y:number}, end: {x:number, y:number}, threshold = 10) => {
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = (1-t)**3 * start.x + 3*(1-t)**2 * t * cp1.x + 3*(1-t) * t**2 * cp2.x + t**3 * end.x;
          const y = (1-t)**3 * start.y + 3*(1-t)**2 * t * cp1.y + 3*(1-t) * t**2 * cp2.y + t**3 * end.y;
          if (Math.hypot(p.x - x, p.y - y) < threshold) return true;
      }
      return false;
  };

  // --- RENDERIZADO ---

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (GRID_SIZE * scale < 5) return; // Ocultar cuadrícula si está muy densa (zoom out)

    ctx.save();
    ctx.strokeStyle = darkMode ? '#334155' : '#e2e8f0';
    ctx.lineWidth = 1 / scale;
    ctx.beginPath();
    
    const left = -pan.x / scale;
    const top = -pan.y / scale;
    const right = left + (width / scale);
    const bottom = top + (height / scale);

    const startX = Math.floor(left / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(top / GRID_SIZE) * GRID_SIZE;

    for (let x = startX; x < right; x += GRID_SIZE) { ctx.moveTo(x, top); ctx.lineTo(x, bottom); }
    for (let y = startY; y < bottom; y += GRID_SIZE) { ctx.moveTo(left, y); ctx.lineTo(right, y); }
    
    ctx.stroke();
    ctx.restore();
  };

  const drawPaintLayer = (ctx: CanvasRenderingContext2D) => {
    paintActions.forEach(action => {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Resaltar si está seleccionado
        if (selectedIds.has(action.id)) {
            ctx.shadowColor = '#3b82f6';
            ctx.shadowBlur = 10;
            // Si es una figura, dibujamos un cuadro de selección extra
            if (action.start && action.end) {
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(action.start.x - 5, action.start.y - 5, (action.end.x - action.start.x) + 10, (action.end.y - action.start.y) + 10);
                ctx.setLineDash([]);
            }
        }
        
        if (action.tool === 'marker') {
            ctx.strokeStyle = action.color;
            ctx.lineWidth = action.width * 2; // Marcador más grueso
            ctx.globalAlpha = 0.4; // Transparencia
        } else if (action.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = '#000000'; // El color no importa en destination-out
            ctx.lineWidth = action.width * 4;
            ctx.globalAlpha = 1;
        } else {
            ctx.strokeStyle = action.color;
            ctx.lineWidth = action.width;
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.beginPath();
        if (['pencil', 'marker', 'eraser'].includes(action.tool)) {
            if (action.points.length > 1) {
                ctx.moveTo(action.points[0].x, action.points[0].y);
                for (let i = 1; i < action.points.length; i++) ctx.lineTo(action.points[i].x, action.points[i].y);
                ctx.stroke();
            }
        } else if (action.start && action.end) {
            const w = action.end.x - action.start.x;
            const h = action.end.y - action.start.y;
            if (action.tool === 'rect_shape') ctx.strokeRect(action.start.x, action.start.y, w, h);
            else if (action.tool === 'circle_shape') {
                ctx.beginPath();
                ctx.ellipse(action.start.x + w/2, action.start.y + h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, 2*Math.PI);
                ctx.stroke();
            } else if (action.tool === 'triangle_shape') {
                ctx.beginPath();
                ctx.moveTo(action.start.x + w / 2, action.start.y);
                ctx.lineTo(action.start.x, action.start.y + h);
                ctx.lineTo(action.start.x + w, action.start.y + h);
                ctx.closePath();
                ctx.stroke();
            } else if (action.tool === 'star_shape') {
                const cx = action.start.x + w / 2;
                const cy = action.start.y + h / 2;
                const outerRadius = Math.min(Math.abs(w), Math.abs(h)) / 2;
                const innerRadius = outerRadius / 2;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (18 + i * 72) * Math.PI / 180; // Punta superior
                    const angleInner = (54 + i * 72) * Math.PI / 180;
                    ctx.lineTo(cx + Math.cos(angle) * outerRadius, cy - Math.sin(angle) * outerRadius);
                    ctx.lineTo(cx + Math.cos(angleInner) * innerRadius, cy - Math.sin(angleInner) * innerRadius);
                }
                ctx.closePath();
                ctx.stroke();
            } else if (action.tool === 'hexagon_shape') {
                const cx = action.start.x + w / 2;
                const cy = action.start.y + h / 2;
                const r = Math.min(Math.abs(w), Math.abs(h)) / 2;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (60 * i) * Math.PI / 180;
                    ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
                }
                ctx.closePath();
                ctx.stroke();
            } else if (action.tool === 'cloud_shape') {
                const x = action.start.x;
                const y = action.start.y;
                
                ctx.beginPath();
                ctx.moveTo(x + w * 0.2, y + h * 0.5);
                // Bulto Izquierdo Superior
                ctx.bezierCurveTo(x, y + h * 0.5, x, y + h * 0.2, x + w * 0.2, y + h * 0.2);
                // Bulto Superior Central
                ctx.bezierCurveTo(x + w * 0.2, y - h * 0.1, x + w * 0.5, y - h * 0.1, x + w * 0.5, y + h * 0.2);
                // Bulto Derecho Superior
                ctx.bezierCurveTo(x + w * 0.5, y, x + w * 0.8, y, x + w * 0.8, y + h * 0.2);
                // Bulto Derecho
                ctx.bezierCurveTo(x + w, y + h * 0.2, x + w, y + h * 0.5, x + w * 0.8, y + h * 0.5);
                // Bulto Inferior
                ctx.bezierCurveTo(x + w, y + h * 0.8, x + w * 0.5, y + h * 0.9, x + w * 0.5, y + h * 0.8);
                // Cierre
                ctx.bezierCurveTo(x + w * 0.5, y + h, x, y + h, x + w * 0.2, y + h * 0.5);
                ctx.closePath();
                ctx.stroke();
            }
        }
        ctx.restore();
    });
  };

  const drawNode = (ctx: CanvasRenderingContext2D, node: DiagramNode) => {
    const isSelected = selectedIds.has(node.id);
    ctx.save();
    
    // Paleta dinámica según modo
    const bg = darkMode ? '#1e293b' : '#ffffff';
    const border = isSelected ? '#3b82f6' : (darkMode ? '#475569' : '#64748b');
    const text = darkMode ? '#f1f5f9' : '#0f172a';
    const activeColor = node.color || bg;
    
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    // Escalar el grosor de línea con el tamaño de fuente (base 14px)
    const scaleFactor = Math.max(1, node.fontSize / 14);
    const baseWidth = (node.bold ? 3 : 1.5) * scaleFactor;
    ctx.lineWidth = isSelected ? baseWidth + 2 : baseWidth;
    const dbOffset = Math.max(5, ctx.lineWidth * 2); // Offset dinámico basado en el grosor

    // -- TABLE / CLASS --
    if (node.type === 'table' || node.type === 'table_keys' || node.type === 'uml_class') {
        const s = node.fontSize / 14; // Factor de escala para layout interno
        const headerH = node.fontSize + (16 * s);
        const rowH = node.fontSize + (10 * s);
        const totalH = headerH + (node.fields.length * rowH) + (10 * s);

        ctx.fillRect(node.x, node.y, node.w, node.h);
        ctx.strokeRect(node.x, node.y, node.w, node.h);

        // Header bg
        ctx.fillStyle = node.color || (darkMode ? '#334155' : '#e2e8f0');
        ctx.fillRect(node.x, node.y, node.w, headerH);
        ctx.beginPath(); ctx.moveTo(node.x, node.y + headerH); ctx.lineTo(node.x + node.w, node.y + headerH); ctx.stroke();
        
        // Titulo
        ctx.fillStyle = text;
        ctx.font = `bold ${node.fontSize}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(node.name, node.x + node.w/2, node.y + headerH/2);
        
        // Campos
        ctx.textAlign = 'left'; ctx.font = `${node.fontSize - 1}px monospace`;
        node.fields.forEach((f, i) => {
            const y = node.y + headerH + (rowH / 2) + (i * rowH); // Centrado vertical dinámico
            ctx.fillStyle = darkMode ? '#94a3b8' : '#6b7280'; // Tipo color suave
            
            // Dibujar Tipo (siempre a la derecha)
            ctx.fillText(f.type, node.x + node.w - ctx.measureText(f.type).width - 5, y); // Tipo a la derecha
            
            if (node.type === 'table_keys') {
                const keyWidth = node.fontSize * 2.5;
                // Dibujar Key (PK, FK, N)
                if (f.key) {
                    ctx.fillStyle = f.key === 'PK' ? '#eab308' : (f.key === 'FK' ? '#3b82f6' : '#94a3b8');
                    ctx.font = `bold ${node.fontSize - 2}px monospace`;
                    ctx.fillText(f.key, node.x + 5, y);
                }
                ctx.fillStyle = text;
                ctx.font = `${node.fontSize - 1}px monospace`;
                ctx.fillText(f.name, node.x + 5 + keyWidth, y); // Nombre desplazado dinámicamente
            } else if (node.type === 'uml_class') {
                ctx.fillStyle = text;
                const vis = f.visibility || '+';
                ctx.fillText(`${vis} ${f.name}`, node.x + 8, y);
            } else {
                ctx.fillStyle = text;
                ctx.fillText(f.name, node.x + 8, y); // Nombre normal
            }
        });

        // Métodos (Solo UML Class)
        if (node.type === 'uml_class' && node.methods && node.methods.length > 0) {
            const fieldsHeight = (node.fields.length * rowH) + 5;
            const separatorY = node.y + headerH + fieldsHeight;
            
            ctx.strokeStyle = isSelected ? '#3b82f6' : (darkMode ? '#475569' : '#000000');
            ctx.beginPath(); ctx.moveTo(node.x, separatorY); ctx.lineTo(node.x + node.w, separatorY); ctx.stroke();

            node.methods.forEach((m, i) => {
                const y = separatorY + (rowH / 2) + (i * rowH) + 5;
                ctx.fillStyle = text;
                const vis = m.visibility || '+';
                ctx.fillText(`${vis} ${m.name}(): ${m.type}`, node.x + 8, y);
            });
        }
    }
    // -- ACTOR --
    else if (node.type === 'uml_actor') {
        const cx = node.x + node.w/2;
        const s = node.fontSize / 14; // Escala basada en fuente base 14px
        if (node.color && !isSelected) ctx.strokeStyle = node.color;
        
        ctx.beginPath(); ctx.arc(cx, node.y + 15*s, 15*s, 0, 2*Math.PI); ctx.stroke(); // Cabeza
        ctx.beginPath(); ctx.moveTo(cx, node.y + 30*s); ctx.lineTo(cx, node.y + 70*s); ctx.stroke(); // Cuerpo
        ctx.beginPath(); ctx.moveTo(cx - 20*s, node.y + 45*s); ctx.lineTo(cx + 20*s, node.y + 45*s); ctx.stroke(); // Brazos
        ctx.beginPath(); ctx.moveTo(cx, node.y + 70*s); ctx.lineTo(cx - 20*s, node.y + 100*s); ctx.moveTo(cx, node.y + 70*s); ctx.lineTo(cx + 20*s, node.y + 100*s); ctx.stroke(); // Piernas
        ctx.font = `${node.bold ? 'bold ' : ''}${node.fontSize}px sans-serif`;
        ctx.fillStyle = text; ctx.textAlign = 'center'; 
        ctx.fillText(node.name, cx, node.y + 115*s);
    }
    // -- FORMAS DE FLUJO --
    else if (['uml_usecase', 'start', 'decision', 'io', 'subprocess', 'document', 'manual_input', 'display', 'off_page', 'delay', 'er_inheritance', 'er_relationship', 'er_attribute'].includes(node.type)) {
        if (node.color) ctx.fillStyle = node.color;
        
        ctx.beginPath();
        if (node.type === 'decision' || node.type === 'er_relationship') {
            ctx.moveTo(node.x + node.w/2, node.y); ctx.lineTo(node.x + node.w, node.y + node.h/2);
            ctx.lineTo(node.x + node.w/2, node.y + node.h); ctx.lineTo(node.x, node.y + node.h/2);
            ctx.closePath(); // Cerrar forma exterior correctamente
            
            // Doble Borde (Rombo)
            if (node.doubleBorder) {
                const ratio = node.w / node.h;
                const offY = dbOffset;
                const offX = dbOffset * ratio;

                ctx.moveTo(node.x + node.w/2, node.y + offY); 
                ctx.lineTo(node.x + node.w - offX, node.y + node.h/2);
                ctx.lineTo(node.x + node.w/2, node.y + node.h - offY); 
                ctx.lineTo(node.x + offX, node.y + node.h/2);
                ctx.closePath(); // Cerrar forma interior correctamente
            }
        } else if (node.type === 'start') {
            // Cápsula (Terminator)
            const r = Math.min(node.w, node.h) / 2;
            ctx.roundRect(node.x, node.y, node.w, node.h, r);
        } else if (node.type === 'io') {
            // Paralelogramo
            const slant = node.w * 0.2; // Proporcional puro
            ctx.moveTo(node.x + slant, node.y); 
            ctx.lineTo(node.x + node.w, node.y);
            ctx.lineTo(node.x + node.w - slant, node.y + node.h); 
            ctx.lineTo(node.x, node.y + node.h);
        } else if (node.type === 'subprocess') {
            // Rectángulo con líneas verticales
            ctx.rect(node.x, node.y, node.w, node.h);
        } else if (node.type === 'document') {
            // Documento (fondo ondulado)
            const wave = node.h * 0.15; // Proporcional puro
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(node.x + node.w, node.y);
            ctx.lineTo(node.x + node.w, node.y + node.h - wave);
            ctx.bezierCurveTo(node.x + node.w/2, node.y + node.h + wave, node.x + node.w/2, node.y + node.h - (wave*2), node.x, node.y + node.h - wave);
            ctx.closePath();
        } else if (node.type === 'manual_input') {
            // Entrada Manual (Trapezoide)
            const drop = node.h * 0.25; // Proporcional puro
            ctx.moveTo(node.x, node.y + drop);
            ctx.lineTo(node.x + node.w, node.y);
            ctx.lineTo(node.x + node.w, node.y + node.h);
            ctx.lineTo(node.x, node.y + node.h);
            ctx.closePath();
        } else if (node.type === 'display') {
            // Pantalla (Bala)
            const indent = node.w * 0.2; // Proporcional puro
            ctx.moveTo(node.x, node.y + node.h/2);
            ctx.lineTo(node.x + indent, node.y);
            ctx.lineTo(node.x + node.w - indent, node.y);
            ctx.quadraticCurveTo(node.x + node.w, node.y + node.h/2, node.x + node.w - indent, node.y + node.h);
            ctx.lineTo(node.x + indent, node.y + node.h);
            ctx.closePath();
        } else if (node.type === 'off_page') {
            // Referencia (Pentágono abajo)
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(node.x + node.w, node.y);
            ctx.lineTo(node.x + node.w, node.y + node.h/2);
            ctx.lineTo(node.x + node.w/2, node.y + node.h);
            ctx.lineTo(node.x, node.y + node.h/2);
            ctx.closePath();
        } else if (node.type === 'delay') {
            // Retardo (D-shape)
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(node.x + node.w - node.h/2, node.y);
            ctx.arc(node.x + node.w - node.h/2, node.y + node.h/2, node.h/2, -Math.PI/2, Math.PI/2);
            ctx.lineTo(node.x, node.y + node.h);
            ctx.closePath();
        } else if (node.type === 'er_inheritance') {
            // Herencia (Triángulo hacia abajo)
            ctx.moveTo(node.x, node.y); // Top Left
            ctx.lineTo(node.x + node.w, node.y); // Top Right
            ctx.lineTo(node.x + node.w/2, node.y + node.h); // Bottom Center
            ctx.closePath();
            
            // Doble Borde (Herencia)
            if (node.doubleBorder) {
                const off = dbOffset;
                ctx.moveTo(node.x + off * 2, node.y + off); 
                ctx.lineTo(node.x + node.w - off * 2, node.y + off);
                ctx.lineTo(node.x + node.w/2, node.y + node.h - off);
                ctx.closePath();
            }
        } else {
            ctx.ellipse(node.x + node.w/2, node.y + node.h/2, node.w/2, node.h/2, 0, 0, 2*Math.PI);
            // Doble Borde (Elipse)
            if (node.doubleBorder) {
                const off = dbOffset;
                ctx.moveTo(node.x + node.w/2 + node.w/2 - off, node.y + node.h/2); // Mover al inicio para evitar línea extra
                ctx.ellipse(node.x + node.w/2, node.y + node.h/2, Math.abs(node.w/2) - off, Math.abs(node.h/2) - off, 0, 0, 2*Math.PI);
            }
        }
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Dibujo extra para Subproceso
        if (node.type === 'subprocess') {
            const inset = node.w * 0.15; // Proporcional puro
            ctx.beginPath();
            ctx.moveTo(node.x + inset, node.y); ctx.lineTo(node.x + inset, node.y + node.h);
            ctx.moveTo(node.x + node.w - inset, node.y); ctx.lineTo(node.x + node.w - inset, node.y + node.h);
            ctx.stroke();
        }

        ctx.font = `${node.bold ? 'bold ' : ''}${node.fontSize}px sans-serif`;
        const displayName = node.textInParentheses ? `(${node.name})` : node.name;
        
        // Ajuste automático de tamaño de fuente (Ancho y Alto)
        let borderOffset = 0;
        if (node.doubleBorder) {
            borderOffset = dbOffset;
        }

        let widthFactor = 0.9;
        let heightFactor = 0.8;

        if (['decision', 'er_relationship'].includes(node.type)) { widthFactor = 0.65; heightFactor = 0.65; }
        else if (['start', 'uml_usecase', 'er_attribute', 'delay', 'display'].includes(node.type)) { widthFactor = 0.75; heightFactor = 0.75; }
        else if (['er_inheritance'].includes(node.type)) { widthFactor = 0.5; heightFactor = 0.3; }

        const availableW = Math.max(10, node.w - (borderOffset * 2));
        const availableH = Math.max(10, node.h - (borderOffset * 2));

        const maxTextWidth = availableW * widthFactor;
        const maxTextHeight = availableH * heightFactor;

        const currentTextWidth = ctx.measureText(displayName).width;
        
        const widthRatio = maxTextWidth / currentTextWidth;
        const heightRatio = maxTextHeight / node.fontSize;
        
        const ratio = Math.min(widthRatio, heightRatio, 1);

        if (ratio < 1) {
            const newSize = Math.max(8, Math.floor(node.fontSize * ratio));
            ctx.font = `${node.bold ? 'bold ' : ''}${newSize}px sans-serif`;
        }

        ctx.fillStyle = text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        // Ajuste de posición vertical para Herencia (Triángulo) para usar la parte más ancha
        const textY = node.type === 'er_inheritance' ? node.y + (node.h * 0.25) : node.y + node.h/2;
        ctx.fillText(displayName, node.x + node.w/2, textY);

        // Subrayado (Underline)
        if (node.underline) {
            const metrics = ctx.measureText(displayName);
            const tx = node.x + node.w/2;
            const ty = textY;
            const yLine = ty + (node.fontSize/2) + 3;
            ctx.beginPath(); ctx.moveTo(tx - metrics.width/2, yLine); ctx.lineTo(tx + metrics.width/2, yLine); ctx.stroke();
        }
    }
    // -- NOTAS / TEXTO --
    else if (node.type === 'uml_note' || node.type === 'text') {
        if (node.type === 'uml_note') {
            ctx.fillStyle = node.color || (darkMode ? '#3a3520' : '#fef9c3');
            if (!isSelected && !node.color) ctx.strokeStyle = darkMode ? '#7a6b30' : '#ca8a04';
            ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(node.x + node.w - 15, node.y);
            ctx.lineTo(node.x + node.w, node.y + 15); ctx.lineTo(node.x + node.w, node.y + node.h);
            ctx.lineTo(node.x, node.y + node.h); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(node.x + node.w - 15, node.y); ctx.lineTo(node.x + node.w - 15, node.y + 15); ctx.lineTo(node.x + node.w, node.y + 15); ctx.stroke();
            ctx.fillStyle = text;
        } else {
            ctx.fillStyle = 'transparent'; ctx.strokeStyle = isSelected ? '#3b82f6' : 'transparent';
            ctx.strokeRect(node.x, node.y, node.w, node.h);
            ctx.fillStyle = node.color || text;
        }
        ctx.font = `${node.bold ? 'bold ' : ''}${node.fontSize}px sans-serif`;
        
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(node.name, node.x + 8, node.y + 8);
    }
    // -- CAJA PROCESO (DEFAULT) --
    else {
        if (node.color) ctx.fillStyle = node.color;
        ctx.fillRect(node.x, node.y, node.w, node.h);
        ctx.strokeRect(node.x, node.y, node.w, node.h);
        
        // Doble Borde (Rectángulo)
        let borderOffset = 0;
        if (node.doubleBorder) {
            borderOffset = dbOffset;
            ctx.strokeRect(node.x + borderOffset, node.y + borderOffset, node.w - borderOffset*2, node.h - borderOffset*2);
        }

        ctx.font = `${node.bold ? 'bold ' : ''}${node.fontSize}px sans-serif`;
        ctx.fillStyle = text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        const displayName = node.textInParentheses ? `(${node.name})` : node.name;
        
        // Ajuste de texto para rectángulos (er_entity, process)
        // Calculamos el espacio disponible real restando el borde doble si existe
        const availableW = node.w - (borderOffset * 2);
        const availableH = node.h - (borderOffset * 2);

        const maxTextWidth = availableW * 0.9;
        const maxTextHeight = availableH * 0.8; // Margen vertical para evitar tocar arriba/abajo

        const currentTextWidth = ctx.measureText(displayName).width;
        
        const widthRatio = maxTextWidth / currentTextWidth;
        const heightRatio = maxTextHeight / node.fontSize; // Aproximación de altura
        
        const ratio = Math.min(widthRatio, heightRatio, 1);

        if (ratio < 1) {
            const newSize = Math.max(8, Math.floor(node.fontSize * ratio));
            ctx.font = `${node.bold ? 'bold ' : ''}${newSize}px sans-serif`;
        }

        ctx.fillText(displayName, node.x + node.w/2, node.y + node.h/2);

        if (node.underline) {
            const metrics = ctx.measureText(displayName);
            const tx = node.x + node.w/2;
            const ty = node.y + node.h/2;
            const yLine = ty + (node.fontSize/2) + Math.max(3, node.fontSize * 0.15);
            ctx.beginPath(); ctx.moveTo(tx - metrics.width/2, yLine); ctx.lineTo(tx + metrics.width/2, yLine); ctx.stroke();
        }
    }
    ctx.restore();
  };

  const drawConnection = (ctx: CanvasRenderingContext2D, conn: Connection) => {
    const from = nodes.find(n => n.id === conn.from);
    const to = nodes.find(n => n.id === conn.to);
    if (!from || !to) return;

    // Usar la lógica centralizada para obtener los puntos de la curva
    const { start, cp1, cp2, end } = getBezierPath(conn, from, to);

    ctx.save();
    const isSelected = selectedIds.has(conn.id);
    ctx.strokeStyle = isSelected ? '#3b82f6' : (conn.color || (darkMode ? '#94a3b8' : '#64748b'));
    const lineWidth = conn.width || 2;
    ctx.lineWidth = isSelected ? lineWidth + 1 : lineWidth;
    
    // Estilos de línea
    if (conn.style === 'dashed') {
        ctx.setLineDash([6, 6]);
    }

    const defaultSymbols = getRelationSymbols(conn.type);
    const startMarker = conn.startMarker || defaultSymbols.start || 'None';
    const endMarker = conn.endMarker || defaultSymbols.end || 'None';

    // Ajuste para que la línea no sobresalga de la flecha (shortening)
    const isFilled = (m: string) => ['Arrow', 'Triangle', 'DiamondFilled', 'DiamondHollow'].includes(m);
    const shortenStart = isFilled(startMarker) ? (lineWidth * 2) : 0;
    const shortenEnd = isFilled(endMarker) ? (lineWidth * 2) : 0;

    const dxS = cp1.x - start.x, dyS = cp1.y - start.y, lenS = Math.hypot(dxS, dyS);
    const drawStart = (shortenStart > 0 && lenS > shortenStart) ? { x: start.x + (dxS/lenS)*shortenStart, y: start.y + (dyS/lenS)*shortenStart } : start;

    const dxE = cp2.x - end.x, dyE = cp2.y - end.y, lenE = Math.hypot(dxE, dyE);
    const drawEnd = (shortenEnd > 0 && lenE > shortenEnd) ? { x: end.x + (dxE/lenE)*shortenEnd, y: end.y + (dyE/lenE)*shortenEnd } : end;

    ctx.beginPath();
    ctx.moveTo(drawStart.x, drawStart.y);
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, drawEnd.x, drawEnd.y);
    ctx.stroke();
    ctx.setLineDash([]); // Reset para la punta

    // Dibujar símbolos en los extremos
    // Ángulo de salida en Start: vector start -> cp1
    const startAngle = Math.atan2(cp1.y - start.y, cp1.x - start.x);
    // Ángulo de salida en End (hacia atrás): vector end -> cp2
    const endAngle = Math.atan2(cp2.y - end.y, cp2.x - end.x);

    const markerColor = isSelected ? '#3b82f6' : (conn.color || (darkMode ? '#94a3b8' : '#64748b'));
    if (startMarker !== 'None') drawSymbol(ctx, start, startAngle, startMarker, markerColor, lineWidth);
    if (endMarker !== 'None') drawSymbol(ctx, end, endAngle, endMarker, markerColor, lineWidth);

    // Dibujar Etiqueta (Texto en la línea)
    if (conn.label) {
        const t = 0.5;
        // Fórmula Bezier Cúbica para t=0.5
        const mx = 0.125 * start.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * end.x;
        const my = 0.125 * start.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * end.y;

        // Aumentar tamaño de fuente más agresivamente con el grosor
        const fontSize = 12 + (lineWidth * 2);
        ctx.font = `bold ${fontSize}px sans-serif`;
        const metrics = ctx.measureText(conn.label);
        const padding = 4;
        const w = metrics.width + padding * 2;
        const h = fontSize + 4 + padding * 2;

        ctx.save();
        ctx.translate(mx, my);
        ctx.fillStyle = darkMode ? '#1e293b' : '#ffffff';
        ctx.lineWidth = 1;
        
        // Fondo caja
        ctx.beginPath();
        if ('roundRect' in (ctx as any)) {
            (ctx as any).roundRect(-w/2, -h/2, w, h, 4);
        } else {
            ctx.rect(-w/2, -h/2, w, h);
        }
        ctx.fill();
        ctx.stroke();

        // Texto
        ctx.fillStyle = darkMode ? '#f1f5f9' : '#111827';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(conn.label, 0, 0);
        ctx.restore();
    }
    
    ctx.restore();
  };

  const getRelationSymbols = (type: RelationType) => {
      switch (type) {
          case '1:1': return { start: 'OneBar', end: 'OneBar' };
          case '1:N': return { start: 'OneBar', end: 'CrowFoot' };
          case 'N:M': return { start: 'CrowFoot', end: 'CrowFoot' };
          case 'BiFlow': return { start: 'Arrow', end: 'Arrow' };
          case 'Flow': return { end: 'Arrow' };
          case 'Inheritance': case 'Generalization': case 'Realization': return { end: 'Triangle' };
          case 'Composition': return { end: 'DiamondFilled' };
          case 'Aggregation': return { end: 'DiamondHollow' };
          case 'Dependency': return { end: 'OpenArrow' };
          default: return { end: 'Arrow' };
      }
  };

  const drawSymbol = (ctx: CanvasRenderingContext2D, p: {x:number, y:number}, angle: number, symbol: string, color: string, width: number) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);

    // Escalar el símbolo (flecha) proporcionalmente al grosor de la línea
    const scale = 1 + (width - 2) * 0.3;
    ctx.scale(scale, scale);
    
    const fill = darkMode ? '#1e293b' : '#ffffff';
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = width / scale; // Mantener grosor visual consistente

    if (symbol === 'Arrow') {
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(12, 6); ctx.lineTo(12, -6); ctx.closePath(); ctx.fill();
    } else if (symbol === 'OpenArrow') {
        ctx.beginPath(); ctx.moveTo(12, 6); ctx.lineTo(0, 0); ctx.lineTo(12, -6); ctx.stroke();
    } else if (symbol === 'Triangle') {
        ctx.fillStyle = fill;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(12, 6); ctx.lineTo(12, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (symbol === 'DiamondFilled') {
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(12, 6); ctx.lineTo(24, 0); ctx.lineTo(12, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (symbol === 'DiamondHollow') {
        ctx.fillStyle = fill;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(12, 6); ctx.lineTo(24, 0); ctx.lineTo(12, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (symbol === 'CrowFoot') {
        ctx.beginPath();
        ctx.moveTo(14, 0); ctx.lineTo(0, 10);
        ctx.moveTo(14, 0); ctx.lineTo(0, -10);
        ctx.stroke();
    } else if (symbol === 'CrowFootOne') {
        ctx.beginPath();
        ctx.moveTo(14, 0); ctx.lineTo(0, 10);
        ctx.moveTo(14, 0); ctx.lineTo(0, -10);
        ctx.moveTo(14, 8); ctx.lineTo(14, -8); // Barra en la convergencia
        ctx.stroke();
    } else if (symbol === 'OneBar') {
        ctx.beginPath();
        ctx.moveTo(2, 8); ctx.lineTo(2, -8);
        ctx.moveTo(8, 8); ctx.lineTo(8, -8);
        ctx.stroke();
    }
    
    ctx.restore();
  };

  // --- LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const gridCanvas = gridCanvasRef.current;
    if (!canvas || !gridCanvas) return;
    
    const ctx = canvas.getContext('2d');
    const gridCtx = gridCanvas.getContext('2d');
    if (!ctx || !gridCtx) return;

    // Inicializar canvas offscreen para la capa de pintura
    if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offscreenCanvas = offscreenCanvasRef.current;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Ajustar ambos lienzos
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    gridCanvas.width = rect.width * dpr;
    gridCanvas.height = rect.height * dpr;
    offscreenCanvas.width = rect.width * dpr;
    offscreenCanvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    gridCtx.scale(dpr, dpr);
    offscreenCtx.scale(dpr, dpr);

    // Limpiar ambos
    ctx.clearRect(0, 0, rect.width, rect.height);
    gridCtx.clearRect(0, 0, rect.width, rect.height);
    offscreenCtx.clearRect(0, 0, rect.width, rect.height);

    // 1. Dibujar Cuadrícula en el lienzo trasero
    if (showGrid) {
        gridCtx.save();
        gridCtx.translate(pan.x, pan.y);
        gridCtx.scale(scale, scale);
        drawGrid(gridCtx, rect.width, rect.height);
        gridCtx.restore();
    }

    // 2. Dibujar Nodos y Conexiones en Main Canvas
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);
    
    connections.forEach(c => drawConnection(ctx, c));
    nodes.slice().sort((a, b) => (selectedIds.has(a.id) ? 1 : 0) - (selectedIds.has(b.id) ? 1 : 0)).forEach(n => drawNode(ctx, n));

    // Preview Conexión
    if (connectingId && isDrawing) {
        const from = nodes.find(n => n.id === connectingId);
        if (from) {
            const start = getRectIntersection(mouseCanvasPos, from);
            ctx.strokeStyle = '#3b82f6'; ctx.setLineDash([5,5]); ctx.lineWidth=2;
            ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(mouseCanvasPos.x, mouseCanvasPos.y); ctx.stroke();
        }
    }
    ctx.restore();

    // 3. Dibujar Paint Layer en Offscreen Canvas (Aislado)
    offscreenCtx.save();
    offscreenCtx.translate(pan.x, pan.y);
    offscreenCtx.scale(scale, scale);
    drawPaintLayer(offscreenCtx);
    
    // Preview Paint en Offscreen
    if (isPaintTool) {
        if (isDrawing && drawStartPos) {
            offscreenCtx.strokeStyle = paintColor; offscreenCtx.lineWidth = paintWidth;
            const w = mouseCanvasPos.x - drawStartPos.x;
            const h = mouseCanvasPos.y - drawStartPos.y;

            if (tool === 'rect_shape') offscreenCtx.strokeRect(drawStartPos.x, drawStartPos.y, w, h);
            else if (tool === 'circle_shape') {
                offscreenCtx.beginPath(); offscreenCtx.ellipse(drawStartPos.x + w/2, drawStartPos.y + h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, 2*Math.PI); offscreenCtx.stroke();
            } else if (tool === 'triangle_shape') {
                offscreenCtx.beginPath();
                offscreenCtx.moveTo(drawStartPos.x + w / 2, drawStartPos.y);
                offscreenCtx.lineTo(drawStartPos.x, drawStartPos.y + h);
                offscreenCtx.lineTo(drawStartPos.x + w, drawStartPos.y + h);
                offscreenCtx.closePath();
                offscreenCtx.stroke();
            } else if (tool === 'star_shape') {
                const cx = drawStartPos.x + w / 2;
                const cy = drawStartPos.y + h / 2;
                const outerRadius = Math.min(Math.abs(w), Math.abs(h)) / 2;
                const innerRadius = outerRadius / 2;
                offscreenCtx.beginPath();
                for (let i = 0; i < 5; i++) {
                    offscreenCtx.lineTo(cx + Math.cos((18 + i * 72) * Math.PI / 180) * outerRadius, cy - Math.sin((18 + i * 72) * Math.PI / 180) * outerRadius);
                    offscreenCtx.lineTo(cx + Math.cos((54 + i * 72) * Math.PI / 180) * innerRadius, cy - Math.sin((54 + i * 72) * Math.PI / 180) * innerRadius);
                }
                offscreenCtx.closePath();
                offscreenCtx.stroke();
            } else if (tool === 'hexagon_shape') {
                const cx = drawStartPos.x + w / 2;
                const cy = drawStartPos.y + h / 2;
                const r = Math.min(Math.abs(w), Math.abs(h)) / 2;
                offscreenCtx.beginPath();
                for (let i = 0; i < 6; i++) {
                    offscreenCtx.lineTo(cx + r * Math.cos((60 * i) * Math.PI / 180), cy + r * Math.sin((60 * i) * Math.PI / 180));
                }
                offscreenCtx.closePath();
                offscreenCtx.stroke();
            } else if (tool === 'cloud_shape') {
                const x = drawStartPos.x;
                const y = drawStartPos.y;
                offscreenCtx.beginPath();
                offscreenCtx.moveTo(x + w * 0.2, y + h * 0.5);
                offscreenCtx.bezierCurveTo(x, y + h * 0.5, x, y + h * 0.2, x + w * 0.2, y + h * 0.2);
                offscreenCtx.bezierCurveTo(x + w * 0.2, y - h * 0.1, x + w * 0.5, y - h * 0.1, x + w * 0.5, y + h * 0.2);
                offscreenCtx.bezierCurveTo(x + w * 0.5, y, x + w * 0.8, y, x + w * 0.8, y + h * 0.2);
                offscreenCtx.bezierCurveTo(x + w, y + h * 0.2, x + w, y + h * 0.5, x + w * 0.8, y + h * 0.5);
                offscreenCtx.bezierCurveTo(x + w, y + h * 0.8, x + w * 0.5, y + h * 0.9, x + w * 0.5, y + h * 0.8);
                offscreenCtx.bezierCurveTo(x + w * 0.5, y + h, x, y + h, x + w * 0.2, y + h * 0.5);
                offscreenCtx.closePath();
                offscreenCtx.stroke();
            }
        }
    }
    offscreenCtx.restore();

    // 4. Componer Paint Layer sobre Main Canvas
    ctx.drawImage(offscreenCanvas, 0, 0, rect.width, rect.height);

    // 5. UI Overlays (Cursor Borrador) - Dibujar en Main Canvas
    if (tool === 'eraser') {
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(scale, scale);
        ctx.strokeStyle = darkMode ? '#fff' : '#000';
        ctx.lineWidth = 1 / scale;
        ctx.strokeRect(mouseCanvasPos.x - paintWidth*2, mouseCanvasPos.y - paintWidth*2, paintWidth*4, paintWidth*4);
        ctx.restore();
    }
    
    // 6. Selection Box Overlay
    if (isSelecting && selectionBox) {
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(scale, scale);
        const x = Math.min(selectionBox.start.x, selectionBox.end.x);
        const y = Math.min(selectionBox.start.y, selectionBox.end.y);
        const w = Math.abs(selectionBox.end.x - selectionBox.start.x);
        const h = Math.abs(selectionBox.end.y - selectionBox.start.y);
        
        ctx.fillStyle = darkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1 / scale;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }

  }, [nodes, connections, paintActions, pan, scale, darkMode, selectedIds, connectingId, mouseCanvasPos, isDrawing, tool, paintWidth, paintColor, showGrid, isSelecting, selectionBox]);

  // --- HANDLERS ---
  const handleWheel = (e: React.WheelEvent) => {
    const zoomIntensity = 0.1;
    const delta = -Math.sign(e.deltaY);
    const newScale = Math.min(Math.max(0.1, scale + delta * zoomIntensity), 5);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scaleRatio = newScale / scale;
    const newPanX = mouseX - (mouseX - pan.x) * scaleRatio;
    const newPanY = mouseY - (mouseY - pan.y) * scaleRatio;

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = screenToCanvas(e);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    setMouseCanvasPos(pos);
    setIsDrawing(true);

    if (isPaintTool) {
        setDrawStartPos(pos);
        if (['pencil', 'marker', 'eraser'].includes(tool)) {
            saveToHistory();
            setPaintActions([...paintActions, { id: generateId(), tool: tool as any, points: [pos], color: paintColor, width: paintWidth }]);
        }
        return;
    }

    // Lógica Diagrama
    if (!['select', 'hand', 'relation'].includes(tool)) {
        let initialW = tool === 'uml_actor' ? 60 : 120;
        let initialH = tool === 'uml_actor' ? 120 : 60;
        
        if (['table', 'table_keys', 'uml_class'].includes(tool)) {
            initialW = 160;
            initialH = 140;
        }

        // Auto-size inicial para texto
        if (tool === 'text') {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                ctx.font = '14px sans-serif';
                initialW = ctx.measureText('Texto').width + 16;
                initialH = 14 + 16;
            }
        }

        // Mapeo de herramientas ER a tipos base con propiedades
        let finalTool = tool;
        let initialName = 'Nuevo Nodo';
        let extraProps: any = {};

        if (tool.startsWith('er_')) {
            // Mantenemos el tipo original para distinguir en propiedades
            if (tool === 'er_entity') initialName = 'Entidad';
            else if (tool === 'er_relationship') initialName = 'Relación';
            else if (tool === 'er_attribute') initialName = 'Atributo';
            else if (tool === 'er_inheritance') initialName = 'ISA';
            
            // Ajustar tamaño inicial para atributos
            if (tool === 'er_attribute') {
                initialW = 100; initialH = 60;
            }
        }

        const newNode: DiagramNode = {
            id: generateId(),
            type: finalTool,
            x: snapToGrid(pos.x - 50),
            y: snapToGrid(pos.y - 25),
            w: initialW,
            h: initialH,
            name: tool === 'text' ? 'Texto' : initialName,
            fields: tool === 'uml_class' 
                ? [{name: 'atributo', type: 'String', visibility: '+'}] 
                : [{name: 'id', type: 'int'}],
            methods: tool === 'uml_class' 
                ? [{name: 'metodo', type: 'void', visibility: '+'}] 
                : undefined,
            color: '',
            fontSize: 14,
            ...extraProps
        };
        setNodes([...nodes, newNode]);
        setTool('select');
        saveToHistory();
        return;
    }

    // 1. Chequeo de click en Dibujos/Figuras (Paint Actions) - Prioridad Alta (Visualmente encima)
    if (tool === 'select') {
        const clickedPaint = paintActions.slice().reverse().find(p => {
            if (p.start && p.end) {
                // Figuras: Bounding Box
                const x = Math.min(p.start.x, p.end.x);
                const y = Math.min(p.start.y, p.end.y);
                const w = Math.abs(p.end.x - p.start.x);
                const h = Math.abs(p.end.y - p.start.y);
                return pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h;
            } else if (['pencil', 'marker'].includes(p.tool)) {
                // Trazos: Distancia a puntos
                return p.points.some(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < (p.width + 5));
            }
            return false;
        });

        if (clickedPaint) {
            const newSelected = new Set(e.ctrlKey || e.shiftKey ? selectedIds : []);
            if (newSelected.has(clickedPaint.id)) newSelected.delete(clickedPaint.id);
            else newSelected.add(clickedPaint.id);
            setSelectedIds(newSelected);
            // No iniciamos arrastre para dibujos simples por ahora, solo selección
            return;
        }
    }

    // 2. Chequeo de click en Nodos
    const clickedNode = nodes.slice().reverse().find(n => 
        pos.x >= n.x && pos.x <= n.x + n.w && pos.y >= n.y && pos.y <= n.y + n.h
    );

    if (clickedNode) {
        if (tool === 'relation') {
            setConnectingId(clickedNode.id);
            return;
        }
        
        // Selección Múltiple
        const newSelected = new Set(e.ctrlKey || e.shiftKey ? selectedIds : []);
        if (newSelected.has(clickedNode.id)) {
            if (e.ctrlKey || e.shiftKey) newSelected.delete(clickedNode.id);
        } else {
            newSelected.add(clickedNode.id);
        }
        setSelectedIds(newSelected);
        setDraggingId(clickedNode.id);
        setDragOffset({ x: pos.x - clickedNode.x, y: pos.y - clickedNode.y });
    } else {
        // 3. Chequeo de click en conexiones
        const clickedConn = connections.find(c => {
             const from = nodes.find(n => n.id === c.from);
             const to = nodes.find(n => n.id === c.to);
             if (!from || !to) return false;
             
             const { start, cp1, cp2, end } = getBezierPath(c, from, to);
             return isPointNearBezier(pos, start, cp1, cp2, end);
        });
        
        if (clickedConn) {
             const newSelected = new Set(e.ctrlKey || e.shiftKey ? selectedIds : []);
             if (newSelected.has(clickedConn.id)) newSelected.delete(clickedConn.id);
             else newSelected.add(clickedConn.id);
             setSelectedIds(newSelected);
             return;
        }
        
        if (!e.ctrlKey && !e.shiftKey) setSelectedIds(new Set());
        
        if (tool === 'hand') {
            setIsPanning(true);
        } else if (tool === 'select') {
            setIsSelecting(true);
            setSelectionBox({ start: pos, end: pos });
        }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = screenToCanvas(e);
    setMouseCanvasPos(pos);

    if (isDrawing && ['pencil', 'marker', 'eraser'].includes(tool)) {
        const actions = [...paintActions];
        actions[actions.length - 1].points.push(pos);
        setPaintActions(actions);
        return;
    }

    if (isSelecting && selectionBox) {
        const currentBox = { ...selectionBox, end: pos };
        setSelectionBox(currentBox);
        
        const x = Math.min(currentBox.start.x, currentBox.end.x);
        const y = Math.min(currentBox.start.y, currentBox.end.y);
        const w = Math.abs(currentBox.end.x - currentBox.start.x);
        const h = Math.abs(currentBox.end.y - currentBox.start.y);
        
        const newSelected = new Set<string>();
        nodes.forEach(n => {
            if (n.x < x + w && n.x + n.w > x && n.y < y + h && n.y + n.h > y) {
                newSelected.add(n.id);
            }
        });
        paintActions.forEach(p => {
            let px, py, pw, ph;
            if (p.start && p.end) {
                px = Math.min(p.start.x, p.end.x);
                py = Math.min(p.start.y, p.end.y);
                pw = Math.abs(p.end.x - p.start.x);
                ph = Math.abs(p.end.y - p.start.y);
            } else if (p.points && p.points.length > 0) {
                const xs = p.points.map(pt => pt.x);
                const ys = p.points.map(pt => pt.y);
                px = Math.min(...xs);
                py = Math.min(...ys);
                pw = Math.max(...xs) - px;
                ph = Math.max(...ys) - py;
            } else return;

            if (px < x + w && px + pw > x && py < y + h && py + ph > y) {
                newSelected.add(p.id);
            }
        });
        setSelectedIds(newSelected);
        return;
    }

    if (isPanning) {
        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;
        setPan({ x: pan.x + dx, y: pan.y + dy });
        setLastMousePos({ x: e.clientX, y: e.clientY });
        return;
    }

    if (draggingId) {
        const draggedNode = nodes.find(n => n.id === draggingId);
        if (!draggedNode) return;
        
        // Calcular nueva posición basada en el offset inicial para evitar saltos
        const dx = snapToGrid(pos.x - dragOffset.x) - draggedNode.x;
        const dy = snapToGrid(pos.y - dragOffset.y) - draggedNode.y;
        
        setNodes(nodes.map(n => selectedIds.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n));
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if (drawStartPos && ['rect_shape', 'circle_shape', 'triangle_shape', 'star_shape', 'hexagon_shape', 'cloud_shape'].includes(tool)) {
        setPaintActions([...paintActions, { id: generateId(), tool: tool as any, start: drawStartPos, end: mouseCanvasPos, color: paintColor, width: paintWidth, points: [] }]);
        saveToHistory();
    }
    
    if (connectingId) {
        const target = nodes.slice().reverse().find(n => 
            mouseCanvasPos.x >= n.x && mouseCanvasPos.x <= n.x + n.w && 
            mouseCanvasPos.y >= n.y && mouseCanvasPos.y <= n.y + n.h
        );
        if (target && target.id !== connectingId) {
            // Verificar si ya existe conexión (en cualquier dirección)
            const existing = connections.find(c => 
                (c.from === connectingId && c.to === target.id) || 
                (c.from === target.id && c.to === connectingId)
            );

            if (!existing) {
                const symbols = getRelationSymbols(relationType);
                setConnections([...connections, { 
                    id: generateId(), from: connectingId, to: target.id, type: relationType, 
                    style: ['Dependency', 'Realization'].includes(relationType) ? 'dashed' : 'solid',
                    startMarker: symbols.start,
                    endMarker: symbols.end
                }]);
                saveToHistory();
            } else {
                alert("Ya existe una conexión. Selecciónala para editar sus extremos.");
            }
        }
        setConnectingId(null);
    }

    setDraggingId(null);
    setDrawStartPos(null);
    setIsPanning(false);
    setIsSelecting(false);
    setSelectionBox(null);
  };

  // --- GESTIÓN DE HOJAS ---
  const getCurrentSheetsState = () => {
      const updatedSheets = [...sheets];
      updatedSheets[activeSheetIndex] = {
          ...updatedSheets[activeSheetIndex],
          nodes,
          connections,
          paintActions,
          history,
          historyIndex,
          pan,
          scale
      };
      return updatedSheets;
  };

  const switchSheet = (index: number) => {
      if (index === activeSheetIndex) return;
      
      const updatedSheets = getCurrentSheetsState();
      setSheets(updatedSheets);
      
      const target = updatedSheets[index];
      setNodes(target.nodes);
      setConnections(target.connections);
      setPaintActions(target.paintActions);
      setHistory(target.history);
      setHistoryIndex(target.historyIndex);
      setPan(target.pan);
      setScale(target.scale);
      
      setActiveSheetIndex(index);
  };

  const addSheet = () => {
      if (sheets.length >= 5) return;
      
      const updatedSheets = getCurrentSheetsState();
      
      const newSheet: Sheet = {
          id: generateId(),
          name: `Hoja ${updatedSheets.length + 1}`,
          nodes: [],
          connections: [],
          paintActions: [],
          history: [],
          historyIndex: -1,
          pan: {x: 0, y: 0},
          scale: 1
      };
      
      updatedSheets.push(newSheet);
      setSheets(updatedSheets);
      
      // Cambiar a la nueva hoja
      const newIndex = updatedSheets.length - 1;
      setNodes(newSheet.nodes);
      setConnections(newSheet.connections);
      setPaintActions(newSheet.paintActions);
      setHistory(newSheet.history);
      setHistoryIndex(newSheet.historyIndex);
      setPan(newSheet.pan);
      setScale(newSheet.scale);
      setActiveSheetIndex(newIndex);
  };

  const saveToHistory = useCallback(() => {
      const state = JSON.stringify({ nodes, connections, paintActions });
      const newHist = history.slice(0, historyIndex + 1);
      newHist.push(state);
      setHistory(newHist);
      setHistoryIndex(newHist.length - 1);
  }, [nodes, connections, paintActions, history, historyIndex]);

  const undo = () => {
      if(historyIndex > 0) {
          const state = JSON.parse(history[historyIndex - 1]);
          setNodes(state.nodes); setConnections(state.connections); setPaintActions(state.paintActions);
          setHistoryIndex(historyIndex - 1);
      }
  };

  const redo = () => {
      if (historyIndex < history.length - 1) {
          const state = JSON.parse(history[historyIndex + 1]);
          setNodes(state.nodes); setConnections(state.connections); setPaintActions(state.paintActions);
          setHistoryIndex(historyIndex + 1);
      }
  };

  const deleteSelected = () => {
      setNodes(nodes.filter(n => !selectedIds.has(n.id)));
      setConnections(connections.filter(c => !selectedIds.has(c.id) && !selectedIds.has(c.from) && !selectedIds.has(c.to)));
      setPaintActions(paintActions.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
  };

  const selectedNode = selectedIds.size === 1 ? nodes.find(n => selectedIds.has(n.id)) : null;
  const selectedConnection = selectedIds.size === 1 && !selectedNode ? connections.find(c => selectedIds.has(c.id)) : null;

  return (
    <div className={`flex flex-col h-full w-full ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-gray-900'}`}>
        
        {/* TOP BAR */}
        <div className="h-14 border-b flex items-center px-4 justify-between bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 z-20">
            <div className="flex items-center gap-4">
                <div className="font-bold text-xl flex items-center gap-2 text-slate-800 dark:text-gray-200">
                    <Layout className="fill-current" /> Herramientas
                </div>
                <div className="h-6 w-px bg-gray-300 dark:bg-slate-700"/>
            </div>

            <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                    <button onClick={deleteSelected} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition-colors" title="Eliminar Selección"><Trash2 size={18}/></button>
                )}
                <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded-lg transition-colors duration-200 ${showGrid ? 'bg-slate-800 dark:bg-blue-900/30 text-white dark:text-blue-100 border border-transparent dark:border-blue-800/50 shadow-sm' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-white'}`} title="Cuadrícula"><Grid3x3 size={18}/></button>
                <button onClick={undo} className="p-2 rounded-lg text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-white transition-colors duration-200" title="Deshacer"><Undo size={18}/></button>
                <button onClick={redo} className="p-2 rounded-lg text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-white transition-colors duration-200" title="Rehacer"><Redo size={18}/></button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
            
            {/* LEFT SIDEBAR */}
            <div className="w-52 border-r bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 overflow-y-auto custom-scrollbar flex flex-col z-10 min-h-0">
                
                <div className="p-2 grid grid-cols-4 gap-1 border-b border-gray-200 dark:border-slate-700">
                    <ToolBtn icon={MousePointer2} label="Select" isSelected={tool === 'select'} onClick={() => setTool('select')} />
                    <ToolBtn icon={ImageIcon} label="Mover" isSelected={tool === 'hand'} onClick={() => setTool('hand')} />
                    <ToolBtn icon={Type} label="Texto" isSelected={tool === 'text'} onClick={() => setTool('text')} />
                    <ToolBtn icon={Share2} label="Unir" isSelected={tool === 'relation'} onClick={() => setTool('relation')} />
                </div>

                <Accordion title="Dibujo y Formas" defaultOpen>
                    <ToolBtn icon={PenTool} label="Lápiz" isSelected={tool === 'pencil'} onClick={() => setTool('pencil')} />
                    <ToolBtn icon={Highlighter} label="Marker" isSelected={tool === 'marker'} onClick={() => setTool('marker')} />
                    <ToolBtn icon={Eraser} label="Goma" isSelected={tool === 'eraser'} onClick={() => setTool('eraser')} />
                    <ToolBtn icon={Square} label="Caja" isSelected={tool === 'rect_shape'} onClick={() => setTool('rect_shape')} />
                    <ToolBtn icon={Circle} label="Círculo" isSelected={tool === 'circle_shape'} onClick={() => setTool('circle_shape')} />
                    <ToolBtn icon={Triangle} label="Triángulo" isSelected={tool === 'triangle_shape'} onClick={() => setTool('triangle_shape')} />
                    <ToolBtn icon={Star} label="Estrella" isSelected={tool === 'star_shape'} onClick={() => setTool('star_shape')} />
                    <ToolBtn icon={Hexagon} label="Hexágono" isSelected={tool === 'hexagon_shape'} onClick={() => setTool('hexagon_shape')} />
                    <ToolBtn icon={Cloud} label="Nube" isSelected={tool === 'cloud_shape'} onClick={() => setTool('cloud_shape')} />
                </Accordion>

                <Accordion title="Diagrama de Flujo">
                    <ToolBtn icon={StartIcon} label="Inicio / Fin" isSelected={tool === 'start'} onClick={() => setTool('start')} />
                    <ToolBtn icon={ProcessIcon} label="Proceso" isSelected={tool === 'process'} onClick={() => setTool('process')} />
                    <ToolBtn icon={DecisionIcon} label="Decisión" isSelected={tool === 'decision'} onClick={() => setTool('decision')} />
                    <ToolBtn icon={IOIcon} label="Datos (E/S)" isSelected={tool === 'io'} onClick={() => setTool('io')} />
                    <ToolBtn icon={SubprocessIcon} label="Subproceso" isSelected={tool === 'subprocess'} onClick={() => setTool('subprocess')} />
                    <ToolBtn icon={DocumentIcon} label="Documento" isSelected={tool === 'document'} onClick={() => setTool('document')} />
                    <ToolBtn icon={ManualInputIcon} label="Entrada Manual" isSelected={tool === 'manual_input'} onClick={() => setTool('manual_input')} />
                    <ToolBtn icon={DisplayIcon} label="Pantalla" isSelected={tool === 'display'} onClick={() => setTool('display')} />
                    <ToolBtn icon={OffPageIcon} label="Referencia" isSelected={tool === 'off_page'} onClick={() => setTool('off_page')} />
                    <ToolBtn icon={DelayIcon} label="Retardo" isSelected={tool === 'delay'} onClick={() => setTool('delay')} />
                </Accordion>
                
                <Accordion title="Modelado de Datos">
                    <ToolBtn icon={TableIcon} label="Tabla (Simple)" isSelected={tool === 'table'} onClick={() => setTool('table')} />
                    <ToolBtn icon={TableKeysIcon} label="Tabla (Llaves)" isSelected={tool === 'table_keys'} onClick={() => setTool('table_keys')} />
                </Accordion>

                <Accordion title="Entidad-Relación">
                    <ToolBtn icon={Square} label="Entidad" isSelected={tool === 'er_entity'} onClick={() => setTool('er_entity')} />
                    <ToolBtn icon={Diamond} label="Relación" isSelected={tool === 'er_relationship'} onClick={() => setTool('er_relationship')} />
                    <ToolBtn icon={Circle} label="Atributo" isSelected={tool === 'er_attribute'} onClick={() => setTool('er_attribute')} />
                    <ToolBtn icon={InheritanceIcon} label="Herencia" isSelected={tool === 'er_inheritance'} onClick={() => setTool('er_inheritance')} />
                </Accordion>

                <Accordion title="UML y Objetos">
                    <ToolBtn icon={User} label="Actor" isSelected={tool === 'uml_actor'} onClick={() => setTool('uml_actor')} />
                    <ToolBtn icon={Circle} label="Caso" isSelected={tool === 'uml_usecase'} onClick={() => setTool('uml_usecase')} />
                    <ToolBtn icon={Layout} label="Clase" isSelected={tool === 'uml_class'} onClick={() => setTool('uml_class')} />
                    <ToolBtn icon={Braces} label="Nota" isSelected={tool === 'uml_note'} onClick={() => setTool('uml_note')} />
                </Accordion>
            </div>

            {/* CANVAS */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 relative">
                <div className="flex-1 relative cursor-crosshair overflow-hidden">
                    <canvas 
                        ref={gridCanvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                    />
                    <canvas 
                        ref={canvasRef}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        className="absolute inset-0 w-full h-full touch-none"
                    />
                </div>
                
                {/* BARRA DE HOJAS */}
                <div className="h-10 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center px-2 gap-1 z-20 overflow-x-auto">
                    {sheets.map((sheet, idx) => (
                        <button
                            key={sheet.id}
                            onClick={() => switchSheet(idx)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                                activeSheetIndex === idx 
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            {sheet.name}
                        </button>
                    ))}
                    {sheets.length < 5 && (
                        <button 
                            onClick={addSheet}
                            className="p-1.5 ml-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                            title="Nueva Hoja"
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* RIGHT SIDEBAR (INSPECTOR) */}
            <div className="w-44 border-l bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 flex flex-col z-20 shadow-xl overflow-y-auto min-h-0">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 font-bold text-sm uppercase tracking-wider flex justify-between items-center text-gray-700 dark:text-gray-300">
                    <span>Propiedades</span>
                </div>

                <div className="p-4 space-y-6">
                    {/* GLOBAL CONFIG */}
                    {!selectedNode && !selectedConnection && (
                        <div className="space-y-4">
                            {isPaintTool ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-2">Color Pincel</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#000000', '#ffffff'].map(c => (
                                                <button key={c} onClick={() => setPaintColor(c)} className={`w-6 h-6 rounded-full border border-gray-300 dark:border-slate-600 ${paintColor === c ? 'ring-2 ring-blue-500' : ''}`} style={{backgroundColor: c}} />
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-2">Grosor: {paintWidth}px</label>
                                        <input type="range" min="1" max="100" value={paintWidth} onChange={(e)=>setPaintWidth(Number(e.target.value))} className="w-full accent-blue-600" />
                                    </div>
                                </div>
                            ) : (
                                tool === 'relation' && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-2">Tipo de Conector</label>
                                        <select value={relationType} onChange={(e:any)=>setRelationType(e.target.value)} className="w-full p-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100">
                                            <optgroup label="Básico">
                                                <option value="Flow">Flujo Simple</option>
                                                <option value="1:N">1:N (Uno a Muchos)</option>
                                                <option value="1:1">1:1 (Uno a Uno)</option>
                                            </optgroup>
                                            <optgroup label="UML">
                                                <option value="Inheritance">Herencia (Extends)</option>
                                                <option value="Generalization">Generalización</option>
                                                <option value="Realization">Realización (Implements)</option>
                                                <option value="Composition">Composición</option>
                                                <option value="Aggregation">Agregación</option>
                                                <option value="Dependency">Dependencia</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                )
                            )}
                            <div className="text-center opacity-50 text-xs mt-10">
                                {!isPaintTool && (selectedIds.size > 1 ? `${selectedIds.size} elementos seleccionados` : 'Selecciona un nodo para editar')}
                            </div>
                        </div>
                    )}

                    {/* NODE EDITOR */}
                    {selectedNode && (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Nombre / Etiqueta</label>
                                <input 
                                    type="text" 
                                    value={selectedNode.name || ''} 
                                    onChange={(e) => {
                                        if (!selectedNode) return;
                                        const newName = e.target.value;
                                        setNodes(nodes.map(n => {
                                            if (n.id !== selectedNode.id) return n;
                                            let updates: any = { name: newName };
                                            // Auto-resize para todas las figuras de diagrama
                                            const autoDim = getAutoDimensions(n.type, newName, n.fontSize, n.fields, n.methods);
                                            if (autoDim) {
                                                updates = { ...updates, ...autoDim };
                                            }
                                            return { ...n, ...updates };
                                        }));
                                    }}
                                    className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-100"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Tamaño: {selectedNode.fontSize}px</label>
                                <input 
                                    type="range" 
                                    min="10" 
                                    max="200" 
                                    value={selectedNode.fontSize} 
                                    onChange={(e) => {
                                        if (!selectedNode) return;
                                        const newSize = Number(e.target.value);
                                        setNodes(nodes.map(n => {
                                            if (n.id !== selectedNode.id) return n;
                                            let updates: any = { fontSize: newSize };
                                            // Auto-resize al cambiar fuente
                                            const autoDim = getAutoDimensions(n.type, n.name, newSize, n.fields, n.methods);
                                            if (autoDim) {
                                                updates = { ...updates, ...autoDim };
                                            }
                                            return { ...n, ...updates };
                                        }));
                                    }}
                                    className="w-full accent-blue-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Color de Acento</label>
                                <div className="flex flex-wrap gap-2">
                                    {['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', 'transparent'].map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => selectedNode && setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, color: c === 'transparent' ? '' : c } : n))}
                                            className={`w-6 h-6 rounded-full border border-gray-300 dark:border-slate-600 relative ${selectedNode.color === c ? 'ring-2 ring-blue-500' : ''}`}
                                            style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }}
                                        >
                                            {c === 'transparent' && <X size={12} className="absolute inset-0 m-auto text-gray-400"/>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ESTILOS ESPECÍFICOS (ER / GENERAL) */}
                            {!['table', 'table_keys', 'uml_class', 'uml_actor', 'uml_note'].includes(selectedNode.type) && (
                                <div className="space-y-2 pt-2 border-t dark:border-slate-700">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Estilo</label>
                                    <div className="flex flex-col gap-2">
                                        {/* Negrita: Disponible para todos */}
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedNode.bold || false}
                                                onChange={(e) => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, bold: e.target.checked } : n))}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300">Negrita</span>
                                        </label>

                                        {/* Opciones exclusivas para Diagramas ER */}
                                        {['er_entity', 'er_relationship', 'er_attribute'].includes(selectedNode.type) && (
                                            <>
                                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedNode.doubleBorder || false}
                                                        onChange={(e) => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, doubleBorder: e.target.checked } : n))}
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-gray-700 dark:text-gray-300">Doble Borde (Débil)</span>
                                                </label>
                                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedNode.underline || false}
                                                        onChange={(e) => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, underline: e.target.checked } : n))}
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-gray-700 dark:text-gray-300">Subrayado (Clave)</span>
                                                </label>
                                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedNode.textInParentheses || false}
                                                        onChange={(e) => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, textInParentheses: e.target.checked } : n))}
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-gray-700 dark:text-gray-300">En Paréntesis (Derivado)</span>
                                                </label>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {(selectedNode.type === 'table' || selectedNode.type === 'table_keys' || selectedNode.type === 'uml_class') && (
                                <div className="space-y-3 pt-4 border-t dark:border-slate-700">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{selectedNode.type === 'uml_class' ? 'Atributos' : 'Campos'}</label>
                                        <button onClick={() => {
                                            if (selectedNode) {
                                                const newFields = [...selectedNode.fields, {name: 'nuevo', type: 'int', visibility: '+'}];
                                                let updates: any = { fields: newFields };
                                                // Recalcular dimensiones al agregar campo
                                                const autoDim = getAutoDimensions(selectedNode.type, selectedNode.name, selectedNode.fontSize, newFields, selectedNode.methods);
                                                if (autoDim) updates = { ...updates, ...autoDim };
                                                setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, ...updates } : n));
                                            }
                                        }} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded flex items-center gap-1 text-xs font-bold"><Plus size={12}/> ADD</button>
                                    </div>
                                    <div className="space-y-2">
                                        {selectedNode.fields.map((field, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                {selectedNode.type === 'table_keys' && (
                                                    <select
                                                        value={field.key || ''}
                                                        onChange={(e) => {
                                                            const newFields = [...selectedNode.fields];
                                                            newFields[idx].key = e.target.value;
                                                            setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, fields: newFields } : n));
                                                        }}
                                                        className="w-12 text-[10px] p-1 rounded border dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-center text-slate-900 dark:text-slate-100"
                                                    >
                                                        <option value="">-</option>
                                                        <option value="PK">PK</option>
                                                        <option value="FK">FK</option>
                                                        <option value="N">N</option>
                                                    </select>
                                                )}
                                                {selectedNode.type === 'uml_class' && (
                                                    <select
                                                        value={field.visibility || '+'}
                                                        onChange={(e) => {
                                                            const newFields = [...selectedNode.fields];
                                                            newFields[idx].visibility = e.target.value;
                                                            setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, fields: newFields } : n));
                                                        }}
                                                        className="w-10 text-[10px] p-1 rounded border dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-center text-slate-900 dark:text-slate-100"
                                                    >
                                                        <option value="+">+</option>
                                                        <option value="-">-</option>
                                                        <option value="#">#</option>
                                                        <option value="~">~</option>
                                                    </select>
                                                )}
                                                <input 
                                                    value={field.name}
                                                    placeholder="Nombre"
                                                    onChange={(e) => {
                                                        if (selectedNode) {
                                                            const newFields = [...selectedNode.fields];
                                                            newFields[idx].name = e.target.value;
                                                            let updates: any = { fields: newFields };
                                                            const autoDim = getAutoDimensions(selectedNode.type, selectedNode.name, selectedNode.fontSize, newFields, selectedNode.methods);
                                                            if (autoDim) updates = { ...updates, ...autoDim };
                                                            setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, ...updates } : n));
                                                        }
                                                    }}
                                                    className="w-24 text-xs p-1.5 rounded border dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-slate-100"
                                                />
                                                <input 
                                                    value={field.type}
                                                    placeholder="Tipo"
                                                    onChange={(e) => {
                                                        if (selectedNode) {
                                                            const newFields = [...selectedNode.fields];
                                                            newFields[idx].type = e.target.value;
                                                            let updates: any = { fields: newFields };
                                                            const autoDim = getAutoDimensions(selectedNode.type, selectedNode.name, selectedNode.fontSize, newFields, selectedNode.methods);
                                                            if (autoDim) updates = { ...updates, ...autoDim };
                                                            setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, ...updates } : n));
                                                        }
                                                    }}
                                                    className="w-20 text-xs p-1.5 rounded border dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                                                />
                                                <button onClick={() => {
                                                    if (selectedNode) {
                                                        const newFields = selectedNode.fields.filter((_, i) => i !== idx);
                                                        let updates: any = { fields: newFields };
                                                        const autoDim = getAutoDimensions(selectedNode.type, selectedNode.name, selectedNode.fontSize, newFields, selectedNode.methods);
                                                        if (autoDim) updates = { ...updates, ...autoDim };
                                                        setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, ...updates } : n));
                                                    }
                                                }} className="text-gray-400 hover:text-red-500 p-1"><Minus size={12}/></button>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedNode.type === 'uml_class' && (
                                        <div className="pt-2 border-t dark:border-slate-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Métodos</label>
                                                <button onClick={() => {
                                                    if (selectedNode) {
                                                        const newMethods = [...(selectedNode.methods || []), {name: 'metodo', type: 'void', visibility: '+'}];
                                                        let updates: any = { methods: newMethods };
                                                        const autoDim = getAutoDimensions(selectedNode.type, selectedNode.name, selectedNode.fontSize, selectedNode.fields, newMethods);
                                                        if (autoDim) updates = { ...updates, ...autoDim };
                                                        setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, ...updates } : n));
                                                    }
                                                }} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded flex items-center gap-1 text-xs font-bold"><Plus size={12}/> ADD</button>
                                            </div>
                                            <div className="space-y-2">
                                                {selectedNode.methods?.map((method, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center">
                                                        <select
                                                            value={method.visibility || '+'}
                                                            onChange={(e) => {
                                                                const newMethods = [...(selectedNode.methods || [])];
                                                                newMethods[idx].visibility = e.target.value;
                                                                setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, methods: newMethods } : n));
                                                            }}
                                                            className="w-10 text-[10px] p-1 rounded border dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-center text-slate-900 dark:text-slate-100"
                                                        >
                                                            <option value="+">+</option>
                                                            <option value="-">-</option>
                                                            <option value="#">#</option>
                                                            <option value="~">~</option>
                                                        </select>
                                                        <input 
                                                            value={method.name}
                                                            placeholder="Método"
                                                            onChange={(e) => {
                                                                const newMethods = [...(selectedNode.methods || [])];
                                                                newMethods[idx].name = e.target.value;
                                                                let updates: any = { methods: newMethods };
                                                                const autoDim = getAutoDimensions(selectedNode.type, selectedNode.name, selectedNode.fontSize, selectedNode.fields, newMethods);
                                                                if (autoDim) updates = { ...updates, ...autoDim };
                                                                setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, ...updates } : n));
                                                            }}
                                                            className="w-24 text-xs p-1.5 rounded border dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-slate-100"
                                                        />
                                                        <input 
                                                            value={method.type}
                                                            placeholder="Retorno"
                                                            onChange={(e) => {
                                                                const newMethods = [...(selectedNode.methods || [])];
                                                                newMethods[idx].type = e.target.value;
                                                                let updates: any = { methods: newMethods };
                                                                const autoDim = getAutoDimensions(selectedNode.type, selectedNode.name, selectedNode.fontSize, selectedNode.fields, newMethods);
                                                                if (autoDim) updates = { ...updates, ...autoDim };
                                                                setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, ...updates } : n));
                                                            }}
                                                            className="w-20 text-xs p-1.5 rounded border dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                                                        />
                                                        <button onClick={() => {
                                                            const newMethods = selectedNode.methods?.filter((_, i) => i !== idx);
                                                            let updates: any = { methods: newMethods };
                                                            const autoDim = getAutoDimensions(selectedNode.type, selectedNode.name, selectedNode.fontSize, selectedNode.fields, newMethods);
                                                            if (autoDim) updates = { ...updates, ...autoDim };
                                                            setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, ...updates } : n));
                                                        }} className="text-gray-400 hover:text-red-500 p-1"><Minus size={12}/></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* CONNECTION EDITOR */}
                    {selectedConnection && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Etiqueta</label>
                                <input 
                                    type="text" 
                                    value={selectedConnection.label || ''} 
                                    onChange={(e) => setConnections(connections.map(conn => conn.id === selectedConnection.id ? { ...conn, label: e.target.value } : conn))}
                                    className="w-full p-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-100"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Color de Línea</label>
                                <div className="flex flex-wrap gap-2">
                                    {['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#000000', '#ffffff'].map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => setConnections(connections.map(conn => conn.id === selectedConnection.id ? { ...conn, color: c } : conn))}
                                            className={`w-6 h-6 rounded-full border border-gray-300 dark:border-slate-600 relative ${selectedConnection.color === c ? 'ring-2 ring-blue-500' : ''}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Grosor: {selectedConnection.width || 2}px</label>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="10" 
                                    value={selectedConnection.width || 2} 
                                    onChange={(e) => setConnections(connections.map(conn => conn.id === selectedConnection.id ? { ...conn, width: Number(e.target.value) } : conn))}
                                    className="w-full accent-blue-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Estilo</label>
                                <select 
                                    value={selectedConnection.style} 
                                    onChange={(e) => setConnections(connections.map(conn => conn.id === selectedConnection.id ? { ...conn, style: e.target.value as any } : conn))}
                                    className="w-full p-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100"
                                >
                                    <option value="solid">Sólida</option>
                                    <option value="dashed">Discontinua</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Marcador Inicio</label>
                                    <select 
                                        value={selectedConnection.startMarker || getRelationSymbols(selectedConnection.type).start || 'None'} 
                                        onChange={(e) => setConnections(connections.map(conn => conn.id === selectedConnection.id ? { ...conn, startMarker: e.target.value } : conn))}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="w-full p-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100"
                                    >
                                        {MARKERS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Marcador Fin</label>
                                    <select 
                                        value={selectedConnection.endMarker || getRelationSymbols(selectedConnection.type).end || 'None'} 
                                        onChange={(e) => setConnections(connections.map(conn => conn.id === selectedConnection.id ? { ...conn, endMarker: e.target.value } : conn))}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="w-full p-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100"
                                    >
                                        {MARKERS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Tipo</label>
                                <select 
                                    value={selectedConnection.type} 
                                    onChange={(e) => {
                                        const newType = e.target.value as RelationType;
                                        const symbols = getRelationSymbols(newType);
                                        setConnections(connections.map(conn => conn.id === selectedConnection.id ? { 
                                            ...conn, 
                                            type: newType,
                                            startMarker: symbols.start,
                                            endMarker: symbols.end
                                        } : conn));
                                    }}
                                    className="w-full p-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100"
                                >
                                    <option value="1:N">1:N</option>
                                    <option value="1:1">1:1</option>
                                    <option value="Flow">Flujo</option>
                                    <option value="Inheritance">Herencia</option>
                                    <option value="Composition">Composición</option>
                                    <option value="Aggregation">Agregación</option>
                                    <option value="Dependency">Dependencia</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}               