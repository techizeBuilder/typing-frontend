import { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import mammoth from 'mammoth';
import {
  ClipboardListIcon,
  ClockIcon,
  FileTextIcon,
  UploadCloudIcon,
  PlayIcon,
  ChevronRightIcon,
  XIcon,
  Loader2Icon,
  LightbulbIcon,
  MusicIcon,
  RotateCcwIcon,
  EyeIcon,
  KeyboardIcon,
} from 'lucide-react';
import { resultPatternService, resultService, getCurrentUserUuid } from '../services/api';
import { PageHeading } from '../ui/PageHeading';
import { useFontGroupSettings } from '../features/fontGroups/fontGroups';

// One setup page per sidebar link. Typing modes hand off to TestEngine exactly as
// before (isSelfAssessment); steno modes hand the student's own passage + audio
// to StenoTestEngine. Grading is the engines' own, unchanged.
const MODES = {
  'eng-typing': {
    title: 'English Typing', kind: 'typing',
    fonts: [{ value: 'English Typing', label: 'English Typing' }],
  },
  'hindi-typing': {
    title: 'Hindi Typing', kind: 'typing',
    fonts: [
      { value: 'Hindi Mangal', label: 'Hindi Mangal (Unicode)' },
      { value: 'Hindi Kruti Dev', label: 'Hindi Kruti Dev' },
      { value: 'Hindi Remington (GAIL)', label: 'Hindi Remington (GAIL)' },
    ],
  },
  'eng-steno': {
    title: 'English Steno', kind: 'steno', group: 'Steno English',
    fonts: [{ value: '', label: 'English' }],
  },
  'hindi-steno': {
    title: 'Hindi Steno', kind: 'steno', group: 'Steno Hindi',
    fonts: [
      { value: 'Mangal', label: 'Hindi Mangal (Unicode)' },
      { value: 'KrutiDev', label: 'Hindi Kruti Dev' },
      { value: 'RemingtonGail', label: 'Hindi Remington (GAIL)' },
    ],
  },
};

// Blob URL of the last self-steno audio; freed when the next practice starts.
let lastAudioUrl = null;

const DURATIONS = [2, 5, 10, 15, 20, 30, 40, 60];
const BACKSPACE_OPTIONS = ['Full Backspace', 'Current Word Backspace', 'Two Word Backspace', 'No Backspace'];
const PATTERN_COLORS = ['#0D6EFD', '#DC2626', '#16A34A', '#EA580C', '#7C3AED', '#0D9488', '#D97706', '#2563EB', '#92400E', '#1E3A8A'];

// Which saved self-practice results belong to this page (exam-less attempts).
const belongsTo = (mode, r) => {
  const m = r.mode || '';
  if (mode === 'eng-typing') return m === 'English Typing';
  if (mode === 'hindi-typing') return m.startsWith('Hindi');
  if (mode === 'eng-steno') return m === 'Steno English';
  return m === 'Steno Hindi';
};

function PatternModal({ patterns, loading, selected, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Select result pattern">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl sm:p-7">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex flex-wrap items-center gap-2 font-display text-[19px] font-bold text-navy-800">
              Select Exam/Result Pattern
              <span className="text-[15px] font-normal text-primary">अपना exam चुनिए</span>
            </h3>
            <p className="mt-0.5 text-[12px] text-slate-500">The pattern determines how your score is calculated and what results are shown.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600">
            <XIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-2 flex max-w-md items-start gap-1.5 rounded-lg bg-primary-50 px-3 py-2 text-[11px] text-primary-700">
          <LightbulbIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Choose the exam or result pattern as per your target and start your practice.
        </p>

        {loading ?
          <p className="flex items-center justify-center gap-2 py-10 text-[13px] text-slate-500"><Loader2Icon className="h-4 w-4 animate-spin" /> Loading patterns…</p> :
          patterns.length === 0 ?
            <p className="py-10 text-center text-[13px] text-slate-500">No result patterns found. Your result will use default settings.</p> :
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {patterns.map((p, i) => {
                const active = selected?.id === p.id;
                const strokes = p.speed_count === 'Strokes';
                const color = PATTERN_COLORS[i % PATTERN_COLORS.length];
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { onSelect(p); onClose(); }}
                    aria-pressed={active}
                    className={`rounded-xl border bg-white p-3.5 text-left shadow-card transition-colors duration-150 ${
                      active ? 'border-primary ring-1 ring-primary' : 'border-slate-200 hover:border-primary'}`}>
                    <div className="flex items-start gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white" style={{ backgroundColor: color }}>
                        <KeyboardIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-display text-[13px] font-bold text-navy-800">{p.name}</span>
                          {active && <span className="rounded bg-primary px-1.5 py-[1px] text-[9px] font-bold text-white">Selected</span>}
                        </span>
                        {p.description && <span className="block truncate text-[10.5px] text-slate-500">{p.description}</span>}
                      </span>
                      <ChevronRightIcon className="mt-1 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[10.5px]">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className={`grid h-4 w-4 place-items-center rounded text-[8.5px] font-bold text-white ${strokes ? 'bg-rose-500' : 'bg-primary'}`}>
                          {strokes ? 'S' : 'W'}
                        </span>
                        Qualify on: {strokes ? 'Strokes' : 'Words'}
                      </span>
                      <span className="text-right text-slate-500">
                        <span className="block font-semibold text-navy-800">{p.qualify_on} ≥ {p.required_speed}</span>
                        Half mistakes: {p.half_mistake_enabled ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}

function TextModal({ text, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" role="dialog" aria-modal="true" aria-label="Practice passage">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="font-display text-[15px] font-bold text-navy-800">Practice Passage</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="scroll-thin overflow-y-auto whitespace-pre-wrap p-5 text-[13.5px] leading-relaxed text-slate-700">{text}</p>
      </div>
    </div>
  );
}

const SelfAssessmentSetup = () => {
  const { mode } = useParams();
  const cfg = MODES[mode];
  if (!cfg) return <Navigate to="/self-assessment/eng-typing" replace />;
  return <SetupPage key={mode} mode={mode} cfg={cfg} />;
};

function SetupPage({ mode, cfg }) {
  const navigate = useNavigate();
  const isSteno = cfg.kind === 'steno';
  const { isActive } = useFontGroupSettings();
  const fonts = isSteno ? cfg.fonts : cfg.fonts.filter((f) => isActive(f.value));
  const unavailable = isSteno ? !isActive(cfg.group) : fonts.length === 0;

  const [text, setText]         = useState('');
  const [font, setFont]         = useState(cfg.fonts[0].value);
  const [duration, setDuration] = useState(10);
  const [backspace, setBackspace] = useState('Full Backspace');
  const [source, setSource]     = useState('upload'); // 'upload' | 'paste'
  const [fileLoading, setFileLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const fileInputRef  = useRef(null);
  const audioInputRef = useRef(null);

  const [patterns, setPatterns]               = useState([]);
  const [loadingPatterns, setLoadingPatterns] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [patternModalOpen, setPatternModalOpen] = useState(false);
  const [lastPractices, setLastPractices]     = useState([]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const activeFont = fonts.some((f) => f.value === font) ? font : (fonts[0]?.value ?? font);

  useEffect(() => {
    resultPatternService.getPatterns()
      .then((data) => {
        const list = data || [];
        setPatterns(list);
        if (list.length > 0) setSelectedPattern(list.find((p) => p.is_default) || list[0]);
      })
      .catch(() => setPatterns([]))
      .finally(() => setLoadingPatterns(false));

    // Most recent self-practice attempts of this kind (results not tied to an exam).
    const userId = getCurrentUserUuid();
    if (userId && navigator.onLine) {
      resultService.getUserResults(userId)
        .then((rows) => setLastPractices(
          (rows || [])
            .filter((r) => !r.exam && belongsTo(mode, r))
            .sort((a, b) => new Date(b.date_taken) - new Date(a.date_taken))
            .slice(0, 5),
        ))
        .catch(() => {});
    }
  }, [mode]);

  // ── Passage file handling ────────────────────────────────────────────────
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
        setText(await file.text());
      } else {
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
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

  const handleAudioInput = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg|oga|webm|wma)$/i.test(file.name)) {
      alert('Please choose an audio file (mp3, wav, m4a, ogg …).');
      return;
    }
    setAudioFile(file);
  };

  const clearText = () => { setText(''); setFileName(''); };

  // ── Start ────────────────────────────────────────────────────────────────
  const canStart = !unavailable && wordCount > 0 && (!isSteno || !!audioFile);

  const handleStart = () => {
    if (!canStart) return;
    if (isSteno) {
      if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
      lastAudioUrl = URL.createObjectURL(audioFile);
      navigate('/steno-test', {
        state: {
          mode: cfg.group,
          testType: 'Preloaded',
          chapter: {
            id: null,
            name: 'Self Assessment',
            content_text: text.trim(),
            time_minutes: duration,
            test_type: 'Preloaded',
            font_group: cfg.group,
            hindi_font_type: activeFont || null,
          },
          resultPattern: selectedPattern || null,
          // The student's own dictation, played from this device (never uploaded).
          selfAudioUrl: lastAudioUrl,
        },
      });
      return;
    }
    // Typing: state contract unchanged (plus the chosen backspace rule).
    navigate('/test', {
      state: {
        isSelfAssessment: true,
        mode: activeFont,
        testType: 'Preloaded',
        chapter: {
          id: null,
          name: 'Self Assessment',
          content_text: text.trim(),
          time_minutes: duration,
          font_group: activeFont,
        },
        resultPattern: selectedPattern || null,
        backspaceControl: backspace,
      },
    });
  };

  const sourceBtn = (id, label, Icon) => (
    <button
      type="button"
      onClick={() => setSource(id)}
      aria-pressed={source === id}
      className={`flex items-center gap-2 rounded-md border px-3.5 py-2.5 text-left text-[12.5px] font-medium transition-colors duration-150 ${
        source === id ? 'border-primary bg-primary-50 text-primary-700' : 'border-slate-300 text-slate-600 hover:border-primary'}`}>
      <Icon className="h-4 w-4" aria-hidden="true" /> {label}
    </button>
  );

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <PageHeading
        icon={<ClipboardListIcon className="h-5 w-5" aria-hidden="true" />}
        title={`Self Assessment — ${cfg.title}`}
        subtitle="Set up your own practice test. No ranking, no pressure — just focused practice."
        crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Self Assessment' }, { label: cfg.title }]} />

      {unavailable &&
        <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
          {cfg.title} practice is currently switched off by the institute.
        </p>
      }

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
          <h3 className="mb-3.5 font-display text-[15px] font-bold text-navy-800">Practice Setup</h3>

          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-navy-800">
            <ClockIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> {isSteno ? 'Typing Time (after dictation)' : 'Test Duration'}
          </p>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Test duration">
            {DURATIONS.map((t) => (
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
            <FileTextIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> {isSteno ? 'Transcription Passage' : 'Passage Source'}
          </p>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            {sourceBtn('upload', 'Upload Passage File', UploadCloudIcon)}
            {sourceBtn('paste', 'Paste Your Own Text', FileTextIcon)}
          </div>

          {source === 'upload' ?
            text && fileName ?
              <div className="mb-3 rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary-50 text-primary">
                    <FileTextIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-semibold text-navy-800">{fileName}</span>
                      <span className="rounded bg-primary-50 px-1.5 py-[1px] text-[9px] font-bold uppercase text-primary-700">{fileName.split('.').pop()}</span>
                    </span>
                    <span className="block text-[10.5px] text-slate-500">{wordCount} words</span>
                  </span>
                </div>
                <div className="scroll-thin mt-2.5 h-[150px] overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-600">{text}</div>
                <div className="mt-2.5 flex gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-300 py-1.5 text-[11px] font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50">
                    <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Replace
                  </button>
                  <button type="button" onClick={() => setViewOpen(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-300 py-1.5 text-[11px] font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50">
                    <EyeIcon className="h-3.5 w-3.5" aria-hidden="true" /> View
                  </button>
                  <button type="button" onClick={clearText} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-300 py-1.5 text-[11px] font-medium text-rose-600 transition-colors duration-150 hover:bg-rose-50">
                    <XIcon className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                  </button>
                </div>
              </div> :
              <div
                role="button"
                tabIndex={0}
                onClick={() => !fileLoading && fileInputRef.current?.click()}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !fileLoading) { e.preventDefault(); fileInputRef.current?.click(); } }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
                className={`mb-3 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors duration-150 ${
                  dragOver ? 'border-primary bg-primary-50' : 'border-slate-300 hover:border-primary hover:bg-slate-50'}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary-50 text-primary">
                  {fileLoading ? <Loader2Icon className="h-5 w-5 animate-spin" aria-hidden="true" /> : <UploadCloudIcon className="h-5 w-5" aria-hidden="true" />}
                </span>
                <span className="min-w-0 text-[12.5px] text-slate-600">
                  {fileLoading ? 'Reading file…' :
                    <><strong className="text-navy-800">Click to upload</strong> or drag &amp; drop<br /><span className="text-[11.5px] text-slate-500">.txt or .docx supported</span></>}
                </span>
              </div> :
            <>
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setFileName(''); }}
                placeholder="Paste or type the passage you want to test yourself on"
                aria-label="Practice text"
                data-allow-paste
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                className="h-[180px] w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-[13.5px] leading-relaxed text-navy-800 outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-primary" />
              <p className="mb-3 mt-1 text-[11.5px] text-slate-500">
                {wordCount > 0 ? <><strong className="text-navy-800">{wordCount}</strong> words · <strong className="text-navy-800">{text.length}</strong> characters</> : 'No text yet'}
              </p>
            </>
          }
          <input ref={fileInputRef} type="file" accept=".txt,.doc,.docx" className="hidden" onChange={handleFileInput} />

          {isSteno &&
            <>
              <p className="mb-2 mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-navy-800">
                <MusicIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Dictation Audio
              </p>
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary-50 text-primary">
                  <MusicIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 text-[12.5px]">
                  {audioFile ?
                    <><strong className="block truncate text-navy-800">{audioFile.name}</strong><span className="text-[10.5px] text-slate-500">{audioFile.size >= 1048576 ? `${(audioFile.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(audioFile.size / 1024))} KB`} · plays from this device only</span></> :
                    <><strong className="text-navy-800">Upload Audio</strong><span className="block text-[10.5px] text-slate-500">mp3, wav, m4a or ogg — the dictation of the passage above</span></>}
                </span>
                <button type="button" onClick={() => audioInputRef.current?.click()} className="flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary transition-colors duration-150 hover:bg-primary-50">
                  <UploadCloudIcon className="h-3.5 w-3.5" aria-hidden="true" /> {audioFile ? 'Replace' : 'Choose File'}
                </button>
                {audioFile &&
                  <button type="button" onClick={() => setAudioFile(null)} aria-label="Remove audio" className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <XIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                }
                <input ref={audioInputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.wma" className="hidden" onChange={handleAudioInput} />
              </div>
            </>
          }

          <div className={`grid gap-3.5 ${isSteno ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-navy-800">Font Group</span>
              <select
                value={activeFont}
                onChange={(e) => setFont(e.target.value)}
                disabled={fonts.length < 2}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none focus:border-primary disabled:bg-slate-50">
                {fonts.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            {!isSteno &&
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-navy-800">Backspace</span>
                <select
                  value={backspace}
                  onChange={(e) => setBackspace(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none focus:border-primary">
                  {BACKSPACE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            }
            <div className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-navy-800">Exam/ Result Pattern</span>
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
              <div><dt className="text-slate-500">Qualify on</dt><dd className="font-semibold text-navy-800">{selectedPattern.qualify_on} ≥ {selectedPattern.required_speed}</dd></div>
              <div><dt className="text-slate-500">Accuracy required</dt><dd className="font-semibold text-navy-800">{selectedPattern.required_accuracy}%</dd></div>
              <div><dt className="text-slate-500">Penalty</dt><dd className="font-semibold text-navy-800">{selectedPattern.penalty_value} {selectedPattern.penalty_type}/mistake</dd></div>
              <div><dt className="text-slate-500">Half mistakes</dt><dd className="font-semibold text-navy-800">{selectedPattern.half_mistake_enabled ? 'Enabled' : 'Disabled'}</dd></div>
            </dl>
          }

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
              <PlayIcon className="h-4 w-4 fill-current" aria-hidden="true" /> Start Practice
            </button>
            {!unavailable && !canStart &&
              <span className="text-[12px] text-slate-500">
                {wordCount === 0 ? (isSteno ? 'Add the passage and its dictation audio to continue' : 'Upload or paste text to continue') : 'Upload the dictation audio to continue'}
              </span>
            }
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="font-display text-[13.5px] font-semibold text-navy-800">Summary</h3>
            <dl className="mt-2.5 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Words</dt><dd className="font-semibold text-navy-800">{wordCount}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">{isSteno ? 'Typing time' : 'Duration'}</dt><dd className="font-semibold text-navy-800">{duration} min</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Font</dt><dd className="text-right font-semibold text-navy-800">{(fonts.find((f) => f.value === activeFont)?.label || cfg.title).replace(' (GAIL)', '')}</dd></div>
              {isSteno && <div className="flex justify-between gap-2"><dt className="text-slate-500">Audio</dt><dd className="font-semibold text-navy-800">{audioFile ? 'Ready' : 'Not added'}</dd></div>}
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="flex items-center gap-2 font-display text-[13.5px] font-semibold text-navy-800">
              <ClockIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Your Last 5 Practices
            </h3>
            {lastPractices.length === 0 ?
              <p className="mt-2.5 text-[12px] text-slate-500">No {cfg.title} self-practice tests yet.</p> :
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
            Self assessment results are private. They do not affect your leaderboard rank, so practise freely and track improvement over time.
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
      {viewOpen && <TextModal text={text} onClose={() => setViewOpen(false)} />}
    </div>
  );
}

export default SelfAssessmentSetup;
