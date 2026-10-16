import { useEffect, useState } from 'react';
import {
  chapterService,
  examService,
  offlineExamService,
  offlineTestService,
  resultService,
  userService,
  getCurrentUserUuid,
} from '../../services/api';
import {
  PRELOAD,
  LIVE,
  isStenoMode,
  findOfflineEntry,
  saveOfflineEntry,
  cacheStenoAudio,
  downloadExamForOffline,
  isVisibleToStudents,
} from './examData';

// Online/offline flag that follows browser connectivity events. Coming back
// online also syncs results that were stored while offline.
export function useOnlineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const goOnline = () => { setIsOffline(false); resultService.syncOfflineResults(); };
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return isOffline;
}

// Exam list: from the server when online (and cached for offline use), else
// from the local offline cache. Same rules as the legacy dashboard.
export function useExamList() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.onLine) {
          const cached = await offlineExamService.getExams();
          if (!cancelled && cached && cached.length > 0) setExams(cached.filter(isVisibleToStudents));
          return;
        }
        try {
          const data = (await examService.getExams()) || [];
          if (cancelled) return;
          setExams(data.filter(isVisibleToStudents));
          if (data.length > 0) offlineExamService.saveExams(data).catch(() => {});
        } catch {
          // Online fetch failed — fall back to locally cached exam list
          const cached = await offlineExamService.getExams().catch(() => null);
          if (!cancelled && cached && cached.length > 0) setExams(cached.filter(isVisibleToStudents));
        }
      } catch (error) {
        console.error('Error fetching exams:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { exams, loading };
}

// Chapter metadata (no passage text) for every exam in a mode + test type, used
// for test counts on exam cards. Empty while offline.
export function useChapterSummary(mode, testType) {
  const key = `${mode}|${testType}`;
  // Results are tagged with the query they belong to, so a mode switch shows
  // nothing stale while the new list loads.
  const [loaded, setLoaded] = useState({ key: null, chapters: [] });
  useEffect(() => {
    let cancelled = false;
    if (!mode || !navigator.onLine) return undefined;
    chapterService.getChapters(mode, testType, undefined, true)
      .then((data) => { if (!cancelled) setLoaded({ key, chapters: Array.isArray(data) ? data.filter(isVisibleToStudents) : [] }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [key, mode, testType]);
  return loaded.key === key ? loaded.chapters : [];
}

// Per-exam "save for offline" status for exam cards (legacy dashboard ↓ button).
export function useExamOfflineSave(mode) {
  const [status, setStatus] = useState({}); // examId → 'idle'|'saving'|'saved'|'error'

  // Pre-populate from persisted offline data
  useEffect(() => {
    offlineTestService.getTests().then((data) => {
      const saved = {};
      (data.tests || []).forEach((t) => { if (t.examId && t.mode === mode && t.testType === PRELOAD) saved[t.examId] = 'saved'; });
      setStatus(saved);
    }).catch(() => {});
  }, [mode]);

  const flash = (examId, value) => {
    setStatus((prev) => ({ ...prev, [examId]: value }));
    setTimeout(() => setStatus((prev) => ({ ...prev, [examId]: 'idle' })), 3000);
  };

  const save = async (exam) => {
    setStatus((prev) => ({ ...prev, [exam.id]: 'saving' }));
    try {
      const ok = await downloadExamForOffline(exam, mode);
      flash(exam.id, ok ? 'saved' : 'error');
    } catch (err) {
      console.error('[Offline Save]', err);
      flash(exam.id, 'error');
    }
  };

  return { status, save };
}

// Everything a test list needs for one exam + mode + test type: chapters (online
// or from the offline store), the student's profile limits, attempts, best
// result and rank per chapter, auto-save for offline, and a manual save.
// `withResults: false` skips the per-user results/ranks (legacy dictation list).
const EMPTY_SESSION = {
  chapters: [],
  userProfile: null,
  attemptsByChapter: {},
  resultsByChapter: {},
  latestByChapter: {},
  rankByChapter: {},
};

// Loads one exam + mode + test type. Same rules as the legacy AvailableTests /
// StenoDictations pages.
async function loadSession(exam, mode, testType, withResults) {
  // ── Offline path ──────────────────────────────────────────────────────────
  if (!navigator.onLine) {
    // Live tests require an internet connection — do not load anything
    if (testType === LIVE) return EMPTY_SESSION;
    // Load the cached profile (served from the offline cache) so the
    // admin-set test limits still apply while offline.
    const userProfile = withResults ? await userService.getProfile().catch(() => null) : null;
    const entry = await findOfflineEntry(exam.id, mode, testType);
    if (!entry) console.warn('[Offline] No preloaded tests found for this exam.');
    return { ...EMPTY_SESSION, userProfile, chapters: entry ? entry.chapters || [] : [] };
  }

  // ── Online path ───────────────────────────────────────────────────────────
  // Sync any pending offline results when coming online
  resultService.syncOfflineResults();
  const userId = withResults ? (getCurrentUserUuid() || localStorage.getItem('userId')) : null;
  const [data, userProfile, userResults] = await Promise.all([
    chapterService.getChapters(mode, testType, exam.id),
    withResults ? userService.getProfile().catch(() => null) : Promise.resolve(null),
    userId ? resultService.getUserResults(userId).catch(() => []) : Promise.resolve([]),
  ]);

  // Track attempts + best (and latest) result per chapter for the current user
  const attemptsByChapter = {};
  const resultsByChapter = {};
  const latestByChapter = {};
  const takenAt = (r) => new Date(r.date_taken || r.created_at || 0).getTime();
  (userResults || []).forEach((r) => {
    if (!r.chapter_id) return;
    attemptsByChapter[r.chapter_id] = (attemptsByChapter[r.chapter_id] || 0) + 1;
    const best = resultsByChapter[r.chapter_id];
    if (!best || Number(r.nwpm) > Number(best.nwpm)) resultsByChapter[r.chapter_id] = r;
    const latest = latestByChapter[r.chapter_id];
    if (!latest || takenAt(r) > takenAt(latest)) latestByChapter[r.chapter_id] = r;
  });

  // Fetch rank for each live chapter the user has attempted
  const rankByChapter = {};
  if (userId && testType === LIVE) {
    const rankEntries = await Promise.all(
      Object.keys(resultsByChapter).map(async (chapterId) => {
        try {
          return [chapterId, await resultService.getChapterRank(chapterId, userId)];
        } catch {
          return [chapterId, null];
        }
      }),
    );
    rankEntries.forEach(([id, info]) => { if (info) rankByChapter[id] = info; });
  }

  return {
    chapters: Array.isArray(data) ? data.filter(isVisibleToStudents) : [],
    userProfile,
    attemptsByChapter,
    resultsByChapter,
    latestByChapter,
    rankByChapter,
  };
}

export function useChapterSession({ exam, mode, testType, withResults = true }) {
  const key = exam && mode && testType ? `${exam.id}|${mode}|${testType}|${withResults}` : null;
  // The loaded session is tagged with the key it belongs to; anything else
  // means the current selection is still loading.
  const [session, setSession] = useState({ key: null, ...EMPTY_SESSION });
  const [downloadStatus, setDownloadStatus] = useState('idle'); // idle | saving | saved | error
  const [audioProgress, setAudioProgress] = useState('');
  const isOffline = useOnlineStatus();
  const steno = isStenoMode(mode);
  const current = session.key === key ? session : { key, ...EMPTY_SESSION };
  const { chapters } = current;

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    loadSession(exam, mode, testType, withResults)
      .catch((error) => {
        console.error('Error fetching chapters:', error);
        return EMPTY_SESSION;
      })
      .then((loaded) => { if (!cancelled) setSession({ key, ...loaded }); });
    return () => { cancelled = true; };
    // `key` captures exam id, mode, test type and withResults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Auto-save preloaded chapters for offline use whenever they load while online
  useEffect(() => {
    if (testType !== PRELOAD || !navigator.onLine || chapters.length === 0 || !exam) return;
    (async () => {
      try {
        const alreadySaved = await findOfflineEntry(exam.id, mode, testType);
        if (alreadySaved) return;
        await saveOfflineEntry(exam, mode, testType, chapters);
        // Cache dictation audio alongside the chapters so Steno works offline.
        if (steno) cacheStenoAudio(chapters).catch(() => {});
        console.log('[Auto-Offline] Saved', exam.name, 'for offline use.');
      } catch (err) {
        console.warn('[Auto-Offline] Could not save:', err);
      }
    })();
    // Runs once per loaded chapter list, like the legacy pages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters]);

  const downloadOffline = async () => {
    if (chapters.length === 0) return;
    try {
      setDownloadStatus('saving');
      setAudioProgress('');
      await saveOfflineEntry(exam, mode, testType, chapters);
      // Steno tests also need their audio stored locally for offline practice.
      if (steno) await cacheStenoAudio(chapters, (done, total) => setAudioProgress(`${done} / ${total}`));
      setAudioProgress('');
      setDownloadStatus('saved');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch (err) {
      console.error('[Download Offline] Failed:', err);
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    }
  };

  return {
    ...current,
    loading: session.key !== key,
    isOffline,
    downloadStatus,
    audioProgress,
    downloadOffline,
  };
}
