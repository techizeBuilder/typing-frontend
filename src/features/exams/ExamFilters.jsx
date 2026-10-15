// Region chips, difficulty tabs/badges and the rules-PDF card from the new
// design. Region and difficulty are optional admin tags; untagged items only
// show under "All".
import { CircleDotIcon, DownloadIcon, LayersIcon, LayoutGridIcon } from 'lucide-react';
import { resolveAssetUrl, DIFFICULTIES } from './examData';

function IndiaGateIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 21V11C7 7.5 9 5 12 5C15 5 17 7.5 17 11V21H14.5V11.5C14.5 9.3 13.4 8 12 8C10.6 8 9.5 9.3 9.5 11.5V21H7Z" />
      <rect x="5" y="21" width="14" height="1.6" rx="0.5" />
    </svg>
  );
}
function TajMahalIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M9 12C9 8.5 10.3 6 12 5C13.7 6 15 8.5 15 12H9Z" />
      <circle cx="12" cy="4.2" r="0.9" />
      <rect x="9.3" y="12" width="5.4" height="9" />
      <rect x="4.6" y="15" width="1.4" height="6" />
      <circle cx="5.3" cy="14.2" r="0.8" />
      <rect x="18" y="15" width="1.4" height="6" />
      <circle cx="18.7" cy="14.2" r="0.8" />
      <rect x="6" y="21" width="12" height="1.4" rx="0.4" />
    </svg>
  );
}
function ToranGateIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="5" y="6" width="2" height="15" />
      <rect x="17" y="6" width="2" height="15" />
      <rect x="4" y="3.2" width="16" height="1.4" rx="0.4" />
      <rect x="4" y="6" width="16" height="1.2" rx="0.4" />
      <rect x="4" y="8.6" width="16" height="1.2" rx="0.4" />
    </svg>
  );
}
function PalaceIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="4.5" y="12" width="15" height="9" />
      <circle cx="7" cy="11" r="1.4" />
      <circle cx="12" cy="10" r="1.6" />
      <circle cx="17" cy="11" r="1.4" />
      <rect x="9.5" y="15" width="2" height="3" />
      <rect x="12.5" y="15" width="2" height="3" />
    </svg>
  );
}
function GopuramGateIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 3L20 10H4L12 3Z" />
      <rect x="5" y="10" width="2" height="11" />
      <rect x="17" y="10" width="2" height="11" />
      <path d="M9.5 21V15C9.5 13.3 10.6 12 12 12C13.4 12 14.5 13.3 14.5 15V21H9.5Z" />
    </svg>
  );
}
function StupaIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6 19C6 12.4 8.7 8 12 8C15.3 8 18 12.4 18 19H6Z" />
      <rect x="11.3" y="3" width="1.4" height="5" />
      <circle cx="12" cy="2.4" r="1" />
      <rect x="5" y="19" width="14" height="2" />
    </svg>
  );
}
function IndiaMapIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M11 2.3c1 .3 1.9.9 2.4 1.7.4.6 1.5.8 2.4.6.7-.1 1.4.3 1.3 1-.1.6-.8.9-.8 1.5 0 .5.6.7 1 1.1.6.6.4 1.5-.1 2-.6.6-1.5.6-2 1.3-.4.6-.2 1.4-.6 2-.5.7-1.5.7-1.9 1.5-.3.6.1 1.3-.3 1.9-.4.6-1.3.5-1.6 1.2-.3.7.2 1.6-.4 2.1-.5.4-1.2.1-1.6-.3-.6-.6-.5-1.6-1.1-2.2-.4-.4-1.1-.4-1.4-.9-.3-.5.1-1.1-.2-1.6-.4-.7-1.4-.6-1.9-1.2-.4-.5-.1-1.3-.5-1.8-.4-.5-1.2-.4-1.6-.9-.5-.6-.1-1.5-.5-2.1C4.1 8.7 2.8 8.7 2.7 7.9c-.1-.6.6-1 1.1-1.3.7-.4.9-1.3 1.6-1.7.6-.3 1.4 0 2-.4.6-.4.6-1.3 1.3-1.6.7-.3 1.5.5 2.3.4z" />
    </svg>
  );
}

// Same values the backend accepts for exams.region.
const REGIONS = [
  { value: 'Delhi', icon: IndiaGateIcon, color: '#DC2626' },
  { value: 'UP', icon: TajMahalIcon, color: '#EA580C' },
  { value: 'MP', icon: ToranGateIcon, color: '#7C3AED' },
  { value: 'Rajasthan', icon: PalaceIcon, color: '#D97706' },
  { value: 'Haryana', icon: GopuramGateIcon, color: '#16A34A' },
  { value: 'Bihar', icon: StupaIcon, color: '#92400E' },
  { value: 'Other State', icon: IndiaMapIcon, color: '#2563EB' },
];

export function RegionChips({ value, onChange }) {
  const chips = [{ value: 'all', label: 'All Exam' }, ...REGIONS];
  return (
    <div className="mt-3 flex flex-wrap gap-2.5" role="group" aria-label="Filter exams by region">
      {chips.map((p) => {
        const active = p.value === value;
        const Icon = p.icon;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            aria-pressed={active}
            className={`flex min-w-[112px] items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] font-medium transition-colors duration-150 ${
              active ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-navy-800 hover:border-primary hover:text-primary'}`}>
            {Icon ?
              <Icon className="h-6 w-6" style={{ color: active ? '#FFFFFF' : p.color }} aria-hidden="true" /> :
              <LayoutGridIcon className="h-5 w-5" aria-hidden="true" />}
            {p.label || p.value}
          </button>
        );
      })}
    </div>
  );
}

const difficultyTone = {
  Easy: 'bg-emerald-50 text-emerald-700',
  Moderate: 'bg-amber-50 text-amber-700',
  Hard: 'bg-rose-50 text-rose-700',
};

// "All / Easy / Moderate / Hard" tabs with live counts. Hidden when no item
// has a difficulty yet, so untagged content keeps the old layout.
export function DifficultyTabs({ items, value, onChange }) {
  if (!items.some((c) => DIFFICULTIES.includes(c.difficulty))) return null;
  const tabs = [
    { id: 'all', label: 'All', icon: LayersIcon, active: 'bg-navy-800 text-white', count: items.length },
    ...DIFFICULTIES.map((d) => ({
      id: d, label: d, icon: CircleDotIcon, active: difficultyTone[d],
      count: items.filter((c) => c.difficulty === d).length,
    })),
  ];
  return (
    <div className="flex flex-wrap gap-2 self-end" role="group" aria-label="Filter by difficulty">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          aria-pressed={value === t.id}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 ${
            value === t.id ? `border-transparent ${t.active}` : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
          <t.icon className="h-3.5 w-3.5" aria-hidden="true" />
          {t.label}
          <span className="rounded bg-black/10 px-1.5 text-[11px] font-semibold">{t.count}</span>
        </button>
      ))}
    </div>
  );
}

export function DifficultyBadge({ value }) {
  if (!difficultyTone[value]) return <span className="text-slate-400">—</span>;
  return <span className={`inline-block rounded px-2.5 py-[3px] text-[11.5px] font-medium ${difficultyTone[value]}`}>{value}</span>;
}

// "Typing Rules (Official PDF)" card for the dark exam banner.
export function RulesPdfCard({ url }) {
  return (
    <div className="rounded-lg bg-white/5 p-4 text-center">
      <p className="font-display text-[13.5px] font-semibold text-white">
        Typing Rules <span className="font-normal text-white/70">(Official PDF)</span>
      </p>
      <span className="mx-auto mt-3 grid h-14 w-12 place-items-center rounded bg-danger text-[11px] font-bold text-white">PDF</span>
      <p className="mt-2.5 text-[11px] leading-snug text-white/70">Check official typing rules, instructions and guidelines.</p>
      <a
        href={resolveAssetUrl(url)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-[12px] font-semibold text-navy-800 transition-colors duration-150 hover:bg-slate-100">
        <DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" /> Download PDF
      </a>
    </div>
  );
}
