import { useEffect, useState } from 'react';
import {
  AlertTriangleIcon, CalendarIcon, ClockIcon, EyeIcon, EyeOffIcon, GaugeIcon, HashIcon, KeyboardIcon, Loader2Icon, MicIcon, SparklesIcon, Trash2Icon, TrophyIcon, TypeIcon, UserIcon, XIcon,
} from 'lucide-react';
import { resultService } from '../../services/api';
import { passageTopic } from '../exams/examData';
import { fontFamilyForHindiType } from '../../utils/hindiFonts';
import { releaseLabel } from './resultTiming';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// Delete option on steno attempts: only below this accuracy (the API enforces it too).
const DELETE_BELOW_ACCURACY = 30;

export function StenoDeleteNotice() {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11.5px] text-amber-800">
      <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-bold">Delete option is available only for attempted tests with accuracy below {DELETE_BELOW_ACCURACY}%.</span>{' '}
        Tests with {DELETE_BELOW_ACCURACY}% accuracy or above cannot be deleted.
      </span>
    </p>
  );
}

export function RankModal({ row, onClose }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    resultService.getChapterRank(row.chapter_id, row.student_id)
      .then((d) => setInfo(d || { rank: null, total: 0 }))
      .catch(() => setError('Could not load the rank. Check your connection.'));
  }, [row]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" role="dialog" aria-modal="true" aria-label="Your rank">
      <div className="w-full max-w-xs rounded-xl bg-white p-6 text-center shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[14px] font-bold text-navy-800">
            <TrophyIcon className="h-4 w-4 text-amber-500" aria-hidden="true" /> Your Rank
          </p>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600">
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        {error ? <p className="mt-4 text-[12.5px] text-danger">{error}</p> :
          !info ? <p className="mt-6 flex justify-center"><Loader2Icon className="h-5 w-5 animate-spin text-primary" aria-label="Loading" /></p> :
            info.rank ? <>
              <p className="mt-4 font-display text-[36px] font-extrabold text-violet-600">#{info.rank}</p>
              <p className="mt-1 text-[12.5px] text-slate-500">out of {Number(info.total).toLocaleString()} participants</p>
            </> :
              <p className="mt-4 text-[12.5px] text-slate-500">
                {info.pending_until ? 'Rank will be shown after the live test session ends.' : 'No rank available for this test yet.'}
              </p>
        }
      </div>
    </div>
  );
}

const referenceOf = (r) => r.chapter?.content_text || (Array.isArray(r.reference_words) ? r.reference_words.join(' ') : '');

export function StenoAttemptCard({ row: r, metrics: m, attemptNo, releaseAt, typeBadge, showStudent, canDelete, deleting, onRank, onDeep, onView, onDelete }) {
  const words = Array.isArray(r.reference_words) ? r.reference_words.filter(Boolean).length : 0;
  const topic = passageTopic(referenceOf(r));
  const topicFont = fontFamilyForHindiType(r.pattern_data?.hindi_font_type);
  const dictSpeed = r.pattern_data?.dict_speed ?? r.chapter?.steno_speed;
  const seen = r.pattern_data?.dictation_seen === true;
  const heading = `${r.exam?.name || 'Self Practice'}${r.chapter?.chapter_no ? ` — Dictation No. ${r.chapter.chapter_no}` : ''}`;
  const showDelete = canDelete && !releaseAt && m.accuracy < DELETE_BELOW_ACCURACY;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <p className="flex min-w-0 flex-1 items-start gap-2 text-[13px] font-semibold text-navy-800">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-50 text-primary">
            <MicIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 truncate" title={heading}>
            {heading}{topic && <> — Topic: <span style={topicFont ? { fontFamily: topicFont } : undefined}>{topic}</span></>}
          </span>
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {typeBadge}
          <button type="button" disabled={!!releaseAt} onClick={onDeep} className="flex items-center gap-1 rounded-full bg-teal-500 px-2.5 py-1 text-[10.5px] font-semibold text-white transition-colors duration-150 hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40">
            <SparklesIcon className="h-3 w-3" aria-hidden="true" /> Deep Analysis
          </button>
          {r.chapter_id &&
            <button type="button" onClick={onRank} className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10.5px] font-semibold text-white transition-colors duration-150 hover:bg-amber-600">
              <TrophyIcon className="h-3 w-3" aria-hidden="true" /> Rank
            </button>
          }
          <button
            type="button"
            disabled={!!releaseAt}
            title={releaseAt ? `Available at ${releaseLabel(releaseAt)}` : undefined}
            onClick={onView}
            className="flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-[10.5px] font-semibold text-white transition-colors duration-150 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
            <EyeIcon className="h-3 w-3" aria-hidden="true" /> View Result
          </button>
          {showDelete &&
            <button type="button" disabled={deleting} aria-label="Delete attempt" title="Delete attempt" onClick={onDelete} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600 transition-colors duration-150 hover:bg-rose-100 disabled:opacity-50">
              {deleting ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          }
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[11.5px] text-slate-500">
        {showStudent && <span className="flex items-center gap-1 font-medium text-navy-800"><UserIcon className="h-3 w-3 text-slate-400" aria-hidden="true" /> {r.user?.name || '—'}{r.user?.user_id ? ` (${r.user.user_id})` : ''}</span>}
        {attemptNo != null && <span className="flex items-center gap-1"><HashIcon className="h-3 w-3 text-slate-400" aria-hidden="true" /> Attempt {attemptNo}</span>}
        <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3 text-slate-400" aria-hidden="true" /> Date {fmtDate(r.date_taken)}</span>
        {dictSpeed && <span className="flex items-center gap-1"><GaugeIcon className="h-3 w-3 text-amber-500" aria-hidden="true" /> Dict Speed {dictSpeed}</span>}
        {!releaseAt && <span className="flex items-center gap-1"><KeyboardIcon className="h-3 w-3 text-primary" aria-hidden="true" /> Typing {m.gwpm} WPM</span>}
        {words > 0 && <span className="flex items-center gap-1"><TypeIcon className="h-3 w-3 text-slate-400" aria-hidden="true" /> Words {words}</span>}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        {releaseAt ?
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-[3px] text-[10.5px] font-semibold text-slate-600">
            <ClockIcon className="h-3 w-3" aria-hidden="true" /> Result at {releaseLabel(releaseAt)}
          </span> :
          <span className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[10.5px] font-bold ${m.accuracy >= 50 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
              <GaugeIcon className="h-3 w-3" aria-hidden="true" /> {Number(m.accuracy).toFixed(2)}%
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-[3px] text-[10.5px] font-semibold ${m.qualified ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
              {m.qualified ? 'Qualified' : 'Not Qualified'}
            </span>
          </span>
        }
        {seen ?
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-[3px] text-[10.5px] font-semibold text-emerald-700">
            <EyeIcon className="h-3 w-3" aria-hidden="true" /> Seen
          </span> :
          <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-[3px] text-[10.5px] font-semibold text-rose-600">
            <EyeOffIcon className="h-3 w-3" aria-hidden="true" /> Unseen
          </span>
        }
      </div>
    </article>
  );
}
