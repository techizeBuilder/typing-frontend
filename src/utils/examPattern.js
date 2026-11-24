// The result rules that apply to one attempt: the exam's Result Pattern, with the
// exam's own settings (passing criteria and word limits per language, result
// component visibility) on top. Both test engines use this, and save a snapshot of
// it with the result, so every screen shows the same figures and verdict.

// The 17 components of the exam form, in order.
export const RESULT_COMPONENTS = [
  ['show_test_words', 'Total Words (in Test)'], ['show_total_words', 'Typed Words'],
  ['show_test_strokes', 'Total KeyStrokes (in Test)'], ['show_total_strokes', 'Typed KeyStrokes'],
  ['show_correct_words', 'Right Words'], ['show_correct_strokes', 'Right KeyStrokes'],
  ['show_gross_speed', 'Gross WPM'], ['show_net_speed', 'Net WPM'],
  ['show_kdph', 'KDPH'], ['show_accuracy', 'Accuracy'],
  ['show_full_mistakes', 'Full Mistakes'], ['show_half_mistakes', 'Half Mistakes'],
  ['show_total_errors', 'Total Mistakes'], ['show_backspace_count', 'Backspace Count'],
  ['show_ignorable_mistakes', 'Ignorable Mistakes'], ['show_marks', 'Marks'],
  ['show_rank', 'Rank'],
];

export const languageOf = (mode) => (/hindi/i.test(mode || '') ? 'hindi' : 'english');

// Exam as one language sees it: effective result_pattern and word limits.
export function examForMode(exam, mode) {
  if (!exam) return exam;
  const rules = exam.language_rules?.[languageOf(mode)] || null;
  const out = { ...exam };
  if (rules && Number.isFinite(rules.min)) out.no_of_words_strokes = rules.min;
  if (rules && Number.isFinite(rules.max)) out.max_words_strokes = rules.max;
  if (exam.result_pattern) {
    const p = { ...exam.result_pattern };
    if (exam.result_components) {
      for (const [k] of RESULT_COMPONENTS) p[k] = exam.result_components[k] !== false;
    }
    if (rules?.enabled) {
      p.qualify_on = rules.qualify_on === 'GWPM' ? 'GWPM' : 'NWPM';
      p.required_speed = Number(rules.required_speed) || 0;
      p.required_accuracy = Number(rules.required_accuracy) || 0;
    }
    out.result_pattern = p;
  }
  return out;
}

const SNAPSHOT = [
  'half_mistake_enabled', 'penalty_type', 'penalty_value', 'speed_count', 'qualify_on', 'required_speed', 'required_accuracy',
  'ignorable_mistakes_percent', 'show_penalty_words',
  'speed_unit', 'strokes_per_word', 'accuracy_on',
  'words_penalty_enabled', 'words_penalty', 'strokes_penalty_enabled', 'strokes_penalty', 'speed_penalty_enabled', 'speed_penalty',
  'full_mistake_weight', 'half_mistake_weight', 'extra_word_weight', 'missing_word_weight', 'extra_space_weight', 'punctuation_weight',
  'mistakes_multiply', 'marks_right_words_enabled', 'marks_per_right_word', 'marks_net_wpm_enabled', 'marks_ranges',
  ...RESULT_COMPONENTS.map(([k]) => k),
];
export function patternSnapshot(p) {
  if (!p) return null;
  return {
    name: p.name || null,
    ...Object.fromEntries(SNAPSHOT.map((k) => [k, p[k]])),
    ignorable_mistakes_enabled: p.ignorable_mistakes_enabled ?? false,
    ignorable_penalty_words_per_mistake: p.ignorable_penalty_words_per_mistake ?? 10,
    count_omissions_as_errors: p.count_omissions_as_errors ?? true,
    count_right_words_only: p.count_right_words_only ?? false,
    transposition_mistake: p.transposition_mistake || 'none',
  };
}
