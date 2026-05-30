import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { chapterService, resultService, getCurrentUserUuid, userService } from '../services/api';
import { API_BASE_URL } from '../config';
import './TestEngine.css';



const TestEngine = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { exam, chapter: passedChapter, mode, testType, isSelfAssessment } = location.state || {};

  const isStrictMode = !!exam;
  const pattern = exam?.result_pattern || location.state?.resultPattern || null;
  const screenType = exam?.screen_type?.replace(' ', '-') || 'Screen-1';

  // TCS Screen 5: cycling interface state (1, 2, or 3)
  const [tcsInterface, setTcsInterface] = useState(1);
  const cycleTcsInterface = () => setTcsInterface(prev => (prev % 3) + 1);

  // ─── Hindi Mode Detection ────────────────────────────────────────────────────
  const [selfAssessmentFont, setSelfAssessmentFont] = useState('English Typing');
  const activeMode = isSelfAssessment ? selfAssessmentFont : mode;

  const isKrutiDev  = activeMode === 'Hindi Kruti Dev';
  const isMangal    = activeMode === 'Hindi Mangal';
  const isRemington = activeMode === 'Hindi Remington (GAIL)' || activeMode === 'Hindi Remington';

  const hindiFontFamily = (isKrutiDev || isRemington)
    ? `'Kruti Dev 010'`
    : isMangal
      ? `'Noto Sans Devanagari', 'Mangal', 'Arial Unicode MS', sans-serif`
      : 'inherit';

  const [settings, setSettings] = useState({
    fontSize: Math.max(14, exam?.font_size_user_screen || 20),
    testFontSize: Math.max(14, exam?.font_size_test_screen || 20),
    sameSize: (exam?.font_size_user_screen || 20) === (exam?.font_size_test_screen || 20),
    highlightWord: exam ? exam.highlight_word : true,
    highlightError: exam ? exam.highlight_error : true,
    autoScroll: exam ? exam.auto_scroll : true,
    highlightColor: exam?.highlight_color || 'yellow',
    paperMode: exam?.test_paper_screen === 'Paper',
    backspaceControl: exam?.backspace_control || 'Full Backspace',
  });

  const [timeLeft, setTimeLeft] = useState(exam?.test_time_minutes * 60 || (passedChapter?.time_minutes ?? 10) * 60);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [chapter, setChapter] = useState(passedChapter || (isSelfAssessment ? { name: 'Self Assessment', content_text: '', time_minutes: 15 } : null));
  const [loading, setLoading] = useState(!passedChapter && !isSelfAssessment);

  const [userInput, setUserInput] = useState('');
  const [words, setWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wordStatuses, setWordStatuses] = useState([]);

  const [fullErrors, setFullErrors] = useState(0);
  const [halfErrors, setHalfErrors] = useState(0);
  const [stats, setStats] = useState({ gwpm: 0, nwpm: 0, accuracy: 100 });
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseCount, setPauseCount] = useState(0);
  const MAX_PAUSES = 3;
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [s6ShowText, setS6ShowText] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  // Fetch profile image once on mount — used in screens that have a photo provision
  useEffect(() => {
    userService.getProfile()
      .then(data => {
        if (data?.profile_image) {
          const url = data.profile_image.startsWith('http')
            ? data.profile_image
            : `${API_BASE_URL}${data.profile_image}`;
          setProfileImageUrl(url);
        }
      })
      .catch(() => {});
  }, []);

  // Mangal IME: track composition state to avoid double-firing on IME confirm
  const isComposingRef = useRef(false);
  const scrollRef = useRef([]);
  const maxLockedIndexRef = useRef(0);
  const s4InputRef = useRef(null);
  // Stores the original (pre-re-type-extension) passage word count so repeat
  // detection in handleFinish is limited to within the original passage only.
  const baseWordCountRef = useRef(0);

  useEffect(() => {
    maxLockedIndexRef.current = 0;
  }, [settings.backspaceControl]);

  // ─── Fullscreen tracking ───────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ─── Chapter Initialisation ────────────────────────────────────────────────
  useEffect(() => {
    if (passedChapter) initChapter(passedChapter);
    else fetchFallbackChapter();
  }, [passedChapter]);

  const initChapter = (c) => {
    if (!c) { setLoading(false); return; }
    setChapter(c);
    const text = c.content_text || '';
    let splitWords = text.trim() ? text.trim().split(/\s+/) : [];
    const speedCount = pattern?.speed_count ?? 'Words';

    // Industry-standard: 5 keystrokes = 1 word.
    // When the exam is configured in Strokes mode, both max and required counts
    // are in strokes; convert to words for the reference word list.
    const toWords = (count) => speedCount === 'Strokes' ? Math.ceil(count / 5) : count;

    // ── Step 1: max_words_strokes — cap the SOURCE content ─────────────────────
    // "Maximum word will show in result from the uploaded texts"
    // Applied FIRST so repetition in step 2 uses the already-capped base.
    const maxCap = exam?.max_words_strokes || 0;
    if (maxCap > 0) {
      const maxWords = toWords(maxCap);
      if (splitWords.length > maxWords) splitWords = splitWords.slice(0, maxWords);
    }

    // ── Step 2: no_of_words_strokes — required count ────────────────────────────
    // "Required words student must type; if missed, each counts as full error"
    // Extend the reference via repetition if content is shorter; trim if longer.
    const requiredCount = exam?.no_of_words_strokes || 0;
    if (requiredCount > 0 && splitWords.length > 0) {
      const requiredWords = toWords(requiredCount);
      if (splitWords.length < requiredWords) {
        const base = [...splitWords];
        while (splitWords.length < requiredWords) splitWords = splitWords.concat(base);
        splitWords = splitWords.slice(0, requiredWords);
      } else {
        splitWords = splitWords.slice(0, requiredWords);
      }
    }

    // ── Step 3: TEST RE-TYPE — extend words by looping content to fill the full test time ──
    // When enabled the passage repeats continuously so the student keeps typing until
    // time runs out. Extend to 200 WPM × test_time_minutes so even the fastest typist
    // never runs out of words mid-test.
    baseWordCountRef.current = splitWords.length; // save pre-extension length for repeat detection
    if (exam?.test_re_type && splitWords.length > 0) {
      const testMinutes = exam.test_time_minutes || 10;
      const targetWords = Math.ceil(200 * testMinutes);
      const base = [...splitWords];
      while (splitWords.length < targetWords) splitWords = splitWords.concat(base);
    }

    setWords(splitWords);
    setWordStatuses(new Array(splitWords.length).fill('pending'));
    setLoading(false);
  };

  const fetchFallbackChapter = async () => {
    try {
      const data = await chapterService.getChapters('English Typing');
      if (data && data.length > 0) {
        initChapter(data[0]);
      } else {
        initChapter({ content_text: 'Dummy chapter content. No chapters found in DB.', font_group: 'English Typing' });
      }
    } catch (err) {
      console.error('Error fetching chapter:', err);
      initChapter({ content_text: 'Error loading chapter.', font_group: 'English Typing' });
    }
  };

  // ─── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let interval = null;
    if (isStarted && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else if (timeLeft === 0 && isStarted) {
      handleFinish();
    }
    return () => clearInterval(interval);
  }, [isStarted, isPaused, timeLeft]);

  // ─── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (settings.autoScroll && scrollRef.current[currentWordIndex]) {
      scrollRef.current[currentWordIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentWordIndex, settings.autoScroll]);

  // ─── Live WPM Calculation ───────────────────────────────────────────────────
  useEffect(() => {
    if (timeElapsed > 0) {
      const minutes = timeElapsed / 60;
      const totalWordsTyped = totalStrokes / 5;
      const gwpm = Math.round(totalWordsTyped / minutes);
      const halfMistakeEnabled = pattern?.half_mistake_enabled || false;
      const penaltyFactor = pattern?.penalty_value || 1;
      const totalMistakes = fullErrors + halfErrors * 0.5;
      const penaltyWords = (pattern?.penalty_type === 'Stroke' ? totalMistakes / 5 : totalMistakes) * penaltyFactor;
      const nwpm = Math.max(0, Math.round((totalWordsTyped - penaltyWords) / minutes));
      // Accuracy = (NWPM / GWPM) × 100  [standard typing test formula]
    const accuracy = gwpm > 0
        ? Math.max(0, Math.min(100, Math.round((nwpm / gwpm) * 100)))
        : 100;
      setStats({ gwpm, nwpm, accuracy });
    }
  }, [timeElapsed, totalStrokes, fullErrors, halfErrors]);

  // ─── Mistake Classification Rules (Typing — not Steno) ──────────────────────
  // Returns: 'correct' | 'half-error' | 'error'
  //
  // FULL MISTAKES (A):
  //   i.   Omission of word            → handled by commitWord (missing word = error)
  //   ii.  Substitution of wrong word  → 'error' below
  //   iii. Addition of extra word      → handled at result level
  //   iv.  Spelling error              → 'error' below
  //   v.   Repetition of word          → handled at result level (extra word = error)
  //   vi.  Incomplete word (empty str) → 'error' below
  //
  // HALF MISTAKES (B):
  //   i.   Spacing errors (merged words / extra spaces) → Pass 2 + Pass 4 in commitWord
  //   ii.  Punctuation errors (rep/add/omit/sub)        → stripPunct comparison below
  //   iii. Wrong capitalisation — ENGLISH ONLY           → case-insensitive (not Hindi)
  //   iv.  Transposition                                → Pass 3 in commitWord
  //   v.   Paragraphic errors                           → not detectable in plain textarea
  const isHindiMode = isKrutiDev || isMangal || isRemington;

  const compareWords = useCallback((typed, target) => {
    if (!typed || !target) return 'error'; // A.vi incomplete / A.i omission

    // Normalise Devanagari Unicode sequences
    const norm = (s) => isHindiMode ? s.normalize('NFC') : s;
    const t = norm(typed.trim());
    const r = norm(target.trim());

    if (!t) return 'error'; // A.vi: empty / incomplete

    // Exact match
    if (t === r) return 'correct';

    // B.iii: Wrong capitalisation — ENGLISH ONLY
    // Rule: "This does not apply to Hindi Typewriting Scripts"
    if (!isHindiMode && t.toLowerCase() === r.toLowerCase()) return 'half-error';

    // B.ii: Punctuation error — repetition / addition / omission / substitution
    // Strip all punctuation and compare the core alphabetic/digit content
    // Examples: "hope,," vs "hope," → core "hope"=="hope" → half
    //           "hope"   vs "hope," → core "hope"=="hope" → half
    //           "hope."  vs "hope," → core "hope"=="hope" → half
    const stripPunct = (s) => s.replace(/[.,;:!?'"()\[\]{}\-–—\/\\]/g, '').trim();
    const tCore = stripPunct(t);
    const rCore = stripPunct(r);
    if (tCore && rCore) {
      // For Hindi: compare as-is (no case folding); for English: case-insensitive
      const tCmp = isHindiMode ? tCore : tCore.toLowerCase();
      const rCmp = isHindiMode ? rCore : rCore.toLowerCase();
      if (tCmp === rCmp) return 'half-error';
    }

    // Full mistake: spelling error or completely wrong word (A.ii, A.iv)
    return 'error';
  }, [isHindiMode, pattern]);

  // ─── Sequential word alignment ───────────────────────────────────────────────
  // Processes typed words in order, matching each against the current reference
  // position. When a typed word misses the current ref word:
  //
  //   Rule 4: Look ahead through the reference until the typed word is found.
  //           If found within the small window → skip ref words (omissions), align there.
  //
  //   Rule 5: For large skips (beyond SMALL_WIN), require 2 consecutive typed+ref
  //           word matches before committing to the jump. This prevents false anchors
  //           on common single words (e.g. "the", "and", "a").
  //
  //   Extra word: if none of the next INSERT_LOOK typed words find an anchor,
  //               check if an upcoming typed word matches current ref. If so,
  //               the current typed word is an insertion (extra word); refPos stays.
  //   Substitution: if no anchor and no insertion → pair typed word with current ref.
  //
  // Returns:
  //   statuses        – status for each REF word (correct | half-error | error | pending)
  //   typedAtRef      – typed word aligned to ref[i] (or '' if omitted)
  //   extraTypedWords – typed words with no ref counterpart (insertions)
  //   lineChangeCount – count of "jumps" (3+ consecutive omissions)
  //   fullErrors / halfErrors – counts (omissions counted as full per Rule A.i)
  const detectLineChanges = useCallback((typedWords, refWords) => {
    const T = typedWords.length;
    const R = refWords.length;

    if (R === 0) {
      return {
        statuses: [], typedAtRef: [], extraTypedWords: typedWords.slice(),
        lineChangeCount: 0, fullErrors: 0, halfErrors: 0,
      };
    }

    // Rule 4: small window — single-word match for same-sentence omissions
    // Rule 5: large window — require MIN_CLUSTER consecutive matches for paragraph-level jumps
    const SMALL_WIN   = 10;  // single-word look-ahead within a sentence
    const LARGE_WIN   = 150; // extended look-ahead for bigger skips
    const MIN_CLUSTER = 2;   // consecutive typed+ref matches required for large jumps
    const INSERT_LOOK = 5;   // how many typed words ahead to check for extra-word detection

    const statuses   = new Array(R).fill('pending');
    const typedAtRef = new Array(R).fill('');
    const extraTypedWords = [];
    let omissionRunLen = 0;
    let lineChangeCount = 0;
    let refPos = 0;

    for (let tp = 0; tp < T; tp++) {
      if (refPos >= R) {
        extraTypedWords.push(typedWords[tp]);
        continue;
      }

      const tw  = typedWords[tp];
      const cmp = compareWords(tw, refWords[refPos]);

      if (cmp !== 'error') {
        statuses[refPos]   = cmp;
        typedAtRef[refPos] = tw;
        omissionRunLen = 0;
        refPos++;
        continue;
      }

      // Rule 4: small window — single-word match is reliable for short skips
      const smallEnd = Math.min(refPos + SMALL_WIN + 1, R);
      let jumpRefPos = -1;
      for (let look = refPos + 1; look < smallEnd; look++) {
        if (compareWords(tw, refWords[look]) !== 'error') {
          jumpRefPos = look;
          break;
        }
      }

      // Rule 5: large window — require MIN_CLUSTER consecutive matches before jumping
      if (jumpRefPos < 0) {
        const largeEnd = Math.min(refPos + LARGE_WIN + 1, R);
        for (let look = refPos + SMALL_WIN + 1; look < largeEnd; look++) {
          let consec = 0;
          for (let k = 0; k < MIN_CLUSTER; k++) {
            const twk = tp + k < T ? typedWords[tp + k] : null;
            const rwk = look + k < R ? refWords[look + k] : null;
            if (twk && rwk && compareWords(twk, rwk) !== 'error') consec++;
            else break;
          }
          if (consec >= MIN_CLUSTER) { jumpRefPos = look; break; }
        }
      }

      if (jumpRefPos >= 0) {
        // Mark omitted ref words as pending
        for (let skip = refPos; skip < jumpRefPos; skip++) {
          statuses[skip]   = 'pending'; // omission
          typedAtRef[skip] = '';
          omissionRunLen++;
          if (omissionRunLen === 3) lineChangeCount++;
        }
        statuses[jumpRefPos]   = compareWords(tw, refWords[jumpRefPos]);
        typedAtRef[jumpRefPos] = tw;
        omissionRunLen = 0;
        refPos = jumpRefPos + 1;
      } else {
        // No anchor found. Check if this is an extra (inserted) typed word:
        // look ahead INSERT_LOOK typed words for a match with current ref word.
        let isInsertion = false;
        for (let look = tp + 1; look <= tp + INSERT_LOOK && look < T; look++) {
          if (compareWords(typedWords[look], refWords[refPos]) !== 'error') {
            isInsertion = true;
            break;
          }
        }

        if (isInsertion) {
          extraTypedWords.push(tw); // extra word typed — refPos does NOT advance
        } else {
          // Substitution: wrong word typed for current ref word
          statuses[refPos]   = 'error';
          typedAtRef[refPos] = tw;
          omissionRunLen = 0;
          refPos++;
        }
      }
    }

    // Remaining ref words that were never typed stay as 'pending' (omission)

    let full = 0, half = 0;
    for (const s of statuses) {
      if (s === 'error')           full++;
      else if (s === 'half-error') half++;
      else if (s === 'pending')    full++; // omission = full mistake (Rule A.i)
    }

    return {
      statuses, typedAtRef, extraTypedWords,
      lineChangeCount,
      fullErrors: full, halfErrors: half,
    };
  }, [compareWords]);

  // ─── Repeated-sequence detector ─────────────────────────────────────────────
  // Finds runs of >= MIN_REPEAT_LEN consecutive words in `typedWords` that exactly
  // duplicate an earlier (non-overlapping) run. Returns an array of ranges:
  //   { start, end, sourceStart, sourceEnd, text }
  // where indices are 0-based positions inside `typedWords`. Each word inside a
  // detected range counts as a separate full error per the user's rule
  // ("repeated word will be counted by each word as full error").
  const detectRepeatedSequences = useCallback((typedWords, minLen = 4) => {
    const N = typedWords.length;
    if (N < minLen * 2) return [];
    const norm = typedWords.map(w => (w || '').toLowerCase());
    const covered = new Array(N).fill(false);
    const ranges = [];

    for (let i = 0; i < N; i++) {
      if (covered[i]) continue;
      let bestLen = 0;
      let bestSrcStart = -1;
      for (let j = 0; j < i; j++) {
        let len = 0;
        while (
          j + len < i &&
          i + len < N &&
          norm[j + len] === norm[i + len]
        ) {
          len++;
        }
        if (len > bestLen) {
          bestLen = len;
          bestSrcStart = j;
        }
      }
      if (bestLen >= minLen) {
        const end = i + bestLen - 1;
        ranges.push({
          start: i,
          end,
          sourceStart: bestSrcStart,
          sourceEnd: bestSrcStart + bestLen - 1,
          text: typedWords.slice(i, end + 1).join(' '),
        });
        for (let k = i; k <= end; k++) covered[k] = true;
        i = end; // advance past the run
      }
    }
    return ranges;
  }, []);

  // ─── Word commit logic (shared by all modes) ────────────────────────────────
  const commitWord = useCallback((fullValue) => {
    const rawTypedWords = fullValue.trim().split(/\s+/).filter(Boolean);

    // ── Pre-process: merge accidentally split words ────────────────────────────
    // If the user presses space in the middle of a reference word (e.g. types
    // "hel lo" instead of "hello"), merge those two typed words back into one
    // and flag the merged slot as a spacing half-error so subsequent words still
    // align correctly to the reference.
    const processedWords = [];  // merged words used for comparison
    const splitFlags = [];      // true if the word was created by merging two typed words
    let rawIdx = 0;
    while (rawIdx < rawTypedWords.length) {
      const rIdx = processedWords.length;
      const tw = rawTypedWords[rawIdx];
      const nextTw = rawTypedWords[rawIdx + 1];
      if (
        rIdx < words.length &&
        nextTw !== undefined &&
        compareWords(tw, words[rIdx]) === 'error'
      ) {
        const merged = tw + nextTw;
        if (compareWords(merged, words[rIdx]) !== 'error') {
          processedWords.push(merged);
          splitFlags.push(true);
          rawIdx += 2;
          continue;
        }
      }
      processedWords.push(tw);
      splitFlags.push(false);
      rawIdx++;
    }

    const typedWords = processedWords;
    const currentIndex = fullValue.endsWith(' ') ? typedWords.length : typedWords.length - 1;

    const newStatuses = [...wordStatuses];

    // ── Pass 1: basic word-by-word comparison ─────────────────────────────────
    for (let i = 0; i < typedWords.length; i++) {
      const isWordFinished = i < currentIndex;
      if (isWordFinished) {
        // Use 'half-error' for words that were accidentally split (spacing error)
        if (splitFlags[i]) {
          newStatuses[i] = 'half-error';
        } else {
          const status = compareWords(typedWords[i], words[i] || '');
          newStatuses[i] = status;
        }
      } else {
        newStatuses[i] = 'pending';
      }
    }

    // ── Pass 2: B.i Spacing error — two ref words merged without space ────────
    // e.g. typed "Ihope" where ref[i]="I" and ref[i+1]="hope" → half-error
    for (let i = 0; i < currentIndex; i++) {
      if (newStatuses[i] === 'error' && words[i] && words[i + 1]) {
        const mergedLower = (words[i] + words[i + 1]).toLowerCase();
        if ((typedWords[i] || '').toLowerCase() === mergedLower) {
          newStatuses[i] = 'half-error'; // B.i spacing error
        }
      }
    }

    // ── Pass 3: B.iv Transposition — adjacent words swapped ─────────────────
    for (let i = 0; i < currentIndex - 1; i++) {
      const ti  = (typedWords[i]     || '').toLowerCase();
      const ti1 = (typedWords[i + 1] || '').toLowerCase();
      const ri  = (words[i]          || '').toLowerCase();
      const ri1 = (words[i + 1]      || '').toLowerCase();
      if (ti === ri1 && ti1 === ri && ti !== ri) {
        if (newStatuses[i]     === 'error') newStatuses[i]     = 'half-error';
        if (newStatuses[i + 1] === 'error') newStatuses[i + 1] = 'half-error';
      }
    }

    // ── Count word-level errors ───────────────────────────────────────────────
    let fullBase = 0, half = 0;
    for (let i = 0; i < currentIndex; i++) {
      if (newStatuses[i] === 'error')      fullBase++;
      if (newStatuses[i] === 'half-error') half++;
    }

    // ── Pass 4: B.i Extra spaces — count groups of 2+ consecutive spaces ──────
    // "I   hope" typed = 1 extra-space half-error (not visible in word split)
    // Only scan the already-committed portion (up to last space)
    {
      const committed = fullValue.slice(0, fullValue.lastIndexOf(' ') + 1);
      const extraGroups = committed.match(/ {2,}/g);
      if (extraGroups) half += extraGroups.length;
    }

    // Full = ALL errors (spelling/omission-base + formatting/cap+punct)
    const full = fullBase + half;

    setWordStatuses(newStatuses);
    setFullErrors(full);
    setHalfErrors(half);
    // Count all strokes including spaces and punctuation
    const totalCurrentStrokes = fullValue.length;
    setTotalStrokes(totalCurrentStrokes);
    // currentIndex is based on merged (aligned) typed words, so it correctly
    // maps to the reference word position even when split words are detected.
    setCurrentWordIndex(currentIndex);

    if (currentIndex >= words.length && fullValue.endsWith(' ')) {
      // Pass fresh computed values directly — React state hasn't applied yet at this point
      handleFinish(newStatuses, full, half, totalCurrentStrokes, fullValue.trim());
      return;
    }
  }, [words, wordStatuses, pattern, handleFinish, compareWords]);

  // ─── Input handlers ─────────────────────────────────────────────────────────



  const getLockedIndex = () => {
    const rule = settings.backspaceControl;
    if (rule === 'Full Backspace') return 0;
    
    const spaceIndices = [];
    for (let i = 0; i < userInput.length; i++) {
      if (userInput[i] === ' ') spaceIndices.push(i);
    }
    
    if (rule === 'Current Word Backspace') {
      if (spaceIndices.length === 0) return 0;
      return spaceIndices[spaceIndices.length - 1] + 1;
    }
    
    if (rule === 'Two Words Backspace' || rule === 'Two Word Backspace') {
      if (spaceIndices.length <= 2) return 0;
      return spaceIndices[spaceIndices.length - 3] + 1;
    }
    
    return 0;
  };

  // MANGAL: standard onChange with IME composition guard
  const handleMangalChange = (e) => {
    if (isComposingRef.current) return;
    const value = e.target.value;
    setUserInput(value);
    commitWord(value);
  };

  // MANGAL: when IME confirms a composed character (e.g. pressing Enter after phonetic input)
  const handleCompositionEnd = (e) => {
    isComposingRef.current = false;
    // After IME confirms, the textarea value is updated; sync it
    setUserInput(e.target.value);
  };

  // ENGLISH standard
  const handleEnglishChange = (e) => {
    const value = e.target.value;
    setUserInput(value);
    commitWord(value);
  };

  const handleEnglishKeyDown = (e) => {
    if (isPaused) { e.preventDefault(); return; } // block all input while paused
    if (!isStarted && e.key !== 'Escape') setIsStarted(true);
    const rule = settings.backspaceControl;

    // TAB key: prevent default focus-jump out of the textarea so typing continues.
    // Insert a tab character at the cursor position so users can match indented passages.
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target;
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? start;
      const newValue = target.value.substring(0, start) + '\t' + target.value.substring(end);
      setUserInput(newValue);
      commitWord(newValue);
      requestAnimationFrame(() => {
        try { target.setSelectionRange(start + 1, start + 1); } catch (_) {}
      });
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (rule === 'No Backspace') {
        e.preventDefault();
        return;
      }
      if (rule !== 'Full Backspace') {
        const currentLocked = getLockedIndex();
        maxLockedIndexRef.current = Math.max(maxLockedIndexRef.current, currentLocked);
        const lockedIndex = maxLockedIndexRef.current;
        if (e.key === 'Backspace') {
          if (e.target.selectionStart <= lockedIndex && e.target.selectionEnd === e.target.selectionStart) {
            e.preventDefault();
          } else if (e.target.selectionStart < lockedIndex) {
            e.preventDefault();
          }
        } else if (e.key === 'Delete') {
          if (e.target.selectionStart < lockedIndex) {
            e.preventDefault();
          }
        }
      }
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // ─── Pause / Resume ─────────────────────────────────────────────────────────
  const handlePause = () => {
    if (!isStarted) return; // can't pause before test begins
    if (isPaused) {
      setIsPaused(false); // resume
    } else if (pauseCount < MAX_PAUSES) {
      setIsPaused(true);
      setPauseCount(prev => prev + 1);
    }
  };

  // ─── Finish ─────────────────────────────────────────────────────────────────
  // overrides are passed when called from commitWord (React state not yet updated)
  // When called from timer (no overrides), use current state + evaluate partial word
  async function handleFinish(
    overrideStatuses = null,
    overrideFull     = null,
    overrideHalf     = null,
    overrideStrokes  = null,
    overrideInput    = null,
  ) {
    if (!isStarted && userInput.trim().length === 0) {
      const confirmSubmit = window.confirm("You haven't started typing. Do you want to exit the test without submitting, or stay on this page?\n\nClick OK to Exit to Dashboard, Cancel to stay.");
      if (confirmSubmit) {
        return navigate('/dashboard');
      }
      return;
    }

    // Resolve final values
    let finalStatuses = overrideStatuses ?? wordStatuses;
    let finalFull     = overrideFull     ?? fullErrors;
    let finalHalf     = overrideHalf     ?? halfErrors;
    let finalStrokes  = overrideStrokes  ?? totalStrokes;
    let finalInput    = overrideInput    ?? userInput;

    // When called from timer: evaluate the partially-typed current word too
    if (overrideStatuses === null && finalInput && !finalInput.endsWith(' ')) {
      const tWords = finalInput.trim().split(/\s+/).filter(Boolean);
      const lastIdx = tWords.length - 1;
      const lastTyped = tWords[lastIdx] || '';
      const lastRef   = words[lastIdx]   || '';
      if (lastRef) {
        // Incomplete word → full mistake (Rule A.vi)
        const updated = [...finalStatuses];
        updated[lastIdx] = 'error';
        finalStatuses = updated;
        finalFull++;
        // Include all strokes
        finalStrokes = finalInput.length;
      }
    }

    // Run word-level edit-distance alignment so single-word
    // insertions/deletions/substitutions stay LOCAL and don't cascade into
    // every following word being marked wrong.
    const typedFinalWords = finalInput.trim().split(/\s+/).filter(Boolean);

    // Detect repeated sequences FIRST, strip them before alignment so that
    // words typed correctly after a repeated segment are not wrongly flagged as errors.
    // In re-type mode, only check within the original passage boundary — words typed
    // in subsequent loop iterations are intentional repeats and must NOT be penalised.
    const wordsForRepeatCheck = exam?.test_re_type && baseWordCountRef.current > 0
      ? typedFinalWords.slice(0, baseWordCountRef.current)
      : typedFinalWords;
    const repeatedRanges = detectRepeatedSequences(wordsForRepeatCheck);
    const repeatedWordCount = repeatedRanges.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
    const coveredByRepeat = new Set();
    for (const r of repeatedRanges) {
      for (let k = r.start; k <= r.end; k++) coveredByRepeat.add(k);
    }
    const wordsForAlignment = typedFinalWords.filter((_, idx) => !coveredByRepeat.has(idx));

    const lineDetect = detectLineChanges(wordsForAlignment, words);
    const lineChangeCount   = lineDetect.lineChangeCount;
    const extraTypedWords   = lineDetect.extraTypedWords || [];
    let   alignedTypedWords = lineDetect.typedAtRef;

    finalStatuses = lineDetect.statuses;
    // Re-derive error counts respecting the admin's omission setting
    const countOmissions = pattern?.count_omissions_as_errors ?? true;
    let derivedBase = extraTypedWords.length; // A.iii addition errors
    derivedBase += repeatedWordCount;          // A.v repetition (each repeated word = full error)
    let derivedHalf = 0;
    for (const s of finalStatuses) {
      if (s === 'error')           derivedBase++;              // spelling/substitution
      else if (s === 'half-error') derivedHalf++;             // cap/punct
      else if (s === 'pending' && countOmissions) derivedBase++; // A.i omission
    }
    // Full mistakes = ALL error types (spelling + omission + addition + repetition + formatting/cap+punct)
    // Half mistakes = cap/punct subset (gets a 0.5 discount in the formula)
    finalFull = derivedBase + derivedHalf;
    finalHalf = derivedHalf;

    // ── RE-TYPE mode: trim reference to only the words the student reached ───
    // The extended word list may have thousands of trailing entries the student
    // never got to. Slice them away so they don't appear as omissions in the result.
    let resultReferenceWords = words;
    if (exam?.test_re_type) {
      let lastActive = -1;
      for (let i = finalStatuses.length - 1; i >= 0; i--) {
        if (finalStatuses[i] !== 'pending') { lastActive = i; break; }
      }
      const trimTo = lastActive + 1;
      if (trimTo > 0 && trimTo < finalStatuses.length) {
        finalStatuses        = finalStatuses.slice(0, trimTo);
        resultReferenceWords = words.slice(0, trimTo);
        if (alignedTypedWords) alignedTypedWords = alignedTypedWords.slice(0, trimTo);
      }
    }

    // Re-derive stats from final values so GWPM/NWPM are accurate
    const elapsed     = timeElapsed > 0 ? timeElapsed : 1;
    const minutes     = elapsed / 60;
    // Pattern controls whether speed is counted in Words (actual word count) or Strokes (keystrokes/5).
    // 'Words' = count actual space-delimited words typed. 'Strokes' (default) = keystrokes/5.
    const speedCount  = pattern?.speed_count ?? 'Strokes';
    const totalWords  = speedCount === 'Words'
      ? typedFinalWords.length
      : finalStrokes / 5;
    const totalMist   = finalFull + finalHalf * 0.5;
    const pfactor     = pattern?.penalty_value ?? 1;
    const ptype       = pattern?.penalty_type  ?? 'Word';
    const penaltyWds  = ptype === 'Stroke'
      ? (totalMist * 5 / 5) * pfactor
      : totalMist * pfactor;
    const finalGwpm = Math.round(totalWords / minutes);
    const finalNwpm = Math.max(0, Math.round((totalWords - penaltyWds) / minutes));
    // Accuracy = (NWPM / GWPM) × 100  per standard typing test formula (PDF rule)
    const finalAcc  = finalGwpm > 0
      ? Math.max(0, Math.min(100, Math.round((finalNwpm / finalGwpm) * 100)))
      : 100;

    const userId = getCurrentUserUuid();
    const rollNo = localStorage.getItem('roll_no') || '';
    const finalData = {
      gwpm: finalGwpm, nwpm: finalNwpm, accuracy: finalAcc,
      fullErrors: finalFull, halfErrors: finalHalf,
      rollNo,
      totalStrokes: finalStrokes, timeElapsed,
      lineChangeCount,
      alignedTypedWords,
      extraTypedWords,
      repeatedRanges,
      testDurationMinutes: exam?.test_time_minutes || (chapter?.time_minutes) || Math.floor(timeElapsed / 60) || 10,
      exam_name: exam?.name || 'Self Practice',
      chapter_no: chapter?.chapter_no || null,
      date_taken: new Date().toISOString(),
      mode,
      userInput: finalInput,
      referenceWords: resultReferenceWords,
      wordStatuses: finalStatuses,   // fresh — not stale React state
      pattern: pattern ? {
        name: pattern.name || null,
        half_mistake_enabled: pattern.half_mistake_enabled,
        penalty_type: pattern.penalty_type,
        penalty_value: pattern.penalty_value,
        speed_count: pattern.speed_count,
        qualify_on: pattern.qualify_on,
        required_speed: pattern.required_speed,
        required_accuracy: pattern.required_accuracy,
        show_half_mistakes: pattern.show_half_mistakes,
        show_full_mistakes: pattern.show_full_mistakes,
        show_total_strokes: pattern.show_total_strokes,
        show_total_words: pattern.show_total_words,
        show_total_errors: pattern.show_total_errors,
        show_correct_words: pattern.show_correct_words,
        show_gross_speed: pattern.show_gross_speed,
        show_net_speed: pattern.show_net_speed,
        show_accuracy: pattern.show_accuracy,
        show_penalty_words: pattern.show_penalty_words,
        show_ignorable_mistakes: pattern.show_ignorable_mistakes,
        count_omissions_as_errors: pattern.count_omissions_as_errors ?? true,
      } : null,
    };

    // Navigate immediately — don't block on DB save
    navigate('/result', { state: finalData });

    // Save in background. We surface errors via console + a sessionStorage flag
    // so the next page load can warn the student that their result wasn't stored.
    if (!userId) {
      console.error('[Result Save] No UUID found in JWT/localStorage — please log out and log in again.');
      sessionStorage.setItem('lastSaveError', 'You appear to be signed in with an outdated session. Please log out and log in again so your test results can be recorded.');
    } else {
      const payload = {
        student_id: userId,
        chapter_id: chapter?.id || null,
        exam_id: exam?.id || null,
        gwpm: finalGwpm, nwpm: finalNwpm, accuracy: finalAcc,
        total_errors: Math.round(finalFull + finalHalf * 0.5),
        full_errors: finalFull, half_errors: finalHalf,
        total_strokes: finalStrokes, time_elapsed: elapsed,
        user_input: finalInput,
        reference_words: resultReferenceWords,
        word_statuses: finalStatuses,
        pattern_data: pattern ? {
          name: pattern.name || null,
          half_mistake_enabled: pattern.half_mistake_enabled,
          penalty_type: pattern.penalty_type,
          penalty_value: pattern.penalty_value,
          speed_count: pattern.speed_count,
          qualify_on: pattern.qualify_on,
          required_speed: pattern.required_speed,
          required_accuracy: pattern.required_accuracy,
          show_half_mistakes: pattern.show_half_mistakes,
          show_full_mistakes: pattern.show_full_mistakes,
          show_total_strokes: pattern.show_total_strokes,
          show_total_words: pattern.show_total_words,
          show_total_errors: pattern.show_total_errors,
          show_correct_words: pattern.show_correct_words,
          show_gross_speed: pattern.show_gross_speed,
          show_net_speed: pattern.show_net_speed,
          show_accuracy: pattern.show_accuracy,
          show_penalty_words: pattern.show_penalty_words,
          show_ignorable_mistakes: pattern.show_ignorable_mistakes,
          count_omissions_as_errors: pattern.count_omissions_as_errors ?? true,
          repeated_ranges: repeatedRanges,
        } : { repeated_ranges: repeatedRanges },
        mode: mode || null,
        test_type: testType || chapter?.test_type || null,
      };
      if (!navigator.onLine) {
        console.log('[Result Save] Offline — skipping DB save for preloaded test.');
      } else {
        console.log('[Result Save] Sending payload:', { student_id: userId, chapter_id: payload.chapter_id, exam_id: payload.exam_id, gwpm: payload.gwpm, nwpm: payload.nwpm, test_type: payload.test_type });
        resultService.saveResult(payload)
          .then(res => { console.log('[Result Save] Saved successfully:', res?.id || res); })
          .catch(e => {
            const msg = e?.response?.data?.message || e?.message || 'Unknown error';
            console.error('[Result Save] FAILED:', msg, e?.response?.data);
            sessionStorage.setItem('lastSaveError', `Your test result could not be saved: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
          });
      }
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="loading-screen">Preparing Test...</div>;

  const isLineByLine = screenType === 'Screen-4';
  const wordsPerLine = 15;
  const currentLineIndex = Math.floor(currentWordIndex / wordsPerLine);

  const renderWords = () => {
    let wordsToRender = words, offset = 0;
    if (isLineByLine) {
      wordsToRender = words.slice(currentLineIndex * wordsPerLine, (currentLineIndex + 1) * wordsPerLine);
      offset = currentLineIndex * wordsPerLine;
    }
    return wordsToRender.map((word, relIdx) => {
      const idx = offset + relIdx;
      return (
        <span
          key={idx}
          ref={(el) => scrollRef.current[idx] = el}
          className={`word
            ${idx === currentWordIndex ? (settings.highlightWord ? `current hl-${settings.highlightColor}` : 'current-no-bg') : ''}
            ${wordStatuses[idx] === 'correct' ? (settings.highlightError ? 'correct' : '') : ''}
            ${wordStatuses[idx] === 'half-error' ? (settings.highlightError ? 'half-mistake' : '') : ''}
            ${wordStatuses[idx] === 'error' ? (settings.highlightError ? 'error' : '') : ''}
          `}
        >
          {word}
        </span>
      );
    });
  };

  // ─── Hindi mode info banner ──────────────────────────────────────────────────
  const renderHindiModeBanner = () => {
    if (isKrutiDev) return (
      <div style={{ padding: '6px 12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: '4px', fontSize: '0.82rem', color: '#713f12', marginBottom: '6px' }}>
        🖮 <strong>Kruti Dev Mode:</strong> Type using Kruti Dev 010 key layout. Keys are automatically mapped. Font: <em>Kruti Dev 010</em> (Built-in).
      </div>
    );
    if (isMangal) return (
      <div style={{ padding: '6px 12px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '4px', fontSize: '0.82rem', color: '#1e3a8a', marginBottom: '6px' }}>
        🌐 <strong>Mangal / Unicode Hindi Mode:</strong> Use your Windows Hindi Phonetic or InScript keyboard (Win + Space to switch). Font: Mangal / Noto Sans Devanagari.
      </div>
    );
    if (isRemington) return (
      <div style={{ padding: '6px 12px', background: '#f0fff4', border: '1px solid #86efac', borderRadius: '4px', fontSize: '0.82rem', color: '#14532d', marginBottom: '6px' }}>
        ⌨ <strong>Hindi Remington (GAIL) Mode:</strong> Type using the standard Remington GAIL keyboard layout. Keys are automatically mapped to Unicode Devanagari.
      </div>
    );
    return null;
  };

  // ─── Settings lock (applied once test starts) ────────────────────────────────
  const settingsLockStyle = isStarted
    ? { pointerEvents: 'none', opacity: 0.45, userSelect: 'none' }
    : {};
  const SettingsLockBanner = () => isStarted ? (
    <div style={{
      background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px',
      padding: '5px 10px', marginBottom: '8px',
      fontSize: '0.76rem', color: '#92400e', fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: '5px',
    }}>
      🔒 Settings locked — test in progress
    </div>
  ) : null;

  // ─── TCS Screen 5 Render ─────────────────────────────────────────────────────
  if (screenType === 'Screen-5') {
    const tcsTextarea = (
      <textarea
        className="typing-input"
        style={{ fontFamily: hindiFontFamily, width: '100%', height: '100%', boxSizing: 'border-box', fontSize: `${settings.fontSize}px` }}
        autoFocus
        value={userInput}
        onKeyDown={handleEnglishKeyDown}
        onChange={isMangal ? handleMangalChange : handleEnglishChange}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={isMangal ? handleCompositionEnd : undefined}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        lang={isMangal ? 'hi' : 'en'}
        disabled={timeLeft === 0}
        readOnly={false}
        placeholder="Start Typing Here.."
      />
    );

    const tcsPassage = settings.paperMode ? null : (
      <div className="source-text-container tcs-passage" style={{ fontSize: `${settings.testFontSize}px`, fontFamily: hindiFontFamily }}>
        <div className="text-display">{renderWords()}</div>
      </div>
    );

    const tcsSidebar = (
      <div className={`tcs-sidebar ${mobileSettingsOpen ? 'open' : ''}`}>
        <SettingsLockBanner />
        <div className="tcs-sidebar-card" style={settingsLockStyle}>
          <div className="tcs-setting-title">
            <span className="tcs-gear-icon">⚙</span> Settings( Only For Practice )
          </div>
          <div className="tcs-setting-items">
            <label className="tcs-checkbox-label">
              <input type="checkbox"
                checked={settings.sameSize}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSettings(s => ({ ...s, sameSize: checked, ...(checked ? { testFontSize: s.fontSize } : {}) }));
                }}
              /> Same Size In Both Boxes
            </label>
            <div className="tcs-font-controls">
              <button className="tcs-btn-font minus" onClick={() => setSettings(s => ({ ...s, fontSize: Math.max(10, s.fontSize - 2), testFontSize: Math.max(10, s.testFontSize - 2) }))}>A-</button>
              <span className="tcs-font-display">{settings.fontSize}</span>
              <button className="tcs-btn-font plus" onClick={() => setSettings(s => ({ ...s, fontSize: s.fontSize + 2, testFontSize: s.testFontSize + 2 }))}>A+</button>
            </div>
            <label className="tcs-checkbox-label">
              <input type="checkbox" checked={settings.autoScroll} onChange={(e) => setSettings({ ...settings, autoScroll: e.target.checked })} /> Auto Scroll
            </label>
            <label className="tcs-checkbox-label">
              <input type="checkbox" checked={settings.highlightWord} onChange={(e) => setSettings({ ...settings, highlightWord: e.target.checked })} /> Highlight Word
            </label>
            <label className="tcs-checkbox-label">
              <input type="checkbox" checked={settings.highlightError} onChange={(e) => setSettings({ ...settings, highlightError: e.target.checked })} /> Highlight Error
            </label>
          </div>
        </div>

        <div className="tcs-sidebar-card" style={settingsLockStyle}>
          <div className="tcs-setting-title">
            <span className="tcs-gear-icon">⚙</span> Backspace Settings
          </div>
          <div className="tcs-setting-items">
            <label className="tcs-radio-label"><input type="radio" name="tcs-bs" checked={settings.backspaceControl === 'No Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'No Backspace' })} /> No Backspace</label>
            <label className="tcs-radio-label"><input type="radio" name="tcs-bs" checked={settings.backspaceControl === 'Current Word Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'Current Word Backspace' })} /> Current Word Backspace</label>
            <label className="tcs-radio-label"><input type="radio" name="tcs-bs" checked={settings.backspaceControl === 'Two Word Backspace' || settings.backspaceControl === 'Two Words Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'Two Word Backspace' })} /> Two Word Backspace</label>
            <label className="tcs-radio-label"><input type="radio" name="tcs-bs" checked={settings.backspaceControl === 'Full Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'Full Backspace' })} /> Full Backspace</label>
            <div className="tcs-practice-note">Only For Practice</div>
          </div>
        </div>
        <button className="tcs-btn-submit desktop-only" onClick={() => handleFinish()}>Submit Test</button>
        <button className="btn-close-settings-mobile mobile-only" onClick={() => setMobileSettingsOpen(false)}>Save Settings</button>
      </div>
    );

    /* ── Shared Topbar & Headers for all TCS interfaces ── */
    const tcsTopHeader = (
      <div className="tcs-top-header">
        <div className="tcs-top-header-left">
          <button className="tcs-exit-btn" onClick={() => navigate('/dashboard')}>← Exit</button>
          BSEDC English Typing Test
        </div>
        <div className="tcs-top-header-right">
          <span className="tcs-info-icon">i</span> Instructions
        </div>
      </div>
    );

    const tcsSecondHeader = (
      <div className="tcs-second-header">
        <button className="tcs-blue-btn">{exam?.name || 'English Typing Test'}</button>
        <div className="tcs-user-block">
          <div className="tcs-user-photo">
            {profileImageUrl && (
              <img src={profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} onError={(e) => { e.target.style.display = 'none'; }} />
            )}
          </div>
          <div className="tcs-user-name">{localStorage.getItem('name') || localStorage.getItem('username') || 'Student'}</div>
        </div>
      </div>
    );

    const tcsThirdHeader = (withFontControls = false) => (
      <div className="tcs-third-header">
        <div className="tcs-th-left">
          <span className="tcs-th-title">TCS Interface</span>
          <button className="tcs-grey-btn" onClick={cycleTcsInterface}>Change Interface</button>
        </div>
        <div className="tcs-th-line"></div>
        {withFontControls && !isFullscreen && (
          <div className="tcs-th-center-fonts" style={settingsLockStyle}>
            <button className="tcs-btn-font minus" onClick={() => setSettings(s => ({ ...s, fontSize: Math.max(10, s.fontSize - 2), testFontSize: Math.max(10, s.testFontSize - 2) }))}>A-</button>
            <span className="tcs-font-display-inline">{settings.fontSize}</span>
            <button className="tcs-btn-font plus" onClick={() => setSettings(s => ({ ...s, fontSize: s.fontSize + 2, testFontSize: s.testFontSize + 2 }))}>A+</button>
          </div>
        )}
        <div className="tcs-th-right">
          <span className="tcs-th-time">Time Left:{formatTime(timeLeft)}</span>
        </div>
      </div>
    );

    /* ── Interface 1: Split (narrow passage + sidebar) ── */
    if (tcsInterface === 1) return (
      <div className="tcs-layout tcs-interface-1">
        {/* Mobile Settings Toggle */}
        <button className="mobile-settings-fab" onClick={() => setMobileSettingsOpen(true)}>⚙️</button>
        {mobileSettingsOpen && <div className="mobile-settings-overlay" onClick={() => setMobileSettingsOpen(false)}></div>}

        {tcsTopHeader}
        {tcsSecondHeader}
        {tcsThirdHeader(false)}
        <div className="tcs-accent-bar-solid"></div>
        <div className="tcs-content tcs-content-split">
          <div className="tcs-left-panel">
            {tcsPassage}
            <div className="tcs-input-wrap" style={settings.paperMode ? { flex: 1 } : {}}>{tcsTextarea}</div>
            <label className="tcs-sound-label">
              <input type="checkbox" /> Play Keyboard Sound
            </label>
            <button className="tcs-btn-submit mobile-only mobile-submit-test" onClick={() => handleFinish()}>Submit Test</button>
          </div>
          {!isFullscreen && tcsSidebar}
        </div>
      </div>
    );

    /* ── Interface 2: Full-width (no sidebar) ── */
    if (tcsInterface === 2) return (
      <div className="tcs-layout tcs-interface-2">
        {tcsTopHeader}
        <div className="tcs-purple-header"></div>
        {tcsThirdHeader(true)}
        <div className="tcs-content tcs-content-full">
          {!settings.paperMode && (
            <div className="tcs-fullwidth-passage" style={{ fontSize: `${settings.testFontSize}px`, fontFamily: hindiFontFamily }}>
              <div className="text-display">{renderWords()}</div>
            </div>
          )}
          <div className="tcs-fullwidth-input" style={settings.paperMode ? { flex: 1 } : {}}>{tcsTextarea}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <label className="tcs-sound-label">
              <input type="checkbox" /> Play Keyboard Sound
            </label>
            <button className="tcs-btn-submit" style={{ width: 'auto', padding: '10px 40px' }} onClick={() => handleFinish()}>Submit</button>
          </div>
        </div>
      </div>
    );

    /* ── Interface 3: Like Interface 1 but narrower text areas ── */
    return (
      <div className="tcs-layout tcs-interface-3">
        {/* Mobile Settings Toggle */}
        <button className="mobile-settings-fab" onClick={() => setMobileSettingsOpen(true)}>⚙️</button>
        {mobileSettingsOpen && <div className="mobile-settings-overlay" onClick={() => setMobileSettingsOpen(false)}></div>}

        {tcsTopHeader}
        {tcsSecondHeader}
        {tcsThirdHeader(false)}
        <div className="tcs-accent-bar-solid"></div>
        <div className="tcs-content tcs-content-split-narrow">
          <div className="tcs-left-panel tcs-left-panel-narrow">
            {tcsPassage}
            <div className="tcs-input-wrap" style={settings.paperMode ? { flex: 1 } : {}}>{tcsTextarea}</div>
            <label className="tcs-sound-label">
              <input type="checkbox" /> Play Keyboard Sound
            </label>
            <button className="tcs-btn-submit mobile-only mobile-submit-test" onClick={() => handleFinish()}>Submit Test</button>
          </div>
          {!isFullscreen && tcsSidebar}
        </div>
      </div>
    );
  }

  // ─── Screen 2 (Green) Render ──────────────────────────────────────────────────
  if (screenType === 'Screen-2') {
    const s2Passage = (
      <div className="s2-passage-text" style={{ fontSize: `${settings.testFontSize}px`, fontFamily: hindiFontFamily }}>
        <div className="text-display">{renderWords()}</div>
      </div>
    );

    const s2Textarea = (
      <textarea
        className="s2-typing-input"
        style={{ fontFamily: hindiFontFamily, fontSize: `${settings.fontSize}px` }}
        autoFocus
        value={userInput}
        onKeyDown={handleEnglishKeyDown}
        onChange={isPaused ? undefined : (isMangal ? handleMangalChange : handleEnglishChange)}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={isMangal ? handleCompositionEnd : undefined}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        lang={isMangal ? 'hi' : 'en'}
        disabled={timeLeft === 0}
        readOnly={isPaused}
        placeholder="Start Typing Here.."
        rows={5}
      />
    );

    const userName = localStorage.getItem('name') || localStorage.getItem('username') || 'Student';
    const rollNumber = localStorage.getItem('roll_no') || localStorage.getItem('user_id') || localStorage.getItem('username') || '';

    return (
      <div className="s2-layout s2-new">
        {/* ── Top Blue Bar ──────────────────────────────────────────── */}
        <div className="s2new-topbar">
          <div className="s2new-topbar-left">
            <div className="s2new-title">{exam?.name || mode || 'English Typing'}</div>
            <div className="s2new-font-controls" style={settingsLockStyle}>
              <button
                className="s2new-font-btn"
                onClick={() => setSettings(s => ({ ...s, fontSize: Math.max(10, s.fontSize - 2), testFontSize: s.sameSize ? Math.max(10, s.fontSize - 2) : s.testFontSize }))}
              >A-</button>
              <button className="s2new-font-btn">A</button>
              <button
                className="s2new-font-btn"
                onClick={() => setSettings(s => ({ ...s, fontSize: s.fontSize + 2, testFontSize: s.sameSize ? s.fontSize + 2 : s.testFontSize }))}
              >A+</button>
            </div>
          </div>

          <div className="s2new-topbar-center">
            <div className="s2new-avatar">
              {profileImageUrl && (
                <img src={profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} onError={(e) => { e.target.style.display = 'none'; }} />
              )}
            </div>
            <div className="s2new-user-info">
              <div><strong>NAME:</strong> {userName}</div>
              <div><strong>ROLL NUMBER:</strong> {rollNumber}</div>
            </div>
          </div>

          <div className="s2new-topbar-right">
            <div className="s2new-time">{formatTime(timeLeft)} Time Left</div>
            <div className="s2new-top-actions">
              <button
                className="s2new-action-btn"
                onClick={handlePause}
                disabled={!isPaused && pauseCount >= MAX_PAUSES}
                title="Pause / Resume"
              >
                {isPaused ? '▶' : '⏸'}
              </button>
              <button className="s2new-action-btn" onClick={toggleFullScreen} title="Fullscreen">⛶</button>
              <button className="s2new-action-btn" onClick={() => setMobileSettingsOpen(true)} title="Settings">⚙</button>
              <button className="s2new-submit-btn" onClick={() => handleFinish()}>Submit</button>
            </div>
          </div>
        </div>

        {/* ── Passage + Typing Areas ────────────────────────────────── */}
        <div className="s2new-body">
          {!settings.paperMode && (
            <div className="s2new-passage" style={{ position: 'relative' }}>
              {s2Passage}
              {isPaused && (
                <div className="s2new-pause-overlay">
                  <div style={{ fontSize: '2rem' }}>⏸</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>Test Paused</div>
                  <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Click Resume to continue</div>
                </div>
              )}
            </div>
          )}
          <div className="s2new-input-area" style={settings.paperMode ? { flex: 1 } : {}}>
            {s2Textarea}
          </div>
        </div>

        {/* ── Settings Drawer (hidden by default) ───────────────────── */}
        {mobileSettingsOpen && <div className="mobile-settings-overlay" onClick={() => setMobileSettingsOpen(false)}></div>}
        <div className={`s2new-drawer ${mobileSettingsOpen ? 'open' : ''}`}>
          <div className="s2new-drawer-head">
            <span>Settings</span>
            <button className="s2new-drawer-close" onClick={() => setMobileSettingsOpen(false)}>✕</button>
          </div>
          <SettingsLockBanner />
          <div className="s2-card" style={settingsLockStyle}>
            <div className="s2-card-title">
              <span className="s2-gear">⚙</span> Settings (Only For Practice)
            </div>
            <div className="s2-card-content">
              <label className="s2-checkbox-label">
                <input type="checkbox"
                  checked={settings.sameSize}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSettings(s => ({ ...s, sameSize: checked, ...(checked ? { testFontSize: s.fontSize } : {}) }));
                  }}
                /> Same Size In Both Boxes
              </label>
              <div className="s2-font-controls">
                <button className="s2-btn-font minus" onClick={() => setSettings(s => ({ ...s, fontSize: Math.max(10, s.fontSize - 2), testFontSize: s.sameSize ? Math.max(10, s.fontSize - 2) : s.testFontSize }))}>A-</button>
                <span className="s2-font-val">{settings.fontSize}</span>
                <button className="s2-btn-font plus" onClick={() => setSettings(s => ({ ...s, fontSize: s.fontSize + 2, testFontSize: s.sameSize ? s.fontSize + 2 : s.testFontSize }))}>A+</button>
              </div>
              <label className="s2-checkbox-label">
                <input type="checkbox" checked={settings.autoScroll} onChange={(e) => setSettings({ ...settings, autoScroll: e.target.checked })} /> Auto Scroll
              </label>
              <label className="s2-checkbox-label">
                <input type="checkbox" checked={settings.highlightWord} onChange={(e) => setSettings({ ...settings, highlightWord: e.target.checked })} /> Highlight Word
              </label>
              <label className="s2-checkbox-label">
                <input type="checkbox" checked={settings.highlightError} onChange={(e) => setSettings({ ...settings, highlightError: e.target.checked })} /> Highlight Error
              </label>
            </div>
          </div>

          <div className="s2-card" style={settingsLockStyle}>
            <div className="s2-card-title">
              <span className="s2-gear">⚙</span> Backspace Settings
            </div>
            <div className="s2-card-content">
              <label className="s2-radio-label"><input type="radio" checked={settings.backspaceControl === 'No Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'No Backspace' })} /> No Backspace</label>
              <label className="s2-radio-label"><input type="radio" checked={settings.backspaceControl === 'Current Word Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'Current Word Backspace' })} /> Current Word Backspace</label>
              <label className="s2-radio-label"><input type="radio" checked={settings.backspaceControl === 'Two Word Backspace' || settings.backspaceControl === 'Two Words Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'Two Word Backspace' })} /> Two Word Backspace</label>
              <label className="s2-radio-label"><input type="radio" checked={settings.backspaceControl === 'Full Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'Full Backspace' })} /> Full Backspace</label>
              <div className="s2-red-note">Only For Practice</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Screen 1 (CRPF Two-Column) Render ─────────────────────────────────────
  if (screenType === 'Screen-1') {
    const s1Passage = (
      <div className="s1new-passage-text" style={{ fontSize: `${settings.testFontSize}px`, fontFamily: hindiFontFamily }}>
        <div className="text-display">{renderWords()}</div>
      </div>
    );

    const s1Textarea = (
      <textarea
        className="s1new-typing-input"
        style={{ fontFamily: hindiFontFamily, fontSize: `${settings.fontSize}px` }}
        autoFocus
        value={userInput}
        onKeyDown={handleEnglishKeyDown}
        onChange={isPaused ? undefined : (isMangal ? handleMangalChange : handleEnglishChange)}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={isMangal ? handleCompositionEnd : undefined}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        lang={isMangal ? 'hi' : 'en'}
        disabled={timeLeft === 0}
        readOnly={isPaused}
        placeholder="Start Typing Here.."
        rows={5}
      />
    );

    return (
      <div className="s1new-layout">
        {/* Mobile Settings Toggle */}
        <button className="mobile-settings-fab" onClick={() => setMobileSettingsOpen(true)}>⚙️</button>
        {mobileSettingsOpen && <div className="mobile-settings-overlay" onClick={() => setMobileSettingsOpen(false)}></div>}

        {/* ── Left main card ────────────────────────────────────── */}
        <div className="s1new-main">
          <div className="s1new-toolbar">
            <button className="s1new-blue-btn s1new-btn-submit" onClick={() => handleFinish()}>Submit</button>
            <div className="s1new-toolbar-right">
              <button
                className="s1new-blue-btn"
                onClick={handlePause}
                disabled={!isPaused && pauseCount >= MAX_PAUSES}
              >
                {isPaused ? '▶ Resume' : `Pause(${pauseCount}/${MAX_PAUSES})`}
              </button>
              <button className="s1new-blue-btn" onClick={toggleFullScreen}>
                {isFullscreen ? 'Normal Screen(esc)' : 'Full Screen(esc)'}
              </button>
            </div>
          </div>

          {!settings.paperMode && (
            <div className="s1new-passage-box" style={{ position: 'relative' }}>
              {s1Passage}
              {isPaused && (
                <div className="s1new-pause-overlay">
                  <div style={{ fontSize: '2rem' }}>⏸</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>Test Paused</div>
                  <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Click Resume to continue</div>
                </div>
              )}
            </div>
          )}

          <div className="s1new-input-box" style={settings.paperMode ? { flex: 1 } : {}}>
            {s1Textarea}
          </div>
        </div>

        {/* ── Right sidebar ─────────────────────────────────────── */}
        <div className={`s1new-sidebar ${mobileSettingsOpen ? 'open' : ''}`} style={isFullscreen ? { display: 'none' } : {}}>
          <button className="s1new-blue-btn s1new-side-submit" onClick={() => handleFinish()}>Submit</button>

          <div className="s1new-time-card">
            {formatTime(timeLeft)} Time Left
          </div>

          <SettingsLockBanner />

          <div className="s1new-card" style={settingsLockStyle}>
            <div className="s1new-card-title">
              <span className="s1new-gear">⚙</span> Settings( Only For Practice )
            </div>
            <label className="s1new-checkbox-label">
              <input
                type="checkbox"
                checked={settings.sameSize}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSettings(s => ({ ...s, sameSize: checked, ...(checked ? { testFontSize: s.fontSize } : {}) }));
                }}
              />
              Same Size In Both Boxes
            </label>
            <div className="s1new-font-row">
              <button
                className="s1new-font-btn minus"
                onClick={() => setSettings(s => ({ ...s, fontSize: Math.max(10, s.fontSize - 2), testFontSize: s.sameSize ? Math.max(10, s.fontSize - 2) : s.testFontSize }))}
              >A-</button>
              <span className="s1new-font-value">{settings.fontSize}</span>
              <button
                className="s1new-font-btn plus"
                onClick={() => setSettings(s => ({ ...s, fontSize: s.fontSize + 2, testFontSize: s.sameSize ? s.fontSize + 2 : s.testFontSize }))}
              >A+</button>
            </div>
            <label className="s1new-checkbox-label">
              <input type="checkbox" checked={settings.autoScroll} onChange={(e) => setSettings({ ...settings, autoScroll: e.target.checked })} />
              Auto Scroll
            </label>
            <label className="s1new-checkbox-label">
              <input type="checkbox" checked={settings.highlightWord} onChange={(e) => setSettings({ ...settings, highlightWord: e.target.checked })} />
              Highlight Word
            </label>
            <label className="s1new-checkbox-label">
              <input type="checkbox" checked={settings.highlightError} onChange={(e) => setSettings({ ...settings, highlightError: e.target.checked })} />
              Highlight Error
            </label>
          </div>

          <div className="s1new-card" style={settingsLockStyle}>
            <div className="s1new-card-title">
              <span className="s1new-gear">⚙</span> Backspace Settings
            </div>
            <label className="s1new-radio-label">
              <input type="checkbox" checked={settings.backspaceControl === 'No Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'No Backspace' })} />
              No Backspace
            </label>
            <label className="s1new-radio-label">
              <input type="checkbox" checked={settings.backspaceControl === 'Current Word Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'Current Word Backspace' })} />
              Current Word Backspace
            </label>
            <label className="s1new-radio-label">
              <input type="checkbox" checked={settings.backspaceControl === 'Two Word Backspace' || settings.backspaceControl === 'Two Words Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'Two Word Backspace' })} />
              Two Word Backspace
            </label>
            <label className="s1new-radio-label">
              <input type="checkbox" checked={settings.backspaceControl === 'Full Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'Full Backspace' })} />
              Full Backspace
            </label>
            <div className="s1new-practice-note">Only For Practice</div>
          </div>

          <button className="btn-close-settings-mobile mobile-only" onClick={() => setMobileSettingsOpen(false)}>Save Settings</button>
        </div>
      </div>
    );
  }

  // ─── Screen 3 (SSC-style Full Width) Render ────────────────────────────────
  if (screenType === 'Screen-3') {
    const s3FontFamily = (isKrutiDev || isMangal || isRemington)
      ? hindiFontFamily
      : (settings.s3Font === 'Courier New' ? "'Courier New', monospace" : "'Calibri', 'Segoe UI', sans-serif");

    const s3Passage = (
      <div className="s3new-text" style={{ fontSize: `${settings.testFontSize}px`, fontFamily: s3FontFamily }}>
        <div className="text-display">{renderWords()}</div>
      </div>
    );

    const s3Textarea = (
      <textarea
        className="s3new-typing-input"
        style={{ fontFamily: s3FontFamily, fontSize: `${settings.fontSize}px` }}
        autoFocus
        value={userInput}
        onKeyDown={handleEnglishKeyDown}
        onChange={isPaused ? undefined : (isMangal ? handleMangalChange : handleEnglishChange)}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={isMangal ? handleCompositionEnd : undefined}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        lang={isMangal ? 'hi' : 'en'}
        disabled={timeLeft === 0}
        readOnly={isPaused}
        placeholder="Start Typing Here.."
        rows={5}
      />
    );

    return (
      <div className="s3new-layout">
        <div className="s3new-frame">
          {/* Top bar */}
          <div className="s3new-topbar">
            <div className="s3new-topbar-left">
              <button
                className="s3new-blue-btn"
                onClick={() => setShowInstructions(s => !s)}
              >
                How To Type This
              </button>
              <label className="s3new-radio">
                <input
                  type="radio"
                  name="s3-font"
                  checked={(settings.s3Font || 'Calibri') === 'Calibri'}
                  onChange={() => setSettings(s => ({ ...s, s3Font: 'Calibri' }))}
                />
                <span>Calibri</span>
              </label>
              <label className="s3new-radio">
                <input
                  type="radio"
                  name="s3-font"
                  checked={settings.s3Font === 'Courier New'}
                  onChange={() => setSettings(s => ({ ...s, s3Font: 'Courier New' }))}
                />
                <span>Courier New</span>
              </label>
            </div>

            <div className="s3new-topbar-center">
              <span className="s3new-time-label">Remaining Time:</span>
              <span className="s3new-time-value">{formatTime(timeLeft)}</span>
            </div>

            <div className="s3new-topbar-right">
              <button
                className="s3new-blue-btn"
                onClick={() => { if (!isStarted) setIsStarted(true); }}
                disabled={isStarted}
              >
                {isStarted ? 'Started' : 'Start'}
              </button>
              <button className="s3new-blue-btn" onClick={toggleFullScreen}>
                {isFullscreen ? 'Normal Screen(esc)' : 'Full Screen(esc)'}
              </button>
            </div>
          </div>

          {/* Passage card */}
          {!settings.paperMode && (
            <div className="s3new-card s3new-passage-card" style={{ position: 'relative' }}>
              {s3Passage}
              {isPaused && (
                <div className="s3new-pause-overlay">
                  <div style={{ fontSize: '2rem' }}>⏸</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>Test Paused</div>
                </div>
              )}
            </div>
          )}

          {/* Input card */}
          <div className="s3new-card s3new-input-card" style={settings.paperMode ? { flex: 1 } : {}}>
            {s3Textarea}
          </div>

          {/* Submit at bottom */}
          <div className="s3new-submit-row">
            <button className="s3new-submit-btn" onClick={() => handleFinish()}>Submit Test</button>
          </div>
        </div>

        {showInstructions && (
          <div className="s3new-modal-overlay" onClick={() => setShowInstructions(false)}>
            <div className="s3new-modal" onClick={(e) => e.stopPropagation()}>
              <div className="s3new-modal-head">
                <span>How To Type This</span>
                <button className="s3new-modal-close" onClick={() => setShowInstructions(false)}>✕</button>
              </div>
              <ul className="s3new-modal-list">
                <li>Read the passage shown in the upper box.</li>
                <li>Click <strong>Start</strong> to begin the timer, then type the passage in the lower box.</li>
                <li>Use the radio buttons to switch between <em>Calibri</em> and <em>Courier New</em>.</li>
                <li>Press <strong>esc</strong> or click <em>Normal Screen</em> to exit full screen.</li>
                <li>Click <strong>Submit Test</strong> when you're done — the result will be saved automatically.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Screen 6 (DSSSB-style: topbar + show-text toggle + full textarea) ────────
  if (screenType === 'Screen-6') {
    const userName = localStorage.getItem('name') || localStorage.getItem('username') || 'Student';

    return (
      <div className="s6-layout">
        {/* ── Top Bar ── */}
        <div className="s6-topbar">
          <div className="s6-topbar-left">
            <span className="s6-label">Total Time</span>
            <span className="s6-time-val">{exam?.test_time_minutes ?? 10} Mins</span>
          </div>
          <div className="s6-topbar-btns">
            <button className="s6-btn s6-btn-finish" onClick={() => handleFinish()}>Finish</button>
            <button
              className="s6-btn s6-btn-pause"
              onClick={handlePause}
              disabled={!isPaused && pauseCount >= MAX_PAUSES}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
          <div className="s6-topbar-center">
            <span className="s6-exam-name">{exam?.name || 'TYPING TEST'}</span>
          </div>
          <div className="s6-topbar-right">
            <span className="s6-label">Name :</span>
            <span className="s6-name-val">{userName}</span>
            <span className="s6-label s6-time-remaining">{formatTime(timeLeft)}</span>
          </div>
          <button className="s6-btn s6-btn-exit" onClick={() => navigate('/dashboard')}>Exit</button>
        </div>

        {/* ── Sub Bar: Show Text toggle + warning ── */}
        <div className="s6-subbar">
          <label className="s6-show-text-label">
            <input
              type="checkbox"
              className="s6-show-text-checkbox"
              checked={s6ShowText}
              onChange={(e) => setS6ShowText(e.target.checked)}
            />
            Show Text
          </label>
          <span className="s6-repeat-notice">
            Passage Repetition Is Available Here For Pratice. In The Real Exam, It Is Allowed Only If Specified In the Exam Notification
          </span>
        </div>

        {/* ── Passage (shown only when Show Text is checked) ── */}
        {s6ShowText && (
          <div className="s6-passage" style={{ fontSize: `${settings.testFontSize}px`, fontFamily: hindiFontFamily }}>
            <div className="text-display">{renderWords()}</div>
          </div>
        )}

        {/* ── Full-height Typing Area ── */}
        <div className="s6-input-wrap">
          <textarea
            className="s6-typing-input"
            style={{ fontFamily: hindiFontFamily, fontSize: `${settings.fontSize}px` }}
            autoFocus
            value={userInput}
            onKeyDown={handleEnglishKeyDown}
            onChange={isPaused ? undefined : (isMangal ? handleMangalChange : handleEnglishChange)}
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={isMangal ? handleCompositionEnd : undefined}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            lang={isMangal ? 'hi' : 'en'}
            disabled={timeLeft === 0}
            readOnly={isPaused}
            placeholder=""
          />
          {isPaused && (
            <div className="s6-pause-overlay">
              <div style={{ fontSize: '2rem' }}>⏸</div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>Test Paused</div>
              <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Click Resume to continue</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Screen 4 (Line by Line) Exact Render ───────────────────────────────────
  if (screenType === 'Screen-4') {
    const s4WordsPerLine = 15;
    const currentLineIndex = Math.floor(currentWordIndex / s4WordsPerLine);
    const totalLines = Math.ceil(words.length / s4WordsPerLine);
    
    const offset = currentLineIndex * s4WordsPerLine;
    const lineWords = words.slice(offset, offset + s4WordsPerLine);

    const renderS4Line = () => {
      return lineWords.map((word, idx) => {
        const globalIdx = offset + idx;
        const status = wordStatuses[globalIdx];
        let className = 'word ';
        if (settings.highlightError) {
          if (status === 'correct') className += 'correct';
          else if (status === 'error') className += 'error';
          else if (status === 'half-error') className += 'half-error';
        }
        
        if (globalIdx === currentWordIndex) {
          className += ' active-word s4-active-word';
        }
        return (
          <span key={globalIdx} className={className}>
            {word}{' '}
          </span>
        );
      });
    };

    const navigateS4 = (direction) => {
      setUserInput('');
      setCurrentWordIndex(prev => {
        if (direction === 'prevLine') return Math.max(0, prev - s4WordsPerLine);
        if (direction === 'nextLine') return Math.min(words.length - 1, prev + s4WordsPerLine);
        if (direction === 'left')    return Math.max(0, prev - 1);
        if (direction === 'right')   return Math.min(words.length - 1, prev + 1);
        return prev;
      });
      setTimeout(() => s4InputRef.current?.focus(), 0);
    };

    const handleS4KeyDown = (e) => {
      if (isPaused) { e.preventDefault(); return; }
      if (e.key === 'ArrowUp')    { e.preventDefault(); navigateS4('prevLine'); return; }
      if (e.key === 'ArrowDown')  { e.preventDefault(); navigateS4('nextLine'); return; }
      if (e.key === 'Enter')      { e.preventDefault(); navigateS4('nextLine'); return; }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigateS4('left');     return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigateS4('right');    return; }
      handleEnglishKeyDown(e);
    };

    return (
      <div className="s4-layout">
        <div className="s4-topbar">
          <div className="s4-topbar-left">
            <h1 className="s4-main-title">RPSC LDC ENGLISH TYPING</h1>
            <div className="s4-sub-title">Typing Test from Balaji Typing &amp; Steno College</div>
          </div>
          <div className="s4-topbar-right">
            <div className="s4-bell-icon">🔔</div>
          </div>
        </div>
        
        <div className="s4-timer-bar">
          <div className="s4-timer-col">
            <div className="s4-timer-text">{formatTime(timeLeft)}</div>
            <button className="s4-skip-btn" onClick={() => handleFinish()}>Skip Section</button>
          </div>
        </div>

        <div className="s4-main-content">
          <div className="s4-read-label">
            Read Line no {currentLineIndex + 1} / {totalLines}
          </div>
          <div className="s4-passage-box" style={{ fontSize: `${settings.testFontSize}px`, fontFamily: hindiFontFamily }}>
            {renderS4Line()}
          </div>

          <div className="s4-type-label-row">
            <div className="s4-type-label-left">Type Line no {currentLineIndex + 1} / {totalLines}</div>
            <div className="s4-type-label-right">You can use Enter key to go next line...</div>
          </div>
          
          <div className="s4-input-row">
            <div className="s4-input-col">
              <input
                ref={s4InputRef}
                className="s4-typing-input"
                style={{ fontSize: `${settings.fontSize}px`, fontFamily: hindiFontFamily }}
                autoFocus
                value={userInput}
                onKeyDown={handleS4KeyDown}
                onChange={isMangal ? handleMangalChange : handleEnglishChange}
                onCompositionStart={() => { isComposingRef.current = true; }}
                onCompositionEnd={isMangal ? handleCompositionEnd : undefined}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                lang={isMangal ? 'hi' : 'en'}
                disabled={timeLeft === 0}
                readOnly={false}
              />
              <div className="s4-font-controls" style={isFullscreen ? { display: 'none' } : settingsLockStyle}>
                <button className="s4-btn-font" onClick={() => setSettings(s => ({ ...s, fontSize: Math.max(10, s.fontSize - 2), testFontSize: s.sameSize ? Math.max(10, s.fontSize - 2) : s.testFontSize }))}>A-</button>
                <button className="s4-btn-font" onClick={() => setSettings(s => ({ ...s, fontSize: s.fontSize + 2, testFontSize: s.sameSize ? s.fontSize + 2 : s.testFontSize }))}>A+</button>
              </div>
            </div>

            <div className="s4-dpad-col">
              <div className="s4-dpad-container">
                <div className="s4-dpad-top">
                   <div className="s4-dpad-key-wrap">
                      <div className="s4-dpad-label">Prev. Line</div>
                      <button className="s4-dpad-key" onClick={() => navigateS4('prevLine')}>↑</button>
                   </div>
                </div>
                <div className="s4-dpad-mid">
                   <div className="s4-dpad-key-wrap">
                      <div className="s4-dpad-label">Go Left</div>
                      <button className="s4-dpad-key" onClick={() => navigateS4('left')}>←</button>
                   </div>
                   <div className="s4-dpad-key-wrap">
                      <button className="s4-dpad-key" onClick={() => navigateS4('nextLine')}>↓</button>
                      <div className="s4-dpad-label">Next Line</div>
                   </div>
                   <div className="s4-dpad-key-wrap">
                      <div className="s4-dpad-label">Go Right</div>
                      <button className="s4-dpad-key" onClick={() => navigateS4('right')}>→</button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Default Screens 1, 3 ────────────────────────────────────────────────────
  return (
    <div className={`test-engine-layout layout-${screenType} ${isStrictMode ? 'strict-mode' : ''}`}>
      {/* Mobile Settings Toggle */}
      <button 
        className="mobile-settings-fab" 
        onClick={() => setMobileSettingsOpen(true)}
        aria-label="Open Settings"
      >
        ⚙️
      </button>

      {/* Overlay to close settings on click outside */}
      {mobileSettingsOpen && (
        <div className="mobile-settings-overlay" onClick={() => setMobileSettingsOpen(false)}></div>
      )}

      <div className="test-topbar">
        <div className="topbar-left">
          <button className="btn-test-back" onClick={() => navigate('/dashboard')}>← Exit</button>
          <h2 className="test-exam-name">{exam?.name || 'Practice Mode'} {mode ? `— ${mode}` : ''}</h2>
        </div>
        <div className="topbar-center">
          <div className="timer-box">
            <span className="timer-countdown">Time Left : {formatTime(timeLeft)}</span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="student-badge">
            <div className="student-photo-placeholder">
              {profileImageUrl
                ? <img src={profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} onError={(e) => { e.target.style.display = 'none'; }} />
                : '👤'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>{localStorage.getItem('name') || localStorage.getItem('username') || 'Student'}</div>
          </div>
        </div>
      </div>

      <div className="test-main-content">
        <div className="typing-section">
          {(isKrutiDev || isMangal || isRemington) && renderHindiModeBanner()}

          {isLineByLine && (
            <div style={{ padding: '10px 0', fontSize: '0.9rem', color: '#666', borderBottom: '1px solid #ccc', marginBottom: '10px' }}>
              Read Line no. {currentLineIndex + 1}/{Math.ceil(words.length / wordsPerLine)}
            </div>
          )}

          {!settings.paperMode && (
            <div className="source-text-container" style={{ fontSize: `${settings.testFontSize}px`, fontFamily: hindiFontFamily }}>
              {isSelfAssessment && timeElapsed === 0 && !passedChapter?.content_text ? (
                <textarea
                   className="typing-input"
                   placeholder="Paste your custom text here before typing begins..."
                   value={chapter?.content_text || ''}
                   onChange={(e) => {
                     const txt = e.target.value;
                     setChapter({ ...chapter, content_text: txt });
                     setWords(txt.split(/\s+/).filter(w => w.length > 0));
                   }}
                   style={{ width: '100%', height: '100%', resize: 'none', border: 'none', outline: 'none', background: 'transparent', padding: '10px', fontFamily: hindiFontFamily, fontSize: `${settings.testFontSize}px`, color: '#333' }}
                />
              ) : (
                <div className="text-display">{renderWords()}</div>
              )}
            </div>
          )}

          {!settings.paperMode && isLineByLine && (
            <div style={{ padding: '10px 0', fontSize: '0.9rem', color: '#666', borderBottom: '1px solid #ccc', marginBottom: '10px' }}>
              Line {currentLineIndex + 1}/{Math.ceil(words.length / wordsPerLine)}
              <span style={{ float: 'right' }}>Press Space to advance →</span>
            </div>
          )}

          <div className="input-container" style={{ fontSize: `${settings.fontSize}px`, flex: settings.paperMode ? '1' : undefined }}>
            <textarea
              className="typing-input"
              style={{ fontFamily: hindiFontFamily, fontSize: `${settings.fontSize}px` }}
              autoFocus
              value={userInput}
              onKeyDown={handleEnglishKeyDown}
              onChange={isMangal ? handleMangalChange : handleEnglishChange}
              // MANGAL: handle IME composition lifecycle
              onCompositionStart={() => { isComposingRef.current = true; }}
              onCompositionEnd={isMangal ? handleCompositionEnd : undefined}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              lang={isMangal ? 'hi' : 'en'}
              disabled={timeLeft === 0}
              readOnly={false}
              rows={5}
            />
          </div>
          <button className="btn-submit-final mobile-only mobile-submit-test" onClick={() => handleFinish()}>Submit Test</button>
        </div>

        {screenType !== 'Screen-3' && !isFullscreen && (
          <div className={`settings-sidebar ${mobileSettingsOpen ? 'open' : ''}`}>
            {screenType === 'Screen-1' ? (
              <div className="crpf-sidebar">
                <SettingsLockBanner />
                <fieldset className="setting-fieldset" style={settingsLockStyle}>
                  <legend>Setting</legend>
                  <div className="practice-warning">Only for practice</div>
                  <label className="checkbox-label">
                    <input type="checkbox"
                      checked={settings.sameSize}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSettings(s => ({ ...s, sameSize: checked, ...(checked ? { testFontSize: s.fontSize } : {}) }));
                      }}
                    /> Same Size in both boxes
                  </label>
                  <div className="font-size-controls">
                    <button className="btn-font minus" onClick={() => setSettings(s => ({ ...s, fontSize: Math.max(10, s.fontSize - 2), testFontSize: s.sameSize ? Math.max(10, s.fontSize - 2) : s.testFontSize }))}>A-</button>
                    <span className="font-size-display">{settings.fontSize}</span>
                    <button className="btn-font plus" onClick={() => setSettings(s => ({ ...s, fontSize: s.fontSize + 2, testFontSize: s.sameSize ? s.fontSize + 2 : s.testFontSize }))}>A+</button>
                  </div>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={settings.autoScroll} onChange={(e) => setSettings({ ...settings, autoScroll: e.target.checked })} /> Auto Scroll
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={settings.highlightWord} onChange={(e) => setSettings({ ...settings, highlightWord: e.target.checked })} /> Highlight Word
                  </label>
                </fieldset>
                <fieldset className="setting-fieldset" style={{ marginTop: '25px', ...settingsLockStyle }}>
                  <legend>BackSpace Settings</legend>
                  <label className="radio-label"><input type="radio" name="bs" checked={settings.backspaceControl === 'No Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'No Backspace' })} /> No Backspace</label>
                  <label className="radio-label"><input type="radio" name="bs" checked={settings.backspaceControl === 'Current Word Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'Current Word Backspace' })} /> Current Word Backspace</label>
                  <label className="radio-label"><input type="radio" name="bs" checked={settings.backspaceControl === 'Two Word Backspace' || settings.backspaceControl === 'Two Words Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'Two Word Backspace' })} /> Two Word Backspace</label>
                  <label className="radio-label"><input type="radio" name="bs" checked={settings.backspaceControl === 'Full Backspace'} onChange={() => setSettings({ ...settings, backspaceControl: 'Full Backspace' })} /> Full Backspace</label>
                  <div className="practice-warning" style={{ marginTop: '15px', textAlign: 'center' }}>Only for practice</div>
                </fieldset>

                {isSelfAssessment && timeElapsed === 0 && !passedChapter?.content_text && (
                  <fieldset className="setting-fieldset" style={{ marginTop: '25px' }}>
                    <legend>Assessment Setup</legend>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#333' }}>Typing Font</label>
                      <select 
                        value={selfAssessmentFont} 
                        onChange={e => setSelfAssessmentFont(e.target.value)}
                        style={{ width: '100%', padding: '6px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                      >
                        <option value="English Typing">English Typing</option>
                        <option value="Hindi Mangal">Hindi Mangal</option>
                        <option value="Hindi Kruti Dev">Hindi Kruti Dev</option>
                        <option value="Hindi Remington (GAIL)">Hindi Remington (GAIL)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#333' }}>Test Time (Minutes)</label>
                      <input 
                        type="number" 
                        value={timeLeft / 60} 
                        onChange={e => {
                           const mins = Math.max(1, parseInt(e.target.value) || 1);
                           setTimeLeft(mins * 60);
                           setChapter({ ...chapter, time_minutes: mins });
                        }}
                        style={{ width: '100%', padding: '6px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                      />
                    </div>
                  </fieldset>
                )}
              </div>
            ) : (
              <>
                <h3>{screenType === 'Screen-4' ? 'Student Profile' : 'Setting'}</h3>
                {screenType === 'Screen-4' && (
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontWeight: 'bold', margin: '10px 0' }}>{localStorage.getItem('name') || localStorage.getItem('username') || 'Student'}</div>
                    {localStorage.getItem('roll_no') && (
                      <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '6px' }}>Roll No: {localStorage.getItem('roll_no')}</div>
                    )}
                    <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #ddd' }} />
                  </div>
                )}
                <div className="protocol-card">
                  <div className="protocol-item"><span>Target Speed</span><strong>{pattern?.required_speed || 35} WPM</strong></div>
                  <div className="protocol-item"><span>Half Mistakes</span><strong>{pattern?.half_mistake_enabled ? 'Counted (0.5)' : 'Ignored'}</strong></div>
                  <div className="protocol-item"><span>Penalty</span><strong>{pattern?.penalty_value || 1} {pattern?.penalty_type || 'Word'}</strong></div>
                  <div className="protocol-item"><span>Mode</span><strong>{mode || exam?.test_paper_screen || 'English'}</strong></div>
                </div>
              </>
            )}
            <button className="btn-submit-final desktop-only" onClick={() => handleFinish()} style={{ marginTop: 'auto' }}>Submit Test</button>
            <button className="btn-close-settings-mobile mobile-only" onClick={() => setMobileSettingsOpen(false)}>Save Settings</button>
          </div>
        )}

        {screenType === 'Screen-3' && (
          <div style={{ position: 'absolute', bottom: '20px', right: '40px' }}>
            <button className="btn-submit-final" style={{ padding: '10px 40px' }} onClick={() => handleFinish()}>Submit</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestEngine;
