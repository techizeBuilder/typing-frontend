import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SearchIcon, ArrowRightIcon, FileSpreadsheetIcon, ClockIcon } from 'lucide-react';
import { PageHeading } from '../../ui/PageHeading';
import { TYPING_MODES, PRELOAD, examMatchesMode, chapterInExam } from '../../features/exams/examData';
import { useExamList, useChapterSummary, useExamOfflineSave, useOnlineStatus } from '../../features/exams/useExamData';
import { ExamLogo, ModeChips, CardSaveButton, EmptyState, LoadingState, OfflineBanner } from '../../features/exams/ExamUI';
import { RegionChips } from '../../features/exams/ExamFilters';
import { useFontGroupSettings } from '../../features/fontGroups/fontGroups';

const tones = [
  { card: 'bg-rose-50', logo: 'bg-rose-100 text-rose-600' },
  { card: 'bg-emerald-50', logo: 'bg-emerald-100 text-emerald-600' },
  { card: 'bg-primary-50', logo: 'bg-primary-100 text-primary-700' },
  { card: 'bg-amber-50', logo: 'bg-amber-100 text-amber-600' },
  { card: 'bg-violet-50', logo: 'bg-violet-100 text-violet-600' },
  { card: 'bg-cyan-50', logo: 'bg-cyan-100 text-cyan-700' },
];

export default function TypingExams() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { isActive } = useFontGroupSettings();
  // Font groups switched off by the admin are not offered.
  const offered = TYPING_MODES.filter((m) => isActive(m.value));
  const modes = offered.length ? offered : TYPING_MODES;
  const mode = modes.some((m) => m.value === params.get('mode')) ? params.get('mode') : modes[0].value;
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');
  const { exams, loading } = useExamList();
  const summary = useChapterSummary(mode, PRELOAD);
  const offline = useExamOfflineSave(mode);
  const isOffline = useOnlineStatus();

  const visible = useMemo(
    () => exams
      .filter((e) => examMatchesMode(e, mode))
      .filter((e) => region === 'all' || e.region === region)
      .filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase())),
    [exams, mode, region, query],
  );

  // Region chips appear once the admin has tagged at least one exam.
  const hasRegions = exams.some((e) => e.region);

  const testCount = (examId) => summary.filter((c) => chapterInExam(c, examId)).length;

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <PageHeading
        icon={<FileSpreadsheetIcon className="h-5 w-5" />}
        title="Typing Exam"
        subtitle="Choose your typing language and exam pattern"
        crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Typing Exam' }]} />

      {isOffline && <OfflineBanner what="exams" />}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <ModeChips
          modes={modes}
          value={mode}
          onChange={(value) => setParams({ mode: value }, { replace: true })} />

        <h3 className="mt-5 font-display text-[16px] font-semibold text-navy-800">Select Exam Pattern</h3>
        {hasRegions && <RegionChips value={region} onChange={setRegion} />}
        <div className="relative mt-3">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for exam..."
            aria-label="Search for exam"
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-[13px] outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-primary" />
        </div>

        {loading ? <LoadingState>Loading exam patterns...</LoadingState> :
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((exam, i) => {
              const tone = tones[i % tones.length];
              const count = testCount(exam.id);
              return (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => navigate(`/typing-exam/${exam.id}?mode=${encodeURIComponent(mode)}`)}
                  className={`flex flex-col rounded-xl border border-slate-200 ${tone.card} p-3.5 text-left shadow-card transition-colors duration-150 hover:border-primary`}>
                  <div className="flex w-full gap-3">
                    <ExamLogo exam={exam} className={tone.logo} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[13.5px] font-semibold leading-snug text-navy-800">{exam.name}</span>
                      {exam.test_time_minutes &&
                        <span className="mt-0.5 flex items-center gap-1 text-[11.5px] leading-snug text-slate-500">
                          <ClockIcon className="h-3 w-3" aria-hidden="true" /> {exam.test_time_minutes} Minutes
                        </span>
                      }
                    </span>
                    {!isOffline &&
                      <CardSaveButton status={offline.status[exam.id]} onClick={() => offline.save(exam)} />
                    }
                  </div>
                  <div className="mt-3 flex w-full items-center justify-between gap-2">
                    <span className="rounded-md border border-slate-200 bg-white/60 px-2 py-1 text-[11px] font-medium text-slate-600">
                      {isOffline ? 'Saved tests' : `${count} Test${count === 1 ? '' : 's'}`}
                    </span>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${tone.logo}`}>
                      <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        }

        {!loading && visible.length === 0 &&
          <EmptyState>
            {query ? 'No exams match your search.' : region !== 'all' ? `No ${region} exams available for ${mode}.` : `No exams available for ${mode}.`}
          </EmptyState>
        }
      </section>
    </div>
  );
}
