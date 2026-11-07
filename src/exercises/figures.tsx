// SVG pictures for maths problems: bar model (parts), rectangle, squared-paper shape, cuboid.
import type { Figure } from '../content/schema';
import { fmtNum } from '../lib/maths';

const STROKE = 'var(--violet)';
const FILL = 'var(--violet-soft)';
const TXT = { fontFamily: 'var(--font-title)', fontWeight: 800, fill: 'var(--ink)' } as const;

export function FigureView({ f }: { f: Figure }) {
  switch (f.kind) {
    case 'parts': return <PartsBar f={f} />;
    case 'rect': return <RectFig f={f} />;
    case 'grid': return <GridFig f={f} />;
    case 'cuboid': return <CuboidFig f={f} />;
  }
}

function PartsBar({ f }: { f: Extract<Figure, { kind: 'parts' }> }) {
  const max = Math.max(...f.rows.map((r) => r.parts));
  const unit = Math.min(38, 230 / max);
  const labelW = 96, rowH = 46, top = 8;
  const extraW = f.rows.some((r) => r.extra) ? 92 : 0;
  const barEnd = labelW + max * unit;
  const totalW = f.total ? 110 : 0;
  const W = barEnd + extraW + totalW + 8;
  const H = top + f.rows.length * rowH + 4;
  const colors = ['var(--pink-soft)', 'var(--mint-soft)', 'var(--sun-soft)', 'var(--violet-soft)'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} style={{ maxWidth: '100%', height: 'auto' }} role="img" aria-label="Схема: отрезки из равных частей">
      {f.rows.map((r, ri) => {
        const y = top + ri * rowH;
        return (
          <g key={ri}>
            <text x={labelW - 8} y={y + 22} textAnchor="end" fontSize={14} style={TXT}>{r.label}</text>
            {Array.from({ length: r.parts }, (_, k) => (
              <rect key={k} x={labelW + k * unit} y={y + 4} width={unit} height={28} rx={4} fill={colors[ri % colors.length]} stroke={STROKE} strokeWidth={2} />
            ))}
            {r.extra && (
              <>
                <rect x={labelW + r.parts * unit} y={y + 4} width={Math.min(extraW - 8, 60)} height={28} rx={4} fill="#fff" stroke={STROKE} strokeWidth={2} strokeDasharray="5 3" />
                <text x={labelW + r.parts * unit + Math.min(extraW - 8, 60) / 2} y={y + 23} textAnchor="middle" fontSize={12} style={TXT}>{r.extra}</text>
              </>
            )}
          </g>
        );
      })}
      {f.total && (() => {
        const x = barEnd + extraW + 6;
        const y1 = top + 4, y2 = top + (f.rows.length - 1) * rowH + 32;
        return (
          <g>
            <path d={`M${x} ${y1} q8 0 8 8 V${(y1 + y2) / 2 - 6} l6 6 l-6 6 V${y2 - 8} q0 8 -8 8`} fill="none" stroke={STROKE} strokeWidth={2} />
            <text x={x + 20} y={(y1 + y2) / 2 + 5} fontSize={14} style={TXT}>{f.total}</text>
          </g>
        );
      })()}
    </svg>
  );
}

function RectFig({ f }: { f: Extract<Figure, { kind: 'rect' }> }) {
  const k = 220 / Math.max(f.a, f.b);
  const w = Math.max(40, f.a * k), h = Math.max(40, f.b * k);
  const pad = 56;
  return (
    <svg viewBox={`0 0 ${w + pad + 16} ${h + 44}`} width={w + pad + 16} style={{ maxWidth: '100%', height: 'auto' }} role="img" aria-label={`Прямоугольник ${f.a} на ${f.b} ${f.unit}`}>
      <rect x={pad} y={8} width={w} height={h} rx={3} fill={FILL} stroke={STROKE} strokeWidth={3} />
      <text x={pad + w / 2} y={h + 34} textAnchor="middle" fontSize={16} style={TXT}>{fmtNum(f.a)} {f.unit}</text>
      <text x={pad - 8} y={8 + h / 2 + 5} textAnchor="end" fontSize={16} style={TXT}>{fmtNum(f.b)} {f.unit}</text>
    </svg>
  );
}

function GridFig({ f }: { f: Extract<Figure, { kind: 'grid' }> }) {
  const rows = f.cells.length, cols = Math.max(...f.cells.map((r) => r.length));
  const s = Math.min(30, 280 / cols);
  const W = cols * s + 4, H = rows * s + 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} style={{ maxWidth: '100%', height: 'auto' }} role="img" aria-label="Фигура на клетчатой бумаге">
      {f.cells.flatMap((r, y) => Array.from({ length: cols }, (_, x) => (
        <rect key={`${x}-${y}`} x={2 + x * s} y={2 + y * s} width={s} height={s}
          fill={r[x] === '#' ? 'var(--pink-soft)' : '#fff'} stroke={r[x] === '#' ? 'var(--pink)' : '#d9e4f5'} strokeWidth={r[x] === '#' ? 1.5 : 1} />
      )))}
    </svg>
  );
}

function CuboidFig({ f }: { f: Extract<Figure, { kind: 'cuboid' }> }) {
  // Cabinet projection: depth drawn at 45° and halved.
  const dk = 0.5 * Math.SQRT1_2;
  const k = Math.min(200 / (f.a + f.b * dk), 150 / (f.c + f.b * dk));
  const A = f.a * k, C = f.c * k, D = f.b * k * dk;
  const ox = 70, oy = 14 + D + C; // front-bottom-left corner
  const p = (x: number, y: number) => `${ox + x},${oy - y}`;
  const W = ox + A + D + 70, H = oy + 36;
  const unitGrid = f.cubes && [f.a, f.b, f.c].every((n) => Number.isInteger(n) && n <= 12);
  const lines: React.JSX.Element[] = [];
  if (unitGrid) {
    const g = { stroke: STROKE, strokeWidth: 1, opacity: 0.55 };
    for (let i = 1; i < f.a; i++) { // front verticals + top depth lines
      const x = (i * A) / f.a;
      lines.push(<line key={`fa${i}`} x1={ox + x} y1={oy} x2={ox + x} y2={oy - C} {...g} />);
      lines.push(<line key={`ta${i}`} x1={ox + x} y1={oy - C} x2={ox + x + D} y2={oy - C - D} {...g} />);
    }
    for (let j = 1; j < f.c; j++) { // front horizontals + side depth lines
      const y = (j * C) / f.c;
      lines.push(<line key={`fc${j}`} x1={ox} y1={oy - y} x2={ox + A} y2={oy - y} {...g} />);
      lines.push(<line key={`sc${j}`} x1={ox + A} y1={oy - y} x2={ox + A + D} y2={oy - y - D} {...g} />);
    }
    for (let m = 1; m < f.b; m++) { // top + side lines across the depth
      const d = (m * D) / f.b;
      lines.push(<line key={`tb${m}`} x1={ox + d} y1={oy - C - d} x2={ox + A + d} y2={oy - C - d} {...g} />);
      lines.push(<line key={`sb${m}`} x1={ox + A + d} y1={oy - d} x2={ox + A + d} y2={oy - C - d} {...g} />);
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} style={{ maxWidth: '100%', height: 'auto' }} role="img"
      aria-label={`Прямоугольный параллелепипед ${f.a} × ${f.b} × ${f.c} ${f.unit}`}>
      <polygon points={`${p(0, 0)} ${p(A, 0)} ${p(A, C)} ${p(0, C)}`} fill="var(--violet-soft)" stroke={STROKE} strokeWidth={2.5} />
      <polygon points={`${p(0, C)} ${p(A, C)} ${ox + A + D},${oy - C - D} ${ox + D},${oy - C - D}`} fill="#efeaff" stroke={STROKE} strokeWidth={2.5} />
      <polygon points={`${p(A, 0)} ${ox + A + D},${oy - D} ${ox + A + D},${oy - C - D} ${p(A, C)}`} fill="#ddd3ff" stroke={STROKE} strokeWidth={2.5} />
      {lines}
      {/* hidden edges (drawn on top, dashed, as in a textbook; skipped when split into cubes) */}
      {!unitGrid && <g stroke={STROKE} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.6}>
        <line x1={ox + D} y1={oy - D} x2={ox} y2={oy} />
        <line x1={ox + D} y1={oy - D} x2={ox + A + D} y2={oy - D} />
        <line x1={ox + D} y1={oy - D} x2={ox + D} y2={oy - C - D} />
      </g>}
      <text x={ox + A / 2} y={oy + 24} textAnchor="middle" fontSize={15} style={TXT}>{fmtNum(f.a)} {f.unit}</text>
      <text x={ox - 8} y={oy - C / 2 + 5} textAnchor="end" fontSize={15} style={TXT}>{fmtNum(f.c)} {f.unit}</text>
      <text x={ox + A + D / 2 + 8} y={oy - D / 2 + 14} fontSize={15} style={TXT}>{fmtNum(f.b)} {f.unit}</text>
    </svg>
  );
}
