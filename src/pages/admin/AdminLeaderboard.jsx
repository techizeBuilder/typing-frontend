import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  CrownIcon, DownloadIcon, FileSpreadsheetIcon, FileTextIcon, FilterIcon, GaugeIcon, Loader2Icon, RefreshCwIcon, RotateCcwIcon, SearchIcon, TargetIcon,
  TrendingUpIcon, TrophyIcon, UsersIcon,
} from 'lucide-react';
import { examService, resultService } from '../../services/api';
import { StatCard } from '../../ui/StatCard';

const COURSES = ['Typing English', 'Typing Hindi', 'Steno English', 'Steno Hindi'];
const COURSE_COLORS = { 'Typing English': '#0D6EFD', 'Typing Hindi': '#198754', 'Steno English': '#F59E0B', 'Steno Hindi': '#6F42C1', 'Not set': '#94A3B8' };
const MEDALS = ['🥇', '🥈', '🥉'];
const selectCls = 'w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-primary';
const panelCls = 'rounded-xl border border-slate-200 bg-white p-4 shadow-card';

// Local YYYY-MM-DD for date inputs (en-CA formats as ISO, in local time).
const todayStr = () => new Date().toLocaleDateString('en-CA');
// The leaderboard only ever shows data up to the current date — never future dates.
const clampToToday = (d) => (d && d > todayStr() ? todayStr() : d);
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

// Admin leaderboard: each student's best attempt for the filters, ranked by Net Speed
// (re-derived on the server with the result-screen formula), then accuracy, then the
// earliest attempt. Defaults to today's Live Tests, as before.
const AdminLeaderboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState('');
  const [examFilter, setExamFilter] = useState('All');
  const [testType, setTestType] = useState('Live Test');
  const [course, setCourse] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [topN, setTopN] = useState(100);
  const [examNames, setExamNames] = useState([]);
  const reqId = useRef(0);

  useEffect(() => {
    examService.getExams().then((e) => setExamNames(Array.from(new Set((e || []).map((x) => x.name).filter(Boolean))).sort())).catch(() => {});
  }, []);

  const params = {
    from: clampToToday(dateFrom) || undefined, to: clampToToday(dateTo) || undefined, testType: testType || undefined, kind: kind || undefined,
    examName: examFilter !== 'All' ? examFilter : undefined, course: course || undefined, search: search.trim() || undefined, limit: topN,
  };
  const key = JSON.stringify(params);
  const load = async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const d = await resultService.getAdminLeaderboard(params);
      if (id === reqId.current) setData(d);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      if (id === reqId.current) setData({ participants: 0, top: [], by_course: [], exams: [] });
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  };
  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const examOptions = useMemo(() => Array.from(new Set([...examNames, ...(data?.exams || [])])).sort(), [examNames, data]);
  const ranked = data?.top || [];
  const participants = data?.participants || 0;
  const rangeLabel = dateFrom && dateTo
    ? (dateFrom === dateTo ? fmt(dateFrom) : `${fmt(dateFrom)} – ${fmt(dateTo)}`)
    : (dateFrom ? `from ${fmt(dateFrom)}` : dateTo ? `until ${fmt(dateTo)}` : 'all dates');
  const scope = [kind === 'steno' ? 'Steno' : kind === 'typing' ? 'Typing' : null, testType === 'Live Test' ? 'Live Tests' : testType ? 'Pre-load Tests' : 'All Tests',
    examFilter === 'All' ? 'All Exams' : examFilter, course, rangeLabel].filter(Boolean).join(' · ');
  const reset = () => { setKind(''); setExamFilter('All'); setTestType('Live Test'); setCourse(''); setSearch(''); setDateFrom(todayStr()); setDateTo(todayStr()); };

  const exportRows = () => ranked.map((r) => ({
    Rank: r.rank, 'Student Name': r.name, 'Login ID': r.user_id, Course: r.category || '', Exam: r.exam_name, 'Test No.': r.chapter_no,
    'Test Type': r.test_type, 'Test Date': r.date_taken ? new Date(r.date_taken).toLocaleDateString('en-IN') : '', 'Gross WPM': r.gwpm, 'Net WPM': r.nwpm, 'Accuracy (%)': r.accuracy,
  }));
  const downloadPdf = () => {
    if (ranked.length === 0) { alert('No leaderboard data to download for the current selection.'); return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(15); doc.text('Leaderboard', 14, 16);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`${scope} · Students appeared: ${participants}`, 14, 23);
    autoTable(doc, {
      startY: 28,
      head: [['Rank', 'Student Name', 'Login ID', 'Exam', 'Test No.', 'Type', 'Gross Speed (GWPM)', 'Net Speed (NWPM)', 'Accuracy']],
      body: ranked.map((r) => [`#${r.rank}`, r.name, r.user_id, r.exam_name, r.chapter_no, r.test_type, `${Math.round(r.gwpm)} WPM`, `${Math.round(r.nwpm)} WPM`, `${r.accuracy.toFixed(2)}%`]),
      styles: { fontSize: 9 }, headStyles: { fillColor: [11, 75, 204] },
    });
    doc.save(`leaderboard-${dateFrom || 'all'}_${dateTo || todayStr()}.pdf`);
  };
  const downloadExcel = () => {
    if (ranked.length === 0) { alert('No leaderboard data to download for the current selection.'); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows()), 'Leaderboard');
    XLSX.writeFile(wb, `leaderboard-${dateFrom || 'all'}_${dateTo || todayStr()}.xlsx`);
  };

  const maxCourse = Math.max(1, ...(data?.by_course || []).map((c) => c.count));

  return (
    <div className="nd">
      <div className="mb-4 flex flex-wrap items-start gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-600"><TrophyIcon className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <h2 className="font-display text-[24px] font-bold leading-tight text-navy-800">Leaderboard</h2>
            <p className="text-[12.5px] text-slate-500">Top performing students by net speed · {scope}</p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={load} className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50"><RefreshCwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Refresh</button>
          <button type="button" onClick={downloadPdf} disabled={loading || ranked.length === 0} className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-navy-800 hover:bg-slate-50 disabled:opacity-50"><DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" /> Download PDF</button>
          <button type="button" onClick={downloadExcel} disabled={loading || ranked.length === 0} className="flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 py-2 text-[12px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><FileSpreadsheetIcon className="h-3.5 w-3.5" aria-hidden="true" /> Export Leaderboard</button>
        </div>
      </div>

      <div role="tablist" className="mb-3 flex gap-5 border-b border-slate-200">
        {[['', 'All'], ['typing', 'Typing Leaderboard'], ['steno', 'Steno Leaderboard']].map(([v, label]) => (
          <button key={label} type="button" role="tab" aria-selected={kind === v} onClick={() => setKind(v)}
            className={`-mb-px border-b-2 pb-2 text-[13px] font-semibold ${kind === v ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-navy-800'}`}>{label}</button>
        ))}
      </div>

      <section className={`${panelCls} mb-4`}>
        <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-navy-800"><FilterIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Filter Leaderboard</h3>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Select Exam</span>
            <select aria-label="Filter by exam" value={examFilter} onChange={(e) => setExamFilter(e.target.value)} className={selectCls}><option value="All">All Exams (Overall)</option>{examOptions.map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Test Type</span>
            <select aria-label="Filter by test type" value={testType} onChange={(e) => setTestType(e.target.value)} className={selectCls}><option value="Live Test">Live Tests</option><option value="Pre-load Test">Pre-load Tests</option><option value="">All (Live / Pre-load)</option></select></label>
          <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Course / Type</span>
            <select aria-label="Filter by course" value={course} onChange={(e) => setCourse(e.target.value)} className={selectCls}><option value="">All Courses</option>{COURSES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">From</span>
            <input type="date" aria-label="From date" value={dateFrom} max={clampToToday(dateTo) || todayStr()} onChange={(e) => setDateFrom(clampToToday(e.target.value))} className={selectCls} /></label>
          <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">To</span>
            <input type="date" aria-label="To date" value={dateTo} min={dateFrom || undefined} max={todayStr()} onChange={(e) => setDateTo(clampToToday(e.target.value))} className={selectCls} /></label>
          <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Show</span>
            <select aria-label="How many" value={topN} onChange={(e) => setTopN(Number(e.target.value))} className={selectCls}>{[25, 50, 100].map((n) => <option key={n} value={n}>Top {n}</option>)}</select></label>
          <div className="flex items-end">
            <button type="button" onClick={reset} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50"><RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Reset</button>
          </div>
        </div>
      </section>

      <div className={`mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5 ${loading ? 'opacity-60' : ''}`}>
        <StatCard icon={<UsersIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Students Appeared" value={participants.toLocaleString('en-IN')} sub={`${data?.typing ?? 0} typing · ${data?.steno ?? 0} steno`} />
        <StatCard icon={<CrownIcon className="h-5 w-5" />} iconBg="#198754" label="Topper (Net WPM)" value={data?.topper?.name || '—'} sub={data?.topper ? `${data.topper.nwpm} WPM` : undefined} />
        <StatCard icon={<GaugeIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Highest Gross WPM" value={data?.highest_gwpm ?? 0} sub={data?.highest_gwpm_by ? `By ${data.highest_gwpm_by}` : undefined} />
        <StatCard icon={<TrendingUpIcon className="h-5 w-5" />} iconBg="#6F42C1" label="Highest Net WPM" value={data?.highest_nwpm ?? 0} sub={data?.topper ? `By ${data.topper.name}` : undefined} />
        <StatCard icon={<TargetIcon className="h-5 w-5" />} iconBg="#0EA5E9" label="Average Accuracy" value={`${data?.avg_accuracy ?? 0}%`} sub="Best attempt of each student" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3.5">
            <h3 className="flex items-center gap-2 text-[13px] font-bold text-navy-800"><TrophyIcon className="h-4 w-4 text-amber-500" aria-hidden="true" /> Top {topN} Students</h3>
            {participants > topN && <span className="text-[11.5px] text-slate-500">of {participants} appeared</span>}
            <span className="relative ml-auto block w-full sm:w-[260px]">
              <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student name, login ID, roll no..." aria-label="Search students" className={`${selectCls} pr-8`} />
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-600">
                <tr>{['Rank', 'Student Name', 'Course / Type', 'Exam Name', 'Test No.', 'Test Type', 'Test Date', 'Gross WPM', 'Net WPM', 'Accuracy (%)'].map((h) => <th key={h} scope="col" className="px-3 py-2.5">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[12px]">
                {loading && !data ? <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500"><Loader2Icon className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Loading leaderboard...</td></tr>
                  : ranked.length === 0 ? <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">No {testType === 'Live Test' ? 'Live Test ' : ''}records found for {rangeLabel}{examFilter !== 'All' ? ` for "${examFilter}"` : ''} yet.</td></tr>
                    : ranked.map((r) => (
                      <tr key={r.student_id} className={r.rank === 1 ? 'bg-amber-50/60' : r.rank === 2 ? 'bg-slate-50' : r.rank === 3 ? 'bg-orange-50/50' : 'hover:bg-slate-50/70'}>
                        <td className="px-3 py-2.5 font-bold text-navy-800">{r.rank <= 3 ? <span className="text-[16px]" aria-label={`Rank ${r.rank}`}>{MEDALS[r.rank - 1]}</span> : r.rank}</td>
                        <td className="px-3 py-2.5"><span className="block font-semibold text-navy-800">{r.name}</span><span className="font-mono text-[10.5px] text-slate-500">{r.user_id}{r.roll_no ? ` · ${r.roll_no}` : ''}</span></td>
                        <td className="px-3 py-2.5 text-[11px] text-primary-700">{r.category || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.exam_name}</td>
                        <td className="px-3 py-2.5 text-slate-600" title={r.chapter_name}>{r.chapter_no}</td>
                        <td className="px-3 py-2.5"><span className={`rounded px-2 py-[2px] text-[10.5px] font-medium ${r.test_type === 'Live' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{r.test_type}</span></td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{r.date_taken ? new Date(r.date_taken).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-700">{Math.round(r.gwpm)}</td>
                        <td className="px-3 py-2.5 font-bold text-primary-700">{Math.round(r.nwpm)}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.accuracy.toFixed(2)}%</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          <section className={panelCls}>
            <h3 className="mb-3 text-[13px] font-bold text-navy-800">Leaderboard by Category</h3>
            {(data?.by_course || []).length === 0 ? <p className="text-[12px] text-slate-400">No students for these filters.</p> : (
              <ul className="space-y-3">
                {data.by_course.map((c) => (
                  <li key={c.course}>
                    <p className="mb-1 flex text-[11.5px]"><span className="text-slate-600">{c.course}</span><span className="ml-auto font-semibold text-navy-800">{c.count}</span></p>
                    <span className="block h-1.5 rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${(c.count / maxCourse) * 100}%`, backgroundColor: COURSE_COLORS[c.course] || '#64748B' }} /></span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10.5px] text-slate-400">A student in several courses counts in each.</p>
          </section>
          <section className={panelCls}>
            <h3 className="mb-3 text-[13px] font-bold text-navy-800">Download Options</h3>
            <div className="space-y-2">
              <button type="button" onClick={downloadPdf} disabled={ranked.length === 0} className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-[12px] hover:border-primary disabled:opacity-50"><FileTextIcon className="h-4 w-4 text-danger" aria-hidden="true" /><span><b className="block text-navy-800">Download Leaderboard (PDF)</b><span className="text-[11px] text-slate-500">Top {Math.min(topN, ranked.length) || topN} students with details</span></span></button>
              <button type="button" onClick={downloadExcel} disabled={ranked.length === 0} className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-[12px] hover:border-primary disabled:opacity-50"><FileSpreadsheetIcon className="h-4 w-4 text-emerald-600" aria-hidden="true" /><span><b className="block text-navy-800">Export Leaderboard (Excel)</b><span className="text-[11px] text-slate-500">Same rows as the table</span></span></button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default AdminLeaderboard;
