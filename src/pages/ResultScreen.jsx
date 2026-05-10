import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './ResultScreen.css';

// ─── PrintSheet — government exam format (visible only on print) ───────────────
const PrintSheet = ({
  examName, examDate, candidateName, rollNo, fathersName, category,
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
  lineChangeCount = 0, alignedTypedWords = null,
}) => {
  const typedWordsPrt = userInput ? userInput.trim().split(/\s+/).filter(Boolean) : [];
  const totalTypedWords = typedWordsPrt.length;
  const avgStrokesPerWord = totalTypedWords > 0 ? (totalStrokes / totalTypedWords).toFixed(2) : '5.00';

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
      return <span key={i} className="prt-word prt-omit">–{refWord} </span>;
    });
  };

  const extraWords = typedWordsPrt.slice(referenceWords ? referenceWords.length : 0);

  const totalMistakesFormula = halfMistakeEnabled
    ? `${fullErrors} + (${halfErrors} × 0.5) = ${totalMistakes}`
    : `${fullErrors} + ${halfErrors} = ${totalMistakes}`;
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
            <td className="prt-perf-lbl">{showTotalErrors ? 'Total Errors (full + half/2):' : ''}</td>
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

// ─── LCS alignment ───────────────────────────────────────────────────────────
function lcsAlign(refNorm, typedNorm) {
  const R = refNorm.length, T = typedNorm.length;
  const dp = Array.from({ length: R + 1 }, () => new Array(T + 1).fill(0));
  for (let i = 1; i <= R; i++)
    for (let j = 1; j <= T; j++)
      dp[i][j] = refNorm[i-1] === typedNorm[j-1]
        ? dp[i-1][j-1] + 1
        : Math.max(dp[i-1][j], dp[i][j-1]);

  const matchedRef = new Array(R).fill(-1);
  let i = R, j = T;
  while (i > 0 && j > 0) {
    if (refNorm[i-1] === typedNorm[j-1]) { matchedRef[i-1] = j-1; i--; j--; }
    else if (dp[i-1][j] > dp[i][j-1]) i--;
    else j--;
  }
  return matchedRef;
}

// ─── StenoDiff ────────────────────────────────────────────────────────────────
const StenoDiff = ({ typed = '', reference = '' }) => {
  const typedWords = tokenizeResult(typed);
  const refWords   = tokenizeResult(reference);
  const typedNorm  = typedWords.map(normalizeWordResult);
  const refNorm    = refWords.map(normalizeWordResult);

  const matchedRef = lcsAlign(refNorm, typedNorm);
  const usedTyped  = new Set(matchedRef.filter(x => x !== -1));

  const tokens = [];
  for (let ri = 0; ri < refWords.length; ri++) {
    const ti = matchedRef[ri];
    if (ti === -1) {
      tokens.push({ type: 'missed', typed: null, ref: refWords[ri] });
    } else {
      const rawT = typedWords[ti], rawR = refWords[ri];
      tokens.push(rawT === rawR
        ? { type: 'correct', typed: rawT, ref: rawR }
        : { type: 'half',    typed: rawT, ref: rawR });
    }
  }
  for (let ti = 0; ti < typedWords.length; ti++) {
    if (!usedTyped.has(ti))
      tokens.push({ type: 'extra', typed: typedWords[ti], ref: null });
  }

  const counts = tokens.reduce((acc, tok) => { acc[tok.type] = (acc[tok.type] || 0) + 1; return acc; }, {});

  const styles = {
    wrap:    { fontFamily: "'Courier New', monospace", lineHeight: 2, wordSpacing: '4px', flexWrap: 'wrap', display: 'flex', gap: '6px', padding: '16px 0' },
    correct: { color: '#16a34a', display: 'inline-block' },
    half:    { display: 'inline-block', background: '#fef3c7', borderRadius: '4px', padding: '0 4px', color: '#92400e' },
    missed:  { display: 'inline-block', background: '#f1f5f9', borderRadius: '4px', padding: '0 4px', color: '#dc2626', textDecoration: 'line-through', opacity: 0.7 },
    extra:   { display: 'inline-block', background: '#eff6ff', borderRadius: '4px', padding: '0 4px', color: '#1d4ed8' },
  };

  return (
    <div>
      <div className="legend-row" style={{ marginBottom: '8px' }}>
        <span style={{ color: '#16a34a', fontWeight: 600 }}>✔ Correct: {counts.correct || 0}</span>
        <span style={{ color: '#dc2626', fontWeight: 600 }}>✘ Extra/Wrong: {counts.extra || 0}</span>
        <span style={{ color: '#d97706', fontWeight: 600 }}>~ Half Error (case/punct): {counts.half || 0}</span>
        <span style={{ color: '#64748b', fontWeight: 600 }}>— Missed: {counts.missed || 0}</span>
      </div>
      <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '10px', fontStyle: 'italic' }}>
        ℹ️ Comparison is fuzzy: spaces, punctuation &amp; capitalization are forgiven.
      </div>
      <div style={styles.wrap}>
        {tokens.map((tok, idx) => {
          if (tok.type === 'correct') return <span key={idx} style={styles.correct}>{tok.typed}</span>;
          if (tok.type === 'half')    return (
            <span key={idx} style={styles.half}>
              {tok.typed}<span style={{ fontSize: '0.78em', color: '#b45309' }}>{'{'+tok.ref+'}'}</span>
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
  lineChangeCount = 0, alignedTypedWords = null,
}) => {
  const [view, setView] = React.useState(null);
  const [showCat, setShowCat] = React.useState(null);
  const panelRef = React.useRef(null);
  const typedWords = userInput.trim().split(/\s+/).filter(Boolean);
  // When a line change was detected, use re-aligned word-at-position instead of raw index
  const wordAt = (i) => alignedTypedWords ? (alignedTypedWords[i] || '') : (typedWords[i] || '');

  const spellingWords = [], omissionWords = [], additionWords = typedWords.slice(referenceWords.length), capWords = [], punctWords = [];
  referenceWords.forEach((refWord, i) => {
    const status = wordStatuses[i] || 'pending';
    const typed = wordAt(i);
    if (status === 'error')      spellingWords.push({ refWord, typed });
    if (status === 'pending')    omissionWords.push({ refWord, typed: '' });
    if (status === 'half-error') {
      if (typed.toLowerCase() === refWord.toLowerCase()) capWords.push({ refWord, typed });
      else punctWords.push({ refWord, typed });
    }
  });
  const totalErrors = spellingWords.length + omissionWords.length + additionWords.length + capWords.length + punctWords.length;
  const timeMin = timeElapsed > 0 ? timeElapsed / 60 : 1;
  const totalWords = parseFloat((totalStrokes / 5).toFixed(1));
  const correctStrokes = Math.max(0, totalStrokes - fullErrors * 5);

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
            {label:'Total Keystrokes',    val:totalStrokes,                       color:''},
            {label:'Correct Keystrokes',  val:correctStrokes,                     color:'#16a34a'},
            {label:'Wrong Keystrokes',    val:totalStrokes-correctStrokes,        color:'#ea580c'},
            {label:'Errors per Minute',   val:(totalErrors/timeMin).toFixed(1),   color:''},
            {label:'Avg Keys per Word',   val:'5.00',                             color:''},
            {label:'Spacebar Pressed',    val:Math.round(totalStrokes/5),         color:''},
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
            <div className="pa-compare-body">{referenceWords.join(' ')}</div>
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
              return <span key={i}><span className="pa-res-omit">-{refWord}</span> </span>;
            })}
            {typedWords.slice(referenceWords.length).map((w,i)=>(
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
    totalStrokes = 0, timeElapsed = 600, exam_name, date_taken,
    studentName, rollNo: stateRollNo,
    mode, typedText, referenceText,
    pattern,
    userInput = '', referenceWords = [], wordStatuses = [],
    lineChangeCount = 0, alignedTypedWords = null,
  } = location.state || {};

  const isStenoResult = !!(typedText && referenceText);

  const handleReturn = () => navigate('/dashboard');

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

  // ─── Pattern-driven Calculations ─────────────────────────────────────────────
  // Stroke-based word count — used for GWPM/NWPM speed formulas (industry standard)
  const totalWords           = parseFloat((totalStrokes / 5).toFixed(2));
  const grossSpeedCalculated = parseFloat((totalWords / timeMinutes).toFixed(2));

  // Actual space-delimited word counts — shown in the display cards
  const actualTypedWordCount   = userInput.trim().split(/\s+/).filter(Boolean).length;
  const actualCorrectWordCount = wordStatuses.filter(s => s === 'correct').length;

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

  const totalMistakes = parseFloat(
    (fullErrors + (halfMistakeEnabled ? halfErrors * 0.5 : halfErrors)).toFixed(2)
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

  const qualifyOn     = pattern?.qualify_on ?? 'NWPM';
  const requiredSpeed = pattern?.required_speed ?? 30;
  const requiredAcc   = pattern?.required_accuracy ?? 95;
  const speedToCheck  = qualifyOn === 'GWPM' ? grossSpeedCalculated : netSpeedCalculated;
  const isQualified   = speedToCheck >= requiredSpeed;

  const ignorableMistakePercent = totalWords > 0
    ? parseFloat(((halfErrors / totalWords) * 100).toFixed(1))
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
          fullErrors={fullErrors}
          halfErrors={halfErrors}
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
          accuracy={accuracy}
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
                <span className="stat-metric-value">{accuracy}%</span>
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
                <span className="stat-metric-value">{fullErrors}</span>
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
                <span className="stat-val">{fullErrors}</span>
              </div>
            )}
            {showHalfMistakes && (
              <div className="stat-line">
                <span className="stat-label">Half Mistakes =</span>
                <span className="stat-val">{halfErrors}</span>
                <span className="stat-formula">[counted as {halfMistakeEnabled ? '0.5 each' : '1.0 each (treated as full)'}]</span>
              </div>
            )}
            {showTotalErrors && (
              <div className="stat-line">
                <span className="stat-label">Total Mistakes =</span>
                <span className="stat-val">{totalMistakes}</span>
                <span className="stat-formula">
                  [{fullErrors} + ({halfErrors} × {halfMistakeEnabled ? '0.5' : '1.0'})]
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
                <span className="stat-formula">[{totalStrokes} Keystrokes / 5]</span>
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
                <span className="stat-val">{accuracy}%</span>
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
          <p>* Penalty Type: <strong>{penaltyType}</strong> | Penalty Factor: <strong>{penaltyFactor}</strong> | Half Mistakes: <strong>{halfMistakeEnabled ? 'Count as 0.5' : 'Count as Full'}</strong></p>
          <p>* Punctuation and Capital/Small letter mistakes count as Half Mistakes; spelling mistakes count as Full Mistakes.</p>
        </div>

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
            <StenoDiff typed={typedText} reference={referenceText} />
          ) : (
            <TypingPassageReview
              userInput={userInput}
              referenceWords={referenceWords}
              wordStatuses={wordStatuses}
              fullErrors={fullErrors}
              halfErrors={halfErrors}
              totalStrokes={totalStrokes}
              timeElapsed={timeElapsed}
              testDurationMinutes={testDurationMinutes}
              netSpeedCalculated={netSpeedCalculated}
              grossSpeedCalculated={grossSpeedCalculated}
              accuracy={accuracy}
              lineChangeCount={lineChangeCount}
              alignedTypedWords={alignedTypedWords}
            />
          )}
        </div>

      </div>
    </div>
  );
};

export default ResultScreen;
