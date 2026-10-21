import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3Icon, FilterIcon, XIcon, EyeIcon, AlertTriangleIcon, TrophyIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { resultService, getCurrentUserUuid } from '../services/api';
import { LoadingState, EmptyState } from '../features/exams/ExamUI';
import { releaseLabel, resultReleaseAt, timingOf } from '../features/results/resultTiming';

const TABS = [
  { id: 'typing', label: 'Typing' },
  { id: 'steno', label: 'Steno' },
  { id: 'live', label: 'Live Tests' },
];

const PAGE_SIZE = 20;

const MyResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('typing'); // 'typing', 'steno', or 'live'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [examFilter, setExamFilter] = useState('All');
  const [fetchError, setFetchError] = useState('');
  const [saveErrorBanner, setSaveErrorBanner] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    // Surface the most recent save error from TestEngine, if any.
    const lastErr = sessionStorage.getItem('lastSaveError');
    if (lastErr) {
      setSaveErrorBanner(lastErr);
      sessionStorage.removeItem('lastSaveError');
    }

    const fetchResults = async () => {
      try {
        const userId = getCurrentUserUuid();
        if (!userId) {
          setFetchError('Your session is missing a valid user ID. Please log out and log in again to see your past results.');
          setLoading(false);
          return;
        }
        console.log('[MyResults] Fetching results for userId:', userId);
        const data = await resultService.getUserResults(userId);
        console.log('[MyResults] Got', data?.length ?? 0, 'results');
        setResults(data || []);
      } catch (error) {
        console.error('Error fetching results:', error);
        const msg = error?.response?.data?.message || error?.message || 'Could not load results.';
        setFetchError(Array.isArray(msg) ? msg.join(', ') : msg);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const handleViewResult = (result) => {
    // Only steno results use the StenoDiff view (driven by typedText + referenceText).
    // Typing results must leave these unset so ResultScreen renders the full
    // TypingPassageReview with its Test Analysis / Mistake / Compare tabs.
    const isSteno = (result.mode || '').toLowerCase().includes('steno');
    // Full uploaded passage so the "Original Passage" column shows the complete text,
    // not just the (possibly trimmed) reference_words the student reached.
    const fullPassage = result.chapter?.content_text || (result.reference_words ? result.reference_words.join(' ') : '');
    navigate('/result', {
      state: {
        gwpm: result.gwpm,
        nwpm: result.nwpm,
        accuracy: result.accuracy,
        fullErrors: result.full_errors,
        halfErrors: result.half_errors,
        totalStrokes: result.total_strokes,
        timeElapsed: result.time_elapsed,
        testDurationMinutes: result.exam?.test_time_minutes || undefined,
        exam_name: result.exam?.name || 'Practice Test',
        chapter_no: result.chapter?.chapter_no || null,
        date_taken: result.date_taken,
        mode: result.mode,
        userInput: result.user_input,
        referenceWords: result.reference_words || [],
        wordStatuses: result.word_statuses || [],
        pattern: result.pattern_data,
        originalPassage: fullPassage,
        testType: result.test_type,
        resultTiming: timingOf(result.exam?.result_pattern),
        ...(isSteno ? { typedText: result.user_input, referenceText: fullPassage } : {}),
      }
    });
  };

  // Unique exam options derived from all results (regardless of active tab)
  const examOptions = Array.from(
    new Set(results.map(r => r.exam?.name || 'Self Practice'))
  ).sort();

  const filteredResults = results.filter(r => {
    const isLive = r.test_type === 'Live Test';
    const isSteno = r.mode?.toLowerCase().includes('steno');
    let isTabMatch = false;
    if (activeTab === 'live') {
      isTabMatch = isLive;
    } else if (activeTab === 'steno') {
      isTabMatch = isSteno && !isLive;
    } else {
      isTabMatch = !isSteno && !isLive;
    }
    if (!isTabMatch) return false;

    if (startDate) {
      const resultDate = new Date(r.date_taken);
      const filterStart = new Date(startDate);
      filterStart.setHours(0, 0, 0, 0);
      if (resultDate < filterStart) return false;
    }

    if (endDate) {
      const resultDate = new Date(r.date_taken);
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);
      if (resultDate > filterEnd) return false;
    }

    if (examFilter !== 'All') {
      const resultExam = r.exam?.name || 'Self Practice';
      if (resultExam !== examFilter) return false;
    }

    return true;
  });

  // Results whose pattern releases them later stay hidden until then.
  const releaseOf = (r) => resultReleaseAt(timingOf(r.exam?.result_pattern), r.test_type, r.date_taken);
  const released = filteredResults.filter((r) => !releaseOf(r));
  // Summary of the rows currently shown (stored values, as listed below).
  const avgNwpm = released.length
    ? Math.round(released.reduce((sum, r) => sum + (Number(r.nwpm) || 0), 0) / released.length)
    : 0;
  const bestNwpm = released.reduce((best, r) => Math.max(best, Math.round(Number(r.nwpm) || 0)), 0);

  const pageCount = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const resetPage = () => setPage(1);
  const hasFilters = startDate || endDate || examFilter !== 'All';

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[22px] font-bold text-navy-800">
            <BarChart3Icon className="h-5 w-5 text-primary" aria-hidden="true" /> Test Analysis (Results)
          </h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            Review your past tests and track your progress over time.
          </p>
          <div className="mt-2.5 flex gap-4 border-b border-slate-200" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => { setActiveTab(t.id); resetPage(); }}
                className={`border-b-2 pb-2 text-[13px] font-semibold transition-colors duration-150 ${
                  activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-navy-800'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2.5">
          {[
            ['Total Tests', filteredResults.length],
            ['Avg Net WPM', avgNwpm],
            ['Best Net WPM', bestNwpm],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-primary-100 bg-primary-50 px-4 py-2 text-center">
              <p className="font-display text-[18px] font-bold text-primary">{value}</p>
              <p className="text-[10px] font-medium text-primary-700">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {saveErrorBanner &&
        <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-800">
          <span className="flex items-start gap-2">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span><strong>Your last test result could not be saved to the server:</strong> {saveErrorBanner}</span>
          </span>
          <button type="button" onClick={() => setSaveErrorBanner('')} aria-label="Dismiss" className="text-rose-500 hover:text-rose-700">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      }

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-3 flex items-center gap-2 font-display text-[13.5px] font-semibold text-navy-800">
          <FilterIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Filter Results
        </h3>
        <div className="flex flex-wrap items-end gap-3.5">
          <label className="block min-w-[180px] flex-1">
            <span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Select Exam</span>
            <select
              value={examFilter}
              onChange={(e) => { setExamFilter(e.target.value); resetPage(); }}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-slate-700 outline-none focus:border-primary">
              <option value="All">All Exams</option>
              {examOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="block min-w-[150px] flex-1">
            <span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); resetPage(); }}
              className="w-full rounded-md border border-slate-300 px-3 py-[7px] text-[12.5px] outline-none focus:border-primary" />
          </label>
          <label className="block min-w-[150px] flex-1">
            <span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); resetPage(); }}
              className="w-full rounded-md border border-slate-300 px-3 py-[7px] text-[12.5px] outline-none focus:border-primary" />
          </label>
          <button
            type="button"
            disabled={!hasFilters}
            onClick={() => { setStartDate(''); setEndDate(''); setExamFilter('All'); resetPage(); }}
            className="flex items-center gap-1.5 rounded-md border border-primary px-4 py-2 text-[12.5px] font-medium text-primary transition-colors duration-150 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40">
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" /> Clear Filters
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        {loading ? <LoadingState>Loading your results...</LoadingState> :
          fetchError ?
            <p role="alert" className="px-5 py-8 text-center text-[13px] font-medium text-danger">{fetchError}</p> :
            filteredResults.length === 0 ?
              <EmptyState>
                No tests found matching the selected criteria.
                {results.length > 0 && ' (Try switching the Typing/Steno tab or clearing the date range.)'}
              </EmptyState> :
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left">
                    <thead className="bg-gradient-to-r from-primary to-indigo-600 text-[10.5px] font-semibold uppercase tracking-wide text-white">
                      <tr>
                        <th scope="col" className="px-4 py-3">#</th>
                        <th scope="col" className="px-4 py-3">Exam Name</th>
                        <th scope="col" className="px-4 py-3">Test No.</th>
                        <th scope="col" className="px-4 py-3">Course</th>
                        <th scope="col" className="px-4 py-3">Test Date &amp; Time</th>
                        <th scope="col" className="px-4 py-3">Net Speed (WPM)</th>
                        <th scope="col" className="px-4 py-3">Accuracy (%)</th>
                        <th scope="col" className="px-4 py-3">Status</th>
                        <th scope="col" className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[12.5px]">
                      {pageRows.map((result, i) => {
                        const dateObj = new Date(result.date_taken);
                        const releaseAt = releaseOf(result);
                        return (
                          <tr key={result.id} className="transition-colors duration-150 hover:bg-slate-50/70">
                            <td className="px-4 py-3 text-slate-500">{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                            <td className="px-4 py-3 font-semibold text-navy-800">{result.exam?.name || 'Self Practice'}</td>
                            <td className="px-4 py-3 text-slate-600">{result.chapter?.chapter_no || '—'}</td>
                            <td className="px-4 py-3 text-slate-600">{result.mode || '—'}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })},{' '}
                              {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            {releaseAt ? <>
                              <td colSpan={2} className="px-4 py-3 text-[11.5px] font-medium text-slate-500">Result at {releaseLabel(releaseAt)}</td>
                            </> : <>
                              <td className="px-4 py-3 font-semibold text-primary">{Math.round(result.nwpm)} WPM</td>
                              <td className="px-4 py-3 text-slate-700">{parseFloat(result.accuracy).toFixed(2)}%</td>
                            </>}
                            <td className="px-4 py-3">
                              {releaseAt ? <span className="rounded bg-slate-100 px-2 py-[2px] text-[11.5px] font-semibold text-slate-600">Submitted</span> : result.rank ?
                                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-[2px] text-[11.5px] font-semibold text-amber-700">
                                  <TrophyIcon className="h-3 w-3" aria-hidden="true" /> {result.rank}Th Rank
                                </span> :
                                <span className="rounded bg-emerald-50 px-2 py-[2px] text-[11.5px] font-semibold text-emerald-700">Completed</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                disabled={!!releaseAt}
                                title={releaseAt ? `Available at ${releaseLabel(releaseAt)}` : undefined}
                                onClick={() => handleViewResult(result)}
                                className="inline-flex items-center gap-1 rounded bg-navy-800 px-3 py-1 text-[11.5px] font-semibold text-white transition-colors duration-150 hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-40">
                                <EyeIcon className="h-3 w-3" aria-hidden="true" /> View Report
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500">
                  <span>
                    Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredResults.length)} of {filteredResults.length} results
                  </span>
                  {pageCount > 1 &&
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Previous page"
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                        className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 text-navy-800 hover:bg-slate-50 disabled:opacity-40">
                        <ChevronLeftIcon className="h-4 w-4" />
                      </button>
                      Page {currentPage} of {pageCount}
                      <button
                        type="button"
                        aria-label="Next page"
                        disabled={currentPage === pageCount}
                        onClick={() => setPage(currentPage + 1)}
                        className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 text-navy-800 hover:bg-slate-50 disabled:opacity-40">
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </span>
                  }
                </div>
              </>
        }
      </section>
    </div>
  );
};

export default MyResults;
