import { examService } from '../../services/api';
import { mistakePenalties, mistakeWeights } from '../../utils/scoring';
import { RESULT_COMPONENTS } from '../../utils/examPattern';

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

export const LANGUAGES = [['english', 'English'], ['hindi', 'Hindi']];
export const blankRule = (enabled, p = null, exam = null) => ({
  enabled, qualify_on: p?.qualify_on || 'NWPM', required_speed: p?.required_speed ?? 35, required_accuracy: p?.required_accuracy ?? 90,
  min: exam?.no_of_words_strokes || 0, max: exam?.max_words_strokes || 0,
});
export const allComponents = (on) => Object.fromEntries(RESULT_COMPONENTS.map(([k]) => [k, on]));
// Languages an exam is offered in, from its font groups.
export const offeredLanguages = (groups) => ({
  english: (groups || []).some((g) => g === 'English Typing' || g === 'Steno English'),
  hindi: (groups || []).some((g) => g.includes('Hindi')),
});

export const defaultExamData = () => ({
  name: '', test_time_minutes: 10, screen_type: 'Screen 1', result_pattern_id: '', backspace_control: 'Full Backspace',
  highlight_word: true, highlight_color: 'yellow', auto_scroll: true, highlight_error: true, font_size_user_screen: 20, font_size_test_screen: 20,
  font_group: 'English Typing', font_groups: ['English Typing'], test_paper_screen: 'Screen', auto_submit: false, test_re_type: false,
  max_words_strokes: 0, no_of_words_strokes: 0, region: '', display_title: '', conducted_by: '', exam_level: '', mistake_policy: '', card_tags: '', is_pro_level: false, is_active: true,
  language_rules: { english: blankRule(true), hindi: blankRule(true) }, result_components: allComponents(true), test_format: 'formatting', instructions_text: '',
});


export const getExamFontGroups = (exam) => {
  if (Array.isArray(exam?.font_groups) && exam.font_groups.length > 0) return exam.font_groups;
  if (exam?.font_group) return [exam.font_group];
  return [];
};
export const examToForm = (e) => ({
  ...e, result_pattern_id: e.result_pattern?.id || '', font_groups: getExamFontGroups(e),
  // Exams saved before these settings: criteria off (the pattern's apply), its limits for both languages.
  language_rules: Object.fromEntries(LANGUAGES.map(([k]) => [k, e.language_rules?.[k] || blankRule(false, e.result_pattern, e)])),
  result_components: e.result_components || { ...allComponents(true), ...Object.fromEntries(RESULT_COMPONENTS.map(([k]) => [k, e.result_pattern?.[k] !== false])) },
  test_format: e.test_format || 'formatting', instructions_text: e.instructions_text || '',
});

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
      key === 'font_groups' || key === 'language_rules' || key === 'result_components' || // handled separately below
      key === 'max_words_strokes' || key === 'no_of_words_strokes' ||
      examData[key] === null || examData[key] === undefined
    ) return;
    data.append(key, examData[key]);
  });
  // Send font_groups as JSON string; backend parses it
  data.append('font_groups', JSON.stringify(examData.font_groups || []));
  const offered = offeredLanguages(examData.font_groups);
  const rules = Object.fromEntries(LANGUAGES.filter(([k]) => offered[k]).map(([k]) => [k, examData.language_rules[k]]));
  data.append('language_rules', JSON.stringify(rules));
  data.append('result_components', JSON.stringify(examData.result_components));
  // The single limits stay in step with the first language (older app versions read them).
  const first = Object.values(rules)[0];
  data.append('no_of_words_strokes', first?.min || 0);
  data.append('max_words_strokes', first?.max || 0);
  // Attach pattern ID explicitly under the field name the backend expects
  if (examData.result_pattern_id) data.append('result_pattern', examData.result_pattern_id);
  if (logo) data.append('image', logo);

  const saved = currentExam ? await examService.updateExam(currentExam.id, data) : await examService.createExam(data);
  const savedId = saved?.id || currentExam?.id;
  if (savedId && rulesPdf) await examService.uploadRulesPdf(savedId, rulesPdf);
  else if (savedId && removeRulesPdf && currentExam?.rules_pdf_url) await examService.removeRulesPdf(savedId);
  return savedId;
}

export const setExamScreen = (exam, screen) => {
  const data = new FormData();
  data.append('screen_type', screen);
  return examService.updateExam(exam.id, data);
};

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
  show_ignorable_mistakes: true, count_omissions_as_errors: true, transposition_mistake: 'none',
  // Information + result/rank timing (no effect on scoring)
  description: '', applicable_typing: true, applicable_steno: true, is_default: false,
  live_result_mode: 'immediate', live_result_time: '21:00', preload_result_mode: 'immediate', preload_result_time: '21:00', live_rank_mode: 'immediate',
  // Penalty & Calculation Settings
  speed_unit: 'WPM', strokes_per_word: 5, accuracy_on: 'typed_words',
  words_penalty_enabled: true, words_penalty: 1, strokes_penalty_enabled: false, strokes_penalty: 1, speed_penalty_enabled: false, speed_penalty: 1,
  full_mistake_weight: 1, half_mistake_weight: 0.5, extra_word_weight: 1, missing_word_weight: 1, extra_space_weight: 0.5, punctuation_weight: 0.5,
  mistakes_multiply: 1, marks_right_words_enabled: false, marks_per_right_word: 0.1, marks_net_wpm_enabled: false, marks_ranges: [],
});
// Older patterns have no Penalty & Calculation values: show the ones they behave as.
export const patternToForm = (found) => {
  const p = { ...defaultPatternData(), ...patternPayload(found) };
  const m = mistakePenalties(found);
  const w = mistakeWeights(found);
  return {
    ...p,
    words_penalty_enabled: found.words_penalty_enabled ?? m.words > 0, words_penalty: found.words_penalty ?? (m.words || 1),
    strokes_penalty_enabled: found.strokes_penalty_enabled ?? m.strokes > 0, strokes_penalty: found.strokes_penalty ?? (m.strokes || 1),
    speed_penalty_enabled: found.speed_penalty_enabled ?? false, speed_penalty: found.speed_penalty ?? 1,
    full_mistake_weight: w.full, half_mistake_weight: w.half, extra_word_weight: w.extra, missing_word_weight: w.missing,
    extra_space_weight: w.space, punctuation_weight: w.punctuation,
    marks_ranges: found.marks_ranges || [],
  };
};
// Strip DB-managed fields so TypeORM doesn't reject them.
export const patternPayload = (p) => {
  const clean = { ...p };
  ['id', 'created_at', 'updated_at'].forEach((k) => delete clean[k]);
  if (clean.description == null) clean.description = '';
  // Keep the older single-value fields in step (older app versions read them).
  if (clean.half_mistake_weight != null) clean.half_mistake_enabled = Number(clean.half_mistake_weight) < 1;
  if (clean.words_penalty_enabled != null) {
    const strokes = clean.strokes_penalty_enabled && !clean.words_penalty_enabled;
    clean.penalty_type = strokes ? 'Stroke' : 'Word';
    clean.penalty_value = strokes ? Number(clean.strokes_penalty) : (clean.words_penalty_enabled ? Number(clean.words_penalty) : 0);
  }
  return clean;
};
