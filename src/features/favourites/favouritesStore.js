// Shared store for the student's favourite dictations and folders, so every
// heart / folder button and count on a page stays in sync. Server-backed
// (follows the student between the web and desktop apps); needs a connection.
import { useEffect, useSyncExternalStore } from 'react';
import { favouriteService } from '../../services/api';

const EMPTY = { status: 'idle', favourites: [], folders: [], chapters: {}, error: '' };
let state = EMPTY;
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

export const errorMessage = (err, fallback) => {
  const msg = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};

let inflight = null;
export function loadFavourites() {
  if (!localStorage.getItem('token')) return Promise.resolve();
  if (state.status === 'idle') set({ status: 'loading' });
  inflight = inflight || favouriteService.getMine()
    .then((d) => set({ status: 'ready', favourites: d.favourites || [], folders: d.folders || [], chapters: d.chapters || {}, error: '' }))
    .catch((err) => set({ status: state.status === 'ready' ? 'ready' : 'error', error: errorMessage(err, 'Could not load your saved dictations.') }))
    .finally(() => { inflight = null; });
  return inflight;
}

// Logging out / switching account must not show the previous student's lists.
export function resetFavourites() { state = EMPTY; listeners.forEach((l) => l()); }

const run = async (fn) => {
  try {
    await fn();
  } finally {
    await loadFavourites();
  }
};

export const favouriteActions = {
  toggle: (chapterId) => {
    const on = state.favourites.includes(chapterId);
    // Optimistic: flip immediately, then confirm from the server.
    set({ favourites: on ? state.favourites.filter((id) => id !== chapterId) : [chapterId, ...state.favourites] });
    return run(() => (on ? favouriteService.remove(chapterId) : favouriteService.add(chapterId)));
  },
  createFolder: (name, chapterId) => run(async () => {
    const folder = await favouriteService.createFolder(name);
    if (chapterId) await favouriteService.addToFolder(folder.id, chapterId);
  }),
  toggleInFolder: (folderId, chapterId) => {
    const folder = state.folders.find((f) => f.id === folderId);
    const inside = folder?.chapter_ids.includes(chapterId);
    return run(() => (inside ? favouriteService.removeFromFolder(folderId, chapterId) : favouriteService.addToFolder(folderId, chapterId)));
  },
  renameFolder: (folderId, name) => run(() => favouriteService.renameFolder(folderId, name)),
  deleteFolder: (folderId) => run(() => favouriteService.deleteFolder(folderId)),
};

const userKey = () => localStorage.getItem('userId') || '';
let loadedFor = null;

export function useFavourites() {
  const snap = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    if (loadedFor !== userKey()) {
      if (loadedFor !== null) resetFavourites();
      loadedFor = userKey();
      loadFavourites();
    } else if (state.status === 'idle' || state.status === 'error') {
      loadFavourites();
    }
  }, []);
  return snap;
}
