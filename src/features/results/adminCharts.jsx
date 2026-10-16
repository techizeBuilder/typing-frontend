// Small dependency-free SVG charts for the admin Results page.

// Line chart: series = [{ key, label, color }], points = [{ label, [key]: number }].
export function LineChart({ points, series, height = 180, unit = '' }) {
  const W = 560; const H = height; const L = 34; const R = 10; const T = 10; const B = 26;
  const values = points.flatMap((p) => series.map((s) => Number(p[s.key]) || 0));
  const max = Math.max(10, Math.ceil(Math.max(0, ...values) / 10) * 10);
  const x = (i) => L + (points.length <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, max / 2, max];
  const step = Math.max(1, Math.ceil(points.length / 8));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Performance over time">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#E2E8F0" strokeDasharray="3 3" />
          <text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#94A3B8">{Math.round(t)}{unit}</text>
        </g>
      ))}
      {series.map((s) => (
        <g key={s.key}>
          <polyline fill="none" stroke={s.color} strokeWidth="2" points={points.map((p, i) => `${x(i)},${y(Number(p[s.key]) || 0)}`).join(' ')} />
          {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(Number(p[s.key]) || 0)} r="2.5" fill={s.color}><title>{`${p.label} · ${s.label}: ${p[s.key]}`}</title></circle>)}
        </g>
      ))}
      {points.map((p, i) => (i % step === 0 || i === points.length - 1) && (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#94A3B8">{p.label}</text>
      ))}
    </svg>
  );
}

// Donut chart: parts = [{ label, value, color }].
export function Donut({ parts, size = 120, label }) {
  const total = parts.reduce((t, p) => t + p.value, 0);
  const r = 40; const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }} className="shrink-0" role="img" aria-label={label}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#F1F5F9" strokeWidth="16" />
      {total > 0 && parts.map((p) => {
        const len = (p.value / total) * c;
        const el = <circle key={p.label} cx="50" cy="50" r={r} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 50 50)"><title>{`${p.label}: ${p.value}`}</title></circle>;
        offset += len;
        return el;
      })}
      <text x="50" y="54" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0F2A4A">{total}</text>
    </svg>
  );
}
