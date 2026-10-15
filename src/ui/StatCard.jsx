export function StatCard({
  icon,
  iconBg,
  label,
  value,
  sub,
  subClass = 'text-slate-500',
  action,
  onAction,
  accentBar,
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white"
          style={{ backgroundColor: iconBg }}
          aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[12px] text-slate-500">{label}</p>
          <p className="font-display text-[22px] font-bold leading-tight text-navy-800">{value}</p>
          {sub && <p className={`text-[11.5px] font-medium ${subClass}`}>{sub}</p>}
        </div>
      </div>
      {action &&
        <button
          type="button"
          onClick={onAction}
          className="mt-auto pt-3 text-left text-[12px] font-semibold text-primary transition-colors duration-150 hover:text-primary-700">
          {action} →
        </button>
      }
      {accentBar &&
        <span className="mt-3 block h-[3px] w-12 rounded-full" style={{ backgroundColor: accentBar }} />
      }
    </div>
  );
}
