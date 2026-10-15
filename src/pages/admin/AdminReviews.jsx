import { useEffect, useMemo, useState } from 'react';
import { StarIcon, ClockIcon, CheckCircle2Icon, BanIcon, Trash2Icon, RefreshCwIcon, SearchIcon } from 'lucide-react';
import { reviewService } from '../../services/api';
import { PageHeading } from '../../ui/PageHeading';
import { StatCard } from '../../ui/StatCard';
import { LoadingState } from '../../features/exams/ExamUI';
import { StarRating, ReviewAvatar } from '../../features/reviews/ReviewUI';

const STATUS_TONE = {
  Pending: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-rose-50 text-rose-700',
};

const fieldCls = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none focus:border-primary';

const errorMessage = (err, fallback) => {
  const msg = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};

export default function AdminReviews() {
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Pending');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => reviewService.getAll()
    .then((data) => { setReviews(Array.isArray(data) ? data : []); setError(''); })
    .catch((err) => { setReviews([]); setError(errorMessage(err, 'Could not load reviews.')); });
  useEffect(() => { load(); }, []);

  const act = async (id, fn) => {
    setBusyId(id);
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not update the review.'));
    } finally {
      setBusyId(null);
    }
  };

  const count = (s) => (reviews || []).filter((r) => r.status === s).length;
  const visible = useMemo(() => (reviews || []).filter((r) => {
    if (status !== 'All' && r.status !== status) return false;
    const q = query.trim().toLowerCase();
    return !q || [r.student?.name, r.student?.user_id, r.exam, r.designation, r.message].some((v) => String(v || '').toLowerCase().includes(q));
  }), [reviews, status, query]);

  return (
    <div className="nd">
      <PageHeading
        icon={<StarIcon className="h-5 w-5" aria-hidden="true" />}
        title="Student Reviews"
        subtitle="Approve reviews to show them on the homepage. Students can edit their review; edits come back here for approval."
        actions={
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-navy-800 hover:bg-slate-50">
            <RefreshCwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
          </button>
        } />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<ClockIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Pending Approval" value={count('Pending')} />
        <StatCard icon={<CheckCircle2Icon className="h-5 w-5" />} iconBg="#198754" label="Approved (on homepage)" value={count('Approved')} />
        <StatCard icon={<BanIcon className="h-5 w-5" />} iconBg="#DC3545" label="Rejected" value={count('Rejected')} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 p-3.5">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldCls} aria-label="Filter by status">
            <option value="All">All Reviews</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <div className="relative ml-auto">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student, exam, text..." aria-label="Search reviews" className={`${fieldCls} w-[240px] pl-8`} />
          </div>
        </div>
        {error && <p role="alert" className="border-b border-slate-100 px-4 py-2.5 text-[12.5px] text-danger">{error}</p>}
        {reviews === null ? <LoadingState>Loading reviews…</LoadingState> :
          visible.length === 0 ? <p className="p-10 text-center text-[12.5px] text-slate-500">No {status === 'All' ? '' : status.toLowerCase()} reviews.</p> :
            <ul className="divide-y divide-slate-100">
              {visible.map((r) => (
                <li key={r.id} className="flex flex-wrap gap-4 p-4">
                  <ReviewAvatar name={r.student?.name} photoUrl={r.photo_url} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-navy-800">{r.student?.name || 'Unknown student'}</p>
                      <span className="text-[11.5px] text-slate-400">{r.student?.user_id}</span>
                      <span className={`rounded px-2 py-[2px] text-[10.5px] font-semibold ${STATUS_TONE[r.status] || ''}`}>{r.status}</span>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                      <StarRating value={r.rating} size="h-3.5 w-3.5" /> {r.exam}{r.designation ? ` · ${r.designation}` : ''}
                      <span className="text-slate-400">· {new Date(r.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{r.message}</p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    {r.status !== 'Approved' &&
                      <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, () => reviewService.setStatus(r.id, 'Approved'))}
                        className="inline-flex items-center gap-1 rounded-md bg-success px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#146c43] disabled:opacity-50">
                        <CheckCircle2Icon className="h-3.5 w-3.5" aria-hidden="true" /> Approve
                      </button>
                    }
                    {r.status !== 'Rejected' &&
                      <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, () => reviewService.setStatus(r.id, 'Rejected'))}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-navy-800 hover:bg-slate-50 disabled:opacity-50">
                        <BanIcon className="h-3.5 w-3.5" aria-hidden="true" /> {r.status === 'Approved' ? 'Unpublish' : 'Reject'}
                      </button>
                    }
                    <button type="button" disabled={busyId === r.id} aria-label="Delete review"
                      onClick={() => { if (window.confirm('Delete this review permanently?')) act(r.id, () => reviewService.remove(r.id)); }}
                      className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-danger hover:bg-rose-100 disabled:opacity-50">
                      <Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
        }
      </section>
    </div>
  );
}
