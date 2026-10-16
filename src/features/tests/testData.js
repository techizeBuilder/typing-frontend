import { chapterService } from '../../services/api';

// Shared helpers for the admin Test Management pages (list + add/edit page).
// The save rules are the ones the old single-page form used.

export const FONT_GROUPS = ['English Typing', 'Hindi Mangal', 'Hindi Kruti Dev', 'Hindi Remington (GAIL)', 'Steno English', 'Steno Hindi'];
export const LIVE = 'Live Test';
export const PRELOAD = 'Pre-load Test';
export const isStenoGroup = (fg) => (fg || '').includes('Steno');

// Count words in a transcript: collapse whitespace and count non-empty tokens.
export const countWords = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length;
export const countStrokes = (text) => (text || '').replace(/\s/g, '').length;

export const blankChapter = () => ({
  chapter_no: '',
  name: '',
  description: '',
  test_date: new Date().toISOString().split('T')[0],
  font_group: 'English Typing',
  test_type: PRELOAD,
  exam_ids: [],
  content_text: '',
  word_count: '', // auto-calculated from content_text; admin may override
  steno_speed: 100, // default Steno dictation speed (WPM); only sent for Steno chapters
  difficulty: '',
  is_active: true,
});

export const chapterExamIds = (chapter) => (Array.isArray(chapter.exam_ids) && chapter.exam_ids.length > 0
  ? chapter.exam_ids
  : (chapter.exam?.id || chapter.exam_id ? [chapter.exam?.id || chapter.exam_id] : []));

export const chapterExamNames = (chapter) => (Array.isArray(chapter.exams) && chapter.exams.length > 0
  ? chapter.exams.map((e) => e?.name).filter(Boolean)
  : (chapter.exam?.name ? [chapter.exam.name] : []));

// Form state for editing an existing test.
export const chapterToForm = (chapter) => ({
  ...chapter,
  exam_ids: chapterExamIds(chapter),
  // Fall back to the live count so legacy chapters (word_count null) show a value.
  word_count: (chapter.word_count ?? '') === '' ? countWords(chapter.content_text) : chapter.word_count,
  test_date: new Date(chapter.test_date).toISOString().split('T')[0],
});

// Create or update a test, then upload the steno audio if one was chosen. Returns the saved id.
export async function saveChapter(formData, currentChapter, audioFile) {
  const cleanData = { ...formData };
  ['id', 'created_at', 'updated_at', 'audio_url', 'exam', 'exams'].forEach((k) => delete cleanData[k]);
  const ids = Array.isArray(cleanData.exam_ids) ? cleanData.exam_ids.filter(Boolean) : [];
  cleanData.exam_ids = ids;
  cleanData.exam_id = ids.length > 0 ? ids[0] : null;

  // Word count: use the manual override when provided, otherwise auto-calculate
  // from the transcript so the value is always populated.
  const manualCount = parseInt(cleanData.word_count, 10);
  cleanData.word_count = Number.isFinite(manualCount) && manualCount >= 0 ? manualCount : countWords(cleanData.content_text);

  // The Hindi-Steno font columns are opt-in: only Steno chapters send them, so
  // existing English/Hindi typing chapters still save on databases where the
  // language_type / hindi_font_type migration has not been applied yet.
  if (isStenoGroup(cleanData.font_group)) {
    cleanData.language_type = cleanData.font_group === 'Steno Hindi' ? 'Hindi' : 'English';
    cleanData.hindi_font_type = cleanData.font_group === 'Steno Hindi' ? (cleanData.hindi_font_type || 'Mangal') : null;
    // Persist the admin-selected default dictation speed (WPM) for Steno chapters.
    cleanData.steno_speed = parseInt(cleanData.steno_speed, 10) || 100;
  } else {
    delete cleanData.language_type;
    delete cleanData.hindi_font_type;
    delete cleanData.steno_speed;
  }

  let savedId = currentChapter?.id;
  if (currentChapter) {
    await chapterService.updateChapter(currentChapter.id, cleanData);
  } else {
    try {
      const created = await chapterService.createChapter(cleanData);
      savedId = created.id;
    } catch (createErr) {
      // Some hosting proxies/WAFs reject the response of a chapter create that
      // carries large Hindi (e.g. Mangal) content with a 403 — AFTER the backend
      // has already saved the row. Before surfacing an error, check whether the
      // chapter actually exists now; if it does, continue as a normal success.
      if (createErr.response?.status !== 403) throw createErr;
      const existing = await chapterService.getChapters();
      existing.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      const match = existing.find((c) =>
        String(c.chapter_no) === String(cleanData.chapter_no) &&
        c.font_group === cleanData.font_group &&
        c.test_type === cleanData.test_type &&
        new Date(c.test_date).toISOString().split('T')[0] === cleanData.test_date);
      if (!match) throw createErr;
      savedId = match.id;
    }
  }

  // Upload audio file separately if one was selected
  if (audioFile && savedId) await chapterService.uploadAudio(savedId, audioFile);
  return savedId;
}

export const errorText = (err, fallback) => {
  const m = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(m) ? m.join(', ') : m;
};
