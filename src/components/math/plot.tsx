type Curve = { f: (x: number) => number; color: string; label: string; dashed?: boolean };
type Point = { x: number; y: number; color: string; label?: string };
type Arrow = { x: number; y: number; color: string; label: string };

/** Small dependency-free SVG plot with axes, curves, points, and vector arrows. */
export function Plot({ xRange, yRange, curves = [], points = [], arrows = [], label, height = 280 }: {
  xRange: [number, number]; yRange: [number, number]; curves?: Curve[]; points?: Point[]; arrows?: Arrow[]; label: string; height?: number;
}) {
  const width = 480;
  const pad = 32;
  const sx = (x: number) => pad + (x - xRange[0]) / (xRange[1] - xRange[0]) * (width - 2 * pad);
  const sy = (y: number) => height - pad - (y - yRange[0]) / (yRange[1] - yRange[0]) * (height - 2 * pad);
  const clampY = (y: number) => Math.max(yRange[0] - 1e3, Math.min(yRange[1] + 1e3, y));
  const ticks = (range: [number, number]) => {
    const span = range[1] - range[0];
    const step = span <= 4 ? 0.5 : span <= 10 ? 1 : span <= 40 ? 5 : 10;
    const start = Math.ceil(range[0] / step) * step;
    return Array.from({ length: Math.floor((range[1] - start) / step) + 1 }, (_, index) => Math.round((start + index * step) * 100) / 100);
  };
  const samples = 200;
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="w-full rounded-lg border border-slate-200 bg-white">
        <defs>
          {arrows.map((arrow, index) => <marker key={index} id={`arrowhead-${index}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill={arrow.color} /></marker>)}
        </defs>
        {ticks(xRange).map((tick) => <g key={`x${tick}`}><line x1={sx(tick)} x2={sx(tick)} y1={pad} y2={height - pad} stroke="#f1f5f9" /><text x={sx(tick)} y={height - pad + 14} fontSize="10" textAnchor="middle" fill="#64748b">{tick}</text></g>)}
        {ticks(yRange).map((tick) => <g key={`y${tick}`}><line x1={pad} x2={width - pad} y1={sy(tick)} y2={sy(tick)} stroke="#f1f5f9" /><text x={pad - 4} y={sy(tick) + 3} fontSize="10" textAnchor="end" fill="#64748b">{tick}</text></g>)}
        {xRange[0] <= 0 && xRange[1] >= 0 && <line x1={sx(0)} x2={sx(0)} y1={pad} y2={height - pad} stroke="#94a3b8" />}
        {yRange[0] <= 0 && yRange[1] >= 0 && <line x1={pad} x2={width - pad} y1={sy(0)} y2={sy(0)} stroke="#94a3b8" />}
        <clipPath id="plot-area"><rect x={pad} y={pad} width={width - 2 * pad} height={height - 2 * pad} /></clipPath>
        <g clipPath="url(#plot-area)">
          {curves.map((curve) => {
            const path = Array.from({ length: samples + 1 }, (_, index) => {
              const x = xRange[0] + (xRange[1] - xRange[0]) * index / samples;
              const y = curve.f(x);
              return Number.isFinite(y) ? `${index === 0 ? "M" : "L"}${sx(x).toFixed(1)},${sy(clampY(y)).toFixed(1)}` : "";
            }).join(" ");
            return <path key={curve.label} d={path} fill="none" stroke={curve.color} strokeWidth={2} strokeDasharray={curve.dashed ? "5 4" : undefined} />;
          })}
          {arrows.map((arrow, index) => <line key={arrow.label} x1={sx(0)} y1={sy(0)} x2={sx(arrow.x)} y2={sy(arrow.y)} stroke={arrow.color} strokeWidth={2.5} markerEnd={`url(#arrowhead-${index})`} />)}
          {points.map((point, index) => <g key={index}><circle cx={sx(point.x)} cy={sy(clampY(point.y))} r={4} fill={point.color} />{point.label && <text x={sx(point.x) + 6} y={sy(clampY(point.y)) - 6} fontSize="10" fill="#334155">{point.label}</text>}</g>)}
        </g>
      </svg>
      {(curves.length > 0 || arrows.length > 0) && (
        <figcaption className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
          {[...curves.map((curve) => ({ color: curve.color, label: curve.label })), ...arrows].map((item) => <span key={item.label} className="inline-flex items-center gap-1"><span className="inline-block h-2 w-4 rounded" style={{ background: item.color }} aria-hidden="true" />{item.label}</span>)}
        </figcaption>
      )}
    </figure>
  );
}
