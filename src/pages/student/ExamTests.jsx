import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ClockIcon,
  FileTextIcon,
  KeyboardIcon,
  LockIcon,
  MonitorIcon,
  PlayIcon,
  SearchIcon,
  CheckCircle2Icon,
  BarChart2Icon,
  TimerIcon,
} from 'lucide-react';
import { Breadcrumbs } from '../../ui/PageHeading';
import {
  TYPING_MODES,
  PRELOAD,
  isStenoMode,
  examMatchesMode,
  sortByChapterNo,
  matchesDifficulty,
  startTestState,
  resultViewState,
} from '../../features/exams/examData';
import { useExamList, useChapterSession } from '../../features/exams/useExamData';
import { ExamLogo, ModeChips, OfflineBanner, SaveOfflineButton, EmptyState, LoadingState } from '../../features/exams/ExamUI';
import { DifficultyTabs, DifficultyBadge, RulesPdfCard } from '../../features/exams/ExamFilters';
import { useFontGroupSettings } from '../../features/fontGroups/fontGroups';

// Default number of unlocked tests when the admin hasn't set a per-student limit.
const DEFAULT_PRELOAD_LIMIT = 10;
const DEFAULT_STENO_LIMIT = 10;

export default function ExamTests() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') || TYPING_MODES[0].value;
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const { exams, loading: examsLoading } = useExamList();
  const exam = exams.find((e) => e.id === examId);

  const session = useChapterSession({ exam, mode, testType: PRELOAD });
  const { chapters, loading, isOffline, userProfile, resultsByChapter, attemptsByChapter } = session;

  // Pre-load tests (typing) and Steno tests each have their own admin-set limit.
  const preloadUnlockedCount = isStenoMode(mode)
    ? (userProfile?.steno_tests_limit ?? DEFAULT_STENO_LIMIT)
    : (userProfile?.preload_tests_limit ?? DEFAULT_PRELOAD_LIMIT);

  const sorted = useMemo(() => [...chapters].sort(sortByChapterNo), [chapters]);
  const rows = sorted
    .map((chapter, index) => ({ chapter, index }))
    .filter(({ chapter }) => matchesDifficulty(chapter, difficulty))
    .filter(({ chapter }) =>
      `${chapter.chapter_no} ${chapter.name || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const hasDifficulty = chapters.some((c) => c.difficulty);

  const { isActive } = useFontGroupSettings();
  const examModes = exam ? TYPING_MODES.filter((m) => examMatchesMode(exam, m.value) && (isActive(m.value) || m.value === mode)) : [];

  const startTest = (chapter) =>
    navigate(isStenoMode(mode) ? '/steno-test' : '/test', { state: startTestState(exam, chapter, mode, PRELOAD) });

  const viewResult = (chapter) => {
    const r = resultsByChapter[chapter.id];
    if (r) navigate('/result', { state: resultViewState(r, chapter, exam) });
  };

  if (!examsLoading && !exam) {
    return (
      <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
        <EmptyState>
          This exam is not available{isOffline ? ' offline' : ''}.{' '}
          <Link to="/typing-exam" className="font-semibold text-primary hover:underline">Back to Typing Exam</Link>
        </EmptyState>
      </div>
    );
  }

  const details = exam ? [
    { icon: ClockIcon, label: `Time Duration : ${exam.test_time_minutes} Minutes` },
    { icon: KeyboardIcon, label: `Backspace : ${exam.backspace_control || '—'}` },
    exam.result_pattern?.name && { icon: CheckCircle2Icon, label: `Result Pattern : ${exam.result_pattern.name}` },
    { icon: MonitorIcon, label: `Exam Mode : ${exam.test_paper_screen || 'Screen'} · ${exam.screen_type || 'TCS'} interface` },
    exam.auto_submit && { icon: TimerIcon, label: 'Auto Submit : On' },
  ].filter(Boolean) : [];

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-3">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Typing Exam', to: `/typing-exam?mode=${encodeURIComponent(mode)}` },
            { label: exam?.name || '…' },
          ]} />
      </div>

      {/* Exam banner */}
      <section className="mb-4 rounded-xl bg-navy-900 p-5">
        <div className={`grid gap-5 ${exam?.rules_pdf_url ? 'lg:grid-cols-[1fr_340px_220px]' : 'lg:grid-cols-[1fr_340px]'}`}>
          <div className="flex items-start gap-4">
            <ExamLogo exam={exam} size="h-[72px] w-[72px]" className="bg-white/10 text-white" />
            <div className="min-w-0">
              <h2 className="font-display text-[24px] font-bold leading-tight text-white sm:text-[28px]">{exam?.name}</h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-white/30 px-3 py-1 text-[12px] font-medium text-white">
                  {loading ? '…' : `${chapters.length} Tests Available`}
                </span>
                <span className="rounded-full border border-[#38BDF8]/60 px-3 py-1 text-[12px] font-semibold text-[#38BDF8]">
                  {mode}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white/5 p-4">
            <p className="mb-2.5 flex items-center gap-2 font-display text-[13.5px] font-semibold text-white">
              <FileTextIcon className="h-4 w-4" aria-hidden="true" /> Exam Details
            </p>
            <ul className="space-y-2">
              {details.map((d) => (
                <li key={d.label} className="flex items-center gap-2 text-[12px] text-white/85">
                  <d.icon className="h-3.5 w-3.5 shrink-0 text-white/60" aria-hidden="true" />
                  {d.label}
                </li>
              ))}
            </ul>
          </div>

          {exam?.rules_pdf_url && <RulesPdfCard url={exam.rules_pdf_url} />}
        </div>
      </section>

      {isOffline && <OfflineBanner />}

      {/* Filter bar */}
      <section className="mb-3 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
        {examModes.length > 1 &&
          <ModeChips
            modes={examModes}
            value={mode}
            onChange={(value) => setParams({ mode: value }, { replace: true })} />
        }
        <DifficultyTabs items={chapters} value={difficulty} onChange={setDifficulty} />
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {!isOffline && chapters.length > 0 &&
            <SaveOfflineButton status={session.downloadStatus} onClick={session.downloadOffline} progress={session.audioProgress} />
          }
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search test..."
              aria-label="Search test"
              className="w-[200px] rounded-md border border-slate-300 py-2 pl-9 pr-3 text-[12.5px] outline-none transition-colors duration-150 focus:border-primary" />
          </div>
        </div>
      </section>

      {/* Test table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        {loading || examsLoading ? <LoadingState>Loading available tests...</LoadingState> :
          rows.length === 0 ?
            <EmptyState>{query || difficulty !== 'all' ? 'No tests match your filters.' : `No exercises found for ${mode}.`}</EmptyState> :
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead className="bg-slate-50 text-[12px] font-semibold text-slate-600">
                  <tr>
                    <th scope="col" className="px-5 py-3">Test No.</th>
                    <th scope="col" className="px-5 py-3">Test Name</th>
                    <th scope="col" className="px-5 py-3 text-center">Time</th>
                    {hasDifficulty && <th scope="col" className="px-5 py-3 text-center">Difficulty</th>}
                    <th scope="col" className="px-5 py-3 text-center">Access</th>
                    <th scope="col" className="px-5 py-3 text-center">Your Best</th>
                    <th scope="col" className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[12.5px]">
                  {rows.map(({ chapter, index }) => {
                    const isUnlocked = index < preloadUnlockedCount;
                    const best = resultsByChapter[chapter.id];
                    const attempts = attemptsByChapter[chapter.id] || 0;
                    return (
                      <tr key={chapter.id} className="transition-colors duration-150 hover:bg-slate-50/70">
                        <td className="px-5 py-3">
                          <span className="inline-block rounded border border-slate-200 px-2 py-[2px] text-[11.5px] font-semibold text-navy-800">
                            {chapter.chapter_no}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium text-navy-800">
                          {chapter.name || `Practice Test ${chapter.chapter_no}`}
                        </td>
                        <td className="px-5 py-3 text-center text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <ClockIcon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                            {exam?.test_time_minutes} Min
                          </span>
                        </td>
                        {hasDifficulty && <td className="px-5 py-3 text-center"><DifficultyBadge value={chapter.difficulty} /></td>}
                        <td className="px-5 py-3 text-center">
                          {isUnlocked ?
                            <span className="font-display text-[13px] font-bold text-success">Unlocked</span> :
                            <span className="inline-flex items-center gap-1 font-display text-[13px] font-bold text-slate-400">
                              <LockIcon className="h-3.5 w-3.5" aria-hidden="true" /> Locked
                            </span>
                          }
                        </td>
                        <td className="px-5 py-3 text-center text-slate-600">
                          {best ?
                            <span title={`${attempts} attempt${attempts === 1 ? '' : 's'}`} className="font-semibold text-primary">{best.nwpm} WPM</span> : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {best &&
                              <button
                                type="button"
                                onClick={() => viewResult(chapter)}
                                className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-[11.5px] font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50">
                                <BarChart2Icon className="h-3 w-3" aria-hidden="true" /> Result
                              </button>
                            }
                            {isUnlocked ?
                              <button
                                type="button"
                                onClick={() => startTest(chapter)}
                                className="inline-flex items-center gap-1 rounded bg-navy-800 px-3 py-1 text-[11.5px] font-semibold text-white transition-colors duration-150 hover:bg-navy-900">
                                <PlayIcon className="h-3 w-3 fill-current" aria-hidden="true" /> {best ? 'Retake' : 'Start Test'}
                              </button> :
                              <span
                                title="Locked — contact your administrator to unlock more tests"
                                className="inline-flex cursor-not-allowed items-center gap-1 rounded bg-slate-200 px-3 py-1 text-[11.5px] font-medium text-slate-500">
                                <LockIcon className="h-3 w-3" aria-hidden="true" /> Locked
                              </span>
                            }
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </section>
    </div>
  );
}
