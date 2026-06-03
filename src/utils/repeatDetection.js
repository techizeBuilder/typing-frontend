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

    // Forward progress always wins ties: a naturally recurring word (which
    // matches both ahead and behind) keeps advancing normally. A backward run
    // is only taken when it is strictly longer than any forward continuation,
    // or when there is no forward match at all.
    const takeBackward = bestBackLen >= minLen && bestBackLen > fwdLen;

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

    if (fJump >= 0) {
      // Commit forward progress for this single word; the run continues naturally
      // on the next iterations.
      refPos = refPos + fJump + 1;
      if (refPos - 1 > progress) progress = refPos - 1;
      i++;
    } else {
      // No forward match and no backward repeat → a substitution/insertion that
      // the main alignment pass will categorise. Advance both pointers so we stay
      // roughly in sync; do NOT flag it as a repeat.
      if (refPos < R) {
        if (refPos > progress) progress = refPos;
        refPos++;
      }
      i++;
    }
  }

  return ranges;
}

export default detectRepeatedSequences;
