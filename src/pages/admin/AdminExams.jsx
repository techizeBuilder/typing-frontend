import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  BadgeCheckIcon, CircleOffIcon, ClipboardListIcon, FilePlus2Icon, LandmarkIcon, LayersIcon, ListIcon, Loader2Icon, PencilIcon, PlusIcon, PowerIcon,
  RotateCcwIcon, ScaleIcon, SearchIcon, Trash2Icon, XIcon,
} from 'lucide-react';
import { chapterService, examService } from '../../services/api';
import Pagination from '../../components/Pagination';
import { StatCard } from '../../ui/StatCard';
import { urlParam } from '../../features/admin/urlParams';
import { resolveAssetUrl } from '../../features/exams/examData';
import {
  EXAM_REGIONS, deleteExamWithConfirm, examKind, examLanguages, getExamFontGroups, msgOf, screenLabel, setExamActive,
} from '../../features/exams/adminExamData';
import './Admin.css';

const selectCls = 'w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-primary';
const KIND_TONE = { Typing: 'bg-sky-50 text-sky-700', Steno: 'bg-violet-50 text-violet-700', 'Typing + Steno': 'bg-teal-50 text-teal-700' };

function ActionCard({ n, icon: Icon, color, title, text, to, cta, onClick }) {
  const btn = `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90`;
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: color }}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-bold text-navy-800">{n}. {title}</p>
        <p className="mb-2.5 text-[11.5px] text-slate-500">{text}</p>
        {to ? <Link to={to} className={btn} style={{ backgroundColor: color }}><PlusIcon className="h-3.5 w-3.5" aria-hidden="true" /> {cta}</Link>
          : <button type="button" onClick={onClick} className={btn} style={{ backgroundColor: color }}><ListIcon className="h-3.5 w-3.5" aria-hidden="true" /> {cta}</button>}
      </div>
    </div>
  );
}

const AdminExams = () => {
  const location = useLocation();
  const [exams, setExams] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(() => location.state?.notice || '');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch independently so one failure does not wipe the other list
  const applyData = ([examsResult, chaptersResult]) => {
    if (examsResult.status === 'fulfilled') setExams([...examsResult.value].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    else console.error('Error fetching exams:', examsResult.reason);
    if (chaptersResult.status === 'fulfilled') setChapters(Array.isArray(chaptersResult.value) ? chaptersResult.value : []);
    setLoading(false);
  };
  const fetchData = () => Promise.allSettled([examService.getExams(), chapterService.getChapters(undefined, undefined, undefined, true)]).then(applyData);
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([examService.getExams(), chapterService.getChapters(undefined, undefined, undefined, true)]).then((r) => { if (!cancelled) applyData(r); });
    return () => { cancelled = true; };
  }, []);

  // Tests linked to each exam (a test can belong to several exams).
  const tests = useMemo(() => {
    const m = {};
    chapters.forEach((c) => {
      const ids = Array.isArray(c.exam_ids) && c.exam_ids.length ? c.exam_ids : (c.exam_id ? [c.exam_id] : []);
      ids.forEach((id) => { const t = (m[id] = m[id] || { total: 0, live: 0 }); t.total += 1; if (c.test_type === 'Live Test') t.live += 1; });
    });
    return m;
  }, [chapters]);

  const filtered = exams
    .filter((e) => !search.trim() || [e.name, e.display_title, e.conducted_by].some((v) => v?.toLowerCase().includes(search.trim().toLowerCase())))
    .filter((e) => kindFilter === 'All' || examKind(e) === kindFilter || (kindFilter !== 'Typing + Steno' && examKind(e) === 'Typing + Steno'))
    .filter((e) => statusFilter === 'All' || (statusFilter === 'Active') === (e.is_active !== false))
    .filter((e) => regionFilter === 'All' || (e.region || '') === (regionFilter === 'None' ? '' : regionFilter));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const counts = {
    total: exams.length,
    active: exams.filter((e) => e.is_active !== false).length,
    inactive: exams.filter((e) => e.is_active === false).length,
    tests: chapters.length,
  };
  const filterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const toggle = async (exam) => {
    try { await setExamActive(exam, exam.is_active === false); fetchData(); } catch (err) { alert('Could not change the exam status: ' + msgOf(err)); }
  };
  const remove = async (exam) => { if (await deleteExamWithConfirm(exam.id)) fetchData(); };

  // Old links: ?new=1 → Add New Exam, ?tab=patterns → Result Patterns.
  if (urlParam('new') === '1') return <Navigate to="/admin/exams/new" replace />;
  if (urlParam('tab') === 'patterns') return <Navigate to="/admin/result-patterns" replace />;

  return (
    <div className="nd">
      <div className="mb-4">
        <h2 className="font-display text-[24px] font-bold leading-tight text-navy-800">Exam Management</h2>
        <p className="text-[12.5px] text-slate-500">Create, manage exams and set result patterns.</p>
      </div>

      {notice && <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
        <BadgeCheckIcon className="h-4 w-4" aria-hidden="true" /> {notice}
        <button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="ml-auto"><XIcon className="h-4 w-4" /></button>
      </p>}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <ActionCard n={1} icon={FilePlus2Icon} color="#0D6EFD" title="Add New Exam" text="Create a new typing/steno exam, set details, assign tests and configure basic settings." to="/admin/exams/new" cta="Add New Exam" />
        <ActionCard n={2} icon={ClipboardListIcon} color="#198754" title="Manage Exam" text="View, edit, activate/deactivate exams; tests are assigned from Test Management." cta="Manage Exams" onClick={() => document.getElementById('manage-exams')?.scrollIntoView({ behavior: 'smooth' })} />
        <ActionCard n={3} icon={ScaleIcon} color="#6F42C1" title="Result Pattern (Rules)" text="Create and manage result patterns, penalty rules and calculation settings." to="/admin/result-patterns/new" cta="Create New Rule" />
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<LayersIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Total Exams" value={counts.total} />
        <StatCard icon={<BadgeCheckIcon className="h-5 w-5" />} iconBg="#198754" label="Active Exams" value={counts.active} sub="Visible to students" />
        <StatCard icon={<CircleOffIcon className="h-5 w-5" />} iconBg="#DC3545" label="Inactive Exams" value={counts.inactive} sub="Hidden from students" />
        <StatCard icon={<ClipboardListIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Tests" value={counts.tests} sub="Live + pre-load" action="Manage tests" onAction={() => { window.location.hash = '#/admin/content'; }} />
      </div>

      <section id="manage-exams" className="rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-wrap items-end gap-2.5 border-b border-slate-100 p-3.5">
          <div className="mr-auto">
            <h3 className="text-[13.5px] font-bold text-navy-800">Manage Exams</h3>
            <p className="text-[11.5px] text-slate-500">View, edit, activate/deactivate exams.</p>
          </div>
          <label className="block w-full sm:w-[240px]"><span className="sr-only">Search exams</span>
            <span className="relative block">
              <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input type="search" value={search} onChange={filterChange(setSearch)} placeholder="Search by exam name, title..." aria-label="Search exams" className={`${selectCls} pr-8`} />
            </span></label>
          <select aria-label="Filter by type" value={kindFilter} onChange={filterChange(setKindFilter)} className={`${selectCls} sm:w-[150px]`}><option value="All">All Types</option><option>Typing</option><option>Steno</option><option>Typing + Steno</option></select>
          <select aria-label="Filter by status" value={statusFilter} onChange={filterChange(setStatusFilter)} className={`${selectCls} sm:w-[130px]`}><option value="All">All Status</option><option>Active</option><option>Inactive</option></select>
          <select aria-label="Filter by region" value={regionFilter} onChange={filterChange(setRegionFilter)} className={`${selectCls} sm:w-[150px]`}><option value="All">All Regions</option><option value="None">All India (not set)</option>{EXAM_REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
          <button type="button" onClick={() => { setSearch(''); setKindFilter('All'); setStatusFilter('All'); setRegionFilter('All'); setPage(1); }} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50"><RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Reset</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-600">
              <tr>{['S.No.', 'Exam Name', 'Type', 'Language', 'Tests Assigned', 'Result Pattern', 'Screen Layout', 'Duration', 'Status', 'Action'].map((h) => <th key={h} scope="col" className="px-3 py-2.5">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {loading ? <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500"><Loader2Icon className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Loading...</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">No exams found.</td></tr>
                  : paged.map((e, i) => {
                    const t = tests[e.id] || { total: 0, live: 0 };
                    const kind = examKind(e);
                    return (
                      <tr key={e.id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2.5 text-slate-500">{(currentPage - 1) * pageSize + i + 1}</td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-2.5">
                            {e.image_url
                              ? <img src={resolveAssetUrl(e.image_url)} alt="" className="h-9 w-9 shrink-0 rounded-md border border-slate-200 bg-white object-contain" />
                              : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-400"><LandmarkIcon className="h-4 w-4" aria-hidden="true" /></span>}
                            <span className="leading-tight">
                              <span className="block font-semibold text-navy-800">{e.name}</span>
                              <span className="block text-[10.5px] text-slate-500">{e.display_title || `${kind} Exam`}{e.region ? ` · ${e.region}` : ''}</span>
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5"><span className={`rounded px-2 py-[2px] text-[10.5px] font-medium ${KIND_TONE[kind]}`}>{kind}</span></td>
                        <td className="px-3 py-2.5 text-slate-600" title={getExamFontGroups(e).join(', ')}>{examLanguages(e)}</td>
                        <td className="px-3 py-2.5 text-slate-700"><b>{t.total}</b><span className="block text-[10.5px] text-slate-500">({t.live} Live, {t.total - t.live} Preload)</span></td>
                        <td className="px-3 py-2.5 text-slate-600">{e.result_pattern?.name || <span className="font-medium text-danger">Missing</span>}</td>
                        <td className="px-3 py-2.5"><span className="rounded bg-primary-50 px-2 py-[2px] text-[10.5px] text-primary-700">{screenLabel(e.screen_type)}</span></td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{e.test_time_minutes} Min</td>
                        <td className="px-3 py-2.5"><span className={`rounded px-2 py-[2px] text-[10.5px] font-medium ${e.is_active === false ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{e.is_active === false ? 'Inactive' : 'Active'}</span></td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <Link to={`/admin/exams/${e.id}/edit`} title="Edit" aria-label={`Edit ${e.name}`} className="rounded p-1.5 text-slate-500 hover:bg-primary-50 hover:text-primary"><PencilIcon className="h-4 w-4" /></Link>
                            <button type="button" onClick={() => toggle(e)} title={e.is_active === false ? 'Activate' : 'Deactivate'} aria-label={`${e.is_active === false ? 'Activate' : 'Deactivate'} ${e.name}`} className={`rounded p-1.5 hover:bg-slate-100 ${e.is_active === false ? 'text-slate-400' : 'text-emerald-600'}`}><PowerIcon className="h-4 w-4" /></button>
                            <button type="button" onClick={() => remove(e)} title="Delete" aria-label={`Delete ${e.name}`} className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-danger"><Trash2Icon className="h-4 w-4" /></button>
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
            <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
          </div>
          <Link to="/admin/result-patterns" className="mb-2 text-[12px] font-semibold text-primary">View All Result Patterns →</Link>
        </div>
      </section>
    </div>
  );
};

export default AdminExams;
