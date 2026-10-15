import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircle2Icon, KeyboardIcon, TargetIcon, RotateCcwIcon, SkipForwardIcon } from 'lucide-react';
import { Panel } from '../../ui/Pill';

const REPS_TARGET = 3;
const MAX_WORDS = 40;

// Drill for the words a student got wrong in a result (opened from the result
// sheet's Detailed Analysis). Nothing is saved; matching is exact because the
// exam grading counts capitalisation and punctuation.
export default function PracticeWords() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const words = (Array.isArray(state?.words) ? state.words : []).slice(0, MAX_WORDS);
  const fontStyle = state?.passageFontFamily ? { fontFamily: state.passageFontFamily } : undefined;

  const [wordIndex, setWordIndex] = useState(0);
  const [reps, setReps] = useState(() => words.map(() => 0));
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle | correct | wrong

  if (words.length === 0) {
    return (
      <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
        <Panel>
          <p className="py-8 text-center text-[13px] text-slate-500">
            No practice words yet. Open a typing result and use <strong>Practise These Words</strong> in its Detailed Analysis.{' '}
            <Link to="/my-tests" className="font-semibold text-primary hover:underline">Go to results</Link>
          </p>
        </Panel>
      </div>
    );
  }

  const currentWord = words[wordIndex];
  const allDone = reps.every((r) => r >= REPS_TARGET);

  const goToWord = (i) => {
    setWordIndex(i);
    setInput('');
    setStatus('idle');
  };

  const nextWord = (fromReps = reps) => {
    const after = words.findIndex((_, i) => i > wordIndex && fromReps[i] < REPS_TARGET);
    const any = words.findIndex((_, i) => fromReps[i] < REPS_TARGET);
    const next = after !== -1 ? after : any;
    if (next !== -1) goToWord(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (input.trim() === currentWord) {
      const updated = reps.map((r, i) => (i === wordIndex ? Math.min(r + 1, REPS_TARGET) : r));
      setReps(updated);
      setInput('');
      setStatus('correct');
      if (updated[wordIndex] >= REPS_TARGET) setTimeout(() => nextWord(updated), 350);
      else setTimeout(() => setStatus('idle'), 350);
    } else {
      setStatus('wrong');
    }
  };

  const doneCount = reps.filter((r) => r >= REPS_TARGET).length;

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
            <KeyboardIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-[22px] font-bold leading-tight text-navy-800">Practise Your Mistake Words</h2>
            <p className="text-[12.5px] text-slate-500">
              Type each word exactly (capitals and punctuation included) {REPS_TARGET} times to build muscle memory.
              {state?.examName ? ` From: ${state.examName}${state.mode ? ` · ${state.mode}` : ''}.` : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-navy-800 transition-colors duration-150 hover:bg-slate-50">
          <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden="true" /> Back to Result
        </button>
      </div>

      <Panel title={`Words to Practise (${doneCount}/${words.length} done)`}>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-6">
          {words.map((w, i) => {
            const done = reps[i] >= REPS_TARGET;
            const active = i === wordIndex;
            return (
              <li key={`${w}-${i}`}>
                <button
                  type="button"
                  onClick={() => goToWord(i)}
                  aria-pressed={active}
                  className={`w-full rounded-lg border p-2.5 text-left transition-colors duration-150 ${
                    active ? 'border-primary bg-primary-50' : done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:border-primary'}`}>
                  <span className="flex items-center gap-1.5">
                    {done && <CheckCircle2Icon className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />}
                    <span className="truncate text-[13px] font-semibold text-navy-800" style={fontStyle}>{w}</span>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <span className={`block h-full rounded-full ${done ? 'bg-success' : 'bg-primary'}`} style={{ width: `${(reps[i] / REPS_TARGET) * 100}%` }} />
                  </span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">{reps[i]} / {REPS_TARGET}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="mt-5">
        {allDone ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <CheckCircle2Icon className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
            <h3 className="mt-2 font-display text-[18px] font-bold text-navy-800">Great job! You&apos;ve completed all practice words.</h3>
            <p className="mt-1 text-[12.5px] text-slate-600">You typed every word correctly {REPS_TARGET} times. Keep this consistency in your next test.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={() => { setReps(words.map(() => 0)); goToWord(0); }}
                className="inline-flex items-center gap-2 rounded-md border border-primary bg-white px-4 py-2.5 text-[12.5px] font-semibold text-primary hover:bg-primary-50">
                <RotateCcwIcon className="h-4 w-4" aria-hidden="true" /> Practise Again
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[12.5px] font-semibold text-white hover:bg-primary-700">
                <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Back to Result
              </button>
            </div>
          </div>
        ) : (
          <Panel>
            <div className="mx-auto max-w-md text-center">
              <p className="flex items-center justify-center gap-1.5 text-[11.5px] font-medium text-slate-500">
                <TargetIcon className="h-3.5 w-3.5" aria-hidden="true" /> Attempt {reps[wordIndex]} / {REPS_TARGET}
              </p>
              <p className="mt-2 break-words font-display text-[38px] font-extrabold tracking-wide text-navy-800" style={fontStyle}>{currentWord}</p>
              <form onSubmit={handleSubmit} className="mt-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); if (status === 'wrong') setStatus('idle'); }}
                  autoFocus
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  placeholder="Type the word above and press Enter"
                  aria-label="Type the word above"
                  style={fontStyle}
                  className={`w-full rounded-lg border-2 px-4 py-3 text-center text-[16px] outline-none transition-colors duration-150 ${
                    status === 'wrong' ? 'border-danger bg-rose-50' : status === 'correct' ? 'border-success bg-emerald-50' : 'border-slate-300 focus:border-primary'}`} />
                <p className="mt-2 h-4 text-[12px] font-medium" aria-live="polite">
                  {status === 'wrong' && <span className="text-danger">Not quite — check capitals and punctuation, then try again.</span>}
                  {status === 'correct' && <span className="text-success">Correct!</span>}
                </p>
                <div className="mt-3 flex justify-center gap-2.5">
                  <button type="submit" className="rounded-md bg-primary px-5 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700">Check</button>
                  <button
                    type="button"
                    onClick={() => nextWord()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-[12.5px] font-medium text-navy-800 hover:bg-slate-50">
                    <SkipForwardIcon className="h-3.5 w-3.5" aria-hidden="true" /> Skip
                  </button>
                </div>
              </form>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
