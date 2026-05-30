import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DashboardNav from '../components/DashboardNav';
import Header from '../components/Header';
import api, { examService, flashBannerService, resultService, chapterService, offlineTestService, offlineExamService } from '../services/api';
import './StudentDashboard.css';

// Strip trailing /api so we can prepend host to /uploads/...
const ASSETS_BASE = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${ASSETS_BASE}${url}`;
  return `${ASSETS_BASE}/${url}`;
};

// ─── Mode lists per module ────────────────────────────────────────────────────
const TYPING_MODES  = ['English Typing', 'Hindi Mangal', 'Hindi Kruti Dev', 'Hindi Remington (GAIL)', 'Self Assessment'];
const STENO_MODES   = ['English Steno', 'Hindi Steno', 'Spreadsheet'];
const ALL_MODES     = [...TYPING_MODES, ...STENO_MODES];

// Normalize display label → DB/API mode key (steno only)
const normalizeApiMode = (mode) => {
  if (mode === 'English Steno') return 'Steno English';
  if (mode === 'Hindi Steno')   return 'Steno Hindi';
  return mode;
};

// Download and IPC-cache audio for steno chapters (Electron only, best-effort)
const downloadStenoAudio = async (chapters) => {
  if (!window.electronAPI?.saveAudio) return;
  const token   = localStorage.getItem('token');
  const apiBase = api.defaults.baseURL || 'http://localhost:3012/api';
  for (const ch of chapters) {
    try {
      const { exists } = await window.electronAPI.hasAudio(ch.id);
      if (exists) continue;
      const res = await fetch(`${apiBase}/chapters/${ch.id}/audio`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) continue;
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
      console.warn('[Dashboard Audio Cache] chapter', ch.id, err.message);
    }
  }
};

// ─── Helper: derive available modes & test-type rules from moduleType ─────────
function getModuleConfig(moduleType) {
  switch (moduleType) {
    case 'typing':
      return {
        label: 'Typing',
        modes: TYPING_MODES,
        defaultMode: 'English Typing',
        testTypes: ['Pre-load Test', 'Live Test'],
        defaultTestType: 'Pre-load Test',
        lockTestType: false,
      };
    case 'steno':
      return {
        label: 'Steno',
        modes: STENO_MODES,
        defaultMode: 'English Steno',
        testTypes: ['Pre-load Test', 'Live Test'],
        defaultTestType: 'Pre-load Test',
        lockTestType: false,
      };
    case 'livetest':
      return {
        label: 'Live Test',
        modes: ALL_MODES,
        defaultMode: 'English Typing',
        testTypes: ['Live Test'],       // only live tests visible
        defaultTestType: 'Live Test',
        lockTestType: true,             // cannot change test type
      };
    default:
      // Fallback: show everything
      return {
        label: '',
        modes: ALL_MODES,
        defaultMode: 'English Typing',
        testTypes: ['Pre-load Test', 'Live Test'],
        defaultTestType: 'Pre-load Test',
        lockTestType: false,
      };
  }
}

const StudentDashboard = () => {
  const navigate  = useNavigate();

  // Read moduleType once on mount
  const moduleType = localStorage.getItem('moduleType') || 'typing';
  const config     = getModuleConfig(moduleType);

  const [selectedMode, setSelectedMode] = useState(null);
  const [testType,     setTestType]     = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [showTestTypePopup, setShowTestTypePopup] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);
  const [exams,        setExams]        = useState([]);
  const [messages,     setMessages]     = useState([]);
  const [flashBanners, setFlashBanners] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [offlineStatus, setOfflineStatus] = useState({}); // examId → 'idle'|'saving'|'saved'|'error'

  const username = localStorage.getItem('username') || 'Student';
  const rawValidity = localStorage.getItem('validity_end');
  
  let daysLeft = '∞';
  if (rawValidity && rawValidity !== 'undefined' && rawValidity !== 'null') {
    const end = new Date(rawValidity);
    const now = new Date();
    const diffTime = end - now;
    daysLeft = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
  }

  // ── Initial data load ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchInitialData();
    // Pre-populate download status from persisted offline data
    offlineTestService.getTests().then(data => {
      const saved = {};
      (data.tests || []).forEach(t => { if (t.examId) saved[t.examId] = 'saved'; });
      setOfflineStatus(saved);
    }).catch(() => {});
  }, []);

  // Removed fetchChapters from here; moved to AvailableTests.jsx

  const fetchInitialData = async () => {
    try {
      if (window.navigator.onLine) {
        resultService.syncOfflineResults().catch(console.error);
      }

      // ── Offline: load exams from local IPC file, skip API calls ──────────────
      if (!navigator.onLine) {
        const cachedExams = await offlineExamService.getExams();
        if (cachedExams && cachedExams.length > 0) {
          setExams(cachedExams);
        }
        setLoading(false);
        return;
      }

      // ── Online: fetch from server; each request is independent ────────────────
      const [examResult, msgResult, flashResult] = await Promise.allSettled([
        examService.getExams(),
        api.get('/messages'),
        flashBannerService.getActiveBanners(),
      ]);

      if (examResult.status === 'fulfilled') {
        const examData = examResult.value || [];
        setExams(examData);
        if (examData.length > 0) {
          offlineExamService.saveExams(examData).catch(() => {});
        }
      } else {
        // Online fetch failed — fall back to locally cached exam list
        const cachedExams = await offlineExamService.getExams().catch(() => null);
        if (cachedExams && cachedExams.length > 0) setExams(cachedExams);
      }
      if (msgResult.status === 'fulfilled') setMessages(msgResult.value?.data || []);
      if (flashResult.status === 'fulfilled') setFlashBanners(flashResult.value || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Steno now follows the same popup → exam → dictations page flow as typing

  // Chapters and test starting logic moved to AvailableTests.jsx

  const handleSaveOffline = async (e, exam) => {
    e.stopPropagation();
    const examId  = exam.id;
    // Steno modes have a different display label vs. API/DB key — normalize here
    const apiMode = normalizeApiMode(selectedMode);
    setOfflineStatus(prev => ({ ...prev, [examId]: 'saving' }));
    try {
      const chapters = await chapterService.getChapters(apiMode, 'Pre-load Test', examId);
      if (!chapters || chapters.length === 0) {
        setOfflineStatus(prev => ({ ...prev, [examId]: 'error' }));
        setTimeout(() => setOfflineStatus(prev => ({ ...prev, [examId]: 'idle' })), 3000);
        return;
      }
      const existing = await offlineTestService.getTests();
      const others = (existing.tests || []).filter(t =>
        !(t.examId === examId && t.mode === apiMode && t.testType === 'Pre-load Test')
      );
      await offlineTestService.saveTests([...others, {
        examId, mode: apiMode, testType: 'Pre-load Test',
        exam, chapters, saved_at: new Date().toISOString(),
      }]);
      // For steno modes, download audio files in the background
      const isStenoMode = selectedMode === 'English Steno' || selectedMode === 'Hindi Steno';
      if (isStenoMode) {
        downloadStenoAudio(chapters).catch(() => {});
      }
      setOfflineStatus(prev => ({ ...prev, [examId]: 'saved' }));
      setTimeout(() => setOfflineStatus(prev => ({ ...prev, [examId]: 'idle' })), 3000);
    } catch (err) {
      console.error('[Offline Save]', err);
      setOfflineStatus(prev => ({ ...prev, [examId]: 'error' }));
      setTimeout(() => setOfflineStatus(prev => ({ ...prev, [examId]: 'idle' })), 3000);
    }
  };

  return (
    <div className="dashboard-page-container">
      <Header />
      
      {/* Blue Welcome Bar */}
      <div className="dashboard-welcome-bar">
        <div className="welcome-text-content">
          <h2>Welcome, {username}!</h2>
          <p>Select Your Mode & Exam Pattern To Start Practicing</p>
        </div>
        <div className="welcome-action">
          <button className="btn-days-left">
            {daysLeft} Days Left
          </button>
        </div>
      </div>

      {/* Flash banners */}
      {flashBanners.length > 0 && (
        <div className="dashboard-red-banner">
          <marquee scrollamount="8">
            {flashBanners.map((b) => (
              <span key={b.id} style={{ marginRight: '50px' }}>{b.content}</span>
            ))}
          </marquee>
        </div>
      )}

      <div className="dashboard-layout">
        <DashboardNav />

        <div className="dashboard-content">
          {/* Announcements */}
          {messages && messages.length > 0 && (
            <div className="announcement-banner">
              <h4 style={{ margin: '0 0 10px 0', color: '#b45309' }}>📣 Latest Announcements</h4>
              <div className="announcement-list">
                {messages.map(msg => (
                  <div key={msg.id} className="announcement-item" style={{ padding: '10px', background: '#fef3c7', borderRadius: '4px', marginBottom: '8px', borderLeft: '4px solid #f59e0b' }}>
                    <strong style={{ display: 'block', color: '#92400e', marginBottom: '4px' }}>
                      {msg.title}
                      <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#b45309', marginLeft: '10px' }}>
                        {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </strong>
                    <span style={{ fontSize: '0.85rem', color: '#78350f', whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="selection-panel">
            <h2 className="explore-title">Explore Balaji Typing & Steno All Softwares</h2>
            
            {/* ── 1. Mode selector ─────────────────────────────────────────── */}
            <div className="selection-group border-none">
              <div className="toggle-group custom-tabs">
                {config.modes.map(mode => (
                  <button
                    key={mode}
                    className={`custom-tab-btn ${selectedMode === mode ? 'active' : ''}`}
                    onClick={() => {
                      if (mode === 'Self Assessment') {
                        navigate('/self-assessment');
                        return;
                      }

                      if (config.lockTestType) {
                        setSelectedMode(mode);
                        setTestType(config.defaultTestType);
                        setSelectedExam(null);
                      } else {
                        setPendingMode(mode);
                        setShowTestTypePopup(true);
                      }
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* ── 3. Exam pattern ───────────────────────────────────────────── */}
            {selectedMode && testType && (
              <div className="selection-group border-none" style={{ marginTop: '25px' }}>
                <h3 className="explore-title" style={{ fontSize: '1.05rem', marginBottom: '15px' }}>
                  Select Exam Pattern
                </h3>
                <div className="exam-cards-grid">
                  {loading ? (
                    <p>Loading patterns...</p>
                  ) : (() => {
                    // Normalize steno mode button labels to match the stored font_group values in admin
                    const normalizedMode = selectedMode === 'English Steno' ? 'Steno English'
                      : selectedMode === 'Hindi Steno' ? 'Steno Hindi'
                      : selectedMode;
                    const modeExams = exams.filter(exam => {
                      const groups = Array.isArray(exam.font_groups) && exam.font_groups.length > 0
                        ? exam.font_groups
                        : (exam.font_group ? [exam.font_group] : []);
                      return groups.length === 0 || groups.includes(normalizedMode);
                    });
                    return modeExams.length === 0
                      ? <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No exams available for {selectedMode}.</p>
                      : modeExams.map(exam => {
                        const dlStatus = offlineStatus[exam.id] || 'idle';
                        return (
                        <div
                          key={exam.id}
                          className={`exam-card-custom ${selectedExam?.id === exam.id ? 'active-exam' : ''}`}
                          style={{ position: 'relative' }}
                          onClick={() => {
                            setSelectedExam(exam);
                            const isStenoMode = selectedMode === 'English Steno' || selectedMode === 'Hindi Steno' || selectedMode === 'Spreadsheet';
                            if (isStenoMode && testType === 'Pre-load Test') {
                              let apiMode = selectedMode;
                              if (selectedMode === 'English Steno') apiMode = 'Steno English';
                              if (selectedMode === 'Hindi Steno') apiMode = 'Steno Hindi';
                              navigate('/steno-dictations', {
                                state: { selectedMode: apiMode, testType, selectedExam: exam }
                              });
                            } else {
                              navigate('/available-tests', {
                                state: { selectedMode, testType, selectedExam: exam }
                              });
                            }
                          }}
                        >
                          {/* Offline download button — only for Pre-load tests when online */}
                          {testType === 'Pre-load Test' && navigator.onLine && (
                            <button
                              title={dlStatus === 'saved' ? 'Saved for offline' : dlStatus === 'saving' ? 'Saving...' : 'Save for offline use'}
                              onClick={(e) => handleSaveOffline(e, exam)}
                              disabled={dlStatus === 'saving'}
                              style={{
                                position: 'absolute', top: '6px', right: '6px',
                                width: '26px', height: '26px', borderRadius: '50%',
                                border: 'none', cursor: dlStatus === 'saving' ? 'wait' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '13px', zIndex: 2,
                                background: dlStatus === 'saved' ? '#dcfce7' : dlStatus === 'error' ? '#fee2e2' : '#f1f5f9',
                                color: dlStatus === 'saved' ? '#16a34a' : dlStatus === 'error' ? '#dc2626' : '#475569',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                              }}
                            >
                              {dlStatus === 'saving' ? '⏳' : dlStatus === 'saved' ? '✓' : dlStatus === 'error' ? '✗' : '↓'}
                            </button>
                          )}
                          <span className="exam-doc-icon">
                            {exam.image_url ? (
                              <img
                                src={resolveAssetUrl(exam.image_url)}
                                alt={`${exam.name} logo`}
                                style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                              />
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                              </svg>
                            )}
                          </span>
                          <span className="exam-name-custom">{exam.name}</span>
                        </div>
                        );
                      });
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Available Tests moved to a separate page */}
          {/* Popup for Test Type Selection */}
          {showTestTypePopup && (
            <div className="popup-overlay">
              <div className="popup-content">
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Select Test Type for {pendingMode}</h3>
                <div className="popup-buttons" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  {config.testTypes.map(type => (
                    <button
                      key={type}
                      className="custom-tab-btn"
                      onClick={() => {
                        setTestType(type);
                        setSelectedMode(pendingMode);
                        setSelectedExam(null); // Reset exam so exercises don't show until exam is clicked
                        setShowTestTypePopup(false);
                      }}
                    >
                      {type}
                    </button>
                  ))}
                  <button 
                    className="custom-tab-btn" 
                    style={{ backgroundColor: '#ef4444', color: 'white' }}
                    onClick={() => setShowTestTypePopup(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
