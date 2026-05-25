import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { resultService } from '../services/api';
import { API_BASE_URL } from '../config';
import './StenoTestEngine.css';

// ─── Steno Test Engine ───────────────────────────────────────────────────────
// Rules:
//  1. On mount → show Audio Player Modal (Play / Pause / Skip / Close)
//  2. Skip or Close → dismiss modal → blank typing area appears
//  3. Source text is NEVER shown to the student
//  4. Screen-type selection is ignored (fixed clean layout)
//  5. On submit → typed text compared word-by-word against chapter.content_text
//  6. Result navigated with full stats

const StenoTestEngine = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { exam, chapter, mode, testType } = location.state || {};

  const isStrictMode = !!exam;
  const pattern      = exam?.result_pattern || null;

  // ─── Audio state ────────────────────────────────────────────────────────────
  const audioRef           = useRef(null);
  const [showAudioModal, setShowAudioModal]   = useState(true);
  const [audioPlaying, setAudioPlaying]       = useState(false);
  const [audioDuration, setAudioDuration]     = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioEnded, setAudioEnded]           = useState(false);
  const [audioSpeed, setAudioSpeed]           = useState(100); // in WPM (base 100)

  // ─── Timer state ────────────────────────────────────────────────────────────
  const [timeLeft,    setTimeLeft]    = useState(exam?.test_time_minutes * 60 || 600);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isStarted,   setIsStarted]   = useState(false);

  // ─── Typing state ───────────────────────────────────────────────────────────
  const [typedText, setTypedText] = useState('');

  // ─── Result stats ────────────────────────────────────────────────────────────
  const [fullErrors,    setFullErrors]    = useState(0);
  const [halfErrors,    setHalfErrors]    = useState(0);
  const [totalStrokes,  setTotalStrokes]  = useState(0);
  const [stats, setStats] = useState({ gwpm: 0, nwpm: 0, accuracy: 100 });
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const textareaRef = useRef(null);

  // ─── Audio URL resolution ────────────────────────────────────────────────────
  // Stream through the NestJS controller endpoint so CORS, routing and nginx
  // proxy all work automatically — no dependency on static file serving config.
  const audioUrl = chapter?.id ? `${API_BASE_URL}/chapters/${chapter.id}/audio` : null;

  // ─── Audio event handlers ────────────────────────────────────────────────────
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime     = () => setAudioCurrentTime(el.currentTime);
    const onDuration = () => setAudioDuration(el.duration || 0);
    const onEnded    = () => { setAudioPlaying(false); setAudioEnded(true); };
    el.addEventListener('timeupdate',      onTime);
    el.addEventListener('loadedmetadata',  onDuration);
    el.addEventListener('ended',           onEnded);
    return () => {
      el.removeEventListener('timeupdate',     onTime);
      el.removeEventListener('loadedmetadata', onDuration);
      el.removeEventListener('ended',          onEnded);
    };
  }, []);

  const handlePlay = () => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = audioSpeed / 100;
    audioRef.current.play().then(() => {
      setAudioPlaying(true);
    }).catch((err) => {
      console.error('Audio play failed:', audioUrl, err);
      alert('Audio could not be played. The file may still be loading or the URL is unreachable:\n' + audioUrl);
    });
  };

  const handlePause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setAudioPlaying(false);
  };

  const handleSpeedChange = (speed) => {
    setAudioSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed / 100;
    }
  };

  const handleSkipOrClose = () => {
    if (audioRef.current) { audioRef.current.pause(); }
    setAudioPlaying(false);
    setShowAudioModal(false);
    // Start timer when student dismisses audio player
    setIsStarted(true);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // ─── Timer ──────────────────────────────────────────────────────────────────
  const isStartedRef = useRef(false);
  useEffect(() => { isStartedRef.current = isStarted; }, [isStarted]);

  const handleFinishRef = useRef(null);

  useEffect(() => {
    let interval = null;
    if (isStarted && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else if (timeLeft === 0 && isStarted) {
      // call through ref so we always get the latest handleFinish
      if (handleFinishRef.current) handleFinishRef.current();
    }
    return () => clearInterval(interval);
  }, [isStarted, timeLeft]);

  // ─── Live WPM (based on strokes) ────────────────────────────────────────────
  useEffect(() => {
    if (timeElapsed > 0) {
      const minutes         = timeElapsed / 60;
      const totalWordsTyped = totalStrokes / 5;
      const gwpm            = Math.round(totalWordsTyped / minutes);
      const penaltyFactor   = pattern?.penalty_value || 1;
      const totalMistakes   = fullErrors + (pattern?.half_mistake_enabled ? halfErrors * 0.5 : halfErrors);
      const penaltyWords    = totalMistakes * penaltyFactor;
      const nwpm            = Math.max(0, Math.round((totalWordsTyped - penaltyWords) / minutes));
      const accuracy        = totalStrokes > 0
        ? Math.round(((totalWordsTyped - totalMistakes) / totalWordsTyped) * 100)
        : 100;
      setStats({ gwpm, nwpm, accuracy });
    }
  }, [timeElapsed, totalStrokes, fullErrors, halfErrors]);

  // ─── Track strokes live ───────────────────────────────────────────────────
  const handleTyping = (e) => {
    const val = e.target.value;
    setTypedText(val);
    setTotalStrokes(val.length); // live stroke count
  };

  const handleKeyDown = (e) => {
    if (!isStarted && e.key !== 'Escape') setIsStarted(true);
  };

  // ─── Normalize a single word: strip punctuation, lowercase ─────────────────
  const normalizeWord = (w) => w.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]/gi, '');

  // ─── Tokenize typed text: split on spaces BUT also split merged words ────────
  // A "merged word" happens when a student forgets a space.
  // We keep the raw words list; normalization handles case/punctuation.
  const tokenize = (text) => text.trim().split(/\s+/).filter(Boolean);

  // ─── Sequential comparison ───────────────────────────────────────────────────
  // Replaces the old LCS approach. Detects where the student started writing
  // (anchor), then matches strictly in the FORWARD direction with a limited
  // look-ahead window — never jumps to a far-later paragraph.
  //
  // Error classification:
  //   full  – omission (untyped ref word), substitution (wrong word), or extra
  //           typed word that has no ref counterpart
  //   half  – ref word matched but only after ignoring case / punctuation
  //
  // "Left" words before the detected start and within skipped omission runs
  // are ALL counted as full errors per the exam rule.
  const compareTexts = useCallback((typed, reference) => {
    const typedWords = tokenize(typed);
    const refWords   = tokenize(reference);
    const typedNorm  = typedWords.map(normalizeWord);
    const refNorm    = refWords.map(normalizeWord);
    const R = refWords.length;
    const T = typedWords.length;

    if (T === 0) return { full: R, half: 0, typedWords, refWords, matchedRef: new Array(R).fill(-1) };
    if (R === 0) return { full: T, half: 0, typedWords, refWords, matchedRef: [] };

    // ── Anchor detection: find nearest forward start position ────────────────
    const ANCHOR_LEN = Math.min(5, T);
    let startRefPos  = 0;
    let bestScore    = 0;

    for (let ri = 0; ri <= R - 1; ri++) {
      let score = 0;
      for (let k = 0; k < ANCHOR_LEN && ri + k < R; k++) {
        if (refNorm[ri + k] === typedNorm[k]) score++;
        else break; // require consecutive run
      }
      if (score > bestScore) {
        bestScore   = score;
        startRefPos = ri;
        if (score === ANCHOR_LEN) break; // perfect match — stop searching
      }
    }
    if (bestScore < 2) startRefPos = 0; // not enough confidence — start from top

    // ── Two-level sequential greedy matching ─────────────────────────────────
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

      // 4. Insertion check: next typed word matches current ref → this is extra
      const nextT = tp + 1 < T ? typedNorm[tp + 1] : null;
      if (nextT !== null && nextT === refNorm[refPos]) {
        // insertion — refPos stays, extra word counted below
      } else {
        matchedRef[refPos] = tp; // substitution
        refPos++;
      }
    }

    // ── Count errors ──────────────────────────────────────────────────────────
    let full = 0, half = 0;
    for (let ri = 0; ri < R; ri++) {
      if (matchedRef[ri] === -1) {
        full++; // omission (includes words before start anchor) = full error
      } else {
        const rawT = typedWords[matchedRef[ri]];
        const rawR = refWords[ri];
        if (rawT === rawR) {
          // exact match → correct
        } else if (typedNorm[matchedRef[ri]] === refNorm[ri]) {
          half++; // case / punctuation only → half error
        } else {
          full++; // completely wrong word substituted → full error
        }
      }
    }
    // Extra typed words (insertions + overflow) → full errors
    const usedTypedIdx = new Set(matchedRef.filter(x => x !== -1));
    for (let ti = 0; ti < T; ti++) {
      if (!usedTypedIdx.has(ti)) full++;
    }

    return { full, half, typedWords, refWords, matchedRef };
  }, []);

  // ─── Finish / Submit ─────────────────────────────────────────────────────
  const handleFinish = useCallback(async () => {
    if (!isStartedRef.current) { navigate('/dashboard'); return; }

    const referenceText = chapter?.content_text || '';
    const { full, half } = compareTexts(typedText, referenceText); // full includes omissions + substitutions + extra words

    const finalStrokes = typedText.length;
    const minutes      = Math.max(timeElapsed, 1) / 60;
    const totalWords   = finalStrokes / 5;
    const gwpm         = Math.round(totalWords / minutes);
    const totalMistakes= full + half * 0.5;
    const nwpm         = Math.max(0, Math.round((totalWords - totalMistakes) / minutes));
    const accuracy     = finalStrokes > 0
      ? Math.max(0, Math.min(100, Math.round(((totalWords - totalMistakes) / totalWords) * 100)))
      : 100;

    const userId = localStorage.getItem('userId');
    const finalData = {
      gwpm, nwpm, accuracy,
      fullErrors: full, halfErrors: half,
      totalStrokes: finalStrokes,
      timeElapsed,
      testDurationMinutes: exam?.test_time_minutes || (chapter?.time_minutes) || Math.floor(timeElapsed / 60) || 10,
      exam_name:  exam?.name || 'Steno Practice',
      date_taken: new Date().toISOString(),
      mode,
      testType,
      typedText,
      referenceText,
    };

    try {
      if (userId) {
        await resultService.saveResult({
          student_id:   userId,
          chapter_id:   chapter?.id,
          exam_id:      exam?.id,
          gwpm, nwpm, accuracy,
          total_errors: full + half * 0.5,
          full_errors:  full,
          half_errors:  half,
          total_strokes: finalStrokes,
          time_elapsed: timeElapsed,
          user_input: typedText,
          reference_words: referenceText ? referenceText.split(/\s+/) : [],
          mode: mode,
          test_type: testType || chapter?.test_type || null,
        });
      }
    } catch (err) { console.error('Save Error:', err); }

    navigate('/result', { state: finalData });
  }, [typedText, chapter, timeElapsed, exam, mode, testType, compareTexts, navigate]);

  // Keep ref in sync with latest handleFinish
  useEffect(() => { handleFinishRef.current = handleFinish; }, [handleFinish]);

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const progressPct = audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0;

  return (
    <div className="steno-engine-layout">
      {/* ── Hidden native audio element ──────────────────────────────────── */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}

      {/* ══════════════════ AUDIO PLAYER MODAL ══════════════════════════════ */}
      {showAudioModal && (
        <div className="steno-modal-overlay">
          <div className="steno-audio-modal">
            <div className="steno-modal-header">
              <span className="steno-modal-icon">🎙</span>
              <h2>Steno Dictation</h2>
              <p className="steno-modal-sub">{exam?.name} — {mode}</p>
            </div>

            <div className="steno-audio-info">
              <span className="steno-chapter-tag">
                Chapter {chapter?.chapter_no}: {chapter?.name || 'Steno Exercise'}
              </span>
              {!audioUrl && (
                <div className="steno-no-audio-warn">
                  ⚠ No audio file attached. Click Skip to proceed to typing.
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="steno-progress-bar-wrap">
              <div className="steno-progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="steno-time-row">
              <span>{formatTime(Math.floor(audioCurrentTime))}</span>
              <span>{audioDuration ? formatTime(Math.floor(audioDuration)) : '--:--'}</span>
            </div>

            {/* Speed Selector */}
            <div className="steno-speed-wrap">
              <span className="steno-speed-label">Dictation Speed:</span>
              <div className="steno-speed-selector">
                {[90, 100, 110].map(s => (
                  <button
                    key={s}
                    className={`steno-speed-btn ${audioSpeed === s ? 'active' : ''}`}
                    onClick={() => handleSpeedChange(s)}
                  >
                    {s} WPM
                  </button>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="steno-controls">
              {!audioPlaying ? (
                <button
                  className="steno-btn steno-btn-play"
                  onClick={handlePlay}
                  disabled={!audioUrl}
                  title={!audioUrl ? 'No audio file' : 'Play dictation'}
                >
                  ▶ Play
                </button>
              ) : (
                <button
                  className="steno-btn steno-btn-pause"
                  onClick={handlePause}
                >
                  ⏸ Pause
                </button>
              )}
              <button
                className="steno-btn steno-btn-skip"
                onClick={handleSkipOrClose}
              >
                ⏭ Skip &amp; Type
              </button>
              <button
                className="steno-btn steno-btn-close"
                onClick={handleSkipOrClose}
              >
                ✕ Close
              </button>
            </div>

            {audioEnded && (
              <div className="steno-audio-done">
                ✔ Audio finished. Click <strong>Skip &amp; Type</strong> to start typing.
              </div>
            )}

            <p className="steno-modal-note">
              Listen carefully and transcribe exactly what you hear. The source text will NOT be shown during the test.
            </p>
          </div>
        </div>
      )}

      {/* Mobile Settings Toggle */}
      <button 
        className="mobile-settings-fab" 
        onClick={() => setMobileSettingsOpen(true)}
        aria-label="Open Info"
      >
        ℹ️
      </button>

      {/* Overlay to close settings on click outside */}
      {mobileSettingsOpen && (
        <div className="mobile-settings-overlay" onClick={() => setMobileSettingsOpen(false)}></div>
      )}

      {/* ══════════════════ TOP BAR ══════════════════════════════════════════ */}
      <div className="steno-topbar">
        <div className="steno-topbar-left">
          <button className="steno-btn-exit" onClick={() => navigate('/dashboard')}>← Exit</button>
          <h2 className="steno-exam-name">
            {exam?.name || 'Steno Practice'} — {mode}
          </h2>
        </div>
        <div className="steno-topbar-center">
          <div className="steno-timer">
            ⏱ Time Left: <strong>{formatTime(timeLeft)}</strong>
          </div>
        </div>
        <div className="steno-topbar-right">
          <div className="steno-live-stats">
            <span>GWPM: <strong>{stats.gwpm}</strong></span>
            <span>NWPM: <strong>{stats.nwpm}</strong></span>
            <span>Acc: <strong>{stats.accuracy}%</strong></span>
          </div>
          <div className="steno-student-badge">
            👤 {localStorage.getItem('name') || localStorage.getItem('username') || 'Student'}
          </div>
        </div>
      </div>

      {/* ══════════════════ MAIN CONTENT ════════════════════════════════════ */}
      <div className="steno-main-content">
        <div className="steno-typing-section">

          {/* Info banner — no source text shown */}
          <div className="steno-hidden-banner">
            <span>🎙</span>
            <div>
              <strong>Steno Mode — Source text is hidden</strong>
              <p>Type what you heard from the audio dictation. The timer started when you dismissed the audio player.</p>
            </div>
            {/* Mini audio replay (after modal closed) */}
            {audioUrl && (
              <button
                className="steno-replay-btn"
                onClick={() => setShowAudioModal(true)}
                title="Reopen audio player"
              >
                🔊 Replay Audio
              </button>
            )}
          </div>

          {/* Blank typing area */}
          <div className="steno-input-wrapper">
            <textarea
              ref={textareaRef}
              className="steno-typing-input"
              value={typedText}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              placeholder="Start typing here..."
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              disabled={timeLeft === 0 || showAudioModal}
            />
          </div>

          {/* Word count live */}
          <div className="steno-wordcount">
            Words typed: <strong>{typedText.trim() ? typedText.trim().split(/\s+/).length : 0}</strong>
            &nbsp;|&nbsp; Strokes: <strong>{typedText.length}</strong>
          </div>
          <button className="steno-btn-submit mobile-only mobile-submit-test" onClick={handleFinish} disabled={!isStarted}>Submit Test</button>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className={`steno-sidebar ${mobileSettingsOpen ? 'open' : ''}`}>
          <div className="steno-protocol-card">
            <h3>Test Info</h3>
            <div className="steno-protocol-item">
              <span>Mode</span>
              <strong>{mode}</strong>
            </div>
            <div className="steno-protocol-item">
              <span>Chapter</span>
              <strong>{chapter?.chapter_no}</strong>
            </div>
            <div className="steno-protocol-item">
              <span>Target Speed</span>
              <strong>{pattern?.required_speed || 80} WPM</strong>
            </div>
            <div className="steno-protocol-item">
              <span>Half Mistakes</span>
              <strong>{pattern?.half_mistake_enabled ? 'Counted' : 'Ignored'}</strong>
            </div>
            <div className="steno-protocol-item">
              <span>Time Limit</span>
              <strong>{exam?.test_time_minutes || 10} min</strong>
            </div>
          </div>

          <div className="steno-audio-mini-card">
            <h3>🎙 Audio</h3>
            {audioUrl ? (
              <button
                className="steno-btn steno-btn-replay-mini"
                onClick={() => setShowAudioModal(true)}
              >
                Reopen Audio Player
              </button>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No audio attached</p>
            )}
          </div>

          <button
            className="steno-btn-submit desktop-only"
            onClick={handleFinish}
            disabled={!isStarted}
          >
            Submit Test
          </button>
          <button className="btn-close-settings-mobile mobile-only" onClick={() => setMobileSettingsOpen(false)}>Close Info Panel</button>
        </div>
      </div>
    </div>
  );
};

export default StenoTestEngine;
