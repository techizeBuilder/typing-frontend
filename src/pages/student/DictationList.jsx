import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BarChart2Icon, SearchIcon, LayersIcon, PlayIcon, RotateCcwIcon, CrownIcon, CheckIcon, PenLineIcon, EyeIcon, HeartIcon } from 'lucide-react';
import { Breadcrumbs } from '../../ui/PageHeading';
import { STENO_MODES, PRELOAD, DICTATION_LEVELS, dictationDifficulty, dictationLevel, modeLabel, passageTopic, sortByChapterNo, wordCountFor } from '../../features/exams/examData';
import { useExamList, useChapterSession } from '../../features/exams/useExamData';
import { OfflineBanner, SaveOfflineButton, EmptyState, LoadingState } from '../../features/exams/ExamUI';
import { isSeen } from '../../features/steno/stenoPractice';
import { useFavourites } from '../../features/favourites/favouritesStore';
import { FavouriteButton, FolderButton } from '../../features/favourites/FavouriteUI';
import { fontFamilyForChapter } from '../../utils/hindiFonts';
import { computeResultMetrics } from '../../utils/resultMetrics';

export default function DictationList() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [params] = useSearchParams();
  const mode = params.get('mode') === STENO_MODES.hindi.value ? STENO_MODES.hindi.value : STENO_MODES.english.value;
  const listPath = mode === STENO_MODES.hindi.value ? '/hindi-steno' : '/english-steno';
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [favOnly, setFavOnly] = useState(false);
  const favs = useFavourites();
  const { exams, loading: examsLoading } = useExamList();
  const exam = exams.find((e) => e.id === examId);
  const session = useChapterSession({ exam, mode, testType: PRELOAD });
  const { chapters, loading, isOffline, latestByChapter } = session;

  const sorted = useMemo(() => [...chapters].sort(sortByChapterNo), [chapters]);
  const rows = sorted
    .map((chapter, index) => ({ chapter, index }))
    .filter(({ chapter }) => difficulty === 'all' || dictationLevel(chapter) === difficulty)
    .filter(({ chapter }) => !favOnly || favs.favourites.includes(chapter.id))
    .filter(({ chapter, index }) =>
      `${index + 1} ${chapter.chapter_no} ${chapter.name || ''} ${passageTopic(chapter.content_text)} ${wordCountFor(chapter)}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()));

  // One section per admin-set volume, in dictation order.
  const sections = [];
  rows.forEach((row) => {
    const title = row.chapter.volume || 'Available Dictations';
    let section = sections.find((s) => s.title === title);
    if (!section) { section = { title, rows: [] }; sections.push(section); }
    section.rows.push(row);
  });

  // Opens the practice setup page (speed, word length, exam interface…).
  const takeTest = (chapter) =>
    navigate(`/steno/${exam.id}/practice/${chapter.id}?mode=${encodeURIComponent(mode)}`);

  if (!examsLoading && !exam) {
    return (
      <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
        <EmptyState>
          This exam is not available{isOffline ? ' offline' : ''}.{' '}
          <Link to={listPath} className="font-semibold text-primary hover:underline">Back to {modeLabel(mode)}</Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-3">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', to: '/dashboard' },
            { label: `${modeLabel(mode)} Exam`, to: listPath },
            { label: exam?.name || '…' },
          ]} />
      </div>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-50 text-primary">
            <PenLineIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="min-w-0 font-display text-[22px] font-bold leading-tight text-navy-800 sm:text-[26px]">{exam?.name}</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {favs.status === 'ready' &&
              <button type="button" onClick={() => setFavOnly((v) => !v)} aria-pressed={favOnly}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[12.5px] font-semibold transition-colors duration-150 ${
                  favOnly ? 'border-rose-500 bg-rose-500 text-white' : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'}`}>
                <HeartIcon className="h-4 w-4 fill-current" aria-hidden="true" /> Favourite Dictations
                <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10.5px] font-bold ${favOnly ? 'bg-white text-rose-600' : 'bg-rose-500 text-white'}`}>
                  {chapters.filter((c) => favs.favourites.includes(c.id)).length}
                </span>
              </button>
            }
            {!isOffline && chapters.length > 0 &&
              <SaveOfflineButton status={session.downloadStatus} onClick={session.downloadOffline} progress={session.audioProgress} />
            }
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="block w-full sm:w-auto">
          <span className="sr-only">Filter by difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-primary sm:w-[300px]">
            <option value="all">Filter by Difficulty</option>
            {DICTATION_LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </label>
        <div className="relative w-full sm:ml-auto sm:w-auto">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topic / number / words..."
            aria-label="Search topic, number or words"
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-[13px] outline-none transition-colors duration-150 focus:border-primary sm:w-[320px]" />
        </div>
        </div>
      </section>

      {isOffline && <OfflineBanner what="dictations" />}

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        {loading || examsLoading ? <LoadingState>Loading dictations…</LoadingState> :
          chapters.length === 0 ? <EmptyState>No dictations found for this exam pattern.</EmptyState> :
            rows.length === 0 ? <EmptyState>{favOnly ? 'No favourite dictations here yet. Tap the heart on a dictation to add it.' : 'No dictations match your filters.'}</EmptyState> :
              sections.map((section) => (
              <div key={section.title}>
              <div className="mb-4 flex items-center gap-2 border-l-4 border-primary bg-slate-50 px-3 py-2">
                <LayersIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="font-display text-[15px] font-semibold text-navy-800">{section.title}</h3>
                <span className="ml-auto rounded bg-slate-100 px-2 py-[2px] text-[11px] font-medium text-slate-600">
                  {section.rows.length} Dictation{section.rows.length === 1 ? '' : 's'}
                </span>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {section.rows.map(({ chapter, index }) => {
                  const last = latestByChapter[chapter.id];
                  const score = dictationDifficulty(chapter);
                  const topicFont = fontFamilyForChapter(chapter);
                  return (
                    <li key={chapter.id} className="flex flex-col rounded-lg border border-slate-200 bg-white p-3.5 shadow-card">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display text-[15px] font-semibold text-navy-800">Dictation No. {index + 1}</h4>
                        <span className="flex items-center gap-1.5">
                          {isSeen(chapter.id) && <span title="Marked as seen" className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-[3px] text-[10.5px] font-medium text-slate-600"><EyeIcon className="h-3 w-3" aria-hidden="true" /> Seen</span>}
                          <FolderButton chapterId={chapter.id} title={chapter.name} />
                          <FavouriteButton chapterId={chapter.id} />
                        </span>
                      </div>
                      {score !== null && <>
                        <p className="mt-2.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          <BarChart2Icon className="h-3 w-3" aria-hidden="true" /> Difficulty level of the dictation
                        </p>
                        <p className="mt-1 text-[12.5px] font-semibold text-[#B45309]">{score.toFixed(1)} <span className="text-slate-400">/10</span></p>
                        <span className="mt-1 block h-[3px] w-full rounded-full bg-slate-100">
                          <span className="block h-full rounded-full bg-[#F59E0B]" style={{ width: `${score * 10}%` }} />
                        </span>
                      </>}

                      <ul className="mt-2.5 space-y-1 text-[12px] text-slate-600">
                        <li className="flex gap-1.5">
                          <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span>Topic — <span style={topicFont ? { fontFamily: topicFont } : undefined}>{passageTopic(chapter.content_text) || chapter.name || `Dictation ${chapter.chapter_no || index + 1}`}</span></span>
                        </li>
                        <li className="flex gap-1.5">
                          <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                          {wordCountFor(chapter)} Words
                        </li>
                        <li className="flex gap-1.5">
                          <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          {chapter.steno_speed ? `${chapter.steno_speed} WPM dictation` : 'All Speeds'}
                        </li>
                      </ul>

                      <p className="mt-2">
                        {chapter.is_paid ?
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-[2px] text-[11px] font-semibold text-[#B45309]">
                            <CrownIcon className="h-3 w-3" aria-hidden="true" /> PAID
                          </span> :
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-[2px] text-[11px] font-semibold text-emerald-700">
                            <CheckIcon className="h-3 w-3" aria-hidden="true" /> FREE
                          </span>
                        }
                      </p>

                      {last &&
                        <div className="mt-2.5 rounded border border-rose-100 bg-rose-50 px-2.5 py-2">
                          <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <RotateCcwIcon className="h-3 w-3" aria-hidden="true" /> Your last attempt
                            <span className="ml-auto font-display text-[13px] font-bold text-navy-800">
                              {computeResultMetrics(last).accuracy.toFixed(1)}%
                            </span>
                          </p>
                          <p className="text-[10.5px] text-slate-500">
                            {new Date(last.date_taken || last.created_at).toLocaleDateString('en-GB')} • {last.nwpm} WPM
                          </p>
                        </div>
                      }

                      <div className="mt-auto pt-3">
                        <button
                          type="button"
                          onClick={() => takeTest(chapter)}
                          className={`flex w-full items-center justify-center gap-2 rounded-md py-2 text-[12.5px] font-semibold transition-colors duration-150 ${
                            last ? 'border border-slate-300 bg-white text-navy-800 hover:bg-slate-50' : 'bg-navy-900 text-white hover:bg-navy-800'}`}>
                          {last ?
                            <><RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Re-attempt</> :
                            <><PlayIcon className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> Take Test</>
                          }
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              </div>
              ))
        }
      </section>
    </div>
  );
}
