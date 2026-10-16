import { useEffect, useState } from 'react';
import {
  CalendarClockIcon, CircleCheckIcon, CircleOffIcon, ExternalLinkIcon, PencilIcon, PlusIcon, PowerIcon, Trash2Icon, XIcon, ZapIcon,
} from 'lucide-react';
import { flashBannerService } from '../../services/api';
import Pagination from '../../components/Pagination';
import { PageHeading } from '../../ui/PageHeading';
import { StatCard } from '../../ui/StatCard';

// Swatches from the design; any hex colour can still be picked.
const COLORS = ['#DC3545', '#0D6EFD', '#198754', '#F59E0B', '#6F42C1', '#0EA5E9'];
const EMPTY = { title: '', content: '', link_url: '', color: '#DC3545', start_date: '', end_date: '', is_active: true };
const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none focus:border-primary';
const labelCls = 'mb-1 block text-[11.5px] font-semibold text-navy-800';
const toDate = (d) => (d ? String(d).slice(0, 10) : '');
const fmt = (d) => (d ? new Date(`${toDate(d)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const STATE_TONE = { SCROLLING: 'bg-emerald-50 text-emerald-700', SCHEDULED: 'bg-amber-50 text-amber-700', ENDED: 'bg-slate-100 text-slate-600', HIDDEN: 'bg-rose-50 text-rose-700' };
const STATE_LABEL = { SCROLLING: 'Active', SCHEDULED: 'Scheduled', ENDED: 'Ended', HIDDEN: 'Inactive' };

// What students see right now for this banner.
const liveState = (b) => {
  if (!b.is_active) return 'HIDDEN';
  const today = new Date().toISOString().slice(0, 10);
  if (b.start_date && toDate(b.start_date) > today) return 'SCHEDULED';
  if (b.end_date && toDate(b.end_date) < today) return 'ENDED';
  return 'SCROLLING';
};

function BannerForm({ banner, onClose, onSaved }) {
  const editing = !!banner;
  const [form, setForm] = useState(() => (banner ? {
    title: banner.title || '', content: banner.content || '', link_url: banner.link_url || '', color: banner.color || '#DC3545',
    start_date: toDate(banner.start_date), end_date: toDate(banner.end_date), is_active: banner.is_active,
  } : EMPTY));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.start_date && form.end_date && form.end_date < form.start_date) { setError('End date cannot be before the start date.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, start_date: form.start_date || null, end_date: form.end_date || null };
      if (editing) await flashBannerService.updateBanner(banner.id, payload);
      else await flashBannerService.createBanner(payload);
      onSaved(editing ? 'Banner saved.' : 'Banner added.');
    } catch (err) {
      const m = err?.response?.data?.message || err?.message || 'failed';
      setError('Error saving flash banner: ' + (Array.isArray(m) ? m.join(', ') : m));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" role="dialog" aria-modal="true" aria-labelledby="banner-title">
      <form onSubmit={submit} className="nd flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center border-b border-slate-100 px-5 py-3.5">
          <h3 id="banner-title" className="text-[15px] font-bold text-navy-800">{editing ? 'Edit Flash Banner' : 'Add New Banner'}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100"><XIcon className="h-5 w-5" /></button>
        </div>
        <div className="scroll-thin flex-1 space-y-3.5 overflow-y-auto p-5">
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger">{error}</p>}
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="block"><span className={labelCls}>Banner Title (optional)</span><input type="text" maxLength={80} value={form.title} onChange={set('title')} placeholder="e.g. Monsoon Offer" className={inputCls} /></label>
            <label className="block"><span className={labelCls}>Link (optional)</span><input type="text" maxLength={300} value={form.link_url} onChange={set('link_url')} placeholder="/plan-pricing or https://…" className={inputCls} /></label>
          </div>
          <label className="block"><span className={labelCls}>Message <span className="text-danger">*</span></span>
            <textarea required rows={3} value={form.content} onChange={set('content')} placeholder="e.g. ⭐ IMPORTANT: Server will be down from 12 AM to 1 AM..." className={inputCls} /></label>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="block"><span className={labelCls}>Start Date (optional)</span><input type="date" value={form.start_date} onChange={set('start_date')} className={inputCls} /></label>
            <label className="block"><span className={labelCls}>End Date (optional)</span><input type="date" value={form.end_date} min={form.start_date || undefined} onChange={set('end_date')} className={inputCls} /></label>
          </div>
          <p className="text-[11px] text-slate-500">Leave the dates empty to show the banner until you hide it. Dates are inclusive.</p>
          <div>
            <span className={labelCls}>Banner Colour</span>
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} aria-label={`Colour ${c}`} aria-pressed={form.color.toUpperCase() === c}
                  className="h-7 w-7 rounded-full" style={{ background: c, boxShadow: form.color.toUpperCase() === c ? '0 0 0 2px #fff, 0 0 0 4px #0f172a' : '0 0 0 1px #cbd5e1' }} />
              ))}
              <input type="color" value={form.color} onChange={set('color')} aria-label="Custom colour" className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0" />
            </div>
          </div>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-navy-800">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 accent-primary" />
            {editing ? 'Active' : 'Set Active Immediately'}
          </label>
          {form.content.trim() &&
            <div>
              <span className="text-[11px] text-slate-500">Preview</span>
              <div className="rounded-md px-3 py-2 text-[13px] font-semibold text-white" style={{ backgroundColor: form.color }}>
                {form.title && <strong className="mr-2">{form.title}:</strong>}{form.content}{form.link_url && <u className="ml-2">Open →</u>}
              </div>
            </div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Flash Banner'}</button>
        </div>
      </form>
    </div>
  );
}

const AdminFlashBanner = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined); // undefined closed, null new, banner edit
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = () => flashBannerService.getBanners()
    .then((res) => {
      // Newest banners first
      const list = Array.isArray(res) ? res : [];
      setBanners([...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    })
    .catch((error) => console.error('Error fetching flash banners:', error))
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const toggleStatus = async (banner) => {
    try {
      await flashBannerService.updateBanner(banner.id, { is_active: !banner.is_active });
      load();
    } catch {
      alert('Error toggling banner status');
    }
  };
  const handleDelete = async (b) => {
    if (!window.confirm(`Delete this flash banner${b.title ? ` "${b.title}"` : ''}?`)) return;
    try {
      await flashBannerService.deleteBanner(b.id);
      load();
    } catch {
      alert('Error deleting flash banner');
    }
  };

  const counts = banners.reduce((acc, b) => { acc[liveState(b)] = (acc[liveState(b)] || 0) + 1; return acc; }, {});
  const totalPages = Math.max(1, Math.ceil(banners.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = banners.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="nd">
      <PageHeading icon={<ZapIcon className="h-5 w-5" aria-hidden="true" />} title="Flash Banner"
        subtitle="Create and manage the scrolling banners shown to students on their home page."
        crumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Flash Banner' }]} />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,1fr)_auto]">
        <StatCard icon={<ZapIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Total Banners" value={banners.length} />
        <StatCard icon={<CircleCheckIcon className="h-5 w-5" />} iconBg="#198754" label="Active" value={counts.SCROLLING || 0} sub="Scrolling now" />
        <StatCard icon={<CalendarClockIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Scheduled" value={counts.SCHEDULED || 0} sub="Start later" />
        <StatCard icon={<CircleOffIcon className="h-5 w-5" />} iconBg="#DC3545" label="Inactive / Ended" value={(counts.HIDDEN || 0) + (counts.ENDED || 0)} />
        <div className="flex items-center">
          <button type="button" onClick={() => setEditing(null)} className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-[12.5px] font-semibold text-white hover:bg-primary-700"><PlusIcon className="h-4 w-4" aria-hidden="true" /> Add New Banner</button>
        </div>
      </div>

      {notice && <p role="status" className="mb-4 flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="ml-auto"><XIcon className="h-4 w-4" /></button></p>}

      <section className="rounded-xl border border-slate-200 bg-white shadow-card">
        {loading ? <p className="p-8 text-center text-[12.5px] text-slate-500">Loading...</p>
          : banners.length === 0 ? <p className="p-10 text-center text-[12.5px] text-slate-500">No flash banners yet. Add one to get started.</p>
            : (
              <ul className="divide-y divide-slate-100">
                {paged.map((b) => {
                  const state = liveState(b);
                  return (
                    <li key={b.id} className="flex items-start gap-3 p-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white" style={{ backgroundColor: b.color || '#DC3545' }}><ZapIcon className="h-5 w-5" aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="text-[13.5px] font-bold text-navy-800">{b.title || 'Untitled banner'}</span>
                          <span className={`rounded px-2 py-[1px] text-[10.5px] font-semibold ${STATE_TONE[state]}`}>{STATE_LABEL[state]}</span>
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-slate-700">{b.content}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
                          <span>{b.start_date || b.end_date ? `${fmt(b.start_date) || 'Now'} – ${fmt(b.end_date) || 'No end date'}` : 'Shown until hidden'}</span>
                          {b.link_url && <span className="inline-flex items-center gap-1"><ExternalLinkIcon className="h-3 w-3" aria-hidden="true" /> Links to {b.link_url}</span>}
                          <span>Added {new Date(b.created_at).toLocaleDateString('en-GB')}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => setEditing(b)} title="Edit" aria-label={`Edit ${b.title || 'banner'}`} className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-primary hover:text-primary"><PencilIcon className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => toggleStatus(b)} title={b.is_active ? 'Hide' : 'Show'} aria-label={`${b.is_active ? 'Hide' : 'Show'} ${b.title || 'banner'}`} className={`rounded-md border border-slate-200 p-1.5 hover:bg-slate-50 ${b.is_active ? 'text-emerald-600' : 'text-slate-400'}`}><PowerIcon className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleDelete(b)} title="Delete" aria-label={`Delete ${b.title || 'banner'}`} className="rounded-md border border-rose-200 p-1.5 text-danger hover:bg-rose-50"><Trash2Icon className="h-3.5 w-3.5" /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
        {banners.length > 0 &&
          <div className="border-t border-slate-100 px-3.5 pb-1 pt-3">
            <Pagination page={currentPage} totalPages={totalPages} totalItems={banners.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(p) => { setPageSize(p); setPage(1); }} />
          </div>}
      </section>

      {editing !== undefined && <BannerForm banner={editing} onClose={() => setEditing(undefined)} onSaved={(msg) => { setEditing(undefined); setNotice(msg); load(); }} />}
    </div>
  );
};

export default AdminFlashBanner;
