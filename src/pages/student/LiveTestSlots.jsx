import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LockIcon,
  PlayIcon,
  RotateCcwIcon,
  BarChart2Icon,
  TrophyIcon,
  CalendarDaysIcon,
} from 'lucide-react';
import { Breadcrumbs } from '../../ui/PageHeading';
import { LIVE, isStenoMode, modeLabel, sortByChapterNo, startTestState, resultViewState } from '../../features/exams/examData';
import { useExamList, useChapterSession } from '../../features/exams/useExamData';
import { ExamLogo, OfflineBanner, EmptyState, LoadingState } from '../../features/exams/ExamUI';

const MAX_REATTEMPTS = 3;

// Live tests stay accessible for this many days after their scheduled date.
const LIVE_TEST_PAST_DAYS = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function LiveTestSlots() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [params] = useSearchParams();
  const mode = params.get('mode') || 'English Typing';
  const steno = isStenoMode(mode);
  const listPath = steno ? `/live-test/steno?mode=${encodeURIComponent(mode)}` : `/live-test/typing?mode=${encodeURIComponent(mode)}`;
  const { exams, loading: examsLoading } = useExamList();
  const exam = exams.find((e) => e.id === examId);
  const { chapters, loading, isOffline, userProfile, attemptsByChapter, resultsByChapter, rankByChapter } =
    useChapterSession({ exam, mode, testType: LIVE });

  // Live tests are viewed one date at a time: today back to LIVE_TEST_PAST_DAYS
  // days ago. Future dates are never reachable.
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const today = startOfDay(new Date());
  const selectedDay = startOfDay(selectedDate);
  // How many days behind today the currently viewed date is (0 = today).
  const daysBack = Math.round((today - selectedDay) / MS_PER_DAY);
  const canGoPrev = daysBack < LIVE_TEST_PAST_DAYS;
  const canGoNext = daysBack > 0; // never navigate into the future
  const isViewingToday = daysBack === 0;

  const shiftDate = (deltaDays) => {
    const next = new Date(selectedDay.getTime() + deltaDays * MS_PER_DAY);
    const nextDaysBack = Math.round((today - startOfDay(next)) / MS_PER_DAY);
    if (nextDaysBack < 0 || nextDaysBack > LIVE_TEST_PAST_DAYS) return;
    setSelectedDate(next);
  };

  // Each date shows only the tests scheduled on that exact date.
  const filteredChapters = chapters
    .filter((chapter) => {
      // Undated tests are treated as "today's" tests.
      if (!chapter.test_date) return isViewingToday;
      return startOfDay(new Date(chapter.test_date)).getTime() === selectedDay.getTime();
    })
    .sort(sortByChapterNo);

  // Determine how many tests are unlocked for the user. Default is 1 if not set by admin.
  const unlockedCount = userProfile?.live_tests_limit ?? 1;

  const startTest = (chapter) =>
    navigate(steno ? '/steno-test' : '/test', { state: startTestState(exam, chapter, mode, LIVE) });

  const viewResult = (chapter) => {
    const r = resultsByChapter[chapter.id];
    if (r) navigate('/result', { state: resultViewState(r, chapter, exam) });
  };

  const handleReAttempt = () => {
    if (filteredChapters.length === 0) {
      alert('No tests available to re-attempt.');
      return;
    }
    // Find a chapter the user has already attempted but hasn't hit the limit on
    const eligible = filteredChapters.find((c) => {
      const used = attemptsByChapter[c.id] || 0;
      return used > 0 && used < MAX_REATTEMPTS;
    });
    if (eligible) {
      startTest(eligible);
      return;
    }
    // Otherwise just (re)start the first available
    const firstUnlocked = filteredChapters.find((_, idx) => idx < unlockedCount);
    if (firstUnlocked) {
      startTest(firstUnlocked);
    } else {
      alert('You have used all your re-attempts. Please contact your administrator.');
    }
  };

  // Compute attempts used across visible chapters
  const attemptsUsed = filteredChapters.reduce((sum, c) => sum + (attemptsByChapter[c.id] || 0), 0);
  const maxAttemptsTotal = Math.max(1, filteredChapters.length) * MAX_REATTEMPTS;
  const remaining = Math.max(0, maxAttemptsTotal - attemptsUsed);
  const canReattempt = remaining > 0 && filteredChapters.length > 0;

  if (!examsLoading && !exam) {
    return (
      <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
        <EmptyState>
          This exam is not available.{' '}
          <Link to={listPath} className="font-semibold text-primary hover:underline">Back to Live Tests</Link>
        </EmptyState>
      </div>
    );
  }

  const dateLabel = selectedDay.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-3">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', to: '/dashboard' },
            { label: steno ? 'Live Test (Steno)' : 'Live Test (Typing)', to: listPath },
            { label: exam?.name || '…' },
          ]} />
      </div>

      <section className="mb-4 flex flex-wrap items-center gap-4 rounded-xl bg-navy-900 p-5">
        <ExamLogo exam={exam} size="h-16 w-16" className="bg-white/10 text-white" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[22px] font-bold leading-tight text-white sm:text-[26px]">{exam?.name}</h2>
          <p className="mt-1 text-[12.5px] text-white/75">
            {modeLabel(mode)} · Live Test · {exam?.test_time_minutes} Minutes · Take tests daily &amp; improve your speed &amp; accuracy
          </p>
        </div>
        <span className="rounded bg-danger px-2.5 py-1 text-[11px] font-bold text-white">LIVE</span>
      </section>

      {isOffline && <OfflineBanner live />}

      {/* Date navigation — browse Live Tests one date at a time, from today
          back to LIVE_TEST_PAST_DAYS days ago. Future dates are unreachable. */}
      <section className="mb-3 flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
        <button
          type="button"
          onClick={() => shiftDate(-1)}
          disabled={!canGoPrev}
          aria-label="Previous day"
          title={canGoPrev ? 'Previous day' : `Only the last ${LIVE_TEST_PAST_DAYS} days are available`}
          className="grid h-9 w-9 place-items-center rounded-md border border-slate-300 text-navy-800 transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <p className="flex min-w-[240px] items-center justify-center gap-2 font-display text-[14px] font-semibold text-navy-800">
          <CalendarIcon className="h-4 w-4 text-primary" aria-hidden="true" />
          {isViewingToday ? 'Today — ' : daysBack === 1 ? 'Yesterday — ' : ''}{dateLabel}
        </p>
        <button
          type="button"
          onClick={() => shiftDate(1)}
          disabled={!canGoNext}
          aria-label="Next day"
          title={canGoNext ? 'Next day' : 'Future dates are not available'}
          className="grid h-9 w-9 place-items-center rounded-md border border-slate-300 text-navy-800 transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </section>

      <section className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        {loading || examsLoading ? <LoadingState>Loading available tests...</LoadingState> :
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-slate-50 text-[12px] font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3">S.No</th>
                  <th scope="col" className="px-4 py-3">Test No</th>
                  <th scope="col" className="px-4 py-3">Exam Name</th>
                  <th scope="col" className="px-4 py-3">Exam Start</th>
                  <th scope="col" className="px-4 py-3">Exam End</th>
                  <th scope="col" className="px-4 py-3">Language</th>
                  <th scope="col" className="px-4 py-3">Duration</th>
                  <th scope="col" className="px-4 py-3 text-center">Rank</th>
                  <th scope="col" className="px-4 py-3 text-center">Result</th>
                  <th scope="col" className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[12.5px]">
                {filteredChapters.length === 0 ?
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      No live tests are scheduled for {mode} on {isViewingToday ? 'today' : selectedDay.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.
                      Use the arrows above to view tests from the last {LIVE_TEST_PAST_DAYS} days.
                    </td>
                  </tr> :
                  filteredChapters.map((chapter, index) => {
                    const userResult = resultsByChapter[chapter.id];
                    const rankInfo = rankByChapter[chapter.id];
                    return (
                      <tr key={chapter.id} className="transition-colors duration-150 hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-slate-500">{String(index + 1).padStart(2, '0')}</td>
                        <td className="px-4 py-3 font-semibold text-navy-800">{chapter.chapter_no}</td>
                        <td className="px-4 py-3 text-navy-800">{exam?.name}</td>
                        <td className="px-4 py-3 text-slate-600">12:00 AM</td>
                        <td className="px-4 py-3 text-slate-600">11:59 PM</td>
                        <td className="px-4 py-3 text-slate-600">{mode.includes('Hindi') ? 'Hindi' : 'English'}</td>
                        <td className="px-4 py-3 text-slate-600">{exam?.test_time_minutes} Min</td>
                        <td className="px-4 py-3 text-center">
                          {rankInfo && rankInfo.rank ?
                            <span className="inline-flex items-center gap-1 font-semibold text-primary">
                              <TrophyIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              {rankInfo.rank}{rankInfo.total ? ` / ${rankInfo.total}` : ''}
                            </span> : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {userResult ?
                            <button
                              type="button"
                              onClick={() => viewResult(chapter)}
                              className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-[11.5px] font-semibold text-white transition-colors duration-150 hover:bg-primary-700">
                              <BarChart2Icon className="h-3 w-3" aria-hidden="true" /> View
                            </button> : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {index < unlockedCount ?
                            <button
                              type="button"
                              onClick={() => startTest(chapter)}
                              className="inline-flex items-center gap-1 rounded bg-success px-3 py-1 text-[11.5px] font-semibold text-white transition-colors duration-150 hover:bg-[#146c43]">
                              <PlayIcon className="h-3 w-3 fill-current" aria-hidden="true" /> Start
                            </button> :
                            <span className="inline-flex cursor-not-allowed items-center gap-1 rounded bg-slate-200 px-3 py-1 text-[11.5px] font-medium text-slate-500">
                              Locked <LockIcon className="h-3 w-3" aria-hidden="true" />
                            </span>
                          }
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <CalendarDaysIcon className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          <h3 className="mt-2 font-display text-[14px] font-bold text-emerald-800">Daily Free Test(s)</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-emerald-900/80">
            You have {unlockedCount} unlocked test{unlockedCount !== 1 ? 's' : ''} available per day. Beyond this limit, tests remain locked unless updated by your administrator.
          </p>
        </div>
        <div className="rounded-xl border border-primary-100 bg-primary-50 p-4">
          <BarChart2Icon className="h-6 w-6 text-primary" aria-hidden="true" />
          <h3 className="mt-2 font-display text-[14px] font-bold text-primary-700">About Results</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-navy-800/80">
            Your latest result will be shown here. If you give the same test again, only the latest result will be displayed.
          </p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
          <TrophyIcon className="h-6 w-6 text-violet-600" aria-hidden="true" />
          <h3 className="mt-2 font-display text-[14px] font-bold text-violet-800">About Rank</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-violet-950/80">
            Rank will be shown behind the result. Ranks are visible in the evening (7:00 PM To 10 PM) for all students who took the test throughout the day
          </p>
        </div>
      </div>

      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
          <RotateCcwIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[14.5px] font-bold text-amber-900">Re-attempt Option</h3>
          <p className="text-[12.5px] text-amber-900/80">You Can Re-Attempt A Test Upto {MAX_REATTEMPTS} Times</p>
        </div>
        <span className="rounded-md bg-white px-3 py-1.5 text-[12.5px] font-semibold text-amber-800">
          Attempts Left: {remaining}/{maxAttemptsTotal}
        </span>
        <button
          type="button"
          onClick={handleReAttempt}
          disabled={!canReattempt}
          className="rounded-md bg-amber-500 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">
          Re-Attempt
        </button>
      </section>
    </div>
  );
}
