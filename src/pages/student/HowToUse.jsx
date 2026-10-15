import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircleIcon,
  UserCircle2Icon,
  LayersIcon,
  PlayCircleIcon,
  BarChart3Icon,
  RadioIcon,
  GraduationCapIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from 'lucide-react';
import { Breadcrumbs } from '../../ui/PageHeading';

// Steps and answers describe the app as it works today (limits, attempts and
// rank timing mirror the rules in the exam and live-test pages).
const steps = [
  {
    icon: UserCircle2Icon,
    title: '1. Check your account',
    text: 'Your name, roll number, photo and subscription validity appear on every result sheet. Keep them up to date from My Account.',
    to: '/profile',
    cta: 'Open My Account',
    tone: 'bg-primary-50 text-primary-700',
  },
  {
    icon: LayersIcon,
    title: '2. Pick an exam',
    text: 'Open Typing Exam, English Steno or Hindi Steno, choose your language / font and then your exam pattern (SSC, Court, Police and more).',
    to: '/typing-exam',
    cta: 'Browse exams',
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    icon: PlayCircleIcon,
    title: '3. Take the test',
    text: 'The test screen copies the real exam software for that pattern. The timer starts when the test begins; submit before it ends. For steno, listen to the dictation first, then type.',
    to: '/typing-exam',
    cta: 'Start a test',
    tone: 'bg-rose-50 text-rose-700',
  },
  {
    icon: BarChart3Icon,
    title: '4. Review your result',
    text: 'See gross and net speed, accuracy, full and half mistakes and the qualifying verdict. The passage review highlights exactly where each mistake happened.',
    to: '/my-tests',
    cta: 'View results',
    tone: 'bg-indigo-50 text-indigo-700',
  },
  {
    icon: RadioIcon,
    title: '5. Join live tests',
    text: 'Live tests run from 12:00 AM to 11:59 PM on their date and rank you against everyone who took them. Ranks become visible in the evening.',
    to: '/live-test/typing',
    cta: 'Open live tests',
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    icon: GraduationCapIcon,
    title: '6. Practise your own passage',
    text: 'Self Assessment lets you paste or upload any passage, choose a result pattern and duration, and practise without affecting your ranking.',
    to: '/self-assessment',
    cta: 'Self Assessment',
    tone: 'bg-violet-50 text-violet-700',
  },
];

const faqs = [
  {
    q: 'How many tests can I take?',
    a: 'Pre-load (practice) tests: the first tests of each exam are unlocked — 10 by default, or the number your institute has set for you. Live tests: a daily number of tests is unlocked (1 by default). Locked tests show a lock icon; contact your institute to unlock more.',
  },
  {
    q: 'How many times can I re-attempt a live test?',
    a: 'Up to 3 times per test. The Re-attempt box on the live test page shows how many attempts you have left for that day.',
  },
  {
    q: 'When can I see my live test rank?',
    a: 'Ranks are calculated from everyone who took the test during the day and are shown in the evening (7:00 PM to 10:00 PM). The Leaderboard is updated daily at the time shown on its page.',
  },
  {
    q: 'Why does my result count mistakes I did not expect?',
    a: 'Each exam uses a result pattern. Depending on the pattern, punctuation, capital/small letters and extra spaces can count as half mistakes, and the penalty per mistake differs. The Detailed Result Summary and Mistake Penalty Rules on your result sheet show exactly how your score was calculated.',
  },
  {
    q: 'Can I practise without internet?',
    a: 'Yes, in the desktop app. Practice tests you open while online are saved on your computer automatically (or use "Save for Offline Use"). Offline results are synced when you are back online. Live tests always need internet.',
  },
  {
    q: 'How does the steno test work?',
    a: 'The dictation plays in an audio player where you can pick the speed and pause or skip 5 seconds. The source text stays hidden. When you close the player the timer starts and you type what you heard; you can replay the audio from the sidebar.',
  },
  {
    q: 'Can I use a mobile phone?',
    a: 'Tests are designed for a desktop or laptop keyboard. Use full-screen mode (F11 or the button at the bottom right) for the best experience.',
  },
];

export default function HowToUse() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-4 flex flex-wrap items-start gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[24px] font-bold text-navy-800">
            <HelpCircleIcon className="h-6 w-6 text-primary" aria-hidden="true" /> How to use?
          </h2>
          <p className="text-[12.5px] text-slate-500">A quick walkthrough from picking an exam to reading your results.</p>
        </div>
        <div className="ml-auto">
          <Breadcrumbs crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'How to use?' }]} />
        </div>
      </div>

      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {steps.map((s) => (
          <article key={s.title} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <span className={`grid h-11 w-11 place-items-center rounded-full ${s.tone}`}>
              <s.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-3 font-display text-[14.5px] font-bold text-navy-800">{s.title}</h3>
            <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-slate-600">{s.text}</p>
            <Link
              to={s.to}
              className="mt-4 inline-flex w-fit items-center rounded-md border border-primary px-3.5 py-1.5 text-[12px] font-semibold text-primary transition-colors duration-150 hover:bg-primary-50">
              {s.cta} →
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="mb-3 font-display text-[16px] font-bold text-navy-800">Frequently asked questions</h3>
        <ul className="divide-y divide-slate-100">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <li key={f.q} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-3 text-left">
                  <span className="text-[13px] font-semibold text-navy-800">{f.q}</span>
                  {open ?
                    <ChevronUpIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /> :
                    <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
                </button>
                {open && <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">{f.a}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
