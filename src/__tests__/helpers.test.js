// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  passageTopic, dictationDifficulty, dictationLevel, getExamLanguages, examMatchesMode, chapterInExam,
  sortByChapterNo, wordCountFor, matchesDifficulty, examInitials, isStenoMode, modeLabel, resultViewState, isVisibleToStudents,
} from '../features/exams/examData';
import { timingOf, resultReleaseAt } from '../features/results/resultTiming';
import { collectMistakes, practiceWordsOf, aiAnalysisState } from '../features/results/mistakes';
import { buildAnalysis, ruleText } from '../features/results/aiAnalysis';
import { randomPassage, hasBundledPassages } from '../features/selfAssessment/randomPassages';
import { fontFamilyForChapter, fontFamilyForFontGroup, fontGroupForHindiType, KRUTI_FONT, MANGAL_FONT } from '../utils/hindiFonts';
import { buildPassageHtml, brandHtml } from '../features/exams/passagePdf';
import { planCategories, planInCategory, discountPct, perMonth, durationLabel, daysLeft, waLink, rupees } from '../features/plans/planData';
import { parsePageText, quickLinks } from '../features/siteInfo/siteInfo';
import { mergeLayout, DEFAULT_LAYOUT } from '../features/screenLayout/screenLayout';
import { countWords, countStrokes, chapterExamIds } from '../features/tests/testData';
import { categoriesOf, isExpired, buildCreatePayload, buildUpdatePayload, blankStudent } from '../features/students/studentData';
import { getDeviceId, clearSessionStorage } from '../services/device';

afterEach(() => localStorage.clear());

describe('exam helpers', () => {
  it('topic = first 5 words of the text', () => {
    expect(passageTopic('Now, Sir, hon. Members will recall that')).toBe('Now, Sir, hon. Members will…');
    expect(passageTopic('Two words')).toBe('Two words');
    expect(passageTopic('')).toBe('');
    expect(passageTopic(null)).toBe('');
  });
  it('difficulty score is 1–10 and harder text scores higher', () => {
    const easy = dictationDifficulty({ content_text: 'the cat sat on a mat and the dog ran to it' });
    const hard = dictationDifficulty({ content_text: 'Constitutional jurisprudence notwithstanding, parliamentary administrative responsibilities.' });
    expect(easy).toBeGreaterThanOrEqual(1);
    expect(hard).toBeLessThanOrEqual(10);
    expect(hard).toBeGreaterThan(easy);
    expect(dictationDifficulty({ content_text: '' })).toBeNull();
    expect(dictationDifficulty({ content_text: 'भारत एक विशाल देश है', font_group: 'Steno Hindi' })).toBeGreaterThanOrEqual(1);
  });
  it('level: admin difficulty wins, else the score', () => {
    expect(dictationLevel({ difficulty: 'Hard', content_text: 'a b c' })).toBe('hard');
    expect(dictationLevel({ content_text: 'a b c' })).toBe('easy');
    expect(dictationLevel({ content_text: '' })).toBeNull();
  });
  it('languages from font groups', () => {
    expect(getExamLanguages({ font_groups: ['English Typing', 'Hindi Mangal'] })).toBe('English / Hindi');
    expect(getExamLanguages({ font_groups: ['Steno Hindi'] })).toBe('Hindi');
    expect(getExamLanguages({ font_group: 'English Typing' })).toBe('English');
    expect(getExamLanguages({})).toBe('English');
  });
  it('exam/mode/chapter matching', () => {
    expect(examMatchesMode({ font_groups: [] }, 'Steno English')).toBe(true);
    expect(examMatchesMode({ font_groups: ['English Typing'] }, 'Steno English')).toBe(false);
    expect(chapterInExam({ exam_id: 'a' }, 'a')).toBe(true);
    expect(chapterInExam({ exam_id: 'x', exam_ids: ['a'] }, 'a')).toBe(true);
    expect(['CH-10', 'CH-2', 'CH-1'].map((c) => ({ chapter_no: c })).sort(sortByChapterNo).map((c) => c.chapter_no)).toEqual(['CH-1', 'CH-2', 'CH-10']);
    expect(wordCountFor({ word_count: 0, content_text: 'a b' })).toBe(0);
    expect(wordCountFor({ content_text: ' a  b ' })).toBe(2);
    expect(matchesDifficulty({ difficulty: 'Easy' }, 'all')).toBe(true);
    expect(examInitials('SSC CGL (Tier-2)')).toBe('SCT');
    expect(examInitials('')).toBe('EX');
    expect(isStenoMode('Steno Hindi')).toBe(true);
    expect(modeLabel('Steno English')).toBe('English Steno');
    expect(isVisibleToStudents({ is_active: false })).toBe(false);
    expect(isVisibleToStudents({})).toBe(true);
  });
  it('result view state only sends steno texts for steno', () => {
    const r = { mode: 'English Typing', reference_words: ['a'], user_input: 'a', pattern_data: {} };
    expect(resultViewState(r, { content_text: 'a' }, null).typedText).toBeUndefined();
    const s = resultViewState({ ...r, mode: 'Steno English' }, { content_text: 'a b' }, null);
    expect(s.referenceText).toBe('a b');
  });
});

describe('result release timing (India time)', () => {
  const t = timingOf({ live_result_mode: 'scheduled', live_result_time: '21:00', preload_result_mode: 'immediate' });
  it('immediate patterns release now', () => {
    expect(resultReleaseAt(t, 'Pre-load Test', '2026-11-01T05:00:00Z')).toBeNull();
    expect(resultReleaseAt(null, 'Live Test', '2026-11-01T05:00:00Z')).toBeNull();
  });
  it('scheduled: before 21:00 IST → same day 21:00', () => {
    const taken = '2026-11-01T05:00:00Z';                     // 10:30 IST
    const now = new Date('2026-11-01T06:00:00Z');
    expect(resultReleaseAt(t, 'Live Test', taken, now).toISOString()).toBe('2026-11-01T15:30:00.000Z');
  });
  it('scheduled: after 21:00 IST → next day 21:00', () => {
    const taken = '2026-11-01T16:00:00Z';                     // 21:30 IST
    expect(resultReleaseAt(t, 'Live Test', taken, new Date('2026-11-01T16:05:00Z')).toISOString()).toBe('2026-11-02T15:30:00.000Z');
  });
  it('already released → null; staff always see it', () => {
    expect(resultReleaseAt(t, 'Live Test', '2026-11-01T05:00:00Z', new Date('2026-11-02T00:00:00Z'))).toBeNull();
    localStorage.setItem('role', 'Admin');
    expect(resultReleaseAt(t, 'Live Test', '2026-11-01T05:00:00Z', new Date('2026-11-01T06:00:00Z'))).toBeNull();
  });
  it('Sub-Admin is staff too', () => {
    localStorage.setItem('role', 'Sub-Admin');
    expect(resultReleaseAt(t, 'Live Test', '2026-11-01T05:00:00Z', new Date('2026-11-01T06:00:00Z'))).toBeNull();
  });
});

describe('mistake list and AI analysis', () => {
  const ref = ['The', 'cat', 'sat', 'down', 'here'];
  const statuses = ['correct', 'error', 'half-error', 'pending', 'pending'];
  const wordAt = (i) => ['The', 'cot', 'Sat', '', ''][i];
  it('collects mistakes and respects omission rules', () => {
    const all = collectMistakes({ referenceWords: ref, wordStatuses: statuses, wordAt, lastTypedIndex: 2, countOmissions: true, extraTypedWords: ['x'] });
    expect(all.map((m) => m.type)).toEqual(['Spelling / Wrong Word', 'Capitalisation', 'Omission', 'Omission', 'Addition']);
    const noTail = collectMistakes({ referenceWords: ref, wordStatuses: statuses, wordAt, lastTypedIndex: 2, countOmissions: false, extraTypedWords: [] });
    expect(noTail.filter((m) => m.type === 'Omission')).toHaveLength(0);
    expect(practiceWordsOf(all)).toEqual(['cat', 'sat', 'down', 'here']);
    expect(aiAnalysisState({ aiInput: { exam: 'x' }, counts: {}, mistakes: all }).input.mistake_words.length).toBe(5);
  });
  const input = { total_words: 100, correct_words: 90, net_wpm: 36, gross_wpm: 40, accuracy: 97, target_wpm: 35, target_accuracy: 95, counts: { spelling: 3, omission: 1 } };
  it('builds levels and rule text', () => {
    const a = buildAnalysis(input, []);
    expect(a.totalMistakes).toBe(4);
    expect(a.metrics.find((m) => m.key === 'speed').value).toBe('Good');
    const txt = ruleText(input, a);
    expect(txt.recommendations).toHaveLength(3);
    expect(txt.plan).toHaveLength(4);
  });
  it('accuracy below a high target is never rated Excellent', () => {
    const a = buildAnalysis({ ...input, accuracy: 98.5, target_accuracy: 99 });
    expect(a.metrics.find((m) => m.key === 'accuracy').value).not.toBe('Excellent');
  });
  it('consistency needs 3 tests', () => {
    expect(buildAnalysis(input, [{ nwpm: 30 }]).metrics[3].value).toBe('Not enough tests');
    expect(buildAnalysis(input, [{ nwpm: 30 }, { nwpm: 30 }, { nwpm: 31 }]).metrics[3].value).toBe('Excellent');
  });
});

describe('random passages', () => {
  it('English and Mangal come from the library, long enough for the time', () => {
    expect(hasBundledPassages('English Typing')).toBe(true);
    expect(hasBundledPassages('Hindi Kruti Dev')).toBe(false);
    const p = randomPassage({ font: 'English Typing', minutes: 10 });
    expect(p.split(/\s+/).length).toBeGreaterThanOrEqual(450);
    expect(p).not.toMatch(/\n/);
    expect(randomPassage({ font: 'Hindi Mangal', minutes: 2 })).toMatch(/[ऀ-ॿ]/);
  });
  it('never repeats a paragraph, even for 60 minutes', () => {
    const p = randomPassage({ font: 'English Typing', minutes: 60 });
    const sentences = p.split(/(?<=\.)\s+/);
    expect(new Set(sentences).size).toBe(sentences.length);
  });
  it('uses the given pool', () => {
    expect(randomPassage({ font: 'Hindi Kruti Dev', minutes: 1, pool: ['d[k'] })).toBe('d[k');
  });
});

describe('fonts', () => {
  it('maps fonts', () => {
    expect(fontFamilyForFontGroup('Hindi Kruti Dev')).toBe(KRUTI_FONT);
    expect(fontFamilyForFontGroup('Hindi Mangal')).toBe(MANGAL_FONT);
    expect(fontFamilyForFontGroup('English Typing')).toBeUndefined();
    expect(fontGroupForHindiType('RemingtonGail')).toBe('Hindi Remington (GAIL)');
    expect(fontFamilyForChapter({ hindi_font_type: 'Mangal', font_group: 'Steno Hindi' })).toBe(MANGAL_FONT);
    expect(fontFamilyForChapter(null)).toBeUndefined();
  });
});

describe('passage PDF', () => {
  it('escapes passage and names (no HTML injection)', () => {
    const html = buildPassageHtml({ exam: { name: '<b>X</b>' }, chapter: { chapter_no: '1', content_text: '<script>alert(1)</script>' }, mode: 'English Typing', brand: { name: 'A & B' } });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('brand-watermark');
  });
  it('always carries a name, even without settings', () => {
    expect(brandHtml({}).header).toContain('Balaji Typing');
  });
  it('rejects javascript: logo urls', () => {
    expect(brandHtml({ logoUrl: 'javascript:alert(1)' }).header).not.toContain('javascript:');
  });
});

describe('plans', () => {
  it('categories and prices', () => {
    expect(planCategories('typing, english_steno')).toEqual(['typing', 'english_steno']);
    expect(planCategories(null)).toEqual(['all']);
    expect(planInCategory({ category: 'all' }, 'typing')).toBe(true);
    expect(planInCategory({ category: 'hindi_steno' }, 'typing')).toBe(false);
    expect(discountPct({ price: 750, original_price: 1000 })).toBe(25);
    expect(discountPct({ price: 1000, original_price: 0 })).toBe(0);
    expect(perMonth({ price: 1200, duration_days: 365 })).toBe(99);
    expect(perMonth({ price: 100, duration_days: 30 })).toBeNull();
    expect(durationLabel(365)).toBe('1 year');
    expect(durationLabel(90)).toBe('3 months');
    expect(durationLabel(45)).toBe('45 days');
    expect(waLink('+91 98-1234')).toBe('https://wa.me/91981234');
    expect(rupees(null)).toBe('—');
  });
  it('days left counts calendar days', () => {
    const d = new Date(); d.setDate(d.getDate() + 3);
    expect(daysLeft(d.toISOString().slice(0, 10))).toBe(3);
    expect(daysLeft(null)).toBeNull();
  });
});

describe('site pages and layout', () => {
  it('parses page text', () => {
    expect(parsePageText('## Title\nPara one\nline two\n\n- a\n- b\nafter')).toEqual([
      { type: 'h', text: 'Title' }, { type: 'p', text: 'Para one line two' }, { type: 'ul', items: ['a', 'b'] }, { type: 'p', text: 'after' },
    ]);
    expect(parsePageText('')).toEqual([]);
    expect(quickLinks(null)).toEqual([]);
  });
  it('merges a saved layout and rejects bad values', () => {
    expect(mergeLayout('not json')).toEqual(mergeLayout({}));
    const m = mergeLayout({ heights: { header: 5000 }, colors: { headerBg: 'red' }, timerPosition: 'Nowhere' });
    expect(m.heights.header).toBe(DEFAULT_LAYOUT.heights.header);
    expect(m.timerPosition).toBe(DEFAULT_LAYOUT.timerPosition);
  });
});

describe('admin form helpers', () => {
  it('counts', () => {
    expect(countWords(' a  b ')).toBe(2);
    expect(countStrokes('a b c')).toBe(3);
    expect(chapterExamIds({ exam_id: 'x', exam_ids: [] })).toEqual(['x']);
  });
  it('students', () => {
    expect(categoriesOf({ category: 'Typing English, Steno Hindi' })).toEqual(['Typing English', 'Steno Hindi']);
    expect(isExpired({ validity_end: '2000-01-01' })).toBe(true);
    expect(isExpired({ validity_end: '2999-01-01' })).toBe(false);
    const form = { ...blankStudent(), name: ' A ', user_id: 'u1', phone: '9000000000', password_hash: 'x1234567' };
    const c = buildCreatePayload(form);
    expect(c.password_hash).toBe('x1234567');
    const u = buildUpdatePayload({ ...form, password_hash: '' });
    expect('password_hash' in u).toBe(false);
    expect('user_id' in u).toBe(false);
  });
});

describe('device id', () => {
  it('survives logout', () => {
    const id = getDeviceId();
    expect(id).toMatch(/^[A-Za-z0-9-]{16,64}$/);
    localStorage.setItem('token', 't');
    clearSessionStorage();
    expect(localStorage.getItem('token')).toBeNull();
    expect(getDeviceId()).toBe(id);
  });
});
