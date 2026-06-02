import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './ResultScreen.css';

// ─── PrintSheet — government exam format (visible only on print) ───────────────
const PrintSheet = ({
  examName, chapterNo, patternName, examDate, candidateName, rollNo, fathersName, category,
  userId, phone, city, state, profileImage,
  mode, testDurationMinutes, timeTakenStr,
  fullErrors, halfErrors, totalMistakes, halfMistakeEnabled,
  ignorableMistakePercent, penaltyWords, penaltyFactor, penaltyType,
  totalStrokes, totalWords,
  grossSpeedCalculated, netSpeedCalculated, accuracy,
  qualifyOn, requiredSpeed, isQualified, netWordsCalculated, correctWordsCalculated,
  backspaceControl,
  showHalfMistakes, showFullMistakes, showTotalStrokes, showTotalWords,
  showTotalErrors, showCorrectWords, showGrossSpeed, showNetSpeed,
  showAccuracy, showPenaltyWords, showIgnorableMistakes,
  userInput, referenceWords, wordStatuses, typedText, referenceText, isStenoResult,
  lineChangeCount = 0, alignedTypedWords = null, extraTypedWords = null,
  countOmissions = true, repeatedRanges = [],
}) => {
  const typedWordsPrt = userInput ? userInput.trim().split(/\s+/).filter(Boolean) : [];
  const totalTypedWords = typedWordsPrt.length;
  const avgStrokesPerWord = totalTypedWords > 0 ? (totalStrokes / totalTypedWords).toFixed(2) : '5.00';

  // Last ref index that was actually typed (non-pending) — everything after this is trailing
  const lastTypedRefIdxPrt = (() => {
    if (!wordStatuses) return -1;
    for (let i = wordStatuses.length - 1; i >= 0; i--) {
      if (wordStatuses[i] && wordStatuses[i] !== 'pending') return i;
    }
    return -1;
  })();

  // Colour-coded passage tokens
  const buildPassageTokens = () => {
    if (isStenoResult) return null;
    if (!referenceWords || referenceWords.length === 0)
      return <em style={{color:'#888'}}>No passage data.</em>;
    return referenceWords.map((refWord, i) => {
      const status = wordStatuses[i] || 'pending';
      // Use re-aligned word when available (line-change case), else positional typed word
      const typed  = alignedTypedWords ? (alignedTypedWords[i] || '') : (typedWordsPrt[i] || '');
      if (status === 'correct')    return <span key={i} className="prt-word prt-correct">{typed} </span>;
      if (status === 'error')      return <span key={i} className="prt-word prt-full-err">{typed || `–${refWord}`} </span>;
      if (status === 'half-error') return <span key={i} className="prt-word prt-half-err">{typed} </span>;
      // pending — trailing (after last typed word) vs mid-text skip
      if (i > lastTypedRefIdxPrt && !countOmissions)
        return <span key={i} className="prt-word prt-trailing">{refWord} </span>;
      return <span key={i} className="prt-word prt-omit">–{refWord} </span>;
    });
  };

  // Repeated words are stripped before alignment, so fold them into the Extra /
  // Addition words shown on the passage — each repeated word is an extra word.
  const repeatedWordsPrt = (repeatedRanges || []).flatMap((r) =>
    r && r.text ? r.text.split(/\s+/).filter(Boolean) : []
  );
  const baseExtraWords = Array.isArray(extraTypedWords)
    ? extraTypedWords.slice()
    : typedWordsPrt.slice(referenceWords ? referenceWords.length : 0);
  const extraWords = [...baseExtraWords, ...repeatedWordsPrt];

  const totalMistakesFormula = `${fullErrors} + (${halfErrors} × 0.5) = ${totalMistakes}`;
  const penaltyFormula = penaltyType === 'Stroke'
    ? `${totalMistakes} × 5 ÷ 5 × ${penaltyFactor} = ${penaltyWords}`
    : `${totalMistakes} × ${penaltyFactor} = ${penaltyWords}`;

  return (
    <div className="prt-sheet">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="prt-header">
        <div className="prt-logo-wrap">
          <img src="/balaji logo.jpeg" alt="Exam Logo" className="prt-logo-img"
            onError={e => { e.target.style.display='none'; }} />
        </div>
        <div className="prt-header-text">TYPING SKILL TEST RESULT</div>
        <div className="prt-header-divider">✿</div>
      </div>

      {/* ── Exam name + date row ───────────────────────────────── */}
      <div className="prt-exam-row">
        <span>EXAM NAME:&nbsp;<strong>{examName || 'Practice Test'}</strong></span>
        {chapterNo && <span>CHAPTER NO.:&nbsp;<strong>#{chapterNo}</strong></span>}
        {patternName && <span>RESULT PATTERN:&nbsp;<strong>{patternName}</strong></span>}
        <span>DATE OF EXAM:-&nbsp;<strong>{examDate}</strong></span>
      </div>

      {/* ── Candidate Details table ────────────────────────────── */}
      <div className="prt-section-heading">CANDIDATE DETAILS</div>
      <table className="prt-cand-table">
        <tbody>
          <tr>
            <td className="prt-cand-lbl">Candidate Name:</td>
            <td className="prt-cand-val">{candidateName || '—'}</td>
            <td className="prt-cand-lbl">Roll No.</td>
            <td className="prt-cand-val">{rollNo || '—'}</td>
            <td rowSpan={4} className="prt-photo-cell">
              {profileImage
                ? <img src={profileImage} alt="Student" className="prt-photo-img" />
                : <span className="prt-photo-placeholder">PHOTO</span>
              }
            </td>
          </tr>
          <tr>
            <td className="prt-cand-lbl">Father's Name:</td>
            <td className="prt-cand-val">{fathersName || '—'}</td>
            <td className="prt-cand-lbl">Category:</td>
            <td className="prt-cand-val">{category || '—'}</td>
          </tr>
          <tr>
            <td className="prt-cand-lbl">User ID:</td>
            <td className="prt-cand-val">{userId || '—'}</td>
            <td className="prt-cand-lbl">Language / Mode:</td>
            <td className="prt-cand-val">{mode || 'English'}</td>
          </tr>
          <tr>
            <td className="prt-cand-lbl">City / State:</td>
            <td className="prt-cand-val">{[city, state].filter(Boolean).join(', ') || '—'}</td>
            <td className="prt-cand-lbl">Phone:</td>
            <td className="prt-cand-val">{phone || '—'}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Typing Test Performance heading ───────────────────── */}
      <div className="prt-perf-heading">TYPING TEST PERFORMANCE</div>

      {/* ── Performance grid ────────────────────────────────────── */}
      <table className="prt-perf-table">
        <tbody>
          <tr>
            <td className="prt-perf-lbl">{showFullMistakes ? 'Full Mistake:' : ''}</td>
            <td className="prt-perf-val prt-val-red">{showFullMistakes ? fullErrors : ''}</td>
            <td className="prt-perf-lbl">{showTotalStrokes ? 'Total Strokes Typed:' : ''}</td>
            <td className="prt-perf-val">{showTotalStrokes ? totalStrokes : ''}</td>
            <td className="prt-perf-lbl">Test Duration:-</td>
            <td className="prt-perf-val">{testDurationMinutes} Min</td>
          </tr>
          <tr>
            <td className="prt-perf-lbl">{showHalfMistakes ? 'Half Mistake:' : ''}</td>
            <td className="prt-perf-val prt-val-orange">{showHalfMistakes ? halfErrors : ''}</td>
            <td className="prt-perf-lbl">{showTotalWords ? 'Total Words Typed:' : ''}</td>
            <td className="prt-perf-val">{showTotalWords ? totalTypedWords : ''}</td>
            <td className="prt-perf-lbl">Time Taken:</td>
            <td className="prt-perf-val">{timeTakenStr}</td>
          </tr>
          <tr>
            <td className="prt-perf-lbl">{showTotalErrors ? 'Total Mistakes (full + half×0.5):' : ''}</td>
            <td className="prt-perf-val">{showTotalErrors ? totalMistakes : ''}</td>
            <td className="prt-perf-lbl prt-formula-col" colSpan={2}>{showTotalErrors ? `[${totalMistakesFormula}]` : ''}</td>
            <td className="prt-perf-lbl">Backspace Used:-</td>
            <td className="prt-perf-val">{backspaceControl || 'Full'}</td>
          </tr>
          <tr>
            <td className="prt-perf-lbl">{showCorrectWords ? 'Right Words Typed:' : ''}</td>
            <td className="prt-perf-val prt-val-green">{showCorrectWords ? correctWordsCalculated : ''}</td>
            <td className="prt-perf-lbl">{showGrossSpeed ? 'Gross Speed (GWPM):' : ''}</td>
            <td className="prt-perf-val prt-val-blue">{showGrossSpeed ? `${grossSpeedCalculated} WPM` : ''}</td>
            <td className="prt-perf-lbl">{showNetSpeed ? 'Net Speed (NWPM):' : ''}</td>
            <td className="prt-perf-val prt-val-green">{showNetSpeed ? `${netSpeedCalculated} WPM` : ''}</td>
          </tr>
          <tr>
            <td className="prt-perf-lbl">{showPenaltyWords ? 'Penalty Words:' : ''}</td>
            <td className="prt-perf-val">{showPenaltyWords ? penaltyWords : ''}</td>
            <td className="prt-perf-lbl prt-formula-col" colSpan={2}>{showPenaltyWords ? `[${penaltyFormula}]` : ''}</td>
            <td className="prt-perf-lbl">{showIgnorableMistakes ? 'Ignorable Mistake (%):' : ''}</td>
            <td className="prt-perf-val">{showIgnorableMistakes ? `${ignorableMistakePercent}%` : ''}</td>
          </tr>
          <tr>
            <td className="prt-perf-lbl">{showAccuracy ? 'Accuracy (%):' : ''}</td>
            <td className="prt-perf-val">{showAccuracy ? `${accuracy}%` : ''}</td>
            <td className="prt-perf-lbl">Qualifying Speed ({qualifyOn}):</td>
            <td className="prt-perf-val">{requiredSpeed} WPM</td>
            <td className="prt-perf-lbl">Status:</td>
            <td className={`prt-perf-val prt-status ${isQualified ? 'prt-pass' : 'prt-fail'}`}>
              {isQualified ? '✔ QUALIFIED' : '✘ UNQUALIFIED'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Mistake legend row ───────────────────────────────────── */}
      <div className="prt-legend-row">
        {showFullMistakes && <span>Full Mistake:– <span className="prt-leg-yellow">in yellow color</span></span>}
        {showHalfMistakes && <span>Half Mistake:– <span className="prt-leg-orange">In orange color</span></span>}
        <span><strong>–</strong> sign:– for Omission Word</span>
        <span><strong>+</strong> Sign:– for Addition word</span>
        {lineChangeCount > 0 && <span style={{color:'#6d28d9'}}><strong>↕ Line/Para Changed:–</strong> {lineChangeCount} time{lineChangeCount > 1 ? 's' : ''}</span>}
      </div>

      {/* ── Typed passage with colour coding ───────────────────── */}
      <div className="prt-passage-area">
        {isStenoResult ? (
          <p style={{ fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.9 }}>
            {typedText}
          </p>
        ) : (
          <p className="prt-passage-text">
            {buildPassageTokens()}
            {extraWords.map((w, i) => (
              <span key={`ex-${i}`} className="prt-word prt-extra">+{w} </span>
            ))}
          </p>
        )}
      </div>

      <div className="prt-divider-line" />

      {/* ── Important Instructions ──────────────────────────────── */}
      <div className="prt-instructions">
        <div className="prt-inst-heading">IMPORTANT INSTRUCTIONS</div>
        <ol>
          <li>This is a computer generated result. Signature of candidate is required.</li>
          <li>This result is provisional and subject to verification of original documents.</li>
          <li>The authorities reserve the right to cancel/ modify the result in case of any discrepancy.</li>
        </ol>
      </div>

      <div className="prt-end-line">-------END TEST----</div>

      {/* ── Screen-only notice ──────────────────────────────────── */}
      <div className="prt-screen-notice no-print">
        <h2>THIS PAGE ONLY FOR PRINT/ PDF MODE</h2>
        <p>WHEN STUDENT CLICK ON PRINT THIS</p>
      </div>
    </div>
  );
};


// ─── Helpers ─────────────────────────────────────────────────────────────────
const normalizeWordResult = (w) => w.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]/gi, '');
const tokenizeResult      = (text) => text.trim().split(/\s+/).filter(Boolean);

// ─── Sequential alignment ────────────────────────────────────────────────────
// Replaces LCS. Detects where the student started (anchor), then matches
// strictly in the FORWARD direction — never jumps to a far-later paragraph.
//
// Step 1 – Anchor detection: scan the reference for the earliest position
//   where at least 2 of the first 5 typed words match consecutively.
//   That is the student's detected start position.
//   All reference words before the start are left unmatched (= omissions).
//
// Step 2 – Greedy sequential matching from the start position:
//   • Direct match at current ref pos → correct.
//   • No match → look ahead up to OMIT_WINDOW ref positions for this
//     typed word.  If found nearby → skip ref words (omissions), align here.
//   • If next typed word matches current ref → current typed word is an
//     insertion (extra word); ref pos does NOT advance.
//   • Otherwise → substitution; pair typed word with current ref word.
function seqAlign(refNorm, typedNorm) {
  const R = refNorm.length, T = typedNorm.length;
  if (T === 0 || R === 0) return new Array(R).fill(-1);

  // ── Anchor detection ────────────────────────────────────────────────────
  const ANCHOR_LEN = Math.min(5, T);
  let startRefPos  = 0;
  let bestScore    = 0;

  for (let ri = 0; ri <= R - 1; ri++) {
    let score = 0;
    for (let k = 0; k < ANCHOR_LEN && ri + k < R; k++) {
      if (refNorm[ri + k] === typedNorm[k]) score++;
      else break; // require consecutive run from the anchor point
    }
    if (score > bestScore) {
      bestScore   = score;
      startRefPos = ri;
      if (score === ANCHOR_LEN) break; // perfect match — stop early
    }
  }
  if (bestScore < 2) startRefPos = 0; // fallback: assume student started at top

  // ── Two-level sequential greedy matching ────────────────────────────────
  // SMALL_WIN: single-word omissions in the same sentence (no cluster needed)
  // LARGE_WIN: paragraph jumps — require MIN_CLUSTER consecutive typed words
  //            matching at a forward ref position before jumping there
  const SMALL_WIN   = 10;
  const LARGE_WIN   = 150;
  const MIN_CLUSTER = 2;

  const matchedRef  = new Array(R).fill(-1);
  let refPos = startRefPos;

  for (let tp = 0; tp < T; tp++) {
    if (refPos >= R) break;
    const tw = typedNorm[tp];

    // 1. Direct match
    if (tw === refNorm[refPos]) {
      matchedRef[refPos] = tp; refPos++; continue;
    }

    // 2. Small window: single-word omission within same sentence
    const smallEnd = Math.min(refPos + SMALL_WIN + 1, R);
    let matchPos = -1;
    for (let look = refPos + 1; look < smallEnd; look++) {
      if (tw === refNorm[look]) { matchPos = look; break; }
    }

    if (matchPos >= 0) {
      matchedRef[matchPos] = tp;
      refPos = matchPos + 1;
      continue;
    }

    // 3. Large window: paragraph jump — require MIN_CLUSTER consecutive matches
    const largeEnd = Math.min(refPos + LARGE_WIN + 1, R);
    let clusterRef = -1;
    for (let lookRef = refPos + SMALL_WIN + 1; lookRef < largeEnd; lookRef++) {
      let consec = 0;
      for (let k = 0; k < MIN_CLUSTER; k++) {
        if (tp + k < T && lookRef + k < R && typedNorm[tp + k] === refNorm[lookRef + k]) {
          consec++;
        } else {
          break;
        }
      }
      if (consec >= MIN_CLUSTER) { clusterRef = lookRef; break; }
    }

    if (clusterRef >= 0) {
      // Ref words refPos … clusterRef-1 are omissions (stay -1)
      refPos = clusterRef;
      tp--; // re-process this typed word at the new refPos (for-loop will tp++)
      continue;
    }

    // 4. Extra-word check: look ahead INSERT_LOOK typed words for a match with
    //    current ref. If found, the current typed word is an insertion (extra word)
    //    and refPos does NOT advance. Otherwise it is a substitution.
    const INSERT_LOOK_S = 5;
    let isInsertionS = false;
    for (let look = tp + 1; look <= tp + INSERT_LOOK_S && look < T; look++) {
      if (typedNorm[look] === refNorm[refPos]) { isInsertionS = true; break; }
    }
    if (!isInsertionS) {
      matchedRef[refPos] = tp; // substitution
      refPos++;
    }
    // if isInsertionS: refPos stays, typed word at tp is unclaimed → classified as 'extra' below
  }

  return matchedRef;
}

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
const _isAllCaps = (w) => { const l = w.replace(/[^a-zA-Z]/g, ''); return l.length > 1 && l === l.toUpperCase(); };

// Count exact-match correct words for steno results using bipartite pass-1 only.
const _stenoCorrectCount = (typedText, referenceText) => {
  const tw = (typedText || '').trim().split(/\s+/).filter(Boolean);
  const rw = (referenceText || '').trim().split(/\s+/).filter(Boolean);
  const tn = tw.map(w => w.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/gi, ''));
  const rn = rw.map(w => w.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/gi, ''));
  const used = new Set();
  let cnt = 0;
  for (let ri = 0; ri < rn.length; ri++) {
    for (let ti = 0; ti < tn.length; ti++) {
      if (!used.has(ti) && tn[ti] === rn[ri]) {
        if (tw[ti] === rw[ri]) cnt++; // only exact raw match counts as "correct"
        used.add(ti);
        break;
      }
    }
  }
  return cnt;
};

// ─── Bipartite alignment (used for Steno) ────────────────────────────────────
// Two-pass: pass 1 matches exact normalized forms; pass 2 matches spelling
// variants (half mistake). Order-independent — a correctly heard word is
// credited even if written in a different position.
function bipartiteAlign(refNorm, typedNorm) {
  const R = refNorm.length;
  const T = typedNorm.length;
  const usedTyped  = new Set();
  const matchedRef = new Array(R).fill(-1);
  const isSpell    = new Array(R).fill(false);

  // Pass 1: exact normalized match
  for (let ri = 0; ri < R; ri++) {
    for (let ti = 0; ti < T; ti++) {
      if (!usedTyped.has(ti) && typedNorm[ti] === refNorm[ri]) {
        matchedRef[ri] = ti; usedTyped.add(ti); break;
      }
    }
  }
  // Pass 2: spelling match for still-unmatched reference words (PDF 2a)
  for (let ri = 0; ri < R; ri++) {
    if (matchedRef[ri] !== -1) continue;
    for (let ti = 0; ti < T; ti++) {
      if (!usedTyped.has(ti) && _isSpellingErr(refNorm[ri], typedNorm[ti])) {
        matchedRef[ri] = ti; isSpell[ri] = true; usedTyped.add(ti); break;
      }
    }
  }
  return { matchedRef, isSpell, usedTyped };
}

// ─── StenoDiff ────────────────────────────────────────────────────────────────
const StenoDiff = ({ typed = '', reference = '', pattern = null, testDurationMinutes = 10 }) => {
  const typedWords = tokenizeResult(typed);
  const refWords   = tokenizeResult(reference);
  const typedNorm  = typedWords.map(normalizeWordResult);
  const refNorm    = refWords.map(normalizeWordResult);

  const { matchedRef, isSpell, usedTyped } = bipartiteAlign(refNorm, typedNorm);

  // Token types per SSC PDF guidelines:
  //   correct – exact match
  //   half    – case / punctuation difference only (PDF 2c, 2d, 2e) → half mistake
  //   spell   – close spelling error          (PDF 2a)              → half mistake
  //   caps    – word typed in ALL CAPITALS    (PDF 1h)              → full mistake
  //   missed  – omission                      (PDF 1a)              → full mistake
  //   extra   – addition                      (PDF 1c)              → full mistake
  const tokens = [];
  for (let ri = 0; ri < refWords.length; ri++) {
    const ti = matchedRef[ri];
    if (ti === -1) {
      tokens.push({ type: 'missed', typed: null, ref: refWords[ri] });
    } else if (isSpell[ri]) {
      tokens.push({ type: 'spell', typed: typedWords[ti], ref: refWords[ri] });
    } else {
      const rawT = typedWords[ti], rawR = refWords[ri];
      if (rawT === rawR) {
        tokens.push({ type: 'correct', typed: rawT, ref: rawR });
      } else if (_isAllCaps(rawT)) {
        tokens.push({ type: 'caps', typed: rawT, ref: rawR });   // PDF 1h: full
      } else {
        tokens.push({ type: 'half', typed: rawT, ref: rawR });   // PDF 2c/d/e: half
      }
    }
  }
  for (let ti = 0; ti < typedWords.length; ti++) {
    if (!usedTyped.has(ti))
      tokens.push({ type: 'extra', typed: typedWords[ti], ref: null });
  }

  const counts = tokens.reduce((acc, tok) => { acc[tok.type] = (acc[tok.type] || 0) + 1; return acc; }, {});

  // Per PDF: Full = omissions + additions + all-caps; Half = spelling + case/punct
  const halfEnabled    = pattern?.half_mistake_enabled ?? true;
  const rawFull        = (counts.missed || 0) + (counts.extra || 0) + (counts.caps || 0);
  const rawHalf        = (counts.spell || 0) + (counts.half || 0);
  const fullErrCount   = halfEnabled ? rawFull : rawFull + rawHalf;
  const halfErrCount   = halfEnabled ? rawHalf : 0;
  const totalMistakes  = parseFloat((fullErrCount + halfErrCount * 0.5).toFixed(2));

  // PDF formula: Error % = (Full + Half/2) × 100 / masterPassageWords
  // masterPassageWords = requiredSpeed × testDurationMinutes (per PDF table)
  const masterWords   = pattern?.required_speed ? pattern.required_speed * testDurationMinutes : refWords.length;
  const errorPercent  = masterWords > 0 ? parseFloat((totalMistakes / masterWords * 100).toFixed(2)) : 0;

  const styles = {
    wrap:    { fontFamily: "'Courier New', monospace", lineHeight: 2.2, wordSpacing: '4px', flexWrap: 'wrap', display: 'flex', gap: '6px', padding: '16px 0' },
    correct: { color: '#16a34a', display: 'inline-block' },
    half:    { display: 'inline-block', background: '#fef3c7', borderRadius: '4px', padding: '0 4px', color: '#92400e' },
    spell:   { display: 'inline-block', background: '#fde68a', borderRadius: '4px', padding: '0 4px', color: '#92400e', fontStyle: 'italic' },
    caps:    { display: 'inline-block', background: '#fee2e2', borderRadius: '4px', padding: '0 4px', color: '#b91c1c', fontWeight: 700, letterSpacing: '1px' },
    missed:  { display: 'inline-block', background: '#f1f5f9', borderRadius: '4px', padding: '0 4px', color: '#dc2626', textDecoration: 'line-through', opacity: 0.75 },
    extra:   { display: 'inline-block', background: '#eff6ff', borderRadius: '4px', padding: '0 4px', color: '#1d4ed8' },
  };

  return (
    <div>
      {/* ── Side-by-side passage comparison ─────────────────── */}
      <div className="pa-compare-layout" style={{ marginBottom: '18px' }}>
        <div className="pa-compare-cols">
          <div className="pa-compare-col">
            <div className="pa-compare-header">Original Passage</div>
            <div className="pa-compare-body">{reference || <em style={{ color: '#9ca3af' }}>No passage.</em>}</div>
          </div>
          <div className="pa-compare-col">
            <div className="pa-compare-header">Your Typed Passage</div>
            <div className="pa-compare-body">{typed || <em style={{ color: '#9ca3af' }}>Nothing typed.</em>}</div>
          </div>
        </div>
      </div>

      {/* ── Error summary (PDF formula) ───────────────────────── */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'center' }}>
        <span style={{ color: '#16a34a', fontWeight: 700 }}>✔ Correct: {counts.correct || 0}</span>
        <span style={{ color: '#dc2626', fontWeight: 700 }}>Full Mistakes: {fullErrCount}</span>
        {halfEnabled && <span style={{ color: '#d97706', fontWeight: 700 }}>Half Mistakes: {halfErrCount}</span>}
        <span style={{ color: '#1e293b', fontWeight: 700 }}>
          Total = {totalMistakes}
          <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.82rem' }}>
            &nbsp;[{fullErrCount} + {halfErrCount}×0.5]
          </span>
        </span>
        <span style={{ color: errorPercent > 5 ? '#dc2626' : '#16a34a', fontWeight: 700, fontSize: '1rem' }}>
          Error%: {errorPercent}%
          <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.78rem' }}>
            &nbsp;[{totalMistakes}/{masterWords}×100]
          </span>
        </span>
      </div>

      {/* ── Breakdown row ─────────────────────────────────────── */}
      <div style={{ fontSize: '0.79rem', color: '#64748b', marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <span>Omissions: <strong style={{color:'#dc2626'}}>{counts.missed || 0}</strong></span>
        <span>Additions: <strong style={{color:'#1d4ed8'}}>{counts.extra || 0}</strong></span>
        <span>All-Caps: <strong style={{color:'#b91c1c'}}>{counts.caps || 0}</strong></span>
        <span>Spelling: <strong style={{color:'#d97706'}}>{counts.spell || 0}</strong></span>
        <span>Case/Punct: <strong style={{color:'#92400e'}}>{counts.half || 0}</strong></span>
        <span style={{marginLeft:'auto',fontStyle:'italic'}}>
          Master passage words: {masterWords}
          {pattern?.required_speed ? ` (${pattern.required_speed}wpm × ${testDurationMinutes}min)` : ' (ref length)'}
        </span>
      </div>

      {/* ── Colour legend ─────────────────────────────────────── */}
      <div style={{ fontSize: '0.77rem', color: '#64748b', marginBottom: '8px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <span style={{background:'#f1f5f9',padding:'1px 5px',borderRadius:'3px',textDecoration:'line-through',color:'#dc2626'}}>omission</span>
        <span style={{background:'#eff6ff',padding:'1px 5px',borderRadius:'3px',color:'#1d4ed8'}}>+addition</span>
        <span style={{background:'#fee2e2',padding:'1px 5px',borderRadius:'3px',color:'#b91c1c',fontWeight:700}}>ALL-CAPS</span>
        <span style={{background:'#fde68a',padding:'1px 5px',borderRadius:'3px',color:'#92400e',fontStyle:'italic'}}>speling</span>
        <span style={{background:'#fef3c7',padding:'1px 5px',borderRadius:'3px',color:'#92400e'}}>cAse/punct</span>
      </div>

      {/* ── Word diff tokens ──────────────────────────────────── */}
      <div style={styles.wrap}>
        {tokens.map((tok, idx) => {
          if (tok.type === 'correct') return <span key={idx} style={styles.correct}>{tok.typed}</span>;
          if (tok.type === 'half')    return (
            <span key={idx} style={styles.half}>
              {tok.typed}<span style={{ fontSize: '0.75em', color: '#b45309' }}>({tok.ref})</span>
            </span>
          );
          if (tok.type === 'spell')   return (
            <span key={idx} style={styles.spell}>
              {tok.typed}<span style={{ fontSize: '0.75em' }}>({tok.ref})</span>
            </span>
          );
          if (tok.type === 'caps')    return (
            <span key={idx} style={styles.caps}>
              {tok.typed}<span style={{ fontSize: '0.75em', fontWeight: 400 }}>({tok.ref})</span>
            </span>
          );
          if (tok.type === 'missed') return <span key={idx} style={styles.missed}>-{tok.ref}</span>;
          if (tok.type === 'extra')  return <span key={idx} style={styles.extra}>+{tok.typed}</span>;
          return null;
        })}
      </div>
    </div>
  );
};

// ─── TypingPassageReview ──────────────────────────────────────────────────────
const TypingPassageReview = ({ userInput = '', referenceWords = [], wordStatuses = [],
  fullErrors = 0, halfErrors = 0, totalStrokes = 0, timeElapsed = 600,
  testDurationMinutes = 10,
  netSpeedCalculated = 0, grossSpeedCalculated = 0, accuracy = 0,
  lineChangeCount = 0, alignedTypedWords = null, extraTypedWords = null,
  countOmissions = true, repeatedRanges = [], originalPassage = '',
}) => {
  const [view, setView] = React.useState(null);
  const [showCat, setShowCat] = React.useState(null);
  const panelRef = React.useRef(null);
  const typedWords = userInput.trim().split(/\s+/).filter(Boolean);
  // When a line change was detected, use re-aligned word-at-position instead of raw index
  const wordAt = (i) => alignedTypedWords ? (alignedTypedWords[i] || '') : (typedWords[i] || '');

  // Last ref index that was actually typed (non-pending) — everything after is trailing
  const lastTypedRefIdx = (() => {
    for (let i = wordStatuses.length - 1; i >= 0; i--) {
      if (wordStatuses[i] && wordStatuses[i] !== 'pending') return i;
    }
    return -1;
  })();

  // Addition errors: prefer alignment-derived extras (insertions anywhere in the typed stream),
  // fall back to the simple "extra at end" heuristic. Repeated words are stripped before
  // alignment, so fold them in here — each repeated word is an extra word + full error.
  const repeatedWords = (repeatedRanges || []).flatMap((r) =>
    r && r.text ? r.text.split(/\s+/).filter(Boolean) : []
  );
  const baseAdditionWords = Array.isArray(extraTypedWords)
    ? extraTypedWords.slice()
    : typedWords.slice(referenceWords.length);
  const additionWords = [...baseAdditionWords, ...repeatedWords];

  const spellingWords = [], omissionWords = [], capWords = [], punctWords = [];
  referenceWords.forEach((refWord, i) => {
    const status = wordStatuses[i] || 'pending';
    const typed = wordAt(i);
    if (status === 'error')   spellingWords.push({ refWord, typed });
    if (status === 'pending') {
      // Exclude trailing omissions (after last typed word) when admin disabled omission counting
      const isTrailing = i > lastTypedRefIdx;
      if (!isTrailing || countOmissions) omissionWords.push({ refWord, typed: '' });
    }
    if (status === 'half-error') {
      if (typed.toLowerCase() === refWord.toLowerCase()) capWords.push({ refWord, typed });
      else punctWords.push({ refWord, typed });
    }
  });
  const totalErrors = spellingWords.length + omissionWords.length + additionWords.length + capWords.length + punctWords.length;
  const timeMin = timeElapsed > 0 ? timeElapsed / 60 : 1;
  const totalWords = parseFloat((totalStrokes / 5).toFixed(1));
  // Deduct 5 strokes only for pure full errors (spelling/omission/addition), not half-errors (cap/punct)
  const pureFullErrors = fullErrors - halfErrors;
  const correctStrokes = Math.max(0, totalStrokes - pureFullErrors * 5);

  const handleFullScreen = () => {
    const el = panelRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const LineChart = ({ label, data, color }) => {
    const W=260,H=110,pl=28,pb=22,pt=8,pr=8,cw=W-pl-pr,ch=H-pb-pt;
    const max=Math.max(...data,1);
    const pts=data.map((v,i)=>[pl+(i/(data.length-1))*cw, pt+ch-(v/max)*ch]);
    return (
      <div className="pa-chart-box">
        <div className="pa-chart-label">{label}</div>
        <svg width={W} height={H}>
          {[0,25,50,75,100].map(p=>{const y=pt+ch-(p/100)*ch;return <line key={p} x1={pl} x2={W-pr} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1"/>})}
          <polyline points={pts.map(p=>p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="2"/>
          {pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3" fill={color}/>)}
          <text x={pl} y={H-4} fontSize="9" fill="#94a3b8">1</text>
          <text x={W-pr-8} y={H-4} fontSize="9" fill="#94a3b8">{data.length}</text>
          <text x={2} y={pt+6} fontSize="9" fill="#94a3b8">{Math.round(max)}</text>
        </svg>
        <div className="pa-chart-xlab">Time (Minutes)</div>
      </div>
    );
  };

  const mins=Math.max(2,Math.round(timeMin));
  const genSpeed=()=>Array.from({length:mins},(_,i)=>Math.max(0,grossSpeedCalculated*(0.6+0.4*((i+1)/mins))+(Math.random()-0.5)*4));
  const genAcc=()=>Array.from({length:mins},(_,i)=>Math.min(100,accuracy*(1.08-0.08*(i/mins))+(Math.random()-0.5)*5));
  const genErr=()=>Array.from({length:mins},(_,i)=>Math.max(0,(totalErrors/Math.max(1,mins))*(i+1)*0.9+(Math.random()-0.5)*2));

  const ErrorCard = () => (
    <div className="pa-error-card">
      <div className="pa-card-title">ERROR ANALYSIS</div>
      {[
        {icon:'🔺',label:'Spelling Mistakes',  count:spellingWords.length,             color:'#dc2626'},
        {icon:'🔴',label:'Omission Errors',    count:omissionWords.length,             color:'#ea580c'},
        {icon:'🟠',label:'Addition Errors',    count:additionWords.length,             color:'#d97706'},
        {icon:'🔵',label:'Formatting Errors',  count:capWords.length+punctWords.length,color:'#1d4ed8'},
        {icon:'↕', label:'Line / Para Changed',count:lineChangeCount,                  color:'#7c3aed'},
      ].map(({icon,label,count,color})=>(
        <div className="pa-error-row" key={label}>
          <span className="pa-error-icon">{icon}</span>
          <span className="pa-error-label">{label}</span>
          <span className="pa-error-count" style={{color}}>{count}</span>
        </div>
      ))}
      <div className="pa-error-total-row">
        <span className="pa-total-label">Total Errors</span>
        <span className="pa-total-count">{totalErrors}</span>
      </div>
    </div>
  );

  const renderMistakePanel = () => (
    <div className="pa-mistakes-layout">
      <ErrorCard/>
      <div className="pa-show-box">
        {[
          {key:'spelling', label:'Spelling Mistake',      count:spellingWords.length,  words:spellingWords},
          {key:'omission', label:'Omission Errors',       count:omissionWords.length,  words:omissionWords},
          {key:'addition', label:'Addition Errors',       count:additionWords.length,  words:additionWords.map(w=>({typed:w,refWord:''}))},
          {key:'cap',      label:'Capitalization Errors', count:capWords.length,       words:capWords},
          {key:'punct',    label:'Punctuation Errors',    count:punctWords.length,     words:punctWords},
          {key:'linechg',  label:'Line / Para Changed',   count:lineChangeCount,       words:[]},
        ].map(({key,label,count,words})=>(
          <div key={key}>
            <div className="pa-show-row">
              <span className="pa-show-label">{label}–</span>
              <span className="pa-show-count" style={key==='linechg'&&count>0?{color:'#7c3aed',fontWeight:700}:{}}>{count}</span>
              {key==='linechg'
                ? count>0 && <span className="pa-show-btn" style={{background:'#ede9fe',color:'#6d28d9',cursor:'default',fontSize:'0.72rem'}}>Student skipped a line/paragraph {count} time{count>1?'s':''}</span>
                : <button className="pa-show-btn" onClick={()=>setShowCat(showCat===key?null:key)}>{showCat===key?'Hide':'Show'}</button>
              }
            </div>
            {key!=='linechg' && showCat===key && words.length>0 && (
              <div className="pa-show-words">
                {words.map((w,i)=>(
                  <span key={i} className="pa-word-chip">
                    <span className="pa-typed">{w.typed||'–'}</span>
                    {w.refWord&&<span className="pa-ref">({w.refWord})</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="pa-show-row pa-total-final">
          <span className="pa-show-label">Total Errors–</span>
          <span className="pa-show-count">{totalErrors}</span>
        </div>
      </div>
    </div>
  );

  const renderAnalysisPanel = () => (
    <div className="pa-analysis-layout">
      <div className="pa-stat-cards-row">
        <div className="pa-stat-card">
          <div className="pa-card-title">TYPING BREAKDOWN</div>
          {[
            {label:'Typed Keystrokes',    val:totalStrokes,                       color:''},
            {label:'Correct Keystrokes',  val:correctStrokes,                     color:'#16a34a'},
            {label:'Wrong Keystrokes',    val:totalStrokes-correctStrokes,        color:'#ea580c'},
            {label:'Errors per Minute',   val:(totalErrors/timeMin).toFixed(1),   color:''},
            {label:'Avg Keys per Word',   val:typedWords.length > 0 ? (totalStrokes / typedWords.length).toFixed(2) : '5.00', color:''},
            {label:'Spacebar Pressed',    val:Math.max(0, typedWords.length - 1), color:''},
          ].map(({label,val,color})=>(
            <div className="pa-bd-row" key={label}>
              <span>{label}</span>
              <span style={{color:color||'#1e293b',fontWeight:600}}>{val}</span>
            </div>
          ))}
        </div>
        <ErrorCard/>
        <div className="pa-stat-card">
          <div className="pa-card-title">TIME ANALYSIS</div>
          {(() => {
            const totalSec    = testDurationMinutes * 60;
            const activeSec   = timeElapsed;
            const idleSec     = Math.max(0, totalSec - activeSec);
            const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
            return [
            {label:'Total Time',             val:fmt(totalSec),  color:''},
            {label:'Active Typing Time',     val:fmt(activeSec), color:'#16a34a'},
            {label:'Idle Time',              val:fmt(idleSec),   color:'#dc2626'},
            {label:'Time Per Word',          val:`${(activeSec/Math.max(1,totalStrokes/5)).toFixed(2)} sec`, color:''},
            {label:'Words Per Minute (Net)', val:`${netSpeedCalculated} WPM`, color:''},
            ].map(({label,val,color})=>(
              <div className="pa-bd-row" key={label}>
                <span>{label}</span>
                <span style={{color:color||'#1e293b',fontWeight:600}}>{val}</span>
              </div>
            ));
          })()}
        </div>
      </div>
      <div className="pa-charts-row">
        <LineChart label="SPEED OVER TIME (WPM)"   data={genSpeed()} color="#dc2626"/>
        <LineChart label="ACCURACY OVER TIME (%)"  data={genAcc()}   color="#dc2626"/>
        <LineChart label="ERRORS OVER TIME"         data={genErr()}   color="#dc2626"/>
      </div>
    </div>
  );

  const renderComparePanel = () => {
    const tokens=referenceWords.map((refWord,i)=>({refWord,typed:wordAt(i),status:wordStatuses[i]||'pending'}));
    return (
      <div className="pa-compare-layout">
        <div className="pa-compare-cols">
          <div className="pa-compare-col">
            <div className="pa-compare-header">Original Passage</div>
            {/* Show the complete uploaded passage. referenceWords may be trimmed to the
                portion the student reached (re-type tests), so prefer the full text. */}
            <div className="pa-compare-body">{originalPassage || referenceWords.join(' ')}</div>
          </div>
          <div className="pa-compare-col">
            <div className="pa-compare-header">Your Typed Passage</div>
            <div className="pa-compare-body">{userInput||<em style={{color:'#9ca3af'}}>Nothing typed.</em>}</div>
          </div>
        </div>
        <div className="pa-result-bar">
          <div className="pa-result-bar-label">Result</div>
          <div className="pa-result-text">
            {tokens.map(({refWord,typed,status},i)=>{
              if(status==='correct')    return <span key={i}>{typed} </span>;
              if(status==='error')      return <span key={i}><span className="pa-res-wrong">{typed}({refWord})</span> </span>;
              if(status==='half-error') return <span key={i}><span className="pa-res-half">{typed}({refWord})</span> </span>;
              // pending — show trailing omissions (after last typed word) without strikethrough
              // when admin has disabled omission error counting
              const isTrailing = i > lastTypedRefIdx;
              if(isTrailing && !countOmissions)
                return <span key={i} style={{color:'#94a3b8'}}>{refWord} </span>;
              return <span key={i}><span className="pa-res-omit">-{refWord}</span> </span>;
            })}
            {/* Extra words — includes repeated words, which are counted as extra
                words. Shown once here in blue with a + sign (no separate brown
                highlight, which would duplicate them). */}
            {additionWords.map((w,i)=>(
              <span key={`ex-${i}`}><span className="pa-res-extra">+{w}</span> </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={panelRef}>
      <div className="passage-buttons no-print">
        <button className={`passage-tab-btn${view==='analysis'?' active':''}`} onClick={()=>setView(view==='analysis'?null:'analysis')}>Test Analysis</button>
        <button className={`passage-tab-btn${view==='mistakes'?' active':''}`} onClick={()=>setView(view==='mistakes'?null:'mistakes')}>Click to check Mistake</button>
        <button className={`passage-tab-btn tab-compare${view==='compare'?' active':''}`} onClick={()=>setView(view==='compare'?null:'compare')}>Click to Compare Passage</button>
        <button className="passage-tab-btn" style={{marginLeft:'auto'}} onClick={handleFullScreen}>⛶ Full Screen</button>
      </div>
      {view==='mistakes' && <div className="pa-panel">{renderMistakePanel()}</div>}
      {view==='analysis' && <div className="pa-panel">{renderAnalysisPanel()}</div>}
      {view==='compare'  && <div className="pa-panel">{renderComparePanel()}</div>}
    </div>
  );
};

// ─── ResultScreen ─────────────────────────────────────────────────────────────
const ResultScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileData, setProfileData] = React.useState({
    name: null, roll_no: null, fathers_name: null, category: null,
    user_id: null, phone: null, city: null, state: null, profile_image: null,
  });

  React.useEffect(() => {
    import('../services/api').then(({ userService }) => {
      userService.getProfile()
        .then(data => {
          if (data) setProfileData({
            name:          data.name,
            roll_no:       data.roll_no,
            fathers_name:  data.fathers_name,
            category:      data.category,
            user_id:       data.user_id,
            phone:         data.phone,
            city:          data.city,
            state:         data.state,
            profile_image: data.profile_image,
          });
        })
        .catch(e => console.error('Failed to load profile:', e));
    });
  }, []);

  const {
    gwpm, nwpm, accuracy, fullErrors = 0, halfErrors = 0,
    totalStrokes = 0, timeElapsed = 600, exam_name, chapter_no, date_taken,
    studentName, rollNo: stateRollNo,
    mode, typedText, referenceText,
    pattern,
    userInput = '', referenceWords = [], wordStatuses = [],
    lineChangeCount = 0, alignedTypedWords = null,
    extraTypedWords: stateExtraTypedWords = null,
    repeatedRanges: stateRepeatedRanges = null,
    originalPassage = '',
  } = location.state || {};

  const patternName = pattern?.name || null;

  // Full uploaded passage for the "Original Passage" reading column. reference_words
  // may be trimmed to the portion the student actually reached (re-type tests cap the
  // stored words), so prefer the complete passage when supplied; fall back to the words.
  const fullOriginalPassage = originalPassage || referenceWords.join(' ');

  // Alignment-derived extra (addition) words arrive directly on a fresh test, or
  // live inside pattern_data when viewing a past result loaded from the DB.
  // Keeping the array authoritative (even when empty) avoids the trailing-slice
  // fallback double-counting repeated words.
  const extraTypedWords = Array.isArray(stateExtraTypedWords)
    ? stateExtraTypedWords
    : (Array.isArray(location.state?.pattern?.extra_typed_words) ? location.state.pattern.extra_typed_words : null);

  // Repeated word ranges may arrive directly (fresh test) or live inside
  // pattern_data when viewing a past result loaded from the DB.
  const repeatedRanges = Array.isArray(stateRepeatedRanges) && stateRepeatedRanges.length > 0
    ? stateRepeatedRanges
    : (Array.isArray(location.state?.pattern?.repeated_ranges) ? location.state.pattern.repeated_ranges : []);
  const repeatedWordCount = repeatedRanges.reduce((sum, r) => sum + ((r.end ?? 0) - (r.start ?? 0) + 1), 0);

  const isStenoResult = !!(typedText && referenceText);

  const handleReturn = () => {
    const role = localStorage.getItem('role');
    navigate(role === 'Admin' || role === 'SuperAdmin' || role === 'SubAdmin' ? '/admin/students' : '/dashboard');
  };

  const username     = studentName || profileData.name || localStorage.getItem('username') || 'Student';
  const rollNo       = stateRollNo || profileData.roll_no || '—';
  const fathersName  = profileData.fathers_name || '—';
  const category     = profileData.category || '—';
  const userId       = profileData.user_id || localStorage.getItem('username') || '—';
  const phone        = profileData.phone || '—';
  const city         = profileData.city || '';
  const state        = profileData.state || '';
  // Build full image URL — backend serves at {API_BASE_URL}/uploads/...
  const profileImageUrl = profileData.profile_image
    ? (profileData.profile_image.startsWith('http')
        ? profileData.profile_image
        : `${API_BASE_URL}${profileData.profile_image}`)
    : null;

  const formattedDate = date_taken
    ? new Date(date_taken).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timeTakenStr = formatTime(timeElapsed);
  const timeMinutes = timeElapsed > 0 ? timeElapsed / 60 : 1;

  // Actual space-delimited word counts — shown in the display cards
  const actualTypedWordCount   = userInput.trim().split(/\s+/).filter(Boolean).length;
  const actualCorrectWordCount = isStenoResult
    ? _stenoCorrectCount(typedText, referenceText)
    : wordStatuses.filter(s => s === 'correct').length;

  // ─── Pattern-driven Calculations ─────────────────────────────────────────────
  // Pattern controls whether speed counts in Words or Strokes.
  // 'Words' = actual typed word count. 'Strokes' = totalStrokes/5 (industry standard).
  const speedCount = pattern?.speed_count ?? 'Strokes';
  const totalWords = speedCount === 'Words'
    ? actualTypedWordCount
    : parseFloat((totalStrokes / 5).toFixed(2));
  const grossSpeedCalculated = parseFloat((totalWords / timeMinutes).toFixed(2));

  const halfMistakeEnabled = pattern?.half_mistake_enabled ?? true;
  
  // Extract all visibility toggles
  const showHalfMistakes = pattern?.show_half_mistakes ?? true;
  const showFullMistakes = pattern?.show_full_mistakes ?? true;
  const showTotalStrokes = pattern?.show_total_strokes ?? true;
  const showTotalWords = pattern?.show_total_words ?? true;
  const showTotalErrors = pattern?.show_total_errors ?? true;
  const showCorrectWords = pattern?.show_correct_words ?? true;
  const showGrossSpeed = pattern?.show_gross_speed ?? true;
  const showNetSpeed = pattern?.show_net_speed ?? true;
  const showAccuracy = pattern?.show_accuracy ?? true;
  const showPenaltyWords = pattern?.show_penalty_words ?? true;
  const showIgnorableMistakes = pattern?.show_ignorable_mistakes ?? true;
  const countOmissions = pattern?.count_omissions_as_errors ?? true;

  // ─── Recompute error counts from wordStatuses ────────────────────────────────
  // Always derive from wordStatuses so Full Mistakes = Total Errors in analysis panel.
  // Fixes mismatches from old stored results or detectLineChanges divergence.
  const _typedWds  = userInput.trim().split(/\s+/).filter(Boolean);
  const _wordAtFn  = (i) => alignedTypedWords ? (alignedTypedWords[i] || '') : (_typedWds[i] || '');
  const _lastTyped = (() => {
    for (let i = wordStatuses.length - 1; i >= 0; i--) {
      if (wordStatuses[i] && wordStatuses[i] !== 'pending') return i;
    }
    return -1;
  })();
  // An empty-but-present array means alignment found zero insertions (authoritative);
  // only fall back to the trailing-slice heuristic for legacy results that lack the field.
  // Repeated words are counted separately via repeatedWordCount (below), so they must
  // NOT also leak in through the trailing slice.
  const _addCount = Array.isArray(extraTypedWords)
    ? extraTypedWords.length
    : _typedWds.slice(referenceWords.length).length;

  let _sp = 0, _om = 0, _cap = 0, _pct = 0;
  if (!isStenoResult && referenceWords.length > 0) {
    referenceWords.forEach((refWord, i) => {
      const s = wordStatuses[i] || 'pending';
      const t = _wordAtFn(i);
      if (s === 'error') _sp++;
      if (s === 'pending') {
        const isTrailing = i > _lastTyped;
        if (!isTrailing || countOmissions) _om++;
      }
      if (s === 'half-error') {
        if (t.toLowerCase() === refWord.toLowerCase()) _cap++;
        else _pct++;
      }
    });
  }
  // For steno fall back to passed-in props; for typing always use wordStatuses-derived values.
  // repeatedWordCount is added here because repeated words are stripped before alignment and
  // therefore not reflected in wordStatuses — they must be counted separately.
  const effectiveFullErrors = isStenoResult ? fullErrors : (_sp + _om + _addCount + _cap + _pct + repeatedWordCount);
  const effectiveHalfErrors = isStenoResult ? halfErrors : (_cap + _pct);

  const totalMistakes = parseFloat(
    (effectiveFullErrors + effectiveHalfErrors * 0.5).toFixed(2)
  );

  const penaltyFactor = pattern?.penalty_value ?? 1;
  const penaltyType   = pattern?.penalty_type ?? 'Word';
  const penaltyWords  = parseFloat(
    penaltyType === 'Stroke'
      ? ((totalMistakes * 5 / 5) * penaltyFactor).toFixed(2)
      : (totalMistakes * penaltyFactor).toFixed(2)
  );

  const netWordsCalculated = parseFloat(Math.max(0, totalWords - penaltyWords).toFixed(2));
  const netSpeedCalculated = parseFloat(Math.max(0, netWordsCalculated / timeMinutes).toFixed(2));
  const correctWordsCalculated = parseFloat(Math.max(0, totalWords - totalMistakes).toFixed(2));
  // Accuracy = (NWPM / GWPM) × 100  per standard typing test formula (PDF rule)
  const accuracyCalculated = grossSpeedCalculated > 0
    ? parseFloat(Math.max(0, Math.min(100, (netSpeedCalculated / grossSpeedCalculated) * 100)).toFixed(2))
    : 0;

  const qualifyOn     = pattern?.qualify_on ?? 'NWPM';
  const requiredSpeed = pattern?.required_speed ?? 30;
  const requiredAcc   = pattern?.required_accuracy ?? 95;
  const speedToCheck  = qualifyOn === 'GWPM' ? grossSpeedCalculated : netSpeedCalculated;
  const isQualified   = speedToCheck >= requiredSpeed;

  // Shows actual mistake rate so it can be compared against the 7% ignorable threshold
  const ignorableMistakePercent = totalWords > 0
    ? parseFloat(((totalMistakes / totalWords) * 100).toFixed(1))
    : 0;
  const testDurationMinutes = location.state?.testDurationMinutes || Math.floor(timeElapsed / 60) || 10;
  const backspaceControl = location.state?.backspaceControl || 'Full Backspace';

  // ─── Print ref ───────────────────────────────────────────────────────────────
  const printRef = React.useRef(null);

  const handlePrint = React.useCallback(() => {
    const node = printRef.current;
    if (!node) return;

    // Gather all stylesheet text from the current page
    let cssText = '';
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules || []).forEach(rule => { cssText += rule.cssText + '\n'; });
        } catch (_) {/* cross-origin sheet — skip */}
      });
    } catch (_) {}

    // Build a self-contained HTML document with all styles embedded
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Typing Test Result</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; font-family: 'Times New Roman', Times, serif; }
    ${cssText}
    /* Force colours to print */
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .no-print { display: none !important; }
  </style>
</head>
<body>
  ${node.innerHTML}
</body>
</html>`;

    // Use Electron IPC if available, else fall back to browser print
    if (window.electronAPI && window.electronAPI.printResult) {
      window.electronAPI.printResult(html).catch(err => {
        console.error('Electron print error:', err);
        window.print();
      });
    } else {
      window.print();
    }
  }, []);

  return (
    <div className="result-layout">
      {/* ── Print-only sheet (matches government exam format) ── */}
      <div className="print-only-wrapper" ref={printRef}>
        <PrintSheet
          examName={exam_name}
          chapterNo={chapter_no}
          patternName={patternName}
          examDate={formattedDate}
          candidateName={username}
          rollNo={rollNo}
          fathersName={fathersName}
          category={category}
          userId={userId}
          phone={phone}
          city={city}
          state={state}
          profileImage={profileImageUrl}
          mode={mode}
          testDurationMinutes={testDurationMinutes}
          timeTakenStr={timeTakenStr}
          fullErrors={effectiveFullErrors}
          halfErrors={effectiveHalfErrors}
          totalMistakes={totalMistakes}
          halfMistakeEnabled={halfMistakeEnabled}
          ignorableMistakePercent={ignorableMistakePercent}
          penaltyWords={penaltyWords}
          penaltyFactor={penaltyFactor}
          penaltyType={penaltyType}
          totalStrokes={totalStrokes}
          totalWords={totalWords}
          grossSpeedCalculated={grossSpeedCalculated}
          netSpeedCalculated={netSpeedCalculated}
          accuracy={accuracyCalculated}
          qualifyOn={qualifyOn}
          requiredSpeed={requiredSpeed}
          isQualified={isQualified}
          netWordsCalculated={netWordsCalculated}
          correctWordsCalculated={correctWordsCalculated}
          backspaceControl={backspaceControl}
          showHalfMistakes={showHalfMistakes}
          showFullMistakes={showFullMistakes}
          showTotalStrokes={showTotalStrokes}
          showTotalWords={showTotalWords}
          showTotalErrors={showTotalErrors}
          showCorrectWords={showCorrectWords}
          showGrossSpeed={showGrossSpeed}
          showNetSpeed={showNetSpeed}
          showAccuracy={showAccuracy}
          showPenaltyWords={showPenaltyWords}
          showIgnorableMistakes={showIgnorableMistakes}
          userInput={userInput}
          referenceWords={referenceWords}
          wordStatuses={wordStatuses}
          typedText={typedText}
          referenceText={referenceText}
          isStenoResult={isStenoResult}
          lineChangeCount={lineChangeCount}
          alignedTypedWords={alignedTypedWords}
          extraTypedWords={extraTypedWords}
          countOmissions={countOmissions}
          repeatedRanges={repeatedRanges}
        />
      </div>

      <div className="print-controls no-print">
        <button className="btn-secondary" onClick={handlePrint}>🖨 Print / Save Result</button>
        <button className="btn-primary" onClick={handleReturn}>← Return to Dashboard</button>
      </div>

      <div className="sheet-container">

        {/* ── Header banner ─────────────────────────────── */}
        <div className="sheet-header">
          <h2 className="sheet-title">Candidate Result Sheet — Typing Test</h2>
          <div className="sheet-exam-banner">{exam_name || 'Practice Test'}</div>
        </div>

        {/* ── Two-panel: Candidate Details + Final Result ── */}
        <div className="sheet-top-row">

          {/* Left: Candidate Details */}
          <div className="candidate-details-panel">
            <h3>Candidate Details</h3>
            <table className="candidate-table">
              <tbody>
                <tr><td>Candidate Name</td><td>:</td><td>{username}</td></tr>
                <tr><td>Roll Number</td><td>:</td><td>{rollNo}</td></tr>
                <tr><td>Exam Name</td><td>:</td><td>{exam_name || 'Practice Test'}</td></tr>
                {chapter_no && <tr><td>Chapter No.</td><td>:</td><td><strong style={{ color: '#1e40af' }}>#{chapter_no}</strong></td></tr>}
                {patternName && <tr><td>Result Pattern</td><td>:</td><td><span style={{ background: '#f0fdf4', color: '#166534', padding: '1px 7px', borderRadius: '4px', fontWeight: 600, fontSize: '0.9em' }}>{patternName}</span></td></tr>}
                <tr><td>Language</td><td>:</td><td>{mode || 'English'}</td></tr>
                <tr><td>Test Duration</td><td>:</td><td>{location.state?.testDurationMinutes || Math.floor(timeElapsed / 60)} Minutes</td></tr>
                <tr><td>Test Date &amp; Time</td><td>:</td><td>{formattedDate}</td></tr>
                <tr>
                  <td>Result ID</td><td>:</td>
                  <td>
                    <span className="result-id-row">
                      RES-{String(Math.floor(Math.random() * 90000000 + 10000000))}
                      <button className="result-id-copy" title="Copy">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </button>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right: Final Result verdict */}
          <div className="final-result-panel">
            <div className={`final-result-box ${isQualified ? 'qualified' : 'unqualified'}`}>
              <div className="final-result-label">Final Result</div>
              <div className={`final-result-verdict ${isQualified ? 'qualified-text' : 'unqualified-text'}`}>
                <span className={`verdict-icon ${isQualified ? 'pass' : 'fail'}`}>
                  {isQualified ? '✓' : '✕'}
                </span>
                {isQualified ? 'QUALIFIED' : 'UNQUALIFIED'}
              </div>
              <div className="final-result-sub">
                {isQualified
                  ? `You met the required ${qualifyOn} of ${requiredSpeed} WPM.`
                  : 'You did not meet the required speed and accuracy criteria.'}
              </div>
            </div>
          </div>
        </div>

        {/* ── 6-Metric Stats Cards Row ───────────────────── */}
        <div className="stats-cards-row">
          {showGrossSpeed && (
            <div className="stat-metric-card metric-gross">
              <div className="stat-metric-label">Gross Speed</div>
              <div className="stat-metric-body">
                <span className="stat-metric-icon">🕹</span>
                <span className="stat-metric-value">{grossSpeedCalculated}</span>
              </div>
              <div className="stat-metric-unit">WPM</div>
            </div>
          )}
          {showNetSpeed && (
            <div className="stat-metric-card metric-net">
              <div className="stat-metric-label">Net Speed</div>
              <div className="stat-metric-body">
                <span className="stat-metric-icon">📊</span>
                <span className="stat-metric-value">{netSpeedCalculated}</span>
              </div>
              <div className="stat-metric-unit">WPM</div>
            </div>
          )}
          {showAccuracy && (
            <div className="stat-metric-card metric-acc">
              <div className="stat-metric-label">Accuracy</div>
              <div className="stat-metric-body">
                <span className="stat-metric-icon">🎯</span>
                <span className="stat-metric-value">{accuracyCalculated}%</span>
              </div>
              <div className="stat-metric-unit">&nbsp;</div>
            </div>
          )}
          {showTotalWords && (
            <div className="stat-metric-card metric-total">
              <div className="stat-metric-label">Total Typed Words</div>
              <div className="stat-metric-body">
                <span className="stat-metric-icon">📄</span>
                <span className="stat-metric-value">{actualTypedWordCount}</span>
              </div>
              <div className="stat-metric-unit">&nbsp;</div>
            </div>
          )}
          {showCorrectWords && (
            <div className="stat-metric-card metric-correct">
              <div className="stat-metric-label">Correct Words</div>
              <div className="stat-metric-body">
                <span className="stat-metric-icon">✅</span>
                <span className="stat-metric-value">{actualCorrectWordCount}</span>
              </div>
              <div className="stat-metric-unit">&nbsp;</div>
            </div>
          )}
          {showFullMistakes && (
            <div className="stat-metric-card metric-wrong">
              <div className="stat-metric-label">Wrong Words</div>
              <div className="stat-metric-body">
                <span className="stat-metric-icon">❌</span>
                <span className="stat-metric-value">{effectiveFullErrors}</span>
              </div>
              <div className="stat-metric-unit">&nbsp;</div>
            </div>
          )}
        </div>

        {/* ── Detailed Stats Columns ─────────────────────── */}
        <div className="sheet-stats-container">
          <div className="stats-col-left">
            {showTotalStrokes && (
              <div className="stat-line">
                <span className="stat-label">Total Strokes Typed =</span>
                <span className="stat-val">{totalStrokes}</span>
                <span className="stat-formula">[character keystrokes, spaces/punct excluded]</span>
              </div>
            )}
            {showFullMistakes && (
              <div className="stat-line">
                <span className="stat-label">Full Mistakes =</span>
                <span className="stat-val">{effectiveFullErrors}</span>
              </div>
            )}
            {showHalfMistakes && (
              <div className="stat-line">
                <span className="stat-label">Half Mistakes =</span>
                <span className="stat-val">{effectiveHalfErrors}</span>
                <span className="stat-formula">[counted as 0.5 each]</span>
              </div>
            )}
            {showTotalErrors && (
              <div className="stat-line">
                <span className="stat-label">Total Mistakes =</span>
                <span className="stat-val">{totalMistakes}</span>
                <span className="stat-formula">
                  [{effectiveFullErrors} + ({effectiveHalfErrors} × 0.5) = {totalMistakes}]
                </span>
              </div>
            )}
            {showPenaltyWords && (
              <div className="stat-line">
                <span className="stat-label">Penalty Words =</span>
                <span className="stat-val">{penaltyWords}</span>
                <span className="stat-formula">
                  {penaltyType === 'Stroke'
                    ? `[${totalMistakes} mistakes × 5 strokes / 5 × ${penaltyFactor} factor]`
                    : `[${totalMistakes} mistakes × ${penaltyFactor} penalty factor]`}
                </span>
              </div>
            )}
          </div>

          <div className="stats-col-right">
            {showTotalWords && (
              <div className="stat-line">
                <span className="stat-label">Total Words Typed =</span>
                <span className="stat-val">{totalWords}</span>
                <span className="stat-formula">
                  {speedCount === 'Words'
                    ? `[${actualTypedWordCount} actual words typed]`
                    : `[${totalStrokes} Keystrokes / 5]`}
                </span>
              </div>
            )}
            {showGrossSpeed && (
              <div className="stat-line">
                <span className="stat-label">Gross Speed (GWPM) =</span>
                <span className="stat-val highlight-yellow">{grossSpeedCalculated} wpm</span>
                <span className="stat-formula">[{totalWords} words / {timeMinutes.toFixed(2)} min]</span>
              </div>
            )}
            {showAccuracy && (
              <div className="stat-line">
                <span className="stat-label">Accuracy =</span>
                <span className="stat-val">{accuracyCalculated}%</span>
              </div>
            )}
            {showNetSpeed && (
              <div className="stat-line">
                <span className="stat-label">Net Words Typed =</span>
                <span className="stat-val">{netWordsCalculated}</span>
                <span className="stat-formula">[{totalWords} - {penaltyWords} penalty words]</span>
              </div>
            )}
            {showNetSpeed && (
              <div className="stat-line">
                <span className="stat-label">Net Speed (NWPM) =</span>
                <span className="stat-val highlight-yellow">{netSpeedCalculated} wpm</span>
                <span className="stat-formula">[{netWordsCalculated} / {timeMinutes.toFixed(2)} min]</span>
              </div>
            )}
            <div className="stat-line result-status">
              <span className="stat-label">Result =</span>
              <span className={`stat-val ${isQualified ? 'badge-qualified' : 'badge-not-qualified'}`}>
                {isQualified ? '✅ Qualified' : '❌ Not-Qualified'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer Notes ───────────────────────────────── */}
        <div className="sheet-footer-notes">
          <p>* Qualifying Speed: <strong>{requiredSpeed} {qualifyOn}</strong> | Your {qualifyOn}: <strong>{speedToCheck} wpm</strong> → You are <strong>{isQualified ? 'Qualified' : 'Not Qualified'}</strong>.</p>
          <p>* Penalty Type: <strong>{penaltyType}</strong> | Penalty Factor: <strong>{penaltyFactor}</strong> | Half Mistakes: <strong>Count as 0.5</strong></p>
          <p>* Punctuation and Capital/Small letter mistakes count as Half Mistakes; spelling mistakes count as Full Mistakes.</p>
        </div>

        {/* ── Repeated Lines Section ───────────────────── */}
        {repeatedRanges.length > 0 && (
          <div className="repeated-lines-section">
            <h3 className="repeated-lines-title">
              ⚠ Repeated Lines Detected ({repeatedWordCount} word{repeatedWordCount !== 1 ? 's' : ''} counted as extra words / full errors)
            </h3>
            <p className="repeated-lines-note">
              The following typed segments duplicate an earlier portion of the passage. Every repeated word — correct or not — is counted as an extra word and one full error.
            </p>
            <table className="repeated-lines-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Repeated Range</th>
                  <th>Original Range</th>
                  <th>Words</th>
                  <th>Repeated Text</th>
                </tr>
              </thead>
              <tbody>
                {repeatedRanges.map((r, idx) => {
                  const len = (r.end - r.start + 1);
                  return (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>Words {r.start + 1}–{r.end + 1}</td>
                      <td>Words {r.sourceStart + 1}–{r.sourceEnd + 1}</td>
                      <td>{len}</td>
                      <td className="repeated-lines-text">{r.text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Passage Review Section ─────────────────────── */}
        <div className="passage-review-section" id="passage-review-section">

          {/* Mistake Legend bar */}
          <div className="mistake-legend-bar no-print">
            {showFullMistakes && (
              <span className="legend-chip">
                Full Mistake:–&nbsp;<span className="legend-swatch swatch-yellow"></span>&nbsp;in yellow color
              </span>
            )}
            {showHalfMistakes && (
              <span className="legend-chip">
                Half Mistake:–&nbsp;<span style={{ color: '#ea580c', fontWeight: 700 }}>In orange color</span>
              </span>
            )}
            <span className="legend-chip"><strong>–</strong>&nbsp;sign:– for Omission Word</span>
            <span className="legend-chip"><strong>+</strong>&nbsp;Sign:– for Addition word</span>
          </div>

          {isStenoResult ? (
            <StenoDiff typed={typedText} reference={referenceText} pattern={pattern} testDurationMinutes={testDurationMinutes} />
          ) : (
            <TypingPassageReview
              userInput={userInput}
              referenceWords={referenceWords}
              wordStatuses={wordStatuses}
              fullErrors={effectiveFullErrors}
              halfErrors={effectiveHalfErrors}
              totalStrokes={totalStrokes}
              timeElapsed={timeElapsed}
              testDurationMinutes={testDurationMinutes}
              netSpeedCalculated={netSpeedCalculated}
              grossSpeedCalculated={grossSpeedCalculated}
              accuracy={accuracyCalculated}
              lineChangeCount={lineChangeCount}
              alignedTypedWords={alignedTypedWords}
              extraTypedWords={extraTypedWords}
              countOmissions={countOmissions}
              repeatedRanges={repeatedRanges}
              originalPassage={fullOriginalPassage}
            />
          )}
        </div>

      </div>
    </div>
  );
};

export default ResultScreen;
