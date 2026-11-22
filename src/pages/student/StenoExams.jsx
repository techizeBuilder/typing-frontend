import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  BarChart3Icon,
  TargetIcon,
  CheckCircle2Icon,
  CrownIcon,
  HeadphonesIcon,
  SearchIcon,
} from 'lucide-react';
import { Breadcrumbs } from '../../ui/PageHeading';
import { STENO_MODES, PRELOAD, examMatchesMode, chapterInExam } from '../../features/exams/examData';
import { useFontGroupSettings } from '../../features/fontGroups/fontGroups';
import { useExamList, useChapterSummary, useExamOfflineSave, useOnlineStatus } from '../../features/exams/useExamData';
import { ExamLogo, CardSaveButton, EmptyState, LoadingState, OfflineBanner } from '../../features/exams/ExamUI';

const palettes = [
  { color: '#0D6EFD', tint: '#EAF2FF', circle: '#CFDFFB' },
  { color: '#16A34A', tint: '#E9FBEF', circle: '#C9EFD6' },
  { color: '#F59E0B', tint: '#FFF7E6', circle: '#FDE9C4' },
  { color: '#7C3AED', tint: '#F4EEFF', circle: '#E2D6FB' },
  { color: '#E11D48', tint: '#FFF0F3', circle: '#FBD2DC' },
];

const footerFeatures = [
  { icon: BookOpenCheckIcon, title: 'Improve Your Skills', text: 'Regular practice with our expert dictations', color: '#0D6EFD' },
  { icon: BarChart3Icon, title: 'Track Progress', text: 'Detailed analysis and performance reports', color: '#198754' },
  { icon: TargetIcon, title: 'All Levels', text: 'From beginner to expert level dictations', color: '#6F42C1' },
  { icon: CheckCircle2Icon, title: 'Exam Focused', text: 'Based on latest exam patterns and standards', color: '#F59E0B' },
];

// Chips the admin typed for this exam, else the facts we know about it.
const cardTags = (exam, language, count) => {
  const typed = String(exam.card_tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  if (typed.length > 0) return typed;
  return [language, `${count} Dictation${count === 1 ? '' : 's'}`, 'All Speeds'];
};

export default function StenoExams({ language }) {
  const steno = STENO_MODES[language];
  const mode = steno.value;
  const languageName = language === 'hindi' ? 'Hindi' : 'English';
  const offered = useFontGroupSettings().isActive(mode);
  const [query, setQuery] = useState('');
  const { exams, loading } = useExamList();
  const summary = useChapterSummary(mode, PRELOAD);
  const offline = useExamOfflineSave(mode);
  const isOffline = useOnlineStatus();

  const visible = useMemo(
    () => exams
      .filter((e) => examMatchesMode(e, mode))
      .filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase())),
    [exams, mode, query],
  );

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-3">
        <Breadcrumbs crumbs={[{ label: 'Home', to: '/dashboard' }, { label: `${steno.label} Exam` }]} />
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight text-navy-800 sm:text-[30px]">
            {languageName} Dictations
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            Daily-use practice library — KC, Progressive, SSC PYQs, Legal, and more.
          </p>
        </div>
        <div className="relative ml-auto w-full sm:w-[280px]">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exam..."
            aria-label="Search exam"
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-[13px] outline-none transition-colors duration-150 focus:border-primary" />
        </div>
      </div>

      {isOffline && <OfflineBanner what="dictations" />}

      {!offered ? <EmptyState>{steno.label} is not offered at the moment.</EmptyState> :
        loading ? <LoadingState>Loading exam patterns...</LoadingState> :
        visible.length === 0 ?
          <EmptyState>{query ? 'No exams match your search.' : `No exams available for ${steno.label}.`}</EmptyState> :
          <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((exam, i) => {
              const p = palettes[i % palettes.length];
              const count = summary.filter((c) => chapterInExam(c, exam.id)).length;
              const subtitle = exam.display_title || (exam.test_time_minutes ? `${exam.test_time_minutes} Minutes` : `${count} Dictation${count === 1 ? '' : 's'}`);
              return (
                <Link
                  key={exam.id}
                  to={`/steno/${exam.id}?mode=${encodeURIComponent(mode)}`}
                  style={{ backgroundImage: `linear-gradient(135deg, #FFFFFF 45%, ${p.tint} 100%)` }}
                  className={`relative flex min-h-[208px] flex-col overflow-hidden rounded-xl border bg-white p-3 shadow-card transition-transform duration-150 hover:-translate-y-0.5 ${exam.is_pro_level ? 'border-[#F59E0B] ring-1 ring-[#F59E0B]' : 'border-slate-200'}`}>
                  <span
                    className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full"
                    style={{ backgroundColor: p.circle }}
                    aria-hidden="true" />
                  {exam.is_pro_level &&
                    <span className="pointer-events-none absolute -left-9 top-5 z-10 flex w-32 -rotate-45 items-center justify-center gap-1 bg-[#F59E0B] py-[3px] text-[8.5px] font-bold uppercase tracking-wide text-white shadow">
                      <CrownIcon className="h-2.5 w-2.5" aria-hidden="true" /> Pro Level
                    </span>
                  }
                  <div className={`relative flex items-start gap-2 ${exam.is_pro_level ? 'pl-6' : ''}`}>
                    {exam.image_url ?
                      <ExamLogo exam={exam} size="h-10 w-10" /> :
                      <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ backgroundColor: p.color }}>
                        <HeadphonesIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    }
                    <span className="ml-auto flex items-center gap-2">
                      {!isOffline && <CardSaveButton status={offline.status[exam.id]} onClick={() => offline.save(exam)} />}
                      <span className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-card">
                        <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </span>
                  </div>
                  <h3 className="relative mt-3 font-display text-[13.5px] font-bold leading-snug text-navy-800">{exam.name}</h3>
                  <p className="relative mt-1 text-[11.5px] text-slate-500">
                    {isOffline ? 'Saved dictations' : `${languageName} • ${subtitle}`}
                  </p>
                  <ul className="relative mt-2 flex flex-wrap gap-1.5">
                    {cardTags(exam, languageName, count).map((tag) => (
                      <li key={tag} className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-[2px] text-[10px] font-medium text-slate-700">
                        <span className="grid h-3 w-3 place-items-center rounded-full text-white" style={{ backgroundColor: p.color }} aria-hidden="true">
                          <svg viewBox="0 0 12 12" className="h-2 w-2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5 5 9l4.5-5.5" /></svg>
                        </span>
                        {tag}
                      </li>
                    ))}
                  </ul>
                  <span className="relative mt-auto pt-3">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-[11.5px] font-bold shadow-card" style={{ color: p.color }}>
                      Practice Now <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
      }

      <section className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:grid-cols-2 xl:grid-cols-4">
        {footerFeatures.map((f, i) => (
          <div key={f.title} className={`flex items-start gap-3 ${i > 0 ? 'xl:border-l xl:border-slate-100 xl:pl-5' : ''}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${f.color}1A`, color: f.color }}>
              <f.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-navy-800">{f.title}</p>
              <p className="text-[11.5px] leading-snug text-slate-500">{f.text}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
