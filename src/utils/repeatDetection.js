// ─── Passage-anchored repeated-word detector ─────────────────────────────────
//
// Implements the "Repeated Words / Extra Words" result rule:
//
//   If a student re-types any part of the original passage they have already
//   passed, every word in that repeated stretch is an EXTRA WORD and a FULL
//   ERROR — whether the repeated words are spelled correctly or not.
//
// Detection is anchored to the ORIGINAL PASSAGE (the reference words), not to a
// naive typed-vs-typed comparison. We walk the typed words left to right while
// tracking a forward "progress frontier" through the passage. A stretch of typed
// words that matches a contiguous passage segment lying BEHIND the frontier
// (content already reached) is a backward repeat.
//
// Because detection is positional rather than spelling based, a section the
// student re-types with typos is still recognised as a repeat: misspelled words
// inside an otherwise-matching run are absorbed via a small gap tolerance.
//
// Returns an array of ranges over the *typed* word indices:
//   { start, end, sourceStart, sourceEnd, text }
// where [start, end] are 0-based inclusive positions in `typedWords` and
// [sourceStart, sourceEnd] point at the passage segment that was duplicated.
// Each word inside a range counts as one full error.

// Normalise a word for matching: lowercase + strip leading/trailing punctuation
// (Unicode aware, so Hindi/Devanagari and English both work). Internal
// characters are kept so "hope" still differs from "hopes".
const norm = (w) =>
  (w || '')
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

export function detectRepeatedSequences(typedWords, refWords, opts = {}) {
  const minLen = opts.minLen ?? 1;        // shortest backward run that counts as a repeat
  const GAP = opts.gapTolerance ?? 2;     // misspelled words tolerated inside a repeat run
  const FWD_WIN = opts.forwardWindow ?? 10; // look-ahead for omissions during forward progress

  const T = typedWords.length;
  const R = refWords.length;
  if (T === 0 || R === 0) return [];

  const eq = (a, b) => {
    const na = norm(a);
    return na.length > 0 && na === norm(b);
  };

  const ranges = [];
  let refPos = 0;     // next expected passage position (forward progress)
  let progress = -1;  // highest passage index reached so far (the frontier)
  let i = 0;

  while (i < T) {
    // ── Forward progress: does typed[i] match at/ahead of refPos? ──────────────
    // Allow a small look-ahead so an omitted passage word doesn't desync us.
    let fJump = -1;
    for (let f = 0; f <= FWD_WIN && refPos + f < R; f++) {
      if (eq(typedWords[i], refWords[refPos + f])) { fJump = f; break; }
    }
    let fwdLen = 0;
    if (fJump >= 0) {
      const base = refPos + fJump;
      while (
        base + fwdLen < R &&
        i + fwdLen < T &&
        eq(typedWords[i + fwdLen], refWords[base + fwdLen])
      ) {
        fwdLen++;
      }
    }

    // ── Backward repeat: does typed[i] start a run matching an already-reached
    //    passage segment that sits BEHIND the current position? ────────────────
    let bestBackLen = 0;
    let bestBackStart = -1;
    const backLimit = Math.min(progress, refPos - 1);
    for (let b = 0; b <= backLimit; b++) {
      let len = 0;
      while (
        b + len <= progress &&
        i + len < T &&
        eq(typedWords[i + len], refWords[b + len])
      ) {
        len++;
      }
      if (len > bestBackLen) {
        bestBackLen = len;
        bestBackStart = b;
      }
    }

    // Substitution/realignment distance: the smallest run length s (≥1) after which
    // the typed and reference streams march together again — SUB_CONFIRM consecutive
    // matches at refPos+s / i+s. When the student just mistypes a word or two that
    // happen to coincide with another passage word, the streams realign within a few
    // words; a genuine re-type or line-jump does not. Used to keep both the backward
    // repeat AND the forward jump below from firing on such coincidences. Mirrors the
    // substitution/realignment guard in the main alignment pass (detectLineChanges).
    const SUB_CONFIRM = 2;
    let subResyncDist = -1;
    for (let s = 1; s <= FWD_WIN && subResyncDist < 0; s++) {
      let c = 0;
      for (let k = 0; k < SUB_CONFIRM; k++) {
        if (i + s + k < T && refPos + s + k < R && eq(typedWords[i + s + k], refWords[refPos + s + k])) c++;
        else break;
      }
      if (c >= SUB_CONFIRM) subResyncDist = s;
    }

    // Forward progress always wins ties: a naturally recurring word (which
    // matches both ahead and behind) keeps advancing normally. A backward run
    // is only taken when it is strictly longer than any forward continuation,
    // there is no forward match at all, and it is not better explained as a
    // forward substitution. The discriminator: a genuine re-type reproduces text
    // that matches BEHIND the frontier, so it never realigns FORWARD with the owed
    // passage — whereas an ordinary substitution always does (the student keeps
    // going). So a SHORT backward match (≤ MAX_COINCIDENTAL_BACK words, the range
    // where common phrases like "of", "of you", "in the" coincide by chance) that
    // also has a forward realignment is a substitution, not a repeat — don't strip
    // it. Longer exact backward matches are trusted as real re-types regardless.
    const MAX_COINCIDENTAL_BACK = 4;
    const subBeatsBackward = subResyncDist >= 0 && bestBackLen <= MAX_COINCIDENTAL_BACK;
    const takeBackward = bestBackLen >= minLen && bestBackLen > fwdLen && !subBeatsBackward;

    if (takeBackward) {
      const runStart = i;
      let b = bestBackStart;
      while (i < T) {
        if (b <= progress && eq(typedWords[i], refWords[b])) {
          i++;
          b++;
          continue;
        }
        // Mismatch inside the run: a misspelled/wrong word the student typed
        // while re-typing the segment. Try to re-anchor within GAP words so the
        // wrong words are still absorbed into (and counted by) the repeat.
        let reanchored = false;
        for (let g = 1; g <= GAP; g++) {
          if (
            b + g <= progress &&
            i + g < T &&
            eq(typedWords[i + g], refWords[b + g])
          ) {
            i += g;
            b += g;
            reanchored = true;
            break;
          }
        }
        if (!reanchored) break;
      }
      ranges.push({
        start: runStart,
        end: i - 1,
        sourceStart: bestBackStart,
        sourceEnd: b - 1,
        // Passage frontier where the student inserted this repeat (next word still
        // owed). Used to place the repeated words inline at the exact spot in the
        // passage where they were typed, rather than at the end of the result.
        anchor: refPos,
        text: typedWords.slice(runStart, i).join(' '),
      });
      // A repeat does not advance passage progress — the student still owes the
      // words at refPos onward.
      continue;
    }

    // A forward match that SKIPS passage words (fJump > 0) is only trusted when the
    // matched run actually continues (fwdLen >= 2) AND the skip is not better explained
    // as a short substitution (subResyncDist <= fJump) or an insertion (insBeatsJump). A
    // lone word — or even a 2-word common phrase like "of you" / "in the" — that merely
    // happens to equal some later passage word is a substitution, not a real jump:
    // advancing the frontier to it would leave the genuinely-correct words that follow
    // sitting "behind" the frontier, where they get mis-flagged as a backward repeat.
    // (e.g. typing "with" for "we", or "of you" for "and its", must not skip ahead.)
    //
    // insBeatsJump: if the first owed/skipped ref word reappears in the typed stream
    // sooner than the jump would skip, the student is about to type the skipped content
    // — so the matched run is a duplicated/early phrase (e.g. typing "these are values
    // that" before the owed "that you espouse…"), not a real jump. Skipping here would
    // strand that owed-but-typed content as a bogus backward repeat. A genuine line skip
    // never types its skipped words, so this stays false for real jumps. Mirrors the
    // insertion-vs-omission choice in the main alignment pass (detectLineChanges).
    const subBeatsJump = fJump > 0 && subResyncDist >= 0 && subResyncDist <= fJump;
    let insBeatsJump = false;
    if (fJump > 0) {
      for (let look = i + 1; look < i + fJump && look < T; look++) {
        if (eq(typedWords[look], refWords[refPos])) { insBeatsJump = true; break; }
      }
    }
    if (fJump === 0 || (fJump > 0 && fwdLen >= 2 && !subBeatsJump && !insBeatsJump)) {
      // Commit forward progress; the run continues naturally on the next iterations.
      refPos = refPos + fJump + 1;
      if (refPos - 1 > progress) progress = refPos - 1;
      i++;
    } else {
      // No forward match, or only a lone coincidental one → a substitution or an
      // inserted (extra) word that the main alignment pass will categorise. Decide
      // which so the frontier stays accurate:
      //   • If a substitution realigns the streams (subResyncDist >= 0), the student
      //     is moving forward through wrong word(s): advance BOTH pointers. (Don't be
      //     fooled into "insertion" just because the owed word recurs later — e.g.
      //     "of you" for "and its" where "and" reappears downstream.)
      //   • Else, if the owed ref word reappears in the typed stream shortly, this is
      //     an inserted (extra) word: advance ONLY the typed pointer, so the frontier
      //     doesn't consume the owed word — otherwise that word, once typed correctly,
      //     would sit "behind" the frontier and be mis-flagged as a backward repeat.
      //   • Else, treat as a substitution: advance both to stay in sync.
      // Either way, never flag a repeat or leap the frontier here.
      const INSERT_LOOK = 5;
      let isInsertion = false;
      if (subResyncDist < 0) {
        for (let look = i + 1; look <= i + INSERT_LOOK && look < T; look++) {
          if (eq(typedWords[look], refWords[refPos])) { isInsertion = true; break; }
        }
      }
      if (!isInsertion && refPos < R) {
        if (refPos > progress) progress = refPos;
        refPos++;
      }
      i++;
    }
  }

  return ranges;
}

export default detectRepeatedSequences;
