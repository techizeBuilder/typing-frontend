import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import {
  ClipboardListIcon,
  ClockIcon,
  FileTextIcon,
  UploadCloudIcon,
  PlayIcon,
  ChevronRightIcon,
  XIcon,
  CheckCircle2Icon,
  Loader2Icon,
  TypeIcon,
} from 'lucide-react';
import { resultPatternService, resultService, getCurrentUserUuid } from '../services/api';
import { PageHeading } from '../ui/PageHeading';

const FONT_OPTIONS = [
  { value: 'English Typing',         label: 'English Typing' },
  { value: 'Hindi Mangal',           label: 'Hindi Mangal (Unicode)' },
  { value: 'Hindi Kruti Dev',        label: 'Hindi Kruti Dev' },
  { value: 'Hindi Remington (GAIL)', label: 'Hindi Remington (GAIL)' },
];

const TIME_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60];

function PatternModal({ patterns, loading, selected, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" role="dialog" aria-modal="true" aria-label="Select result pattern">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h3 className="font-display text-[19px] font-bold text-navy-800">Select Result Pattern</h3>
            <p className="text-[12.5px] text-slate-500">The pattern determines how your score is calculated and what results are shown.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto p-5">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-10 text-[13px] text-slate-500"><Loader2Icon className="h-4 w-4 animate-spin" /> Loading patterns…</p>
          ) : patterns.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-slate-500">No result patterns found. Your result will use default settings.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {patterns.map((p) => {
                const active = selected?.id === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => { onSelect(p); onClose(); }}
                      aria-pressed={active}
                      className={`relative w-full rounded-lg border p-3.5 text-left transition-colors duration-150 ${
                        active ? 'border-primary bg-primary-50 ring-2 ring-primary/20' : 'border-slate-200 hover:border-primary'}`}>
                      {active && <CheckCircle2Icon className="absolute right-3 top-3 h-4 w-4 text-primary" aria-hidden="true" />}
                      <p className="pr-6 font-display text-[14px] font-bold text-navy-800">{p.name}</p>
                      <dl className="mt-2 space-y-1 text-[11.5px]">
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Qualify on</dt><dd className="font-semibold text-navy-800">{p.qualify_on} ≥ {p.required_speed}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Count by</dt><dd className="font-semibold text-navy-800">{p.speed_count}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Half mistakes</dt><dd className="font-semibold text-navy-800">{p.half_mistake_enabled ? 'Yes' : 'No'}</dd></div>
                      </dl>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const SelfAssessmentSetup = () => {
  const navigate = useNavigate();

  const [text, setText]         = useState('');
  const [font, setFont]         = useState('English Typing');
  const [duration, setDuration] = useState(10);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const [patterns, setPatterns]               = useState([]);
  const [loadingPatterns, setLoadingPatterns] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [patternModalOpen, setPatternModalOpen] = useState(false);
  const [lastPractices, setLastPractices]     = useState([]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  useEffect(() => {
    resultPatternService.getPatterns()
      .then((data) => {
        setPatterns(data || []);
        if (data && data.length > 0) setSelectedPattern(data[0]);
      })
      .catch(() => setPatterns([]))
      .finally(() => setLoadingPatterns(false));

    // Most recent self-practice attempts (results not tied to an exam).
    const userId = getCurrentUserUuid();
    if (userId && navigator.onLine) {
      resultService.getUserResults(userId)
        .then((rows) => setLastPractices(
          (rows || [])
            .filter((r) => !r.exam)
            .sort((a, b) => new Date(b.date_taken) - new Date(a.date_taken))
            .slice(0, 5),
        ))
        .catch(() => {});
    }
  }, []);

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

  // ── Navigation (state contract unchanged) ─────────────────────────────────
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

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <PageHeading
        icon={<ClipboardListIcon className="h-5 w-5" aria-hidden="true" />}
        title="Self Assessment"
        subtitle="Upload your own passage, choose a result pattern, and take a timed typing test."
        crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Self Assessment' }]} />

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
          <h3 className="mb-3.5 font-display text-[15px] font-bold text-navy-800">Practice Setup</h3>

          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-navy-800">
            <ClockIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Test Duration
          </p>
          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Test duration">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDuration(t)}
                aria-pressed={duration === t}
                className={`rounded-md border px-3.5 py-1.5 text-[12px] font-semibold transition-colors duration-150 ${
                  duration === t ? 'border-primary bg-primary text-white' : 'border-slate-300 text-slate-600 hover:border-primary'}`}>
                {t} Min
              </button>
            ))}
          </div>

          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-navy-800">
            <FileTextIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Practice Text
          </p>
          <div
            role="button"
            tabIndex={0}
            onClick={() => !fileLoading && fileInputRef.current?.click()}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !fileLoading) { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mb-3 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors duration-150 ${
              dragOver ? 'border-primary bg-primary-50' : 'border-slate-300 hover:border-primary hover:bg-slate-50'}`}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.doc,.docx"
              className="hidden"
              onChange={handleFileInput} />
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary-50 text-primary">
              {fileLoading ? <Loader2Icon className="h-5 w-5 animate-spin" aria-hidden="true" /> : <UploadCloudIcon className="h-5 w-5" aria-hidden="true" />}
            </span>
            <span className="min-w-0 text-[12.5px] text-slate-600">
              {fileLoading ? 'Reading file…'
                : fileName ? <><strong className="text-navy-800">{fileName}</strong><br /><span className="text-[11.5px] text-slate-500">Click to change file</span></>
                  : <><strong className="text-navy-800">Click to upload</strong> or drag &amp; drop<br /><span className="text-[11.5px] text-slate-500">.txt or .docx supported</span></>}
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="…or paste or type the passage you want to test yourself on"
            aria-label="Practice text"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="h-[200px] w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-[13.5px] leading-relaxed text-navy-800 outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-primary" />
          <p className="mt-1 text-[11.5px] text-slate-500">
            {wordCount > 0 ? <><strong className="text-navy-800">{wordCount}</strong> words · <strong className="text-navy-800">{text.length}</strong> characters</> : 'No text yet'}
          </p>

          <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-navy-800">
                <TypeIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Typing Font / Mode
              </span>
              <select
                value={font}
                onChange={(e) => setFont(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none focus:border-primary">
                {FONT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            <div className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-navy-800">Exam / Result Pattern</span>
              <button
                type="button"
                onClick={() => setPatternModalOpen(true)}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-[12.5px] transition-colors duration-150 hover:border-primary">
                <span className="truncate font-medium text-navy-800">
                  {loadingPatterns ? 'Loading…' : selectedPattern ? selectedPattern.name : 'Default settings'}
                </span>
                <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              </button>
            </div>
          </div>

          {selectedPattern &&
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg bg-slate-50 p-3 text-[11.5px] sm:grid-cols-4">
              <div><dt className="text-slate-500">Accuracy required</dt><dd className="font-semibold text-navy-800">{selectedPattern.required_accuracy}%</dd></div>
              <div><dt className="text-slate-500">Penalty</dt><dd className="font-semibold text-navy-800">{selectedPattern.penalty_value} {selectedPattern.penalty_type}/mistake</dd></div>
              <div><dt className="text-slate-500">Half mistakes</dt><dd className="font-semibold text-navy-800">{selectedPattern.half_mistake_enabled ? 'Enabled' : 'Disabled'}</dd></div>
              <div><dt className="text-slate-500">Count omissions</dt><dd className="font-semibold text-navy-800">{selectedPattern.count_omissions_as_errors ? 'Yes' : 'No'}</dd></div>
            </dl>
          }

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleStart}
              disabled={wordCount === 0}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
              <PlayIcon className="h-4 w-4 fill-current" aria-hidden="true" /> Start Practice
            </button>
            {wordCount === 0 && <span className="text-[12px] text-slate-500">Upload or paste text to continue</span>}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="font-display text-[13.5px] font-semibold text-navy-800">Summary</h3>
            <dl className="mt-2.5 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between"><dt className="text-slate-500">Words</dt><dd className="font-semibold text-navy-800">{wordCount}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Duration</dt><dd className="font-semibold text-navy-800">{duration} min</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Mode</dt><dd className="font-semibold text-navy-800">{font.replace(' (GAIL)', '')}</dd></div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="flex items-center gap-2 font-display text-[13.5px] font-semibold text-navy-800">
              <ClockIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Your Last 5 Practices
            </h3>
            {lastPractices.length === 0 ?
              <p className="mt-2.5 text-[12px] text-slate-500">No self-practice tests yet.</p> :
              <ul className="mt-2 divide-y divide-slate-100">
                {lastPractices.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-[11.5px]">
                    <span className="text-slate-500">{new Date(p.date_taken).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className="font-semibold text-primary">{Math.round(p.nwpm)} WPM</span>
                    <span className="font-medium text-success">{parseFloat(p.accuracy).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            }
          </section>

          <p className="rounded-lg bg-primary-50 p-3 text-[11.5px] text-primary-700">
            Self assessment is private practice — no ranking, no pressure. Practise freely and track your improvement over time.
          </p>
        </aside>
      </div>

      {patternModalOpen &&
        <PatternModal
          patterns={patterns}
          loading={loadingPatterns}
          selected={selectedPattern}
          onSelect={setSelectedPattern}
          onClose={() => setPatternModalOpen(false)} />
      }
    </div>
  );
};

export default SelfAssessmentSetup;
