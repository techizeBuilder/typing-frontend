import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CrownIcon,
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  FolderIcon,
  LightbulbIcon,
  LockIcon,
  SearchIcon,
} from 'lucide-react';
import { magazineService } from '../../services/api';
import { Breadcrumbs } from '../../ui/PageHeading';
import { EmptyState, LoadingState } from '../../features/exams/ExamUI';

const COLLECTIONS = {
  kc: {
    title: 'KC Magazines (PDF)',
    crumb: 'KC Magazines',
    text: 'K.C. Magazines are highly useful for shorthand practice. View or download them and improve your speed and accuracy.',
    tips: ['Practise regularly for better speed and accuracy.', 'Use these magazines for daily dictation practice.', 'Keep a notebook for difficult words.'],
  },
  progressive: {
    title: 'Progressive Magazines (PDF)',
    crumb: 'Progressive Magazines',
    text: 'Progressive magazines organised by folder. Pick a folder, then view or download a magazine.',
    tips: ['Start with the latest month and work backwards.', 'Mark difficult outlines and revise them weekly.', 'Combine reading with dictation practice.'],
  },
};
const PAGE_SIZE = 10;

const fmtSize = (b) => (!b ? '—' : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const errorMessage = (err, fallback) => {
  const msg = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};

export default function Magazines({ collection }) {
  const cfg = COLLECTIONS[collection];
  const [data, setData] = useState(null); // { premium, magazines }
  const [error, setError] = useState('');
  const [folder, setFolder] = useState(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [preview, setPreview] = useState({ id: null, url: null, error: '' });
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    magazineService.list(collection)
      .then((d) => { setData(d); setError(''); })
      .catch((err) => { setData({ premium: false, magazines: [] }); setError(errorMessage(err, 'Could not load magazines. Check your internet connection.')); });
  }, [collection]);

  const all = useMemo(() => data?.magazines || [], [data]);
  const folders = useMemo(() => [...new Set(all.map((m) => m.folder).filter(Boolean))], [all]);
  const activeFolder = folders.includes(folder) ? folder : (folders[0] ?? null);
  const visible = all.filter((m) => (!folders.length || m.folder === activeFolder)
    && `${m.title} ${m.subtitle || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const selected = all.find((m) => m.id === selectedId) || visible.find((m) => !m.locked) || null;

  // Load the selected PDF as a blob (the file route needs the sign-in token).
  useEffect(() => {
    if (!selected || selected.locked) return undefined;
    let url = null;
    let cancelled = false;
    magazineService.fileBlob(selected.id)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (!cancelled) setPreview({ id: selected.id, url, error: '' });
      })
      .catch((err) => { if (!cancelled) setPreview({ id: selected.id, url: null, error: errorMessage(err, 'Could not open this PDF.') }); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [selected?.id, selected?.locked]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async (m) => {
    setBusy(m.id);
    try {
      const blob = await magazineService.fileBlob(m.id);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${m.title}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (err) {
      setError(errorMessage(err, 'Could not download this PDF.'));
    } finally {
      setBusy(null);
    }
  };

  const shown = preview.id === selected?.id ? preview : { url: null, error: '' };

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-3">
        <Breadcrumbs crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'PDF File' }, { label: cfg.crumb }]} />
      </div>

      <section className="mb-4 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-rose-50 text-danger"><FileTextIcon className="h-6 w-6" aria-hidden="true" /></span>
          <div>
            <h2 className="font-display text-[22px] font-bold text-navy-800">{cfg.title}</h2>
            <p className="max-w-2xl text-[12.5px] text-slate-500">{cfg.text}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2">
            <BookOpenIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            <span><span className="block text-[10px] text-slate-500">Total Magazines</span><span className="block text-[13px] font-bold text-navy-800">{data ? all.length : '—'}</span></span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3.5 py-2">
            <FileTextIcon className="h-4 w-4 text-danger" aria-hidden="true" />
            <span><span className="block text-[10px] text-slate-500">Format</span><span className="block text-[13px] font-bold text-danger">PDF</span></span>
          </div>
        </div>
      </section>

      {error && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {folders.map((f) => (
              <button key={f} type="button" onClick={() => { setFolder(f); setPage(1); }} aria-pressed={f === activeFolder}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 ${
                  f === activeFolder ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                <FolderIcon className="h-3.5 w-3.5" aria-hidden="true" /> {f}
              </button>
            ))}
            <div className="relative ml-auto">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search magazine..." aria-label="Search magazines"
                className="w-[220px] rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-[12.5px] outline-none focus:border-primary" />
            </div>
          </div>

          {data === null ? <LoadingState>Loading magazines…</LoadingState> :
            rows.length === 0 ? <EmptyState>{all.length === 0 ? 'No magazines have been added yet.' : 'No magazines match your search.'}</EmptyState> :
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[12.5px]">
                  <thead className="text-[11px] font-semibold text-slate-500">
                    <tr><th scope="col" className="pb-2">S.No.</th><th scope="col" className="pb-2">Magazine Name</th><th scope="col" className="pb-2">Pages</th><th scope="col" className="pb-2">Size</th><th scope="col" className="pb-2">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((m, i) => (
                      <tr key={m.id} className={selected?.id === m.id ? 'bg-primary-50/40' : ''}>
                        <td className="py-2.5 text-slate-500">{(current - 1) * PAGE_SIZE + i + 1}.</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-rose-50 text-danger"><FileTextIcon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5 font-semibold text-navy-800">
                                {m.title}
                                {m.is_premium && <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-[1px] text-[9.5px] font-bold text-[#B45309]"><CrownIcon className="h-2.5 w-2.5" aria-hidden="true" /> PREMIUM</span>}
                              </span>
                              {m.subtitle && <span className="block text-[10.5px] text-slate-500">{m.subtitle}</span>}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-slate-600">{m.pages ?? '—'}</td>
                        <td className="py-2.5 text-slate-600">{fmtSize(m.size_bytes)}</td>
                        <td className="py-2.5">
                          {m.locked ?
                            <Link to="/plan-pricing" className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-[#B45309] hover:bg-amber-100">
                              <LockIcon className="h-3 w-3" aria-hidden="true" /> Unlock with a plan
                            </Link> :
                            <div className="flex gap-1.5">
                              <button type="button" onClick={() => setSelectedId(m.id)} className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-primary-700">
                                <EyeIcon className="h-3 w-3" aria-hidden="true" /> View
                              </button>
                              <button type="button" disabled={busy === m.id} onClick={() => download(m)} className="flex items-center gap-1 rounded-md bg-success px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#146c43] disabled:opacity-60">
                                <DownloadIcon className="h-3 w-3" aria-hidden="true" /> {busy === m.id ? 'Saving…' : 'Download'}
                              </button>
                            </div>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
          {pages > 1 &&
            <div className="mt-4 flex items-center justify-center gap-1.5">
              <button type="button" aria-label="Previous page" onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1} className="grid h-7 w-7 place-items-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><ChevronLeftIcon className="h-3.5 w-3.5" aria-hidden="true" /></button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" onClick={() => setPage(p)} aria-current={p === current ? 'page' : undefined}
                  className={`grid h-7 w-7 place-items-center rounded-md text-[12px] font-semibold ${p === current ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{p}</button>
              ))}
              <button type="button" aria-label="Next page" onClick={() => setPage(Math.min(pages, current + 1))} disabled={current === pages} className="grid h-7 w-7 place-items-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><ChevronRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </div>
          }
        </section>

        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            <p className="border-b border-slate-100 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800">Preview{selected ? ` (${selected.title})` : ''}</p>
            {!selected ?
              <div className="grid h-[420px] place-items-center bg-slate-50 p-6 text-center text-[12.5px] text-slate-500">
                {all.some((m) => m.locked) && !all.some((m) => !m.locked)
                  ? <span><LockIcon className="mx-auto mb-2 h-6 w-6 text-amber-500" aria-hidden="true" />These magazines need an active plan. <Link to="/plan-pricing" className="font-semibold text-primary hover:underline">See plans</Link></span>
                  : 'Choose a magazine to preview it here.'}
              </div> :
              shown.url ?
                <iframe key={shown.url} src={shown.url} title={`${selected.title} preview`} className="h-[480px] w-full border-0 bg-slate-100" /> :
                <div className="grid h-[420px] place-items-center bg-slate-50 p-6 text-center text-[12.5px] text-slate-500">
                  {shown.error || <LoadingState>Opening PDF…</LoadingState>}
                </div>
            }
          </section>
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[12.5px] font-bold text-amber-800"><LightbulbIcon className="h-4 w-4" aria-hidden="true" /> Important Tips</h3>
            <ul className="space-y-1.5">
              {cfg.tips.map((t) => <li key={t} className="flex items-start gap-1.5 text-[11.5px] text-amber-800"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" /> {t}</li>)}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
