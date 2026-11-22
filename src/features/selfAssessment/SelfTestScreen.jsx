// Step 3 of Self Assessment. Display only: the Actual Typing box uses the engine's own
// input handlers, timer and submit (grading untouched). Mock Typing is a separate
// warm-up box that is never graded, and the engine's clock only starts on typing there.
import { useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, InfoIcon, MaximizeIcon, MinusIcon, PlusIcon, SettingsIcon, UserCircle2Icon, Volume2Icon, VolumeXIcon, XIcon } from 'lucide-react';
import { InstructionsBody } from './ExamFlow';

const MOCK_PASSAGE = 'The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.';
const MOCK_SECONDS = 120;
const FONT_FAMILIES = ['Arial', 'Times New Roman', 'Courier New'];
const BACKSPACE_OPTIONS = ['No Backspace', 'Current Word Backspace', 'Two Word Backspace', 'Full Backspace'];

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function FontStepper({ label, value, onChange }) {
  return (
    <div className="mb-3.5 flex items-center justify-between">
      <span className="text-[12.5px] text-navy-800">{label}:</span>
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={() => onChange(Math.max(10, value - 1))} aria-label={`Decrease ${label}`} className="grid h-7 w-7 place-items-center rounded-full bg-primary text-white hover:bg-primary-700"><MinusIcon className="h-3.5 w-3.5" aria-hidden="true" /></button>
        <span className="w-[38px] text-center text-[12.5px] font-semibold text-navy-800">{value}px</span>
        <button type="button" onClick={() => onChange(Math.min(36, value + 1))} aria-label={`Increase ${label}`} className="grid h-7 w-7 place-items-center rounded-full bg-primary text-white hover:bg-primary-700"><PlusIcon className="h-3.5 w-3.5" aria-hidden="true" /></button>
      </div>
    </div>
  );
}

export default function SelfTestScreen({
  title, language, keyboardLabel, candidate, photo, words, minutes, timeLeft, passage, hindiBanner, isHindi, started,
  passageFontSize, typingFontSize, onPassageFontSize, onTypingFontSize, fontFamily, onFontFamily,
  backspace, onBackspace, isFullscreen, onFullScreen, onCancel, onSubmit, textareaProps,
}) {
  const [tab, setTab] = useState('actual');
  const [soundOn, setSoundOn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [mockTyped, setMockTyped] = useState('');
  const [mockLeft, setMockLeft] = useState(MOCK_SECONDS);
  const audioRef = useRef(null);

  useEffect(() => {
    if (tab !== 'mock' || mockTyped === '' || mockLeft <= 0) return undefined;
    const timer = setInterval(() => setMockLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [tab, mockTyped === '', mockLeft <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Short key click while Sound is on.
  const click = () => {
    if (!soundOn) return;
    try {
      const ctx = audioRef.current || (audioRef.current = new (window.AudioContext || window.webkitAudioContext)());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1400;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch { /* no audio on this device */ }
  };
  const actualKeyDown = (e) => { click(); textareaProps.onKeyDown?.(e); };

  const topBtn = 'flex items-center gap-1.5 rounded px-3.5 py-2 text-[13px] font-bold text-white';
  const remaining = tab === 'mock' ? mockLeft : timeLeft;

  return (
    <div className="nd fixed inset-0 z-[100] flex flex-col bg-white" data-testid="self-test-screen">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#2B2B2B] px-5 py-2.5">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onCancel} className="flex items-center gap-1.5 rounded bg-white/15 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-white/25">
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" /> Back
          </button>
          <p className="text-[16px] font-semibold text-white">{title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onTypingFontSize(Math.max(10, typingFontSize - 1))} className={`${topBtn} bg-white/15 hover:bg-white/25`}>A-</button>
          <button type="button" onClick={() => onTypingFontSize(Math.min(36, typingFontSize + 1))} className={`${topBtn} bg-white/15 hover:bg-white/25`}>A+</button>
          <button type="button" onClick={() => setSoundOn((v) => !v)} aria-pressed={soundOn} className={`${topBtn} ${soundOn ? 'bg-success' : 'bg-danger'}`}>
            {soundOn ? <Volume2Icon className="h-4 w-4" aria-hidden="true" /> : <VolumeXIcon className="h-4 w-4" aria-hidden="true" />} Sound: {soundOn ? 'ON' : 'OFF'}
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} className={`${topBtn} bg-teal-600 hover:bg-teal-700`}><SettingsIcon className="h-4 w-4" aria-hidden="true" /> Settings</button>
          <button type="button" onClick={onFullScreen} className={`${topBtn} bg-teal-600 hover:bg-teal-700`}><MaximizeIcon className="h-4 w-4" aria-hidden="true" /> {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</button>
          <button type="button" onClick={() => setInstructionsOpen(true)} className={`${topBtn} bg-slate-700 hover:bg-slate-800`}><InfoIcon className="h-4 w-4" aria-hidden="true" /> Instructions</button>
        </div>
      </div>

      <div className="bg-[#1D6FC4] px-5 py-1.5 text-[14px] font-bold text-white">Group A</div>

      <div className="grid bg-white lg:grid-cols-[3fr_1fr]">
        <div className="flex items-center justify-between gap-2 px-5 py-2 lg:border-r lg:border-slate-200">
          <div className="flex gap-2.5" role="tablist">
            {[['mock', 'Mock Typing'], ['actual', 'Actual Typing']].map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`rounded px-5 py-2 text-[13.5px] font-semibold transition-colors duration-150 ${tab === id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-[15px] font-semibold text-navy-800">Time Left: <span data-testid="time-left" className="font-extrabold text-danger">{mmss(remaining)}</span></p>
        </div>
        <div className="flex items-center gap-3.5 px-5 py-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-300 bg-white">
            {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <UserCircle2Icon className="h-7 w-7 text-slate-400" aria-hidden="true" />}
          </span>
          <span className="truncate text-[14px] font-semibold text-navy-800">{candidate}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[3fr_1fr]">
        <div className="bg-[#1D6FC4] px-5 py-1.5 text-[13.5px] font-semibold text-white">Keyboard Layout: {keyboardLabel}</div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[3fr_1fr]">
        <div className="flex min-h-0 flex-col gap-3 px-5 py-3 lg:border-r lg:border-slate-200">
          {tab === 'actual' && hindiBanner}
          {tab === 'mock' ?
            <>
              <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-300 p-3 leading-relaxed text-navy-800" style={{ fontSize: passageFontSize }}>{MOCK_PASSAGE}</div>
              <textarea
                aria-label="Mock typing box"
                value={mockTyped}
                onChange={(e) => { click(); setMockTyped(e.target.value); }}
                disabled={mockLeft === 0}
                placeholder="Warm up here. This box is not graded."
                spellCheck={false}
                style={{ fontSize: typingFontSize }}
                className="min-h-0 flex-1 resize-none rounded-md border border-slate-300 p-3 leading-relaxed outline-none focus:border-primary" />
            </> :
            <>
              <div data-testid="self-passage" className="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-300 p-3 leading-relaxed" style={{ fontSize: passageFontSize, fontFamily: isHindi ? undefined : fontFamily }}>{passage}</div>
              <textarea
                {...textareaProps}
                aria-label="Typing box"
                onKeyDown={actualKeyDown}
                placeholder="Start typing here..."
                style={{ ...textareaProps.style, fontSize: typingFontSize, ...(isHindi ? {} : { fontFamily }) }}
                className="min-h-0 flex-1 resize-none rounded-md border border-slate-300 p-3 leading-relaxed outline-none focus:border-primary" />
            </>
          }
          <div className="flex shrink-0 justify-start border-t border-slate-200 pt-3">
            <button type="button" onClick={onCancel} className="rounded-md bg-danger px-6 py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-red-700">Cancel</button>
          </div>
        </div>
        <div className="flex flex-col px-5 py-3">
          {/* Right padding keeps Submit clear of the app's floating full-screen button. */}
          <div className="mt-auto flex justify-end border-t border-slate-200 pr-14 pt-3">
            <button type="button" onClick={onSubmit} className="rounded-md bg-teal-600 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-teal-700">Submit</button>
          </div>
        </div>
      </div>

      {settingsOpen &&
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-navy-900/50 p-4" role="dialog" aria-modal="true" aria-label="Test settings">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[16px] font-bold text-navy-800">Test Settings</h3>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"><XIcon className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </div>
            <FontStepper label="Passage Font Size" value={passageFontSize} onChange={onPassageFontSize} />
            <FontStepper label="Typing Font Size" value={typingFontSize} onChange={onTypingFontSize} />
            {!isHindi &&
              <label className="mb-3.5 block">
                <span className="mb-1.5 block text-[12px] font-semibold text-navy-800">Font Family:</span>
                <select value={fontFamily} onChange={(e) => onFontFamily(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-[12.5px] text-slate-600 outline-none focus:border-primary">
                  {FONT_FAMILIES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </label>
            }
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-navy-800">Backspace Behavior:</span>
              <select value={backspace} disabled={started} onChange={(e) => onBackspace(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-[12.5px] text-slate-600 outline-none focus:border-primary disabled:bg-slate-100">
                {BACKSPACE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
              {started && <span className="mt-1 block text-[11px] text-slate-500">Locked once typing has started.</span>}
            </label>
          </div>
        </div>
      }

      {instructionsOpen &&
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-navy-900/50 p-4" role="dialog" aria-modal="true" aria-label="Instructions">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#DCEEFB] px-5 py-3">
              <h3 className="text-[14px] font-bold text-navy-800">Important Instructions</h3>
              <button type="button" onClick={() => setInstructionsOpen(false)} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full text-slate-500 hover:bg-white/60"><XIcon className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </div>
            <div className="overflow-y-auto px-6 py-5"><InstructionsBody language={language} words={words} minutes={minutes} /></div>
          </div>
        </div>
      }
    </div>
  );
}
