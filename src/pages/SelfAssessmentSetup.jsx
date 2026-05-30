import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import { resultPatternService } from '../services/api';
import './SelfAssessmentSetup.css';

const FONT_OPTIONS = [
  { value: 'English Typing',         label: 'English Typing' },
  { value: 'Hindi Mangal',           label: 'Hindi Mangal (Unicode)' },
  { value: 'Hindi Kruti Dev',        label: 'Hindi Kruti Dev' },
  { value: 'Hindi Remington (GAIL)', label: 'Hindi Remington (GAIL)' },
];

const TIME_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60];

const STEPS = [
  { n: 1, label: 'Upload Content' },
  { n: 2, label: 'Result Pattern' },
  { n: 3, label: 'Give Test' },
  { n: 4, label: 'View Result' },
];

const SelfAssessmentSetup = () => {
  const navigate = useNavigate();
  const [step, setStep]     = useState(1);

  // ── Step 1 state ──────────────────────────────────────────────────────────
  const [text, setText]         = useState('');
  const [font, setFont]         = useState('English Typing');
  const [duration, setDuration] = useState(10);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // ── Step 2 state ──────────────────────────────────────────────────────────
  const [patterns, setPatterns]               = useState([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  // Load patterns when entering step 2
  useEffect(() => {
    if (step === 2 && patterns.length === 0) {
      loadPatterns();
    }
  }, [step]);

  const loadPatterns = async () => {
    setLoadingPatterns(true);
    try {
      const data = await resultPatternService.getPatterns();
      setPatterns(data || []);
      if (data && data.length > 0) setSelectedPattern(data[0]);
    } catch {
      setPatterns([]);
    } finally {
      setLoadingPatterns(false);
    }
  };

  // ── File handling ─────────────────────────────────────────────────────────
  const processFile = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.txt') && !name.endsWith('.docx') && !name.endsWith('.doc')) {
      alert('Only .txt and .docx files are supported.');
      return;
    }
    setFileLoading(true);
    setFileName(file.name);
    try {
      if (name.endsWith('.txt')) {
        const content = await file.text();
        setText(content);
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setText(result.value || '');
      }
    } catch (err) {
      alert('Could not read file: ' + (err.message || 'Unknown error'));
      setFileName('');
    } finally {
      setFileLoading(false);
    }
  };

  const handleFileInput = (e) => {
    processFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleStart = () => {
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
        resultPattern: selectedPattern || null,
      },
    });
  };

  // ── Stepper ───────────────────────────────────────────────────────────────
  const Stepper = () => (
    <div className="sa-stepper">
      {STEPS.map((s, idx) => (
        <React.Fragment key={s.n}>
          <div className={`sa-step ${step === s.n ? 'sa-step--active' : ''} ${step > s.n ? 'sa-step--done' : ''}`}>
            <div className="sa-step-circle">
              {step > s.n ? '✓' : s.n}
            </div>
            <span className="sa-step-label">{s.label}</span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`sa-step-line ${step > s.n ? 'sa-step-line--done' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ── STEP 1 ────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="sa-body">
      {/* Left: content input */}
      <div className="sa-text-col">
        <label className="sa-label">Practice Text</label>
        <p className="sa-hint">Upload a file or paste your text directly below</p>

        {/* Upload zone */}
        <div
          className={`sa-upload-zone ${dragOver ? 'sa-upload-zone--over' : ''} ${fileLoading ? 'sa-upload-zone--loading' : ''}`}
          onClick={() => !fileLoading && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.doc,.docx"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
          {fileLoading ? (
            <span className="sa-upload-icon">⏳</span>
          ) : (
            <span className="sa-upload-icon">📄</span>
          )}
          <div className="sa-upload-text">
            {fileLoading
              ? 'Reading file…'
              : fileName
                ? <><strong>{fileName}</strong><br /><span>Click to change file</span></>
                : <><strong>Click to upload</strong> or drag &amp; drop<br /><span>.txt or .docx supported</span></>
            }
          </div>
        </div>

        <div className="sa-or-divider"><span>or paste text below</span></div>

        <textarea
          className="sa-textarea"
          placeholder="Paste or type the passage you want to test yourself on…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
        <div className="sa-stats">
          {wordCount > 0
            ? <><strong>{wordCount}</strong> words &nbsp;·&nbsp; <strong>{text.length}</strong> characters</>
            : 'No text yet'}
        </div>
      </div>

      {/* Right: settings */}
      <div className="sa-settings-col">
        <div className="sa-setting-block">
          <label className="sa-label">Typing Font / Mode</label>
          <select className="sa-select" value={font} onChange={(e) => setFont(e.target.value)}>
            {FONT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="sa-setting-block">
          <label className="sa-label">Test Duration</label>
          <select className="sa-select" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}>
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
          className="sa-next-btn"
          onClick={() => setStep(2)}
          disabled={wordCount === 0}
        >
          Next: Select Pattern →
        </button>

        {wordCount === 0 && (
          <p className="sa-start-hint">Upload or paste text to continue</p>
        )}
      </div>
    </div>
  );

  // ── STEP 2 ────────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="sa-pattern-step">
      <div className="sa-pattern-header">
        <h2 className="sa-pattern-title">Select Result Pattern</h2>
        <p className="sa-pattern-subtitle">
          The pattern determines how your score is calculated and what results are shown.
        </p>
      </div>

      {loadingPatterns ? (
        <div className="sa-pattern-loading">Loading patterns…</div>
      ) : patterns.length === 0 ? (
        <div className="sa-pattern-empty">
          <p>No result patterns found. Your result will use default settings.</p>
        </div>
      ) : (
        <div className="sa-pattern-grid">
          {patterns.map(p => (
            <div
              key={p.id}
              className={`sa-pattern-card ${selectedPattern?.id === p.id ? 'sa-pattern-card--selected' : ''}`}
              onClick={() => setSelectedPattern(p)}
            >
              <div className="sa-pattern-card-name">{p.name}</div>
              <div className="sa-pattern-card-details">
                <div className="sa-pattern-detail">
                  <span>Qualify on</span>
                  <strong>{p.qualify_on} ≥ {p.required_speed}</strong>
                </div>
                <div className="sa-pattern-detail">
                  <span>Count by</span>
                  <strong>{p.speed_count}</strong>
                </div>
                <div className="sa-pattern-detail">
                  <span>Half mistakes</span>
                  <strong>{p.half_mistake_enabled ? 'Yes' : 'No'}</strong>
                </div>
              </div>
              {selectedPattern?.id === p.id && (
                <div className="sa-pattern-selected-badge">✓ Selected</div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedPattern && (
        <div className="sa-pattern-preview">
          <div className="sa-pattern-preview-title">Selected: {selectedPattern.name}</div>
          <div className="sa-pattern-preview-grid">
            <span>Accuracy required</span><strong>{selectedPattern.required_accuracy}%</strong>
            <span>Penalty</span><strong>{selectedPattern.penalty_value} {selectedPattern.penalty_type}/mistake</strong>
            <span>Half mistakes</span><strong>{selectedPattern.half_mistake_enabled ? 'Enabled' : 'Disabled'}</strong>
            <span>Count omissions</span><strong>{selectedPattern.count_omissions_as_errors ? 'Yes' : 'No'}</strong>
          </div>
        </div>
      )}

      <div className="sa-pattern-actions">
        <button className="sa-back-btn" onClick={() => setStep(1)}>← Back</button>
        <button className="sa-start-btn" onClick={handleStart}>
          Start Test →
        </button>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="sa-page">
      <div className="sa-container">
        <div className="sa-header">
          <button className="sa-back-btn sa-back-btn--header" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <h1 className="sa-title">Self Assessment</h1>
          <p className="sa-subtitle">
            Upload your own passage, choose a result pattern, and take a timed typing test.
          </p>
        </div>

        <Stepper />

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </div>
    </div>
  );
};

export default SelfAssessmentSetup;
