import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLinkIcon, FileTextIcon, PhoneIcon, SendIcon, YoutubeIcon } from 'lucide-react';
import { settingService } from '../../services/api';
import { CHANNEL_KEYS, CONTACT_KEYS, POLICY_PAGES, refreshSiteInfo } from './siteInfo';

// Admin Settings: Telegram / YouTube links, Contact Us details and the three
// policy pages. Every field is optional; blank ones are hidden from students.
const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none focus:border-primary';
const labelCls = 'mb-1 block text-[11.5px] font-semibold text-navy-800';
const btnCls = 'rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60';
const PAGE_MAX = 20000;
const KEYS = [...Object.values(CHANNEL_KEYS), ...Object.values(CONTACT_KEYS), ...POLICY_PAGES.map((p) => p.key)];

const isUrl = (u) => !u || /^https?:\/\/\S+$/i.test(u);
const errorText = (err, fallback) => {
  const msg = err?.response?.data?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};

function Section({ icon: Icon, title, text, children }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3.5">
      <h4 className="flex items-center gap-1.5 text-[12.5px] font-bold text-navy-800"><Icon className="h-4 w-4 text-primary" aria-hidden="true" /> {title}</h4>
      {text && <p className="mb-3 text-[11.5px] text-slate-500">{text}</p>}
      {children}
    </div>
  );
}

export default function SiteInfoSettingsCard() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    settingService.getAll()
      .then((all) => setForm(Object.fromEntries(KEYS.map((k) => [k, all?.[k] || '']))))
      .catch(() => { setForm(Object.fromEntries(KEYS.map((k) => [k, '']))); setStatus({ type: 'error', msg: 'Could not load these settings.' }); });
  }, []);

  const field = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  const save = async () => {
    if (!isUrl(form[CHANNEL_KEYS.telegram].trim()) || !isUrl(form[CHANNEL_KEYS.youtube].trim())) {
      setStatus({ type: 'error', msg: 'Channel links must start with http:// or https://' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await Promise.all(KEYS.map((k) => settingService.update(k, form[k].trim())));
      await refreshSiteInfo();
      setStatus({ type: 'success', msg: 'Saved. Students now see the updated links and pages.' });
    } catch (err) {
      setStatus({ type: 'error', msg: errorText(err, 'Could not save these settings.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="flex items-center gap-2 text-[13.5px] font-bold text-navy-800"><FileTextIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Social Channels, Contact &amp; Policy Pages</h3>
      <p className="mb-3 mt-1 text-[12px] leading-relaxed text-slate-500">
        Shown on the student Home page (Quick Links and channel banners), in the student sidebar and at the bottom of the landing page.
        Anything left blank stays hidden. The policy pages are public, so payment gateways can review them.
      </p>
      {!form ? <p className="text-[12.5px] text-slate-500">Loading…</p> : (
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <Section icon={SendIcon} title="Social Channels" text="Full links, e.g. https://t.me/yourchannel and https://youtube.com/@yourchannel.">
              <label className="mb-3 block"><span className={labelCls}>Telegram channel link</span>
                <input type="url" placeholder="https://t.me/..." {...field(CHANNEL_KEYS.telegram)} className={inputCls} /></label>
              <label className="block"><span className={labelCls}><YoutubeIcon className="mr-1 inline h-3.5 w-3.5 text-[#E62117]" aria-hidden="true" />YouTube channel link</span>
                <input type="url" placeholder="https://youtube.com/@..." {...field(CHANNEL_KEYS.youtube)} className={inputCls} /></label>
            </Section>
            <Section icon={PhoneIcon} title="Contact Us" text="Shown on the public Contact Us page.">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className={labelCls}>Phone</span>
                  <input type="tel" placeholder="e.g. +91 98765 43210" {...field(CONTACT_KEYS.phone)} className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Email</span>
                  <input type="email" placeholder="e.g. info@example.com" {...field(CONTACT_KEYS.email)} className={inputCls} /></label>
              </div>
              <label className="mt-3 block"><span className={labelCls}>Office hours</span>
                <input type="text" maxLength={200} placeholder="e.g. Mon–Sat, 9:00 AM – 6:00 PM" {...field(CONTACT_KEYS.hours)} className={inputCls} /></label>
              <label className="mt-3 block"><span className={labelCls}>Address</span>
                <textarea rows={2} maxLength={500} {...field(CONTACT_KEYS.address)} className={inputCls} /></label>
            </Section>
          </div>
          <Section icon={FileTextIcon} title="Policy Pages" text={'Plain text. Leave a blank line between paragraphs, start a line with "## " for a heading and "- " for a bullet point.'}>
            <div className="grid gap-3 xl:grid-cols-3">
              {POLICY_PAGES.map((p) => (
                <label key={p.key} className="block">
                  <span className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[11.5px] font-semibold text-navy-800">{p.title}</span>
                    <Link to={`/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">View page <ExternalLinkIcon className="h-3 w-3" aria-hidden="true" /></Link>
                  </span>
                  <textarea rows={9} maxLength={PAGE_MAX} {...field(p.key)} className={`${inputCls} font-mono text-[12px]`} />
                  <span className="mt-0.5 block text-right text-[10.5px] text-slate-400">{form[p.key].length.toLocaleString()} / {PAGE_MAX.toLocaleString()}</span>
                </label>
              ))}
            </div>
          </Section>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={saving} className={btnCls}>{saving ? 'Saving…' : 'Save Links & Pages'}</button>
            {status && <span role={status.type === 'error' ? 'alert' : 'status'} className={`text-[12px] font-semibold ${status.type === 'success' ? 'text-emerald-700' : 'text-danger'}`}>{status.msg}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
