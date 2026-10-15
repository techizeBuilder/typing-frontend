import { useState } from 'react';
import { AlertCircleIcon, CheckIcon, DownloadIcon, LandmarkIcon, Loader2Icon, WifiOffIcon, XIcon } from 'lucide-react';
import { resolveAssetUrl, examInitials } from './examData';

export function OfflineBanner({ live = false, what = 'tests' }) {
  if (live) {
    return (
      <div role="alert" className="mb-4 flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] font-semibold text-rose-700">
        <WifiOffIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
        Please connect to the internet to access Live Tests.
      </div>
    );
  }
  return (
    <div role="status" className="mb-4 flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-800">
      <AlertCircleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      You are offline. Showing locally saved {what}. Results will not be stored in the database.
    </div>
  );
}

const saveStyles = {
  idle: 'border-primary-100 bg-primary-50 text-primary-700 hover:bg-primary-100',
  saving: 'border-primary-100 bg-primary-50 text-primary-700 opacity-70',
  saved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
};

export function SaveOfflineButton({ status, onClick, progress }) {
  const label = status === 'saving' ? 'Saving...'
    : status === 'saved' ? 'Saved for Offline'
      : status === 'error' ? 'Save Failed' : 'Save for Offline Use';
  return (
    <div className="flex items-center gap-3">
      {status === 'saving' && progress &&
        <span className="text-[12px] text-slate-500">Downloading audio {progress}…</span>
      }
      <button
        type="button"
        onClick={onClick}
        disabled={status === 'saving'}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-[12.5px] font-semibold transition-colors duration-150 ${saveStyles[status] || saveStyles.idle}`}>
        {status === 'saving' ? <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
          : status === 'saved' ? <CheckIcon className="h-4 w-4" aria-hidden="true" />
            : status === 'error' ? <XIcon className="h-4 w-4" aria-hidden="true" />
              : <DownloadIcon className="h-4 w-4" aria-hidden="true" />}
        {label}
      </button>
    </div>
  );
}

// Small round ↓ button on exam cards (legacy dashboard offline download).
export function CardSaveButton({ status = 'idle', onClick }) {
  const title = status === 'saved' ? 'Saved for offline' : status === 'saving' ? 'Saving...' : 'Save for offline use';
  const tone = status === 'saved' ? 'bg-emerald-100 text-emerald-700'
    : status === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-600 hover:bg-slate-100';
  return (
    <span
      role="button"
      tabIndex={0}
      title={title}
      aria-label={title}
      // Lives inside clickable exam cards (buttons/links): don't open the card.
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (status !== 'saving') onClick(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (status !== 'saving') onClick(); } }}
      className={`grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full border border-slate-200 shadow-card transition-colors duration-150 ${tone}`}>
      {status === 'saving' ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
        : status === 'saved' ? <CheckIcon className="h-3.5 w-3.5" />
          : status === 'error' ? <XIcon className="h-3.5 w-3.5" />
            : <DownloadIcon className="h-3.5 w-3.5" />}
    </span>
  );
}

// Exam logo uploaded by the admin, else initials.
export function ExamLogo({ exam, size = 'h-11 w-11', className = 'bg-primary-100 text-primary-700' }) {
  const [broken, setBroken] = useState(false);
  if (exam?.image_url && !broken) {
    return (
      <span className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-card`}>
        <img
          src={resolveAssetUrl(exam.image_url)}
          alt=""
          className="h-[85%] w-[85%] object-contain"
          onError={() => setBroken(true)} />
      </span>
    );
  }
  if (!exam) {
    return (
      <span className={`grid ${size} shrink-0 place-items-center rounded-full ${className}`}>
        <LandmarkIcon className="h-1/2 w-1/2" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full font-display text-[11px] font-bold ${className}`}>
      {examInitials(exam.name)}
    </span>
  );
}

export function ModeChips({ modes, value, onChange, label = 'Select Language / Font' }) {
  return (
    <div>
      <p className="mb-2 text-[12px] font-medium text-slate-600">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {modes.map((m) => {
          const active = m.value === value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange(m.value)}
              aria-pressed={active}
              className={`rounded-lg border px-4 py-2 text-[13px] font-medium transition-colors duration-150 ${
                active ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-navy-800 hover:border-primary hover:text-primary'}`}>
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EmptyState({ children }) {
  return <p className="py-10 text-center text-[13px] text-slate-500">{children}</p>;
}

export function LoadingState({ children = 'Loading...' }) {
  return (
    <p className="flex items-center justify-center gap-2 py-10 text-center text-[13px] text-slate-500">
      <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> {children}
    </p>
  );
}
