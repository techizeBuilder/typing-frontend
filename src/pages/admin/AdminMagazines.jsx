import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenIcon, CrownIcon, FileTextIcon, PencilIcon, SearchIcon, Trash2Icon, UploadIcon, XIcon } from 'lucide-react';
import { magazineService } from '../../services/api';
import { PageHeading } from '../../ui/PageHeading';
import { StatCard } from '../../ui/StatCard';
import { LoadingState } from '../../features/exams/ExamUI';

const COLLECTION_LABEL = { kc: 'KC Magazines', progressive: 'Progressive Magazines' };
const PDF_LIMIT = 50 * 1024 * 1024;
const card = 'rounded-xl border border-slate-200 bg-white p-4 shadow-card';
const labelCls = 'mb-1 block text-[11.5px] font-semibold text-navy-800';
const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-[12.5px] outline-none focus:border-primary';
const fmtSize = (b) => (!b ? '—' : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const errorMessage = (err, fallback) => {
  const msg = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};
const EMPTY = { collection: 'kc', folder: '', title: '', subtitle: '', is_premium: false };

function EditModal({ magazine, folders, onClose, onSaved }) {
  const [form, setForm] = useState({ collection: magazine.collection, folder: magazine.folder || '', title: magazine.title, subtitle: magazine.subtitle || '', is_premium: magazine.is_premium, sort_order: magazine.sort_order });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true); setError('');
    try { await magazineService.update(magazine.id, form); await onSaved(); onClose(); } catch (err) { setError(errorMessage(err, 'Could not save.')); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/50 p-4" role="dialog" aria-modal="true" aria-label="Edit magazine" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-[17px] font-bold text-navy-800">Edit Magazine</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><XIcon className="h-4 w-4" aria-hidden="true" /></button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className={labelCls}>Title</span><input value={form.title} maxLength={150} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} /></label>
          <label className="block sm:col-span-2"><span className={labelCls}>Subtitle</span><input value={form.subtitle} maxLength={200} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className={inputCls} /></label>
          <label className="block"><span className={labelCls}>Collection</span>
            <select value={form.collection} onChange={(e) => setForm({ ...form, collection: e.target.value })} className={inputCls}><option value="kc">KC Magazines</option><option value="progressive">Progressive Magazines</option></select></label>
          <label className="block"><span className={labelCls}>Folder</span><input value={form.folder} maxLength={80} list="magazine-folders-edit" onChange={(e) => setForm({ ...form, folder: e.target.value })} className={inputCls} />
            <datalist id="magazine-folders-edit">{folders.map((f) => <option key={f} value={f} />)}</datalist></label>
          <label className="block"><span className={labelCls}>Order</span><input type="number" min="0" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} className={inputCls} /></label>
          <label className="mt-5 flex items-center gap-2 text-[12.5px] text-slate-700"><input type="checkbox" checked={form.is_premium} onChange={(e) => setForm({ ...form, is_premium: e.target.checked })} className="h-4 w-4 accent-primary" /> Premium (needs an active plan)</label>
        </div>
        {error && <p role="alert" className="mt-3 text-[12.5px] text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-primary px-5 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminMagazines() {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [status, setStatus] = useState({ kind: '', text: '' });
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const fileRef = useRef(null);

  const load = () => magazineService.adminList()
    .then((d) => setList(d))
    .catch((err) => { setList([]); setStatus({ kind: 'error', text: errorMessage(err, 'Could not load magazines.') }); });
  useEffect(() => { load(); }, []);

  const all = useMemo(() => list || [], [list]);
  const folders = useMemo(() => [...new Set(all.map((m) => m.folder).filter(Boolean))].sort(), [all]);
  const visible = all.filter((m) => (!filter || m.collection === filter)
    && `${m.title} ${m.subtitle || ''} ${m.folder || ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  const pick = (f) => {
    setStatus({ kind: '', text: '' });
    if (!f) return;
    if (f.type !== 'application/pdf') { setStatus({ kind: 'error', text: 'Only PDF files can be uploaded.' }); return; }
    if (f.size > PDF_LIMIT) { setStatus({ kind: 'error', text: 'The PDF must be 50 MB or smaller.' }); return; }
    setFile(f);
    if (!form.title) setForm((prev) => ({ ...prev, title: f.name.replace(/\.pdf$/i, '') }));
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!file) { setStatus({ kind: 'error', text: 'Choose a PDF file to upload.' }); return; }
    if (!form.title.trim()) { setStatus({ kind: 'error', text: 'Title is required.' }); return; }
    setProgress(0); setStatus({ kind: '', text: '' });
    try {
      await magazineService.upload(form, file, (p) => setProgress(p));
      setStatus({ kind: 'ok', text: `"${form.title}" uploaded.` });
      setForm({ ...EMPTY, collection: form.collection, folder: form.folder, is_premium: form.is_premium });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err) {
      setStatus({ kind: 'error', text: errorMessage(err, 'Upload failed.') });
    } finally {
      setProgress(null);
    }
  };

  const togglePremium = async (m) => {
    try { await magazineService.update(m.id, { is_premium: !m.is_premium }); await load(); } catch (err) { setStatus({ kind: 'error', text: errorMessage(err, 'Could not update.') }); }
  };
  const remove = async (m) => {
    if (!window.confirm(`Delete "${m.title}"? The PDF file is removed permanently.`)) return;
    try { await magazineService.remove(m.id); await load(); } catch (err) { setStatus({ kind: 'error', text: errorMessage(err, 'Could not delete.') }); }
  };

  return (
    <div className="nd">
      <PageHeading icon={<BookOpenIcon className="h-5 w-5" aria-hidden="true" />} title="PDF Magazines"
        subtitle="Upload KC and Progressive magazines for students. Premium PDFs open only for students with an active plan." />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<FileTextIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Total Magazines" value={list ? all.length : '—'} />
        <StatCard icon={<BookOpenIcon className="h-5 w-5" />} iconBg="#DC3545" label="KC Magazines" value={list ? all.filter((m) => m.collection === 'kc').length : '—'} />
        <StatCard icon={<BookOpenIcon className="h-5 w-5" />} iconBg="#198754" label="Progressive Magazines" value={list ? all.filter((m) => m.collection === 'progressive').length : '—'} />
        <StatCard icon={<CrownIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Premium" value={list ? all.filter((m) => m.is_premium).length : '—'} />
      </div>

      {status.text && <p role={status.kind === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-lg border px-3 py-2 text-[12.5px] ${status.kind === 'error' ? 'border-rose-200 bg-rose-50 text-danger' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{status.text}</p>}

      <form onSubmit={upload} className={`${card} mb-4`}>
        <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-navy-800"><UploadIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Upload a Magazine</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr]">
          <label className="block"><span className={labelCls}>PDF File (max 50 MB)</span>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={(e) => pick(e.target.files?.[0])} className="block w-full text-[12px] text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-primary-700" /></label>
          <label className="block"><span className={labelCls}>Title</span><input value={form.title} maxLength={150} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. KC Magazine - 01" className={inputCls} /></label>
          <label className="block"><span className={labelCls}>Subtitle (optional)</span><input value={form.subtitle} maxLength={200} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="e.g. General, Rajya Sabha, Lok Sabha" className={inputCls} /></label>
          <label className="block"><span className={labelCls}>Collection</span>
            <select value={form.collection} onChange={(e) => setForm({ ...form, collection: e.target.value })} className={inputCls}><option value="kc">KC Magazines</option><option value="progressive">Progressive Magazines</option></select></label>
          <label className="block"><span className={labelCls}>Folder (optional)</span><input value={form.folder} maxLength={80} list="magazine-folders" onChange={(e) => setForm({ ...form, folder: e.target.value })} placeholder="e.g. Progressive 2026" className={inputCls} />
            <datalist id="magazine-folders">{folders.map((f) => <option key={f} value={f} />)}</datalist></label>
          <label className="mt-5 flex items-center gap-2 text-[12.5px] text-slate-700"><input type="checkbox" checked={form.is_premium} onChange={(e) => setForm({ ...form, is_premium: e.target.checked })} className="h-4 w-4 accent-primary" /> Premium (needs an active plan)</label>
          <div className="flex items-end xl:col-span-2">
            <button type="submit" disabled={progress !== null} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
              <UploadIcon className="h-4 w-4" aria-hidden="true" /> {progress !== null ? `Uploading… ${progress}%` : 'Upload PDF'}
            </button>
          </div>
        </div>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 p-3.5">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by collection" className="rounded-md border border-slate-300 px-2.5 py-1.5 text-[12px] text-slate-600 outline-none focus:border-primary">
            <option value="">All Collections</option><option value="kc">KC Magazines</option><option value="progressive">Progressive Magazines</option>
          </select>
          <div className="relative ml-auto">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, folder..." aria-label="Search magazines" className="w-[240px] rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-[12px] outline-none focus:border-primary" />
          </div>
        </div>
        {list === null ? <LoadingState>Loading magazines…</LoadingState> :
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[12px]">
              <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-600">
                <tr>{['Title', 'Collection', 'Folder', 'Pages', 'Size', 'Access', 'Uploaded', 'Actions'].map((h) => <th key={h} scope="col" className="px-3 py-2.5">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-500">{all.length ? 'No magazines match.' : 'No magazines uploaded yet.'}</td></tr>}
                {visible.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5"><span className="block font-semibold text-navy-800">{m.title}</span>{m.subtitle && <span className="block text-[10.5px] text-slate-500">{m.subtitle}</span>}</td>
                    <td className="px-3 py-2.5 text-slate-600">{COLLECTION_LABEL[m.collection]}</td>
                    <td className="px-3 py-2.5 text-slate-600">{m.folder || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{m.pages ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{fmtSize(m.size_bytes)}</td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => togglePremium(m)} title="Click to switch Free / Premium"
                        className={`rounded px-2 py-[3px] text-[10.5px] font-semibold ${m.is_premium ? 'bg-amber-50 text-[#B45309]' : 'bg-emerald-50 text-emerald-700'}`}>
                        {m.is_premium ? 'Premium' : 'Free'}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{new Date(m.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setEditing(m)} aria-label={`Edit ${m.title}`} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-slate-600 hover:border-primary hover:text-primary"><PencilIcon className="h-3.5 w-3.5" aria-hidden="true" /> Edit</button>
                        <button type="button" onClick={() => remove(m)} aria-label={`Delete ${m.title}`} className="inline-flex items-center rounded border border-rose-200 bg-rose-50 px-2 py-1 text-danger hover:bg-rose-100"><Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </section>
      {editing && <EditModal magazine={editing} folders={folders} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}
