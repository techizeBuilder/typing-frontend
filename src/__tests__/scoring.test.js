import { describe, expect, it } from 'vitest';
import golden from './golden-metrics.json';
import { PATTERNS, typingRow, stenoRow, REF } from './fixtures';
import { scoreResult, halfWeightOf, speedCountOf } from '../utils/scoring';
import { computeResultMetrics, typingMistakeCounts } from '../utils/resultMetrics';
import { isResultQualified } from '../features/results/qualify';

const base = { qualify_on: 'NWPM', required_speed: 30, required_accuracy: 90 };

describe('scoreResult follows every admin setting', () => {
  it('speed count: Strokes = keystrokes ÷ 5, Words = words typed', () => {
    const args = { totalStrokes: 250, typedWords: 40, timeElapsed: 60 };
    expect(scoreResult({ ...args, pattern: { speed_count: 'Strokes' } }).gwpm).toBe(50);
    expect(scoreResult({ ...args, pattern: { speed_count: 'Words' } }).gwpm).toBe(40);
    expect(speedCountOf(null)).toBe('Strokes');
  });

  it('count only right words: speed uses correct words / their strokes', () => {
    const args = { totalStrokes: 250, typedWords: 40, correctWords: 30, correctStrokes: 180, timeElapsed: 60 };
    expect(scoreResult({ ...args, pattern: { speed_count: 'Words', count_right_words_only: true } }).gwpm).toBe(30);
    expect(scoreResult({ ...args, pattern: { speed_count: 'Strokes', count_right_words_only: true } }).gwpm).toBe(36);
    expect(scoreResult({ ...args, pattern: { speed_count: 'Words', count_right_words_only: false } }).gwpm).toBe(40);
  });

  it('half mistakes: Yes = 0.5 each, No = 1 each', () => {
    expect(scoreResult({ fullErrors: 2, halfErrors: 4, pattern: { half_mistake_enabled: true } }).totalMistakes).toBe(4);
    expect(scoreResult({ fullErrors: 2, halfErrors: 4, pattern: { half_mistake_enabled: false } }).totalMistakes).toBe(6);
    expect(halfWeightOf(undefined)).toBe(0.5);
  });

  it('penalty: words per mistake, stroke penalties ÷ 5, zero allowed', () => {
    const args = { fullErrors: 3, totalStrokes: 500, timeElapsed: 60 };
    expect(scoreResult({ ...args, pattern: { penalty_type: 'Word', penalty_value: 10 } }).penaltyWords).toBe(30);
    expect(scoreResult({ ...args, pattern: { penalty_type: 'Stroke', penalty_value: 10 } }).penaltyWords).toBe(6);
    const none = scoreResult({ ...args, pattern: { penalty_type: 'Word', penalty_value: 0 } });
    expect(none.penaltyWords).toBe(0);
    expect(none.nwpm).toBe(none.gwpm);
  });

  it('ignorable mistakes: allowance is free, each excess mistake deducts N words', () => {
    const s = scoreResult({ fullErrors: 8, totalStrokes: 1000, timeElapsed: 120, pattern: { ignorable_mistakes_enabled: true, ignorable_mistakes_percent: 5, ignorable_penalty_words_per_mistake: 10 } });
    expect(s.ignorableAllowance).toBe(10);       // 5% of 200 words
    expect(s.excessMistakes).toBe(0);
    expect(s.penaltyWords).toBe(0);
    const t = scoreResult({ fullErrors: 13, totalStrokes: 1000, timeElapsed: 120, pattern: { ignorable_mistakes_enabled: true, ignorable_mistakes_percent: 5, ignorable_penalty_words_per_mistake: 10 } });
    expect(t.excessMistakes).toBe(3);
    expect(t.penaltyWords).toBe(30);
  });

  it('typing qualifies on the chosen speed AND accuracy', () => {
    const args = { totalStrokes: 1000, fullErrors: 5, timeElapsed: 300 };   // 40 gross, 39 net
    expect(scoreResult({ ...args, pattern: { ...base, qualify_on: 'NWPM', required_speed: 40 } }).qualified).toBe(false);
    expect(scoreResult({ ...args, pattern: { ...base, qualify_on: 'GWPM', required_speed: 40 } }).qualified).toBe(true);
    expect(scoreResult({ ...args, pattern: { ...base, required_speed: 10, required_accuracy: 99 } }).qualified).toBe(false);
  });

  it('steno is percentage based and ignores speed for the verdict', () => {
    const s = scoreResult({ steno: true, fullErrors: 2, halfErrors: 2, originalWords: 100, totalStrokes: 10, timeElapsed: 600, pattern: { ...base, required_speed: 200, required_accuracy: 95 } });
    expect(s.mistakePercent).toBe(3);
    expect(s.accuracy).toBe(97);
    expect(s.qualified).toBe(true);
  });

  it('steno: half weight from the pattern changes the %', () => {
    const s = scoreResult({ steno: true, fullErrors: 2, halfErrors: 2, originalWords: 100, pattern: { half_mistake_enabled: false } });
    expect(s.mistakePercent).toBe(4);
  });

  it('steno: words left at the end are not mistakes when omissions are switched off', () => {
    const args = { steno: true, fullErrors: 10, trailingOmissions: 6, originalWords: 100 };
    expect(scoreResult({ ...args, pattern: { count_omissions_as_errors: true } }).mistakePercent).toBe(10);
    expect(scoreResult({ ...args, pattern: { count_omissions_as_errors: false } }).mistakePercent).toBe(4);
  });

  it('steno: transposition counts as none / half / full per pattern', () => {
    const args = { steno: true, fullErrors: 1, transpositions: 2, originalWords: 100 };
    expect(scoreResult({ ...args, pattern: {} }).mistakePercent).toBe(1);
    expect(scoreResult({ ...args, pattern: { transposition_mistake: 'none' } }).mistakePercent).toBe(1);
    expect(scoreResult({ ...args, pattern: { transposition_mistake: 'half' } }).mistakePercent).toBe(2);
    expect(scoreResult({ ...args, pattern: { transposition_mistake: 'full' } }).mistakePercent).toBe(3);
  });

  it('steno: ignorable allowance applies to the %', () => {
    const s = scoreResult({ steno: true, fullErrors: 6, totalStrokes: 500, originalWords: 100, pattern: { ignorable_mistakes_enabled: true, ignorable_mistakes_percent: 5 } });
    expect(s.ignorableAllowance).toBe(5);
    expect(s.mistakePercent).toBe(1);
  });

  it('edge cases: no time, no words, more mistakes than words', () => {
    const z = scoreResult({});
    expect([z.gwpm, z.nwpm, z.accuracy]).toEqual([0, 0, 0]);
    const over = scoreResult({ steno: true, fullErrors: 500, originalWords: 100 });
    expect(over.mistakePercent).toBe(100);
    expect(over.accuracy).toBe(0);
    expect(scoreResult({ fullErrors: 999, totalStrokes: 50, timeElapsed: 60 }).nwpm).toBe(0);
  });
});

describe('typing mistake counts', () => {
  const row = typingRow();
  it('counts each category from the word grading', () => {
    const c = typingMistakeCounts({ referenceWords: row.reference_words, wordStatuses: row.word_statuses, userInput: row.user_input, pattern: {} });
    expect(c).toMatchObject({ spelling: 1, halfWords: 1, extraSpaces: 1, correctWords: 9 });
    expect(c.omissions).toBe(3);   // 1 skipped mid-passage + 2 left at the end
  });
  it('omissions off drops only the untyped tail, not a skipped word', () => {
    const c = typingMistakeCounts({ referenceWords: row.reference_words, wordStatuses: row.word_statuses, userInput: row.user_input, pattern: { count_omissions_as_errors: false } });
    expect(c.omissions).toBe(1);
  });
});

describe('computeResultMetrics against the pre-refactor baseline', () => {
  it('matches every pattern combination to within 0.01 (rounding at each step)', () => {
    let exact = 0;
    PATTERNS.forEach((p, i) => {
      // Steno + ignorable mistakes is a deliberate change (the allowance now applies to the %).
      const kinds = [['typing', typingRow({ pattern_data: p })], ...(p.ignorable_mistakes_enabled ? [] : [['steno', stenoRow({ pattern_data: p })]])];
      for (const [kind, row] of kinds) {
        const now = computeResultMetrics(row);
        const was = golden[i][kind];
        for (const k of ['gwpm', 'nwpm', 'accuracy', 'fullErrors', 'halfErrors', 'penaltyWords']) {
          // Accuracy now comes from the rounded speeds the result page shows (the old
          // list used unrounded ones, so it could differ from the page by ~0.05).
          const tol = k === 'accuracy' ? 0.1 : 0.0100001;
          expect(Math.abs(now[k] - was[k]), `${kind} #${i} ${k} ${JSON.stringify(p)}`).toBeLessThanOrEqual(tol);
        }
        if (Object.keys(was).every((k) => now[k] === was[k])) exact++;
      }
    });
    expect(exact).toBeGreaterThan(PATTERNS.length * 0.75);   // most rows identical
  });

  it('legacy typing rows without word grading keep their stored values', () => {
    const m = computeResultMetrics({ mode: 'English Typing', gwpm: 41, nwpm: 38, accuracy: 92, word_statuses: [] });
    expect(m).toMatchObject({ gwpm: 41, nwpm: 38, accuracy: 92 });
  });

  it('steno uses the extra facts the engine saved', () => {
    const row = stenoRow({ pattern_data: { transposition_mistake: 'full', transpositions: 2, count_omissions_as_errors: false, trailing_omissions: 1 } });
    const m = computeResultMetrics(row);
    expect(m.fullErrors).toBe(3 - 1 + 2);
    expect(m.mistakePercent).toBe(Math.round(((4 + 1) / REF.length) * 10000) / 100);
  });

  it('isResultQualified agrees with scoreResult', () => {
    for (const p of PATTERNS) {
      const m = computeResultMetrics(typingRow({ pattern_data: p }));
      expect(isResultQualified(m, p)).toBe(m.qualified);
      const s = computeResultMetrics(stenoRow({ pattern_data: p }));
      expect(isResultQualified(s, p)).toBe(s.qualified);
    }
  });
});
