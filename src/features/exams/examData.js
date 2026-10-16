// Shared exam/test-selection logic for the student exam pages. Everything here
// was moved out of the legacy StudentDashboard / AvailableTests /
// StenoDictations pages unchanged in behaviour.
import api, { chapterService, offlineTestService } from '../../services/api';
import { API_BASE_URL } from '../../config';

// ─── Modes ────────────────────────────────────────────────────────────────────
// `value` is what the API / DB / test engines use (font_group); `label` is shown.
export const TYPING_MODES = [
  { value: 'English Typing', label: 'English Typing' },
  { value: 'Hindi Mangal', label: 'Hindi Mangal' },
  { value: 'Hindi Kruti Dev', label: 'Hindi Kruti Dev' },
  { value: 'Hindi Remington (GAIL)', label: 'Hindi Remington (GAIL)' },
  // The legacy dashboard also had a "Spreadsheet" button, but it is not a
  // backend font group (no exams/tests can exist for it; the API rejects it).
];

export const STENO_MODES = {
  english: { value: 'Steno English', label: 'English Steno' },
  hindi: { value: 'Steno Hindi', label: 'Hindi Steno' },
};

export const PRELOAD = 'Pre-load Test';
export const LIVE = 'Live Test';

// Exams/tests the admin marked Inactive are hidden from students (results are kept).
export const isVisibleToStudents = (item) => item?.is_active !== false;

export const isStenoMode = (mode) => mode === 'Steno English' || mode === 'Steno Hindi';

export const modeLabel = (mode) =>
  mode === 'Steno English' ? 'English Steno' : mode === 'Steno Hindi' ? 'Hindi Steno' : mode;

export const isKnownMode = (mode) =>
  TYPING_MODES.some((m) => m.value === mode) || isStenoMode(mode);

// An exam is offered for a mode when it lists that font group, or lists none.
export const examMatchesMode = (exam, mode) => {
  const groups = Array.isArray(exam.font_groups) && exam.font_groups.length > 0
    ? exam.font_groups
    : (exam.font_group ? [exam.font_group] : []);
  return groups.length === 0 || groups.includes(mode);
};

// A chapter belongs to an exam via exam_id or the multi-exam exam_ids list
// (same rule the backend applies for ?examId=).
export const chapterInExam = (chapter, examId) =>
  chapter.exam_id === examId || (Array.isArray(chapter.exam_ids) && chapter.exam_ids.includes(examId));

// Natural/numeric sort so tests appear in sequential order (CH-4, CH-5 … CH-34,
// CH-35) instead of lexicographically shuffled (CH-34, CH-4, CH-40, CH-5 …).
export const sortByChapterNo = (a, b) =>
  String(a.chapter_no ?? '').localeCompare(String(b.chapter_no ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });

// Resolve a dictation's word count: prefer the admin-set value, otherwise count
// the transcript so every card shows a real number (no hardcoded placeholder).
export const wordCountFor = (chapter) => {
  if (chapter?.word_count != null && chapter.word_count !== '') return chapter.word_count;
  return (chapter?.content_text || '').trim().split(/\s+/).filter(Boolean).length;
};

// Optional admin-set test difficulty (chapters.difficulty).
export const DIFFICULTIES = ['Easy', 'Moderate', 'Hard'];
export const matchesDifficulty = (chapter, difficulty) =>
  difficulty === 'all' || chapter.difficulty === difficulty;

// Strip trailing /api so we can prepend host to /uploads/...
const ASSETS_BASE = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
export const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${ASSETS_BASE}${url}`;
  return `${ASSETS_BASE}/${url}`;
};

export const examInitials = (name) =>
  String(name || '')
    .split(/[\s/()-]+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join('') || 'EX';

// ─── Offline storage ──────────────────────────────────────────────────────────
// Offline entries are keyed by exam + API mode + test type.
const sameEntry = (t, examId, mode, testType) =>
  t.examId === examId && t.mode === mode && t.testType === testType;

export const findOfflineEntry = async (examId, mode, testType) => {
  const data = await offlineTestService.getTests();
  return (data.tests || []).find((t) => sameEntry(t, examId, mode, testType)) || null;
};

export const saveOfflineEntry = async (exam, mode, testType, chapters) => {
  const existing = await offlineTestService.getTests();
  const others = (existing.tests || []).filter((t) => !sameEntry(t, exam.id, mode, testType));
  await offlineTestService.saveTests([...others, {
    examId: exam.id, mode, testType,
    exam, chapters, saved_at: new Date().toISOString(),
  }]);
};

// Download + cache the dictation audio for each Steno chapter so the test can be
// taken fully offline. No-op outside Electron. `onProgress(done, total)` is
// called after each chapter.
export const cacheStenoAudio = async (chapters, onProgress) => {
  if (!window.electronAPI?.saveAudio) return;
  const token = localStorage.getItem('token');
  let done = 0;
  for (const ch of chapters) {
    try {
      if (!ch?.id) continue;
      if (window.electronAPI.hasAudio) {
        const { exists } = await window.electronAPI.hasAudio(ch.id);
        if (exists) continue; // already saved locally
      }
      const res = await fetch(`${API_BASE_URL}/chapters/${ch.id}/audio`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) continue; // chapter has no audio attached
      const base64 = await blobToBase64(await res.blob());
      await window.electronAPI.saveAudio(ch.id, base64);
    } catch (err) {
      console.warn('[Offline Audio] Could not cache chapter', ch?.id, err?.message);
    } finally {
      done += 1;
      onProgress?.(done, chapters.length);
    }
  }
};

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// Fetch an exam's pre-load chapters and store them (plus steno audio) for
// offline use. Returns false when the exam has no chapters for the mode.
export const downloadExamForOffline = async (exam, mode) => {
  const chapters = ((await chapterService.getChapters(mode, PRELOAD, exam.id)) || []).filter(isVisibleToStudents);
  if (!chapters || chapters.length === 0) return false;
  await saveOfflineEntry(exam, mode, PRELOAD, chapters);
  if (isStenoMode(mode)) cacheStenoAudio(chapters).catch(() => {});
  return true;
};

// ─── Navigation into the engines (state contract unchanged) ───────────────────
export const startTestState = (exam, chapter, mode, testType) => ({
  exam,
  chapter,
  mode,
  testType,
});

// Build the /result navigation state for a stored result row. Copied from the
// legacy AvailableTests "View" action.
export const resultViewState = (r, chapter, exam) => {
  // Only steno results use the StenoDiff view (driven by typedText + referenceText).
  // Typing results must leave these unset so ResultScreen renders the full
  // TypingPassageReview with its Test Analysis / Mistake / Compare tabs.
  const isSteno = (r.mode || '').toLowerCase().includes('steno');
  // Full uploaded passage so the "Original Passage" column shows the complete text,
  // not just the (possibly trimmed) reference_words the student reached.
  const fullPassage = chapter?.content_text || (r.reference_words ? r.reference_words.join(' ') : '');
  return {
    gwpm: r.gwpm,
    nwpm: r.nwpm,
    accuracy: r.accuracy,
    fullErrors: r.full_errors,
    halfErrors: r.half_errors,
    totalStrokes: r.total_strokes,
    timeElapsed: r.time_elapsed,
    testDurationMinutes: r.exam?.test_time_minutes || chapter?.time_minutes || undefined,
    exam_name: r.exam?.name || exam?.name || 'Live Test',
    chapter_no: chapter?.chapter_no || null,
    date_taken: r.date_taken,
    mode: r.mode,
    userInput: r.user_input,
    referenceWords: r.reference_words || [],
    wordStatuses: r.word_statuses || [],
    pattern: r.pattern_data,
    originalPassage: fullPassage,
    ...(isSteno ? { typedText: r.user_input, referenceText: fullPassage } : {}),
  };
};
