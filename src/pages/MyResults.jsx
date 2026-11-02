import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BarChart3Icon, FilterIcon, XIcon, EyeIcon, AlertTriangleIcon, TrophyIcon, ChevronLeftIcon, ChevronRightIcon,
  CalendarIcon, DownloadIcon, GaugeIcon, HashIcon, KeyboardIcon, MicIcon, TypeIcon, ZapIcon, Loader2Icon, ClockIcon,
} from 'lucide-react';
import { resultService, getCurrentUserUuid } from '../services/api';
import { LoadingState, EmptyState } from '../features/exams/ExamUI';
import { releaseLabel, resultReleaseAt, timingOf } from '../features/results/resultTiming';
import { computeResultMetrics } from '../utils/resultMetrics';
import { isResultQualified } from '../features/results/qualify';

// Tabs = the sidebar's Test Analysis links. On /test-analysis/:kind the tab is the
// route; on /my-tests (Test Analysis (Results)) it is local state.
const KINDS = [
  { id: 'typing', label: 'Typing' },
  { id: 'eng-steno', label: 'Eng. Steno' },
  { id: 'hindi-steno', label: 'Hindi Steno' },
];

const ofKind = (kind, r) => {
  const m = r.mode || '';
  if (kind === 'eng-steno') return m === 'Steno English';
  if (kind === 'hindi-steno') return m === 'Steno Hindi';
  return !/steno/i.test(m);
};

const TEST_TYPES = [
  { id: 'All', label: 'All (Live / Pre-load / Self)' },
  { id: 'live', label: 'Live' },
  { id: 'preload', label: 'Pre-load' },
  { id: 'self', label: 'Self Practice' },
];
const testTypeOf = (r) => (r.test_type === 'Live Test' ? 'live' : r.exam ? 'preload' : 'self');
const TYPE_LABEL = { live: 'Live', preload: 'Pre-load', self: 'Self Practice' };

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

function TestTypePill({ type }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-[10.5px] font-semibold ${
      type === 'live' ? 'bg-emerald-50 text-emerald-700' : type === 'self' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
      {TYPE_LABEL[type]}
    </span>
  );
}

function StatusPill({ qualified }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-[10.5px] font-semibold ${
      qualified ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
      {qualified ? 'Qualified' : 'Not Qualified'}
    </span>
  );
}

function SpeedBadge({ value }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5">
      <GaugeIcon className="h-4 w-4 text-rose-500" aria-hidden="true" />
      <span className="leading-tight">
        <span className="block text-[12.5px] font-bold text-navy-800">{Number(value || 0).toFixed(2)}</span>
        <span className="block text-[9px] font-semibold text-slate-400">WPM</span>
      </span>
    </span>
  );
}

function RankModal({ row, onClose }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    resultService.getChapterRank(row.chapter_id, row.student_id)
      .then((d) => setInfo(d || { rank: null, total: 0 }))
      .catch(() => setError('Could not load the rank. Check your connection.'));
  }, [row]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" role="dialog" aria-modal="true" aria-label="Your rank">
      <div className="w-full max-w-xs rounded-xl bg-white p-6 text-center shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[14px] font-bold text-navy-800">
            <TrophyIcon className="h-4 w-4 text-amber-500" aria-hidden="true" /> Your Rank
          </p>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600">
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        {error ? <p className="mt-4 text-[12.5px] text-danger">{error}</p> :
          !info ? <p className="mt-6 flex justify-center"><Loader2Icon className="h-5 w-5 animate-spin text-primary" aria-label="Loading" /></p> :
            info.rank ? <>
              <p className="mt-4 font-display text-[36px] font-extrabold text-violet-600">#{info.rank}</p>
              <p className="mt-1 text-[12.5px] text-slate-500">out of {Number(info.total).toLocaleString()} participants</p>
            </> :
              <p className="mt-4 text-[12.5px] text-slate-500">
                {info.pending_until ? 'Rank will be shown after the live test session ends.' : 'No rank available for this test yet.'}
              </p>
        }
      </div>
    </div>
  );
}

const MyResults = () => {
  const navigate = useNavigate();
  const { kind: routeKind } = useParams();
  const [localKind, setLocalKind] = useState('typing');
  const kind = KINDS.some((k) => k.id === routeKind) ? routeKind : localKind;

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [examFilter, setExamFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [fetchError, setFetchError] = useState('');
  const [saveErrorBanner, setSaveErrorBanner] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rankFor, setRankFor] = useState(null);

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
        const data = await resultService.getUserResults(userId);
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

  // Speeds/accuracy re-derived exactly as the result screen shows them.
  const metricsById = useMemo(() => new Map(results.map((r) => {
    const m = computeResultMetrics(r);
    return [r.id, { ...m, qualified: isResultQualified(m, r.pattern_data) }];
  })), [results]);

  const switchKind = (id) => {
    setPage(1);
    if (routeKind) navigate(`/test-analysis/${id}`);
    else setLocalKind(id);
  };

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
        // Display only (rank, re-attempt, leaderboard links on the result page).
        examId: result.exam_id || result.exam?.id || null,
        chapterId: result.chapter_id || result.chapter?.id || null,
        studentId: result.student_id || null,
        ...(isSteno ? { typedText: result.user_input, referenceText: fullPassage } : {}),
      }
    });
  };

  const kindResults = results.filter((r) => ofKind(kind, r));

  // Exam options for this tab
  const examOptions = Array.from(new Set(kindResults.map((r) => r.exam?.name || 'Self Practice'))).sort();

  const filteredResults = kindResults.filter((r) => {
    if (typeFilter !== 'All' && testTypeOf(r) !== typeFilter) return false;
    if (startDate) {
      const filterStart = new Date(startDate);
      filterStart.setHours(0, 0, 0, 0);
      if (new Date(r.date_taken) < filterStart) return false;
    }
    if (endDate) {
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);
      if (new Date(r.date_taken) > filterEnd) return false;
    }
    if (examFilter !== 'All' && (r.exam?.name || 'Self Practice') !== examFilter) return false;
    return true;
  });

  // Attempt number per test, counted oldest → newest across all of this student's results.
  const attemptNo = {};
  const counter = {};
  [...results].sort((a, b) => new Date(a.date_taken) - new Date(b.date_taken)).forEach((r) => {
    const key = r.chapter_id || `self-${r.id}`;
    counter[key] = (counter[key] || 0) + 1;
    attemptNo[r.id] = counter[key];
  });

  // Results whose pattern releases them later stay hidden until then.
  const releaseOf = (r) => resultReleaseAt(timingOf(r.exam?.result_pattern), r.test_type, r.date_taken);
  const metricsOf = (r) => metricsById.get(r.id);
  const released = filteredResults.filter((r) => !releaseOf(r));
  const qualifiedCount = released.filter((r) => metricsOf(r).qualified).length;
  const avgNwpm = released.length
    ? Math.round(released.reduce((sum, r) => sum + (metricsOf(r).nwpm || 0), 0) / released.length)
    : 0;

  const pageCount = Math.max(1, Math.ceil(filteredResults.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstRow = (currentPage - 1) * pageSize;
  const pageRows = filteredResults.slice(firstRow, firstRow + pageSize);
  const resetPage = () => setPage(1);
  const hasFilters = startDate || endDate || examFilter !== 'All' || typeFilter !== 'All';
  const isSteno = kind !== 'typing';

  // Page buttons: 1 2 3 … last (with the current page always visible).
  const pageButtons = (() => {
    const set = new Set([1, 2, 3, currentPage - 1, currentPage, currentPage + 1, pageCount]);
    const list = [...set].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
    const out = [];
    list.forEach((p, i) => { if (i > 0 && p - list[i - 1] > 1) out.push('…' + p); out.push(p); });
    return out;
  })();

  const downloadReport = () => {
    const head = ['#', 'Course', 'Test Type', 'Exam Name', 'Test No.', 'Date', 'Time', 'Gross Speed (WPM)', 'Net Speed (WPM)', 'Accuracy (%)', 'Status'];
    const lines = filteredResults.map((r, i) => {
      const pending = releaseOf(r);
      const m = metricsOf(r);
      return [
        i + 1, r.mode || '', TYPE_LABEL[testTypeOf(r)], r.exam?.name || 'Self Practice', r.chapter?.chapter_no || '',
        fmtDate(r.date_taken), fmtTime(r.date_taken),
        pending ? '' : m.gwpm, pending ? '' : m.nwpm, pending ? '' : m.accuracy,
        pending ? `Result at ${releaseLabel(pending)}` : m.qualified ? 'Qualified' : 'Not Qualified',
      ];
    });
    const csv = [head, ...lines].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-analysis-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const viewButton = (r, compact = false) => {
    const releaseAt = releaseOf(r);
    return (
      <button
        type="button"
        disabled={!!releaseAt}
        title={releaseAt ? `Available at ${releaseLabel(releaseAt)}` : 'View detailed result'}
        aria-label="View details"
        onClick={() => handleViewResult(r)}
        className={compact
          ? 'flex shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[10.5px] font-semibold text-white disabled:opacity-40'
          : 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold text-primary transition-colors duration-150 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40'}>
        <EyeIcon className={compact ? 'h-3 w-3' : 'h-4 w-4'} aria-hidden="true" /> View
      </button>
    );
  };

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[22px] font-bold text-navy-800">
            <BarChart3Icon className="h-5 w-5 text-primary" aria-hidden="true" /> Test Analysis (Results)
          </h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            View detailed performance and analysis of typing and steno tests.
          </p>
          <div className="mt-2.5 flex gap-4 border-b border-slate-200" role="tablist">
            {KINDS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={kind === t.id}
                onClick={() => switchKind(t.id)}
                className={`border-b-2 pb-2 text-[13px] font-semibold transition-colors duration-150 ${
                  kind === t.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-navy-800'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2.5">
          {[
            ['Total Tests', filteredResults.length],
            ['Qualified', qualifiedCount],
            ['Avg WPM', avgNwpm],
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
          <label className="block min-w-[170px] flex-1">
            <span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Test Type</span>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); resetPage(); }}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-slate-700 outline-none focus:border-primary">
              {TEST_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="block min-w-[140px] flex-1">
            <span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); resetPage(); }}
              className="w-full rounded-md border border-slate-300 px-3 py-[7px] text-[12.5px] outline-none focus:border-primary" />
          </label>
          <label className="block min-w-[140px] flex-1">
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
            onClick={() => { setStartDate(''); setEndDate(''); setExamFilter('All'); setTypeFilter('All'); resetPage(); }}
            className="flex items-center gap-1.5 rounded-md border border-primary px-4 py-2 text-[12.5px] font-medium text-primary transition-colors duration-150 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40">
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" /> Clear Filters
          </button>
        </div>
      </section>

      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-[15px] font-bold text-navy-800">Detailed Results</h3>
          <p className="text-[11.5px] text-slate-500">
            {filteredResults.length > 0
              ? `Showing ${firstRow + 1} to ${Math.min(firstRow + pageSize, filteredResults.length)} of ${filteredResults.length} results`
              : 'No results'}
          </p>
        </div>
        <button
          type="button"
          onClick={downloadReport}
          disabled={filteredResults.length === 0}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-[12px] font-semibold text-navy-800 shadow-card transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          <DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" /> Download Report
        </button>
      </div>

      {loading ? <section className="rounded-xl border border-slate-200 bg-white shadow-card"><LoadingState>Loading your results...</LoadingState></section> :
        fetchError ?
          <p role="alert" className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center text-[13px] font-medium text-danger shadow-card">{fetchError}</p> :
          filteredResults.length === 0 ?
            <section className="rounded-xl border border-slate-200 bg-white shadow-card">
              <EmptyState>
                No tests found matching the selected criteria.
                {results.length > 0 && ' (Try another tab or clear the filters.)'}
              </EmptyState>
            </section> :
            isSteno ?
              <div className="space-y-3">
                {pageRows.map((r) => {
                  const releaseAt = releaseOf(r);
                  const m = metricsOf(r);
                  const words = Array.isArray(r.reference_words) ? r.reference_words.length : 0;
                  return (
                    <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
                      <div className="flex flex-wrap items-start justify-between gap-2.5">
                        <p className="flex min-w-0 flex-1 items-start gap-2 text-[13px] font-semibold text-navy-800">
                          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-50 text-primary">
                            <MicIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate" title={r.exam?.name || 'Self Practice'}>
                              {r.exam?.name || 'Self Practice'}
                              {r.chapter?.chapter_no ? ` — Dictation No. ${r.chapter.chapter_no}` : ''}
                            </span>
                            {r.chapter?.name && <span className="block truncate text-[11.5px] font-normal text-slate-500">{r.chapter.name}</span>}
                          </span>
                        </p>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          <TestTypePill type={testTypeOf(r)} />
                          {r.chapter_id &&
                            <button
                              type="button"
                              onClick={() => setRankFor(r)}
                              className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10.5px] font-semibold text-white transition-colors duration-150 hover:bg-amber-600">
                              <TrophyIcon className="h-3 w-3" aria-hidden="true" /> Rank
                            </button>
                          }
                          <button
                            type="button"
                            disabled={!!releaseAt}
                            title={releaseAt ? `Available at ${releaseLabel(releaseAt)}` : undefined}
                            onClick={() => handleViewResult(r)}
                            className="flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-[10.5px] font-semibold text-white transition-colors duration-150 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
                            <EyeIcon className="h-3 w-3" aria-hidden="true" /> View Result
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[11.5px] text-slate-500">
                        <span className="flex items-center gap-1"><HashIcon className="h-3 w-3 text-slate-400" aria-hidden="true" /> Attempt {attemptNo[r.id]}</span>
                        <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3 text-slate-400" aria-hidden="true" /> {fmtDate(r.date_taken)}, {fmtTime(r.date_taken)}</span>
                        {r.chapter?.steno_speed && <span className="flex items-center gap-1"><GaugeIcon className="h-3 w-3 text-amber-500" aria-hidden="true" /> Dict Speed {r.chapter.steno_speed}</span>}
                        {!releaseAt && <span className="flex items-center gap-1"><KeyboardIcon className="h-3 w-3 text-primary" aria-hidden="true" /> Typing {m.nwpm} WPM</span>}
                        {words > 0 && <span className="flex items-center gap-1"><TypeIcon className="h-3 w-3 text-slate-400" aria-hidden="true" /> Words {words}</span>}
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {releaseAt ?
                          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-[3px] text-[10.5px] font-semibold text-slate-600">
                            <ClockIcon className="h-3 w-3" aria-hidden="true" /> Result at {releaseLabel(releaseAt)}
                          </span> : <>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[10.5px] font-bold ${
                              m.accuracy >= 50 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                              <GaugeIcon className="h-3 w-3" aria-hidden="true" /> {Number(m.accuracy).toFixed(2)}%
                            </span>
                            <StatusPill qualified={m.qualified} />
                          </>
                        }
                      </div>
                    </div>
                  );
                })}
              </div> :
              <>
                <section className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-[12px]">
                      <thead className="bg-gradient-to-r from-primary to-indigo-600 text-[10.5px] font-semibold uppercase tracking-wide text-white">
                        <tr>
                          <th scope="col" className="px-4 py-3">#</th>
                          <th scope="col" className="px-4 py-3">Course</th>
                          <th scope="col" className="px-4 py-3">Test Type</th>
                          <th scope="col" className="px-4 py-3">Exam Name</th>
                          <th scope="col" className="px-4 py-3">Test No.</th>
                          <th scope="col" className="px-4 py-3">Test Date &amp; Time</th>
                          <th scope="col" className="px-4 py-3">Gross Speed (WPM)</th>
                          <th scope="col" className="px-4 py-3">Net Speed (WPM)</th>
                          <th scope="col" className="px-4 py-3">Accuracy (%)</th>
                          <th scope="col" className="px-4 py-3">Status</th>
                          <th scope="col" className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pageRows.map((r, i) => {
                          const releaseAt = releaseOf(r);
                          const m = metricsOf(r);
                          return (
                            <tr key={r.id} className="transition-colors duration-150 hover:bg-slate-50/70">
                              <td className="px-4 py-3 text-slate-400">{firstRow + i + 1}</td>
                              <td className="px-4 py-3 font-medium text-navy-800">{r.mode || '—'}</td>
                              <td className="px-4 py-3"><TestTypePill type={testTypeOf(r)} /></td>
                              <td className="px-4 py-3 text-slate-600">{r.exam?.name || 'Self Practice'}</td>
                              <td className="px-4 py-3 text-slate-600">{r.chapter?.chapter_no || '—'}</td>
                              <td className="px-4 py-3 text-slate-500">{fmtDate(r.date_taken)}, {fmtTime(r.date_taken)}</td>
                              {releaseAt ?
                                <td colSpan={4} className="px-4 py-3 text-[11.5px] font-medium text-slate-500">
                                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-[2px] font-semibold text-slate-600">
                                    <ClockIcon className="h-3 w-3" aria-hidden="true" /> Submitted — result at {releaseLabel(releaseAt)}
                                  </span>
                                </td> : <>
                                  <td className="px-4 py-3"><SpeedBadge value={m.gwpm} /></td>
                                  <td className="px-4 py-3"><SpeedBadge value={m.nwpm} /></td>
                                  <td className="px-4 py-3">
                                    <span className="mb-1 block text-[11.5px] font-semibold text-slate-600">{Number(m.accuracy).toFixed(2)}%</span>
                                    <span className="block h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                                      <span className={`block h-full rounded-full ${m.qualified ? 'bg-emerald-500' : 'bg-danger'}`} style={{ width: `${Math.min(100, Math.max(0, m.accuracy))}%` }} />
                                    </span>
                                  </td>
                                  <td className="px-4 py-3"><StatusPill qualified={m.qualified} /></td>
                                </>
                              }
                              <td className="px-4 py-3 text-right">{viewButton(r)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="space-y-3 md:hidden">
                  {pageRows.map((r) => {
                    const releaseAt = releaseOf(r);
                    const m = metricsOf(r);
                    return (
                      <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
                        <p className="mb-2 truncate text-[12.5px] font-semibold text-navy-800">
                          {r.exam?.name || 'Self Practice'}{r.chapter?.chapter_no ? ` · Test ${r.chapter.chapter_no}` : ''}
                        </p>
                        <div className="flex items-center gap-3">
                          {releaseAt ?
                            <span className="flex-1 text-[11.5px] text-slate-500">Result at {releaseLabel(releaseAt)}</span> : <>
                              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-center text-[10px] font-bold leading-tight ${
                                m.qualified ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                                {Number(m.nwpm).toFixed(m.nwpm < 10 ? 2 : 0)}<br />WPM
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100">
                                  <span className={`block h-full rounded-full ${m.qualified ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, Math.max(0, m.accuracy))}%` }} />
                                </span>
                                <p className="mt-1 text-[11px] font-semibold text-slate-600">{Number(m.accuracy).toFixed(1)}%</p>
                              </div>
                              <StatusPill qualified={m.qualified} />
                            </>
                          }
                          <div className="shrink-0 text-right">
                            <p className="text-[10.5px] text-slate-500">{fmtDate(r.date_taken)}</p>
                            <p className="text-[10px] text-slate-400">{fmtTime(r.date_taken)}</p>
                          </div>
                          {viewButton(r, true)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
      }

      {!loading && !fetchError && filteredResults.length > 0 &&
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <label className="flex items-center gap-2 text-[11.5px] text-slate-500">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); resetPage(); }}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11.5px] text-slate-600 outline-none">
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}
              className="grid h-7 w-7 place-items-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30">
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            {pageButtons.map((p) => (typeof p === 'string' ?
              <span key={p} className="grid h-7 w-7 place-items-center text-[11.5px] text-slate-400">…</span> :
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === currentPage ? 'page' : undefined}
                className={`grid h-7 min-w-[28px] place-items-center rounded-md px-1 text-[11.5px] font-semibold transition-colors duration-150 ${
                  p === currentPage ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {p}
              </button>
            ))}
            <button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}
              className="grid h-7 w-7 place-items-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30">
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      }

      <p className="mt-4 flex items-center gap-2 rounded-lg bg-primary-50 p-3 text-[11.5px] text-primary-700">
        <ZapIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {isSteno ? 'Tap View Result on any attempt to open its full detailed analysis report.' : 'Tap View on any row to open its full detailed analysis report.'}
      </p>

      {rankFor && <RankModal row={rankFor} onClose={() => setRankFor(null)} />}
    </div>
  );
};

export default MyResults;
