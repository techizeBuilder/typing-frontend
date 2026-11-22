// Self Assessment's exam-hall steps: Step 1 login cover, Step 2 instructions. They set
// the scene only; there is nothing to authenticate, the student is already signed in.
// Step 3 (the test screen) lives in SelfTestScreen.
import { useState } from 'react';
import { ChevronLeftIcon, KeyboardIcon, LockIcon, UserCircle2Icon, UserIcon } from 'lucide-react';

const candidateName = () => (localStorage.getItem('name') || localStorage.getItem('username') || 'Candidate').toUpperCase();
const INSTITUTE = 'Balaji Typing & Steno College';

function CandidatePhoto({ photo, className, iconClass }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-md border border-slate-300 bg-white ${className}`}>
      {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <UserCircle2Icon className={`text-slate-400 ${iconClass}`} aria-hidden="true" />}
    </span>
  );
}

export function ExamLoginCover({ subtitle, photo, onStartTest }) {
  const fieldCls = 'w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-[13px] text-navy-800 outline-none';
  const iconCls = 'grid h-9 w-9 shrink-0 place-items-center rounded bg-slate-200 text-slate-700';
  return (
    <div className="nd fixed inset-0 z-[100] flex flex-col bg-white" data-testid="exam-login">
      <div className="h-10 shrink-0 bg-[#1D6FC4]" />
      <div className="flex flex-wrap items-start justify-between gap-4 bg-[#3A3A3A] px-5 py-3 text-white">
        <div>
          <p className="text-[13px]">System Name :</p>
          <p className="font-display text-[22px] font-extrabold text-[#FFE100]">C001</p>
          <p className="mt-2 max-w-xl text-[11px] text-white/80">
            Kindly contact the invigilator if there are any discrepancies in the Name and Photograph
            displayed on the screen or if the photograph is not yours
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <p className="font-display text-[20px] font-extrabold text-[#FFE100]">Candidate Name : {candidateName()}</p>
            <p className="text-[12px] font-semibold text-[#FFE100]">{subtitle}</p>
          </div>
          <CandidatePhoto photo={photo} className="h-16 w-16" iconClass="h-12 w-12" />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-100">
        <div className="w-full max-w-[340px] overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg">
          <p className="border-b border-slate-300 bg-slate-200 px-4 py-2 text-[13px] font-bold text-navy-800">Login</p>
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <span className={iconCls}><UserIcon className="h-4 w-4" aria-hidden="true" /></span>
              <input type="text" readOnly aria-label="User ID" value={localStorage.getItem('username') || ''} className={fieldCls} />
              <span className={iconCls}><KeyboardIcon className="h-4 w-4" aria-hidden="true" /></span>
            </div>
            <div className="flex items-center gap-2">
              <span className={iconCls}><LockIcon className="h-4 w-4" aria-hidden="true" /></span>
              <input type="password" readOnly aria-label="Password" value="practice" className={fieldCls} />
              <span className={iconCls}><KeyboardIcon className="h-4 w-4" aria-hidden="true" /></span>
            </div>
            <button
              type="button"
              onClick={onStartTest}
              className="w-full rounded bg-gradient-to-b from-[#5BC0EB] to-[#1D8FD8] py-2.5 text-[13px] font-semibold text-white shadow transition-opacity duration-150 hover:opacity-90">
              Start Test
            </button>
          </div>
        </div>
      </div>
      <p className="shrink-0 bg-[#3A3A3A] py-1.5 text-center text-[10.5px] text-white/70">{INSTITUTE}</p>
    </div>
  );
}

const PRACTICE_WORDS = 5000;
const PRACTICE_MINUTES = 2;

const POINTS = [
  ['', 'Read the given instructions carefully to avoid disqualification, error, and time loss. After reading the instructions carefully, click on the check box to proceed.'],
  ['First Practice Test:', 'After the candidate logs in to the system, practice test will commence and will be completed in 2 mins where in candidate will check keyboard and keys operations. There after 10 mins time will be provided to candidates to get the keyboard replaced, if required.'],
  ['Second Practice Test:', 'Second practice test will automatically start for 2 min after 10 min break time as mentioned in Point No. 2. The purpose of the second practice test will be to ensure proper functioning of the keyboard replaced. This will be the last opportunity to resolve keyboard/other related issues.'],
  ['', 'Before the commencement of the actual typing test a Typing Test Declaration form will be signed by the candidate.'],
];

export function InstructionsBody({ language, words, minutes }) {
  const rows = [
    { n: 1, type: `Practice Typing test (${language}) 1`, words: PRACTICE_WORDS, timing: PRACTICE_MINUTES },
    { n: 2, type: `Practice Typing test (${language}) 2`, words: PRACTICE_WORDS, timing: PRACTICE_MINUTES },
    { n: 3, type: `Actual Typing test (${language})`, words, timing: minutes },
  ];
  return (
    <>
      <p className="mb-4 text-[15px] font-semibold text-navy-800">Instructions to candidates for Typing Exam in {language} on desktop computer.</p>
      <table className="mb-5 w-full max-w-[700px] border-collapse text-left text-[13.5px]">
        <thead>
          <tr className="bg-slate-50">
            {['Sr No', 'Passage Type', 'Word Count', 'Timing'].map((h) => <th key={h} scope="col" className="border border-slate-300 px-3.5 py-2.5 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.n}>
              <td className="border border-slate-300 px-3.5 py-2.5 text-center">{r.n}</td>
              <td className="border border-slate-300 px-3.5 py-2.5">{r.type}</td>
              <td className="border border-slate-300 px-3.5 py-2.5 text-center">{r.words}</td>
              <td className="border border-slate-300 px-3.5 py-2.5 text-center">{r.timing}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mb-2.5 text-[15px] font-semibold text-navy-800">Dear Candidates,</p>
      <ol className="list-decimal space-y-3.5 pl-5 text-[14px] leading-relaxed text-slate-700">
        {POINTS.map(([bold, text]) => (
          <li key={text}>{bold && <span className="font-bold text-navy-800">{bold} </span>}{text}</li>
        ))}
      </ol>
    </>
  );
}

export function ExamInstructionsScreen({ designation, language, words, minutes, photo, onPrevious, onReady }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="nd fixed inset-0 z-[100] flex flex-col bg-white" data-testid="exam-instructions">
      <div className="flex shrink-0 justify-center bg-[#3E5C96] pt-2">
        <span className="rounded-t-sm bg-[#28345E] px-8 py-2 font-display text-[15px] font-bold text-white">Designation: {designation}</span>
      </div>
      <div className="grid flex-1 overflow-hidden lg:grid-cols-[3fr_1fr]">
        <div className="flex min-w-0 flex-col overflow-hidden">
          <p className="border-b border-slate-200 bg-[#DCEEFB] px-4 py-2.5 text-[14px] font-bold text-navy-800">Important Instructions</p>
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <InstructionsBody language={language} words={words} minutes={minutes} />
            <label className="mt-5 flex items-start gap-2.5 text-[13px] leading-relaxed text-amber-700">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
              I have read and understood the instructions. All computer hardware allotted to me are in
              proper working condition. I declare that I am not in possession of / not wearing / not
              carrying any prohibited gadget like mobile phone, bluetooth devices etc. /any prohibited
              material with me into the Examination Hall.I agree that in case of not adhering to the
              instructions, I shall be liable to be debarred from this Test and/or to disciplinary action,
              which may include ban from future Tests / Examinations.
            </label>
          </div>
          <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-6 py-3">
            <button type="button" onClick={onPrevious} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50">
              <ChevronLeftIcon className="h-3.5 w-3.5" aria-hidden="true" /> Previous
            </button>
            <button type="button" disabled={!agreed} onClick={onReady} className="rounded-md bg-primary px-6 py-2.5 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40">
              I am ready to begin
            </button>
          </div>
        </div>
        <div className="hidden flex-col items-center gap-3 border-l border-slate-200 bg-slate-100 py-8 lg:flex">
          <CandidatePhoto photo={photo} className="h-28 w-28" iconClass="h-20 w-20" />
          <p className="font-display text-[16px] font-bold text-primary">{candidateName()}</p>
        </div>
      </div>
      <p className="shrink-0 bg-[#5B6B8C] py-1.5 text-center text-[10.5px] text-white/80">{INSTITUTE}</p>
    </div>
  );
}
