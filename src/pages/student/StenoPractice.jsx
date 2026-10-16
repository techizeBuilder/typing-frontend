import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  GaugeIcon,
  KeyboardIcon,
  MaximizeIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RotateCcwIcon,
  TypeIcon,
  VolumeXIcon,
} from 'lucide-react';
import { Breadcrumbs } from '../../ui/PageHeading';
import { STENO_MODES, PRELOAD, modeLabel, sortByChapterNo, startTestState } from '../../features/exams/examData';
import { useExamList, useChapterSession } from '../../features/exams/useExamData';
import { EmptyState, LoadingState } from '../../features/exams/ExamUI';
import { DifficultyBadge } from '../../features/exams/ExamFilters';
import { fontFamilyForHindiType } from '../../utils/hindiFonts';
import { useDictationAudio } from '../../features/steno/useDictationAudio';
import {
  TRANSCRIPTION_INTERFACES,
  CLASSIC_INTERFACE,
  FLUCTUATIONS,
  findInterface,
  interfaceMinutes,
  isSeen,
  passageWords,
  rangeLabel,
  setSeen,
  speedChoices,
} from '../../features/steno/stenoPractice';
import { CommonConfigModal, InterfacePicker, TranscriptModal, WordLengthSelect } from '../../features/steno/PracticeControls';
import { FavouriteButton, FolderButton } from '../../features/favourites/FavouriteUI';

const HINDI_FONT_NAMES = {
  Mangal: 'Mangal (Unicode Devanagari)',
  KrutiDev: 'Kruti Dev (Remington layout)',
  RemingtonGail: 'Remington (GAIL)',
};

const fmt = (sec) => {
  const s = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const fieldCls = 'w-full rounded-md border border-slate-300 py-2.5 text-[13px] font-medium text-navy-800 outline-none focus:border-primary';

export default function StenoPractice() {
  const navigate = useNavigate();
  const { examId, chapterId } = useParams();
  const [params] = useSearchParams();
  const mode = params.get('mode') === STENO_MODES.hindi.value ? STENO_MODES.hindi.value : STENO_MODES.english.value;
  const isHindi = mode === STENO_MODES.hindi.value;
  const listPath = isHindi ? '/hindi-steno' : '/english-steno';
  const { exams, loading: examsLoading } = useExamList();
  const exam = exams.find((e) => e.id === examId);
  const session = useChapterSession({ exam, mode, testType: PRELOAD, withResults: false });
  const sorted = useMemo(() => [...session.chapters].sort(sortByChapterNo), [session.chapters]);
  const index = sorted.findIndex((c) => c.id === chapterId);
  const chapter = index >= 0 ? sorted[index] : null;

  const words = useMemo(() => passageWords(chapter?.content_text), [chapter]);
  const total = words.length;
  const defaultSpeed = Number(chapter?.steno_speed) || 100;
  const fontFamily = fontFamilyForHindiType(chapter?.hindi_font_type);

  const [speed, setSpeed] = useState(null); // null = admin default
  const [fluctuation, setFluctuation] = useState(0);
  const [volume, setVolume] = useState(80);
  const [range, setRange] = useState(null);
  const [seenMark, setSeenMark] = useState({ id: null, seen: false });
  const [showTranscript, setShowTranscript] = useState(false);
  const [showInterfaces, setShowInterfaces] = useState(false);
  const [commonOpen, setCommonOpen] = useState(false);
  const pickerRef = useRef(null);

  const activeSpeed = speed ?? defaultSpeed;
  const seen = seenMark.id === chapterId ? seenMark.seen : isSeen(chapterId);
  const markSeen = (value) => { setSeen(chapterId, value); setSeenMark({ id: chapterId, seen: value }); };

  // ─── Dictation audio ───────────────────────────────────────────────────────
  // No audio uploaded for this dictation (the test data says so) — don't request it.
  const noAudio = !!chapter && 'audio_url' in chapter && !chapter.audio_url;
  const { url: audioUrl, ready: audioReady } = useDictationAudio(noAudio ? null : chapter?.id);
  const audioRef = useRef(null);
  const fluctRef = useRef(1);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [audioError, setAudioError] = useState('');

  // The selected words map onto the audio by position (dictations are read at
  // an even pace), so the segment is an estimate.
  const segStart = range && duration ? (duration * range.start) / total : 0;
  const segEnd = range && duration ? (duration * (range.end + 1)) / total : duration;
  const segLength = Math.max(0, segEnd - segStart);
  const segPos = Math.min(segLength, Math.max(0, current - segStart));

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = (activeSpeed / defaultSpeed) * fluctRef.current;
    el.volume = volume / 100;
  }, [activeSpeed, defaultSpeed, volume]);

  // Fluctuation: vary the pace every few seconds around the chosen speed.
  useEffect(() => {
    if (!playing || !fluctuation) { fluctRef.current = 1; return undefined; }
    const id = setInterval(() => {
      fluctRef.current = 1 + (Math.random() * 2 - 1) * fluctuation;
      if (audioRef.current) audioRef.current.playbackRate = (activeSpeed / defaultSpeed) * fluctRef.current;
    }, 4000);
    return () => clearInterval(id);
  }, [playing, fluctuation, activeSpeed, defaultSpeed]);

  // Stop the dictation when the page closes.
  useEffect(() => () => audioRef.current?.pause(), []);

  const pause = () => { audioRef.current?.pause(); setPlaying(false); };

  const play = () => {
    const el = audioRef.current;
    setAudioError('');
    if (!el || !audioUrl) {
      setAudioError(navigator.onLine ? 'No audio is attached to this dictation.' : 'Audio is not available offline. Connect to the internet, or save this exam for offline use first.');
      return;
    }
    if (el.currentTime < segStart - 0.25 || el.currentTime >= segEnd - 0.25) el.currentTime = segStart;
    el.playbackRate = (activeSpeed / defaultSpeed) * fluctRef.current;
    el.volume = volume / 100;
    el.play().then(() => setPlaying(true)).catch(() => setAudioError('The audio could not be played. It may still be loading.'));
  };

  const restart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = segStart;
    setCurrent(segStart);
  };

  const seek = (e) => {
    if (!audioRef.current || !segLength) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = segStart + ratio * segLength;
    setCurrent(audioRef.current.currentTime);
  };

  const onTimeUpdate = (e) => {
    const t = e.currentTarget.currentTime;
    setCurrent(t);
    if (range && duration && t >= segEnd) { e.currentTarget.pause(); setPlaying(false); }
  };

  const changeRange = (r) => {
    pause();
    setRange(r);
    if (audioRef.current && duration) {
      const start = r ? (duration * r.start) / total : 0;
      audioRef.current.currentTime = start;
      setCurrent(start);
    }
  };

  // ─── Transcription ─────────────────────────────────────────────────────────
  const openPicker = () => {
    setShowInterfaces(true);
    setTimeout(() => pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  };

  const launch = (iface, minutes, backspace = 'Enabled') => {
    pause();
    navigate('/steno-test', {
      state: {
        ...startTestState(exam, chapter, mode, PRELOAD),
        practice: {
          interfaceId: iface.id,
          minutes,
          backspace,
          partial: Boolean(range),
          referenceText: range ? words.slice(range.start, range.end + 1).join(' ') : undefined,
          rangeLabel: range ? rangeLabel(range) : null,
        },
      },
    });
  };

  const selectInterface = (id) => {
    if (id === CLASSIC_INTERFACE.id) {
      pause();
      navigate('/steno-test', { state: startTestState(exam, chapter, mode, PRELOAD) });
      return;
    }
    const iface = findInterface(id);
    if (iface.variant === 'common') setCommonOpen(true);
    else launch(iface, interfaceMinutes(iface, isHindi));
  };

  const commonIface = findInterface('common');
  const commonDefault = commonIface.durationOptions.reduce((best, m) =>
    (Math.abs(m - (exam?.test_time_minutes || 50)) < Math.abs(best - (exam?.test_time_minutes || 50)) ? m : best), 50);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  if (!examsLoading && !session.loading && (!exam || !chapter)) {
    return (
      <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
        <EmptyState>
          This dictation is not available{session.isOffline ? ' offline' : ''}.{' '}
          <Link to={exam ? `/steno/${exam.id}?mode=${encodeURIComponent(mode)}` : listPath} className="font-semibold text-primary hover:underline">Back to dictations</Link>
        </EmptyState>
      </div>
    );
  }
  if (!exam || !chapter) return <div className="nd p-5"><LoadingState>Loading dictation…</LoadingState></div>;

  const title = chapter.name || `Dictation ${chapter.chapter_no || index + 1}`;
  const facts = [
    `Dictation No. ${index + 1}`,
    chapter.difficulty && `Difficulty – ${chapter.difficulty}`,
    `Words – ${total}`,
    `Speed – ${defaultSpeed} WPM`,
    exam.test_time_minutes && `Time – ${exam.test_time_minutes} Min`,
  ].filter(Boolean);
  const speeds = speedChoices(defaultSpeed);

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-3">
        <Breadcrumbs crumbs={[
          { label: 'Home', to: '/dashboard' },
          { label: `${modeLabel(mode)} Exam`, to: listPath },
          { label: exam.name, to: `/steno/${exam.id}?mode=${encodeURIComponent(mode)}` },
          { label: 'Practice' },
        ]} />
      </div>

      {audioUrl &&
        <audio ref={audioRef} src={audioUrl} preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)} />
      }

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        {/* Dictation header */}
        <div className="flex flex-wrap items-start gap-4 border-b border-slate-100 pb-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-50 text-primary">
            <FileTextIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex flex-wrap items-center gap-2 font-display text-[22px] font-bold leading-tight text-navy-800 sm:text-[24px]">
              {title} {chapter.difficulty && <DifficultyBadge value={chapter.difficulty} />}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-slate-500">{exam.name} · {facts.join(' • ')}</p>
          </div>
          <div className="flex items-center gap-2">
            <FavouriteButton chapterId={chapter.id} boxed />
            <FolderButton chapterId={chapter.id} title={title} boxed />
            <span className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-[12.5px] font-medium text-slate-600">
              {seen ? <EyeIcon className="h-4 w-4" aria-hidden="true" /> : <EyeOffIcon className="h-4 w-4" aria-hidden="true" />} {seen ? 'Seen' : 'Unseen'}
            </span>
            <span title="Length of the selected dictation audio" className="flex items-center gap-1.5 rounded-md border border-rose-200 px-3 py-2 text-[12.5px] font-semibold text-danger">
              <ClockIcon className="h-4 w-4" aria-hidden="true" /> {duration ? fmt(segLength / (activeSpeed / defaultSpeed)) : '--:--'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="grid gap-5 py-4 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-navy-800">Dictation Speed</span>
            <span className="relative block">
              <GaugeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <select value={activeSpeed} onChange={(e) => setSpeed(Number(e.target.value))} className={`${fieldCls} pl-9 pr-3`}>
                {speeds.map((s) => <option key={s} value={s}>{s} WPM{s === defaultSpeed ? ' (Default)' : ''}</option>)}
              </select>
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-navy-800">Fluctuation Level</span>
            <select value={fluctuation} onChange={(e) => setFluctuation(Number(e.target.value))} className={`${fieldCls} px-3 font-normal`}>
              {FLUCTUATIONS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
            </select>
          </label>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-navy-800">Volume Control</p>
            <div className="flex items-center gap-3 pt-1">
              <button type="button" aria-label="Decrease volume" onClick={() => setVolume((v) => Math.max(0, v - 10))}
                className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 text-slate-600 transition-colors duration-150 hover:bg-slate-50">
                {volume === 0 ? <VolumeXIcon className="h-4 w-4" aria-hidden="true" /> : <MinusIcon className="h-4 w-4" aria-hidden="true" />}
              </button>
              <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume"
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-navy-800"
                style={{ background: `linear-gradient(to right, #0A2E6B ${volume}%, #E2E8F0 ${volume}%)` }} />
              <button type="button" aria-label="Increase volume" onClick={() => setVolume((v) => Math.min(100, v + 10))}
                className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 text-slate-600 transition-colors duration-150 hover:bg-slate-50">
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Mark as */}
        <div className="pb-4">
          <p className="mb-1.5 text-[13px] font-semibold text-navy-800">Mark as</p>
          <div className="flex flex-wrap items-center gap-2">
            {[[false, 'Unseen', EyeOffIcon], [true, 'Seen', EyeIcon]].map(([value, label, Icon]) => (
              <button key={label} type="button" onClick={() => markSeen(value)} aria-pressed={seen === value}
                className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-[12.5px] font-medium transition-colors duration-150 ${
                  seen === value ? 'bg-navy-900 text-white' : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </button>
            ))}
            <button type="button" onClick={() => setShowTranscript(true)}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-[12.5px] font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50">
              <FileTextIcon className="h-4 w-4" aria-hidden="true" /> Show Transcription
            </button>
          </div>
        </div>

        {/* Word length */}
        <div className="pb-4">
          <WordLengthSelect range={range} total={total} words={words} wpm={activeSpeed} fontFamily={fontFamily} onChange={changeRange} />
        </div>

        {/* Timeline */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div role="slider" tabIndex={-1} aria-label="Dictation position" aria-valuemin={0} aria-valuemax={Math.round(segLength)} aria-valuenow={Math.round(segPos)}
            onClick={seek} className={`mb-2 py-1 ${audioUrl ? 'cursor-pointer' : ''}`}>
            <span className="block h-1 w-full rounded-full bg-slate-200">
              <span className="block h-full rounded-full bg-danger" style={{ width: `${segLength ? (segPos / segLength) * 100 : 0}%` }} />
            </span>
          </div>
          <div className="flex items-center text-[12.5px] text-slate-600">
            <button type="button" onClick={restart} disabled={!audioUrl} className="flex items-center gap-1.5 hover:text-navy-800 disabled:opacity-50" title="Back to the start">
              <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" /> {fmt(segPos)}
            </button>
            <span className="ml-auto">{duration ? fmt(segLength) : '--:--'}{range && duration ? ' (estimated part)' : ''}</span>
          </div>
        </div>
        {noAudio
          ? <p role="status" className="mt-2 text-[12px] text-amber-700">No audio is attached to this dictation yet. You can still read the passage and transcribe it.</p>
          : audioReady && !audioUrl && <p className="mt-2 text-[12px] text-amber-700">Audio is not available offline for this dictation.</p>}
        {audioError && <p role="alert" className="mt-2 text-[12px] font-medium text-danger">{audioError}</p>}

        {/* Hindi font (fixed by the institute so grading matches the passage) */}
        {isHindi && chapter.hindi_font_type &&
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-orange-600 text-white"><TypeIcon className="h-4 w-4" aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-navy-800">Hindi typing font: {HINDI_FONT_NAMES[chapter.hindi_font_type] || chapter.hindi_font_type}</span>
              <span className="block text-[11px] text-slate-500">Set by your institute for this dictation. Type in this font so your answer can be checked.</span>
            </span>
          </div>
        }

        {showInterfaces &&
          <div ref={pickerRef} className="mt-4">
            <InterfacePicker interfaces={TRANSCRIPTION_INTERFACES} classic={CLASSIC_INTERFACE} classicDisabled={Boolean(range)} onSelect={selectInterface} />
          </div>
        }

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={playing ? pause : play} disabled={noAudio} title={noAudio ? 'No audio for this dictation' : undefined}
            className="flex min-w-[200px] items-center justify-center gap-2 rounded-md bg-primary py-3 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
            {playing ? <PauseIcon className="h-4 w-4 fill-current" aria-hidden="true" /> : <PlayIcon className="h-4 w-4 fill-current" aria-hidden="true" />}
            {noAudio ? 'No Audio' : playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={openPicker}
            className="flex min-w-[200px] items-center justify-center gap-2 rounded-md bg-danger py-3 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-[#bb2d3b]">
            <KeyboardIcon className="h-4 w-4" aria-hidden="true" /> Transcribe Now
          </button>
          <button type="button" onClick={toggleFullScreen}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-6 py-3 text-[14px] font-semibold text-navy-800 transition-colors duration-150 hover:bg-slate-50 sm:ml-auto">
            <MaximizeIcon className="h-4 w-4" aria-hidden="true" /> Full Screen
          </button>
        </div>
      </section>

      {showTranscript &&
        <TranscriptModal title={`${title} — Transcription`} text={chapter.content_text} fontFamily={fontFamily} onClose={() => setShowTranscript(false)} />
      }
      {commonOpen &&
        <CommonConfigModal options={commonIface.durationOptions} defaultMinutes={commonDefault} onClose={() => setCommonOpen(false)}
          onContinue={({ minutes, backspace }) => { setCommonOpen(false); launch(commonIface, minutes, backspace); }} />
      }
    </div>
  );
}
