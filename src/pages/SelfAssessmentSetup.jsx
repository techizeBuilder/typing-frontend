import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SelfAssessmentSetup.css';

const FONT_OPTIONS = [
  { value: 'English Typing',         label: 'English Typing' },
  { value: 'Hindi Mangal',           label: 'Hindi Mangal (Unicode)' },
  { value: 'Hindi Kruti Dev',        label: 'Hindi Kruti Dev' },
  { value: 'Hindi Remington (GAIL)', label: 'Hindi Remington (GAIL)' },
];

const TIME_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60];

const SelfAssessmentSetup = () => {
  const navigate = useNavigate();
  const [text, setText]       = useState('');
  const [font, setFont]       = useState('English Typing');
  const [duration, setDuration] = useState(10);

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleStart = () => {
    if (!text.trim()) return;
    navigate('/test', {
      state: {
        isSelfAssessment: true,
        mode: font,
        testType: 'Preloaded',
        chapter: {
          id: null,
          name: 'Self Assessment',
          content_text: text.trim(),
          time_minutes: duration,
          font_group: font,
        },
      },
    });
  };

  return (
    <div className="sa-page">
      <div className="sa-container">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="sa-header">
          <button className="sa-back-btn" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1 className="sa-title">Self Assessment</h1>
          <p className="sa-subtitle">
            Paste any text you want to practise — no admin needed. Configure the settings, then start.
          </p>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="sa-body">

          {/* Left: text paste area */}
          <div className="sa-text-col">
            <label className="sa-label">Your Practice Text</label>
            <p className="sa-hint">Paste or type the passage you want to test yourself on</p>
            <textarea
              className="sa-textarea"
              placeholder="Paste your text here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
            />
            <div className="sa-stats">
              {wordCount > 0
                ? <><strong>{wordCount}</strong> words &nbsp;·&nbsp; <strong>{text.length}</strong> characters</>
                : 'No text pasted yet'}
            </div>
          </div>

          {/* Right: settings + start */}
          <div className="sa-settings-col">
            <div className="sa-setting-block">
              <label className="sa-label">Typing Font / Mode</label>
              <select
                className="sa-select"
                value={font}
                onChange={(e) => setFont(e.target.value)}
              >
                {FONT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="sa-setting-block">
              <label className="sa-label">Test Duration</label>
              <select
                className="sa-select"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
              >
                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>{t} minute{t !== 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>

            <div className="sa-preview-box">
              <div className="sa-preview-row"><span>Words</span><strong>{wordCount}</strong></div>
              <div className="sa-preview-row"><span>Duration</span><strong>{duration} min</strong></div>
              <div className="sa-preview-row"><span>Mode</span><strong>{font.replace(' (GAIL)', '')}</strong></div>
            </div>

            <button
              className="sa-start-btn"
              onClick={handleStart}
              disabled={wordCount === 0}
            >
              Start Test
            </button>

            {wordCount === 0 && (
              <p className="sa-start-hint">Paste text on the left to enable Start</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SelfAssessmentSetup;
