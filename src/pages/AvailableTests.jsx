import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardNav from '../components/DashboardNav';
import Header from '../components/Header';
import { chapterService, userService, resultService, offlineTestService, getCurrentUserUuid } from '../services/api';
import { API_BASE_URL } from '../config';
import './StudentDashboard.css';
import './AvailableTests.css';

const MAX_REATTEMPTS = 3;

// Default number of unlocked tests when the admin hasn't set a per-student limit.
const DEFAULT_PRELOAD_LIMIT = 10;
const DEFAULT_STENO_LIMIT = 10;

// Convert a Blob to a base64 string (no data: prefix) for IPC audio storage.
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const AvailableTests = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { selectedMode, testType, selectedExam } = location.state || {};
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userProfile, setUserProfile] = useState(null);
  const [attemptsByChapter, setAttemptsByChapter] = useState({});
  const [resultsByChapter, setResultsByChapter] = useState({});
  const [rankByChapter, setRankByChapter] = useState({});
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [downloadStatus, setDownloadStatus] = useState('idle'); // idle | saving | saved | error

  const moduleType = localStorage.getItem('moduleType') || 'typing';
  const isStenoMode = selectedMode === 'Steno English' || selectedMode === 'Steno Hindi';

  // Download + cache the dictation audio for each Steno chapter so the test can
  // be taken fully offline. No-op for non-Steno modes or outside Electron.
  const cacheStenoAudio = async (chaptersList) => {
    if (!isStenoMode || !window.electronAPI?.saveAudio) return;
    const token = localStorage.getItem('token');
    for (const ch of chaptersList) {
      if (!ch?.id) continue;
      try {
        if (window.electronAPI.hasAudio) {
          const { exists } = await window.electronAPI.hasAudio(ch.id);
          if (exists) continue; // already saved locally
        }
        const res = await fetch(`${API_BASE_URL}/chapters/${ch.id}/audio`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) continue; // chapter has no audio attached
        const base64 = await blobToBase64(await res.blob());
        await window.electronAPI.saveAudio(ch.id, base64);
      } catch (err) {
        console.warn('[Offline Audio] Could not cache chapter', ch.id, err?.message);
      }
    }
  };

  // Track online/offline transitions
  useEffect(() => {
    const goOnline  = () => { setIsOffline(false); resultService.syncOfflineResults(); };
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (!selectedMode || !testType || !selectedExam) {
      navigate('/dashboard');
      return;
    }
    // Sync any pending offline results when coming online
    if (navigator.onLine) resultService.syncOfflineResults();
    fetchChapters();
  }, [selectedMode, testType, selectedExam, navigate]);

  // Auto-save preloaded chapters for offline use whenever they load while online
  useEffect(() => {
    if (testType === 'Pre-load Test' && navigator.onLine && chapters.length > 0) {
      (async () => {
        try {
          const existing = await offlineTestService.getTests();
          const alreadySaved = (existing.tests || []).some(t =>
            t.examId === selectedExam?.id && t.mode === selectedMode && t.testType === testType
          );
          if (alreadySaved) return;
          const others = (existing.tests || []).filter(t =>
            !(t.examId === selectedExam?.id && t.mode === selectedMode && t.testType === testType)
          );
          await offlineTestService.saveTests([...others, {
            examId: selectedExam.id, mode: selectedMode, testType,
            exam: selectedExam, chapters, saved_at: new Date().toISOString(),
          }]);
          // Cache dictation audio alongside the chapters so Steno works offline.
          await cacheStenoAudio(chapters);
          console.log('[Auto-Offline] Saved', selectedExam?.name, 'for offline use.');
        } catch (err) {
          console.warn('[Auto-Offline] Could not save:', err);
        }
      })();
    }
  }, [chapters, testType]);

  const fetchChapters = async () => {
    try {
      setLoading(true);

      // ── Offline path ──────────────────────────────────────────────────────
      if (!navigator.onLine) {
        if (testType === 'Live Test') {
          // Live tests require an internet connection — do not load anything
          setChapters([]);
          setLoading(false);
          return;
        }
        // Load the cached profile (served from the offline cache) so the
        // admin-set test limits still apply while offline.
        const offlineProfile = await userService.getProfile().catch(() => null);
        if (offlineProfile) setUserProfile(offlineProfile);
        const offlineData = await offlineTestService.getTests();
        const entry = (offlineData.tests || []).find(t =>
          t.examId === selectedExam.id &&
          t.mode   === selectedMode     &&
          t.testType === testType
        );
        if (entry) {
          setChapters(entry.chapters || []);
        } else {
          setChapters([]);
          console.warn('[Offline] No preloaded tests found for this exam.');
        }
        setLoading(false);
        return;
      }

      // ── Online path ───────────────────────────────────────────────────────
      const userId = getCurrentUserUuid() || localStorage.getItem('userId');
      const [data, profileData, userResults] = await Promise.all([
        chapterService.getChapters(selectedMode, testType, selectedExam.id),
        userService.getProfile().catch(() => null),
        userId ? resultService.getUserResults(userId).catch(() => []) : Promise.resolve([])
      ]);
      setChapters(data);
      if (profileData) setUserProfile(profileData);

      // Track attempts + best result per chapter for the current user
      const counts = {};
      const bestByChapter = {};
      (userResults || []).forEach(r => {
        if (!r.chapter_id) return;
        counts[r.chapter_id] = (counts[r.chapter_id] || 0) + 1;
        const prev = bestByChapter[r.chapter_id];
        if (!prev || Number(r.nwpm) > Number(prev.nwpm)) {
          bestByChapter[r.chapter_id] = r;
        }
      });
      setAttemptsByChapter(counts);
      setResultsByChapter(bestByChapter);

      // Fetch rank for each chapter the user has attempted
      if (userId) {
        const rankEntries = await Promise.all(
          Object.keys(bestByChapter).map(async (chapterId) => {
            try {
              const info = await resultService.getChapterRank(chapterId, userId);
              return [chapterId, info];
            } catch {
              return [chapterId, null];
            }
          })
        );
        const ranks = {};
        rankEntries.forEach(([id, info]) => { if (info) ranks[id] = info; });
        setRankByChapter(ranks);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadOffline = async () => {
    if (chapters.length === 0) return;
    try {
      setDownloadStatus('saving');
      const existing = await offlineTestService.getTests();
      const others = (existing.tests || []).filter(t =>
        !(t.examId === selectedExam.id && t.mode === selectedMode && t.testType === testType)
      );
      const entry = {
        examId:    selectedExam.id,
        mode:      selectedMode,
        testType,
        exam:      selectedExam,
        chapters,
        saved_at:  new Date().toISOString(),
      };
      await offlineTestService.saveTests([...others, entry]);
      // Steno tests also need their audio stored locally for offline practice.
      await cacheStenoAudio(chapters);
      setDownloadStatus('saved');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch (err) {
      console.error('[Download Offline] Failed:', err);
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    }
  };

  const handleViewResult = (chapter) => {
    const r = resultsByChapter[chapter.id];
    if (!r) return;
    // Only steno results use the StenoDiff view (driven by typedText + referenceText).
    // Typing results must leave these unset so ResultScreen renders the full
    // TypingPassageReview with its Test Analysis / Mistake / Compare tabs.
    const isSteno = (r.mode || '').toLowerCase().includes('steno');
    // Full uploaded passage so the "Original Passage" column shows the complete text,
    // not just the (possibly trimmed) reference_words the student reached.
    const fullPassage = chapter?.content_text || (r.reference_words ? r.reference_words.join(' ') : '');
    navigate('/result', {
      state: {
        gwpm: r.gwpm,
        nwpm: r.nwpm,
        accuracy: r.accuracy,
        fullErrors: r.full_errors,
        halfErrors: r.half_errors,
        totalStrokes: r.total_strokes,
        timeElapsed: r.time_elapsed,
        testDurationMinutes: r.exam?.test_time_minutes || chapter?.time_minutes || undefined,
        exam_name: r.exam?.name || selectedExam?.name || 'Live Test',
        chapter_no: chapter?.chapter_no || null,
        date_taken: r.date_taken,
        mode: r.mode,
        userInput: r.user_input,
        referenceWords: r.reference_words || [],
        wordStatuses: r.word_statuses || [],
        pattern: r.pattern_data,
        originalPassage: fullPassage,
        ...(isSteno ? { typedText: r.user_input, referenceText: fullPassage } : {}),
      },
    });
  };

  const handleReAttempt = () => {
    if (filteredChapters.length === 0) {
      alert('No tests available to re-attempt.');
      return;
    }
    // Find a chapter the user has already attempted but hasn't hit the limit on
    const eligible = filteredChapters.find(c => {
      const used = attemptsByChapter[c.id] || 0;
      return used > 0 && used < MAX_REATTEMPTS;
    });
    if (eligible) {
      handleStartTest(eligible);
      return;
    }
    // Otherwise just (re)start the first available
    const firstUnlocked = filteredChapters.find((_, idx) => idx < unlockedCount);
    if (firstUnlocked) {
      handleStartTest(firstUnlocked);
    } else {
      alert('You have used all your re-attempts. Please contact your administrator.');
    }
  };

  const handleStartTest = (chapter) => {
    const isSteno = selectedMode === 'Steno English' || selectedMode === 'Steno Hindi';
    navigate(isSteno ? '/steno-test' : '/test', {
      state: {
        exam: selectedExam,
        chapter: chapter,
        mode: selectedMode,
        testType: testType
      }
    });
  };

  const shiftDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isLiveTest = testType === 'Live Test';

  // Natural/numeric sort so tests appear in sequential order (CH-4, CH-5 … CH-34,
  // CH-35) instead of lexicographically shuffled (CH-34, CH-4, CH-40, CH-5 …).
  const sortByChapterNo = (a, b) =>
    String(a.chapter_no ?? '').localeCompare(String(b.chapter_no ?? ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    });

  // Date filter applies ONLY for Live Tests
  const filteredChapters = (isLiveTest
    ? chapters.filter((chapter) => {
        if (!chapter.test_date) return true;
        const cDate = new Date(chapter.test_date);
        return (
          cDate.getDate()     === selectedDate.getDate()     &&
          cDate.getMonth()    === selectedDate.getMonth()    &&
          cDate.getFullYear() === selectedDate.getFullYear()
        );
      })
    : [...chapters] // Pre-load: show all, no date filter
  ).sort(sortByChapterNo);

  // Determine how many tests are unlocked for the user. Default is 1 if not set by admin.
  const unlockedCount = userProfile?.live_tests_limit ?? 1;

  // Pre-load tests (typing) and Steno tests each have their own admin-set limit.
  // Steno mode uses steno_tests_limit; other pre-load tests use preload_tests_limit.
  const preloadUnlockedCount = isStenoMode
    ? (userProfile?.steno_tests_limit ?? DEFAULT_STENO_LIMIT)
    : (userProfile?.preload_tests_limit ?? DEFAULT_PRELOAD_LIMIT);

  return (
    <div className="dashboard-page-container">
      <Header />
      
      <div className="dashboard-welcome-bar">
        <div className="welcome-text-content">
          <h2>Available Tests</h2>
          <p>Browse and practice exercises for {selectedMode}</p>
        </div>
      </div>

      <div className="dashboard-layout">
        <DashboardNav />

        <div className="available-tests-wrapper">
          <button
            className="custom-tab-btn"
            style={{ marginBottom: '10px', backgroundColor: '#e2e8f0', color: '#334155', padding: '6px 14px', fontSize: '0.85rem' }}
            onClick={() => navigate('/dashboard')}
          >
            &larr; Back to Dashboard
          </button>

          <div className="page-header">
            <h1>{testType === 'Live Test' ? 'Live Test' : testType}</h1>
            <p>Take Tests Daily & Improve Your Speed & Accuracy</p>
          </div>

          {/* ── Offline banner for Live Tests ──────────────────────────── */}
          {isOffline && isLiveTest && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '14px 18px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: 600 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Please connect to the internet to access Live Tests.
            </div>
          )}

          {/* ── Offline banner for Preloaded Tests ─────────────────────── */}
          {isOffline && !isLiveTest && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 16px', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              You are offline. Showing locally saved tests. Results will not be stored in the database.
            </div>
          )}

          {/* ── Save for Offline button — Preloaded + online only ───────── */}
          {!isLiveTest && !isOffline && chapters.length > 0 && (
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleDownloadOffline}
                disabled={downloadStatus === 'saving'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  background: downloadStatus === 'saved' ? '#f0fdf4' : downloadStatus === 'error' ? '#fef2f2' : '#eff6ff',
                  color:      downloadStatus === 'saved' ? '#166534' : downloadStatus === 'error' ? '#dc2626' : '#1d4ed8',
                  borderColor: downloadStatus === 'saved' ? '#86efac' : downloadStatus === 'error' ? '#fca5a5' : '#bfdbfe',
                  opacity: downloadStatus === 'saving' ? 0.7 : 1,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {downloadStatus === 'saving' ? 'Saving...' : downloadStatus === 'saved' ? '✓ Saved for Offline' : downloadStatus === 'error' ? '✗ Save Failed' : 'Save for Offline Use'}
              </button>
            </div>
          )}

          {/* Date selector — Live Test only */}
          {isLiveTest && (
            <div className="date-selector-bar">
              <button className="date-btn" onClick={() => shiftDate(-1)}>&lt;</button>
              <div className="date-display">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <button className="date-btn" onClick={() => shiftDate(1)}>&gt;</button>
            </div>
          )}

          {/* ── Preloaded: Card Grid Layout ────────────────────────── */}
          {!isLiveTest && (
            <div className="preload-cards-grid">
              {loading ? (
                <p style={{ padding: '20px', textAlign: 'center', gridColumn: '1 / -1' }}>Loading available tests...</p>
              ) : filteredChapters.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center', gridColumn: '1 / -1', color: '#94a3b8' }}>No exercises found for {selectedMode}.</p>
              ) : (
                filteredChapters.map((chapter, index) => {
                  const isUnlocked = index < preloadUnlockedCount;
                  return (
                    <div key={chapter.id} className="preload-card">
                      <div className="preload-card-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="6" width="20" height="13" rx="2"/>
                          <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h4M18 14h.01"/>
                        </svg>
                      </div>
                      <div className="preload-card-title">Practice Test {chapter.chapter_no}</div>
                      {isUnlocked ? (
                        <button className="preload-card-btn" onClick={() => handleStartTest(chapter)}>
                          Start Test
                        </button>
                      ) : (
                        <button className="preload-card-btn" disabled title="Locked — contact your administrator to unlock more tests" style={{ background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          Locked
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Live Test: Table Layout ─────────────────────────────── */}
          {isLiveTest && (
            <div className="tests-table-container">
              {loading ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>Loading available tests...</p>
              ) : (
                <table className="tests-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Test No</th>
                      <th>Exam Name</th>
                      <th>Exam Start</th>
                      <th>Exam end</th>
                      <th>Language</th>
                      <th>Duration</th>
                      <th>Rank</th>
                      <th>Result</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChapters.length === 0 ? (
                      <tr>
                        <td colSpan={10}>
                          No live chapters found for {selectedMode} on this date.
                        </td>
                      </tr>
                    ) : (
                      filteredChapters.map((chapter, index) => {
                        const userResult = resultsByChapter[chapter.id];
                        const rankInfo = rankByChapter[chapter.id];
                        return (
                          <tr key={chapter.id}>
                            <td>{String(index + 1).padStart(2, '0')}</td>
                            <td><strong>{chapter.chapter_no}</strong></td>
                            <td>{selectedExam?.name}</td>
                            <td>12:00 AM</td>
                            <td>11:59 PM</td>
                            <td>{selectedMode.includes('Hindi') ? 'Hindi' : 'English'}</td>
                            <td>{selectedExam?.test_time_minutes} Min</td>
                            <td>
                              {rankInfo && rankInfo.rank
                                ? <span style={{ fontWeight: 600, color: '#0b4bcc' }}>{rankInfo.rank}{rankInfo.total ? ` / ${rankInfo.total}` : ''}</span>
                                : '-'}
                            </td>
                            <td>
                              {userResult ? (
                                <button
                                  onClick={() => handleViewResult(chapter)}
                                  style={{ background: '#0b4bcc', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                >
                                  View
                                </button>
                              ) : '-'}
                            </td>
                            <td>
                              {index < unlockedCount ? (
                                <button className="btn-start-table" onClick={() => handleStartTest(chapter)}>Start</button>
                              ) : (
                                <button className="btn-locked-table">
                                  Locked
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                  </svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <div className="info-cards-container">
            <div className="info-card green">
              <div className="info-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <h3>Daily Free Test(s)</h3>
              <p>You have {unlockedCount} unlocked test{unlockedCount !== 1 ? 's' : ''} available per day. Beyond this limit, tests remain locked unless updated by your administrator.</p>
            </div>
            <div className="info-card blue">
              <div className="info-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </div>
              <h3>About Results</h3>
              <p>Your latest result will be shown here. If you give the same test again, only the latest result will be displayed.</p>
            </div>
            <div className="info-card purple">
              <div className="info-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 21h8m-4-4v4m-5-4l-3-3m11 3l3-3M6 10h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h3>About Rank</h3>
              <p>Rank will be shown behind the result. Ranks are visible in the evening (7:00 PM To 10 PM) for all students who took the test throughout the day</p>
            </div>
          </div>

          {isLiveTest && (() => {
            // Compute attempts used across visible chapters
            const visibleIds = filteredChapters.map(c => c.id);
            const attemptsUsed = visibleIds.reduce((sum, id) => sum + (attemptsByChapter[id] || 0), 0);
            const maxAttemptsTotal = Math.max(1, filteredChapters.length) * MAX_REATTEMPTS;
            const remaining = Math.max(0, maxAttemptsTotal - attemptsUsed);
            const canReattempt = remaining > 0 && filteredChapters.length > 0;
            return (
              <div className="reattempt-banner">
                <div className="reattempt-left">
                  <div className="reattempt-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                    </svg>
                  </div>
                  <div className="reattempt-text">
                    <h3>Re-attempt Option</h3>
                    <p>You Can Re-Attempt A Test Upto {MAX_REATTEMPTS} Times</p>
                  </div>
                </div>
                <div className="reattempt-right">
                  <div className="attempts-left">Attempts Left: {remaining}/{maxAttemptsTotal}</div>
                  <button
                    className="btn-reattempt"
                    onClick={handleReAttempt}
                    disabled={!canReattempt}
                    style={!canReattempt ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    Re-Attempt
                  </button>
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
};

export default AvailableTests;
