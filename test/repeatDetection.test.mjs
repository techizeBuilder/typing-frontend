// Standalone test for the passage-anchored repeat detector.
// Run with:  node test/repeatDetection.test.mjs   (from the frontend folder)
//
// No test runner is configured for the frontend, so this is a tiny assert-based
// harness that exits non-zero on the first failure.

import { detectRepeatedSequences } from '../src/utils/repeatDetection.js';

let passed = 0;
let failed = 0;

const w = (s) => s.trim().split(/\s+/).filter(Boolean);

// Total words covered by the detected ranges.
const repeatedCount = (ranges) =>
  ranges.reduce((sum, r) => sum + (r.end - r.start + 1), 0);

function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  ok  – ${name}`);
  } else {
    failed++;
    console.error(`FAIL – ${name}${detail ? `\n       ${detail}` : ''}`);
  }
}

// 1) No repeat: typed exactly equals reference → nothing flagged.
{
  const ref = w('the quick brown fox jumps over the lazy dog');
  const typed = ref.slice();
  const ranges = detectRepeatedSequences(typed, ref);
  check('exact pass has no repeats', repeatedCount(ranges) === 0,
    `got ${JSON.stringify(ranges)}`);
}

// 2) Natural recurrence ("the" appears twice) must NOT be a false positive.
{
  const ref = w('the cat sat on the mat today');
  const typed = ref.slice();
  const ranges = detectRepeatedSequences(typed, ref);
  check('naturally recurring words are not flagged', repeatedCount(ranges) === 0,
    `got ${JSON.stringify(ranges)}`);
}

// 3) Clean phrase repeat in the middle: student re-types "a b c d" then continues.
{
  const ref = w('a b c d e f');
  const typed = w('a b c d a b c d e f');
  const ranges = detectRepeatedSequences(typed, ref);
  check('clean middle repeat flags 4 words', repeatedCount(ranges) === 4,
    `got ${JSON.stringify(ranges)}`);
  check('clean middle repeat range is typed[4..7]',
    ranges.length === 1 && ranges[0].start === 4 && ranges[0].end === 7,
    `got ${JSON.stringify(ranges)}`);
}

// 4) Rule #4 — repeat with WRONG spelling is still detected.
//    Passage typed fully, then "a x c d" re-typed (b -> x misspelling).
{
  const ref = w('a b c d e f');
  const typed = w('a b c d e f a x c d');
  const ranges = detectRepeatedSequences(typed, ref);
  check('misspelled repeat still detected (all 4 words)',
    repeatedCount(ranges) === 4,
    `got ${JSON.stringify(ranges)}`);
  check('misspelled repeat covers typed[6..9]',
    ranges.length === 1 && ranges[0].start === 6 && ranges[0].end === 9,
    `got ${JSON.stringify(ranges)}`);
}

// 5) Single trailing extra word that duplicates an earlier passage word
//    (minLen = 1 → flagged).
{
  const ref = w('alpha beta gamma delta epsilon');
  const typed = w('alpha beta gamma delta epsilon gamma');
  const ranges = detectRepeatedSequences(typed, ref);
  check('single-word repeat flagged at minLen=1', repeatedCount(ranges) === 1,
    `got ${JSON.stringify(ranges)}`);
}

// 6) End-overflow: student finishes the passage then repeats the whole thing.
{
  const ref = w('one two three four five');
  const typed = w('one two three four five one two three four five');
  const ranges = detectRepeatedSequences(typed, ref);
  check('full re-type after completion flags the second pass (5 words)',
    repeatedCount(ranges) === 5,
    `got ${JSON.stringify(ranges)}`);
}

// 7) Repeat then correct resume: words after the repeat are NOT penalised.
{
  const ref = w('the report was filed early today by the clerk');
  // re-type "the report was" after the first three, then continue correctly
  const typed = w('the report was the report was filed early today by the clerk');
  const ranges = detectRepeatedSequences(typed, ref);
  check('only the repeated stretch is flagged, resume is clean',
    repeatedCount(ranges) === 3,
    `got ${JSON.stringify(ranges)}`);
}

// 8) Punctuation/case differences between passage and repeat still match.
{
  const ref = w('Hello, world this is fine');
  const typed = w('Hello, world this is fine hello world');
  const ranges = detectRepeatedSequences(typed, ref);
  check('repeat matches ignoring case/punctuation', repeatedCount(ranges) === 2,
    `got ${JSON.stringify(ranges)}`);
}

// 9) Empty inputs are safe.
{
  check('empty typed → no ranges', detectRepeatedSequences([], w('a b c')).length === 0);
  check('empty ref → no ranges', detectRepeatedSequences(w('a b c'), []).length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
