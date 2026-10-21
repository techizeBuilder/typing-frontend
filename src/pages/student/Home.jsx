import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFontGroupSettings } from '../../features/fontGroups/fontGroups';
import { offersFontGroups } from '../../layouts/navigation';
import {
  KeyboardIcon,
  PenLineIcon,
  MonitorIcon,
  HeadphonesIcon,
  BarChart2Icon,
  BarChart3Icon,
  GraduationCapIcon,
  MegaphoneIcon,
  CalendarClockIcon,
  ArrowRightIcon,
} from 'lucide-react';
import api, { flashBannerService, resultService } from '../../services/api';
import { useExamList } from '../../features/exams/useExamData';
import { HomeSiteLinks } from '../../features/siteInfo/SiteInfoUI';

const primaryCards = [
  {
    title: 'Typing Exam',
    fontGroups: ['English Typing', 'Hindi Mangal', 'Hindi Kruti Dev', 'Hindi Remington (GAIL)'],
    text: 'Improve your typing speed and accuracy with exam oriented tests.',
    cta: 'Start Test',
    to: '/typing-exam',
    titleClass: 'text-primary',
    btnClass: 'bg-primary hover:bg-primary-700',
    bg: 'bg-[#EFF6FF]',
    ring: 'bg-[#DBEAFE]',
    icon: KeyboardIcon,
    iconClass: 'text-primary',
  },
  {
    title: 'English Steno Exam',
    fontGroups: ['Steno English'],
    text: 'Practice English Stenography dictations and enhance your skills.',
    cta: 'Start Test',
    to: '/english-steno',
    titleClass: 'text-success',
    btnClass: 'bg-success hover:bg-[#146c43]',
    bg: 'bg-[#F0FDF4]',
    ring: 'bg-[#DCFCE7]',
    icon: PenLineIcon,
    iconClass: 'text-success',
  },
  {
    title: 'Hindi Steno Exam',
    fontGroups: ['Steno Hindi'],
    text: 'अभ्यास करें हिंदी स्टेनो के साथ और अपनी गति बढ़ाएं।',
    cta: 'Start Test',
    to: '/hindi-steno',
    titleClass: 'text-[#FD7E14]',
    btnClass: 'bg-[#FD7E14] hover:bg-[#e06f0f]',
    bg: 'bg-[#FFF7ED]',
    ring: 'bg-[#FFEDD5]',
    icon: PenLineIcon,
    iconClass: 'text-[#FD7E14]',
  },
];

const liveCards = [
  {
    title: 'Live Test (Typing)',
    fontGroups: ['English Typing', 'Hindi Mangal', 'Hindi Kruti Dev', 'Hindi Remington (GAIL)'],
    text: 'Participate in live typing tests and compete with aspirants across India.',
    cta: 'Join Live Test',
    to: '/live-test/typing',
    titleClass: 'text-primary',
    btnClass: 'bg-primary hover:bg-primary-700',
    bg: 'bg-[#EFF6FF]',
    icon: MonitorIcon,
  },
  {
    title: 'Live Test (Steno)',
    fontGroups: ['Steno English', 'Steno Hindi'],
    text: 'Take live steno dictation tests and check your real-time rank.',
    cta: 'Join Live Test',
    to: '/live-test/steno',
    titleClass: 'text-[#6F42C1]',
    btnClass: 'bg-[#6F42C1] hover:bg-[#5c36a4]',
    bg: 'bg-[#F5F3FF]',
    icon: HeadphonesIcon,
  },
];

const analysisRows = [
  { title: 'Typing', text: 'View detailed typing performance', tone: 'text-primary' },
  { title: 'Eng. Steno', text: 'Analyze your English Steno tests', tone: 'text-success' },
  { title: 'Hindi Steno', text: 'Analyze your Hindi Steno tests', tone: 'text-danger' },
];

function daysLeftLabel() {
  const rawValidity = localStorage.getItem('validity_end');
  if (!rawValidity || rawValidity === 'undefined' || rawValidity === 'null') return '∞';
  const diffTime = new Date(rawValidity) - new Date();
  return diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
}

export default function Home() {
  const { isActive } = useFontGroupSettings();
  const [messages, setMessages] = useState([]);
  const [flashBanners, setFlashBanners] = useState([]);
  const username = localStorage.getItem('username') || 'Student';
  const daysLeft = daysLeftLabel();
  // Loads the exam list and refreshes its offline copy, as the legacy dashboard
  // did on every visit, so exams are available later without internet.
  useExamList();

  useEffect(() => {
    if (!navigator.onLine) return;
    resultService.syncOfflineResults().catch(console.error);
    Promise.allSettled([api.get('/messages'), flashBannerService.getActiveBanners()]).then(([msgResult, flashResult]) => {
      if (msgResult.status === 'fulfilled') setMessages(msgResult.value?.data || []);
      if (flashResult.status === 'fulfilled') setFlashBanners(flashResult.value || []);
    });
  }, []);

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      {/* Welcome */}
      <section className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-gradient-to-r from-navy-800 to-primary p-5 text-white shadow-card">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[22px] font-bold leading-tight">Welcome, {username}!</h2>
          <p className="mt-0.5 text-[13px] text-white/85">Select your exam and start practicing</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg bg-yellow-300 px-4 py-2 font-display text-[13px] font-bold text-navy-900">
          <CalendarClockIcon className="h-4 w-4" aria-hidden="true" /> {daysLeft} Days Left
        </span>
      </section>

      {/* Flash banners */}
      {flashBanners.length > 0 &&
        <div className="mb-4 overflow-hidden rounded-lg bg-danger py-2 text-[13.5px] font-semibold text-white">
          <marquee scrollamount="8">
            {flashBanners.map((b) => {
              // Optional colour chip, title and link (set on the admin Flash Banner page).
              const body = <>{b.title && <strong className="mr-1.5">{b.title}:</strong>}{b.content}</>;
              const chip = { className: `mr-12 rounded px-2 py-0.5${b.link_url ? ' underline decoration-white/60 underline-offset-2' : ''}`, style: b.color ? { backgroundColor: b.color } : undefined };
              if (!b.link_url) return <span key={b.id} {...chip}>{body}</span>;
              return /^https?:\/\//i.test(b.link_url)
                ? <a key={b.id} href={b.link_url} target="_blank" rel="noopener noreferrer" {...chip}>{body}</a>
                : <Link key={b.id} to={b.link_url} {...chip}>{body}</Link>;
            })}
          </marquee>
        </div>
      }

      {/* Announcements */}
      {messages.length > 0 &&
        <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2.5 flex items-center gap-2 font-display text-[14px] font-bold text-amber-800">
            <MegaphoneIcon className="h-4 w-4" aria-hidden="true" /> Latest Announcements
          </h3>
          <ul className="space-y-2">
            {messages.map((msg) => (
              <li key={msg.id} className="rounded-md border-l-4 border-amber-400 bg-white/70 px-3 py-2">
                <p className="text-[13px] font-semibold text-amber-900">
                  {msg.title}
                  <span className="ml-2.5 text-[11.5px] font-normal text-amber-700">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </p>
                <p className="whitespace-pre-wrap text-[12.5px] text-amber-950/80">{msg.content}</p>
              </li>
            ))}
          </ul>
        </section>
      }

      {/* Course cards */}
      <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {primaryCards.filter((card) => offersFontGroups(card, isActive)).map((card) => (
          <article key={card.title} className={`flex flex-col rounded-xl border border-slate-200 ${card.bg} p-5 shadow-card`}>
            <div className="mb-4 flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <h3 className={`font-display text-[19px] font-bold ${card.titleClass}`}>{card.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{card.text}</p>
              </div>
              <span className={`grid h-[74px] w-[74px] shrink-0 place-items-center rounded-full ${card.ring}`}>
                <card.icon className={`h-8 w-8 ${card.iconClass}`} aria-hidden="true" />
              </span>
            </div>
            <Link
              to={card.to}
              className={`mt-auto inline-flex w-fit rounded-md px-4 py-2 text-[12.5px] font-semibold text-white transition-colors duration-150 ${card.btnClass}`}>
              {card.cta}
            </Link>
          </article>
        ))}
      </div>

      {/* Live tests + analysis */}
      <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {liveCards.filter((card) => offersFontGroups(card, isActive)).map((card) => (
          <article key={card.title} className={`flex flex-col rounded-xl border border-slate-200 ${card.bg} p-5 shadow-card`}>
            <div className="mb-4 flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-display text-[19px] font-bold ${card.titleClass}`}>{card.title}</h3>
                  <span className="rounded bg-danger px-1.5 py-[1px] text-[9px] font-bold text-white">LIVE</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{card.text}</p>
              </div>
              <span className="grid h-[74px] w-[74px] shrink-0 place-items-center rounded-lg bg-white">
                <card.icon className="h-8 w-8 text-slate-500" aria-hidden="true" />
              </span>
            </div>
            <Link
              to={card.to}
              className={`mt-auto inline-flex w-fit rounded-md px-4 py-2 text-[12.5px] font-semibold text-white transition-colors duration-150 ${card.btnClass}`}>
              {card.cta}
            </Link>
          </article>
        ))}

        <Link to="/my-tests" className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-colors duration-150 hover:border-primary">
          <h3 className="font-display text-[19px] font-bold text-primary">Test Analysis (Results)</h3>
          <div className="mt-3 flex items-start gap-4">
            <ul className="min-w-0 flex-1 space-y-2.5">
              {analysisRows.map((row) => (
                <li key={row.title} className="flex items-start gap-2">
                  <BarChart2Icon className={`mt-[2px] h-4 w-4 ${row.tone}`} aria-hidden="true" />
                  <span className="leading-tight">
                    <span className="block text-[13px] font-semibold text-navy-800">{row.title}</span>
                    <span className="block text-[11.5px] text-slate-500">{row.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="grid h-[86px] w-[110px] shrink-0 place-items-center rounded-lg bg-slate-50">
              <BarChart3Icon className="h-10 w-10 text-slate-400" aria-hidden="true" />
            </div>
          </div>
        </Link>
      </div>

      {/* Self assessment */}
      <Link
        to="/self-assessment"
        className="flex flex-wrap items-center gap-4 rounded-xl border border-violet-100 bg-violet-50 p-5 shadow-card transition-colors duration-150 hover:border-violet-300">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
          <GraduationCapIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[17px] font-bold text-violet-800">Self Assessment</h3>
          <p className="text-[12.5px] text-slate-600">Practice with your own passage, time and settings — no pressure.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white">
          Start Practice <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </span>
      </Link>

      {/* Quick links + Telegram / YouTube (set on the admin Settings page) */}
      <div className="mt-4 space-y-4"><HomeSiteLinks /></div>
    </div>
  );
}
