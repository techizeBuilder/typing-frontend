// Exam-style transcription screens for the steno practice flow (new design).
// They only render: StenoTestEngine owns the typed text, timer and grading and
// passes them in, so every interface is scored by the same engine code.
import { createContext, useContext, useEffect, useState } from 'react';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  ClockIcon,
  FileTextIcon,
  GavelIcon,
  InfoIcon,
  LandmarkIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  ScaleIcon,
  ShieldIcon,
  UserCircle2Icon,
  XIcon,
} from 'lucide-react';

const instructionIcons = [CheckCircle2Icon, CheckCircle2Icon, RotateCcwIcon, ArrowRightIcon, ClockIcon, ClipboardCheckIcon];
const instructionTones = ['text-emerald-600', 'text-emerald-600', 'text-amber-600', 'text-primary', 'text-slate-500', 'text-danger'];

// The engine's textarea ref, kept out of the render props (refs can't be read during render).
const InputRefContext = createContext(null);

const pad = (n) => String(n).padStart(2, '0');
const clock = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

// Full screen for the whole exam (instructions + typing), like the real test.
function useExamFullscreen() {
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);
}

function InstructionsList({ instructions, tone = 'bg-slate-50' }) {
  return (
    <ul className="space-y-2.5">
      {instructions.map((ins, i) => {
        const Icon = instructionIcons[i] || InfoIcon;
        return (
          <li key={i} className={`flex items-start gap-2.5 rounded-lg ${tone} px-3 py-2.5 text-[12.5px] leading-relaxed text-slate-700`}>
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${instructionTones[i] || 'text-slate-500'}`} aria-hidden="true" />
            {ins}
          </li>
        );
      })}
    </ul>
  );
}

function ExitButton({ onExit, className = 'text-slate-500 hover:text-slate-700' }) {
  return (
    <button type="button" onClick={onExit} className={`flex items-center gap-1.5 text-[12.5px] font-medium transition-colors duration-150 ${className}`}>
      <XIcon className="h-4 w-4" aria-hidden="true" /> Exit
    </button>
  );
}

function CandidateCard({ ctx, accent = 'text-danger', border = 'border-danger/20' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-card">
      <p className={`rounded-lg border py-2 text-[15px] font-bold text-navy-800 ${border}`}>
        Time Left: <span className={accent}>{clock(ctx.timeLeft)}</span>
      </p>
      <span className="mx-auto mt-4 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
        <UserCircle2Icon className="h-9 w-9" aria-hidden="true" />
      </span>
      <dl className="mt-3 space-y-1 text-left text-[12px]">
        {[['Name', ctx.candidate.name], ['Roll No', ctx.candidate.rollNo], ['Language', ctx.language], ['Exam', ctx.iface.examTitle || ctx.examName]]
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex gap-1.5">
              <dt className="shrink-0 font-semibold text-navy-800">{k}:</dt>
              <dd className="min-w-0 break-words text-slate-600">{v}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

function Transcript({ ctx, className, placeholder = 'Start typing...' }) {
  const inputRef = useContext(InputRefContext);
  return (
    <textarea
      ref={inputRef}
      value={ctx.typed}
      onChange={ctx.onType}
      onKeyDown={ctx.onKeyDown}
      placeholder={placeholder}
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
      autoFocus
      disabled={ctx.disabled}
      aria-label="Transcription"
      style={ctx.inputStyle}
      className={`w-full rounded-xl border border-slate-200 bg-white p-4 leading-relaxed text-navy-800 shadow-card outline-none disabled:bg-slate-50 ${className}`} />
  );
}

const wordCount = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/* ---------- SSC / Court / DSSSB instructions ---------- */

function GenericInstructions({ ctx, icon: Icon, badgeBg, btnBg, onStart }) {
  const { iface } = ctx;
  const [duration, setDuration] = useState(iface.durationOptions ? null : ctx.minutes);
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50">
      <div className="flex items-center justify-end px-5 py-4"><ExitButton onExit={ctx.onExit} /></div>
      <div className="mx-auto max-w-5xl px-5 pb-10">
        <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col items-center justify-center gap-3 border-b border-slate-100 p-8 text-center lg:border-b-0 lg:border-r">
            <span className={`grid h-24 w-24 place-items-center rounded-full ${badgeBg}`}>
              <Icon className="h-12 w-12" aria-hidden="true" />
            </span>
            <h3 className="font-display text-[22px] font-extrabold leading-snug text-navy-800">{iface.skillTestTitle}</h3>
            <p className="text-[12px] text-slate-500">{iface.orgName}</p>
            <p className="text-[13.5px] font-medium text-slate-500">Skill Test Language - {ctx.language}</p>
            {iface.durationOptions ?
              <div className="w-full">
                <p className="mb-2 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-navy-800">
                  <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" /> Select Test Duration
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {iface.durationOptions.map((d) => (
                    <button key={d} type="button" onClick={() => setDuration(d)} aria-pressed={duration === d}
                      className={`rounded-md border px-3.5 py-1.5 text-[12px] font-semibold transition-colors duration-150 ${
                        duration === d ? 'border-primary bg-primary text-white' : 'border-slate-300 text-slate-600 hover:border-primary'}`}>
                      {d} min
                    </button>
                  ))}
                </div>
                {duration === null && <p className="mt-2 text-[11px] italic text-slate-400">Please select a duration to continue.</p>}
              </div> :
              <p className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-[13px] font-semibold text-slate-600">
                <ClockIcon className="h-4 w-4" aria-hidden="true" /> Test Duration: {ctx.minutes} Minutes
              </p>
            }
            <button type="button" disabled={duration === null} onClick={() => onStart(duration)}
              className={`mt-3 flex items-center gap-2.5 rounded-lg px-10 py-4 text-[16px] font-bold text-white shadow-lg transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-slate-300 ${btnBg}`}>
              <PlayIcon className="h-5 w-5 fill-current" aria-hidden="true" /> Start Test
            </button>
          </div>
          <div className="p-6">
            <p className="mb-3 flex items-center gap-1.5 font-display text-[14px] font-bold text-navy-800">
              <FileTextIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Exam Instructions
            </p>
            <InstructionsList instructions={iface.instructions} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericTyping({ ctx, icon: Icon, iconBg, inputLabel }) {
  const meta = [['Exam Date', ctx.dateStr], ['Exam Centre', ctx.centre]].filter(([, v]) => v);
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50 p-5">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-card">
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${iconBg}`}><Icon className="h-6 w-6" aria-hidden="true" /></span>
            <div>
              <p className="font-display text-[15px] font-bold text-navy-800">{ctx.iface.orgName}</p>
              <p className="text-[11.5px] text-slate-500">{ctx.iface.examTitle}</p>
            </div>
          </div>
          <div className="text-right text-[11.5px] leading-relaxed text-slate-600">
            {meta.map(([k, v]) => <p key={k}><span className="font-semibold text-navy-800">{k}:</span> {v}</p>)}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div>
            {inputLabel && <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{inputLabel}</p>}
            <Transcript ctx={ctx} className="h-[380px] resize-none focus:border-primary" />
            <div className="mt-4 flex items-center justify-between">
              <button type="button" onClick={ctx.onSubmit} className="rounded-md bg-navy-900 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-navy-800">Submit</button>
              <span className="text-[11px] text-slate-400">Words: {wordCount(ctx.typed)}</span>
            </div>
          </div>
          <CandidateCard ctx={ctx} />
        </div>
      </div>
    </div>
  );
}

/* ---------- HSSC ---------- */

function HsscInstructions({ ctx, onStart }) {
  const { iface } = ctx;
  const rows = [['Name', ctx.candidate.name], ['Roll No', ctx.candidate.rollNo], ['Language', ctx.language], ['Post', 'Stenographer']];
  const exam = [['Date', ctx.dateStr], ['Duration', `${ctx.minutes} Min`], ['Centre', ctx.centre || '—']];
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-navy-900">
      <div className="bg-amber-400 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-navy-900">
        Haryana Staff Selection Commission · Exam Practice Interface
      </div>
      <div className="border-b-4 border-amber-400 bg-navy-900 px-5 py-4">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white"><LandmarkIcon className="h-6 w-6 text-navy-900" aria-hidden="true" /></span>
            <div>
              <p className="font-display text-[16px] font-bold text-white">{iface.orgName}</p>
              <p className="text-[10.5px] font-semibold text-amber-300">{iface.skillTestTitle} | {ctx.language} Transcription</p>
            </div>
          </div>
          <ExitButton onExit={ctx.onExit} className="text-slate-300 hover:text-white" />
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="overflow-hidden rounded-lg border border-navy-700 bg-navy-800">
          <div className="flex items-center justify-between border-b border-navy-700 bg-navy-700 px-5 py-2.5">
            <p className="text-[13px] font-bold text-white">Admit Card &amp; Examination Instructions</p>
            <span className="rounded bg-danger px-2 py-[2px] text-[9.5px] font-bold uppercase tracking-wide text-white">Confidential</span>
          </div>
          <div className="grid gap-6 p-6 lg:grid-cols-[220px_1fr]">
            <div>
              <span className="grid h-24 w-24 place-items-center rounded-md border border-navy-600 bg-navy-700 text-slate-400">
                <UserCircle2Icon className="h-14 w-14" aria-hidden="true" />
              </span>
              <dl className="mt-3 space-y-1.5 text-[11.5px]">
                {rows.filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt className="uppercase tracking-wide text-slate-400">{k}</dt>
                    <dd className="text-right font-semibold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <dl className="mt-4 space-y-1.5 border-t border-navy-700 pt-3 text-[11.5px]">
                {exam.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt className="text-slate-400">{k}</dt>
                    <dd className="text-right font-medium text-slate-200">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-hidden="true" /> General Instructions for Candidates
              </p>
              <ol className="space-y-2.5">
                {iface.instructions.map((ins, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-slate-200">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-amber-400 text-[9px] font-bold text-navy-900">{i + 1}</span>
                    {ins}
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t border-navy-700 pt-3 text-[11px] italic leading-relaxed text-slate-400">
                By proceeding, I confirm that I have read and understood all the instructions above.
              </p>
              <button type="button" onClick={() => onStart(ctx.minutes)}
                className="mt-4 flex items-center gap-2.5 rounded-lg bg-danger px-8 py-3.5 text-[15px] font-bold text-white shadow-lg transition-colors duration-150 hover:bg-[#bb2d3b]">
                <PlayIcon className="h-5 w-5 fill-current" aria-hidden="true" /> Start Test
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HsscTyping({ ctx }) {
  const { iface } = ctx;
  const details = [
    ['Dictation Title', ctx.dictationTitle],
    ['Exam Date', ctx.dateStr],
    ['Duration', `${ctx.minutes} Minutes`],
    ['Exam Centre', ctx.centre],
  ].filter(([, v]) => v);
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-[14px] font-bold text-navy-800">{iface.orgName}</p>
            <p className="text-[10.5px] uppercase tracking-wide text-slate-500">HSSC Exam Practice</p>
          </div>
          <div className="text-center">
            <p className="font-display text-[13.5px] font-bold text-navy-800">{iface.skillTestTitle}</p>
            <p className="text-[10.5px] text-slate-500">Transcription Paper | {ctx.language} | {ctx.minutes} Minutes</p>
          </div>
          <div className="text-right text-[10.5px] leading-relaxed text-slate-500">
            <p><span className="font-semibold text-navy-800">Date:</span> {ctx.dateStr}</p>
            {ctx.centre && <p><span className="font-semibold text-navy-800">Centre:</span> {ctx.centre}</p>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 bg-navy-900 py-1.5 text-[11.5px] font-semibold text-white">
        Time Remaining <span className="font-display text-[13px] text-amber-300">{clock(ctx.timeLeft)}</span>
        <span className="flex items-center gap-1 text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" /> Running</span>
      </div>
      <div className="border-b border-slate-200 bg-slate-100 px-5 py-1.5 text-[11px] text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <span>Dictation: {ctx.dictationTitle}</span>
          <span>• Duration: {ctx.minutes} Minutes</span>
          {ctx.candidate.name && <span>• Candidate: {ctx.candidate.name}</span>}
          <span>• Mode: HSSC Skill Test</span>
        </div>
      </div>
      <div className="mx-auto max-w-6xl p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-navy-800">
                <FileTextIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Transcription Input
              </p>
              <p className="text-[10.5px] text-slate-400">Type the dictated passage below</p>
            </div>
            <Transcript ctx={ctx} className="h-[320px] resize-none rounded-lg shadow-none focus:border-primary" placeholder="Begin typing the dictated passage here..." />
            <div className="mt-3 flex items-center justify-between">
              <button type="button" onClick={ctx.onSubmit} className="rounded-md bg-navy-900 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-navy-800">Submit Answer</button>
              <span className="text-[11px] text-slate-400">Words: {wordCount(ctx.typed)}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
              <p className="bg-navy-800 px-3 py-2 text-[10.5px] font-bold uppercase tracking-wide text-white">Candidate Details</p>
              <div className="flex gap-3 p-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-400"><UserCircle2Icon className="h-7 w-7" aria-hidden="true" /></span>
                <dl className="min-w-0 space-y-0.5 text-[11px]">
                  {[['Full Name', ctx.candidate.name], ['Roll Number', ctx.candidate.rollNo], ['Language', ctx.language], ['Post Applied', 'HSSC Stenographer']]
                    .filter(([, v]) => v)
                    .map(([k, v]) => <div key={k}><dt className="inline text-slate-400">{k}: </dt><dd className="inline break-words font-semibold text-navy-800">{v}</dd></div>)}
                </dl>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
              <p className="bg-navy-800 px-3 py-2 text-[10.5px] font-bold uppercase tracking-wide text-white">Examination Details</p>
              <dl className="space-y-1.5 p-3 text-[11px]">
                {details.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[9.5px] uppercase tracking-wide text-slate-400">{k}</dt>
                    <dd className="font-medium text-navy-800">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-700"><AlertTriangleIcon className="h-3.5 w-3.5" aria-hidden="true" /> Important Notices</p>
              <ul className="space-y-1 text-[10.5px] text-amber-700">
                <li>• Do not refresh the page</li>
                <li>• Submit before the timer ends</li>
                <li>• Use only the keyboard for typing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- CAPF ---------- */

function CapfInstructions({ ctx, onStart }) {
  const { iface } = ctx;
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-emerald-50/60">
      <div className="flex items-center justify-end px-5 py-4"><ExitButton onExit={ctx.onExit} /></div>
      <div className="mx-auto grid max-w-5xl gap-8 px-5 pb-10 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldIcon className="h-12 w-12 text-emerald-700" aria-hidden="true" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Central Armed Police Forces</p>
          <h3 className="font-display text-[19px] font-bold text-navy-800"><mark className="rounded bg-emerald-100 px-1">{iface.skillTestTitle}</mark></h3>
          <p className="text-[12px] text-slate-500">Skill Test Language - {ctx.language}</p>
          <p className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11.5px] font-medium text-slate-600 shadow-sm">
            <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" /> Test Duration: {ctx.minutes} Minutes
          </p>
          <button type="button" onClick={() => onStart(ctx.minutes)}
            className="mt-2 flex items-center gap-2.5 rounded-lg bg-emerald-700 px-8 py-3.5 text-[15px] font-bold text-white shadow-lg transition-colors duration-150 hover:bg-emerald-800">
            <PlayIcon className="h-5 w-5 fill-current" aria-hidden="true" /> Start Test
          </button>
        </div>
        <div>
          <p className="mb-3 flex items-center gap-1.5 font-display text-[14px] font-bold text-navy-800">
            <FileTextIcon className="h-4 w-4 text-emerald-700" aria-hidden="true" /> Exam Instructions
          </p>
          <InstructionsList instructions={iface.instructions} tone="bg-white/70 shadow-sm" />
        </div>
      </div>
    </div>
  );
}

function CapfTyping({ ctx }) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-emerald-50/60 p-5">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><ShieldIcon className="h-6 w-6" aria-hidden="true" /></span>
            <div>
              <p className="font-display text-[15px] font-bold text-navy-800">{ctx.iface.orgName}</p>
              <p className="text-[11.5px] text-slate-500">{ctx.iface.examTitle}</p>
            </div>
          </div>
          <div className="text-right text-[11.5px] leading-relaxed text-slate-600">
            <p><span className="font-semibold text-navy-800">Exam Date:</span> {ctx.dateStr}</p>
            <p><span className="font-semibold text-navy-800">Language:</span> {ctx.language}</p>
          </div>
        </div>
        {!ctx.started && <p className="mb-3 text-[12px] font-medium text-emerald-800">The timer starts when you begin typing.</p>}
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div>
            <Transcript ctx={ctx} className="h-[380px] resize-none focus:border-emerald-600" />
            <button type="button" onClick={ctx.onSubmit} className="mt-4 rounded-md bg-emerald-700 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-emerald-800">Submit</button>
          </div>
          <CandidateCard ctx={ctx} accent="text-success" border="border-success/30" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Common ---------- */

function CommonTyping({ ctx }) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-indigo-50/40 p-6">
      <div className="fixed right-6 top-6 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-navy-800 shadow-card">
        Time Left: <span className="text-primary">{clock(ctx.timeLeft)}</span>
      </div>
      <div className="mx-auto max-w-4xl pt-4">
        {ctx.centre && <div className="mb-4 rounded-lg bg-sky-100 py-2.5 text-center font-display text-[13px] font-semibold italic text-navy-800">{ctx.centre}</div>}
        <div className="mb-3 flex flex-wrap items-center gap-3 text-[12px] text-slate-600">
          <span className="font-semibold text-navy-800">{ctx.dictationTitle}</span>
          {ctx.backspaceDisabled && <span className="rounded bg-amber-50 px-2 py-[2px] font-medium text-amber-700">Backspace disabled</span>}
          <span className="ml-auto inline-flex items-center gap-1.5">
            Font size
            <button type="button" onClick={() => ctx.onFontSize(-2)} aria-label="Decrease font size" className="rounded border border-slate-300 bg-white px-2 py-0.5 font-bold hover:bg-slate-50">A-</button>
            <strong className="w-6 text-center">{ctx.fontSize}</strong>
            <button type="button" onClick={() => ctx.onFontSize(2)} aria-label="Increase font size" className="rounded border border-slate-300 bg-white px-2 py-0.5 font-bold hover:bg-slate-50">A+</button>
          </span>
        </div>
        <Transcript ctx={ctx} className="h-[520px] resize-y p-5 focus:border-primary" />
        {ctx.paused && <p className="mt-2 text-center text-[12.5px] font-medium text-amber-700">Test paused. The timer is stopped.</p>}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" onClick={ctx.onSubmit} className="rounded-md bg-navy-900 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-navy-800">Submit</button>
          <button type="button" onClick={ctx.onTogglePause}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-[13px] font-semibold text-navy-800 transition-colors duration-150 hover:bg-slate-50">
            {ctx.paused ? <PlayIcon className="h-4 w-4" aria-hidden="true" /> : <PauseIcon className="h-4 w-4" aria-hidden="true" />}
            {ctx.paused ? 'Resume Test' : 'Pause Test'}
          </button>
          <span className="text-[11px] text-slate-400">Words: {wordCount(ctx.typed)}</span>
        </div>
      </div>
    </div>
  );
}

// Renders the instructions screen, then the typing screen, for one interface.
// `stage` and `onStart` come from the engine so it can start its own timer.
export default function PracticeExam({ textareaRef, ...props }) {
  return (
    <InputRefContext.Provider value={textareaRef}>
      <PracticeScreens {...props} />
    </InputRefContext.Provider>
  );
}

function PracticeScreens({ stage, onStart, ...ctx }) {
  useExamFullscreen();
  const v = ctx.iface.variant;
  const court = v === 'court';
  if (stage === 'instructions') {
    if (v === 'hssc') return <HsscInstructions ctx={ctx} onStart={onStart} />;
    if (v === 'capf') return <CapfInstructions ctx={ctx} onStart={onStart} />;
    if (v === 'dsssb') return <GenericInstructions ctx={ctx} icon={GavelIcon} badgeBg="bg-rose-50 text-rose-600" btnBg="bg-danger hover:bg-[#bb2d3b]" onStart={onStart} />;
    return (
      <GenericInstructions ctx={ctx} icon={court ? ScaleIcon : LandmarkIcon}
        badgeBg={court ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}
        btnBg={court ? 'bg-violet-600 hover:bg-violet-700' : 'bg-danger hover:bg-[#bb2d3b]'}
        onStart={onStart} />
    );
  }
  if (v === 'hssc') return <HsscTyping ctx={ctx} />;
  if (v === 'capf') return <CapfTyping ctx={ctx} />;
  if (v === 'common') return <CommonTyping ctx={ctx} />;
  if (v === 'dsssb') return <GenericTyping ctx={ctx} icon={GavelIcon} iconBg="bg-rose-50 text-rose-600" inputLabel="Type your transcription below" />;
  return <GenericTyping ctx={ctx} icon={court ? ScaleIcon : LandmarkIcon} iconBg={court ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'} />;
}
