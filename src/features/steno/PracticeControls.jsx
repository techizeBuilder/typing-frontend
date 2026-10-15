// Controls for the steno practice setup page (new design).
import { Fragment, useState } from 'react';
import {
  CheckCircle2Icon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  KeyboardIcon,
  LayersIcon,
  MousePointerClickIcon,
  StarIcon,
  XIcon,
} from 'lucide-react';
import { FIRST_N, clampRange, rangeLabel } from './stenoPractice';

function Modal({ children, onClose, wide = false, label }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/50 p-4" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-md'}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClose }) {
  return (
    <button type="button" onClick={onClose} aria-label="Close"
      className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600">
      <XIcon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

const smallInput = 'rounded border border-slate-300 px-2 py-1 text-[12px] outline-none focus:border-primary';

// "Select the word length": full passage, first N words, a typed count, a
// word-number range, or a range tapped in the transcript.
export function WordLengthSelect({ range, total, words, wpm, fontFamily, onChange }) {
  const [open, setOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [count, setCount] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  const choose = (r) => { onChange(r); setOpen(false); setError(''); };
  const setCountRange = () => {
    const n = parseInt(count, 10);
    if (!n || n < 1) return setError('Enter how many words to practise.');
    choose(clampRange(0, Math.min(n, total) - 1, total));
  };
  const setFromTo = () => {
    const a = parseInt(from, 10); const b = parseInt(to, 10);
    if (!a || !b || a < 1 || b < 1 || a > total || b > total) return setError(`Enter word numbers between 1 and ${total}.`);
    choose(clampRange(a - 1, b - 1, total));
  };
  const label = rangeLabel(range);
  const firstN = FIRST_N.filter((n) => n < total);

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-navy-800">Select the word length</p>
      <div className="relative">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className={`flex w-full items-center rounded-md border px-3 py-2.5 text-left text-[13px] transition-colors duration-150 ${open ? 'border-primary ring-2 ring-primary/20' : 'border-slate-300 hover:bg-slate-50'}`}>
          <span className="text-navy-800">{label}</span>
          {open ? <ChevronUpIcon className="ml-auto h-4 w-4 text-slate-500" aria-hidden="true" /> : <ChevronDownIcon className="ml-auto h-4 w-4 text-slate-500" aria-hidden="true" />}
        </button>
        {open &&
          <div className="scroll-thin absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-[320px] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-panel">
            <Option selected={!range} onClick={() => choose(null)}>Full Length</Option>
            <div className="mx-2 my-1 rounded-md border border-violet-200 bg-violet-50 px-3 py-2">
              <button type="button" onClick={() => { setOpen(false); setPickOpen(true); }} className="flex w-full items-start gap-2 text-left">
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-violet-700">Pick Start &amp; End Word</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-[1px] text-[9.5px] font-bold text-white">
                      <StarIcon className="h-2.5 w-2.5 fill-current" aria-hidden="true" /> BEST
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">Tap two words in the transcript to practise just that part</span>
                </span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="w-[120px] shrink-0 text-[12.5px] font-medium text-navy-800">Type No. of Words</span>
              <input type="number" min="1" max={total} value={count} onChange={(e) => setCount(e.target.value)} placeholder="e.g., 150" aria-label="Number of words" className={`${smallInput} w-[90px]`} />
              <button type="button" onClick={setCountRange} className="rounded bg-primary px-3 py-1 text-[11.5px] font-semibold text-white hover:bg-primary-700">Set</button>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="w-[120px] shrink-0 text-[12.5px] font-medium text-navy-800">Word no. range</span>
              <input type="number" min="1" max={total} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" aria-label="Word number from" className={`${smallInput} w-[78px]`} />
              <input type="number" min="1" max={total} value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" aria-label="Word number to" className={`${smallInput} w-[78px]`} />
              <button type="button" onClick={setFromTo} className="rounded bg-primary px-3 py-1 text-[11.5px] font-semibold text-white hover:bg-primary-700">Set</button>
            </div>
            {error && <p role="alert" className="px-3 pb-1 text-[11.5px] text-danger">{error}</p>}
            {firstN.map((n) => (
              <Option key={n} selected={range?.start === 0 && range.end === n - 1} onClick={() => choose(clampRange(0, n - 1, total))}>First {n} words</Option>
            ))}
          </div>
        }
      </div>
      <p className="mt-1.5 text-[11.5px] text-slate-500">
        Total words available: <span className="font-semibold">{total}</span>
        {range && <> · Practising <span className="font-semibold">{range.end - range.start + 1}</span> words. Part-length attempts are practice only and are not saved to your results.</>}
      </p>
      {pickOpen &&
        <PickWordRangeModal words={words} wpm={wpm} fontFamily={fontFamily} onClose={() => setPickOpen(false)}
          onApply={(start, end) => { onChange(clampRange(start, end, total)); setPickOpen(false); }} />
      }
    </div>
  );
}

function Option({ selected, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] transition-colors duration-150 hover:bg-slate-50">
      {selected && <CheckIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
      <span className={selected ? 'font-medium text-primary' : 'text-navy-800'}>{children}</span>
    </button>
  );
}

export function PickWordRangeModal({ words, wpm, fontFamily, onClose, onApply }) {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const tap = (i) => {
    if (start === null || end !== null) { setStart(i); setEnd(null); return; }
    if (i < start) { setEnd(start); setStart(i); } else setEnd(i);
  };
  const hasRange = start !== null && end !== null;
  const count = hasRange ? end - start + 1 : 0;
  const seconds = Math.round((count / wpm) * 60);
  const inRange = (i) => (start === null ? false : end === null ? i === start : i >= start && i <= end);

  return (
    <Modal wide onClose={onClose} label="Pick start and end word">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <p className="text-[13.5px] font-bold text-navy-800">{start === null || hasRange ? 'Tap your START word, then your END word' : 'Now tap your END word'}</p>
        <CloseButton onClose={onClose} />
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <p className="text-[16px] leading-[2.2] text-navy-800" style={fontFamily ? { fontFamily } : undefined}>
          {words.map((w, i) => {
            const selected = i === start || i === end;
            const between = inRange(i) && !selected;
            return (
              <Fragment key={i}>
                <button type="button" onClick={() => tap(i)} aria-pressed={selected}
                  className={`mx-[1px] rounded px-1 transition-colors duration-100 ${selected ? 'bg-primary text-white' : between ? 'bg-sky-100 text-navy-800' : 'hover:bg-slate-100'}`}>
                  {w}
                </button>{' '}
              </Fragment>
            );
          })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-5 py-3.5">
        <span className="text-[12px] text-slate-600">
          {hasRange ? <>Words <span className="font-semibold text-navy-800">{start + 1}–{end + 1}</span> · {count} words · about {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} of audio</> :
            start !== null ? <>Start word: <span className="font-semibold text-navy-800">{start + 1}</span> — now tap the end word</> : 'No words selected yet'}
        </span>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => { setStart(null); setEnd(null); }} className="rounded-md border border-slate-300 px-4 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">Clear</button>
          <button type="button" disabled={!hasRange} onClick={() => onApply(start, end)}
            className="rounded-md bg-primary px-5 py-2 text-[12px] font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            Use this part
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function TranscriptModal({ title, text, fontFamily, onClose }) {
  return (
    <Modal wide onClose={onClose} label="Transcription">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <p className="text-[13.5px] font-bold text-navy-800">{title}</p>
        <CloseButton onClose={onClose} />
      </div>
      <div className="flex-1 overflow-y-auto whitespace-pre-wrap px-6 py-5 text-[16px] leading-[1.9] text-navy-800" style={fontFamily ? { fontFamily } : undefined}>
        {text || 'No passage text is available for this dictation.'}
      </div>
    </Modal>
  );
}

// Interface choice; clicking one opens its exam straight away.
export function InterfacePicker({ interfaces, classic, classicDisabled, onSelect }) {
  const items = [classic, ...interfaces];
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <p className="mb-3 flex items-center gap-2 rounded border border-primary-100 bg-primary-50 px-3 py-2 text-[11.5px] font-medium text-primary-700">
        <MousePointerClickIcon className="h-3.5 w-3.5" aria-hidden="true" /> Click any interface below to open its exam immediately.
      </p>
      <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
        <LayersIcon className="h-3.5 w-3.5" aria-hidden="true" /> Choose transcription interface
      </p>
      <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const disabled = item.id === classic.id && classicDisabled;
          return (
            <li key={item.id}>
              <button type="button" disabled={disabled} onClick={() => onSelect(item.id)}
                title={disabled ? 'The classic screen always uses the full passage' : undefined}
                className="relative flex h-full w-full items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 text-left transition-colors duration-150 hover:border-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded text-white" style={{ backgroundColor: item.bg }}>
                  <KeyboardIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold leading-snug text-navy-800">{item.name}</span>
                  <span className="block text-[10.5px] leading-snug text-slate-500">{disabled ? 'Full length only' : item.meta}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Common interface setup. Mistake counting is not configurable here: every
// attempt is graded with the exam's result pattern set by the institute.
export function CommonConfigModal({ options, defaultMinutes, onClose, onContinue }) {
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [backspace, setBackspace] = useState('Enabled');
  const field = 'w-full rounded-md border border-slate-300 px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-primary';
  return (
    <Modal onClose={onClose} label="Configure your transcription session">
      <div className="p-6">
        <h3 className="text-center font-display text-[17px] font-bold text-navy-800">Configure Your Transcription Session</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Backspace Status</span>
            <select value={backspace} onChange={(e) => setBackspace(e.target.value)} className={field}>
              <option>Enabled</option>
              <option>Disabled</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Transcription Time</span>
            <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={field}>
              {options.map((m) => <option key={m} value={m}>{m} Minutes</option>)}
            </select>
          </label>
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-primary-50 p-3 text-[11.5px] text-primary-700">
          <CheckCircle2Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Mistakes are counted with this exam&apos;s result pattern, set by your institute.
        </p>
        <button type="button" onClick={() => onContinue({ minutes, backspace })}
          className="mt-5 w-full rounded-md bg-primary py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-700">
          Save and Continue
        </button>
        <button type="button" onClick={onClose} className="mt-2 w-full text-center text-[11.5px] text-slate-400 transition-colors duration-150 hover:text-slate-600">Cancel</button>
      </div>
    </Modal>
  );
}
