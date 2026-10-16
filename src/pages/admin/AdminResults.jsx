import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3Icon, CheckCircle2Icon, DownloadIcon, EyeIcon, FileSpreadsheetIcon, FileTextIcon, FilterIcon, GaugeIcon, Loader2Icon, RefreshCwIcon, RotateCcwIcon,
  SlidersHorizontalIcon, TargetIcon, TrendingUpIcon, UsersIcon, XCircleIcon,
} from 'lucide-react';
import { urlParam } from '../../features/admin/urlParams';
import { resultService, examService, chapterService } from '../../services/api';
import { computeResultMetrics } from '../../utils/resultMetrics';
import Pagination from '../../components/Pagination';
import { StatCard } from '../../ui/StatCard';
import { Donut, LineChart } from '../../features/results/adminCharts';
import { isResultQualified } from '../../features/results/qualify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './Admin.css';

const COURSES = ['Typing English', 'Typing Hindi', 'Steno English', 'Steno Hindi'];
const COLUMNS = [
  ['date', 'Date'], ['name', 'Student Name'], ['username', 'Username'], ['course', 'Course'], ['mode', 'Mode'], ['type', 'Test Type'],
  ['exam', 'Exam'], ['chapter', 'Chapter No.'], ['nwpm', 'NWPM'], ['gwpm', 'GWPM'], ['accuracy', 'Accuracy'], ['errors', 'Errors'], ['result', 'Result'],
];
const COLS_KEY = 'admin_results_columns';
const BUCKET_COLORS = ['#198754', '#0D6EFD', '#F59E0B', '#DC3545'];
const LEVEL_COLORS = { Easy: '#198754', Moderate: '#F59E0B', Hard: '#DC3545', 'Not set': '#94A3B8' };
const selectCls = 'w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-primary';
const panelCls = 'rounded-xl border border-slate-200 bg-white p-4 shadow-card';
const fmtDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

const loadColumns = () => {
  try { const v = JSON.parse(localStorage.getItem(COLS_KEY) || 'null'); if (Array.isArray(v)) return v; } catch { /* default */ }
  return COLUMNS.map(([k]) => k);
};

// Group daily averages into Monday-based weeks (weighted by number of results).
function toWeeks(daily) {
  const weeks = {};
  daily.forEach((d) => {
    const dt = new Date(`${d.date}T00:00:00`);
    dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    const key = dt.toISOString().slice(0, 10);
    const w = (weeks[key] = weeks[key] || { count: 0, g: 0, n: 0, a: 0 });
    w.count += d.count; w.g += d.avg_gwpm * d.count; w.n += d.avg_nwpm * d.count; w.a += d.avg_accuracy * d.count;
  });
  return Object.keys(weeks).sort().map((k) => ({ date: k, avg_gwpm: +(weeks[k].g / weeks[k].count).toFixed(2), avg_nwpm: +(weeks[k].n / weeks[k].count).toFixed(2), avg_accuracy: +(weeks[k].a / weeks[k].count).toFixed(2) }));
}

const AdminResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [kind, setKind] = useState('');
  const [usernameSearch, setUsernameSearch] = useState(() => urlParam('search') || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');
  const [testTypeFilter, setTestTypeFilter] = useState('All');
  const [examFilter, setExamFilter] = useState('All');
  const [chapterFilter, setChapterFilter] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [exams, setExams] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [columns, setColumns] = useState(loadColumns);
  const [showColumns, setShowColumns] = useState(false);
  const [grouping, setGrouping] = useState('Daily');
  // Guards against out-of-order responses when filters/page change quickly.
  const fetchIdRef = useRef(0);
  const statsIdRef = useRef(0);

  // Exam names (filter dropdown) and test list (Select Test), fetched once.
  useEffect(() => {
    examService.getExams().then((e) => setExams(e || [])).catch(() => setExams([]));
    chapterService.getChapters(undefined, undefined, undefined, true).then((c) => setChapters(Array.isArray(c) ? c : [])).catch(() => {});
  }, []);
  const examOptions = useMemo(() => ['Practice', ...Array.from(new Set(exams.map((e) => e.name).filter(Boolean))).sort()], [exams]);
  const testOptions = useMemo(() => {
    const exam = exams.find((e) => e.name === examFilter);
    return chapters
      .filter((c) => (kind === 'steno' ? (c.font_group || '').includes('Steno') : kind === 'typing' ? !(c.font_group || '').includes('Steno') : true))
      .filter((c) => !exam || c.exam_id === exam.id || (Array.isArray(c.exam_ids) && c.exam_ids.includes(exam.id)))
      .sort((a, b) => String(a.chapter_no).localeCompare(String(b.chapter_no), undefined, { numeric: true }));
  }, [chapters, exams, examFilter, kind]);

  const filterParams = () => ({
    search: usernameSearch || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    course: courseFilter !== 'All' ? courseFilter : undefined,
    testType:
      testTypeFilter === 'Preloaded' ? 'Pre-load Test'
      : testTypeFilter === 'Live' ? 'Live Test'
      : undefined,
    examName: examFilter !== 'All' ? examFilter : undefined,
    kind: kind || undefined,
    chapterId: chapterFilter || undefined,
  });
  const filterKey = JSON.stringify(filterParams());

  const withMetrics = (rows) =>
    // Recompute NWPM/GWPM/accuracy from the stored raw data using the canonical
    // formula so the table matches the result detail view (the engine-stored
    // values can drift for typing results — see resultMetrics.js).
    (rows || []).map((r) => {
      const m = computeResultMetrics(r);
      return { ...r, _metrics: m, _qualified: isResultQualified(m, r.pattern_data) };
    });

  // Filtering + pagination happen SERVER-SIDE: only the visible page of rows is
  // downloaded (the old code pulled every result ever recorded — tens of MB).
  const fetchResults = async () => {
    const fetchId = ++fetchIdRef.current;
    try {
      setLoading(true);
      const data = await resultService.getResultsPage({ page, pageSize, ...filterParams() });
      if (fetchId !== fetchIdRef.current) return; // a newer request superseded this one
      setResults(withMetrics(data?.rows));
      setTotal(Number(data?.total) || 0);
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  };
  const fetchStats = async () => {
    const id = ++statsIdRef.current;
    try {
      setStatsLoading(true);
      const s = await resultService.getResultStats(filterParams());
      if (id === statsIdRef.current) setStats(s);
    } catch (err) {
      console.error('Error fetching result stats:', err);
    } finally {
      if (id === statsIdRef.current) setStatsLoading(false);
    }
  };
  // The username search is debounced so we don't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(fetchResults, usernameSearch ? 350 : 0);
    return () => clearTimeout(timer);
  }, [page, pageSize, filterKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = setTimeout(fetchStats, usernameSearch ? 500 : 0);
    return () => clearTimeout(timer);
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (setter) => (e) => { setter(e.target.value); setPage(1); };
  const clearFilters = () => {
    setUsernameSearch(''); setDateFrom(''); setDateTo(''); setCourseFilter('All'); setTestTypeFilter('All'); setExamFilter('All'); setChapterFilter(''); setPage(1);
  };
  const hasActiveFilter = usernameSearch || dateFrom || dateTo || courseFilter !== 'All' || testTypeFilter !== 'All' || examFilter !== 'All' || chapterFilter;

  const toggleColumn = (key) => setColumns((cols) => {
    const next = cols.includes(key) ? cols.filter((c) => c !== key) : [...cols, key];
    try { localStorage.setItem(COLS_KEY, JSON.stringify(next)); } catch { /* not saved */ }
    return next;
  });
  const show = (key) => columns.includes(key);

  const handleViewResult = async (row) => {
    // The results list is fetched without the chapter's full passage text (it
    // would bloat every row); pull the complete record for the detail view.
    let r = row;
    try {
      const full = await resultService.getResultById(row.id);
      if (full) r = full;
    } catch {
      // Offline / fetch failure — fall back to the list row; the passage then
      // falls back to reference_words below.
    }
    // Only steno results use the StenoDiff view (driven by typedText + referenceText).
    // For typing results these must stay unset so ResultScreen renders the full
    // TypingPassageReview with its Test Analysis / Mistake / Compare tabs — matching
    // what the student sees on their own result screen.
    const isSteno = (r.mode || '').toLowerCase().includes('steno');
    // Full uploaded passage so the "Original Passage" column shows the complete text,
    // not just the (possibly trimmed) reference_words the student reached.
    const fullPassage = r.chapter?.content_text || (r.reference_words ? r.reference_words.join(' ') : '');
    navigate('/result', {
      state: {
        returnTo: '/admin/results',
        gwpm: r.gwpm,
        nwpm: r.nwpm,
        accuracy: r.accuracy,
        fullErrors: r.full_errors,
        halfErrors: r.half_errors,
        totalStrokes: r.total_strokes,
        timeElapsed: r.time_elapsed,
        testDurationMinutes: r.exam?.test_time_minutes || undefined,
        exam_name: r.exam ? r.exam.name : 'Practice Mode',
        chapter_no: r.chapter?.chapter_no || null,
        date_taken: r.date_taken,
        studentName: r.user ? (r.user.name || r.user.user_id) : '—',
        rollNo: r.user ? r.user.user_id : '—',
        mode: r.mode,
        userInput: r.user_input,
        referenceWords: r.reference_words || [],
        wordStatuses: r.word_statuses || [],
        pattern: r.pattern_data,
        originalPassage: fullPassage,
        ...(isSteno ? { typedText: r.user_input, referenceText: fullPassage } : {}),
      },
    });
  };

  // Exports cover ALL rows matching the current filters, not just the visible
  // page — fetched on demand so the heavy raw data is only downloaded when the
  // admin actually exports.
  const fetchAllFiltered = async () => {
    const data = await resultService.getResultsPage({ page: 1, pageSize: 0, ...filterParams() });
    return withMetrics(data?.rows);
  };

  const getExportRows = (rows) =>
    rows.map((r) => ({
      Date: r.date_taken ? new Date(r.date_taken).toLocaleDateString('en-IN') : '—',
      'Student Name': r.user?.name || '—',
      Username: r.user?.user_id || '—',
      Course: r.user?.category || '—',
      Mode: r.mode || 'Typing',
      'Test Type': r.test_type === 'Live Test' ? 'Live' : r.test_type === 'Pre-load Test' ? 'Preloaded' : '—',
      Exam: r.exam?.name || 'Practice',
      'Chapter No.': r.chapter?.chapter_no ? `#${r.chapter.chapter_no}` : '—',
      NWPM: r._metrics ? r._metrics.nwpm : r.nwpm,
      GWPM: r._metrics ? r._metrics.gwpm : r.gwpm,
      'Accuracy (%)': r._metrics ? r._metrics.accuracy : r.accuracy,
      'Full Errors': r._metrics ? r._metrics.fullErrors : (r.full_errors || 0),
      'Half Errors': r._metrics ? r._metrics.halfErrors : (r.half_errors || 0),
      Result: r._qualified ? 'Qualified' : 'Not Qualified',
    }));

  const exportExcel = async () => {
    const rows = getExportRows(await fetchAllFiltered());
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `results_export_${Date.now()}.xlsx`);
  };

  const exportPDF = async () => {
    const rows = getExportRows(await fetchAllFiltered());
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(13);
    doc.text('Typing & Steno Results', 40, 36);
    doc.setFontSize(9);
    doc.text(`Exported: ${new Date().toLocaleString('en-IN')}  |  Total: ${rows.length} records`, 40, 52);
    autoTable(doc, {
      startY: 65,
      head: [Object.keys(rows[0] || {})],
      body: rows.map(Object.values),
      styles: { fontSize: 7.5, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });
    doc.save(`results_export_${Date.now()}.pdf`);
  };

  // Summary report: the statistics on one PDF page.
  const exportSummary = () => {
    if (!stats) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const f = filterParams();
    doc.setFontSize(14); doc.text('Test Analysis — Summary Report', 40, 40);
    doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, 40, 56);
    const scope = [kind ? (kind === 'steno' ? 'Steno' : 'Typing') : 'All results', f.examName, f.course, f.testType, f.from && `from ${f.from}`, f.to && `to ${f.to}`, f.search && `user "${f.search}"`].filter(Boolean).join(' · ');
    doc.text(`Filters: ${scope}`, 40, 70);
    const pct = (n) => (stats.total ? `${((n / stats.total) * 100).toFixed(1)}%` : '—');
    autoTable(doc, { startY: 84, head: [['Measure', 'Value']], body: [
      ['Total appeared', stats.total], ['Qualified', `${stats.qualified} (${pct(stats.qualified)})`], ['Not qualified', `${stats.not_qualified} (${pct(stats.not_qualified)})`],
      ['Average gross WPM', stats.avg_gwpm], ['Average net WPM', stats.avg_nwpm], ['Average accuracy', `${stats.avg_accuracy}%`],
      ['Typing / Steno results', `${stats.typing} / ${stats.steno}`], ['Live / Pre-load results', `${stats.live} / ${stats.preload}`],
    ], headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 9 } });
    autoTable(doc, { head: [['Score (net WPM)', 'Results']], body: stats.buckets.map((b) => [b.label, `${b.count} (${pct(b.count)})`]), headStyles: { fillColor: [25, 135, 84] }, styles: { fontSize: 9 } });
    if (stats.difficulty.length) autoTable(doc, { head: [['Difficulty', 'Results', 'Avg net WPM']], body: stats.difficulty.map((d) => [d.level, d.count, d.avg_nwpm]), headStyles: { fillColor: [111, 66, 193] }, styles: { fontSize: 9 } });
    doc.save(`results_summary_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const s = stats || {};
  const share = (n) => (s.total ? `${((n / s.total) * 100).toFixed(1)}%` : '—');
  const trend = (grouping === 'Weekly' ? toWeeks(s.daily || []) : (s.daily || [])).slice(-31).map((d) => ({ label: fmtDay(d.date), gross: d.avg_gwpm, net: d.avg_nwpm, accuracy: d.avg_accuracy }));
  const bucketParts = (s.buckets || []).map((b, i) => ({ label: b.label, value: b.count, color: BUCKET_COLORS[i] }));
  const levelParts = (s.difficulty || []).map((d) => ({ label: d.level, value: d.count, color: LEVEL_COLORS[d.level] || '#94A3B8', avg: d.avg_nwpm }));

  return (
    <div className="nd">
      <div className="mb-4 flex flex-wrap items-start gap-4">
        <div>
          <h2 className="font-display text-[24px] font-bold leading-tight text-navy-800">Test Analysis (Results)</h2>
          <p className="text-[12.5px] text-slate-500">View detailed performance and analysis of typing and steno tests.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => { fetchResults(); fetchStats(); }} className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50"><RefreshCwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Refresh</button>
        </div>
      </div>

      <div role="tablist" className="mb-3 flex gap-5 border-b border-slate-200">
        {[['', 'All Results'], ['typing', 'Typing'], ['steno', 'Steno']].map(([v, label]) => (
          <button key={label} type="button" role="tab" aria-selected={kind === v} onClick={() => { setKind(v); setChapterFilter(''); setPage(1); }}
            className={`-mb-px border-b-2 pb-2 text-[13px] font-semibold ${kind === v ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-navy-800'}`}>{label}</button>
        ))}
      </div>

      <section className={`${panelCls} mb-4`}>
        <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-navy-800"><FilterIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Filter Results</h3>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
          <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Select Exam</span>
            <select aria-label="Filter by exam" value={examFilter} onChange={(e) => { setExamFilter(e.target.value); setChapterFilter(''); setPage(1); }} className={selectCls}><option value="All">All Exams</option>{examOptions.map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Select Test</span>
            <select aria-label="Filter by test" value={chapterFilter} onChange={change(setChapterFilter)} className={selectCls}><option value="">All Tests</option>{testOptions.map((c) => <option key={c.id} value={c.id}>#{c.chapter_no}{c.name ? ` — ${c.name}` : ''}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Course</span>
            <select aria-label="Filter by course" value={courseFilter} onChange={change(setCourseFilter)} className={selectCls}><option value="All">All Courses</option>{COURSES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Test Type</span>
            <select aria-label="Filter by test type" value={testTypeFilter} onChange={change(setTestTypeFilter)} className={selectCls}><option value="All">All (Live / Preloaded)</option><option value="Preloaded">Preloaded</option><option value="Live">Live</option></select></label>
          <label className="block lg:col-span-2"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">User Name / Login ID</span>
            <input type="search" placeholder="Search by name or login ID..." value={usernameSearch} onChange={change(setUsernameSearch)} aria-label="Search by user" className={selectCls} /></label>
          <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Date From</span>
            <input type="date" aria-label="Date from" value={dateFrom} onChange={change(setDateFrom)} className={selectCls} /></label>
          <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Date To</span>
            <input type="date" aria-label="Date to" value={dateTo} onChange={change(setDateTo)} className={selectCls} /></label>
        </div>
        {hasActiveFilter && <button type="button" onClick={clearFilters} className="mt-3 flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-medium text-danger hover:bg-rose-100"><RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Reset Filters</button>}
      </section>

      <div className={`mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-6 ${statsLoading ? 'opacity-60' : ''}`} aria-busy={statsLoading}>
        <StatCard icon={<UsersIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Total Appeared" value={(s.total ?? 0).toLocaleString('en-IN')} sub={`${s.typing ?? 0} typing · ${s.steno ?? 0} steno`} />
        <StatCard icon={<CheckCircle2Icon className="h-5 w-5" />} iconBg="#198754" label="Qualified" value={(s.qualified ?? 0).toLocaleString('en-IN')} sub={share(s.qualified)} subClass="text-emerald-700" />
        <StatCard icon={<XCircleIcon className="h-5 w-5" />} iconBg="#DC3545" label="Not Qualified" value={(s.not_qualified ?? 0).toLocaleString('en-IN')} sub={share(s.not_qualified)} subClass="text-danger" />
        <StatCard icon={<GaugeIcon className="h-5 w-5" />} iconBg="#0EA5E9" label="Average Gross WPM" value={s.avg_gwpm ?? 0} />
        <StatCard icon={<TrendingUpIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Average Net WPM" value={s.avg_nwpm ?? 0} />
        <StatCard icon={<TargetIcon className="h-5 w-5" />} iconBg="#6F42C1" label="Average Accuracy" value={`${s.avg_accuracy ?? 0}%`} />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr]">
        <section className={panelCls}>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[13px] font-bold text-navy-800">Performance Overview</h3>
            <select aria-label="Group by" value={grouping} onChange={(e) => setGrouping(e.target.value)} className="ml-auto rounded-md border border-slate-300 px-2 py-1 text-[11.5px]"><option>Daily</option><option>Weekly</option></select>
          </div>
          <div className="mb-1 flex gap-4 text-[11px] text-slate-600">
            {[['#0D6EFD', 'Gross WPM'], ['#198754', 'Net WPM'], ['#F59E0B', 'Accuracy (%)']].map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ backgroundColor: c }} />{l}</span>)}
          </div>
          {trend.length === 0 ? <p className="py-10 text-center text-[12px] text-slate-400">No results for these filters.</p>
            : <LineChart points={trend} series={[{ key: 'gross', label: 'Gross WPM', color: '#0D6EFD' }, { key: 'net', label: 'Net WPM', color: '#198754' }, { key: 'accuracy', label: 'Accuracy', color: '#F59E0B' }]} />}
          {(s.daily || []).length > 31 && grouping === 'Daily' && <p className="text-[10.5px] text-slate-400">Showing the last 31 days — switch to Weekly for longer ranges.</p>}
        </section>
        <section className={panelCls}>
          <h3 className="mb-3 text-[13px] font-bold text-navy-800">Score Distribution (Net WPM)</h3>
          <div className="flex items-center gap-4">
            <Donut parts={bucketParts} label="Score distribution" />
            <ul className="flex-1 space-y-1.5 text-[11.5px]">
              {bucketParts.map((p) => <li key={p.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.color }} /><span className="text-slate-600">{p.label}</span><span className="ml-auto font-medium text-navy-800">{p.value} <span className="text-slate-400">({share(p.value)})</span></span></li>)}
            </ul>
          </div>
        </section>
        <section className={panelCls}>
          <h3 className="mb-3 text-[13px] font-bold text-navy-800">Summary by Difficulty</h3>
          {levelParts.length === 0 ? <p className="py-6 text-center text-[12px] text-slate-400">No results for these filters.</p> : (
            <div className="flex items-center gap-4">
              <Donut parts={levelParts} label="Results by difficulty" />
              <ul className="flex-1 space-y-1.5 text-[11.5px]">
                {levelParts.map((p) => <li key={p.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.color }} /><span className="text-slate-600">{p.label}</span><span className="ml-auto text-right font-medium text-navy-800">{p.value}<span className="block text-[10px] font-normal text-slate-400">avg {p.avg} WPM</span></span></li>)}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_250px]">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="relative flex flex-wrap items-center gap-2 border-b border-slate-100 p-3.5">
            <h3 className="text-[13px] font-bold text-navy-800">Detailed Results</h3>
            <span className="text-[12px] text-slate-500">Showing <b>{results.length}</b> of <b>{total}</b>{hasActiveFilter || kind ? ' (filtered)' : ''}</span>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => setShowColumns((v) => !v)} aria-expanded={showColumns} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-[12px] text-slate-600 hover:bg-slate-50"><SlidersHorizontalIcon className="h-3.5 w-3.5" aria-hidden="true" /> Show / Hide Columns</button>
              <button type="button" onClick={exportExcel} disabled={total === 0} className="flex items-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1.5 text-[12px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><FileSpreadsheetIcon className="h-3.5 w-3.5" aria-hidden="true" /> Excel</button>
              <button type="button" onClick={exportPDF} disabled={total === 0} className="flex items-center gap-1.5 rounded-md border border-rose-300 px-3 py-1.5 text-[12px] font-medium text-danger hover:bg-rose-50 disabled:opacity-50"><FileTextIcon className="h-3.5 w-3.5" aria-hidden="true" /> PDF</button>
            </div>
            {showColumns &&
              <div className="absolute right-3.5 top-full z-20 mt-1 grid w-[320px] grid-cols-2 gap-1.5 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                {COLUMNS.map(([k, l]) => <label key={k} className="flex items-center gap-1.5 text-[12px] text-slate-700"><input type="checkbox" checked={show(k)} onChange={() => toggleColumn(k)} className="h-3.5 w-3.5 accent-primary" /> {l}</label>)}
              </div>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-600">
                <tr>{COLUMNS.filter(([k]) => show(k)).map(([k, l]) => <th key={k} scope="col" className="px-3 py-2.5">{l}</th>)}<th scope="col" className="px-3 py-2.5">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[12px]">
                {loading ? <tr><td colSpan={columns.length + 1} className="px-3 py-8 text-center text-slate-500"><Loader2Icon className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Loading results...</td></tr>
                  : results.length === 0 ? <tr><td colSpan={columns.length + 1} className="px-3 py-8 text-center text-slate-400">No results found matching the selected filters.</td></tr>
                    : results.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        {show('date') && <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{r.date_taken ? new Date(r.date_taken).toLocaleDateString('en-IN') : '—'}</td>}
                        {show('name') && <td className="px-3 py-2.5 font-semibold text-navy-800">{r.user ? (r.user.name || '—') : '—'}</td>}
                        {show('username') && <td className="px-3 py-2.5"><span className="rounded bg-primary-50 px-1.5 py-[2px] font-mono text-[11px] font-semibold text-primary-700">{r.user ? (r.user.user_id || '—') : '—'}</span></td>}
                        {show('course') && <td className="px-3 py-2.5">{r.user?.category ? <span className="rounded bg-indigo-50 px-1.5 py-[2px] text-[10.5px] font-medium text-indigo-700">{r.user.category}</span> : <span className="text-slate-400">—</span>}</td>}
                        {show('mode') && <td className="px-3 py-2.5"><span className={`rounded px-2 py-[2px] text-[10.5px] font-medium ${r.mode?.toLowerCase().includes('steno') ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'}`}>{r.mode || 'Typing'}</span></td>}
                        {show('type') && <td className="px-3 py-2.5">{r.test_type ? <span className={`rounded px-2 py-[2px] text-[10.5px] font-medium ${r.test_type === 'Live Test' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{r.test_type === 'Live Test' ? 'Live' : 'Preloaded'}</span> : <span className="text-slate-400">—</span>}</td>}
                        {show('exam') && <td className="px-3 py-2.5 text-slate-700">{r.exam ? r.exam.name : <span className="text-slate-400">Practice</span>}</td>}
                        {show('chapter') && <td className="px-3 py-2.5">{r.chapter?.chapter_no ? <span className="font-semibold text-primary-700" title={r.chapter.name || ''}>#{r.chapter.chapter_no}</span> : <span className="text-slate-400">—</span>}</td>}
                        {show('nwpm') && <td className="px-3 py-2.5 font-bold text-navy-800">{r._metrics ? r._metrics.nwpm : r.nwpm}</td>}
                        {show('gwpm') && <td className="px-3 py-2.5 text-slate-700">{r._metrics ? r._metrics.gwpm : r.gwpm}</td>}
                        {show('accuracy') && <td className="px-3 py-2.5 text-slate-700">{r._metrics ? r._metrics.accuracy : r.accuracy}%</td>}
                        {show('errors') && <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{r._metrics ? r._metrics.fullErrors : (r.full_errors || 0)}F / {r._metrics ? r._metrics.halfErrors : (r.half_errors || 0)}H</td>}
                        {show('result') && <td className="px-3 py-2.5"><span className={`rounded px-2 py-[2px] text-[10.5px] font-semibold ${r._qualified ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{r._qualified ? 'Qualified' : 'Not Qualified'}</span></td>}
                        <td className="px-3 py-2.5"><button type="button" onClick={() => handleViewResult(r)} className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-primary-700"><EyeIcon className="h-3.5 w-3.5" aria-hidden="true" /> View</button></td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-3.5 pb-1 pt-3">
            <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(p) => { setPageSize(p); setPage(1); }} />
          </div>
        </section>

        <aside className={`${panelCls} h-fit`}>
          <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-navy-800"><DownloadIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Download Reports</h3>
          <ul className="space-y-2 text-[12px]">
            <li><button type="button" onClick={exportSummary} disabled={!stats || !stats.total} className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left hover:border-primary disabled:opacity-50"><BarChart3Icon className="h-4 w-4 text-primary" aria-hidden="true" /><span><b className="block text-navy-800">Summary Report</b><span className="text-[11px] text-slate-500">Cards and charts as PDF</span></span></button></li>
            <li><button type="button" onClick={exportExcel} disabled={total === 0} className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left hover:border-primary disabled:opacity-50"><FileSpreadsheetIcon className="h-4 w-4 text-emerald-600" aria-hidden="true" /><span><b className="block text-navy-800">Detailed Results (Excel)</b><span className="text-[11px] text-slate-500">Every matching result</span></span></button></li>
            <li><button type="button" onClick={exportPDF} disabled={total === 0} className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left hover:border-primary disabled:opacity-50"><FileTextIcon className="h-4 w-4 text-danger" aria-hidden="true" /><span><b className="block text-navy-800">Detailed Results (PDF)</b><span className="text-[11px] text-slate-500">Every matching result</span></span></button></li>
          </ul>
          <p className="mt-3 text-[10.5px] text-slate-400">Reports follow the filters and tab above. Scores use the same formula as the result screen.</p>
        </aside>
      </div>
    </div>
  );
};

export default AdminResults;
