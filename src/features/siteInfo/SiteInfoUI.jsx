import { Link, useParams } from 'react-router-dom';
import { ChevronRightIcon, ClockIcon, MailIcon, MapPinIcon, PhoneIcon, SendIcon, YoutubeIcon } from 'lucide-react';
import { CHANNEL_KEYS, CONTACT_KEYS, POLICY_PAGES, hasContact, parsePageText, quickLinks, useSiteInfo } from './siteInfo';
import NotFoundPage from '../../components/NotFoundPage';
import { COLLEGE_NAME, LOGO_URL } from '../../ui/brand';

const CHANNELS = [
  { id: 'telegram', key: CHANNEL_KEYS.telegram, icon: SendIcon, bg: 'bg-[#229ED9]', hover: 'hover:bg-[#1c8cc1]', btnText: 'text-[#0b7cad]',
    title: 'Join Our Telegram Channel', text: 'Get instant updates, live test alerts, study material & more.', cta: 'Join Now',
    short: 'Join Telegram', shortText: 'Get Updates & Live Test Alerts' },
  { id: 'youtube', key: CHANNEL_KEYS.youtube, icon: YoutubeIcon, bg: 'bg-[#E62117]', hover: 'hover:bg-[#c91b12]', btnText: 'text-[#c2160e]',
    title: 'Subscribe Our YouTube Channel', text: 'Learn tips & tricks, watch tutorials and improve your speed.', cta: 'Subscribe Now',
    short: 'Subscribe YouTube', shortText: 'Tips, Tricks & Free Tutorials' },
];

const external = { target: '_blank', rel: 'noopener noreferrer' };

// Home page: Quick Links card + Telegram / YouTube banners.
export function HomeSiteLinks() {
  const info = useSiteInfo();
  const links = quickLinks(info);
  const channels = CHANNELS.filter((c) => info?.[c.key]);
  if (!links.length && !channels.length) return null;
  return (
    <>
      {links.length > 0 &&
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-3.5 flex items-center gap-2 font-display text-[15px] font-bold text-navy-800">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" /> Quick Links
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-[13px] font-medium text-navy-800 transition-colors duration-150 hover:bg-primary-50 hover:text-primary">
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {l.label}
              </Link>
            ))}
          </div>
        </section>
      }
      {channels.length > 0 &&
        <div className={`grid gap-4 ${channels.length > 1 ? 'lg:grid-cols-2' : ''}`}>
          {channels.map((c) => (
            <div key={c.id} className={`flex flex-wrap items-center gap-3 rounded-xl p-4 ${c.bg}`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20">
                <c.icon className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-white">{c.title}</p>
                <p className="text-[11.5px] text-white/85">{c.text}</p>
              </div>
              <a href={info[c.key]} {...external} className={`shrink-0 rounded-md bg-white px-4 py-2 text-[12.5px] font-semibold transition-colors duration-150 hover:bg-slate-100 ${c.btnText}`}>
                {c.cta}
              </a>
            </div>
          ))}
        </div>
      }
    </>
  );
}

// Student sidebar: compact Telegram / YouTube cards under the menu.
export function SidebarChannels() {
  const info = useSiteInfo();
  const channels = CHANNELS.filter((c) => info?.[c.key]);
  if (!channels.length) return null;
  return (
    <div className="space-y-2 px-3 pb-3">
      {channels.map((c) => (
        <a key={c.id} href={info[c.key]} {...external} className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-white transition-colors duration-150 ${c.bg} ${c.hover}`}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20">
            <c.icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[12.5px] font-semibold text-white">{c.short}</span>
            <span className="block truncate text-[10.5px] text-white/85">{c.shortText}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

// Footer links for public screens (landing page, policy pages).
export function FooterLinks({ className = '' }) {
  const links = quickLinks(useSiteInfo());
  if (!links.length) return null;
  return (
    <nav aria-label="Policies" className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] ${className}`}>
      {links.map((l) => <Link key={l.to} to={l.to} className="text-slate-500 hover:text-primary hover:underline">{l.label}</Link>)}
    </nav>
  );
}

function PageText({ text }) {
  return (
    <div className="space-y-3 text-[13.5px] leading-relaxed text-slate-700">
      {parsePageText(text).map((b, i) => {
        if (b.type === 'h') return <h2 key={i} className="pt-2 font-display text-[16px] font-bold text-navy-800">{b.text}</h2>;
        if (b.type === 'ul') return <ul key={i} className="list-disc space-y-1 pl-5">{b.items.map((t, j) => <li key={j}>{t}</li>)}</ul>;
        return <p key={i}>{b.text}</p>;
      })}
    </div>
  );
}

function ContactDetails({ info }) {
  const rows = [
    [PhoneIcon, 'Phone', info[CONTACT_KEYS.phone], info[CONTACT_KEYS.phone] && `tel:${info[CONTACT_KEYS.phone].replace(/[\s-]/g, '')}`],
    [MailIcon, 'Email', info[CONTACT_KEYS.email], info[CONTACT_KEYS.email] && `mailto:${info[CONTACT_KEYS.email]}`],
    [MapPinIcon, 'Address', info[CONTACT_KEYS.address]],
    [ClockIcon, 'Office Hours', info[CONTACT_KEYS.hours]],
  ].filter(([, , value]) => value);
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {rows.map(([Icon, label, value, href]) => (
        <li key={label} className="flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary"><Icon className="h-4 w-4" aria-hidden="true" /></span>
          <span className="min-w-0">
            <span className="block text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
            {href ?
              <a href={href} className="block break-words text-[13.5px] font-semibold text-navy-800 hover:text-primary">{value}</a> :
              <span className="block whitespace-pre-line break-words text-[13.5px] font-semibold text-navy-800">{value}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Public page for a policy (/terms, /privacy-policy, /refund-policy) or /contact.
// Reachable without signing in, as payment gateways require.
export function SitePage({ page }) {
  const { slug } = useParams();
  const info = useSiteInfo();
  const policy = POLICY_PAGES.find((p) => p.slug === (page || slug));
  const isContact = page === 'contact';
  if (!policy && !isContact) return <NotFoundPage />;
  const title = isContact ? 'Contact Us' : policy.title;
  const empty = info && (isContact ? !hasContact(info) : !info[policy.key]);

  return (
    <div className="nd min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 font-display text-[15px] font-bold text-navy-800 hover:text-primary">
            <img src={LOGO_URL} alt="" className="h-9 w-9 rounded-full bg-white object-contain p-[2px] shadow-card" /> {COLLEGE_NAME}
          </Link>
          <Link to="/" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-navy-800 hover:bg-slate-50">Home</Link>
        </div>
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h1 className="mb-4 font-display text-[22px] font-bold text-navy-800">{title}</h1>
          {!info ? <p className="text-[13px] text-slate-500">Loading…</p> :
            empty ? <p className="text-[13px] text-slate-500">This page has not been published yet. Please check back later.</p> :
            isContact ? <ContactDetails info={info} /> : <PageText text={info[policy.key]} />}
        </article>
        <FooterLinks className="mt-4" />
      </div>
    </div>
  );
}
