const tones = {
  blue: 'bg-primary-50 text-primary-700 border-primary-100',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  red: 'bg-rose-50 text-rose-700 border-rose-100',
  purple: 'bg-violet-50 text-violet-700 border-violet-100',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-100',
};

export function Pill({ tone = 'slate', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-[2px] text-[11px] font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Panel({ title, right, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-card ${className}`}>
      {(title || right) &&
        <div className="mb-3 flex items-center gap-3">
          {title && <h3 className="font-display text-[14px] font-semibold text-navy-800">{title}</h3>}
          {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
        </div>
      }
      {children}
    </section>
  );
}
