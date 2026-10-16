import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BadgeCheckIcon, Loader2Icon, PencilIcon, PlusIcon, ScaleIcon, SearchIcon, Trash2Icon, XIcon } from 'lucide-react';
import { examService, resultPatternService } from '../../services/api';
import Pagination from '../../components/Pagination';
import { PageHeading } from '../../ui/PageHeading';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function AdminResultPatterns() {
  const location = useLocation();
  const [patterns, setPatterns] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(() => location.state?.notice || '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const apply = ([p, e]) => {
    const byNewest = (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (p.status === 'fulfilled') setPatterns([...p.value].sort(byNewest)); else console.error('Error fetching patterns:', p.reason);
    if (e.status === 'fulfilled') setExams(e.value || []);
    setLoading(false);
  };
  const fetchAll = () => Promise.allSettled([resultPatternService.getPatterns(), examService.getExams()]);
  const load = () => fetchAll().then(apply);
  useEffect(() => {
    let cancelled = false;
    fetchAll().then((r) => { if (!cancelled) apply(r); });
    return () => { cancelled = true; };
  }, []);

  const usedBy = useMemo(() => {
    const m = {};
    exams.forEach((x) => { const id = x.result_pattern?.id; if (id) (m[id] = m[id] || []).push(x.name); });
    return m;
  }, [exams]);
  const filtered = patterns.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const remove = async (p) => {
    const using = usedBy[p.id] || [];
    const warn = using.length ? `\n\nUsed by ${using.length} exam(s): ${using.join(', ')}. Those exams will have no result pattern until you choose another.` : '';
    if (!window.confirm(`Delete the result pattern "${p.name}"?${warn}`)) return;
    try {
      await resultPatternService.deletePattern(p.id);
      load();
    } catch {
      alert('Error deleting pattern!');
    }
  };

  return (
    <div className="nd">
      <PageHeading
        icon={<ScaleIcon className="h-5 w-5" />}
        title="Result Patterns (Rules)"
        subtitle="Create and manage result patterns: penalty rules, qualifying speed and what students see on the result."
        crumbs={[{ label: 'Exam Management', to: '/admin/exams' }, { label: 'Result Patterns' }]}
        actions={<Link to="/admin/result-patterns/new" className="flex items-center gap-1.5 rounded-md bg-[#6F42C1] px-3.5 py-2 text-[12.5px] font-semibold text-white hover:opacity-90"><PlusIcon className="h-4 w-4" aria-hidden="true" /> Create New Rule</Link>} />

      {notice && <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
        <BadgeCheckIcon className="h-4 w-4" aria-hidden="true" /> {notice}
        <button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="ml-auto"><XIcon className="h-4 w-4" /></button>
      </p>}

      <section className="rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3.5">
          <h3 className="text-[13.5px] font-bold text-navy-800">Saved Result Patterns</h3>
          <span className="relative ml-auto block w-full sm:w-[280px]">
            <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search pattern name..." aria-label="Search patterns"
              className="w-full rounded-md border border-slate-300 py-2 pl-3 pr-8 text-[12px] outline-none focus:border-primary" />
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-600">
              <tr>{['S.No.', 'Pattern Name', 'Speed Count', 'Penalty', 'Qualifying', 'Half Mistakes', 'Used By', 'Created On', 'Actions'].map((h) => <th key={h} scope="col" className="px-3 py-2.5">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {loading ? <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500"><Loader2Icon className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Loading...</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">No patterns found.</td></tr>
                  : paged.map((p, i) => {
                    const using = usedBy[p.id] || [];
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2.5 text-slate-500">{(currentPage - 1) * pageSize + i + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-navy-800">{p.name}</td>
                        <td className="px-3 py-2.5 text-slate-600">{p.speed_count}</td>
                        <td className="px-3 py-2.5 text-slate-600">{p.penalty_value} {p.penalty_type}s</td>
                        <td className="px-3 py-2.5 text-slate-600">{p.required_speed} {p.qualify_on} / {p.required_accuracy}%</td>
                        <td className="px-3 py-2.5 text-slate-600">{p.half_mistake_enabled ? 'Count 0.5' : 'Full'}</td>
                        <td className="px-3 py-2.5">{using.length ? <span title={using.join(', ')} className="rounded bg-primary-50 px-2 py-[2px] text-[10.5px] font-medium text-primary-700">{using.length} exam(s)</span> : <span className="text-slate-400">Not used</span>}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{fmtDate(p.created_at)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <Link to={`/admin/result-patterns/${p.id}/edit`} title="Edit" aria-label={`Edit ${p.name}`} className="rounded p-1.5 text-slate-500 hover:bg-primary-50 hover:text-primary"><PencilIcon className="h-4 w-4" /></Link>
                            <button type="button" onClick={() => remove(p)} title="Delete" aria-label={`Delete ${p.name}`} className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-danger"><Trash2Icon className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-3.5 pb-1 pt-3">
          <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
        </div>
      </section>
    </div>
  );
}
