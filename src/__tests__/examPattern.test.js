import { describe, expect, it } from 'vitest';
import { scoreResult, mistakePenalties, mistakeWeights, penaltyLabel } from '../utils/scoring';
import { examForMode, patternSnapshot, RESULT_COMPONENTS } from '../utils/examPattern';
import { computeResultMetrics } from '../utils/resultMetrics';
import { allComponents, defaultPatternData, examToForm, patternPayload, patternToForm } from '../features/exams/adminExamData';
import { nextDictationNo, stenoFolders, NO_FOLDER } from '../features/tests/testData';
import { mergeLayout } from '../features/screenLayout/screenLayout';
import { PATTERNS, typingRow, stenoRow } from './fixtures';

const P = (o) => ({ ...defaultPatternData(), ...o });
const args = { fullErrors: 10, halfErrors: 4, totalStrokes: 1000, typedWords: 200, correctWords: 180, timeElapsed: 300, originalWords: 250, testStrokes: 1250 };

describe('Penalty & Calculation Settings', () => {
  it('weights each kind of mistake', () => {
    const s = scoreResult({ ...args, extraWords: 2, missingWords: 3, extraSpaces: 1, punctuation: 2,
      pattern: P({ full_mistake_weight: 2, half_mistake_weight: 0.5, extra_word_weight: 0.5, missing_word_weight: 3, extra_space_weight: 0.25, punctuation_weight: 0.1 }) });
    expect(s.totalMistakes).toBe(5 * 2 + 2 * 0.5 + 3 * 3 + 1 * 0.5 + 0.25 + 0.2);
  });
  it('applies words, strokes and speed penalties, strokes per word and multiply', () => {
    const base = { speed_count: 'Strokes', strokes_per_word: 4, mistakes_multiply: 2, words_penalty_enabled: true, words_penalty: 1, strokes_penalty_enabled: true, strokes_penalty: 2, speed_penalty_enabled: true, speed_penalty: 0.5 };
    const s = scoreResult({ ...args, halfErrors: 0, pattern: P(base) });
    expect(s.totalWords).toBe(250);
    expect(s.penaltyWords).toBe(20 + (20 * 2) / 4);
    expect(s.speedPenalty).toBe(10);
    expect(s.nwpm).toBe((250 - 30) / 5 - 10);
    expect(scoreResult({ ...args, pattern: P({ ...base, words_penalty_enabled: false, strokes_penalty_enabled: false, speed_penalty_enabled: false }) }).nwpm).toBe(50);
  });
  it('ignorable limit, then multiply, then the words deduction', () => {
    const s = scoreResult({ ...args, halfErrors: 0, pattern: P({ ignorable_mistakes_enabled: true, ignorable_mistakes_percent: 4, ignorable_penalty_words_per_mistake: 10, mistakes_multiply: 2 }) });
    expect(s.excessMistakes).toBe(2);
    expect(s.penaltyWords).toBe(40);
  });
  it('accuracy on each base', () => {
    const acc = (accuracy_on, extra = {}) => scoreResult({ ...args, halfErrors: 0, ...extra, pattern: P({ accuracy_on }) }).accuracy;
    expect(acc('typed_words')).toBe(95);
    expect(acc('total_words')).toBe(96);
    expect(acc('total_words', { uncountedWords: 50 })).toBe(76);
    expect(acc('typed_strokes')).toBe(95);
    expect(acc('total_strokes')).toBe(96);
    expect(acc('typed_words', { typedWords: 0, totalStrokes: 0 })).toBe(0);
  });
  it('KDPH decides when it is the unit', () => {
    const s = scoreResult({ ...args, fullErrors: 0, halfErrors: 0, pattern: P({ speed_unit: 'KDPH', speed_count: 'Strokes', required_speed: 12000, required_accuracy: 90 }) });
    expect(s.grossKdph).toBe(12000);
    expect(s.qualified).toBe(true);
    expect(scoreResult({ ...args, pattern: P({ speed_unit: 'KDPH', speed_count: 'Strokes', required_speed: 12000 }) }).qualified).toBe(false);
  });
  it('marks: right words plus the net speed range', () => {
    const m = (o) => scoreResult({ ...args, pattern: P(o) }).marks;
    expect(m({})).toBe(null);
    expect(m({ marks_right_words_enabled: true, marks_per_right_word: 0.1 })).toBe(18);
    const r = { marks_net_wpm_enabled: true, marks_ranges: [{ from: 31, to: 37, marks: 12 }, { from: 38, to: 40, marks: 15 }] };
    expect(m(r)).toBe(12);          // 37.6 net
    expect(m({ ...r, marks_right_words_enabled: true, marks_per_right_word: 0.1 })).toBe(30);
    expect(m({ ...r, marks_ranges: [] })).toBe(0);
  });
  it('steno uses the weights in its percentage', () => {
    const s = scoreResult({ steno: true, originalWords: 100, typedWords: 98, fullErrors: 4, missingWords: 2, halfErrors: 2, punctuation: 2, timeElapsed: 60, pattern: P({ missing_word_weight: 0.5, punctuation_weight: 0 }) });
    expect(s.mistakePercent).toBe(3);
  });
});

describe('older patterns', () => {
  it('reads their single penalty', () => {
    expect(mistakePenalties({ penalty_type: 'Stroke', penalty_value: 10 })).toEqual({ words: 0, strokes: 10, speed: 0 });
    expect(penaltyLabel({ penalty_type: 'Word', penalty_value: 10 })).toBe('10 Words');
    expect(mistakeWeights({ half_mistake_enabled: false }).punctuation).toBe(1);
  });
  it('opening and saving one in the form changes no score', () => {
    for (const p of PATTERNS.filter((x) => x.speed_count)) {
      const saved = patternPayload(patternToForm({ ...p, accuracy_on: 'speed' }));
      for (const row of [typingRow, stenoRow]) expect(computeResultMetrics(row({ pattern_data: saved }))).toEqual(computeResultMetrics(row({ pattern_data: p })));
    }
  });
});

describe('exam settings on top of the pattern', () => {
  const exam = {
    max_words_strokes: 500, no_of_words_strokes: 10, font_groups: ['English Typing', 'Hindi Mangal'],
    result_pattern: { name: 'X', qualify_on: 'NWPM', required_speed: 35, required_accuracy: 95, show_accuracy: true, show_marks: undefined },
  };
  it('an exam without them behaves as before', () => {
    expect(examForMode(exam, 'English Typing')).toEqual(exam);
    const f = examToForm({ ...exam, result_pattern: { ...exam.result_pattern, show_accuracy: false } });
    expect(f.language_rules.hindi).toMatchObject({ enabled: false, min: 10, max: 500, required_speed: 35 });
    expect(f.result_components.show_accuracy).toBe(false);
  });
  it('language decides criteria and limits; components override the pattern', () => {
    const e = { ...exam, language_rules: { english: { enabled: true, qualify_on: 'GWPM', required_speed: 40, required_accuracy: 90, min: 0, max: 0 }, hindi: { enabled: false, required_speed: 1, min: 5, max: 50 } }, result_components: { ...allComponents(true), show_accuracy: false } };
    const en = examForMode(e, 'Steno English'); const hi = examForMode(e, 'Hindi Mangal');
    expect(en.result_pattern).toMatchObject({ qualify_on: 'GWPM', required_speed: 40, show_accuracy: false, show_marks: true });
    expect([en.no_of_words_strokes, en.max_words_strokes]).toEqual([0, 0]);
    expect(hi.result_pattern.required_speed).toBe(35);
    expect(hi.max_words_strokes).toBe(50);
    expect(patternSnapshot(en.result_pattern).required_speed).toBe(40);
  });
  it('has the 17 approved components', () => expect(RESULT_COMPONENTS.length).toBe(17));
});

it('steno folders and the next dictation number', () => {
  const list = [['1', 'Volume 1'], ['10', 'Volume 1'], ['A-1', 'Volume 2'], ['3', null]].map(([chapter_no, volume], i) => ({ id: i, chapter_no, volume, font_group: 'Steno English' }));
  const f = stenoFolders(list, 'Steno English');
  expect(f.map((x) => x.name)).toEqual([NO_FOLDER, 'Volume 1', 'Volume 2']);
  expect(f.map((x) => nextDictationNo(x.items))).toEqual(['4', '11', '1']);
  expect(stenoFolders(list, 'Steno Hindi')).toEqual([]);
});

it('panel heights: 10-250pt, older pixel layouts converted once', () => {
  expect(mergeLayout({ heightUnit: 'pt', heights: { header: 10, passage: 250, typing: 251 } }).heights).toEqual({ header: 10, passage: 250, typing: 120 });
  const old = mergeLayout({ heights: { header: 80, passage: 400, typing: 100 } });
  expect(old.heights).toEqual({ header: 60, passage: 250, typing: 75 });
  expect(mergeLayout(old).heights).toEqual(old.heights);
});
