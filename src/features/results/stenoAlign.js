// Word alignment for steno results (moved unchanged from ResultScreen) plus the
// display-only markup built on it. Grading itself stays in StenoTestEngine.
import { matchContractions, matchAlternateForms } from '../../utils/stenoAlternateForms';
import { fontFamilyForFontGroup, fontFamilyForHindiType } from '../../utils/hindiFonts';

export const normalizeWordResult = (w) => w.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]/gi, '');
export const tokenizeResult      = (text) => text.trim().split(/\s+/).filter(Boolean);

// ─── Steno error-classification helpers ──────────────────────────────────────
// Levenshtein edit distance with early-exit for large differences.
const _lev = (a, b) => {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  const dp = [];
  for (let i = 0; i <= m; i++) { dp[i] = new Array(n + 1).fill(0); dp[i][0] = i; }
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
};
// PDF 2a: wrong spelling → half mistake.
// Threshold: edit distance ≤ 2 AND ≤ 30% of word length. Minimum word length 4.
const _isSpellingErr = (r, t) => {
  if (r === t || r.length < 4 || t.length < 4 || Math.abs(r.length - t.length) > 3) return false;
  const d = _lev(r, t);
  return d <= 2 && d / Math.max(r.length, t.length) <= 0.30;
};
// PDF 1h: typing a word in ALL CAPITALS → full mistake.
export const isAllCaps = (w) => { const l = w.replace(/[^a-zA-Z]/g, ''); return l.length > 1 && l === l.toUpperCase(); };

// ─── Bipartite alignment (used for Steno) ────────────────────────────────────
// Pass 1 matches exact normalized forms; Pass 1b matches accepted alternate
// forms (contractions/titles/spelling variations — never an error, per the
// "Accepted Alternate Forms" exam guideline); Pass 2 matches spelling
// variants (half mistake). Order-independent — a correctly heard word is
// credited even if written in a different position.
export function bipartiteAlign(refNorm, typedNorm) {
  const R = refNorm.length;
  const T = typedNorm.length;
  const usedTyped  = new Set();
  const matchedRef = new Array(R).fill(-1);
  const isSpell    = new Array(R).fill(false);
  const isAltForm  = new Array(R).fill(false);

  // Pass 1: exact normalized match
  for (let ri = 0; ri < R; ri++) {
    for (let ti = 0; ti < T; ti++) {
      if (!usedTyped.has(ti) && typedNorm[ti] === refNorm[ri]) {
        matchedRef[ri] = ti; usedTyped.add(ti); break;
      }
    }
  }
  // Pass 1b: accepted alternate forms — must run before Pass 2 so a
  // legitimate alternate spelling isn't instead flagged as a fuzzy spelling
  // mistake.
  matchContractions(refNorm, typedNorm, matchedRef, isAltForm, usedTyped);
  matchAlternateForms(refNorm, typedNorm, matchedRef, isAltForm, usedTyped);

  // Pass 2: spelling match for still-unmatched reference words (PDF 2a)
  for (let ri = 0; ri < R; ri++) {
    if (matchedRef[ri] !== -1) continue;
    for (let ti = 0; ti < T; ti++) {
      if (!usedTyped.has(ti) && _isSpellingErr(refNorm[ri], typedNorm[ti])) {
        matchedRef[ri] = ti; isSpell[ri] = true; usedTyped.add(ti); break;
      }
    }
  }
  return { matchedRef, isSpell, isAltForm, usedTyped };
}

// ─── Typed-text markup ───────────────────────────────────────────────────────
// Every word of the typed passage in typed order, classified with the same rules as
// the grader, with omissions placed where they were skipped. Word order and extra
// spaces are not graded by the engine, so they are reported for information only.
export function stenoMarkup(typed = '', reference = '') {
  const typedWords = tokenizeResult(typed);
  const refWords = tokenizeResult(reference);
  const { matchedRef, isSpell, isAltForm, usedTyped } = bipartiteAlign(refWords.map(normalizeWordResult), typedWords.map(normalizeWordResult));

  const swapped = new Set();
  let transposition = 0;
  const plain = (ri) => matchedRef[ri] !== -1 && !isSpell[ri] && typedWords[matchedRef[ri]] === refWords[ri];
  for (let ri = 0; ri + 1 < refWords.length; ri++) {
    if (plain(ri) && plain(ri + 1) && matchedRef[ri] === matchedRef[ri + 1] + 1) {
      swapped.add(ri); swapped.add(ri + 1); transposition++; ri++;
    }
  }

  const spaceBefore = new Set();
  let wordNo = -1;
  for (const m of String(typed).matchAll(/\S+|\s+/g)) {
    if (/\S/.test(m[0])) wordNo++;
    else if (wordNo >= 0 && / {2,}/.test(m[0])) spaceBefore.add(wordNo + 1);
  }

  const counts = { correct: 0, alt: 0, spelling: 0, half: 0, punctuation: 0, caps: 0, omission: 0, addition: 0, transposition, extraSpace: spaceBefore.size };
  const items = [];
  let lastTyped = -1;
  refWords.forEach((ref, ri) => {
    const ti = matchedRef[ri];
    if (ti === -1) {
      counts.omission++;
      items.push({ type: 'omission', ref, order: lastTyped + 0.5 });
      return;
    }
    const word = typedWords[ti];
    lastTyped = Math.max(lastTyped, ti);
    let type = 'correct';
    if (isAltForm[ri]) type = 'alt';
    else if (isSpell[ri]) type = 'spelling';
    else if (word !== ref) {
      if (isAllCaps(word)) type = 'caps';
      else type = word.toLowerCase() === ref.toLowerCase() ? 'half' : 'punctuation';
    }
    counts[type]++;
    items.push({ type: swapped.has(ri) ? 'transposition' : type, typed: word, ref, order: ti, typedIndex: ti });
  });
  typedWords.forEach((word, ti) => {
    if (usedTyped.has(ti)) return;
    counts.addition++;
    items.push({ type: 'addition', typed: word, order: ti, typedIndex: ti });
  });
  items.sort((a, b) => a.order - b.order);
  items.forEach((it) => { if (spaceBefore.has(it.typedIndex)) it.extraSpaceBefore = true; });

  // Facts the result pattern can act on: words left untyped after the last word the
  // student reached, and the correctly typed words (for "Count only Right Words").
  let lastReached = -1;
  matchedRef.forEach((ti, ri) => { if (ti !== -1) lastReached = ri; });
  counts.trailingOmissions = matchedRef.filter((ti, ri) => ti === -1 && ri > lastReached).length;
  counts.correctStrokes = refWords.reduce((sum, w, ri) => (
    matchedRef[ri] !== -1 && !isSpell[ri] && typedWords[matchedRef[ri]] === w ? sum + w.length + 1 : sum), 0);
  return { items, counts };
}

// Navigation state for /ai-analysis from a steno result.
export function stenoAiState({ typed, reference, metrics, exam, mode, minutes, pattern, passageFontFamily }) {
  const { items, counts } = stenoMarkup(typed, reference);
  const mistakeWords = items
    .filter((i) => !['correct', 'alt', 'transposition'].includes(i.type))
    .map((i) => ({ expected: i.ref || '', typed: i.typed || '' }));
  return {
    input: {
      exam, mode, kind: 'steno',
      gross_wpm: metrics.gwpm,
      net_wpm: metrics.nwpm,
      accuracy: metrics.accuracy,
      minutes,
      target_wpm: pattern?.required_speed ?? 30,
      target_accuracy: pattern?.required_accuracy ?? 95,
      total_words: tokenizeResult(typed).length,
      correct_words: counts.correct + counts.alt,
      counts: {
        spelling: counts.spelling + counts.caps, omission: counts.omission, addition: counts.addition, repetition: 0,
        capitalisation: counts.half, punctuation: counts.punctuation, extraSpace: counts.extraSpace,
      },
      mistake_words: mistakeWords.slice(0, 20),
    },
    practiceWords: Array.from(new Set(mistakeWords.map((m) => m.expected).filter(Boolean))),
    passageFontFamily,
  };
}

// Deep Analysis from a stored attempt; the list rows carry everything it needs.
export const attemptAiState = (r, metrics) => stenoAiState({
  typed: r.user_input || '',
  reference: r.chapter?.content_text || (Array.isArray(r.reference_words) ? r.reference_words.join(' ') : ''),
  metrics,
  exam: r.exam?.name || 'Self Practice',
  mode: r.mode,
  minutes: parseFloat(((Number(r.time_elapsed) || 60) / 60).toFixed(2)),
  pattern: r.pattern_data,
  passageFontFamily: fontFamilyForHindiType(r.pattern_data?.hindi_font_type) || fontFamilyForFontGroup(r.mode),
});
