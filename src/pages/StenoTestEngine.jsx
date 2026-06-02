import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { resultService } from '../services/api';
import { API_BASE_URL } from '../config';
import './StenoTestEngine.css';

// ─── Steno error-classification helpers (module-level, pure functions) ────────
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
// PDF 2a: wrong spelling → half mistake
const _isSpellingErr = (r, t) => {
  if (r === t || r.length < 4 || t.length < 4 || Math.abs(r.length - t.length) > 3) return false;
  const d = _lev(r, t);
  return d <= 2 && d / Math.max(r.length, t.length) <= 0.30;
};
// PDF 1h: all-caps word → full mistake
const _isAllCaps = (w) => { const l = w.replace(/[^a-zA-Z]/g, ''); return l.length > 1 && l === l.toUpperCase(); };

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

  // ─── Audio URL resolution (with offline caching) ─────────────────────────────
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState(null);
  const blobUrlRef = useRef(null); // track for cleanup

  const base64ToBlob = (base64, mime) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  const downloadAndCacheAudio = async (chapterId, serverUrl) => {
    if (!window.electronAPI?.saveAudio) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(serverUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) return;
      const blob = await res.blob();
      await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          await window.electronAPI.saveAudio(chapterId, base64);
          resolve();
        };
        reader.readAsDataURL(blob);
      });
      console.log('[Audio Cache] Downloaded and saved for chapter', chapterId);
    } catch (err) {
      console.warn('[Audio Cache] Download failed:', err.message);
    }
  };

  useEffect(() => {
    if (!chapter?.id) return;
    const serverUrl = `${API_BASE_URL}/chapters/${chapter.id}/audio`;

    const resolveAudio = async () => {
      if (window.electronAPI?.hasAudio) {
        // Electron path — check local cache first
        const { exists } = await window.electronAPI.hasAudio(chapter.id);
        if (exists) {
          const { base64 } = await window.electronAPI.getAudio(chapter.id);
          const blob = base64ToBlob(base64, 'audio/mpeg');
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setResolvedAudioUrl(url);
          if (navigator.onLine) downloadAndCacheAudio(chapter.id, serverUrl); // refresh cache in bg
          return;
        }
        // Not cached yet
        if (navigator.onLine) {
          setResolvedAudioUrl(serverUrl);
          downloadAndCacheAudio(chapter.id, serverUrl); // cache in background
        } else {
          setResolvedAudioUrl(null); // no audio available offline
        }
      } else {
        // Browser / non-Electron fallback
        setResolvedAudioUrl(navigator.onLine ? serverUrl : null);
      }
    };

    resolveAudio();
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, [chapter?.id]);

  const audioUrl = resolvedAudioUrl;

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
    if (!audioUrl) {
      alert('Audio is not available offline. Please connect to the internet and open this test again to download the audio.');
      return;
    }
    if (!audioRef.current) return;
    audioRef.current.playbackRate = audioSpeed / 100;
    audioRef.current.play().then(() => {
      setAudioPlaying(true);
    }).catch((err) => {
      console.error('Audio play failed:', audioUrl, err);
      alert('Audio could not be played. The file may still be loading.');
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
      const totalMistakes   = fullErrors + halfErrors * 0.5;
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

  // ─── Bipartite word matching for Steno ──────────────────────────────────────
  // Two-pass bipartite alignment per SSC PDF evaluation rules:
  //   Pass 1 – exact normalized match (case/punct stripped)
  //   Pass 2 – spelling match via Levenshtein (PDF 2a: wrong spelling = half)
  //
  // Error classification:
  //   fullErrors – omission (PDF 1a) · addition (PDF 1c) · all-caps (PDF 1h)
  //   halfErrors – spelling (PDF 2a) · case/punct (PDF 2c/d/e)
  const compareTexts = useCallback((typed, reference) => {
    const typedWords = tokenize(typed);
    const refWords   = tokenize(reference);
    const typedNorm  = typedWords.map(normalizeWord);
    const refNorm    = refWords.map(normalizeWord);
    const R = refWords.length;
    const T = typedWords.length;

    if (T === 0) return { fullErrors: R, halfErrors: 0 };
    if (R === 0) return { fullErrors: T, halfErrors: 0 };

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

    // Pass 2: spelling match for unmatched reference words (PDF 2a)
    for (let ri = 0; ri < R; ri++) {
      if (matchedRef[ri] !== -1) continue;
      for (let ti = 0; ti < T; ti++) {
        if (!usedTyped.has(ti) && _isSpellingErr(refNorm[ri], typedNorm[ti])) {
          matchedRef[ri] = ti; isSpell[ri] = true; usedTyped.add(ti); break;
        }
      }
    }

    let fullErrors = 0, halfErrors = 0;

    for (let ri = 0; ri < R; ri++) {
      const ti = matchedRef[ri];
      if (ti === -1) {
        fullErrors++; // omission (PDF 1a)
      } else if (isSpell[ri]) {
        halfErrors++; // spelling error (PDF 2a)
      } else {
        const rawT = typedWords[ti], rawR = refWords[ri];
        if (rawT !== rawR) {
          if (_isAllCaps(rawT)) fullErrors++; // all-caps (PDF 1h)
          else halfErrors++;                  // case/punct (PDF 2c/d/e)
        }
        // rawT === rawR → correct
      }
    }

    // Unmatched typed words → additions (PDF 1c: full error)
    for (let ti = 0; ti < T; ti++) {
      if (!usedTyped.has(ti)) fullErrors++;
    }

    return { fullErrors, halfErrors };
  }, []);

  // ─── Finish / Submit ─────────────────────────────────────────────────────
  const handleFinish = useCallback(async () => {
    if (!isStartedRef.current) { navigate('/dashboard'); return; }

    const referenceText = chapter?.content_text || '';
    const { fullErrors: full, halfErrors: half } = compareTexts(typedText, referenceText);

    const finalStrokes    = typedText.length;
    const elapsed         = Math.max(timeElapsed, 1);
    const minutes         = elapsed / 60;

    // ── Pattern-driven speed calculation ──────────────────────────────────────
    const speedCount      = pattern?.speed_count ?? 'Strokes';
    const typedWordCount  = typedText.trim() ? typedText.trim().split(/\s+/).filter(Boolean).length : 0;
    const totalWords      = speedCount === 'Words' ? typedWordCount : finalStrokes / 5;

    // ── Pattern-driven penalty ─────────────────────────────────────────────────
    const penaltyFactor   = pattern?.penalty_value ?? 1;
    const penaltyType     = pattern?.penalty_type  ?? 'Word';
    const totalMistakes   = full + half * 0.5;
    const penaltyWords    = penaltyType === 'Stroke'
      ? (totalMistakes * 5 / 5) * penaltyFactor
      : totalMistakes * penaltyFactor;

    const gwpm     = Math.round(totalWords / minutes);
    const nwpm     = Math.max(0, Math.round((totalWords - penaltyWords) / minutes));
    // Accuracy = NWPM / GWPM × 100  (standard formula)
    const accuracy = gwpm > 0
      ? Math.max(0, Math.min(100, Math.round((nwpm / gwpm) * 100)))
      : 100;

    // ── Build pattern snapshot to pass to ResultScreen ────────────────────────
    const patternData = pattern ? {
      name:                     pattern.name || null,
      half_mistake_enabled:     pattern.half_mistake_enabled,
      penalty_type:             pattern.penalty_type,
      penalty_value:            pattern.penalty_value,
      speed_count:              pattern.speed_count,
      qualify_on:               pattern.qualify_on,
      required_speed:           pattern.required_speed,
      required_accuracy:        pattern.required_accuracy,
      show_half_mistakes:       pattern.show_half_mistakes,
      show_full_mistakes:       pattern.show_full_mistakes,
      show_total_strokes:       pattern.show_total_strokes,
      show_total_words:         pattern.show_total_words,
      show_total_errors:        pattern.show_total_errors,
      show_correct_words:       pattern.show_correct_words,
      show_gross_speed:         pattern.show_gross_speed,
      show_net_speed:           pattern.show_net_speed,
      show_accuracy:            pattern.show_accuracy,
      show_penalty_words:       pattern.show_penalty_words,
      show_ignorable_mistakes:  pattern.show_ignorable_mistakes,
      count_omissions_as_errors: pattern.count_omissions_as_errors ?? true,
    } : null;

    const userId   = localStorage.getItem('userId');
    const finalData = {
      gwpm, nwpm, accuracy,
      fullErrors:  full,
      halfErrors:  half,
      totalStrokes: finalStrokes,
      timeElapsed,
      testDurationMinutes: exam?.test_time_minutes || chapter?.time_minutes || Math.floor(elapsed / 60) || 10,
      exam_name:   exam?.name || 'Steno Practice',
      chapter_no:  chapter?.chapter_no || null,
      date_taken:  new Date().toISOString(),
      mode,
      testType,
      typedText,
      referenceText,
      originalPassage: referenceText,   // full passage for the "Original Passage" column
      userInput:   typedText,   // needed by ResultScreen for Words speed-count mode
      pattern:     patternData,
    };

    try {
      if (userId && navigator.onLine) {
        await resultService.saveResult({
          student_id:    userId,
          chapter_id:    chapter?.id,
          exam_id:       exam?.id,
          gwpm, nwpm, accuracy,
          total_errors:  Math.round(totalMistakes),
          full_errors:   full,
          half_errors:   half,
          total_strokes: finalStrokes,
          time_elapsed:  elapsed,
          user_input:    typedText,
          reference_words: referenceText ? referenceText.split(/\s+/) : [],
          mode,
          test_type:     testType || chapter?.test_type || null,
          pattern_data:  patternData,
        });
      } else if (!navigator.onLine) {
        console.log('[Result Save] Offline — skipping DB save for preloaded steno test.');
      }
    } catch (err) { console.error('Save Error:', err); }

    navigate('/result', { state: finalData });
  }, [typedText, chapter, timeElapsed, exam, mode, testType, pattern, compareTexts, navigate]);

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
