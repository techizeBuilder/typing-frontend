import { describe, expect, it } from 'vitest';
import { stenoMarkup, stenoAiState, bipartiteAlign, normalizeWordResult, tokenizeResult, isAllCaps } from '../features/results/stenoAlign';
import { speedChoices, rangeLabel, clampRange, passageWords, interfaceMinutes, findInterface, TRANSCRIPTION_INTERFACES } from '../features/steno/stenoPractice';
import { isAcceptedAlternateForm } from '../utils/stenoAlternateForms';

const REF = 'Now Sir the Bill was introduced in the House of the People on the second day';

describe('steno markup (same rules as the grader)', () => {
  it('a perfect transcription has no mistakes', () => {
    const { counts, items } = stenoMarkup(REF, REF);
    expect(counts.correct).toBe(REF.split(' ').length);
    expect(counts.omission + counts.addition + counts.spelling + counts.half + counts.punctuation + counts.transposition).toBe(0);
    expect(items.map((i) => i.typed).join(' ')).toBe(REF);
  });

  it('classifies every mistake type', () => {
    const typed = 'Now  sir, the bill was introdused in House of the Peeple PEOPLE on the second day extra';
    const { counts } = stenoMarkup(typed, REF);
    expect(counts.omission).toBeGreaterThanOrEqual(1);     // "the" before House
    expect(counts.addition).toBeGreaterThanOrEqual(1);     // "extra"
    expect(counts.spelling).toBeGreaterThanOrEqual(1);     // introdused
    expect(counts.half).toBe(1);                           // bill/Bill (case only)
    expect(counts.punctuation).toBe(1);                    // sir,/Sir (case + comma)
    expect(counts.extraSpace).toBe(1);                     // double space after Now
  });

  it('detects swapped words as a transposition, not as errors', () => {
    const { counts, items } = stenoMarkup(REF.replace('the second', 'second the'), REF);
    expect(counts.transposition).toBe(1);
    expect(items.filter((i) => i.type === 'transposition')).toHaveLength(2);
    expect(counts.omission + counts.addition).toBe(0);
  });

  it('separates words left at the end from words skipped mid-passage', () => {
    const typed = REF.split(' ').filter((w, i) => i !== 3).slice(0, 12).join(' ');   // skip "Bill", stop early
    const { counts } = stenoMarkup(typed, REF);
    expect(counts.trailingOmissions).toBe(REF.split(' ').length - 13);
    expect(counts.omission).toBe(counts.trailingOmissions + 1);
  });

  it('counts strokes of correctly typed words for "count only right words"', () => {
    const { counts } = stenoMarkup('Now Sir', 'Now Sir');
    expect(counts.correctStrokes).toBe('Now '.length + 'Sir '.length);
  });

  it('places an addition where it was typed', () => {
    const { items } = stenoMarkup('Now Sir zzz the Bill', 'Now Sir the Bill');
    expect(items.map((i) => i.typed || i.ref)).toEqual(['Now', 'Sir', 'zzz', 'the', 'Bill']);
  });

  it('handles empty input', () => {
    expect(stenoMarkup('', '').items).toEqual([]);
    expect(stenoMarkup('', 'a b').counts.omission).toBe(2);
    expect(stenoMarkup('a b', '').counts.addition).toBe(2);
  });

  it('builds Deep Analysis input with the mistake words', () => {
    const st = stenoAiState({ typed: 'Now sir the Bil', reference: 'Now Sir the Bill', metrics: { gwpm: 10, nwpm: 8, accuracy: 90 }, exam: 'X', mode: 'Steno English', minutes: 1, pattern: { required_speed: 80, required_accuracy: 95 } });
    expect(st.input.kind).toBe('steno');
    expect(st.input.target_wpm).toBe(80);
    expect(st.input.mistake_words.length).toBe(3);   // sir (case), Bill omitted, Bil added (too short to be a spelling slip)
    expect(st.practiceWords).toEqual(expect.arrayContaining(['Sir', 'Bill']));
  });

  it('low-level helpers', () => {
    expect(normalizeWordResult('Hon.')).toBe('hon');
    expect(normalizeWordResult('भारत,')).toBe('भारत');
    expect(tokenizeResult('  a   b \n c ')).toEqual(['a', 'b', 'c']);
    expect(isAllCaps('PEOPLE')).toBe(true);
    expect(isAllCaps('I')).toBe(false);
    expect(isAcceptedAlternateForm('honour', 'honor')).toBe(true);
    const { matchedRef } = bipartiteAlign(['a', 'b'], ['b', 'a']);
    expect(matchedRef).toEqual([1, 0]);
  });
});

describe('steno practice setup', () => {
  it('speed choices centre on the admin speed and stay playable', () => {
    expect(speedChoices(100)).toEqual(expect.arrayContaining([60, 100, 160]));
    expect(Math.min(...speedChoices(100))).toBe(60);
    expect(Math.max(...speedChoices(100))).toBe(160);
    expect(speedChoices(92)).toContain(92);
    expect(Math.min(...speedChoices(40))).toBe(30);
  });
  it('word ranges', () => {
    expect(rangeLabel(null)).toBe('Full Length');
    expect(rangeLabel({ start: 0, end: 99 })).toBe('First 100 words');
    expect(rangeLabel({ start: 10, end: 19 })).toBe('Words 11–20 (10 words)');
    expect(clampRange(0, 99, 100)).toBeNull();
    expect(clampRange(50, 10, 100)).toEqual({ start: 10, end: 50 });
    expect(clampRange(0, 500, 100)).toBeNull();
    expect(clampRange(0, 5, 0)).toBeNull();
  });
  it('interfaces', () => {
    expect(passageWords(' a  b ')).toEqual(['a', 'b']);
    for (const i of TRANSCRIPTION_INTERFACES) {
      expect(findInterface(i.id)).toBe(i);
      expect(interfaceMinutes(i, false)).toBeGreaterThan(0);
      expect(interfaceMinutes(i, true)).toBeGreaterThan(0);
    }
    expect(findInterface('nope')).toBeNull();
  });
});
