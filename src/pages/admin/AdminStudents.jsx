import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  BadgeCheckIcon, ClockIcon, EyeIcon, FileSpreadsheetIcon, Loader2Icon, MegaphoneIcon, PencilIcon, PlusIcon, PowerIcon, RefreshCwIcon, RotateCcwIcon,
  SearchIcon, Trash2Icon, UploadIcon, UserIcon, UserMinusIcon, UserPlusIcon, UsersIcon, XIcon,
} from 'lucide-react';
import { userService, resultService } from '../../services/api';
import Pagination from '../../components/Pagination';
import { StatCard } from '../../ui/StatCard';
import { urlParam } from '../../features/admin/urlParams';
import { StudentImportModal } from '../../features/students/StudentImport';
import {
  ALL_CATEGORIES, categoriesOf, errorText, fmtDate, hasLoginWindow, isExpired, photoUrl,
} from '../../features/students/studentData';
import './Admin.css';

const STATUS_TONE = {
  Active: 'bg-emerald-50 text-emerald-700', Inactive: 'bg-rose-50 text-rose-700', Pending: 'bg-amber-50 text-amber-700', Expired: 'bg-slate-100 text-slate-600',
};
const COURSE_COLORS = { 'Typing English': '#0D6EFD', 'Typing Hindi': '#198754', 'Steno English': '#F59E0B', 'Steno Hindi': '#6F42C1' };
const selectCls = 'w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-primary';
const panelCls = 'rounded-xl border border-slate-200 bg-white p-4 shadow-card';

// Status as students experience it: an Active account past its validity shows as Expired.
const shownStatus = (s) => (s.status === 'Active' && isExpired(s) ? 'Expired' : s.status || 'Pending');

function Donut({ parts }) {
  const total = parts.reduce((t, p) => t + p.value, 0);
  const r = 40; const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-[110px] w-[110px] shrink-0" role="img" aria-label="Students per course">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#F1F5F9" strokeWidth="16" />
      {total > 0 && parts.map((p) => {
        const len = (p.value / total) * c;
        const el = <circle key={p.label} cx="50" cy="50" r={r} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 50 50)" />;
        offset += len;
        return el;
      })}
    </svg>
  );
}

// Bulk edit: unchanged rules — only the enabled fields are sent.
const BULK_EMPTY = {
  applyStatus: false, status: 'Active', applyCategories: false, selectedCategories: [], applyLoginTime: false, allowed_login_time_start: '', allowed_login_time_end: '',
  applyValidityEnd: false, validity_end: '', applyLiveTestsLimit: false, live_tests_limit: '', applyPreloadTestsLimit: false, preload_tests_limit: '',
  applyStenoTestsLimit: false, steno_tests_limit: '',
};

function BulkEditModal({ ids, onClose, onSaved }) {
  const [f, setF] = useState(BULK_EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const submit = async (e) => {
    e.preventDefault();
    const payload = {};
    if (f.applyStatus) payload.status = f.status;
    if (f.applyCategories) payload.category = f.selectedCategories.join(', ') || null;
    if (f.applyLoginTime) { payload.allowed_login_time_start = f.allowed_login_time_start || null; payload.allowed_login_time_end = f.allowed_login_time_end || null; }
    if (f.applyValidityEnd) payload.validity_end = f.validity_end || null;
    if (f.applyLiveTestsLimit) payload.live_tests_limit = f.live_tests_limit === '' ? null : parseInt(f.live_tests_limit, 10);
    if (f.applyPreloadTestsLimit) payload.preload_tests_limit = f.preload_tests_limit === '' ? null : parseInt(f.preload_tests_limit, 10);
    if (f.applyStenoTestsLimit) payload.steno_tests_limit = f.steno_tests_limit === '' ? null : parseInt(f.steno_tests_limit, 10);
    if (Object.keys(payload).length === 0) { alert('Please enable and fill at least one field to update.'); return; }
    setSaving(true);
    try {
      await Promise.all(ids.map((id) => userService.updateUser(id, payload)));
      onSaved(`Updated ${ids.length} student(s) successfully.`);
    } catch (err) {
      alert('Bulk update error: ' + errorText(err, 'failed'));
    } finally { setSaving(false); }
  };
  const row = (flag, title, hint, control) => (
    <div className="rounded-lg border border-slate-200 p-3">
      <label className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-navy-800">
        <input type="checkbox" checked={f[flag]} onChange={(e) => set({ [flag]: e.target.checked })} className="h-3.5 w-3.5 accent-primary" /> {title}
      </label>
      <p className="mb-2 text-[11px] text-slate-500">{hint}</p>
      <div className={f[flag] ? '' : 'pointer-events-none opacity-50'}>{control}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" role="dialog" aria-modal="true" aria-labelledby="bulk-title">
      <form onSubmit={submit} className="nd flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center border-b border-slate-100 px-5 py-3.5">
          <h3 id="bulk-title" className="text-[15px] font-bold text-navy-800">Bulk Edit — {ids.length} student(s) selected</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100"><XIcon className="h-5 w-5" /></button>
        </div>
        <div className="scroll-thin grid flex-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
          <p className="text-[12px] text-slate-500 sm:col-span-2">Enable a field to update it for all selected students. Disabled fields are left unchanged.</p>
          {row('applyStatus', 'Status', 'Update status for selected students',
            <select value={f.status} onChange={(e) => set({ status: e.target.value })} className={selectCls}>{['Active', 'Inactive', 'Pending'].map((s) => <option key={s}>{s}</option>)}</select>)}
          {row('applyCategories', 'Course Categories', 'Override categories for selected students',
            <div className="flex flex-wrap gap-1.5">{ALL_CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-[11.5px]">
                <input type="checkbox" checked={f.selectedCategories.includes(cat)} onChange={() => set({ selectedCategories: f.selectedCategories.includes(cat) ? f.selectedCategories.filter((c) => c !== cat) : [...f.selectedCategories, cat] })} className="h-3 w-3 accent-primary" /> {cat}
              </label>))}</div>)}
          {row('applyLoginTime', 'Login Time Window', 'Leave both blank to remove the restriction',
            <div className="flex gap-2"><input type="time" aria-label="Start time" value={f.allowed_login_time_start} onChange={(e) => set({ allowed_login_time_start: e.target.value })} className={selectCls} /><input type="time" aria-label="End time" value={f.allowed_login_time_end} onChange={(e) => set({ allowed_login_time_end: e.target.value })} className={selectCls} /></div>)}
          {row('applyValidityEnd', 'Validity End Date', 'Leave blank to clear it',
            <input type="date" value={f.validity_end} onChange={(e) => set({ validity_end: e.target.value })} className={selectCls} />)}
          {row('applyLiveTestsLimit', 'Live Tests Per Day', 'Blank = default 1',
            <input type="number" min="0" placeholder="Empty = Default 1" value={f.live_tests_limit} onChange={(e) => set({ live_tests_limit: e.target.value })} className={selectCls} />)}
          {row('applyPreloadTestsLimit', 'Pre-load Tests Limit', 'Blank = default 10',
            <input type="number" min="0" placeholder="Empty = Default 10" value={f.preload_tests_limit} onChange={(e) => set({ preload_tests_limit: e.target.value })} className={selectCls} />)}
          {row('applyStenoTestsLimit', 'Steno Tests Limit', 'Blank = default 10',
            <input type="number" min="0" placeholder="Empty = Default 10" value={f.steno_tests_limit} onChange={(e) => set({ steno_tests_limit: e.target.value })} className={selectCls} />)}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">Apply to {ids.length} Student(s)</button>
        </div>
      </form>
    </div>
  );
}

function TestsModal({ student, onClose }) {
  const navigate = useNavigate();
  const [tests, setTests] = useState(null);
  const [tab, setTab] = useState('typing');
  useEffect(() => {
    let cancelled = false;
    resultService.getUserResults(student.id)
      .then((results) => { if (!cancelled) setTests([...results].sort((a, b) => new Date(b.date_taken || 0) - new Date(a.date_taken || 0))); })
      .catch((err) => { if (!cancelled) { alert('Error fetching tests: ' + err.message); setTests([]); } });
    return () => { cancelled = true; };
  }, [student.id]);

  const viewResult = (test) => {
    // Only steno results use the StenoDiff view (driven by typedText + referenceText).
    // Typing results must leave these unset so ResultScreen renders the full
    // TypingPassageReview with its Test Analysis / Mistake / Compare tabs.
    const isSteno = (test.mode || '').toLowerCase().includes('steno');
    // Full uploaded passage so the "Original Passage" column shows the complete text,
    // not just the (possibly trimmed) reference_words the student reached.
    const fullPassage = test.chapter?.content_text || (test.reference_words ? test.reference_words.join(' ') : '');
    navigate('/result', {
      state: {
        gwpm: test.gwpm,
        nwpm: test.nwpm,
        accuracy: test.accuracy,
        fullErrors: test.full_errors,
        halfErrors: test.half_errors,
        totalStrokes: test.total_strokes,
        timeElapsed: test.time_elapsed,
        testDurationMinutes: test.exam?.test_time_minutes || test.chapter?.time_minutes || undefined,
        exam_name: test.exam ? test.exam.name : 'Practice Mode',
        chapter_no: test.chapter?.chapter_no || null,
        date_taken: test.date_taken,
        studentName: student.name,
        rollNo: student.user_id,
        mode: test.mode,
        userInput: test.user_input,
        referenceWords: test.reference_words || [],
        wordStatuses: test.word_statuses || [],
        pattern: test.pattern_data,
        originalPassage: fullPassage,
        ...(isSteno ? { typedText: test.user_input, referenceText: fullPassage } : {}),
      },
    });
  };

  const shown = (tests || []).filter((t) => (tab === 'steno') === !!t.mode?.toLowerCase().includes('steno'));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" role="dialog" aria-modal="true" aria-labelledby="tests-title">
      <div className="nd flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center border-b border-slate-100 px-5 py-3.5">
          <h3 id="tests-title" className="text-[15px] font-bold text-navy-800">Tests History: {student.name}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100"><XIcon className="h-5 w-5" /></button>
        </div>
        <div className="flex gap-2 px-5 pt-3">
          {[['typing', '⌨ Typing Reports'], ['steno', '🎙 Steno Reports']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${tab === k ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>
          ))}
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto p-5">
          {tests === null ? <p className="text-[12.5px] text-slate-500">Loading tests...</p>
            : shown.length === 0 ? <p className="text-[12.5px] text-slate-500">No {tab === 'steno' ? 'Steno' : 'Typing'} tests taken yet.</p>
              : (
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-600">
                    <tr>{['Date', 'Exam', 'Speed (NWPM)', 'Accuracy', 'Errors', 'Action'].map((h) => <th key={h} scope="col" className="px-3 py-2">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shown.map((t) => (
                      <tr key={t.id}>
                        <td className="px-3 py-2">{new Date(t.date_taken).toLocaleDateString()}</td>
                        <td className="px-3 py-2">{t.exam ? t.exam.name : 'Practice'}<span className="block text-[10.5px] text-slate-500">{t.mode}</span></td>
                        <td className="px-3 py-2 font-semibold">{t.nwpm} WPM</td>
                        <td className="px-3 py-2">{t.accuracy}%</td>
                        <td className="px-3 py-2">{t.total_errors}</td>
                        <td className="px-3 py-2"><button type="button" onClick={() => viewResult(t)} className="rounded-md bg-primary px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-primary-700">View Result</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
        </div>
      </div>
    </div>
  );
}

const AdminStudents = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [notice, setNotice] = useState(() => location.state?.notice || '');
  const [searchTerm, setSearchTerm] = useState(() => urlParam('search') || '');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState(() => urlParam('status') || 'All');
  const [windowFilter, setWindowFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState(new Set());
  const [showBulk, setShowBulk] = useState(false);
  const [showImport, setShowImport] = useState(() => urlParam('import') === '1');
  const [testsFor, setTestsFor] = useState(null);

  const fetchStudents = async () => {
    try {
      const data = await userService.getUsers();
      setErrorMsg(null);
      // Newest students first
      setStudents([...data].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrorMsg(error.message + ' (Check if Backend is running)');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchStudents(); }, []);

  const all = useMemo(() => students.filter((s) => s.role === 'Student'), [students]);
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return all
      .filter((s) => !q || [s.name, s.phone, s.user_id, s.roll_no, s.email, s.city, s.fathers_name].some((v) => v && String(v).toLowerCase().includes(q)))
      .filter((s) => categoryFilter === 'All' || categoriesOf(s).includes(categoryFilter))
      .filter((s) => statusFilter === 'All' || s.status === statusFilter || shownStatus(s) === statusFilter)
      .filter((s) => windowFilter === 'All' || (windowFilter === 'Fixed' ? hasLoginWindow(s) : !hasLoginWindow(s)));
  }, [all, searchTerm, categoryFilter, statusFilter, windowFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allPageSelected = paged.length > 0 && paged.every((s) => selected.has(s.id));

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const counts = {
    total: all.length,
    active: all.filter((s) => shownStatus(s) === 'Active').length,
    pending: all.filter((s) => s.status === 'Pending').length,
    inactive: all.filter((s) => ['Inactive', 'Expired'].includes(shownStatus(s))).length,
    newMonth: all.filter((s) => s.created_at && new Date(s.created_at) >= monthStart).length,
  };
  const pct = (n) => (counts.total ? `${((n / counts.total) * 100).toFixed(1)}% of total` : '—');
  const courseParts = ALL_CATEGORIES.map((c) => ({ label: c, color: COURSE_COLORS[c], value: all.filter((s) => categoriesOf(s).includes(c)).length }));
  const fixedCount = all.filter(hasLoginWindow).length;

  const resetFilters = () => { setSearchTerm(''); setCategoryFilter('All'); setStatusFilter('All'); setWindowFilter('All'); setPage(1); };
  const filterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };
  const toggleOne = (id) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togglePage = () => setSelected(allPageSelected ? new Set() : new Set(paged.map((s) => s.id)));

  const toggleStatus = async (s) => {
    try { await userService.updateUser(s.id, { status: s.status === 'Active' ? 'Inactive' : 'Active' }); fetchStudents(); } catch (error) { alert('Error updating status: ' + error.message); }
  };
  const remove = async (s) => {
    const ok = window.confirm(`Delete the account for "${s.name}" (${s.user_id || s.phone})?\n\nThis permanently removes the student and ALL their test results. This cannot be undone.`);
    if (!ok) return;
    try {
      await userService.deleteUser(s.id);
      setSelected((prev) => { const n = new Set(prev); n.delete(s.id); return n; });
      fetchStudents();
    } catch (error) { alert('Error deleting student: ' + errorText(error, 'failed')); }
  };

  const exportStudents = () => {
    const rows = filtered.map((s) => ({
      Name: s.name, "Father's Name": s.fathers_name || '', 'Login ID': s.user_id || '', 'Roll No': s.roll_no || '',
      Phone: s.phone || '', Email: s.email || '', 'Guardian Mobile': s.guardian_phone || '', City: s.city || '', State: s.state || '',
      'Pin Code': s.pin_code || '', Address: s.address || '', Category: s.category || '', Status: shownStatus(s),
      'Validity End': s.validity_end ? new Date(s.validity_end).toLocaleDateString('en-GB') : '',
      'Login Window': hasLoginWindow(s) ? `${s.allowed_login_time_start}-${s.allowed_login_time_end}` : 'Anytime',
      'Fees Amount': s.fees_amount ?? '', 'Last Fees Date': s.last_fees_submitted_date ? new Date(s.last_fees_submitted_date).toLocaleDateString('en-GB') : '',
      'Joined On': s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : '', Remarks: s.remarks || '',
    }));
    if (rows.length === 0) { alert('No students match the current filters.'); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Students');
    XLSX.writeFile(wb, `students_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Old links (?new=1) open the Add Student page.
  if (urlParam('new') === '1') return <Navigate to="/admin/students/new" replace />;

  return (
    <div className="nd">
      <div className="mb-4 flex flex-wrap items-start gap-4">
        <div>
          <h2 className="font-display text-[24px] font-bold leading-tight text-navy-800">Students Management</h2>
          <p className="text-[12.5px] text-slate-500">View, manage and organize all students. Add new students and track their activity.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link to="/admin/students/new" className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700">
            <PlusIcon className="h-4 w-4" aria-hidden="true" /> Add Student
          </Link>
          <button type="button" onClick={() => setShowImport(true)} className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-[12.5px] font-medium text-navy-800 hover:bg-slate-50">
            <UploadIcon className="h-4 w-4" aria-hidden="true" /> Import Students
          </button>
        </div>
      </div>

      {notice && <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
        <BadgeCheckIcon className="h-4 w-4" aria-hidden="true" /> {notice}
        <button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="ml-auto text-emerald-700"><XIcon className="h-4 w-4" /></button>
      </p>}
      {errorMsg && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger"><strong>Error:</strong> {errorMsg}</p>}

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<UsersIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Total Students" value={counts.total.toLocaleString('en-IN')} sub="All students in system" />
        <StatCard icon={<BadgeCheckIcon className="h-5 w-5" />} iconBg="#198754" label="Active Students" value={counts.active.toLocaleString('en-IN')} sub={pct(counts.active)} />
        <StatCard icon={<ClockIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Pending Requests" value={counts.pending.toLocaleString('en-IN')} sub="Approval required" action={counts.pending ? 'Review' : undefined} onAction={() => { setStatusFilter('Pending'); setPage(1); }} />
        <StatCard icon={<UserMinusIcon className="h-5 w-5" />} iconBg="#6F42C1" label="Inactive / Expired" value={counts.inactive.toLocaleString('en-IN')} sub={pct(counts.inactive)} />
        <StatCard icon={<UserPlusIcon className="h-5 w-5" />} iconBg="#0EA5E9" label="New This Month" value={counts.newMonth.toLocaleString('en-IN')} sub="Joined this month" />
      </div>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="grid gap-2.5 border-b border-slate-100 p-3.5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(140px,1fr))_auto]">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Search</span>
            <span className="relative block">
              <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input type="search" value={searchTerm} onChange={filterChange(setSearchTerm)} placeholder="Name, roll no., login ID, mobile, email..." aria-label="Search students" className={`${selectCls} pr-8`} />
            </span>
          </label>
          <label className="block"><span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Status</span>
            <select aria-label="Filter by status" value={statusFilter} onChange={filterChange(setStatusFilter)} className={selectCls}>
              <option value="All">-- All Status --</option>{['Active', 'Inactive', 'Pending', 'Expired'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select></label>
          <label className="block"><span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Course / Type</span>
            <select aria-label="Filter by course" value={categoryFilter} onChange={filterChange(setCategoryFilter)} className={selectCls}>
              <option value="All">-- All Course --</option>{ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>
          <label className="block"><span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Login Window</span>
            <select aria-label="Filter by login window" value={windowFilter} onChange={filterChange(setWindowFilter)} className={selectCls}>
              <option value="All">-- All Login Window --</option><option value="Anytime">Anytime</option><option value="Fixed">Fix Time</option>
            </select></label>
          <div className="flex items-end gap-2">
            <button type="button" onClick={resetFilters} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50"><RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Reset</button>
            <button type="button" onClick={fetchStudents} title="Reload students" aria-label="Refresh" className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"><RefreshCwIcon className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {selected.size > 0 &&
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-primary-50 px-3.5 py-2 text-[12.5px] text-primary-700">
            <b>{selected.size}</b> selected
            <button type="button" onClick={() => setShowBulk(true)} className="rounded-md bg-[#7c3aed] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#6d28d9]">✏ Bulk Edit ({selected.size})</button>
            <button type="button" onClick={() => setSelected(new Set())} className="text-[12px] underline">Clear selection</button>
          </div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2.5"><input type="checkbox" aria-label="Select all on page" checked={allPageSelected} onChange={togglePage} className="h-3.5 w-3.5 accent-primary" /></th>
                {['Roll No.', 'Student Name', 'Username (Login ID)', 'Course / Type', 'Login Window', 'Mobile', 'Validity', 'Status', 'Joined On', 'Actions'].map((h) => <th key={h} scope="col" className="px-3 py-2.5">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {loading ? <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-500"><Loader2Icon className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Loading...</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-500">No students match the current filter.</td></tr>
                  : paged.map((s) => {
                    const status = shownStatus(s);
                    return (
                      <tr key={s.id} className={`transition-colors duration-150 hover:bg-slate-50/70 ${selected.has(s.id) ? 'bg-violet-50' : ''}`}>
                        <td className="px-3 py-2.5"><input type="checkbox" aria-label={`Select ${s.name}`} checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} className="h-3.5 w-3.5 accent-primary" /></td>
                        <td className="px-3 py-2.5 text-slate-600">{s.roll_no || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-2">
                            {s.profile_image
                              ? <img src={photoUrl(s.profile_image)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                              : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400"><UserIcon className="h-4 w-4" aria-hidden="true" /></span>}
                            <span className="leading-tight">
                              <span className="block font-semibold text-navy-800">{s.name}</span>
                              {(s.email || s.fathers_name) && <span className="block text-[10.5px] text-slate-500">{s.email || `S/o ${s.fathers_name}`}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5"><span className="rounded bg-slate-100 px-1.5 py-[2px] font-mono text-[11px] font-semibold text-primary-700">{s.user_id || s.phone || '—'}</span></td>
                        <td className="px-3 py-2.5">
                          <span className="flex flex-wrap gap-1">{categoriesOf(s).length ? categoriesOf(s).map((c) => <span key={c} className="rounded px-1.5 py-[1px] text-[10.5px] font-medium" style={{ backgroundColor: `${COURSE_COLORS[c] || '#64748B'}14`, color: COURSE_COLORS[c] || '#475569' }}>{c}</span>) : <span className="text-slate-400">—</span>}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {hasLoginWindow(s)
                            ? <><span className="inline-block rounded bg-amber-50 px-2 py-[2px] text-[10.5px] font-medium text-amber-700">Fix Time</span><span className="mt-0.5 block text-[10px] text-slate-500">{s.allowed_login_time_start} – {s.allowed_login_time_end}</span></>
                            : <span className="inline-block rounded bg-emerald-50 px-2 py-[2px] text-[10.5px] font-medium text-emerald-700">Anytime</span>}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{s.phone}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{s.validity_end ? fmtDate(s.validity_end) : 'N/A'}</td>
                        <td className="px-3 py-2.5"><span className={`rounded px-2 py-[2px] text-[10.5px] font-medium ${STATUS_TONE[status] || STATUS_TONE.Pending}`}>{status}</span></td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{fmtDate(s.created_at)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setTestsFor(s)} title="View tests" aria-label={`View tests of ${s.name}`} className="rounded p-1.5 text-slate-500 hover:bg-primary-50 hover:text-primary"><EyeIcon className="h-4 w-4" /></button>
                            <Link to={`/admin/students/${s.id}/edit`} title="Edit" aria-label={`Edit ${s.name}`} className="rounded p-1.5 text-slate-500 hover:bg-primary-50 hover:text-primary"><PencilIcon className="h-4 w-4" /></Link>
                            <button type="button" onClick={() => toggleStatus(s)} title={s.status === 'Active' ? 'Deactivate' : 'Activate'} aria-label={`${s.status === 'Active' ? 'Deactivate' : 'Activate'} ${s.name}`} className={`rounded p-1.5 hover:bg-slate-100 ${s.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}><PowerIcon className="h-4 w-4" /></button>
                            <button type="button" onClick={() => remove(s)} title="Delete" aria-label={`Delete ${s.name}`} className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-danger"><Trash2Icon className="h-4 w-4" /></button>
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
          <button type="button" onClick={exportStudents} className="mb-2 flex items-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1.5 text-[12px] font-medium text-emerald-700 hover:bg-emerald-50">
            <FileSpreadsheetIcon className="h-3.5 w-3.5" aria-hidden="true" /> Export Students
          </button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className={panelCls}>
          <h3 className="mb-3 text-[13.5px] font-bold text-navy-800">Course / Type Wise Students</h3>
          <div className="flex items-center gap-4">
            <Donut parts={courseParts} />
            <ul className="flex-1 space-y-1.5 text-[11.5px]">
              {courseParts.map((p) => (
                <li key={p.label} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.color }} aria-hidden="true" />
                  <span className="text-slate-600">{p.label}</span>
                  <span className="ml-auto font-medium text-navy-800">{p.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-2 text-[10.5px] text-slate-400">A student can be in more than one course.</p>
        </section>
        <section className={panelCls}>
          <h3 className="mb-3 text-[13.5px] font-bold text-navy-800">Login Window Wise Students</h3>
          <ul className="space-y-4 pt-2">
            {[['Anytime', counts.total - fixedCount, '#0D6EFD'], ['Fix Time', fixedCount, '#198754']].map(([label, n, color]) => {
              const share = counts.total ? (n / counts.total) * 100 : 0;
              return (
                <li key={label}>
                  <p className="mb-1.5 flex text-[11.5px]"><span className="text-slate-600">{label}</span><span className="ml-auto font-medium text-navy-800">{n} ({share.toFixed(1)}%)</span></p>
                  <span className="block h-1.5 w-full rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${share}%`, backgroundColor: color }} /></span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className={panelCls}>
          <h3 className="mb-3 text-[13.5px] font-bold text-navy-800">Quick Actions</h3>
          <ul className="grid grid-cols-2 gap-2.5 text-[11.5px] font-medium text-navy-800">
            <li><Link to="/admin/students/new" className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 hover:border-primary hover:bg-primary-50/40"><UserPlusIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Add New Student</Link></li>
            <li><button type="button" onClick={() => setShowImport(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 hover:border-primary hover:bg-primary-50/40"><UploadIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Import Students</button></li>
            <li><button type="button" onClick={() => { setStatusFilter('Pending'); setPage(1); }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 hover:border-primary hover:bg-primary-50/40"><ClockIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Approve Pending {counts.pending > 0 && <span className="rounded bg-rose-500 px-1.5 text-[9.5px] font-bold text-white">{counts.pending}</span>}</button></li>
            <li><Link to="/admin/messages" className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 hover:border-primary hover:bg-primary-50/40"><MegaphoneIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Send Message</Link></li>
            <li className="col-span-2"><button type="button" onClick={exportStudents} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 hover:border-primary hover:bg-primary-50/40"><FileSpreadsheetIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Export Student List (Excel)</button></li>
          </ul>
        </section>
      </div>

      {showBulk && <BulkEditModal ids={[...selected]} onClose={() => setShowBulk(false)} onSaved={(msg) => { setShowBulk(false); setSelected(new Set()); setNotice(msg); fetchStudents(); }} />}
      {showImport && <StudentImportModal existing={students} onClose={() => { setShowImport(false); if (urlParam('import')) navigate('/admin/students', { replace: true }); }} onDone={fetchStudents} />}
      {testsFor && <TestsModal student={testsFor} onClose={() => setTestsFor(null)} />}
    </div>
  );
};

export default AdminStudents;
