import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  FileTextIcon,
  BookOpenCheckIcon,
  BarChart3Icon,
  TargetIcon,
  CheckCircle2Icon,
  SearchIcon,
  HeadphonesIcon,
} from 'lucide-react';
import { Breadcrumbs } from '../../ui/PageHeading';
import { STENO_MODES, PRELOAD, examMatchesMode, chapterInExam } from '../../features/exams/examData';
import { useExamList, useChapterSummary, useExamOfflineSave, useOnlineStatus } from '../../features/exams/useExamData';
import { ExamLogo, CardSaveButton, EmptyState, LoadingState, OfflineBanner } from '../../features/exams/ExamUI';

const palettes = [
  { iconBg: '#0D6EFD', cardBg: 'bg-primary-50/60', accent: 'text-primary' },
  { iconBg: '#198754', cardBg: 'bg-emerald-50/60', accent: 'text-success' },
  { iconBg: '#6F42C1', cardBg: 'bg-violet-50/60', accent: 'text-[#6F42C1]' },
  { iconBg: '#FD7E14', cardBg: 'bg-orange-50/60', accent: 'text-[#FD7E14]' },
  { iconBg: '#D63384', cardBg: 'bg-pink-50/60', accent: 'text-[#D63384]' },
  { iconBg: '#0DCAF0', cardBg: 'bg-cyan-50/60', accent: 'text-cyan-700' },
];

const footerFeatures = [
  { icon: BookOpenCheckIcon, title: 'Improve Your Skills', text: 'Regular practice with our expert dictations', color: '#0D6EFD' },
  { icon: BarChart3Icon, title: 'Track Progress', text: 'Detailed analysis and performance reports', color: '#198754' },
  { icon: TargetIcon, title: 'All Levels', text: 'From beginner to expert level dictations', color: '#6F42C1' },
  { icon: CheckCircle2Icon, title: 'Exam Focused', text: 'Based on latest exam patterns and standards', color: '#F59E0B' },
];

export default function StenoExams({ language }) {
  const steno = STENO_MODES[language];
  const mode = steno.value;
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
          <p className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-primary">
            <FileTextIcon className="h-4 w-4" aria-hidden="true" /> {steno.label} Exam
          </p>
          <h2 className="font-display text-[26px] font-bold leading-tight text-navy-800 sm:text-[30px]">
            {steno.label} Dictations
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            Practice {language === 'hindi' ? 'Hindi' : 'English'} Stenography dictations &amp; improve your speed,
            accuracy and transcription skills.
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

      {loading ? <LoadingState>Loading exam patterns...</LoadingState> :
        visible.length === 0 ?
          <EmptyState>{query ? 'No exams match your search.' : `No exams available for ${steno.label}.`}</EmptyState> :
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((exam, i) => {
              const p = palettes[i % palettes.length];
              const count = summary.filter((c) => chapterInExam(c, exam.id)).length;
              return (
                <Link
                  key={exam.id}
                  to={`/steno/${exam.id}?mode=${encodeURIComponent(mode)}`}
                  className={`relative flex flex-col overflow-hidden rounded-xl border border-slate-200 ${p.cardBg} p-4 shadow-card transition-transform duration-150 hover:-translate-y-0.5`}>
                  <span
                    className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full opacity-25 blur-xl"
                    style={{ backgroundColor: p.iconBg }}
                    aria-hidden="true" />
                  <div className="relative flex items-start gap-2">
                    {exam.image_url ?
                      <ExamLogo exam={exam} /> :
                      <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ backgroundColor: p.iconBg }}>
                        <HeadphonesIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    }
                    <span className="ml-auto flex items-center gap-2">
                      {!isOffline && <CardSaveButton status={offline.status[exam.id]} onClick={() => offline.save(exam)} />}
                      <span className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-500">
                        <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-[14.5px] font-bold leading-snug text-navy-800">{exam.name}</h3>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {isOffline ? 'Saved dictations' : `${count} Dictation${count === 1 ? '' : 's'}`}
                    {exam.test_time_minutes ? ` · ${exam.test_time_minutes} min transcription` : ''}
                  </p>
                  <span className={`mt-auto pt-4 text-[12.5px] font-semibold ${p.accent}`}>Practice Now →</span>
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
