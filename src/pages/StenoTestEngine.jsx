import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { resultService, settingService } from '../services/api';
import { API_BASE_URL } from '../config';
import { fontFamilyForHindiType, fontGroupForHindiType } from '../utils/hindiFonts';
import { matchContractions, matchAlternateForms } from '../utils/stenoAlternateForms';
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

// Strip trailing /api so relative /uploads/... paths can be prepended with the host.
const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const assetsBase = API_BASE_URL.replace(/\/api\/?$/, '');
  return url.startsWith('/') ? `${assetsBase}${url}` : url;
};

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

  // Live Steno tests need an internet connection and must NOT expose the passage
  // text or allow audio download. Pre-loaded (practice) tests support both.
  const isLiveTest   = (testType || chapter?.test_type || '').toLowerCase().includes('live');
  const isPreloaded  = !isLiveTest;

  // ─── Font for Hindi Steno chapters ────────────────────────────────────────────
  // Admin-selected Hindi font (Mangal / Kruti Dev / Remington). The student types
  // and the result renders in this exact font. English steno → undefined (default).
  const hindiFontType    = chapter?.hindi_font_type || null;
  const stenoFontFamily  = fontFamilyForHindiType(hindiFontType);
  // Resolved font_group string so the result screen's existing font logic applies.
  const resolvedFontGroup = fontGroupForHindiType(hindiFontType);

  // ─── Dictation speed ─────────────────────────────────────────────────────────
  // The admin sets a default speed (WPM) per Steno chapter. The student picks one of
  // three values centred on it (default-10 / default / default+10). The audio's native
  // recording corresponds to the default speed, so playback is scaled by selected/default
  // (the default plays at normal 1.0×). Legacy chapters with no steno_speed fall back to
  // 100, preserving the original 90/100/110 behaviour exactly.
  const defaultSpeed  = Number(chapter?.steno_speed) || 100;
  const speedOptions  = [defaultSpeed - 10, defaultSpeed, defaultSpeed + 10];

  // ─── Audio state ────────────────────────────────────────────────────────────
  const audioRef           = useRef(null);
  const [showAudioModal, setShowAudioModal]   = useState(true);
  const [audioPlaying, setAudioPlaying]       = useState(false);
  const [audioDuration, setAudioDuration]     = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioEnded, setAudioEnded]           = useState(false);
  // Selected dictation speed (WPM); starts at the admin-selected default.
  const [audioSpeed, setAudioSpeed]           = useState(defaultSpeed);

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
  // Font size (px) of the typing area — adjustable via the A- / A+ controls.
  const [fontSize, setFontSize] = useState(Math.max(14, exam?.font_size_user_screen || 18));

  // Block all clipboard operations (copy / cut / paste / text drop) during the
  // dictation test — pasting a transcript would defeat the examination.
  useEffect(() => {
    const blockClipboard = (e) => e.preventDefault();
    document.addEventListener('copy',  blockClipboard, true);
    document.addEventListener('cut',   blockClipboard, true);
    document.addEventListener('paste', blockClipboard, true);
    document.addEventListener('drop',  blockClipboard, true);
    return () => {
      document.removeEventListener('copy',  blockClipboard, true);
      document.removeEventListener('cut',   blockClipboard, true);
      document.removeEventListener('paste', blockClipboard, true);
      document.removeEventListener('drop',  blockClipboard, true);
    };
  }, []);

  // ─── Passage (Text/PDF) view + offline-audio download state ──────────────────
  const [showPassageModal, setShowPassageModal] = useState(false);
  // idle | downloading | saved | nofile | error
  const [audioDownloadStatus, setAudioDownloadStatus] = useState('idle');

  // Institute branding (name + logo) stamped on the downloaded passage PDF. Fetched
  // once, best-effort — if offline or unset, the passage still downloads without it.
  const [instituteBrand, setInstituteBrand] = useState({ name: '', logoUrl: '' });
  useEffect(() => {
    settingService.getAll()
      .then((all) => setInstituteBrand({
        name: all?.institute_name || '',
        logoUrl: all?.institute_logo_url || '',
      }))
      .catch(() => {/* offline or not configured — passage downloads without branding */});
  }, []);
  // Brief "processing result" screen shown for 2s after submit before the result.
  const [isProcessing, setIsProcessing] = useState(false);

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
    audioRef.current.playbackRate = audioSpeed / defaultSpeed;
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

  // Jump to a specific point in the audio — click/drag anywhere on the progress bar.
  const handleSeek = (e) => {
    if (!audioRef.current || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * audioDuration;
    audioRef.current.currentTime = newTime;
    setAudioCurrentTime(newTime);
    if (audioEnded && newTime < audioDuration) setAudioEnded(false);
  };

  // ±5s skip buttons for fine-grained forward/backward control.
  const handleSkipSeconds = (delta) => {
    if (!audioRef.current || !audioDuration) return;
    const newTime = Math.min(audioDuration, Math.max(0, audioRef.current.currentTime + delta));
    audioRef.current.currentTime = newTime;
    setAudioCurrentTime(newTime);
    if (audioEnded && newTime < audioDuration) setAudioEnded(false);
  };

  const handleSpeedChange = (speed) => {
    setAudioSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed / defaultSpeed;
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

  // ─── Passage Text / PDF view (pre-loaded practice tests only) ─────────────────
  const escapeHtml = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Build a self-contained printable page for the dictated passage. The Electron
  // print dialog (and the browser fallback) both offer "Save as PDF", so this one
  // action covers both "download as PDF" and "print".
  const buildPassageHtml = () => {
    let cssText = '';
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules || []).forEach(rule => { cssText += rule.cssText + '\n'; });
        } catch (_) { /* cross-origin sheet — skip */ }
      });
    } catch (_) { /* ignore */ }
    const passage = chapter?.content_text || '';
    const fontCss = stenoFontFamily ? `font-family: ${stenoFontFamily};` : '';
    const title = `${exam?.name || 'Steno Practice'} — Chapter ${chapter?.chapter_no ?? ''}`;
    const instituteLogo = resolveAssetUrl(instituteBrand.logoUrl);
    const brandHeader = (instituteBrand.name || instituteLogo)
      ? `<div class="brand-header">
           ${instituteLogo ? `<img src="${escapeHtml(instituteLogo)}" alt="" class="brand-logo" />` : ''}
           ${instituteBrand.name ? `<span class="brand-name">${escapeHtml(instituteBrand.name)}</span>` : ''}
         </div>`
      : '';
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; color: #111; font-family: 'Times New Roman', Times, serif; padding: 32px 40px; }
  ${cssText}
  .brand-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #ccc; }
  .brand-logo { width: 44px; height: 44px; object-fit: contain; }
  .brand-name { font-size: 18px; font-weight: 700; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #555; font-size: 13px; margin-bottom: 18px; }
  .passage { ${fontCss} white-space: pre-wrap; font-size: 18px; line-height: 1.9; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
</style></head>
<body>
  ${brandHeader}
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Dictation Passage${mode ? ` · ${escapeHtml(mode)}` : ''}</div>
  <div class="passage">${escapeHtml(passage)}</div>
</body></html>`;
  };

  const handlePrintPassage = () => {
    const html = buildPassageHtml();
    if (window.electronAPI?.printResult) {
      window.electronAPI.printResult(html).catch((err) => {
        console.error('Electron print error:', err);
        openPrintWindow(html);
      });
    } else {
      openPrintWindow(html);
    }
  };

  const openPrintWindow = (html) => {
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups to print or save the passage.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch (_) {} }, 300);
  };

  // ─── Download dictation audio for offline use (pre-loaded tests only) ─────────
  const handleDownloadAudioOffline = async () => {
    if (!chapter?.id) return;
    if (!window.electronAPI?.saveAudio) {
      // Browser build can't persist files locally — caching needs the desktop app.
      setAudioDownloadStatus('error');
      return;
    }
    try {
      if (window.electronAPI.hasAudio) {
        const { exists } = await window.electronAPI.hasAudio(chapter.id);
        if (exists) { setAudioDownloadStatus('saved'); return; }
      }
      if (!navigator.onLine) { setAudioDownloadStatus('error'); return; }
      setAudioDownloadStatus('downloading');
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/chapters/${chapter.id}/audio`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { setAudioDownloadStatus('nofile'); return; }
      const blob = await res.blob();
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await window.electronAPI.saveAudio(chapter.id, base64);
      setAudioDownloadStatus('saved');
    } catch (err) {
      console.error('[Offline Audio] download failed:', err);
      setAudioDownloadStatus('error');
    }
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
      // "Count Half Mistake" = Yes → 0.5 each; No → each counts as 1 full mistake.
      const totalMistakes   = fullErrors + halfErrors * ((pattern?.half_mistake_enabled ?? true) ? 0.5 : 1);
      // Net speed is in WORDS, so the penalty must be in WORDS. A stroke-denominated
      // penalty is converted ÷5 (5 strokes = 1 word); a word-denominated one is used as-is.
      const penaltyWords    = (pattern?.penalty_type === 'Stroke' ? totalMistakes / 5 : totalMistakes) * penaltyFactor;
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
  // Bipartite alignment per SSC PDF evaluation rules + the "Accepted Alternate
  // Forms" guideline:
  //   Pass 1  – exact normalized match (case/punct stripped)
  //   Pass 1b – accepted alternate forms (contractions, titles, spelling
  //             variations) — NOT counted as an error per the guideline
  //   Pass 2  – spelling match via Levenshtein (PDF 2a: wrong spelling = half)
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
    const isAltForm  = new Array(R).fill(false);

    // Pass 1: exact normalized match
    for (let ri = 0; ri < R; ri++) {
      for (let ti = 0; ti < T; ti++) {
        if (!usedTyped.has(ti) && typedNorm[ti] === refNorm[ri]) {
          matchedRef[ri] = ti; usedTyped.add(ti); break;
        }
      }
    }

    // Pass 1b: accepted alternate forms — contractions (e.g. "do not" ↔
    // "don't"), titles (e.g. "Dr." ↔ "Doctor") and spelling variations
    // (e.g. "Honour" ↔ "Honor"). Must run before Pass 2 so a legitimate
    // alternate spelling isn't instead flagged as a fuzzy spelling mistake.
    matchContractions(refNorm, typedNorm, matchedRef, isAltForm, usedTyped);
    matchAlternateForms(refNorm, typedNorm, matchedRef, isAltForm, usedTyped);

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
      } else if (isAltForm[ri]) {
        // accepted alternate form — not counted as an error
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
    // "Count Half Mistake" = Yes → 0.5 each; No → each counts as 1 full mistake.
    const totalMistakes   = full + half * ((pattern?.half_mistake_enabled ?? true) ? 0.5 : 1);
    // Ignorable Mistakes rule: mistakes up to (pct)% of total words typed are free;
    // each mistake beyond that allowance deducts (deductionPerMistake) words.
    const ignorableEnabled = !!pattern?.ignorable_mistakes_enabled;
    const ignorablePct     = ignorableEnabled
      ? Math.max(0, Math.min(100, pattern?.ignorable_mistakes_percent ?? 0)) : 0;
    const deductionPerMistake = pattern?.ignorable_penalty_words_per_mistake ?? 10;
    const ignorableAllowance  = ignorableEnabled ? totalWords * (ignorablePct / 100) : 0;
    const excessMistakes      = ignorableEnabled ? Math.max(0, totalMistakes - ignorableAllowance) : 0;
    const penaltyWords    = ignorableEnabled
      ? excessMistakes * deductionPerMistake
      // Net speed is in WORDS, so the penalty must be in WORDS too.
      // Stroke-denominated penalty → convert to words (1 word = 5 strokes).
      : penaltyType === 'Stroke'
        ? totalMistakes * penaltyFactor / 5
        // Word-denominated penalty is already in words → use directly.
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
      ignorable_mistakes_enabled: pattern.ignorable_mistakes_enabled ?? false,
      ignorable_mistakes_percent: pattern.ignorable_mistakes_percent ?? 0,
      ignorable_penalty_words_per_mistake: pattern.ignorable_penalty_words_per_mistake ?? 10,
      count_omissions_as_errors: pattern.count_omissions_as_errors ?? true,
      hindi_font_type:          hindiFontType,
    } : { hindi_font_type: hindiFontType };

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
      // Resolved font group + raw type so the result renders in the selected Hindi font.
      fontGroup:   resolvedFontGroup || mode,
      hindiFontType,
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

    // Show a brief "processing result" screen for 2s, then go to the result.
    setIsProcessing(true);
    setTimeout(() => navigate('/result', { state: finalData }), 2000);
  }, [typedText, chapter, timeElapsed, exam, mode, testType, pattern, compareTexts, navigate]);

  // Keep ref in sync with latest handleFinish
  useEffect(() => { handleFinishRef.current = handleFinish; }, [handleFinish]);

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const progressPct = audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0;

  if (isProcessing) return (
    <div className="test-processing-overlay">
      <div className="test-processing-spinner" />
      <div className="test-processing-title">Processing your result…</div>
      <div className="test-processing-sub">Please wait while we evaluate your dictation.</div>
    </div>
  );

  return (
    <div className="steno-engine-layout">
      {/* ── Hidden native audio element ──────────────────────────────────── */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}

      {/* ══════════════════ PASSAGE TEXT / PDF MODAL ════════════════════════ */}
      {showPassageModal && (
        <div className="steno-modal-overlay" onClick={() => setShowPassageModal(false)}>
          <div
            className="steno-audio-modal"
            style={{ maxWidth: '780px', width: '92%', textAlign: 'left' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="steno-modal-header">
              <span className="steno-modal-icon">📄</span>
              <h2>Dictation Passage</h2>
              <p className="steno-modal-sub">{exam?.name || 'Steno Practice'} — Chapter {chapter?.chapter_no}</p>
            </div>

            <div
              style={{
                maxHeight: '50vh', overflowY: 'auto', textAlign: 'left',
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '16px 18px', margin: '12px 0', whiteSpace: 'pre-wrap',
                fontSize: '1.05rem', lineHeight: 1.9, color: '#0f172a',
                ...(stenoFontFamily ? { fontFamily: stenoFontFamily } : {}),
              }}
            >
              {chapter?.content_text || 'No passage text is available for this test.'}
            </div>

            <div className="steno-controls">
              <button className="steno-btn steno-btn-play" onClick={handlePrintPassage} title="Download this passage as a PDF">
                ⬇ Download PDF
              </button>
              <button className="steno-btn steno-btn-close" onClick={() => setShowPassageModal(false)}>
                ✕ Close
              </button>
            </div>

            <p className="steno-modal-note">
              Use this to review the passage during practice. Click <strong>Download PDF</strong> —
              in the print dialog that opens, choose <strong>“Save as PDF”</strong> to download it
              (or “Print” to print it directly). Not available for Live Steno tests.
            </p>
          </div>
        </div>
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

            {/* Progress bar — click/drag anywhere to seek */}
            <div
              className="steno-progress-bar-wrap"
              onClick={handleSeek}
              role="slider"
              aria-label="Seek audio"
              aria-valuemin={0}
              aria-valuemax={Math.floor(audioDuration) || 0}
              aria-valuenow={Math.floor(audioCurrentTime)}
              style={{ cursor: audioUrl ? 'pointer' : 'default' }}
            >
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
                {speedOptions.map(s => (
                  <button
                    key={s}
                    className={`steno-speed-btn ${audioSpeed === s ? 'active' : ''}`}
                    onClick={() => handleSpeedChange(s)}
                    title={s === defaultSpeed ? 'Default speed set by admin' : `${s > defaultSpeed ? 'Faster' : 'Slower'} than default`}
                  >
                    {s} WPM{s === defaultSpeed ? ' (Default)' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="steno-controls">
              <button
                className="steno-btn steno-btn-seek"
                onClick={() => handleSkipSeconds(-5)}
                disabled={!audioUrl}
                title="Back 5 seconds"
              >
                ⏪ 5s
              </button>
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
                className="steno-btn steno-btn-seek"
                onClick={() => handleSkipSeconds(5)}
                disabled={!audioUrl}
                title="Forward 5 seconds"
              >
                5s ⏩
              </button>
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
              style={{ fontSize: `${fontSize}px`, ...(stenoFontFamily ? { fontFamily: stenoFontFamily } : {}) }}
            />
          </div>

          {/* Word count live + font size controls */}
          <div className="steno-wordcount" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <span>
              Words typed: <strong>{typedText.trim() ? typedText.trim().split(/\s+/).length : 0}</strong>
              &nbsp;|&nbsp; Strokes: <strong>{typedText.length}</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Font Size:</span>
              <button type="button" onClick={() => setFontSize(f => Math.max(10, f - 2))} style={{ padding: '3px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer', fontWeight: 700 }}>A-</button>
              <strong style={{ minWidth: '22px', textAlign: 'center' }}>{fontSize}</strong>
              <button type="button" onClick={() => setFontSize(f => f + 2)} style={{ padding: '3px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer', fontWeight: 700 }}>A+</button>
            </span>
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
              <strong>{pattern?.half_mistake_enabled ? 'Counted (0.5)' : 'Counted as Full (1)'}</strong>
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

            {/* Offline audio download — pre-loaded practice tests only */}
            {isPreloaded && (
              <>
                <button
                  className="steno-btn steno-btn-replay-mini"
                  style={{ marginTop: '8px', background: audioDownloadStatus === 'saved' ? '#16a34a' : undefined }}
                  onClick={handleDownloadAudioOffline}
                  disabled={audioDownloadStatus === 'downloading'}
                  title="Save this dictation audio on your computer so the test works offline"
                >
                  {audioDownloadStatus === 'downloading' ? 'Downloading…'
                    : audioDownloadStatus === 'saved' ? '✓ Audio Saved Offline'
                    : '⬇ Download Audio for Offline'}
                </button>
                {audioDownloadStatus === 'nofile' && (
                  <p style={{ color: '#b45309', fontSize: '0.78rem', marginTop: '6px' }}>No audio file is attached to this test.</p>
                )}
                {audioDownloadStatus === 'error' && (
                  <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '6px' }}>Could not save audio. Connect to the internet and use the desktop app.</p>
                )}
              </>
            )}
          </div>

          {/* Passage Text / PDF view — pre-loaded practice tests only */}
          {isPreloaded && (
            <div className="steno-audio-mini-card">
              <h3>📄 Passage</h3>
              <button
                className="steno-btn steno-btn-replay-mini"
                onClick={() => setShowPassageModal(true)}
                title="View the dictated passage as text; print or save it as a PDF"
              >
                View Passage (Text / PDF)
              </button>
            </div>
          )}

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
