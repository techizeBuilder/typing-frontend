import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderIcon, FolderPlusIcon, HeartIcon, PencilIcon, PlayIcon, Trash2Icon, XIcon } from 'lucide-react';
import { PageHeading } from '../../ui/PageHeading';
import { EmptyState, LoadingState, OfflineBanner } from '../../features/exams/ExamUI';
import { DifficultyBadge } from '../../features/exams/ExamFilters';
import { modeLabel } from '../../features/exams/examData';
import { useOnlineStatus } from '../../features/exams/useExamData';
import { useFavourites, favouriteActions, errorMessage } from '../../features/favourites/favouritesStore';
import { FavouriteButton } from '../../features/favourites/FavouriteUI';

const practicePath = (c) => {
  const examId = c.exam_id || (Array.isArray(c.exam_ids) ? c.exam_ids[0] : null);
  return examId ? `/steno/${examId}/practice/${c.id}?mode=${encodeURIComponent(c.font_group)}` : null;
};

function DictationCard({ chapter, folderId }) {
  const [busy, setBusy] = useState(false);
  const to = practicePath(chapter);
  return (
    <li className="flex flex-col rounded-lg border border-slate-200 bg-white p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h4 className="min-w-0 font-display text-[14.5px] font-semibold leading-snug text-navy-800">
          {chapter.name || `Dictation ${chapter.chapter_no}`}
        </h4>
        <span className="flex shrink-0 items-center gap-2">
          {chapter.difficulty && <DifficultyBadge value={chapter.difficulty} />}
          <FavouriteButton chapterId={chapter.id} />
        </span>
      </div>
      <p className="mt-1 text-[11.5px] text-slate-500">{chapter.exam_name || 'Exam'} · {modeLabel(chapter.font_group)}</p>
      <p className="mt-1.5 text-[12px] text-slate-600">
        {chapter.word_count ? `${chapter.word_count} Words` : ''}{chapter.word_count && chapter.steno_speed ? ' · ' : ''}{chapter.steno_speed ? `${chapter.steno_speed} WPM` : ''}
      </p>
      <div className="mt-auto flex items-center gap-2 pt-3">
        {to ?
          <Link to={to} className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-navy-900 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-800">
            <PlayIcon className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> Practise
          </Link> :
          <span className="flex-1 text-[11.5px] text-slate-400">Not linked to an exam</span>
        }
        {folderId &&
          <button type="button" disabled={busy} title="Remove from this folder" aria-label="Remove from this folder"
            onClick={async () => { setBusy(true); try { await favouriteActions.toggleInFolder(folderId, chapter.id); } finally { setBusy(false); } }}
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            <XIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        }
      </div>
    </li>
  );
}

export default function MyDictations() {
  const { status, favourites, folders, chapters, error } = useFavourites();
  const isOffline = useOnlineStatus();
  const [tab, setTab] = useState('fav');
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(null); // { id, name }
  const [actionError, setActionError] = useState('');

  const folder = folders.find((f) => f.id === tab);
  const activeTab = tab === 'fav' || folder ? tab : 'fav';
  const ids = activeTab === 'fav' ? favourites : folder.chapter_ids;
  const list = ids.map((id) => chapters[id]).filter(Boolean);

  const act = async (fn) => {
    setActionError('');
    try { await fn(); } catch (err) { setActionError(errorMessage(err, 'Could not update your folders.')); }
  };
  const create = () => {
    const name = newName.trim();
    if (name) act(async () => { await favouriteActions.createFolder(name); setNewName(''); });
  };

  const tabCls = (on) => `flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-[12.5px] font-medium transition-colors duration-150 ${
    on ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`;

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <PageHeading
        icon={<HeartIcon className="h-5 w-5" />}
        title="My Dictations"
        subtitle="Your favourite dictations and your own folders. Saved to your account on every device."
        crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'My Dictations' }]} />

      {isOffline && <OfflineBanner what="dictations" />}
      {status === 'idle' || status === 'loading' ? <LoadingState>Loading your dictations…</LoadingState> :
        status === 'error' ? <EmptyState>{error || 'Could not load your saved dictations.'} Connect to the internet and try again.</EmptyState> :
          <>
            <section className="mb-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
              <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Saved lists">
                <button type="button" role="tab" aria-selected={activeTab === 'fav'} onClick={() => setTab('fav')} className={tabCls(activeTab === 'fav')}>
                  <HeartIcon className="h-4 w-4" aria-hidden="true" /> Favourites
                  <span className="rounded bg-black/10 px-1.5 text-[11px] font-semibold">{favourites.length}</span>
                </button>
                {folders.map((f) => (
                  <button key={f.id} type="button" role="tab" aria-selected={activeTab === f.id} onClick={() => setTab(f.id)} className={tabCls(activeTab === f.id)}>
                    <FolderIcon className="h-4 w-4" aria-hidden="true" /> {f.name}
                    <span className="rounded bg-black/10 px-1.5 text-[11px] font-semibold">{f.chapter_ids.length}</span>
                  </button>
                ))}
                <div className="ml-auto flex gap-2">
                  <input value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()}
                    placeholder="New folder name" aria-label="New folder name"
                    className="w-[180px] rounded-md border border-slate-300 px-3 py-2 text-[12.5px] outline-none focus:border-primary" />
                  <button type="button" onClick={create} disabled={!newName.trim()}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
                    <FolderPlusIcon className="h-4 w-4" aria-hidden="true" /> Create
                  </button>
                </div>
              </div>
              {folder &&
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[12.5px]">
                  {renaming?.id === folder.id ?
                    <>
                      <input value={renaming.name} maxLength={60} autoFocus aria-label="Folder name"
                        onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && act(async () => { await favouriteActions.renameFolder(folder.id, renaming.name); setRenaming(null); })}
                        className="w-[220px] rounded-md border border-slate-300 px-3 py-1.5 outline-none focus:border-primary" />
                      <button type="button" onClick={() => act(async () => { await favouriteActions.renameFolder(folder.id, renaming.name); setRenaming(null); })}
                        className="rounded-md bg-primary px-3 py-1.5 font-semibold text-white hover:bg-primary-700">Save</button>
                      <button type="button" onClick={() => setRenaming(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50">Cancel</button>
                    </> :
                    <>
                      <span className="font-semibold text-navy-800">{folder.name}</span>
                      <button type="button" onClick={() => setRenaming({ id: folder.id, name: folder.name })}
                        className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50">
                        <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" /> Rename
                      </button>
                      <button type="button"
                        onClick={() => { if (window.confirm(`Delete the folder "${folder.name}"? The dictations themselves are not deleted.`)) act(async () => { await favouriteActions.deleteFolder(folder.id); setTab('fav'); }); }}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-danger hover:bg-rose-100">
                        <Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" /> Delete folder
                      </button>
                    </>
                  }
                </div>
              }
              {actionError && <p role="alert" className="mt-2 text-[12.5px] text-danger">{actionError}</p>}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
              {list.length === 0 ?
                <EmptyState>
                  {activeTab === 'fav'
                    ? 'No favourites yet. Tap the heart on any dictation to save it here.'
                    : 'This folder is empty. Use the folder button on a dictation to add it.'}
                </EmptyState> :
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {list.map((c) => <DictationCard key={c.id} chapter={c} folderId={folder?.id} />)}
                </ul>
              }
            </section>
          </>
      }
    </div>
  );
}
