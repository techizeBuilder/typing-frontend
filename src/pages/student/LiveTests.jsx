import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RadioIcon, ArrowRightIcon, ClockIcon, UsersIcon } from 'lucide-react';
import { Breadcrumbs } from '../../ui/PageHeading';
import { TYPING_MODES, STENO_MODES, LIVE, examMatchesMode, chapterInExam } from '../../features/exams/examData';
import { useExamList, useChapterSummary, useOnlineStatus } from '../../features/exams/useExamData';
import { ExamLogo, ModeChips, EmptyState, LoadingState, OfflineBanner } from '../../features/exams/ExamUI';

const themes = [
  { bg: 'border-blue-100 bg-blue-50/60', badge: 'bg-blue-50 text-blue-700', number: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
  { bg: 'border-emerald-100 bg-emerald-50/60', badge: 'bg-emerald-50 text-emerald-700', number: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  { bg: 'border-violet-100 bg-violet-50/60', badge: 'bg-violet-50 text-violet-700', number: 'text-violet-600', btn: 'bg-violet-600 hover:bg-violet-700' },
  { bg: 'border-orange-100 bg-orange-50/60', badge: 'bg-orange-50 text-orange-700', number: 'text-orange-600', btn: 'bg-orange-500 hover:bg-orange-600' },
];

const STENO_MODE_LIST = [STENO_MODES.english, STENO_MODES.hindi];

const isToday = (chapter) => {
  // Undated tests are treated as "today's" tests (same rule as the slots table).
  if (!chapter.test_date) return true;
  const d = new Date(chapter.test_date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

export default function LiveTests({ kind }) {
  const modes = kind === 'steno' ? STENO_MODE_LIST : TYPING_MODES;
  const title = kind === 'steno' ? 'Live Test (Steno)' : 'Live Test (Typing)';
  const [params, setParams] = useSearchParams();
  const mode = modes.some((m) => m.value === params.get('mode')) ? params.get('mode') : modes[0].value;
  const { exams, loading } = useExamList();
  const liveChapters = useChapterSummary(mode, LIVE);
  const isOffline = useOnlineStatus();

  const cards = useMemo(
    () => exams
      .filter((e) => examMatchesMode(e, mode))
      .map((exam) => ({ exam, today: liveChapters.filter((c) => chapterInExam(c, exam.id) && isToday(c)).length }))
      // Exams with live tests today first
      .sort((a, b) => b.today - a.today),
    [exams, mode, liveChapters],
  );

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <h2 className="flex items-center gap-2 font-display text-[24px] font-bold text-navy-800 sm:text-[26px]">
          <RadioIcon className="h-6 w-6 text-primary" aria-hidden="true" /> {title}
        </h2>
        <div className="ml-auto">
          <Breadcrumbs crumbs={[{ label: 'Home', to: '/dashboard' }, { label: title }]} />
        </div>
      </div>

      {isOffline && <OfflineBanner live />}

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <ModeChips modes={modes} value={mode} onChange={(value) => setParams({ mode: value }, { replace: true })} />
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-slate-600">
          <span className="flex items-center gap-1.5"><ClockIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Tests open 12:00 AM – 11:59 PM</span>
          <span className="flex items-center gap-1.5"><UsersIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Real-time All India ranking</span>
        </div>
      </section>

      {loading ? <LoadingState>Loading live tests...</LoadingState> :
        cards.length === 0 ? <EmptyState>No exams available for {mode}.</EmptyState> :
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ exam, today }, i) => {
              const theme = themes[i % themes.length];
              return (
                <article key={exam.id} className={`relative flex flex-col items-center rounded-2xl border p-5 text-center shadow-card ${theme.bg}`}>
                  {today > 0 &&
                    <span className="absolute left-3 top-3 rounded bg-danger px-2 py-[2px] text-[9.5px] font-bold text-white">LIVE</span>
                  }
                  <ExamLogo exam={exam} size="mt-1 h-20 w-20" className="bg-white text-slate-500" />
                  <h4 className="mt-3 font-display text-[15px] font-bold leading-snug text-navy-800">{exam.name}</h4>
                  <p className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${theme.badge}`}>
                    <RadioIcon className="h-3 w-3" aria-hidden="true" /> Live Tests Today
                  </p>
                  <p className={`mt-1.5 font-display text-[30px] font-extrabold ${theme.number}`}>{isOffline ? '–' : today}</p>
                  <Link
                    to={`/live-test/exam/${exam.id}?mode=${encodeURIComponent(mode)}`}
                    className={`mt-auto flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 ${theme.btn}`}>
                    View Tests <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
      }
    </div>
  );
}
