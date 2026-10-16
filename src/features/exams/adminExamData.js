import { examService } from '../../services/api';

// Shared helpers for the admin Exam pages (list, add/edit exam, result patterns).
// Save/delete rules are the ones the old single-page Exams screen used.

export const EXAM_REGIONS = ['Delhi', 'UP', 'MP', 'Rajasthan', 'Haryana', 'Bihar', 'Other State'];
export const FONT_GROUPS = ['English Typing', 'Hindi Mangal', 'Hindi Kruti Dev', 'Hindi Remington (GAIL)', 'Steno English', 'Steno Hindi'];
export const SCREENS = [
  ['Screen 1', 'Screen 1 (CRPF)'], ['Screen 2', 'Screen 2 (Green)'], ['Screen 3', 'Screen 3 (SSC - No Sidebar)'], ['Screen 4', 'Screen 4 (Line-by-Line)'],
  ['Screen 5', 'Screen 5 (TCS)'], ['Screen 6', 'Screen 6 (DSSSB)'], ['Screen 7', 'Screen 7 (Institute Layout)'],
];
export const BACKSPACE = [['Full Backspace', 'Full'], ['Current Word Backspace', 'Current Word'], ['Two Words Backspace', 'Two Words'], ['No Backspace', 'Disabled']];
export const HIGHLIGHT_COLORS = ['yellow', 'blue', 'green', 'red', 'orange', 'pink', 'black'];
export const TEST_TIMES = Array.from({ length: 18 }, (_, i) => (i + 1) * 5); // 5 … 90
export const FONT_SIZES = Array.from({ length: 26 }, (_, i) => i + 10); // 10 … 35

export const defaultExamData = () => ({
  name: '', test_time_minutes: 10, screen_type: 'Screen 1', result_pattern_id: '', backspace_control: 'Full Backspace',
  highlight_word: true, highlight_color: 'yellow', auto_scroll: true, highlight_error: true, font_size_user_screen: 20, font_size_test_screen: 20,
  font_group: 'English Typing', font_groups: ['English Typing'], test_paper_screen: 'Screen', auto_submit: false, test_re_type: false,
  max_words_strokes: 0, no_of_words_strokes: 0, region: '', display_title: '', conducted_by: '', mistake_policy: '', is_active: true,
});

export const getExamFontGroups = (exam) => {
  if (Array.isArray(exam?.font_groups) && exam.font_groups.length > 0) return exam.font_groups;
  if (exam?.font_group) return [exam.font_group];
  return [];
};
export const examToForm = (e) => ({ ...e, result_pattern_id: e.result_pattern?.id || '', font_groups: getExamFontGroups(e) });

export const examKind = (exam) => {
  const g = getExamFontGroups(exam);
  const steno = g.some((x) => x.includes('Steno')); const typing = g.some((x) => !x.includes('Steno'));
  return steno && typing ? 'Typing + Steno' : steno ? 'Steno' : 'Typing';
};
export const examLanguages = (exam) => {
  const g = getExamFontGroups(exam);
  const langs = [];
  if (g.some((x) => x === 'English Typing' || x === 'Steno English')) langs.push('English');
  if (g.some((x) => x.includes('Hindi'))) langs.push('Hindi');
  return langs.join(', ') || '—';
};
export const screenLabel = (s) => (SCREENS.find(([v]) => v === s)?.[1] || s || '—');

// Create/update an exam (multipart: logo + fields), then the rules PDF. Returns the saved id.
export async function saveExam(examData, currentExam, { logo, rulesPdf, removeRulesPdf }) {
  const data = new FormData();
  Object.keys(examData).forEach((key) => {
    if (
      key === 'id' || key === 'created_at' || key === 'updated_at' ||
      key === 'result_pattern' || key === 'result_pattern_id' ||
      key === 'font_groups' || // handled separately below
      examData[key] === null || examData[key] === undefined
    ) return;
    data.append(key, examData[key]);
  });
  // Send font_groups as JSON string; backend parses it
  data.append('font_groups', JSON.stringify(examData.font_groups || []));
  // Attach pattern ID explicitly under the field name the backend expects
  if (examData.result_pattern_id) data.append('result_pattern', examData.result_pattern_id);
  if (logo) data.append('image', logo);

  const saved = currentExam ? await examService.updateExam(currentExam.id, data) : await examService.createExam(data);
  const savedId = saved?.id || currentExam?.id;
  if (savedId && rulesPdf) await examService.uploadRulesPdf(savedId, rulesPdf);
  else if (savedId && removeRulesPdf && currentExam?.rules_pdf_url) await examService.removeRulesPdf(savedId);
  return savedId;
}

export const setExamActive = (exam, active) => {
  const data = new FormData();
  data.append('is_active', active ? 'true' : 'false');
  return examService.updateExam(exam.id, data);
};

export const msgOf = (error, fallback = 'Unknown error') => {
  const msg = error?.response?.data?.message || error?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};

// Delete an exam; on 409 (results/linked chapters) offer the force delete. Resolves true when deleted.
export async function deleteExamWithConfirm(id) {
  if (!window.confirm('Are you sure you want to delete this exam?')) return false;
  try {
    await examService.deleteExam(id);
    return true;
  } catch (error) {
    // 409 = exam has results and/or linked chapters blocking a normal delete.
    // Offer a Force Delete that removes those results and unlinks chapters instead.
    if (error?.response?.status === 409) {
      if (!window.confirm(`${msgOf(error)}\n\nForce delete anyway? This will permanently delete the exam and all its recorded results.`)) return false;
      try {
        await examService.deleteExam(id, true);
        return true;
      } catch (forceError) {
        alert(`Error force deleting exam: ${msgOf(forceError)}`);
        return false;
      }
    }
    alert(`Error deleting exam: ${msgOf(error)}`);
    return false;
  }
}

// ── Result patterns ──
export const defaultPatternData = () => ({
  name: '', speed_count: 'Words', half_mistake_enabled: false, penalty_type: 'Word', penalty_value: 1, count_right_words_only: false,
  qualify_on: 'NWPM', required_speed: 35, required_accuracy: 95, ignorable_mistakes_enabled: false, ignorable_mistakes_percent: 0,
  ignorable_penalty_words_per_mistake: 10, show_half_mistakes: true, show_full_mistakes: true, show_total_strokes: true, show_total_words: true,
  show_total_errors: true, show_correct_words: true, show_gross_speed: true, show_net_speed: true, show_accuracy: true, show_penalty_words: true,
  show_ignorable_mistakes: true, count_omissions_as_errors: true,
});
export const VISIBILITY = [
  ['show_full_mistakes', 'Full Mistakes'], ['show_half_mistakes', 'Half Mistakes'], ['show_total_errors', 'Total Errors'], ['show_total_strokes', 'Total Strokes'],
  ['show_total_words', 'Total Words'], ['show_correct_words', 'Right/Correct Words'], ['show_gross_speed', 'Gross Speed (GWPM)'], ['show_net_speed', 'Net Speed (NWPM)'],
  ['show_accuracy', 'Accuracy'], ['show_penalty_words', 'Penalty Words'], ['show_ignorable_mistakes', 'Ignorable Mistakes'],
];
// Strip DB-managed fields so TypeORM doesn't reject them.
export const patternPayload = (p) => {
  const clean = { ...p };
  ['id', 'created_at', 'updated_at'].forEach((k) => delete clean[k]);
  return clean;
};
