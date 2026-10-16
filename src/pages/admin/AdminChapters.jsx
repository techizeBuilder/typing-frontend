import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  BadgeCheckIcon, CircleOffIcon, CopyIcon, FileSpreadsheetIcon, HeadphonesIcon, LayersIcon, Loader2Icon, PencilIcon, PlusIcon, PowerIcon,
  RadioIcon, RotateCcwIcon, SearchIcon, Trash2Icon, XIcon, ZapIcon,
} from 'lucide-react';
import { chapterService, examService } from '../../services/api';
import Pagination from '../../components/Pagination';
import { StatCard } from '../../ui/StatCard';
import { urlParam } from '../../features/admin/urlParams';
import { FONT_GROUPS, LIVE, PRELOAD, chapterExamIds, chapterExamNames, errorText, isStenoGroup } from '../../features/tests/testData';
import './Admin.css';

const selectCls = 'w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-primary';
const LEVEL_TONE = { Easy: 'bg-emerald-50 text-emerald-700', Moderate: 'bg-amber-50 text-amber-700', Hard: 'bg-rose-50 text-rose-700' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const dayKey = (d) => new Date(d).toISOString().split('T')[0];

const AdminChapters = () => {
  const location = useLocation();
  const [chapters, setChapters] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(() => location.state?.notice || '');
  const [tab, setTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState(() => urlParam('search') || '');
  const [kindFilter, setKindFilter] = useState('All');
  const [examFilter, setExamFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [fontGroupFilter, setFontGroupFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchChapters = async () => {
    try {
      const data = await chapterService.getChapters();
      // Newest chapters first
      setChapters([...data].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
    try {
      const examData = await examService.getExams();
      setExams(Array.isArray(examData) ? examData : []);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };
  useEffect(() => { fetchChapters(); }, []);

  const examTime = useMemo(() => Object.fromEntries(exams.map((e) => [e.id, e.test_time_minutes])), [exams]);
  const durationOf = (c) => {
    const mins = chapterExamIds(c).map((id) => examTime[id]).filter(Boolean);
    if (mins.length === 0) return '—';
    const lo = Math.min(...mins); const hi = Math.max(...mins);
    return lo === hi ? `${lo} Min` : `${lo}–${hi} Min`;
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return chapters
      .filter((c) => tab === 'All' || c.test_type === tab)
      .filter((c) => kindFilter === 'All' || (kindFilter === 'Steno') === isStenoGroup(c.font_group))
      .filter((c) => examFilter === 'All' || chapterExamIds(c).includes(examFilter))
      .filter((c) => difficultyFilter === 'All' || (c.difficulty || '') === difficultyFilter)
      .filter((c) => fontGroupFilter === 'All' || c.font_group === fontGroupFilter)
      .filter((c) => statusFilter === 'All' || (statusFilter === 'Active') === (c.is_active !== false))
      .filter((c) => !filterDate || dayKey(c.test_date) === filterDate)
      .filter((c) => !q || [c.chapter_no, c.name, c.font_group, c.description, ...chapterExamNames(c)].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [chapters, tab, kindFilter, examFilter, difficultyFilter, fontGroupFilter, statusFilter, filterDate, searchTerm]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleIds = paged.map((c) => c.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const counts = {
    total: chapters.length,
    live: chapters.filter((c) => c.test_type === LIVE).length,
    preload: chapters.filter((c) => c.test_type !== LIVE).length,
    active: chapters.filter((c) => c.is_active !== false).length,
    inactive: chapters.filter((c) => c.is_active === false).length,
  };

  const filterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };
  const resetFilters = () => { setSearchTerm(''); setKindFilter('All'); setExamFilter('All'); setDifficultyFilter('All'); setFontGroupFilter('All'); setStatusFilter('All'); setFilterDate(''); setPage(1); };
  const toggleAll = () => setSelectedIds((prev) => (allSelected ? prev.filter((id) => !visibleIds.includes(id)) : [...new Set([...prev, ...visibleIds])]));
  const toggleOne = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete test ${c.chapter_no}${c.name ? ` (${c.name})` : ''}? This cannot be undone.`)) return;
    try {
      await chapterService.deleteChapter(c.id);
      setSelectedIds((prev) => prev.filter((sid) => sid !== c.id));
      fetchChapters();
    } catch (err) { alert('Error deleting test: ' + errorText(err, 'failed')); }
  };
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected chapter(s)? This cannot be undone.`)) return;
    try {
      await Promise.all(selectedIds.map((id) => chapterService.deleteChapter(id)));
      setSelectedIds([]);
      fetchChapters();
    } catch (err) {
      alert('Error deleting some chapters: ' + err.message);
    }
  };
  const toggleActive = async (c) => {
    try {
      await chapterService.updateChapter(c.id, { is_active: c.is_active === false });
      fetchChapters();
    } catch (err) {
      alert('Could not change the test status: ' + errorText(err, 'failed'));
    }
  };

  const exportExcel = () => {
    const rows = filtered.map((c) => ({
      'Test ID': c.chapter_no, Title: c.name || '', Type: isStenoGroup(c.font_group) ? 'Steno' : 'Typing', Mode: c.test_type,
      Exams: chapterExamNames(c).join(', '), Level: c.difficulty || '', 'Font Group': c.font_group, Words: c.word_count ?? '',
      'Steno Speed': isStenoGroup(c.font_group) ? c.steno_speed ?? '' : '', Audio: c.audio_url ? 'Yes' : '', Duration: durationOf(c),
      'Test Date': dayKey(c.test_date), Status: c.is_active === false ? 'Inactive' : 'Active', 'Created On': c.created_at ? dayKey(c.created_at) : '', Description: c.description || '',
    }));
    if (rows.length === 0) { alert('No tests match the current filters.'); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Tests');
    XLSX.writeFile(wb, `tests_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Old links (?new=1) open the Add New Test page.
  if (urlParam('new') === '1') return <Navigate to="/admin/content/new" replace />;

  return (
    <div className="nd">
      <div className="mb-4 flex flex-wrap items-start gap-4">
        <div>
          <h2 className="font-display text-[24px] font-bold leading-tight text-navy-800">Manage Test (Live / Preload)</h2>
          <p className="text-[12.5px] text-slate-500">View, manage, edit, activate/inactivate or delete tests. Use filters to find specific tests quickly.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link to="/admin/content/new" className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700">
            <PlusIcon className="h-4 w-4" aria-hidden="true" /> Add New Test (Live / Preload)
          </Link>
        </div>
      </div>

      {notice && <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
        <BadgeCheckIcon className="h-4 w-4" aria-hidden="true" /> {notice}
        <button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="ml-auto"><XIcon className="h-4 w-4" /></button>
      </p>}

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<LayersIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Total Tests" value={counts.total.toLocaleString('en-IN')} sub="All tests in system" />
        <StatCard icon={<ZapIcon className="h-5 w-5" />} iconBg="#198754" label="Live Tests" value={counts.live.toLocaleString('en-IN')} sub="Real-time exams" />
        <StatCard icon={<RadioIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Preload Tests" value={counts.preload.toLocaleString('en-IN')} sub="Practice / pre-load" />
        <StatCard icon={<BadgeCheckIcon className="h-5 w-5" />} iconBg="#6F42C1" label="Active Tests" value={counts.active.toLocaleString('en-IN')} sub="Visible to students" />
        <StatCard icon={<CircleOffIcon className="h-5 w-5" />} iconBg="#DC3545" label="Inactive Tests" value={counts.inactive.toLocaleString('en-IN')} sub="Hidden from students" />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-card">
        <div role="tablist" className="flex gap-5 border-b border-slate-100 px-4 pt-3">
          {[['All', 'All Tests', counts.total], [LIVE, 'Live Tests', counts.live], [PRELOAD, 'Preload Tests', counts.preload]].map(([v, label, n]) => (
            <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => { setTab(v); setPage(1); }}
              className={`-mb-px border-b-2 pb-2.5 text-[12.5px] font-semibold ${tab === v ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-navy-800'}`}>
              {label} <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[10.5px] text-slate-600">{n}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-2.5 border-b border-slate-100 p-3.5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
          <label className="block lg:col-span-2"><span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Search</span>
            <span className="relative block">
              <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input type="search" value={searchTerm} onChange={filterChange(setSearchTerm)} placeholder="Test ID, title, exam, keyword..." aria-label="Search tests" className={`${selectCls} pr-8`} />
            </span></label>
          <label className="block"><span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Test Type</span>
            <select aria-label="Filter by test type" value={kindFilter} onChange={filterChange(setKindFilter)} className={selectCls}><option value="All">-- Test Type --</option><option value="Typing">Typing</option><option value="Steno">Steno</option></select></label>
          <label className="block"><span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Category / Exam</span>
            <select aria-label="Filter by exam" value={examFilter} onChange={filterChange(setExamFilter)} className={selectCls}><option value="All">-- Category / Exam --</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Difficulty</span>
            <select aria-label="Filter by difficulty" value={difficultyFilter} onChange={filterChange(setDifficultyFilter)} className={selectCls}><option value="All">-- Difficulty Level --</option>{['Easy', 'Moderate', 'Hard'].map((d) => <option key={d}>{d}</option>)}<option value="">Not set</option></select></label>
          <label className="block"><span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Font Group</span>
            <select aria-label="Filter by font group" value={fontGroupFilter} onChange={filterChange(setFontGroupFilter)} className={selectCls}><option value="All">-- Font Group --</option>{FONT_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Status</span>
            <select aria-label="Filter by status" value={statusFilter} onChange={filterChange(setStatusFilter)} className={selectCls}><option value="All">-- Status --</option><option>Active</option><option>Inactive</option></select></label>
          <label className="block"><span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Test Date</span>
            <input type="date" aria-label="Filter by test date" value={filterDate} onChange={filterChange(setFilterDate)} className={selectCls} /></label>
          <div className="flex items-end">
            <button type="button" onClick={resetFilters} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50"><RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Reset Filters</button>
          </div>
        </div>

        {selectedIds.length > 0 &&
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-rose-50 px-3.5 py-2 text-[12.5px] text-rose-800">
            <b>{selectedIds.length}</b> selected
            <button type="button" onClick={handleBulkDelete} className="rounded-md bg-danger px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90">Delete Selected ({selectedIds.length})</button>
            <button type="button" onClick={() => setSelectedIds([])} className="text-[12px] underline">Clear selection</button>
          </div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2.5"><input type="checkbox" aria-label="Select all on page" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 accent-primary" /></th>
                {['Test ID', 'Test Title', 'Type / Mode', 'Category / Exam', 'Level', 'Font Group', 'Words / Dictation', 'Duration', 'Test Date', 'Status', 'Actions'].map((h) => <th key={h} scope="col" className="px-3 py-2.5">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {loading ? <tr><td colSpan={12} className="px-3 py-8 text-center text-slate-500"><Loader2Icon className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Loading...</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={12} className="px-3 py-8 text-center text-slate-500">No tests match the current filters.</td></tr>
                  : paged.map((c) => {
                    const steno = isStenoGroup(c.font_group);
                    const names = chapterExamNames(c);
                    return (
                      <tr key={c.id} className={`transition-colors duration-150 hover:bg-slate-50/70 ${selectedIds.includes(c.id) ? 'bg-amber-50' : ''}`}>
                        <td className="px-3 py-2.5"><input type="checkbox" aria-label={`Select ${c.chapter_no}`} checked={selectedIds.includes(c.id)} onChange={() => toggleOne(c.id)} className="h-3.5 w-3.5 accent-primary" /></td>
                        <td className="px-3 py-2.5"><span className="font-semibold text-navy-800">{c.chapter_no}</span><span className="block font-mono text-[10px] text-slate-400">{c.id.substring(0, 8)}</span></td>
                        <td className="max-w-[220px] px-3 py-2.5">
                          <span className="font-medium text-primary-700">{c.name || <span className="text-slate-400">—</span>}</span>
                          {c.description && <span className="block truncate text-[10.5px] text-slate-500" title={c.description}>{c.description}</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="flex flex-col items-start gap-1">
                            <span className={`rounded px-2 py-[2px] text-[10.5px] font-medium ${steno ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'}`}>{steno ? 'Steno' : 'Typing'}</span>
                            <span className={`rounded px-2 py-[2px] text-[10.5px] font-medium ${c.test_type === LIVE ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{c.test_type === LIVE ? 'Live' : 'Preload'}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5">{names.length ? <span className="flex flex-wrap gap-1">{names.map((n) => <span key={n} className="rounded border border-primary-100 bg-primary-50 px-1.5 py-[1px] text-[10.5px] text-primary-700">{n}</span>)}</span> : <span className="text-slate-400">None</span>}</td>
                        <td className="px-3 py-2.5">{c.difficulty ? <span className={`rounded px-2 py-[2px] text-[10.5px] font-medium ${LEVEL_TONE[c.difficulty]}`}>{c.difficulty}</span> : <span className="text-slate-400">—</span>}</td>
                        <td className="px-3 py-2.5 text-slate-600">{c.font_group}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                          {c.word_count ?? '—'} Words
                          {steno && <span className="block text-[10.5px] text-slate-500">{c.steno_speed ?? 100} WPM {c.audio_url ? <span className="text-emerald-700"><HeadphonesIcon className="inline h-3 w-3" aria-hidden="true" /> Audio</span> : <span className="text-rose-600">· no audio</span>}</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{durationOf(c)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{fmtDate(c.test_date)}<span className="block text-[10px] text-slate-400">Created {fmtDate(c.created_at)}</span></td>
                        <td className="px-3 py-2.5"><span className={`rounded px-2 py-[2px] text-[10.5px] font-medium ${c.is_active === false ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{c.is_active === false ? 'Inactive' : 'Active'}</span></td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <Link to={`/admin/content/${c.id}/edit`} title="Edit" aria-label={`Edit ${c.chapter_no}`} className="rounded p-1.5 text-slate-500 hover:bg-primary-50 hover:text-primary"><PencilIcon className="h-4 w-4" /></Link>
                            <Link to={`/admin/content/new?duplicate=${c.id}`} title="Duplicate" aria-label={`Duplicate ${c.chapter_no}`} className="rounded p-1.5 text-slate-500 hover:bg-primary-50 hover:text-primary"><CopyIcon className="h-4 w-4" /></Link>
                            <button type="button" onClick={() => toggleActive(c)} title={c.is_active === false ? 'Activate' : 'Deactivate'} aria-label={`${c.is_active === false ? 'Activate' : 'Deactivate'} ${c.chapter_no}`} className={`rounded p-1.5 hover:bg-slate-100 ${c.is_active === false ? 'text-slate-400' : 'text-emerald-600'}`}><PowerIcon className="h-4 w-4" /></button>
                            <button type="button" onClick={() => handleDelete(c)} title="Delete" aria-label={`Delete ${c.chapter_no}`} className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-danger"><Trash2Icon className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-3.5 pb-1 pt-3">
          <div className="min-w-0 flex-1">
            <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(p) => { setPageSize(p); setPage(1); }} />
          </div>
          <button type="button" onClick={exportExcel} className="mb-2 flex items-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1.5 text-[12px] font-medium text-emerald-700 hover:bg-emerald-50">
            <FileSpreadsheetIcon className="h-3.5 w-3.5" aria-hidden="true" /> Export Excel
          </button>
        </div>
      </section>
    </div>
  );
};

export default AdminChapters;
