// ─── Steno "Accepted Alternate Forms" ──────────────────────────────────────
// Source: "English Stenography – Accepted Alternate Forms" exam guideline —
// "There are words which can be spelt/written in more than one form. Where
// the examination rules permit alternate forms, such accepted forms should
// not be counted as an error."
//
// This module implements the guideline's "Recommended Dictionary Structure
// for Steno Software":
//   • Accepted Alternate Forms Dictionary — titles/designations (Dr./Doctor)
//     and common British/American spelling variations (Honour/Honor). These
//     are single-word swaps.
//   • Contextual Forms Dictionary — contractions (Do not/Don't) where one
//     side is one word and the other is two, so they need bigram-aware
//     matching rather than a plain word-for-word swap.
//
// Shared by StenoTestEngine.jsx (live grading at submit time) and
// ResultScreen.jsx (result-detail re-render / StenoDiff) so the two stay in
// sync — mirrors the sharing pattern used for resultMetrics.js on the typing
// side. All words here are matched in already-normalized form (lowercase,
// punctuation stripped) — the same normalization both engines already apply
// before comparing.

// ── Accepted Alternate Forms Dictionary (single-word groups) ───────────────
// Each inner array lists interchangeable normalized forms of the SAME word.
// Includes: Titles/Designations + Common Spelling Variations from the PDF.
const ALTERNATE_FORM_GROUPS = [
  // Titles / Designations
  ['mr', 'mister'],
  ['mrs', 'mistress'],
  ['dr', 'doctor'],
  ['prof', 'professor'],
  ['hon', 'honourable', 'honorable'],
  // Common Spelling Variations
  ['honour', 'honor'],
  ['organisation', 'organization'],
  ['organise', 'organize'],
  ['organised', 'organized'],
  ['realise', 'realize'],
  ['realised', 'realized'],
  ['recognise', 'recognize'],
  ['recognised', 'recognized'],
  ['analyse', 'analyze'],
  ['analysed', 'analyzed'],
  ['defence', 'defense'],
  ['offence', 'offense'],
  ['licence', 'license'],
  ['centre', 'center'],
  ['metre', 'meter'],
  ['theatre', 'theater'],
  ['programme', 'program'],
  ['labour', 'labor'],
  ['favour', 'favor'],
  ['behaviour', 'behavior'],
  ['colour', 'color'],
  ['neighbour', 'neighbor'],
  ['traveller', 'traveler'],
  ['travelling', 'traveling'],
  ['cancelled', 'canceled'],
  ['fulfil', 'fulfill'],
  ['enrol', 'enroll'],
  ['jewellery', 'jewelry'],
  ['cheque', 'check'],
  ['ageing', 'aging'],
  ['judgement', 'judgment'],
  // "Cannot" is a single word in full form (unlike the other contractions
  // below, which are two words) — it belongs here, not in CONTRACTION_PAIRS.
  ['cannot', 'cant'],
];

const ALTERNATE_FORM_INDEX = new Map();
ALTERNATE_FORM_GROUPS.forEach((group, gid) => {
  group.forEach((w) => ALTERNATE_FORM_INDEX.set(w, gid));
});

/** True when two already-normalized words are an accepted alternate form of each other. */
export const isAcceptedAlternateForm = (aNorm, bNorm) => {
  if (aNorm === bNorm) return false; // exact matches are handled by the normal pass already
  const ga = ALTERNATE_FORM_INDEX.get(aNorm);
  if (ga === undefined) return false;
  return ga === ALTERNATE_FORM_INDEX.get(bNorm);
};

// ── Contextual Forms Dictionary (contractions) ──────────────────────────────
// [ [normalized full-form word pair], normalized short/contracted form ]
const CONTRACTION_PAIRS = [
  [['do', 'not'], 'dont'],
  [['does', 'not'], 'doesnt'],
  [['did', 'not'], 'didnt'],
  [['could', 'not'], 'couldnt'],
  [['should', 'not'], 'shouldnt'],
  [['would', 'not'], 'wouldnt'],
  [['will', 'not'], 'wont'],
  [['is', 'not'], 'isnt'],
  [['are', 'not'], 'arent'],
  [['was', 'not'], 'wasnt'],
  [['were', 'not'], 'werent'],
  [['has', 'not'], 'hasnt'],
  [['have', 'not'], 'havent'],
  [['had', 'not'], 'hadnt'],
  [['i', 'am'], 'im'],
  [['i', 'have'], 'ive'],
  [['i', 'will'], 'ill'],
  [['i', 'would'], 'id'],
  [['i', 'had'], 'id'],
  [['you', 'are'], 'youre'],
  [['you', 'have'], 'youve'],
  [['you', 'will'], 'youll'],
  [['you', 'would'], 'youd'],
  [['he', 'is'], 'hes'],
  [['he', 'has'], 'hes'],
  [['he', 'will'], 'hell'],
  [['he', 'would'], 'hed'],
  [['she', 'is'], 'shes'],
  [['she', 'has'], 'shes'],
  [['she', 'will'], 'shell'],
  [['she', 'would'], 'shed'],
  [['it', 'is'], 'its'],
  [['it', 'has'], 'its'],
  [['it', 'will'], 'itll'],
  [['we', 'are'], 'were'],
  [['we', 'have'], 'weve'],
  [['we', 'will'], 'well'],
  [['we', 'would'], 'wed'],
  [['they', 'are'], 'theyre'],
  [['they', 'have'], 'theyve'],
  [['they', 'will'], 'theyll'],
  [['they', 'would'], 'theyd'],
  [['that', 'is'], 'thats'],
  [['that', 'will'], 'thatll'],
  [['who', 'is'], 'whos'],
  [['who', 'will'], 'wholl'],
  [['what', 'is'], 'whats'],
  [['what', 'will'], 'whatll'],
  [['where', 'is'], 'wheres'],
  [['there', 'is'], 'theres'],
];

// full-bigram key "a|b" -> canonical short/contracted normalized form
const FULL_TO_SHORT = new Map();
// short normalized form -> list of full-form bigrams that can expand to it
const SHORT_TO_FULLS = new Map();
CONTRACTION_PAIRS.forEach(([full, short]) => {
  FULL_TO_SHORT.set(full.join('|'), short);
  if (!SHORT_TO_FULLS.has(short)) SHORT_TO_FULLS.set(short, []);
  SHORT_TO_FULLS.get(short).push(full);
});

/**
 * Extra alignment pass (run AFTER the exact-match pass, BEFORE the spelling
 * pass) that recognizes accepted contraction forms which change word count
 * — e.g. reference "do not" (2 words) ↔ typed "don't" (1 word), or the
 * reverse. Per the PDF's Contextual Forms rule these are accepted alternate
 * forms and must not be counted as an error (not even a half mistake).
 *
 * Mutates matchedRef / isAltForm / usedTyped in place. A 2-word↔1-word match
 * marks BOTH reference word slots against the single typed index (and vice
 * versa) so neither side is later flagged as an omission/addition.
 */
export function matchContractions(refNorm, typedNorm, matchedRef, isAltForm, usedTyped) {
  const R = refNorm.length;
  const T = typedNorm.length;

  // (a) reference bigram (full form) → typed unigram (short form)
  for (let ri = 0; ri < R - 1; ri++) {
    if (matchedRef[ri] !== -1 || matchedRef[ri + 1] !== -1) continue;
    const short = FULL_TO_SHORT.get(`${refNorm[ri]}|${refNorm[ri + 1]}`);
    if (!short) continue;
    for (let ti = 0; ti < T; ti++) {
      if (!usedTyped.has(ti) && typedNorm[ti] === short) {
        matchedRef[ri] = ti; matchedRef[ri + 1] = ti;
        isAltForm[ri] = true; isAltForm[ri + 1] = true;
        usedTyped.add(ti);
        break;
      }
    }
  }

  // (b) reference unigram (short form) → typed adjacent bigram (full form)
  for (let ri = 0; ri < R; ri++) {
    if (matchedRef[ri] !== -1) continue;
    const fulls = SHORT_TO_FULLS.get(refNorm[ri]);
    if (!fulls) continue;
    for (let ti = 0; ti < T - 1; ti++) {
      if (usedTyped.has(ti) || usedTyped.has(ti + 1)) continue;
      const hit = fulls.some(([a, b]) => typedNorm[ti] === a && typedNorm[ti + 1] === b);
      if (hit) {
        matchedRef[ri] = ti;
        isAltForm[ri] = true;
        usedTyped.add(ti); usedTyped.add(ti + 1);
        break;
      }
    }
  }
}

/**
 * Extra alignment pass for single-word accepted alternate forms (titles,
 * spelling variations). Run after matchContractions, before the spelling
 * (Levenshtein) pass, so a legitimate alternate spelling — e.g. "Honour" vs
 * "Honor" — is accepted outright instead of being caught as a fuzzy spelling
 * mistake (half error).
 */
export function matchAlternateForms(refNorm, typedNorm, matchedRef, isAltForm, usedTyped) {
  const R = refNorm.length;
  const T = typedNorm.length;
  for (let ri = 0; ri < R; ri++) {
    if (matchedRef[ri] !== -1) continue;
    for (let ti = 0; ti < T; ti++) {
      if (!usedTyped.has(ti) && isAcceptedAlternateForm(refNorm[ri], typedNorm[ti])) {
        matchedRef[ri] = ti; isAltForm[ri] = true; usedTyped.add(ti); break;
      }
    }
  }
}
