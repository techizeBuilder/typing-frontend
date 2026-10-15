import { useState } from 'react';
import { CheckIcon, FolderIcon, FolderPlusIcon, HeartIcon, PlusIcon, XIcon } from 'lucide-react';
import { useFavourites, favouriteActions, errorMessage } from './favouritesStore';

// Heart toggle for one dictation. Hidden until the saved list has loaded
// (e.g. offline), so it never shows a wrong state.
export function FavouriteButton({ chapterId, className = 'h-4 w-4', boxed = false }) {
  const { status, favourites } = useFavourites();
  if (status !== 'ready') return null;
  const on = favourites.includes(chapterId);
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); favouriteActions.toggle(chapterId).catch(() => {}); }}
      aria-pressed={on} aria-label={on ? 'Remove from favourites' : 'Add to favourites'} title={on ? 'Remove from favourites' : 'Add to favourites'}
      className={boxed
        ? `grid h-9 w-9 place-items-center rounded-md border transition-colors duration-150 ${on ? 'border-rose-200 bg-rose-50 text-rose-500' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`
        : 'text-rose-500 transition-colors duration-150 hover:text-rose-600'}>
      <HeartIcon className={`${className} ${on ? 'fill-current' : ''}`} aria-hidden="true" />
    </button>
  );
}

// Folder button that opens the "Add to a Folder" dialog.
export function FolderButton({ chapterId, title, className = 'h-4 w-4', boxed = false }) {
  const { status, folders } = useFavourites();
  const [open, setOpen] = useState(false);
  if (status !== 'ready') return null;
  const saved = folders.some((f) => f.chapter_ids.includes(chapterId));
  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); }} aria-label="Add to a folder" title="Add to a folder"
        className={boxed
          ? `grid h-9 w-9 place-items-center rounded-md border transition-colors duration-150 ${saved ? 'border-primary-100 bg-primary-50 text-primary' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`
          : 'text-primary transition-colors duration-150 hover:text-primary-700'}>
        <FolderIcon className={`${className} ${saved ? 'fill-primary-100' : ''}`} aria-hidden="true" />
      </button>
      {open && <AddToFolderModal chapterId={chapterId} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

export function AddToFolderModal({ chapterId, title, onClose }) {
  const { folders } = useFavourites();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const act = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); } catch (err) { setError(errorMessage(err, 'Could not update your folders.')); } finally { setBusy(false); }
  };
  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    act(async () => { await favouriteActions.createFolder(trimmed, chapterId); setName(''); });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/50 p-4" role="dialog" aria-modal="true" aria-label="Add to a folder" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <h3 className="flex items-center gap-2.5 font-display text-[19px] font-bold text-navy-800">
            <FolderPlusIcon className="h-5 w-5 text-primary" aria-hidden="true" /> Add to a Folder
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <XIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mb-5 text-[13px] text-slate-500">
          {title ? <><b className="text-navy-800">{title}</b> — organise</> : 'Organise'} this dictation into your own folders. Find them again under <b>My Dictations</b> in the sidebar.
        </p>
        {folders.length === 0 ?
          <div className="mb-5 flex flex-col items-center gap-2.5 py-6 text-center">
            <FolderIcon className="h-12 w-12 text-slate-300" aria-hidden="true" />
            <p className="text-[13px] text-slate-400">No folders yet — create your first one below.</p>
          </div> :
          <ul className="mb-5 max-h-56 space-y-2 overflow-y-auto">
            {folders.map((f) => {
              const inside = f.chapter_ids.includes(chapterId);
              return (
                <li key={f.id}>
                  <button type="button" disabled={busy} aria-pressed={inside} onClick={() => act(() => favouriteActions.toggleInFolder(f.id, chapterId))}
                    className={`flex w-full items-center gap-2.5 rounded-md border px-4 py-2.5 text-left text-[13.5px] text-navy-800 transition-colors duration-150 disabled:opacity-60 ${
                      inside ? 'border-primary bg-primary-50/60' : 'border-slate-200 hover:border-primary hover:bg-primary-50/40'}`}>
                    <FolderIcon className="h-4 w-4 text-primary" aria-hidden="true" /> {f.name}
                    <span className="ml-auto text-[11px] text-slate-400">{f.chapter_ids.length}</span>
                    {inside && <CheckIcon className="h-4 w-4 text-primary" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        }
        <div className="flex gap-2">
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder="Create a new folder..." aria-label="New folder name"
            className="w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-primary" />
          <button type="button" disabled={busy || !name.trim()} onClick={create}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            <PlusIcon className="h-4 w-4" aria-hidden="true" /> Create
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-[12.5px] text-danger">{error}</p>}
      </div>
    </div>
  );
}
