// Shared result rows for the scoring tests: a typing passage with known mistakes
// and steno rows, crossed with every admin pattern setting that affects scoring.
export const REF = 'The quick brown fox jumps over the lazy dog near the river bank today'.split(' ');

export const typingRow = (over = {}) => ({
  mode: 'English Typing',
  reference_words: REF,
  // 0 correct ... a spelling error at 3, half at 5, omission at 8, untyped tail 12-13
  word_statuses: REF.map((_, i) => (i === 3 ? 'error' : i === 5 ? 'half-error' : i === 8 ? 'pending' : i >= 12 ? 'pending' : 'correct')),
  user_input: 'The quick brown fax jumps Over the lazy near  the river bank',
  total_strokes: 62,
  time_elapsed: 90,
  pattern_data: {},
  ...over,
});

export const stenoRow = (over = {}) => ({
  mode: 'Steno English',
  reference_words: REF,
  word_statuses: [],
  user_input: 'The quick brown fox jumps over lazy dog near the river',
  full_errors: 3,
  half_errors: 2,
  total_strokes: 55,
  time_elapsed: 120,
  pattern_data: {},
  ...over,
});

const bools = [true, false];
export const PATTERNS = [];
for (const speed_count of ['Words', 'Strokes', undefined])
  for (const half_mistake_enabled of bools)
    for (const penalty_type of ['Word', 'Stroke'])
      for (const penalty_value of [0, 1, 10])
        for (const count_omissions_as_errors of bools)
          for (const ign of [false, true])
            PATTERNS.push({
              speed_count, half_mistake_enabled, penalty_type, penalty_value, count_omissions_as_errors,
              qualify_on: 'NWPM', required_speed: 10, required_accuracy: 80,
              ignorable_mistakes_enabled: ign, ignorable_mistakes_percent: ign ? 5 : 0, ignorable_penalty_words_per_mistake: 10,
            });
