import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckIcon,
  TargetIcon,
  UsersIcon,
  BarChart3Icon,
  BarChart2Icon,
  MousePointerClickIcon,
  TrophyIcon,
  ShieldCheckIcon,
  KeyboardIcon,
  PenLineIcon,
  MonitorIcon,
  HeadphonesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarCheckIcon,
  LandmarkIcon,
  GraduationCapIcon,
  BookOpenIcon,
  MonitorDownIcon,
  SmartphoneIcon,
  UserIcon,
} from 'lucide-react';
import { settingService } from '../services/api';
import Testimonials from '../features/reviews/Testimonials';
import { FooterLinks } from '../features/siteInfo/SiteInfoUI';
import { LOGO_URL, COLLEGE_NAME, TAGLINE } from '../ui/brand';

const heroSlides = [
  {
    id: 1,
    title: 'Master Typing & Stenography',
    subtitle: "India's Most Trusted Platform",
    description: 'Practice with real exam patterns and compete with thousands of aspirants',
    bgImage: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1920&q=80',
    bgOverlay: 'from-blue-900/85 via-blue-800/70 to-indigo-900/85',
  },
  {
    id: 2,
    title: 'Live Tests & Rankings',
    subtitle: 'Compete at All India Level',
    description: 'Take live tests and see your real-time ranking among all participants',
    bgImage: 'https://images.unsplash.com/photo-1560439514-e960a3ef5019?w=1920&q=80',
    bgOverlay: 'from-purple-900/85 via-purple-800/70 to-pink-900/85',
  },
  {
    id: 3,
    title: 'SSC, Court & Police Exams',
    subtitle: 'Exam-Oriented Practice',
    description: 'Prepare for SSC Steno, Court Steno, Delhi Police and State exams',
    bgImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1920&q=80',
    bgOverlay: 'from-green-900/85 via-teal-800/70 to-cyan-900/85',
  },
];

const heroFeatures = [
  { icon: TargetIcon, label: 'Real Exam Based Tests', bg: '#0D6EFD' },
  { icon: UsersIcon, label: 'Live Tests & All India Ranking', bg: '#6F42C1' },
  { icon: BarChart3Icon, label: 'Detailed Performance Analysis', bg: '#198754' },
  { icon: MousePointerClickIcon, label: 'User Friendly Interface', bg: '#FD7E14' },
];

const prepareFor = ['SSC Exams', 'Court Steno', 'Delhi Police', 'UP / State Exams', 'And Many More...'];

// `module` is stored as localStorage.moduleType before login; the student
// dashboard uses it to decide which modes and test types to offer.
const primaryCards = [
  {
    title: 'Typing Exam',
    text: 'Improve your typing speed and accuracy with exam oriented tests.',
    cta: 'Start Test',
    module: 'typing',
    titleClass: 'text-primary',
    btnClass: 'bg-primary hover:bg-primary-700',
    bg: 'bg-[#EFF6FF]',
    ring: 'bg-[#DBEAFE]',
    icon: KeyboardIcon,
    iconClass: 'text-primary',
  },
  {
    title: 'English Steno Exam',
    text: 'Practice English Stenography dictations and enhance your skills.',
    cta: 'Start Test',
    module: 'steno',
    titleClass: 'text-success',
    btnClass: 'bg-success hover:bg-[#146c43]',
    bg: 'bg-[#F0FDF4]',
    ring: 'bg-[#DCFCE7]',
    icon: PenLineIcon,
    iconClass: 'text-success',
  },
  {
    title: 'Hindi Steno Exam',
    text: 'अभ्यास करें हिंदी स्टेनो के साथ और अपनी गति बढ़ाएं।',
    cta: 'Start Test',
    module: 'steno',
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
    text: 'Participate in live typing tests and compete with aspirants across India.',
    cta: 'Join Live Test',
    module: 'livetest',
    titleClass: 'text-primary',
    btnClass: 'bg-primary hover:bg-primary-700',
    bg: 'bg-[#EFF6FF]',
    icon: MonitorIcon,
  },
  {
    title: 'Live Test (Steno)',
    text: 'Take live steno dictation tests and check your real-time rank.',
    cta: 'Join Live Test',
    module: 'livetest',
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

const whyChoose = [
  { icon: TrophyIcon, title: 'Top Ranks', sub: 'All India Level', color: '#D97706', bg: '#FEF3C7' },
  { icon: ShieldCheckIcon, title: '100% Secure & Accurate', sub: 'Safe & Reliable', color: '#7C3AED', bg: '#EDE9FE' },
  { icon: BarChart3Icon, title: 'Progress Reports', sub: 'Track Your Performance', color: '#0EA5E9', bg: '#CFFAFE' },
  { icon: CalendarCheckIcon, title: 'Exam Patterns', sub: '(Feel like Real exam, Reduce Exam anxiety)', color: '#DB2777', bg: '#FCE7F3' },
];

const instituteHighlights = [
  { icon: LandmarkIcon, title: 'Government Recognized', sub: 'Trusted & Approved' },
  { icon: GraduationCapIcon, title: 'Expert Faculty', sub: 'Learn from the Best' },
  { icon: BookOpenIcon, title: 'Structured Curriculum', sub: 'Well Designed Modules' },
  { icon: BarChart2Icon, title: 'Progress Tracking', sub: 'Monitor Your Performance' },
];

const formatDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

function AppMeta({ app }) {
  if (!app.version && !app.releaseDate) return null;
  return (
    <p className="mt-1 text-[11px] text-white/80">
      {app.version && <span>Version <strong>{app.version}</strong></span>}
      {app.version && app.releaseDate && <span> · </span>}
      {app.releaseDate && <span>Released {formatDate(app.releaseDate)}</span>}
    </p>
  );
}

const LandingPage = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [brokenSlides, setBrokenSlides] = useState({});
  // Desktop & mobile download links are managed from the Admin Panel (Settings),
  // so the buttons/versions here update automatically whenever the admin saves a
  // new URL — no code change or redeploy required.
  const [apps, setApps] = useState({ desktop: null, mobile: null });

  useEffect(() => {
    (async () => {
      try {
        const all = await settingService.getAll();
        setApps({
          desktop: all?.desktop_app_url
            ? { url: all.desktop_app_url, version: all.desktop_app_version || '', releaseDate: all.desktop_app_release_date || '' }
            : null,
          mobile: all?.mobile_app_url
            ? { url: all.mobile_app_url, version: all.mobile_app_version || '', releaseDate: all.mobile_app_release_date || '' }
            : null,
        });
      } catch (err) {
        // Non-critical: if settings can't load we simply hide the buttons.
        console.warn('Could not load app download info:', err);
      }
    })();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  // Same behaviour as the legacy module cards: remember the chosen module so the
  // dashboard can filter content, then go to login.
  const startModule = (module) => {
    if (module) localStorage.setItem('moduleType', module); // 'typing' | 'steno' | 'livetest'
    navigate('/login');
  };

  const hasAnyApp = apps.desktop || apps.mobile;

  return (
    <div className="nd min-h-screen w-full bg-canvas">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-3 py-3 sm:gap-5 sm:px-6">
        <img src={LOGO_URL} alt="" className="h-11 w-11 rounded-full bg-white object-contain p-[2px] shadow-card" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[17px] font-bold leading-tight text-navy-800 sm:text-[22px]">
            {COLLEGE_NAME}
          </h1>
          <p className="truncate text-[11px] font-medium text-primary sm:text-[12.5px]">{TAGLINE}</p>
        </div>
        <Link
          to="/login"
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[12px] font-semibold text-white transition-colors duration-150 hover:bg-primary-700 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[13px]">
          <UserIcon className="h-4 w-4" />
          <span>Login / Signup</span>
        </Link>
      </header>

      <main className="mx-auto max-w-[1400px] p-3 sm:p-5">
        {/* Hero Slider */}
        <section className="relative mb-4 overflow-hidden rounded-xl">
          <div className="relative h-[460px] sm:h-[400px] lg:h-[360px]">
            {heroSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentSlide ? 'z-10 opacity-100' : 'z-0 opacity-0'}`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${slide.bgOverlay}`}>
                  {/* Fallback pattern if the photo can't load (e.g. the desktop app offline) */}
                  {brokenSlides[slide.id] ?
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                      }}
                      aria-hidden="true" /> :
                    <img
                      src={slide.bgImage}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={() => setBrokenSlides((prev) => ({ ...prev, [slide.id]: true }))} />
                  }
                  <div className={`absolute inset-0 bg-gradient-to-br ${slide.bgOverlay}`}></div>
                </div>

                <div className="relative z-10 flex h-full items-center">
                  <div className="w-full px-6 sm:px-14">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                      <div className="flex-1 text-white">
                        <p className="mb-1.5 font-display text-[14px] font-semibold text-yellow-300 animate-fade-in md:text-[15px]">
                          {slide.subtitle}
                        </p>
                        <h2 className="mb-3 font-display text-[28px] font-extrabold leading-tight tracking-tight animate-slide-up md:text-[38px] lg:text-[42px]">
                          {slide.title}
                        </h2>
                        <p className="mb-4 max-w-xl text-[13px] text-white/90 animate-fade-in-delay md:text-[14px]">
                          {slide.description}
                        </p>
                        <div className="inline-block rounded-lg bg-yellow-400 px-4 py-2 font-display text-[12px] font-bold text-gray-900 shadow-lg animate-bounce-subtle">
                          Practice | Improve | Succeed
                        </div>
                        <ul className="mt-5 grid max-w-lg grid-cols-2 gap-2">
                          {heroFeatures.map((f, idx) => (
                            <li
                              key={f.label}
                              className="flex items-center gap-2 animate-slide-in"
                              style={{ animationDelay: `${idx * 100}ms` }}>
                              <span
                                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-white shadow-md"
                                style={{ backgroundColor: f.bg }}>
                                <f.icon className="h-3.5 w-3.5" aria-hidden="true" />
                              </span>
                              <span className="text-[12px] font-medium leading-tight text-white/95">{f.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="hidden w-full shrink-0 lg:block lg:w-[280px]">
                        <div className="rounded-xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
                          <p className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-yellow-300">
                            <TrophyIcon className="h-5 w-5" />
                            Prepare For
                          </p>
                          <ul className="space-y-2.5">
                            {prepareFor.map((item) => (
                              <li key={item} className="flex items-center gap-2 text-[13px] font-medium text-white">
                                <CheckIcon className="h-4 w-4 shrink-0 text-green-400" aria-hidden="true" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={prevSlide}
            className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/30 sm:left-4 sm:block"
            aria-label="Previous slide">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/30 sm:right-4 sm:block"
            aria-label="Next slide">
            <ChevronRightIcon className="h-5 w-5" />
          </button>

          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentSlide(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'w-8 bg-yellow-400' : 'w-2.5 bg-white/40 hover:bg-white/60'}`}
                aria-label={`Go to slide ${index + 1}`} />
            ))}
          </div>
        </section>

        {/* App downloads (only shown when the admin has configured a link) */}
        {hasAnyApp &&
          <section className="mb-4 flex flex-col gap-4 rounded-xl bg-navy-900 p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[18px] font-bold text-white">Get the App</h2>
              <p className="text-[12.5px] text-white/80">
                Install our app to practise typing &amp; steno offline — anytime, anywhere.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              {apps.desktop &&
                <div>
                  <a
                    href={apps.desktop.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-[13px] font-semibold text-navy-900 transition-colors duration-150 hover:bg-slate-100">
                    <MonitorDownIcon className="h-4 w-4 text-primary" /> Download Desktop App
                  </a>
                  <AppMeta app={apps.desktop} />
                </div>
              }
              {apps.mobile &&
                <div>
                  <a
                    href={apps.mobile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-[13px] font-semibold text-navy-900 transition-colors duration-150 hover:bg-slate-100">
                    <SmartphoneIcon className="h-4 w-4 text-primary" /> Download Mobile App
                  </a>
                  <AppMeta app={apps.mobile} />
                </div>
              }
            </div>
          </section>
        }

        {/* Course cards */}
        <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {primaryCards.map((card) => (
            <article
              key={card.title}
              className={`flex flex-col rounded-xl border border-slate-200 ${card.bg} p-5 shadow-card`}>
              <div className="mb-4 flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className={`font-display text-[19px] font-bold ${card.titleClass}`}>{card.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{card.text}</p>
                </div>
                <span className={`grid h-[74px] w-[74px] shrink-0 place-items-center rounded-full ${card.ring}`}>
                  <card.icon className={`h-8 w-8 ${card.iconClass}`} aria-hidden="true" />
                </span>
              </div>
              <button
                type="button"
                onClick={() => startModule(card.module)}
                className={`mt-auto inline-flex w-fit rounded-md px-4 py-2 text-[12.5px] font-semibold text-white transition-colors duration-150 ${card.btnClass}`}>
                {card.cta}
              </button>
            </article>
          ))}
        </div>

        {/* Live tests + analysis */}
        <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {liveCards.map((card) => (
            <article
              key={card.title}
              className={`flex flex-col rounded-xl border border-slate-200 ${card.bg} p-5 shadow-card`}>
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
              <button
                type="button"
                onClick={() => startModule(card.module)}
                className={`mt-auto inline-flex w-fit rounded-md px-4 py-2 text-[12.5px] font-semibold text-white transition-colors duration-150 ${card.btnClass}`}>
                {card.cta}
              </button>
            </article>
          ))}

          <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card">
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
          </article>
        </div>

        {/* Why Choose Us */}
        <section className="mb-4 rounded-xl border border-primary-100 bg-gradient-to-b from-primary-50/70 to-white p-6 shadow-card">
          <h2 className="text-center font-display text-[20px] font-bold text-navy-800">
            Why Choose Balaji Typing &amp; Steno College
          </h2>
          <p className="mx-auto mt-1 max-w-2xl text-center text-[12.5px] text-slate-500">
            We provide the best and 100% Accurate software to help you improve your typing &amp;
            Stenography Skills for Competitive Exams.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {whyChoose.map((s, i) => (
              <div
                key={s.title}
                className={`flex h-full flex-col items-center gap-2 rounded-xl bg-white p-4 text-center shadow-card xl:rounded-none xl:bg-transparent xl:p-0 xl:shadow-none ${
                  i > 0 ? 'xl:border-l xl:border-slate-200 xl:pl-4' : ''}`}>
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
                  style={{ backgroundColor: s.bg, color: s.color }}>
                  <s.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="font-display text-[13px] font-bold leading-snug text-navy-800">{s.title}</p>
                <p className="text-[11.5px] leading-snug text-primary-600">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Approved student reviews (hidden until one is approved) */}
        <Testimonials />

        {/* About the institute */}
        <section className="mb-4 grid gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-card lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
              <LandmarkIcon className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-[16px] font-bold text-navy-800">About the Institute</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                Balaji Typing &amp; Steno College is dedicated to providing quality training in Typing,
                Stenography and competitive exam preparation. Our mission is to empower individuals with
                essential skills for a successful and secure future in government services.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {instituteHighlights.map((h) => (
              <div key={h.title} className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                <h.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="leading-tight">
                  <span className="block text-[13px] font-semibold text-navy-800">{h.title}</span>
                  <span className="block text-[11.5px] text-slate-500">{h.sub}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <FooterLinks className="pt-1" />
        <p className="pb-2 pt-1 text-center text-[11.5px] text-slate-400">
          © {new Date().getFullYear()} {COLLEGE_NAME}. All rights reserved.
        </p>
      </main>
    </div>
  );
};

export default LandingPage;
