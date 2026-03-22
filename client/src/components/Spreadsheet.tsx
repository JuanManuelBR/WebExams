import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface HojaCalculoProps {
  darkMode: boolean;
  readOnly?: boolean;
  initialData?: {
    allCells: Record<number, Record<string, Cell>>;
    allCharts: Record<number, ChartConfig[]>;
    sheets: SheetMeta[];
    activeSheet: number;
    colWidths: Record<string, number>;
  };
  onSave?: (data: any) => void;
}

interface Cell {
  value: string;
  formula?: string | null;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  border?: boolean;
  decimals?: number;
  fontSize?: number;
  rowSpan?: number;
  colSpan?: number;
  hidden?: boolean;
  color?: string;
  bgColor?: string;
}

interface SheetMeta {
  id: number;
  name: string;
  colWidths?: Record<number, number>;
}

interface SelRange {
  r1: number; c1: number;
  r2: number; c2: number;
}

interface ChartConfig {
  id: number;
  type: 'bar' | 'line' | 'area' | 'pie' | 'scatter';
  title: string;
  rangeX: string;
  rangeY: string;
  hasHeader: boolean;
  showTrendline?: boolean;
  pos: { x: number; y: number };
  size: { w: number; h: number };
}

interface ChartSeries {
  name: string;
  values: number[];
  color: string;
}

interface ChartData {
  labels: string[];
  series: ChartSeries[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROWS = 100;
const COLS = 26;
const DEFAULT_COL_W = 100;
const ROW_H = 24;
const HEADER_W = 46;
const VISIBLE_BUFFER = 8; // extra rows rendered above/below the visible viewport
const CHART_COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#FF6D00', '#46BDC6', '#7B61FF', '#E91E63'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getColumnLabel = (index: number): string => {
  let label = '';
  let num = index;
  while (num >= 0) {
    label = String.fromCharCode(65 + (num % 26)) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
};

const getCellId = (row: number, col: number): string =>
  `${getColumnLabel(col)}${row + 1}`;

const parseRef = (ref: string): { col: number; row: number } | null => {
  const m = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (let i = 0; i < m[1].length; i++) col = col * 26 + m[1].charCodeAt(i) - 64;
  return { col: col - 1, row: parseInt(m[2]) - 1 };
};

// Format number for display
const formatNumber = (val: string, decimals?: number): string => {
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  if (typeof decimals === 'number' && decimals >= 0) return num.toFixed(decimals);
  // Auto-format: preserve precision for small numbers
  if (Number.isInteger(num)) return String(num);
  return String(parseFloat(num.toPrecision(12)));
};

// ─── Formula Engine ───────────────────────────────────────────────────────────

// Per-render evaluation cache — invalidated when the cells reference changes
let _cellsRef: Record<string, Cell> | null = null;
let _evalCache = new Map<string, string>();
const _evaluating = new Set<string>();

// Numeric aggregate/math functions — defined once at module level for performance
const FN_MAP: Record<string, (nums: number[]) => number> = {
  SUM:     (v) => v.reduce((a, b) => a + b, 0),
  AVERAGE: (v) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0,
  COUNT:   (v) => v.filter((x) => !isNaN(x)).length,
  MIN:     (v) => v.length ? Math.min(...v) : 0,
  MAX:     (v) => v.length ? Math.max(...v) : 0,
  PRODUCT: (v) => v.reduce((a, b) => a * b, 1),
  ABS:     (v) => Math.abs(v[0] ?? 0),
  SQRT:    (v) => Math.sqrt(v[0] ?? 0),
  ROUND:   (v) => Math.round((v[0] ?? 0) * Math.pow(10, v[1] ?? 0)) / Math.pow(10, v[1] ?? 0),
  POWER:   (v) => Math.pow(v[0] ?? 0, v[1] ?? 2),
  INT:     (v) => Math.floor(v[0] ?? 0),
  TRUNC:   (v) => Math.trunc(v[0] ?? 0),
  MOD:     (v) => (v[1] ?? 0) !== 0 ? (v[0] ?? 0) % (v[1] ?? 1) : 0,
  CEILING: (v) => v[1] !== undefined && v[1] !== 0 ? Math.ceil((v[0] ?? 0) / v[1]) * v[1] : Math.ceil(v[0] ?? 0),
  FLOOR:   (v) => v[1] !== undefined && v[1] !== 0 ? Math.floor((v[0] ?? 0) / v[1]) * v[1] : Math.floor(v[0] ?? 0),
  LN:      (v) => Math.log(v[0] ?? 0),
  LOG10:   (v) => Math.log10(v[0] ?? 0),
  LOG:     (v) => v.length > 1 ? Math.log(v[0] ?? 0) / Math.log(v[1] ?? 10) : Math.log10(v[0] ?? 0),
  EXP:     (v) => Math.exp(v[0] ?? 0),
  SIGN:    (v) => Math.sign(v[0] ?? 0),
  PI:      () => Math.PI,
  RAND:    () => Math.random(),
  // Trigonometric functions
  SIN:     (v) => Math.sin(v[0] ?? 0),
  SENO:    (v) => Math.sin(v[0] ?? 0),
  COS:     (v) => Math.cos(v[0] ?? 0),
  TAN:     (v) => Math.tan(v[0] ?? 0),
  ASIN:    (v) => Math.asin(v[0] ?? 0),
  ACOS:    (v) => Math.acos(v[0] ?? 0),
  ATAN:    (v) => Math.atan(v[0] ?? 0),
  ATAN2:   (v) => Math.atan2(v[0] ?? 0, v[1] ?? 0),
  SINH:    (v) => Math.sinh(v[0] ?? 0),
  COSH:    (v) => Math.cosh(v[0] ?? 0),
  TANH:    (v) => Math.tanh(v[0] ?? 0),
  DEGREES: (v) => (v[0] ?? 0) * (180 / Math.PI),
  RADIANS: (v) => (v[0] ?? 0) * (Math.PI / 180),
};

// Special functions that need access to raw string values (not just parsed numbers)
const SPECIAL_FNS: Record<string, (raws: string[], nums: number[]) => number> = {
  COUNTA: (raws) => raws.filter((r) => r !== '').length,
  MEDIAN: (_, nums) => {
    if (!nums.length) return 0;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },
  STDEV: (_, nums) => {
    if (nums.length < 2) return 0;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1));
  },
  VAR: (_, nums) => {
    if (nums.length < 2) return 0;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1);
  },
};

// Collect cell values from a comma-separated argument string.
// Handles ranges (A1:B5), individual refs (A1), and numeric literals.
// Reversed ranges (A10:A1) are automatically normalized.
function collectArgs(argStr: string, cells: Record<string, Cell>): { raws: string[]; nums: number[] } {
  const raws: string[] = [];
  const nums: number[] = [];
  for (const part of argStr.split(',')) {
    const trimmed = part.trim();
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx !== -1) {
      const sc = parseRef(trimmed.slice(0, colonIdx).trim());
      const ec = parseRef(trimmed.slice(colonIdx + 1).trim());
      if (!sc || !ec) continue;
      // Normalize reversed ranges (e.g. A10:A1 → A1:A10)
      const r1 = Math.min(sc.row, ec.row), r2 = Math.max(sc.row, ec.row);
      const c1 = Math.min(sc.col, ec.col), c2 = Math.max(sc.col, ec.col);
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          const raw = getRaw(getCellId(r, c), cells);
          raws.push(raw);
          const v = parseFloat(raw);
          if (!isNaN(v)) nums.push(v);
        }
      }
    } else {
      const ref = parseRef(trimmed);
      if (ref) {
        const raw = getRaw(getCellId(ref.row, ref.col), cells);
        raws.push(raw);
        const v = parseFloat(raw);
        if (!isNaN(v)) nums.push(v);
      } else {
        const v = parseFloat(trimmed);
        if (!isNaN(v)) { raws.push(trimmed); nums.push(v); }
      }
    }
  }
  return { raws, nums };
}

function getRaw(id: string, cells: Record<string, Cell>): string {
  // Invalidate cache whenever we get a new cells object (i.e. on every state update)
  if (cells !== _cellsRef) {
    _cellsRef = cells;
    _evalCache = new Map();
    _evaluating.clear();
  }
  if (_evalCache.has(id)) return _evalCache.get(id)!;
  // Circular reference guard
  if (_evaluating.has(id)) return '#CIRC!';
  const c = cells[id];
  if (!c) { _evalCache.set(id, ''); return ''; }
  _evaluating.add(id);
  const result = c.formula ? evaluateFormula(c.formula, cells) : (c.value ?? '');
  _evaluating.delete(id);
  _evalCache.set(id, result);
  return result;
}

function evaluateFormula(formula: string, cells: Record<string, Cell>): string {
  if (!formula.startsWith('=')) return formula;

  let expr = formula.slice(1).toUpperCase();

  // Multi-pass: resolve nested function calls (e.g. ROUND(SUM(A1:A5),2)).
  // Each pass reduces complexity; [^()]* prevents matching across unresolved parens.
  let prev = '';
  let passes = 0;
  while (expr !== prev && passes < 10) {
    prev = expr;
    passes++;

    // Special functions (need raw string access for COUNTA, MEDIAN, STDEV, VAR)
    for (const [fn, op] of Object.entries(SPECIAL_FNS)) {
      const re = new RegExp(`\\b${fn}\\(([^()]*)\\)`, 'g');
      expr = expr.replace(re, (_: string, args: string) => {
        const { raws, nums } = collectArgs(args, cells);
        return String(op(raws, nums));
      });
    }

    // Numeric aggregate and math functions
    for (const [fn, op] of Object.entries(FN_MAP)) {
      const re = new RegExp(`\\b${fn}\\(([^()]*)\\)`, 'g');
      expr = expr.replace(re, (_: string, args: string) => {
        const { nums } = collectArgs(args, cells);
        const r = op(nums);
        if (typeof r === 'number' && !isFinite(r)) return '#DIV/0!';
        return String(r);
      });
    }

    // IF(condition, true_val, false_val) — resolved once inner functions are done
    expr = expr.replace(/\bIF\(([^()]+)\)/g, (_: string, args: string) => {
      // Split args by comma at depth 0 (safe for nested parens in condition)
      const parts: string[] = [];
      let buf = '', depth = 0;
      for (const ch of args) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (ch === ',' && depth === 0) { parts.push(buf); buf = ''; continue; }
        buf += ch;
      }
      parts.push(buf);
      if (parts.length < 3) return '#ERROR!';
      // Resolve cell refs in condition
      let cond = parts[0].trim().replace(/\b([A-Z]+\d+)\b/g, (ref: string) => {
        const raw = getRaw(ref, cells);
        const v = parseFloat(raw);
        return isNaN(v) ? (raw === '' ? '0' : JSON.stringify(raw)) : String(v);
      });
      // Normalize spreadsheet operators: <> → !=, = → == (skip <=, >=, !=)
      cond = cond.replace(/<>/g, '!=').replace(/([^<>!=])=([^=])/g, '$1==$2');
      try {
        // eslint-disable-next-line no-new-func
        const condResult = new Function(`"use strict"; return !!(${cond})`)();
        return condResult ? parts[1].trim() : parts[2].trim();
      } catch {
        return '#ERROR!';
      }
    });
  }

  // Replace remaining cell references with their values
  expr = expr.replace(/\b([A-Z]+\d+)\b/g, (ref: string) => {
    const raw = getRaw(ref, cells);
    const v = parseFloat(raw);
    // Text cells are returned as quoted strings so string ops work in eval
    if (isNaN(v)) return raw === '' ? '0' : JSON.stringify(raw);
    return String(v);
  });

  // Normalize operators before eval
  expr = expr.replace(/\^/g, '**');              // ^ → ** (exponentiation)
  expr = expr.replace(/<>/g, '!=');              // <> → != (not equal)
  expr = expr.replace(/([^<>!=])=([^=])/g, '$1==$2'); // lone = → ==

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${expr})`)();
    if (result === null || result === undefined) return '';
    if (typeof result === 'number' && !isFinite(result)) return '#DIV/0!';
    if (typeof result === 'boolean') return result ? 'TRUE' : 'FALSE';
    if (typeof result === 'string') return result;
    return String(parseFloat(result.toPrecision(12)));
  } catch {
    return '#ERROR!';
  }
}

// ─── Chart data builder ───────────────────────────────────────────────────────

function buildChartData(
  rangeX: string, 
  rangeY: string, 
  hasHeader: boolean, 
  cells: Record<string, Cell>
): ChartData {
  const labels: string[] = [];
  const series: ChartSeries[] = [];

  const parseRange = (range: string) => {
    const parts = range.toUpperCase().trim().split(':');
    const s = parseRef(parts[0]?.trim() || '');
    const e = parseRef(parts[1]?.trim() || parts[0]?.trim() || '');
    return s && e ? { s, e } : null;
  };

  // Process X axis
  if (rangeX && rangeX.trim()) {
    const r = parseRange(rangeX);
    if (r) {
      const r1 = Math.min(r.s.row, r.e.row), r2 = Math.max(r.s.row, r.e.row);
      const c = Math.min(r.s.col, r.e.col);
      const startRow = hasHeader ? r1 + 1 : r1;
      for (let row = startRow; row <= r2; row++) {
        labels.push(getRaw(getCellId(row, c), cells));
      }
    }
  }

  // Process Y axis (series)
  if (rangeY && rangeY.trim()) {
    const r = parseRange(rangeY);
    if (r) {
      const r1 = Math.min(r.s.row, r.e.row), r2 = Math.max(r.s.row, r.e.row);
      const c1 = Math.min(r.s.col, r.e.col), c2 = Math.max(r.s.col, r.e.col);
      const startRow = hasHeader ? r1 + 1 : r1;

      if (labels.length === 0) {
        for (let row = startRow; row <= r2; row++) 
          labels.push(String(row - startRow + 1));
      }

      for (let c = c1; c <= c2; c++) {
        const name = hasHeader 
          ? (getRaw(getCellId(r1, c), cells) || getColumnLabel(c)) 
          : getColumnLabel(c);
        const values: number[] = [];
        for (let row = startRow; row <= r2; row++) {
          const v = parseFloat(getRaw(getCellId(row, c), cells));
          values.push(isNaN(v) ? 0 : v);
        }
        series.push({ name, values, color: CHART_COLORS[(c - c1) % CHART_COLORS.length] });
      }
    }
  }

  return { labels, series };
}

// ─── Analysis helpers ─────────────────────────────────────────────────────────

function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number; r2: number } | null {
  const n = xs.length;
  if (n < 2) return null;
  const sx = xs.reduce((a, b) => a + b, 0), sy = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sx2 = xs.reduce((a, x) => a + x * x, 0);
  const d = n * sx2 - sx * sx;
  if (Math.abs(d) < 1e-10) return null;
  const slope = (n * sxy - sx * sy) / d;
  const intercept = (sy - slope * sx) / n;
  const my = sy / n;
  const ssTot = ys.reduce((a, y) => a + (y - my) ** 2, 0);
  const ssRes = ys.reduce((a, y, i) => a + (y - (slope * xs[i] + intercept)) ** 2, 0);
  const r2 = ssTot < 1e-10 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  return { slope, intercept, r2: +r2.toPrecision(4) };
}

function zeroCrossings(xs: number[], ys: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const y1 = ys[i], y2 = ys[i + 1];
    if (y1 === 0) { out.push(xs[i]); continue; }
    if (y1 * y2 < 0) {
      const t = -y1 / (y2 - y1);
      out.push(+(xs[i] + t * (xs[i + 1] - xs[i])).toPrecision(5));
    }
  }
  if (ys[ys.length - 1] === 0) out.push(xs[xs.length - 1]);
  return [...new Set(out)];
}

// ─── SVG Charts ───────────────────────────────────────────────────────────────

interface SVGChartProps { data: ChartData; width: number; height: number; darkMode: boolean; showTrendline?: boolean; }

function EmptyChart({ width, height, darkMode }: { width: number; height: number; darkMode: boolean }) {
  return (
    <svg width={width} height={height}>
      <text x={width / 2} y={height / 2} textAnchor="middle" fontSize={12} fill={darkMode ? '#475569' : '#bbb'}>
        Sin datos — configura rangos X e Y
      </text>
    </svg>
  );
}

// Shared grid lines + Y axis helper
function GridLines({ ticks, pad, W, axisC, textC, height, padBottom }: any) {
  return (
    <>
      {ticks.map((t: any, i: number) => (
        <g key={i}>
          <line x1={pad.left} y1={t.y} x2={pad.left + W} y2={t.y} stroke={axisC} strokeWidth={0.5} strokeDasharray={i === 0 ? '0' : '3,3'} />
          <text x={pad.left - 6} y={t.y + 4} fontSize={9} fill={textC} textAnchor="end">
            {Math.abs(t.val) >= 10000 ? `${(t.val / 1000).toFixed(0)}k` 
             : Math.abs(t.val) >= 1000 ? `${(t.val / 1000).toFixed(1)}k`
             : t.val % 1 === 0 ? t.val : t.val.toFixed(1)}
          </text>
        </g>
      ))}
    </>
  );
}

function Legend({ series, pad, width, height, textC }: any) {
  if (series.length <= 1) return null;
  const itemW = 70;
  const totalW = series.length * itemW;
  const startX = Math.max(pad.left, (width - totalW) / 2);
  return (
    <>
      {series.slice(0, 8).map((s: ChartSeries, i: number) => (
        <g key={i} transform={`translate(${startX + i * itemW}, ${height - 10})`}>
          <rect width={10} height={10} fill={s.color} rx={2} />
          <text x={14} y={9} fontSize={9} fill={textC}>{s.name.slice(0, 8)}</text>
        </g>
      ))}
    </>
  );
}

function BarChartSVG({ data, width, height, darkMode }: SVGChartProps) {
  const { labels, series } = data;
  if (!labels.length || !series.length) return <EmptyChart width={width} height={height} darkMode={darkMode} />;

  const pad = { top: 20, right: 16, bottom: series.length > 1 ? 48 : 32, left: 48 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;
  const allVals = series.flatMap((s) => s.values);
  const rawMax = Math.max(...allVals, 0);
  const rawMin = Math.min(0, ...allVals);
  
  // Nice scale
  const range = rawMax - rawMin || 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
  const step = Math.ceil(range / (4 * magnitude)) * magnitude;
  const maxVal = Math.ceil(rawMax / step) * step;
  const minVal = Math.floor(rawMin / step) * step;
  const totalRange = maxVal - minVal || 1;

  const axisC = darkMode ? '#2d3748' : '#e5e7eb';
  const textC = darkMode ? '#718096' : '#9ca3af';
  
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const val = minVal + (totalRange / (tickCount - 1)) * i;
    return { val, y: pad.top + H * (1 - (val - minVal) / totalRange) };
  });
  
  const zeroY = pad.top + H * (1 - (0 - minVal) / totalRange);
  const groupW = W / labels.length;
  const barPad = Math.max(2, groupW * 0.15);
  const totalBarW = groupW - barPad * 2;
  const barW = Math.max(3, totalBarW / series.length);

  return (
    <svg width={width} height={height}>
      <GridLines ticks={ticks} pad={pad} W={W} axisC={axisC} textC={textC} height={height} padBottom={pad.bottom} />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      <line x1={pad.left} y1={zeroY} x2={pad.left + W} y2={zeroY} stroke={darkMode ? '#4a5568' : '#d1d5db'} strokeWidth={1} />
      {labels.map((label, li) => (
        <g key={li}>
          {series.map((s, si) => {
            const x = pad.left + barPad + li * groupW + si * barW;
            const bH = Math.max(1, Math.abs(((s.values[li] ?? 0) / totalRange) * H));
            const y = (s.values[li] ?? 0) >= 0 ? zeroY - bH : zeroY;
            return (
              <g key={si}>
                <rect x={x} y={y} width={Math.max(1, barW - 1)} height={bH} fill={s.color} rx={2} opacity={0.9}>
                  <title>{`${s.name}: ${s.values[li]}`}</title>
                </rect>
                {/* Value label on hover via title */}
              </g>
            );
          })}
          <text
            x={pad.left + barPad + li * groupW + totalBarW / 2}
            y={height - pad.bottom + 13}
            fontSize={9} fill={textC} textAnchor="middle"
          >
            {String(label).length > 8 ? String(label).slice(0, 7) + '…' : label}
          </text>
          <line x1={pad.left + li * groupW} y1={zeroY} x2={pad.left + li * groupW} y2={zeroY + 4} stroke={axisC} strokeWidth={1} />
        </g>
      ))}
      <Legend series={series} pad={pad} width={width} height={height} textC={textC} />
    </svg>
  );
}

function LineChartSVG({ data, width, height, darkMode, showTrendline }: SVGChartProps) {
  const { labels, series } = data;
  if (!labels.length || !series.length) return <EmptyChart width={width} height={height} darkMode={darkMode} />;

  const pad = { top: 20, right: 20, bottom: series.length > 1 ? 48 : 32, left: 48 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;

  const xValues = labels.map(l => parseFloat(l));
  const isNumericX = xValues.every(v => !isNaN(v)) && xValues.length > 1;

  const allVals = series.flatMap((s) => s.values);
  const rawMax = Math.max(...allVals, 0);
  const rawMin = Math.min(0, ...allVals);
  const range = rawMax - rawMin || 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
  const step = Math.ceil(range / (4 * magnitude)) * magnitude;
  const maxVal = Math.ceil(rawMax / step) * step;
  const minVal = Math.floor(rawMin / step) * step;
  const totalRange = maxVal - minVal || 1;

  const getY = (v: number) => pad.top + H * (1 - (v - minVal) / totalRange);

  let getX: (i: number) => number;
  let xTicks: { val: string | number, x: number }[] = [];

  if (isNumericX) {
    const minX = Math.min(...xValues), maxX = Math.max(...xValues);
    const rangeX = maxX - minX || 1;
    getX = (i: number) => pad.left + ((xValues[i] - minX) / rangeX) * W;
    const tickStep = Math.ceil(labels.length / 6);
    for (let i = 0; i < labels.length; i += tickStep) {
      xTicks.push({ val: xValues[i] % 1 === 0 ? xValues[i] : xValues[i].toFixed(1), x: getX(i) });
    }
  } else {
    getX = (i: number) => pad.left + (labels.length > 1 ? (i / (labels.length - 1)) * W : W / 2);
    const tickStep = Math.ceil(labels.length / 6);
    for (let i = 0; i < labels.length; i += tickStep) {
      xTicks.push({ val: labels[i], x: getX(i) });
    }
    if (xTicks.length && xTicks[xTicks.length - 1].x !== getX(labels.length - 1)) {
      xTicks.push({ val: labels[labels.length - 1], x: getX(labels.length - 1) });
    }
  }

  const axisC = darkMode ? '#2d3748' : '#e5e7eb';
  const textC = darkMode ? '#718096' : '#9ca3af';
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minVal + (totalRange / 4) * i;
    return { val, y: getY(val) };
  });

  return (
    <svg width={width} height={height}>
      <GridLines ticks={yTicks} pad={pad} W={W} axisC={axisC} textC={textC} height={height} padBottom={pad.bottom} />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      <line x1={pad.left} y1={pad.top + H} x2={pad.left + W} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      {xTicks.map((t, i) => (
        <g key={i}>
          <line x1={t.x} y1={pad.top + H} x2={t.x} y2={pad.top + H + 4} stroke={axisC} strokeWidth={1} />
          <text x={t.x} y={height - pad.bottom + 14} fontSize={9} fill={textC} textAnchor="middle">
            {String(t.val).length > 8 ? String(t.val).slice(0, 7) + '…' : t.val}
          </text>
        </g>
      ))}
      {series.map((s) => {
        const points = isNumericX 
          ? [...s.values.map((v, i) => ({ x: getX(i), y: getY(v), val: v, xVal: xValues[i] }))].sort((a, b) => a.xVal - b.xVal)
          : s.values.map((v, i) => ({ x: getX(i), y: getY(v), val: v, xVal: i }));
        const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
        return (
          <g key={s.name}>
            <polyline points={polyline} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill={s.color} stroke={darkMode ? '#1a202c' : '#fff'} strokeWidth={1.5}>
                <title>{`${s.name}: ${p.val}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      <Legend series={series} pad={pad} width={width} height={height} textC={textC} />
      {/* ── Trendline + equation + zero crossings ── */}
      {showTrendline && series.map((s, si) => {
        const txs = labels.map((_, i) => isNumericX ? xValues[i] : i);
        const xMin2 = isNumericX ? Math.min(...xValues) : 0;
        const xRng2 = (isNumericX ? (Math.max(...xValues) - xMin2) : (labels.length - 1)) || 1;
        const toPx2 = (x: number) => pad.left + ((x - xMin2) / xRng2) * W;
        const reg = linearRegression(txs, s.values);
        const crosses = zeroCrossings(txs, s.values);
        const regEl = reg ? (() => {
          const px0 = toPx2(txs[0]), px1 = toPx2(txs[txs.length - 1]);
          const py0 = getY(reg.slope * txs[0] + reg.intercept);
          const py1 = getY(reg.slope * txs[txs.length - 1] + reg.intercept);
          const fmt = (n: number) => Math.abs(n) >= 100 ? n.toFixed(1) : Math.abs(n) >= 1 ? n.toFixed(3) : n.toPrecision(3);
          const eq = `y=${fmt(reg.slope)}x${reg.intercept >= 0 ? '+' : ''}${fmt(reg.intercept)}  R²=${reg.r2.toFixed(2)}`;
          const eqX = px0 + 4; const eqY = Math.min(py0, py1) - 8;
          return (<g key="reg">
            <line x1={px0} y1={py0} x2={px1} y2={py1} stroke={s.color} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7}/>
            <rect x={eqX - 2} y={eqY - 11} width={eq.length * 5.5} height={13} rx={2} fill={darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.9)'}/>
            <text x={eqX} y={eqY} fontSize={8} fill={s.color}>{eq}</text>
          </g>);
        })() : null;
        return (
          <g key={`an-${si}`}>
            {regEl}
            {crosses.map((cx, ci) => {
              const cpx = toPx2(cx); const cpy = getY(0);
              const lbl = isNumericX ? (+cx.toPrecision(4)).toString() : (labels[Math.round(Math.max(0, Math.min(cx, labels.length - 1)))] ?? cx.toFixed(2));
              return (<g key={ci}>
                <circle cx={cpx} cy={cpy} r={5} fill={s.color} stroke={darkMode ? '#1a202c' : '#fff'} strokeWidth={1.5} opacity={0.95}><title>{`Corte X: (${lbl}, 0)`}</title></circle>
                <text x={cpx} y={cpy - 8} textAnchor="middle" fontSize={8} fill={s.color} fontWeight="bold">{lbl}</text>
              </g>);
            })}
          </g>
        );
      })}
    </svg>
  );
}

function AreaChartSVG({ data, width, height, darkMode }: SVGChartProps) {
  const { labels, series } = data;
  if (!labels.length || !series.length) return <EmptyChart width={width} height={height} darkMode={darkMode} />;

  const pad = { top: 20, right: 16, bottom: series.length > 1 ? 48 : 32, left: 48 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;
  const allVals = series.flatMap((s) => s.values);
  const rawMax = Math.max(...allVals, 0);
  const rawMin = Math.min(0, ...allVals);
  const range = rawMax - rawMin || 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
  const step = Math.ceil(range / (4 * magnitude)) * magnitude;
  const maxVal = Math.ceil(rawMax / step) * step;
  const minVal = Math.floor(rawMin / step) * step;
  const totalRange = maxVal - minVal || 1;
  
  const xStep = labels.length > 1 ? W / (labels.length - 1) : W;
  const getX = (i: number) => pad.left + i * xStep;
  const getY = (v: number) => pad.top + H * (1 - (v - minVal) / totalRange);
  const baseY = getY(Math.max(0, minVal));
  
  const axisC = darkMode ? '#2d3748' : '#e5e7eb';
  const textC = darkMode ? '#718096' : '#9ca3af';
  const ticks = Array.from({ length: 5 }, (_, i) => {
    const val = minVal + (totalRange / 4) * i;
    return { val, y: getY(val) };
  });

  return (
    <svg width={width} height={height}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`ag-${i}-${s.color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>
      <GridLines ticks={ticks} pad={pad} W={W} axisC={axisC} textC={textC} height={height} padBottom={pad.bottom} />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      <line x1={pad.left} y1={pad.top + H} x2={pad.left + W} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      {series.map((s, si) => {
        const polyline = s.values.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
        const areaPolygon = `${getX(0)},${baseY} ${s.values.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')} ${getX(s.values.length - 1)},${baseY}`;
        return (
          <g key={s.name}>
            <polygon points={areaPolygon} fill={`url(#ag-${si}-${s.color.replace('#','')})`} />
            <polyline points={polyline} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
            {s.values.map((v, i) => (
              <circle key={i} cx={getX(i)} cy={getY(v)} r={2.5} fill={s.color} stroke={darkMode ? '#1a202c' : '#fff'} strokeWidth={1.5}>
                <title>{`${s.name}: ${v}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      {labels.map((label, i) => {
        const step = Math.ceil(labels.length / 6);
        if (i % step !== 0 && i !== labels.length - 1) return null;
        return (
          <text key={i} x={getX(i)} y={height - pad.bottom + 14} fontSize={9} fill={textC} textAnchor="middle">
            {String(label).length > 8 ? String(label).slice(0, 7) + '…' : label}
          </text>
        );
      })}
      <Legend series={series} pad={pad} width={width} height={height} textC={textC} />
    </svg>
  );
}

function PieChartSVG({ data, width, height, darkMode }: SVGChartProps) {
  const { labels, series } = data;
  if (!labels.length || !series.length) return <EmptyChart width={width} height={height} darkMode={darkMode} />;

  const legendH = Math.min(labels.length * 18 + 8, height - 10);
  const legendW = 80;
  const cx = (width - legendW) / 2;
  const cy = height / 2;
  const r = Math.min(cx - 10, (height - 30) / 2);
  const textC = darkMode ? '#718096' : '#9ca3af';

  const values = labels.map((_, i) => Math.abs(series[0]?.values[i] ?? 0));
  const total = values.reduce((a, b) => a + b, 0) || 1;

  let angle = -Math.PI / 2;
  const slices = values.map((v, i) => {
    const ratio = v / total;
    const startAngle = angle;
    angle += ratio * 2 * Math.PI;
    const endAngle = angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = ratio > 0.5 ? 1 : 0;
    const midAngle = startAngle + (endAngle - startAngle) / 2;
    const lx = cx + (r * 0.6) * Math.cos(midAngle);
    const ly = cy + (r * 0.6) * Math.sin(midAngle);
    return { 
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, 
      color: CHART_COLORS[i % 8], label: labels[i], value: v, ratio, midAngle, lx, ly 
    };
  });

  return (
    <svg width={width} height={height}>
      {slices.map((sl, i) => (
        <g key={i}>
          <path d={sl.path} fill={sl.color} stroke={darkMode ? '#1a202c' : '#fff'} strokeWidth={2} opacity={0.92}>
            <title>{`${sl.label}: ${sl.value} (${(sl.ratio * 100).toFixed(1)}%)`}</title>
          </path>
          {sl.ratio > 0.08 && (
            <text x={sl.lx} y={sl.ly} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">
              {(sl.ratio * 100).toFixed(0)}%
            </text>
          )}
        </g>
      ))}
      {/* Legend on the right */}
      {labels.slice(0, 8).map((label, i) => (
        <g key={i} transform={`translate(${width - legendW + 2}, ${(height - Math.min(labels.length, 8) * 18) / 2 + i * 18})`}>
          <rect width={10} height={10} fill={CHART_COLORS[i % 8]} rx={2} />
          <text x={14} y={9} fontSize={9} fill={textC}>{String(label).slice(0, 9)}</text>
        </g>
      ))}
    </svg>
  );
}

function ScatterChartSVG({ data, width, height, darkMode, showTrendline }: SVGChartProps) {
  const { labels, series } = data;
  if (!labels.length || !series.length) return <EmptyChart width={width} height={height} darkMode={darkMode} />;

  const pad = { top: 20, right: 20, bottom: series.length > 1 ? 48 : 32, left: 48 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;

  const xValues = labels.map(l => parseFloat(l));
  const isNumericX = xValues.every(v => !isNaN(v)) && xValues.length > 1;

  const allVals = series.flatMap((s) => s.values);
  const rawMax = Math.max(...allVals, 0);
  const rawMin = Math.min(0, ...allVals);
  const range = rawMax - rawMin || 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
  const step = Math.ceil(range / (4 * magnitude)) * magnitude;
  const maxVal = Math.ceil(rawMax / step) * step;
  const minVal = Math.floor(rawMin / step) * step;
  const totalRange = maxVal - minVal || 1;

  const getY = (v: number) => pad.top + H * (1 - (v - minVal) / totalRange);
  
  let getX: (i: number) => number;
  let xTicks: { val: string | number, x: number }[] = [];

  if (isNumericX) {
    const minX = Math.min(...xValues), maxX = Math.max(...xValues);
    const rangeX = maxX - minX || 1;
    getX = (i: number) => pad.left + ((xValues[i] - minX) / rangeX) * W;
    for (let i = 0; i <= 4; i++) {
      const val = minX + (rangeX / 4) * i;
      xTicks.push({ val: val % 1 === 0 ? val : val.toFixed(1), x: pad.left + (i * W / 4) });
    }
  } else {
    getX = (i: number) => pad.left + (labels.length > 1 ? (i / (labels.length - 1)) * W : W / 2);
    const tickStep = Math.ceil(labels.length / 6);
    for (let i = 0; i < labels.length; i += tickStep) {
      xTicks.push({ val: labels[i], x: getX(i) });
    }
  }

  const axisC = darkMode ? '#2d3748' : '#e5e7eb';
  const textC = darkMode ? '#718096' : '#9ca3af';
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minVal + (totalRange / 4) * i;
    return { val, y: getY(val) };
  });

  return (
    <svg width={width} height={height}>
      <GridLines ticks={yTicks} pad={pad} W={W} axisC={axisC} textC={textC} height={height} padBottom={pad.bottom} />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      <line x1={pad.left} y1={pad.top + H} x2={pad.left + W} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      {xTicks.map((t, i) => (
        <g key={i}>
          <line x1={t.x} y1={pad.top + H} x2={t.x} y2={pad.top + H + 4} stroke={axisC} strokeWidth={1} />
          <text x={t.x} y={height - pad.bottom + 14} fontSize={9} fill={textC} textAnchor="middle">
            {String(t.val).length > 8 ? String(t.val).slice(0, 7) + '…' : t.val}
          </text>
        </g>
      ))}
      {series.map((s) => s.values.map((v, i) => (
        <circle
          key={`${s.name}-${i}`}
          cx={getX(i)} cy={getY(v)} r={4.5}
          fill={s.color} stroke={darkMode ? '#1a202c' : '#fff'} strokeWidth={1.5}
          opacity={0.85}
        >
          <title>{`${s.name}: ${v} (x=${isNumericX ? xValues[i] : labels[i]})`}</title>
        </circle>
      )))}
      <Legend series={series} pad={pad} width={width} height={height} textC={textC} />
      {showTrendline && series.map((s, si) => {
        const txs = isNumericX ? xValues : labels.map((_, i) => i);
        const xMin2 = isNumericX ? Math.min(...xValues) : 0;
        const xRng2 = (isNumericX ? (Math.max(...xValues) - xMin2) : (labels.length - 1)) || 1;
        const toPx2 = (x: number) => pad.left + ((x - xMin2) / xRng2) * W;
        const reg = linearRegression(txs, s.values);
        const crosses = zeroCrossings(txs, s.values);
        const regEl = reg ? (() => {
          const px0 = toPx2(txs[0]), px1 = toPx2(txs[txs.length - 1]);
          const py0 = getY(reg.slope * txs[0] + reg.intercept);
          const py1 = getY(reg.slope * txs[txs.length - 1] + reg.intercept);
          const fmt = (n: number) => Math.abs(n) >= 100 ? n.toFixed(1) : Math.abs(n) >= 1 ? n.toFixed(3) : n.toPrecision(3);
          const eq = `y=${fmt(reg.slope)}x${reg.intercept >= 0 ? '+' : ''}${fmt(reg.intercept)}  R²=${reg.r2.toFixed(2)}`;
          const eqX = px0 + 4; const eqY = Math.min(py0, py1) - 8;
          return (<g key="reg">
            <line x1={px0} y1={py0} x2={px1} y2={py1} stroke={s.color} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7}/>
            <rect x={eqX - 2} y={eqY - 11} width={eq.length * 5.5} height={13} rx={2} fill={darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.9)'}/>
            <text x={eqX} y={eqY} fontSize={8} fill={s.color}>{eq}</text>
          </g>);
        })() : null;
        return (
          <g key={`an-${si}`}>
            {regEl}
            {crosses.map((cx, ci) => {
              const cpx = toPx2(cx); const cpy = getY(0);
              const lbl = isNumericX ? (+cx.toPrecision(4)).toString() : (labels[Math.round(Math.max(0, Math.min(cx, labels.length - 1)))] ?? cx.toFixed(2));
              return (<g key={ci}>
                <circle cx={cpx} cy={cpy} r={5} fill={s.color} stroke={darkMode ? '#1a202c' : '#fff'} strokeWidth={1.5} opacity={0.95}><title>{`Corte X: (${lbl}, 0)`}</title></circle>
                <text x={cpx} y={cpy - 8} textAnchor="middle" fontSize={8} fill={s.color} fontWeight="bold">{lbl}</text>
              </g>);
            })}
          </g>
        );
      })}
    </svg>
  );
}

function ChartPreview({ type, data, width, height, darkMode, showTrendline }: SVGChartProps & { type: ChartConfig['type'] }) {
  if (type === 'bar')     return <BarChartSVG     data={data} width={width} height={height} darkMode={darkMode} />;
  if (type === 'line')    return <LineChartSVG    data={data} width={width} height={height} darkMode={darkMode} showTrendline={showTrendline} />;
  if (type === 'area')    return <AreaChartSVG    data={data} width={width} height={height} darkMode={darkMode} />;
  if (type === 'pie')     return <PieChartSVG     data={data} width={width} height={height} darkMode={darkMode} />;
  if (type === 'scatter') return <ScatterChartSVG data={data} width={width} height={height} darkMode={darkMode} showTrendline={showTrendline} />;
  return null;
}

// ─── ChartModal ───────────────────────────────────────────────────────────────

interface ChartModalProps {
  darkMode: boolean;
  cells: Record<string, Cell>;
  selRange: SelRange | null;
  initialConfig?: ChartConfig;
  hidden?: boolean;
  onClose: () => void;
  onInsert: (cfg: Omit<ChartConfig, 'id' | 'pos' | 'size'>) => void;
  onUpdate?: (id: number, cfg: Omit<ChartConfig, 'id' | 'pos' | 'size'>) => void;
  onStartPick: (field: 'X' | 'Y', cb: (range: string) => void) => void;
}

function ChartModal({ darkMode, cells, selRange, initialConfig, hidden, onClose, onInsert, onUpdate, onStartPick }: ChartModalProps) {
  const isEdit = !!initialConfig;
  const [type, setType] = useState<ChartConfig['type']>(initialConfig?.type ?? 'bar');
  const [title, setTitle] = useState(initialConfig?.title ?? '');
  const [hasHeader, setHasHeader] = useState(initialConfig?.hasHeader ?? true);
  const [showTrendline, setShowTrendline] = useState(initialConfig?.showTrendline ?? false);

  const [rangeX, setRangeX] = useState<string>(() => {
    if (initialConfig) return initialConfig.rangeX;
    if (!selRange) return '';
    if (selRange.c1 !== selRange.c2) {
      const r1 = Math.min(selRange.r1, selRange.r2), r2 = Math.max(selRange.r1, selRange.r2);
      const c1 = Math.min(selRange.c1, selRange.c2);
      return `${getCellId(r1, c1)}:${getCellId(r2, c1)}`;
    }
    return '';
  });

  const [rangeY, setRangeY] = useState<string>(() => {
    if (initialConfig) return initialConfig.rangeY;
    if (!selRange) return '';
    const r1 = Math.min(selRange.r1, selRange.r2), r2 = Math.max(selRange.r1, selRange.r2);
    const c1 = Math.min(selRange.c1, selRange.c2), c2 = Math.max(selRange.c1, selRange.c2);
    if (c1 !== c2) return `${getCellId(r1, c1 + 1)}:${getCellId(r2, c2)}`;
    return `${getCellId(r1, c1)}:${getCellId(r2, c2)}`;
  });

  const chartData = useMemo(() => buildChartData(rangeX, rangeY, hasHeader, cells), [rangeX, rangeY, hasHeader, cells]);
  const dm = darkMode;
  const canTrend = type === 'line' || type === 'scatter';

  const chartTypes: { id: ChartConfig['type']; label: string }[] = [
    { id: 'bar',     label: 'Barras' },
    { id: 'line',    label: 'Líneas' },
    { id: 'area',    label: 'Área' },
    { id: 'pie',     label: 'Pastel' },
    { id: 'scatter', label: 'Dispersión' },
  ];

  const handleConfirm = () => {
    const cfg = { type, title, rangeX, rangeY, hasHeader, showTrendline };
    if (isEdit && onUpdate && initialConfig) {
      onUpdate(initialConfig.id, cfg);
    } else {
      onInsert(cfg);
    }
  };

  const inputCls = `flex-1 px-2 py-1.5 rounded border text-[13px] font-mono outline-none focus:border-[#188038] ${dm ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-gray-800'}`;
  const pickBtnCls = `shrink-0 px-2 py-1 rounded text-[11px] font-medium border cursor-pointer transition-colors ${dm ? 'bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500' : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'}`;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${hidden ? 'hidden' : ''}`} onClick={onClose}>
      <div
        className={`flex flex-col overflow-hidden rounded-xl shadow-2xl w-full max-w-[700px] mx-2 ${dm ? 'bg-slate-800' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 bg-[#188038]">
          <span className="text-white font-semibold text-sm">{isEdit ? '✎ Editar gráfica' : 'Insertar gráfica'}</span>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl bg-transparent border-none cursor-pointer">&times;</button>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 overflow-auto">
          <div className={`flex sm:flex-col flex-wrap gap-1 sm:gap-0 shrink-0 p-2 sm:w-36 border-b sm:border-b-0 sm:border-r overflow-x-auto ${dm ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-[10px] font-semibold tracking-wider mb-2 pl-1 ${dm ? 'text-slate-500' : 'text-gray-400'}`}>TIPO</p>
            {chartTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-md mb-0.5 text-[13px] border-none cursor-pointer transition-colors
                  ${type === t.id
                    ? 'bg-[#e6f4ea] text-[#188038] font-semibold'
                    : dm ? 'bg-transparent text-slate-300 hover:bg-slate-700' : 'bg-transparent text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <div className={`rounded-lg border mb-4 p-2 ${dm ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-[11px] font-medium text-center mb-1 ${dm ? 'text-slate-400' : 'text-gray-500'}`}>{title || 'Vista previa'}</p>
              <ChartPreview type={type} data={chartData} width={490} height={190} darkMode={dm} showTrendline={showTrendline} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="col-span-2">
                <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-400' : 'text-gray-500'}`}>Título</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la gráfica"
                  className={`w-full px-2 py-1.5 rounded border text-[13px] outline-none focus:border-[#188038] ${dm ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-gray-800'}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-400' : 'text-gray-500'}`}>Rango Eje X (etiquetas)</label>
                <div className="flex gap-1">
                  <input value={rangeX} onChange={(e) => setRangeX(e.target.value.toUpperCase())} placeholder="ej. A1:A10" className={inputCls} />
                  <button className={pickBtnCls} title="Seleccionar del grid" onClick={() => onStartPick('X', (r) => setRangeX(r))}>← Grid</button>
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-400' : 'text-gray-500'}`}>Rango Eje Y (valores)</label>
                <div className="flex gap-1">
                  <input value={rangeY} onChange={(e) => setRangeY(e.target.value.toUpperCase())} placeholder="ej. B1:D10" className={inputCls} />
                  <button className={pickBtnCls} title="Seleccionar del grid" onClick={() => onStartPick('Y', (r) => setRangeY(r))}>← Grid</button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <label className={`flex items-center gap-2 text-[13px] cursor-pointer ${dm ? 'text-slate-300' : 'text-gray-700'}`}>
                <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="accent-[#188038]" />
                Primera fila como encabezados
              </label>
              {canTrend && (
                <label className={`flex items-center gap-2 text-[13px] cursor-pointer ${dm ? 'text-slate-300' : 'text-gray-700'}`}>
                  <input type="checkbox" checked={showTrendline} onChange={(e) => setShowTrendline(e.target.checked)} className="accent-[#188038]" />
                  Mostrar ecuación y puntos de corte
                </label>
              )}
            </div>
          </div>
        </div>

        <div className={`flex justify-end gap-2 px-4 py-3 border-t ${dm ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
          <button onClick={onClose}
            className={`px-5 py-1.5 rounded text-[13px] font-medium border cursor-pointer ${dm ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`}
          >Cancelar</button>
          <button onClick={handleConfirm}
            className="px-5 py-1.5 rounded text-[13px] font-medium bg-[#188038] text-white border-none cursor-pointer hover:bg-[#137033]"
          >{isEdit ? 'Guardar cambios' : 'Insertar'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── FloatingChart ────────────────────────────────────────────────────────────

interface FloatingChartProps {
  chart: ChartConfig;
  cells: Record<string, Cell>;
  darkMode: boolean;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onPositionChange: (id: number, pos: { x: number; y: number }, size: { w: number; h: number }) => void;
}

function FloatingChart({ chart, cells, darkMode, selected, onSelect, onRemove, onEdit, onPositionChange }: FloatingChartProps) {
  const [pos, setPos] = useState(chart.pos);
  const [size, setSize] = useState(chart.size);
  const chartData = useMemo(() => buildChartData(chart.rangeX || '', chart.rangeY || '', chart.hasHeader, cells), [chart, cells]);

  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    e.preventDefault();
    onSelect();
    const ox = e.clientX - pos.x, oy = e.clientY - pos.y;
    let latestPos = pos;
    let rafId: number | null = null;
    const onMove = (mv: MouseEvent) => {
      latestPos = { x: mv.clientX - ox, y: mv.clientY - oy };
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => { setPos(latestPos); rafId = null; });
    };
    const onUp = (mv: MouseEvent) => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      const newPos = { x: mv.clientX - ox, y: mv.clientY - oy };
      setPos(newPos);
      onPositionChange(chart.id, newPos, size);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    const sx = e.clientX, sy = e.clientY, sw = size.w, sh = size.h;
    let latestSize = size;
    let rafId: number | null = null;
    const onMove = (mv: MouseEvent) => {
      latestSize = { w: Math.max(250, sw + mv.clientX - sx), h: Math.max(180, sh + mv.clientY - sy) };
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => { setSize(latestSize); rafId = null; });
    };
    const onUp = (mv: MouseEvent) => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      const newSize = { w: Math.max(250, sw + mv.clientX - sx), h: Math.max(180, sh + mv.clientY - sy) };
      setSize(newSize);
      onPositionChange(chart.id, pos, newSize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const dm = darkMode;

  return (
    <div
      onMouseDown={startDrag}
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      className={`absolute flex flex-col overflow-hidden rounded-lg cursor-move select-none
        ${selected ? 'z-50 shadow-xl ring-2 ring-[#1a73e8]' : 'z-10 shadow-md hover:shadow-lg hover:ring-1 hover:ring-gray-300'}
        ${dm ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}
    >
      <div className={`flex items-center justify-between px-3 py-1.5 shrink-0 border-b ${dm ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
        <span className={`text-[12px] font-semibold truncate flex-1 ${dm ? 'text-slate-300' : 'text-gray-600'}`}>
          {chart.title || `Gráfica (${chart.type})`}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Editar gráfica"
          className={`bg-transparent border-none cursor-pointer text-[13px] leading-none ml-1 px-1 transition-colors ${dm ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'}`}
        >
          ✎
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className={`bg-transparent border-none cursor-pointer text-lg leading-none ml-1 transition-colors ${dm ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'}`}
        >
          &times;
        </button>
      </div>

      <div className="flex-1 min-h-0 p-2">
        <ChartPreview type={chart.type} data={chartData} width={size.w - 16} height={size.h - 52} darkMode={dm} showTrendline={chart.showTrendline} />
      </div>

      <div
        className="resize-handle absolute right-0 bottom-0 w-5 h-5 cursor-nwse-resize z-10 flex items-center justify-center"
        onMouseDown={startResize}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill={dm ? '#4a5568' : '#cbd5e0'}>
          <path d="M 10 0 L 10 10 L 0 10 Z"/>
        </svg>
      </div>

      {selected && [
        [0, 0], [50, 0], [100, 0],
        [0, 50], [100, 50],
        [0, 100], [50, 100], [100, 100]
      ].map(([lp, tp], i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-[#1a73e8] border-2 border-white rounded-sm pointer-events-none z-20"
          style={{ left: `${lp}%`, top: `${tp}%`, transform: 'translate(-50%,-50%)' }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HojaCalculo({ darkMode, readOnly = false, initialData, onSave }: HojaCalculoProps) {
  // ── State ──
  const [sheets, setSheets] = useState<SheetMeta[]>(() =>
    initialData?.sheets ?? [{ id: 1, name: 'Hoja 1' }, { id: 2, name: 'Hoja 2' }]
  );
  const [activeSheet, setActiveSheet] = useState<number>(() => initialData?.activeSheet ?? 1);
  const [allCells, setAllCells] = useState<Record<number, Record<string, Cell>>>(() => initialData?.allCells ?? {});
  const [allCharts, setAllCharts] = useState<Record<number, ChartConfig[]>>(() => initialData?.allCharts ?? {});
  const [sel, setSel] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [selRange, setSelRange] = useState<SelRange | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editVal, setEditVal] = useState<string>('');
  const [showChartModal, setShowChartModal] = useState(false);
  const [selectedChart, setSelectedChart] = useState<number | null>(null);
  const [renamingSheet, setRenamingSheet] = useState<number | null>(null);
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => initialData?.colWidths ?? {});
  // Virtual scroll: only rows in this range are rendered
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  // Chart editing
  const [editingChartId, setEditingChartId] = useState<number | null>(null);
  // Range picking for chart modal
  const [pickingFor, setPickingFor] = useState<'X' | 'Y' | null>(null);
  const chartPickCallbackRef = useRef<((range: string) => void) | null>(null);

  const fillStartRef = useRef<{ r: number; c: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragAnchorRef = useRef<{ r: number; c: number } | null>(null);
  const dragEndRef = useRef<{ r: number; c: number } | null>(null);
  const dragRafRef = useRef<number | null>(null);

  const cells: Record<string, Cell> = useMemo(() => allCells[activeSheet] || {}, [allCells, activeSheet]);
  const charts: ChartConfig[] = useMemo(() => allCharts[activeSheet] || [], [allCharts, activeSheet]);
  const dm = darkMode;

  // ── Auto-save: debounced to avoid firing on every keystroke ──
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onSaveRef.current?.({ allCells, allCharts, sheets, activeSheet, colWidths });
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [allCells, allCharts, sheets, activeSheet, colWidths]);

  const getColW = (sheetId: number, col: number): number => {
    return colWidths[`${sheetId}-${col}`] ?? DEFAULT_COL_W;
  };
  const setColW = (sheetId: number, col: number, w: number) => {
    setColWidths(prev => ({ ...prev, [`${sheetId}-${col}`]: w }));
  };

  // ── Cell helpers ──
  const setCell = useCallback((id: string, data: Partial<Cell>) => {
    setAllCells((prev) => ({
      ...prev,
      [activeSheet]: {
        ...(prev[activeSheet] || {}),
        [id]: { ...(prev[activeSheet]?.[id] || {}), ...data } as Cell,
      },
    }));
  }, [activeSheet]);

  const getCell = useCallback((id: string): Cell => cells[id] || ({ value: '' } as Cell), [cells]);
  const curId = getCellId(sel.r, sel.c);
  const curCell = getCell(curId);

  // ── Edit ──
  const startEdit = useCallback((id: string, initVal?: string) => {
    if (readOnly) return;
    const c = getCell(id);
    setEditingCell(id);
    setEditVal(initVal !== undefined ? initVal : (c.formula || c.value || ''));
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
  }, [getCell, readOnly]);

  const commitEdit = useCallback((id: string | null, val: string) => {
    if (!id) return;
    const trimmed = val.trim();
    const data: Partial<Cell> = trimmed.startsWith('=')
      ? { formula: trimmed, value: '' }
      : { formula: null, value: trimmed };
    setAllCells((prev) => ({
      ...prev,
      [activeSheet]: {
        ...(prev[activeSheet] || {}),
        [id]: { ...(prev[activeSheet]?.[id] || {}), ...data } as Cell,
      },
    }));
    setEditingCell(null);
    setEditVal('');
    gridRef.current?.focus();
  }, [activeSheet]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditVal('');
    gridRef.current?.focus();
  }, []);

  // ── Selection ──
  const moveSel = useCallback((dr: number, dc: number, extend = false) => {
    setSel((prev) => {
      const nr = Math.max(0, Math.min(ROWS - 1, prev.r + dr));
      const nc = Math.max(0, Math.min(COLS - 1, prev.c + dc));
      if (!extend) setSelRange(null);
      else setSelRange((rng) =>
        rng
          ? { ...rng, r2: nr, c2: nc }
          : { r1: prev.r, c1: prev.c, r2: nr, c2: nc }
      );
      return { r: nr, c: nc };
    });
  }, []);

  const clickCell = useCallback((r: number, c: number, shift: boolean, e?: React.MouseEvent) => {
    if (e && (e.target as HTMLElement).tagName === 'INPUT') return;

    // Formula cell ref insertion
    if (editingCell && editVal.startsWith('=')) {
      e?.preventDefault();
      const clickedId = getCellId(r, c);
      if (clickedId !== editingCell) {
        setEditVal((prev) => prev + clickedId);
        setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }
    }

    if (editingCell) commitEdit(editingCell, editVal);

    if (shift) {
      setSelRange((rng) =>
        rng ? { ...rng, r2: r, c2: c } : { r1: sel.r, c1: sel.c, r2: r, c2: c }
      );
      setSel({ r, c });
    } else {
      setSel({ r, c });
      setSelRange(null);
      dragAnchorRef.current = { r, c };
      dragEndRef.current = null;
      isDraggingRef.current = true;
    }
    setSelectedChart(null);
    gridRef.current?.focus();
  }, [editingCell, editVal, sel.r, sel.c, commitEdit]);

  // ── Keyboard ──
  const onGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editingCell) return;

    const navMap: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0],
      ArrowLeft: [0, -1], ArrowRight: [0, 1],
      Tab: [0, 1], Enter: [1, 0],
    };

    if (navMap[e.key]) {
      e.preventDefault();
      moveSel(...navMap[e.key], e.shiftKey && e.key.startsWith('Arrow'));
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (readOnly) return;
      e.preventDefault();
      const ids = selRange ? getRangeIds(selRange) : [curId];
      setAllCells((prev) => {
        const s = { ...(prev[activeSheet] || {}) };
        ids.forEach((id) => {
          if (s[id]) s[id] = { ...s[id], value: '', formula: null };
        });
        return { ...prev, [activeSheet]: s };
      });
      return;
    }

    if (e.key === 'F2') { if (!readOnly) startEdit(curId); return; }
    if (e.key === 'Escape') { setSelRange(null); return; }

    // Start typing to edit
    if (!readOnly && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      startEdit(curId, e.key);
    }
  }, [editingCell, selRange, curId, activeSheet, moveSel, startEdit]);

  const onEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitEdit(editingCell, editVal);
      moveSel(1, 0);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit(editingCell, editVal);
      moveSel(0, e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      cancelEdit();
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      if (editVal.startsWith('=')) {
        // In formula mode: if cursor is at the end or right after an operator, insert a cell ref
        const input = e.target as HTMLInputElement;
        const pos = input.selectionStart ?? editVal.length;
        const lastChar = editVal[pos - 1];
        const isAtOperator = pos === editVal.length && /[=+\-*/,(:;]/.test(lastChar || '=');
        if (isAtOperator) {
          e.preventDefault();
          // Navigate selection and insert ref
          const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
          const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
          setSel(prev => {
            const nr = Math.max(0, Math.min(ROWS - 1, prev.r + dr));
            const nc = Math.max(0, Math.min(COLS - 1, prev.c + dc));
            const newRef = getCellId(nr, nc);
            setEditVal(v => v + newRef);
            return { r: nr, c: nc };
          });
          return;
        }
        // Otherwise let the cursor move normally inside the formula text
        return;
      }
      // Non-formula: commit and navigate
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        commitEdit(editingCell, editVal);
        moveSel(e.key === 'ArrowUp' ? -1 : 1, 0);
      }
    }
  }, [editingCell, editVal, commitEdit, cancelEdit, moveSel]);

  // ── Column select from header (prevents grid text selection) ──
  const selectColumn = (c: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (editingCell) commitEdit(editingCell, editVal);
    setSel({ r: 0, c });
    setSelRange({ r1: 0, c1: c, r2: ROWS - 1, c2: c });
    gridRef.current?.focus();
  };

  const selectRow = (r: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (editingCell) commitEdit(editingCell, editVal);
    setSel({ r, c: 0 });
    setSelRange({ r1: r, c1: 0, r2: r, c2: COLS - 1 });
    gridRef.current?.focus();
  };

  // ── Column resize ──
  const startColResize = (e: React.MouseEvent, c: number) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX;
    const sw = getColW(activeSheet, c);
    let latestW = sw;
    let rafId: number | null = null;
    const onMove = (mv: MouseEvent) => {
      latestW = Math.max(40, sw + mv.clientX - sx);
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => { setColW(activeSheet, c, latestW); rafId = null; });
    };
    const onUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      setColW(activeSheet, c, latestW);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Format helpers ──
  const getRangeIds = useCallback((rng: SelRange) => {
    const a: string[] = [];
    const r1 = Math.min(rng.r1, rng.r2), r2 = Math.max(rng.r1, rng.r2);
    const c1 = Math.min(rng.c1, rng.c2), c2 = Math.max(rng.c1, rng.c2);
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) a.push(getCellId(r, c));
    return a;
  }, []);

  const toggleFmt = (key: 'bold' | 'italic' | 'underline') => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      const anyOff = ids.some((id) => !s[id]?.[key]);
      ids.forEach((id) => { s[id] = { ...(s[id] || { value: '' }), [key]: anyOff }; });
      return { ...prev, [activeSheet]: s };
    });
  };

  const setTextColor = (color: string) => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      ids.forEach((id) => { s[id] = { ...(s[id] || { value: '' }), color }; });
      return { ...prev, [activeSheet]: s };
    });
  };

  const setBgColor = (color: string) => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      ids.forEach((id) => { s[id] = { ...(s[id] || { value: '' }), bgColor: color }; });
      return { ...prev, [activeSheet]: s };
    });
  };

  const setAlign = (v: Cell['align']) => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      ids.forEach((id) => { s[id] = { ...(s[id] || { value: '' }), align: v }; });
      return { ...prev, [activeSheet]: s };
    });
  };

  const setFontSize = (size: number) => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      ids.forEach((id) => { s[id] = { ...(s[id] || { value: '' }), fontSize: size }; });
      return { ...prev, [activeSheet]: s };
    });
  };

  const toggleBorder = () => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      const anyOff = ids.some((id) => !s[id]?.border);
      ids.forEach((id) => { s[id] = { ...(s[id] || { value: '' }), border: anyOff }; });
      return { ...prev, [activeSheet]: s };
    });
  };

  const adjustDecimals = (delta: number) => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      ids.forEach((id) => {
        const current = s[id]?.decimals ?? -1;
        const newVal = Math.max(0, (current === -1 ? 0 : current) + delta);
        s[id] = { ...(s[id] || { value: '' }), decimals: newVal };
      });
      return { ...prev, [activeSheet]: s };
    });
  };

  const mergeCells = () => {
    if (!selRange) {
      const cell = getCell(curId);
      if ((cell.rowSpan || 1) > 1 || (cell.colSpan || 1) > 1) {
        setAllCells((prev) => {
          const s = { ...(prev[activeSheet] || {}) };
          const rSpan = cell.rowSpan || 1, cSpan = cell.colSpan || 1;
          for (let r = sel.r; r < sel.r + rSpan; r++) {
            for (let c = sel.c; c < sel.c + cSpan; c++) {
              const id = getCellId(r, c);
              if (s[id]) {
                const { rowSpan, colSpan, hidden, ...rest } = s[id];
                s[id] = rest as Cell;
              }
            }
          }
          return { ...prev, [activeSheet]: s };
        });
      }
      return;
    }

    const r1 = Math.min(selRange.r1, selRange.r2), r2 = Math.max(selRange.r1, selRange.r2);
    const c1 = Math.min(selRange.c1, selRange.c2), c2 = Math.max(selRange.c1, selRange.c2);
    const topLeftId = getCellId(r1, c1);

    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      s[topLeftId] = { ...(s[topLeftId] || { value: '' }), rowSpan: r2 - r1 + 1, colSpan: c2 - c1 + 1, hidden: false };
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          if (r === r1 && c === c1) continue;
          const id = getCellId(r, c);
          s[id] = { ...(s[id] || { value: '' }), hidden: true, rowSpan: undefined, colSpan: undefined };
        }
      }
      return { ...prev, [activeSheet]: s };
    });
    setSelRange(null);
    setSel({ r: r1, c: c1 });
  };

  const insertFunction = (fn: string) => {
    startEdit(curId, `=${fn}(`);
    setTimeout(() => {
      if (inputRef.current) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 10);
  };

  // ── Fill Down (drag fill handle) ──
  const fillDown = () => {
    if (!selRange) return;
    const r1 = Math.min(selRange.r1, selRange.r2);
    const r2 = Math.max(selRange.r1, selRange.r2);
    const c1 = Math.min(selRange.c1, selRange.c2);
    const c2 = Math.max(selRange.c1, selRange.c2);
    // Copy first row down
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      for (let c = c1; c <= c2; c++) {
        const srcCell = s[getCellId(r1, c)] || { value: '' };
        for (let r = r1 + 1; r <= r2; r++) {
          const destId = getCellId(r, c);
          // Offset formula if it has cell refs
          if (srcCell.formula) {
            const offset = r - r1;
            const newFormula = srcCell.formula.replace(/([A-Z]+)(\d+)/g, (_, col, row) => {
              return `${col}${parseInt(row) + offset}`;
            });
            s[destId] = { ...(s[getCellId(r1, c)] || {}), formula: newFormula, value: '' };
          } else {
            s[destId] = { ...(s[getCellId(r1, c)] || {}) };
          }
        }
      }
      return { ...prev, [activeSheet]: s };
    });
  };

  // ── Charts ──
  const insertChart = (cfg: Omit<ChartConfig, 'id' | 'pos' | 'size'>) => {
    const id = Date.now();
    setAllCharts((p) => ({
      ...p,
      [activeSheet]: [
        ...(p[activeSheet] || []),
        { ...cfg, id, pos: { x: 100, y: 80 }, size: { w: 440, h: 300 } },
      ],
    }));
    setShowChartModal(false);
  };

  const updateChart = (id: number, cfg: Omit<ChartConfig, 'id' | 'pos' | 'size'>) => {
    setAllCharts((p) => ({
      ...p,
      [activeSheet]: (p[activeSheet] || []).map((c) => c.id === id ? { ...c, ...cfg } : c),
    }));
    setEditingChartId(null);
  };

  const removeChart = (id: number) =>
    setAllCharts((p) => ({ ...p, [activeSheet]: (p[activeSheet] || []).filter((c) => c.id !== id) }));

  const updateChartPosSize = (id: number, pos: { x: number; y: number }, size: { w: number; h: number }) => {
    setAllCharts((p) => ({
      ...p,
      [activeSheet]: (p[activeSheet] || []).map((c) => c.id === id ? { ...c, pos, size } : c),
    }));
  };

  const handleStartPick = useCallback((field: 'X' | 'Y', cb: (range: string) => void) => {
    chartPickCallbackRef.current = cb;
    setPickingFor(field);
  }, []);

  const confirmPick = () => {
    if (selRange && chartPickCallbackRef.current) {
      const r1 = Math.min(selRange.r1, selRange.r2), r2 = Math.max(selRange.r1, selRange.r2);
      const c1 = Math.min(selRange.c1, selRange.c2), c2 = Math.max(selRange.c1, selRange.c2);
      chartPickCallbackRef.current(`${getCellId(r1, c1)}:${getCellId(r2, c2)}`);
    }
    chartPickCallbackRef.current = null;
    setPickingFor(null);
  };

  // ── Sheets ──
  const addSheet = () => {
    if (sheets.length >= 3) return;
    const id = Date.now();
    setSheets((s) => [...s, { id, name: `Hoja ${s.length + 1}` }]);
    setActiveSheet(id);
  };

  const renameSheet = (id: number, name: string) =>
    setSheets((s) => s.map((sh) => (sh.id === id ? { ...sh, name: name || sh.name } : sh)));

  const deleteSheet = (id: number) => {
    if (sheets.length === 1) return;
    setSheets((s) => {
      const ns = s.filter((sh) => sh.id !== id);
      if (activeSheet === id) setActiveSheet(ns[ns.length - 1].id);
      return ns;
    });
    setAllCells((p) => { const n = { ...p }; delete n[id]; return n; });
    setAllCharts((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  // ── Virtual scroll handler ──
  const handleGridScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, clientHeight } = container;
    const start = Math.max(0, Math.floor(scrollTop / ROW_H) - VISIBLE_BUFFER);
    const end = Math.min(ROWS - 1, Math.ceil((scrollTop + clientHeight) / ROW_H) + VISIBLE_BUFFER);
    setVisibleRange({ start, end });
  }, []);

  // ── Scroll to current cell (keyboard nav) ──
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    // Vertical
    const rowTop = sel.r * ROW_H;
    const { scrollTop, clientHeight } = container;
    if (rowTop < scrollTop) {
      container.scrollTop = rowTop;
    } else if (rowTop + ROW_H > scrollTop + clientHeight) {
      container.scrollTop = rowTop + ROW_H - clientHeight;
    }
    // Horizontal — compute column x position
    let colX = HEADER_W;
    for (let i = 0; i < sel.c; i++) colX += (colWidths[`${activeSheet}-${i}`] ?? DEFAULT_COL_W);
    const colW = colWidths[`${activeSheet}-${sel.c}`] ?? DEFAULT_COL_W;
    const { scrollLeft, clientWidth } = container;
    if (colX - HEADER_W < scrollLeft) container.scrollLeft = Math.max(0, colX - HEADER_W);
    else if (colX + colW > scrollLeft + clientWidth) container.scrollLeft = colX + colW - clientWidth;
  }, [sel, activeSheet, colWidths]);

  // ── Global mouseup: commit drag selection to state ──
  useEffect(() => {
    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      const anchor = dragAnchorRef.current;
      const end = dragEndRef.current;
      if (anchor && end && (anchor.r !== end.r || anchor.c !== end.c)) {
        setSelRange({ r1: anchor.r, c1: anchor.c, r2: end.r, c2: end.c });
      }
      dragAnchorRef.current = null;
      dragEndRef.current = null;
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, []);

  // ── Computed values ──
  const refName = selRange
    ? `${getCellId(Math.min(selRange.r1, selRange.r2), Math.min(selRange.c1, selRange.c2))}:${getCellId(Math.max(selRange.r1, selRange.r2), Math.max(selRange.c1, selRange.c2))}`
    : curId;

  const formulaBarVal = editingCell === curId
    ? editVal
    : (curCell.formula || curCell.value || '');

  // Selection stats for status bar
  const selectionStats = useMemo(() => {
    if (!selRange) return null;
    const ids = getRangeIds(selRange);
    const vals = ids
      .map(id => parseFloat(getRaw(id, cells)))
      .filter(v => !isNaN(v));
    if (!vals.length) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      count: ids.length,
      numCount: vals.length,
      sum: parseFloat(sum.toPrecision(10)),
      avg: parseFloat((sum / vals.length).toPrecision(8)),
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  }, [selRange, cells, getRangeIds]);

  // ── Styles ──
  const surfaceCls  = dm ? 'bg-slate-800' : 'bg-white';
  const borderCls   = dm ? 'border-slate-700' : 'border-gray-200';
  const headerBgCls = dm ? 'bg-slate-900' : 'bg-gray-50';
  const textCls     = dm ? 'text-slate-100' : 'text-gray-800';
  const subTextCls  = dm ? 'text-slate-400' : 'text-gray-500';
  const hoverBtnCls = dm ? 'hover:bg-slate-700' : 'hover:bg-gray-100';
  const tbBtnBase   = `flex items-center gap-1 px-1.5 py-1 rounded text-[13px] h-7 whitespace-nowrap border-none cursor-pointer bg-transparent transition-colors ${dm ? 'text-slate-200' : 'text-gray-700'} ${hoverBtnCls}`;
  const tbBtnActive = dm ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700';

  return (
    <div
      className={`flex flex-col h-full w-full overflow-hidden text-[13px] ${surfaceCls} ${textCls}`}
      style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
    >
      {/* ── Toolbar ── */}
      {!readOnly && <div className={`flex items-center gap-0.5 px-2 py-1 border-b flex-wrap shrink-0 ${borderCls} ${surfaceCls}`}>
        {/* Font size */}
        <select
          value={curCell.fontSize || 13}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className={`border rounded px-1 py-0.5 text-[12px] h-6 cursor-pointer outline-none ${dm ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-gray-300 text-gray-700'}`}
        >
          {[8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className={`w-px h-5 mx-0.5 ${dm ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Bold / Italic / Underline */}
        <button className={`${tbBtnBase} font-bold w-7 justify-center ${curCell.bold ? tbBtnActive : ''}`} onClick={() => toggleFmt('bold')} title="Negrita (Ctrl+B)">B</button>
        <button className={`${tbBtnBase} italic w-7 justify-center ${curCell.italic ? tbBtnActive : ''}`} onClick={() => toggleFmt('italic')} title="Cursiva (Ctrl+I)">I</button>
        <button className={`${tbBtnBase} underline w-7 justify-center ${curCell.underline ? tbBtnActive : ''}`} onClick={() => toggleFmt('underline')} title="Subrayado">U</button>

        <div className={`w-px h-5 mx-0.5 ${dm ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Text color */}
        <div className="relative" title="Color de texto">
          <div className={`w-6 h-6 rounded cursor-pointer border flex flex-col items-center justify-center overflow-hidden ${dm ? 'border-slate-600' : 'border-gray-300'}`}>
            <span className={`text-[11px] font-bold leading-none ${textCls}`}>A</span>
            <div className="h-1.5 w-full mt-0.5" style={{ backgroundColor: curCell.color || (dm ? '#e2e8f0' : '#1a202c') }} />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => setTextColor(e.target.value)} />
          </div>
        </div>

        {/* Background color */}
        <div className="relative" title="Color de fondo">
          <div className={`w-6 h-6 rounded cursor-pointer border flex flex-col items-center justify-center overflow-hidden ${dm ? 'border-slate-600' : 'border-gray-300'}`}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill={dm ? '#94a3b8' : '#6b7280'}>
              <path d="M13.5 2H8L2 8l6 6 5.5-5.5V2zm-5 1.5L12 7H8V3.5z"/>
            </svg>
            <div className="h-1.5 w-full mt-0.5" style={{ backgroundColor: curCell.bgColor || 'transparent', border: curCell.bgColor ? 'none' : `1px solid ${dm ? '#4a5568' : '#e2e8f0'}` }} />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => setBgColor(e.target.value)} />
          </div>
        </div>

        <div className={`w-px h-5 mx-0.5 ${dm ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Alignment */}
        <button className={`${tbBtnBase} w-6 justify-center ${!curCell.align || curCell.align === 'left' ? tbBtnActive : ''}`} onClick={() => setAlign('left')} title="Izquierda">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2"/><rect x="1" y="7" width="9" height="2"/><rect x="1" y="12" width="11" height="2"/></svg>
        </button>
        <button className={`${tbBtnBase} w-6 justify-center ${curCell.align === 'center' ? tbBtnActive : ''}`} onClick={() => setAlign('center')} title="Centro">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2"/><rect x="3.5" y="7" width="9" height="2"/><rect x="2.5" y="12" width="11" height="2"/></svg>
        </button>
        <button className={`${tbBtnBase} w-6 justify-center ${curCell.align === 'right' ? tbBtnActive : ''}`} onClick={() => setAlign('right')} title="Derecha">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2"/><rect x="6" y="7" width="9" height="2"/><rect x="4" y="12" width="11" height="2"/></svg>
        </button>

        <div className={`w-px h-5 mx-0.5 ${dm ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Borders */}
        <button className={`${tbBtnBase} w-6 justify-center ${curCell.border ? tbBtnActive : ''}`} onClick={toggleBorder} title="Bordes">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="14" height="14" rx="1"/><line x1="1" y1="8" x2="15" y2="8"/><line x1="8" y1="1" x2="8" y2="15"/></svg>
        </button>

        {/* Decimals */}
        <button className={`${tbBtnBase} px-2 font-mono text-[11px]`} onClick={() => adjustDecimals(-1)} title="Menos decimales">.0</button>
        <button className={`${tbBtnBase} px-2 font-mono text-[11px]`} onClick={() => adjustDecimals(1)} title="Más decimales">.00</button>

        <div className={`w-px h-5 mx-0.5 ${dm ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Merge */}
        <button
          className={`${tbBtnBase} w-6 justify-center ${(curCell.rowSpan || 1) > 1 || (curCell.colSpan || 1) > 1 ? tbBtnActive : ''}`}
          onClick={mergeCells}
          title="Combinar/Separar celdas"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="14" height="14" rx="1"/>
            <line x1="5" y1="1" x2="5" y2="15"/><line x1="11" y1="1" x2="11" y2="15"/>
            <line x1="1" y1="5" x2="15" y2="5"/><line x1="1" y1="11" x2="15" y2="11"/>
          </svg>
        </button>

        {/* Fill Down */}
        {selRange && (
          <button className={`${tbBtnBase} px-2 text-[11px]`} onClick={fillDown} title="Rellenar hacia abajo">
            ↓ Rellenar
          </button>
        )}

        <div className={`w-px h-5 mx-0.5 ${dm ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Insert chart */}
        <button
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[12px] font-medium border cursor-pointer h-6 text-[#188038] bg-transparent transition-colors ${dm ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-300 hover:bg-green-50'}`}
          onClick={() => setShowChartModal(true)}
          title="Insertar gráfica"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#188038" strokeWidth="2.5">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
            <line x1="2" y1="20" x2="22" y2="20"/>
          </svg>
          Insertar gráfica
        </button>

        {/* Functions dropdown */}
        <div className="relative group">
          <button className={`${tbBtnBase} px-2 font-bold text-[#188038] text-base`} title="Insertar función">∑</button>
          <div className={`absolute left-0 top-full mt-0.5 w-36 py-1 rounded shadow-xl hidden group-hover:block z-50 border ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            {['SUM', 'AVERAGE', 'COUNT', 'COUNTA', 'MAX', 'MIN', 'PRODUCT', 'MEDIAN', 'ROUND', 'ABS', 'SQRT', 'POWER', 'MOD', 'IF', 'STDEV', 'VAR', 'LN', 'LOG', 'EXP', 'INT', 'SIN', 'SENO', 'COS', 'TAN', 'DEGREES', 'RADIANS', 'PI'].map((fn) => (
              <button
                key={fn}
                onClick={() => insertFunction(fn)}
                className={`block w-full text-left px-3 py-1.5 text-[12px] transition-colors ${dm ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {fn}
              </button>
            ))}
          </div>
        </div>
      </div>}

      {/* ── Formula bar ── */}
      <div className={`flex items-center border-b h-7 shrink-0 ${borderCls} ${surfaceCls}`}>
        <div className={`min-w-[68px] px-2 flex items-center justify-center font-mono text-[12px] font-bold h-full border-r ${borderCls} ${headerBgCls} ${textCls}`}>
          {refName}
        </div>
        <div className={`w-7 flex items-center justify-center italic font-bold text-base text-[#188038] h-full border-r ${borderCls}`}>
          ƒ
        </div>
        <input
          type="text"
          readOnly={readOnly}
          value={formulaBarVal}
          onChange={(e) => {
            if (readOnly) return;
            if (editingCell === curId) setEditVal(e.target.value);
            else startEdit(curId, e.target.value);
          }}
          onKeyDown={editingCell === curId ? onEditKeyDown : undefined}
          onFocus={() => { if (!editingCell && !readOnly) startEdit(curId); }}
          placeholder={readOnly ? '' : 'Escribe un valor o =FORMULA'}
          className={`flex-1 border-none outline-none px-2 font-mono text-[12px] h-full bg-transparent ${textCls} ${readOnly ? 'cursor-default' : ''}`}
        />
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto relative"
          onScroll={handleGridScroll}
          onClick={(e) => {
            if ((e.target as HTMLElement) === scrollContainerRef.current) setSelectedChart(null);
          }}
        >
          {/* Floating charts */}
          {charts.map((chart) => (
            <FloatingChart
              key={chart.id}
              chart={chart}
              cells={cells}
              darkMode={dm}
              selected={selectedChart === chart.id}
              onSelect={() => setSelectedChart(chart.id)}
              onRemove={() => removeChart(chart.id)}
              onEdit={() => setEditingChartId(chart.id)}
              onPositionChange={updateChartPosSize}
            />
          ))}

          {/* Table */}
          <div
            ref={gridRef}
            tabIndex={0}
            onKeyDown={onGridKeyDown}
            className="outline-none"
            style={{ display: 'inline-block', minWidth: '100%', userSelect: 'none' }}
          >
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content' }}>
              <colgroup>
                <col style={{ width: HEADER_W, minWidth: HEADER_W }} />
                {Array.from({ length: COLS }).map((_, c) => (
                  <col key={c} style={{ width: getColW(activeSheet, c), minWidth: 30 }} />
                ))}
              </colgroup>

              <thead>
                <tr style={{ height: ROW_H }}>
                  {/* Corner cell */}
                  <th
                    className={`sticky top-0 left-0 z-20 border-r border-b select-none ${dm ? 'bg-slate-900 border-slate-600' : 'bg-gray-100 border-gray-300'}`}
                    style={{ width: HEADER_W }}
                    onClick={(e) => {
                      e.preventDefault();
                      if (editingCell) commitEdit(editingCell, editVal);
                      setSel({ r: 0, c: 0 });
                      setSelRange({ r1: 0, c1: 0, r2: ROWS - 1, c2: COLS - 1 });
                      gridRef.current?.focus();
                    }}
                  />
                  {Array.from({ length: COLS }).map((_, c) => {
                    const isColInRange = !!selRange &&
                      Math.min(selRange.c1, selRange.c2) <= c && c <= Math.max(selRange.c1, selRange.c2);
                    return (
                      <th
                        key={c}
                        className={`sticky top-0 z-10 text-[11px] font-semibold text-center select-none border-b border-r relative cursor-pointer transition-colors
                          ${dm
                            ? isColInRange ? 'bg-slate-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                            : isColInRange ? 'bg-blue-500 text-white' : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
                          }`}
                        style={{ width: getColW(activeSheet, c), height: ROW_H }}
                        onMouseDown={(e) => selectColumn(c, e)}
                      >
                        {getColumnLabel(c)}
                        <div
                          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-10 hover:bg-blue-400 transition-colors"
                          onMouseDown={(e) => startColResize(e, c)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {/* Top spacer — maintains scroll height above visible rows */}
                {visibleRange.start > 0 && (
                  <tr style={{ height: visibleRange.start * ROW_H }}>
                    <td colSpan={COLS + 1} />
                  </tr>
                )}
                {Array.from({ length: visibleRange.end - visibleRange.start + 1 }, (_, i) => {
                  const r = visibleRange.start + i;
                  const isRowInRange = !!selRange &&
                    Math.min(selRange.r1, selRange.r2) <= r && r <= Math.max(selRange.r1, selRange.r2);
                  return (
                    <tr key={r} style={{ height: ROW_H }}>
                      {/* Row header */}
                      <td
                        className={`sticky left-0 z-10 text-[11px] font-semibold text-center select-none border-b border-r cursor-pointer transition-colors
                          ${dm
                            ? isRowInRange ? 'bg-slate-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                            : isRowInRange ? 'bg-blue-500 text-white' : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
                          }`}
                        style={{ width: HEADER_W, height: ROW_H }}
                        onMouseDown={(e) => selectRow(r, e)}
                      >
                        {r + 1}
                      </td>

                      {Array.from({ length: COLS }).map((_, c) => {
                        const id = getCellId(r, c);
                        const cell = getCell(id);

                        if (cell.hidden) return null;

                        const rawDisplay = getRaw(id, cells);
                        const isSel = sel.r === r && sel.c === c;
                        const editing = editingCell === id;
                        const fontSize = cell.fontSize || 13;

                        // Format display value
                        let displayVal = rawDisplay;
                        const numVal = parseFloat(rawDisplay);
                        if (!isNaN(numVal)) {
                          displayVal = formatNumber(rawDisplay, cell.decimals);
                        }

                        const rMin = selRange ? Math.min(selRange.r1, selRange.r2) : -1;
                        const rMax = selRange ? Math.max(selRange.r1, selRange.r2) : -1;
                        const cMin = selRange ? Math.min(selRange.c1, selRange.c2) : -1;
                        const cMax = selRange ? Math.max(selRange.c1, selRange.c2) : -1;
                        const inRng = selRange !== null && r >= rMin && r <= rMax && c >= cMin && c <= cMax;

                        // Cell background
                        let cellBg = dm ? '#0f172a' : '#ffffff';
                        if (cell.bgColor) cellBg = cell.bgColor;
                        else if (inRng || isSel) cellBg = dm ? '#1e3a5f' : '#e8f0fe';

                        // Selection range border on boundary cells
                        let selBorder = '';
                        if (inRng) {
                          const bc = '#1a73e8';
                          const parts: string[] = [];
                          if (r === rMin) parts.push(`inset 0 2px 0 0 ${bc}`);
                          if (r === rMax) parts.push(`inset 0 -2px 0 0 ${bc}`);
                          if (c === cMin) parts.push(`inset 2px 0 0 0 ${bc}`);
                          if (c === cMax) parts.push(`inset -2px 0 0 0 ${bc}`);
                          selBorder = parts.join(', ');
                        }

                        const combinedShadow = [
                          cell.border ? `inset 0 0 0 1px ${dm ? '#94a3b8' : '#374151'}` : '',
                          selBorder,
                        ].filter(Boolean).join(', ') || undefined;

                        return (
                          <td
                            key={id}
                            id={`cell-${id}`}
                            className={`overflow-hidden whitespace-nowrap p-0 cursor-default relative
                              ${dm ? 'border-slate-800' : 'border-gray-200'} border-b border-r
                              ${isSel ? 'outline outline-2 outline-[#1a73e8] outline-offset-[-2px] z-[5]' : ''}
                            `}
                            colSpan={cell.colSpan}
                            rowSpan={cell.rowSpan}
                            style={{
                              width: getColW(activeSheet, c),
                              height: ROW_H,
                              fontWeight: cell.bold ? 700 : 400,
                              fontStyle: cell.italic ? 'italic' : 'normal',
                              textDecoration: cell.underline ? 'underline' : 'none',
                              textAlign: cell.align || 'left',
                              boxShadow: combinedShadow,
                              fontSize: `${fontSize}px`,
                              color: cell.color || (dm ? '#e2e8f0' : '#1a202c'),
                              backgroundColor: cellBg,
                            }}
                            onMouseDown={(e) => {
                              if ((e.target as HTMLElement).classList.contains('fill-handle')) return;
                              if (e.detail === 2) {
                                startEdit(id);
                              } else {
                                clickCell(r, c, e.shiftKey, e);
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (e.buttons !== 1 || !isDraggingRef.current || !dragAnchorRef.current) return;
                              dragEndRef.current = { r, c };
                              if (dragRafRef.current === null) {
                                dragRafRef.current = requestAnimationFrame(() => {
                                  dragRafRef.current = null;
                                  const anchor = dragAnchorRef.current;
                                  const end = dragEndRef.current;
                                  if (!anchor || !end) return;
                                  setSelRange({ r1: anchor.r, c1: anchor.c, r2: end.r, c2: end.c });
                                });
                              }
                            }}
                          >
                            {editing ? (
                              <input
                                ref={inputRef}
                                type="text"
                                value={editVal}
                                onChange={(e) => setEditVal(e.target.value)}
                                onKeyDown={onEditKeyDown}
                                onBlur={() => commitEdit(id, editVal)}
                                className="absolute inset-0 w-full border-none outline-none px-1 z-10"
                                style={{
                                  height: ROW_H,
                                  fontWeight: cell.bold ? 700 : 400,
                                  fontStyle: cell.italic ? 'italic' : 'normal',
                                  textAlign: cell.align || 'left',
                                  fontSize: `${fontSize}px`,
                                  color: cell.color || (dm ? '#e2e8f0' : '#1a202c'),
                                  backgroundColor: dm ? '#1e293b' : '#ffffff',
                                  fontFamily: 'inherit',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                }}
                              />
                            ) : (
                              <div
                                className={`px-1 overflow-hidden text-ellipsis whitespace-nowrap flex items-center ${
                                  rawDisplay.startsWith('#') && rawDisplay.includes('!')
                                    ? 'text-red-500'
                                    : cell.formula
                                      ? (dm ? 'text-blue-300' : 'text-blue-600')
                                      : ''
                                }`}
                                style={{
                                  height: ROW_H,
                                  justifyContent: cell.align === 'right' ? 'flex-end'
                                    : cell.align === 'center' ? 'center' : 'flex-start',
                                  fontSize: `${fontSize}px`,
                                }}
                              >
                                {displayVal}
                              </div>
                            )}
                            {/* Fill handle — only on bottom-right of selection anchor or single selected */}
                            {isSel && !editing && (
                              <div
                                className="fill-handle absolute right-0 bottom-0 w-3 h-3 bg-[#1a73e8] cursor-crosshair z-10"
                                style={{ transform: 'translate(50%, 50%)' }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  fillStartRef.current = { r, c };
                                  // Track fill target in local variable to avoid stale closure
                                  let fillEnd: { row: number; col: number } | null = null;
                                  const onMove = (mv: MouseEvent) => {
                                    const el = document.elementFromPoint(mv.clientX, mv.clientY);
                                    if (el) {
                                      const cellEl = el.closest('[id^="cell-"]');
                                      if (cellEl) {
                                        const cid = cellEl.id.replace('cell-', '');
                                        const ref = parseRef(cid);
                                        if (ref && ref.row > r) {
                                          fillEnd = ref;
                                          setSelRange({ r1: r, c1: c, r2: ref.row, c2: ref.col });
                                        }
                                      }
                                    }
                                  };
                                  const onUp = () => {
                                    window.removeEventListener('mousemove', onMove);
                                    window.removeEventListener('mouseup', onUp);
                                    if (!fillEnd) return;
                                    // Inline fill — avoids stale selRange closure from fillDown()
                                    setAllCells((prev) => {
                                      const s = { ...(prev[activeSheet] || {}) };
                                      const endCol = Math.max(c, fillEnd!.col);
                                      for (let col = c; col <= endCol; col++) {
                                        const srcId = getCellId(r, col);
                                        const srcCell = s[srcId] || { value: '' };
                                        for (let row = r + 1; row <= fillEnd!.row; row++) {
                                          const destId = getCellId(row, col);
                                          if (srcCell.formula) {
                                            const offset = row - r;
                                            const newFormula = srcCell.formula.replace(/([A-Z]+)(\d+)/g, (_: string, cs: string, rs: string) => `${cs}${parseInt(rs) + offset}`);
                                            s[destId] = { ...srcCell, formula: newFormula, value: '' };
                                          } else {
                                            s[destId] = { ...srcCell };
                                          }
                                        }
                                      }
                                      return { ...prev, [activeSheet]: s };
                                    });
                                  };
                                  window.addEventListener('mousemove', onMove);
                                  window.addEventListener('mouseup', onUp);
                                }}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {/* Bottom spacer — maintains scroll height below visible rows */}
                {visibleRange.end < ROWS - 1 && (
                  <tr style={{ height: (ROWS - 1 - visibleRange.end) * ROW_H }}>
                    <td colSpan={COLS + 1} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Status bar ── */}
        <div className={`h-6 flex items-center justify-between px-3 border-t text-[11px] shrink-0 ${borderCls} ${dm ? 'bg-slate-900 text-slate-500' : 'bg-gray-50 text-gray-400'}`}>
          <div className="flex items-center gap-1">
            {selectionStats && (
              <span>
                Suma: <strong className={dm ? 'text-slate-300' : 'text-gray-600'}>{selectionStats.sum}</strong>
                {' · '}Promedio: <strong className={dm ? 'text-slate-300' : 'text-gray-600'}>{selectionStats.avg}</strong>
                {' · '}Min: <strong className={dm ? 'text-slate-300' : 'text-gray-600'}>{selectionStats.min}</strong>
                {' · '}Max: <strong className={dm ? 'text-slate-300' : 'text-gray-600'}>{selectionStats.max}</strong>
                {' · '}Número: <strong className={dm ? 'text-slate-300' : 'text-gray-600'}>{selectionStats.numCount}</strong>
              </span>
            )}
          </div>
          <span>{curId}</span>
        </div>

        {/* ── Sheet tabs ── */}
        <div className={`h-8 border-t flex items-stretch overflow-hidden shrink-0 ${borderCls} ${headerBgCls}`}>
          {!readOnly && (
            <button
              onClick={addSheet}
              title="Nueva hoja"
              className={`w-8 flex items-center justify-center border-none border-r shrink-0 cursor-pointer bg-transparent ${borderCls} ${subTextCls} ${hoverBtnCls}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          )}

          <div className="flex items-stretch flex-1 overflow-x-auto overflow-y-hidden">
            {sheets.map((sheet) => (
              <div key={sheet.id} className="relative flex items-stretch shrink-0">
                {renamingSheet === sheet.id ? (
                  <input
                    autoFocus
                    defaultValue={sheet.name}
                    className={`w-24 px-2 border-2 border-[#1a73e8] rounded-sm text-[12px] outline-none ${dm ? 'bg-slate-800 text-slate-100' : 'bg-white text-gray-800'}`}
                    onBlur={(e) => { renameSheet(sheet.id, e.target.value); setRenamingSheet(null); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { renameSheet(sheet.id, (e.target as HTMLInputElement).value); setRenamingSheet(null); }
                      if (e.key === 'Escape') setRenamingSheet(null);
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setActiveSheet(sheet.id)}
                    onDoubleClick={() => !readOnly && setRenamingSheet(sheet.id)}
                    className={`flex items-center h-full text-[12px] font-medium border-none cursor-pointer border-r transition-colors px-4 pr-8
                      ${activeSheet === sheet.id
                        ? `${surfaceCls} text-[#1a73e8] border-t-2 border-t-[#1a73e8]`
                        : `${headerBgCls} ${subTextCls} border-t-2 border-t-transparent ${hoverBtnCls}`
                      } ${borderCls}`}
                  >
                    {sheet.name}
                  </button>
                )}
                {!readOnly && sheets.length > 1 && activeSheet === sheet.id && renamingSheet !== sheet.id && (
                  <button
                    onClick={() => deleteSheet(sheet.id)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400 hover:text-red-500 text-sm leading-none p-0.5 transition-colors"
                    title="Eliminar hoja"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Range picking banner ── */}
      {pickingFor && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-4 py-2.5 bg-[#1a73e8] text-white shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold">Seleccionando Rango {pickingFor}:</span>
            <span className="text-[12px] opacity-90">Arrastra sobre las celdas y luego haz clic en Confirmar</span>
            {selRange && (
              <span className="font-mono text-[12px] bg-white/20 px-2 py-0.5 rounded">
                {getCellId(Math.min(selRange.r1, selRange.r2), Math.min(selRange.c1, selRange.c2))}:{getCellId(Math.max(selRange.r1, selRange.r2), Math.max(selRange.c1, selRange.c2))}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={confirmPick}
              className="px-4 py-1 rounded text-[13px] font-semibold bg-white text-[#1a73e8] border-none cursor-pointer hover:bg-blue-50"
            >✓ Confirmar selección</button>
            <button
              onClick={() => { chartPickCallbackRef.current = null; setPickingFor(null); }}
              className="px-3 py-1 rounded text-[13px] bg-white/20 border-none cursor-pointer hover:bg-white/30"
            >✕ Cancelar</button>
          </div>
        </div>
      )}

      {/* ── Chart modal (insert or edit) ── */}
      {(showChartModal || editingChartId !== null) && (
        <ChartModal
          darkMode={dm}
          cells={cells}
          selRange={selRange}
          initialConfig={editingChartId !== null ? charts.find(c => c.id === editingChartId) : undefined}
          hidden={pickingFor !== null}
          onClose={() => { setShowChartModal(false); setEditingChartId(null); }}
          onInsert={insertChart}
          onUpdate={updateChart}
          onStartPick={handleStartPick}
        />
      )}
    </div>
  );
}