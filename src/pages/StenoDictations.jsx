import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardNav from '../components/DashboardNav';
import Header from '../components/Header';
import api, { chapterService, offlineTestService } from '../services/api';
import './StenoDictations.css';

const StenoDictations = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { selectedMode, testType, selectedExam } = location.state || {};
  const resolvedTestType = testType || 'Pre-load Test';

  const [chapters,       setChapters]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [isOffline,      setIsOffline]      = useState(!navigator.onLine);
  const [downloadStatus, setDownloadStatus] = useState('idle'); // idle|saving|saved|error
  const [audioProgress,  setAudioProgress]  = useState('');    // e.g. "3 / 10"

  useEffect(() => {
    const goOnline  = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (!selectedMode || !selectedExam) {
      navigate('/dashboard');
      return;
    }
    fetchChapters();
  }, [selectedMode, selectedExam]);

  // Auto-save silently when online and chapters loaded (skip if already saved)
  useEffect(() => {
    if (navigator.onLine && chapters.length > 0) {
      (async () => {
        try {
          const existing = await offlineTestService.getTests();
          const alreadySaved = (existing.tests || []).some(t =>
            t.examId === selectedExam?.id &&
            t.mode   === selectedMode     &&
            t.testType === resolvedTestType
          );
          if (alreadySaved) return;
          await persistChapters();
          downloadAudioFiles(chapters).catch(() => {});
          console.log('[Steno Auto-Save] Saved chapters + queued audio for', selectedExam?.name);
        } catch (err) {
          console.warn('[Steno Auto-Save]', err);
        }
      })();
    }
  }, [chapters]);

  const fetchChapters = async () => {
    try {
      setLoading(true);

      // ── Offline: load from local store ────────────────────────────────────
      if (!navigator.onLine) {
        const offlineData = await offlineTestService.getTests();
        const entry = (offlineData.tests || []).find(t =>
          t.examId   === selectedExam.id  &&
          t.mode     === selectedMode     &&
          t.testType === resolvedTestType
        );
        setChapters(entry ? entry.chapters || [] : []);
        setLoading(false);
        return;
      }

      const data = await chapterService.getChapters(selectedMode, resolvedTestType, selectedExam.id);
      setChapters(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching steno chapters:', error);
      setChapters([]);
    } finally {
      setLoading(false);
    }
  };

  const persistChapters = async () => {
    const existing = await offlineTestService.getTests();
    const others = (existing.tests || []).filter(t =>
      !(t.examId === selectedExam.id && t.mode === selectedMode && t.testType === resolvedTestType)
    );
    await offlineTestService.saveTests([...others, {
      examId:    selectedExam.id,
      mode:      selectedMode,
      testType:  resolvedTestType,
      exam:      selectedExam,
      chapters,
      saved_at:  new Date().toISOString(),
    }]);
  };

  const downloadAudioFiles = async (chapterList) => {
    if (!window.electronAPI?.saveAudio) return;
    const token   = localStorage.getItem('token');
    const apiBase = api.defaults.baseURL || 'http://localhost:3012/api';
    let done = 0;
    for (const ch of chapterList) {
      try {
        const { exists } = await window.electronAPI.hasAudio(ch.id);
        if (exists) { done++; setAudioProgress(`${done} / ${chapterList.length}`); continue; }
        const url = `${apiBase}/chapters/${ch.id}/audio`;
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!res.ok) { done++; setAudioProgress(`${done} / ${chapterList.length}`); continue; }
        const blob = await res.blob();
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result.split(',')[1];
            await window.electronAPI.saveAudio(ch.id, base64);
            resolve();
          };
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.warn('[Steno Audio Cache] Failed for chapter', ch.id, err.message);
      }
      done++;
      setAudioProgress(`${done} / ${chapterList.length}`);
    }
    setAudioProgress('');
  };

  const handleDownloadOffline = async () => {
    if (chapters.length === 0) return;
    setDownloadStatus('saving');
    setAudioProgress('');
    try {
      await persistChapters();
      await downloadAudioFiles(chapters);
      setDownloadStatus('saved');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch (err) {
      console.error('[Steno Offline Save]', err);
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    }
  };

  const handleTakeTest = (chapter) => {
    navigate('/steno-test', {
      state: {
        exam: selectedExam,
        chapter: chapter,
        mode: selectedMode,
        testType: testType || 'Pre-load Test',
      },
    });
  };

  const displayMode = selectedMode === 'Steno English' ? 'English Steno'
    : selectedMode === 'Steno Hindi' ? 'Hindi Steno'
    : selectedMode;

  return (
    <div className="sd-page">
      <Header />

      {/* Blue header bar */}
      <div className="sd-hero">
        <div className="sd-hero-text">
          <h2>{displayMode} — Dictation List</h2>
          <p>{selectedExam?.name} &nbsp;|&nbsp; {testType || 'Pre-load Test'}</p>
        </div>
      </div>

      <div className="sd-layout">
        <DashboardNav />

        <div className="sd-content">
          {/* Back button */}
          <button className="sd-back-btn" onClick={() => navigate('/dashboard')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Dashboard
          </button>

          {/* ── Offline banner ───────────────────────────────────────────────── */}
          {isOffline && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 16px', borderRadius: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              You are offline. Showing locally saved dictations. Results will not be stored in the database.
            </div>
          )}

          {/* ── Save for Offline button (online only) ────────────────────────── */}
          {!isOffline && chapters.length > 0 && (
            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
              {downloadStatus === 'saving' && audioProgress && (
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Downloading audio {audioProgress}…</span>
              )}
              <button
                onClick={handleDownloadOffline}
                disabled={downloadStatus === 'saving'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  background:   downloadStatus === 'saved' ? '#f0fdf4' : downloadStatus === 'error' ? '#fef2f2' : '#eff6ff',
                  color:        downloadStatus === 'saved' ? '#166534' : downloadStatus === 'error' ? '#dc2626' : '#1d4ed8',
                  borderColor:  downloadStatus === 'saved' ? '#86efac' : downloadStatus === 'error' ? '#fca5a5' : '#bfdbfe',
                  opacity: downloadStatus === 'saving' ? 0.7 : 1,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {downloadStatus === 'saving' ? 'Saving...' : downloadStatus === 'saved' ? '✓ Saved for Offline' : downloadStatus === 'error' ? '✗ Save Failed' : 'Save for Offline Use'}
              </button>
            </div>
          )}

          <div className="sd-section-header">
            <h1 className="sd-section-title">Available Dictations</h1>
            <p className="sd-section-sub">Select a dictation to start your steno test</p>
          </div>

          {loading ? (
            <div className="sd-loading">
              <div className="sd-spinner" />
              <p>Loading dictations…</p>
            </div>
          ) : chapters.length === 0 ? (
            <div className="sd-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>No dictations found for this exam pattern.</p>
            </div>
          ) : (
            <div className="sd-cards-grid">
              {chapters.map((chapter, index) => (
                <div className="sd-card" key={chapter.id}>
                  {/* Card header */}
                  <div className="sd-card-head">
                    <h3 className="sd-card-title">Dictation No. {index + 1}</h3>
                    <button className="sd-heart-btn" aria-label="Favourite">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>

                  {/* Difficulty */}
                  <div className="sd-difficulty">
                    <span className="sd-info-icon">i</span>
                    Difficulty Level Of The Dictation
                  </div>

                  {/* Date badge */}
                  <div className="sd-date-badge">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="18" y="3" width="4" height="18" /><rect x="10" y="8" width="4" height="13" /><rect x="2" y="13" width="4" height="8" />
                    </svg>
                    II {new Date(chapter.test_date || chapter.created_at || Date.now()).toLocaleDateString('en-GB')}
                  </div>

                  {/* Divider */}
                  <hr className="sd-divider" />

                  {/* Feature list */}
                  <ul className="sd-features">
                    <li>
                      <span className="sd-check">✓</span>
                      <span>Topic — {chapter.name || '—'}</span>
                    </li>
                    <li>
                      <span className="sd-check">✓</span>
                      <span>{chapter.word_count || 1018} Words</span>
                    </li>
                    <li>
                      <span className="sd-check">✓</span>
                      <span>All Speeds</span>
                    </li>
                    <li>
                      <span className="sd-check">✓</span>
                      <span>{chapter.is_paid ? 'Paid' : 'Free'}</span>
                    </li>
                  </ul>

                  {/* CTA */}
                  <button className="sd-take-btn" onClick={() => handleTakeTest(chapter)}>
                    Take Test
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StenoDictations;
