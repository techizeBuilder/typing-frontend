import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardNav from '../components/DashboardNav';
import Header from '../components/Header';
import { chapterService } from '../services/api';
import './StenoDictations.css';

const StenoDictations = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { selectedMode, testType, selectedExam } = location.state || {};
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedMode || !selectedExam) {
      navigate('/dashboard');
      return;
    }
    fetchChapters();
  }, [selectedMode, selectedExam]);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      const data = await chapterService.getChapters(selectedMode, testType || 'Pre-load Test', selectedExam.id);
      setChapters(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching steno chapters:', error);
      setChapters([]);
    } finally {
      setLoading(false);
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
