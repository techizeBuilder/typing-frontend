import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClockIcon, DatabaseIcon, DownloadIcon, ImageIcon, MonitorIcon, SettingsIcon, SmartphoneIcon, TypeIcon, WalletIcon, ZapIcon,
} from 'lucide-react';
import { settingService } from '../../services/api';
import AiSettingsCard from '../../features/results/AiSettingsCard';
import { PageHeading } from '../../ui/PageHeading';

// Admin settings panel. Exposes the Live Test rank-update time, the external
// Desktop / Mobile application download links advertised on the public landing page,
// institute branding and the AI analysis settings.
const LIVE_RANK_KEY = 'live_rank_update_time';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3012/api';
// Strip trailing /api so we can prepend host to /uploads/...
const ASSETS_BASE = API_BASE_URL.replace(/\/api\/?$/, '');

const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${ASSETS_BASE}${url}`;
  return url;
};

// "21:00" → "9:00 PM" for a friendly display next to the 24h input.
const to12h = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
};

const isValidUrl = (u) => !u || /^https?:\/\/.+/i.test(u.trim());

const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none focus:border-primary';
const labelCls = 'mb-1 block text-[11.5px] font-semibold text-navy-800';
const btnCls = 'rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60';

function Card({ icon: Icon, title, text, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-card ${className}`}>
      <h3 className="flex items-center gap-2 text-[13.5px] font-bold text-navy-800"><Icon className="h-4 w-4 text-primary" aria-hidden="true" /> {title}</h3>
      {text && <p className="mb-3 mt-1 text-[12px] leading-relaxed text-slate-500">{text}</p>}
      {children}
    </section>
  );
}
function Status({ status }) {
  if (!status) return null;
  return <span role={status.type === 'error' ? 'alert' : 'status'} className={`text-[12px] font-semibold ${status.type === 'success' ? 'text-emerald-700' : 'text-danger'}`}>{status.msg}</span>;
}

const AdminSettings = () => {
  const [rankTime, setRankTime] = useState('21:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg }

  // ── App download links (external URLs, e.g. Google Drive) ──
  const [desktop, setDesktop] = useState({ url: '', version: '', release_date: '' });
  const [mobile, setMobile] = useState({ url: '', version: '', release_date: '' });
  const [appSaving, setAppSaving] = useState(false);
  const [appStatus, setAppStatus] = useState(null);

  // ── Institute branding (name + logo shown on downloaded PDFs/passages) ──
  const [instituteName, setInstituteName] = useState('');
  const [instituteLogoUrl, setInstituteLogoUrl] = useState('');
  const [instituteLogoFile, setInstituteLogoFile] = useState(null);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandStatus, setBrandStatus] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await settingService.getAll();
        if (all && all[LIVE_RANK_KEY]) setRankTime(all[LIVE_RANK_KEY]);
        if (all) {
          setDesktop({
            url: all.desktop_app_url || '',
            version: all.desktop_app_version || '',
            release_date: all.desktop_app_release_date || '',
          });
          setMobile({
            url: all.mobile_app_url || '',
            version: all.mobile_app_version || '',
            release_date: all.mobile_app_release_date || '',
          });
          setInstituteName(all.institute_name || '');
          setInstituteLogoUrl(all.institute_logo_url || '');
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        setStatus({ type: 'error', msg: 'Could not load settings.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSaveLinks = async () => {
    if (!isValidUrl(desktop.url) || !isValidUrl(mobile.url)) {
      setAppStatus({ type: 'error', msg: 'Download URLs must start with http:// or https://' });
      return;
    }
    setAppSaving(true);
    setAppStatus(null);
    try {
      // Save each field; empty values clear the link / metadata.
      await Promise.all([
        settingService.update('desktop_app_url', desktop.url.trim()),
        settingService.update('desktop_app_version', desktop.version.trim()),
        settingService.update('desktop_app_release_date', desktop.release_date.trim()),
        settingService.update('mobile_app_url', mobile.url.trim()),
        settingService.update('mobile_app_version', mobile.version.trim()),
        settingService.update('mobile_app_release_date', mobile.release_date.trim()),
      ]);
      setAppStatus({ type: 'success', msg: 'Download links saved. The landing page now uses these URLs.' });
    } catch (err) {
      console.error('Error saving download links:', err);
      const msg = err?.response?.data?.message || 'Could not save the download links.';
      setAppStatus({ type: 'error', msg: Array.isArray(msg) ? msg.join(', ') : msg });
    } finally {
      setAppSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    setBrandSaving(true);
    setBrandStatus(null);
    try {
      let logoUrl = instituteLogoUrl;
      if (instituteLogoFile) {
        const { url } = await settingService.uploadInstituteLogo(instituteLogoFile);
        logoUrl = url;
      }
      await Promise.all([
        settingService.update('institute_name', instituteName.trim()),
        settingService.update('institute_logo_url', logoUrl || ''),
      ]);
      setInstituteLogoUrl(logoUrl);
      setInstituteLogoFile(null);
      setBrandStatus({ type: 'success', msg: 'Institute branding saved. It now appears on downloaded PDFs/passages.' });
    } catch (err) {
      console.error('Error saving institute branding:', err);
      const msg = err?.response?.data?.message || 'Could not save institute branding.';
      setBrandStatus({ type: 'error', msg: Array.isArray(msg) ? msg.join(', ') : msg });
    } finally {
      setBrandSaving(false);
    }
  };

  const handleSave = async () => {
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(rankTime.trim())) {
      setStatus({ type: 'error', msg: 'Enter a valid 24-hour time (HH:MM), e.g. 21:00.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await settingService.update(LIVE_RANK_KEY, rankTime.trim());
      setStatus({ type: 'success', msg: `Rank update time saved (${to12h(rankTime)}).` });
    } catch (err) {
      console.error('Error saving setting:', err);
      const msg = err?.response?.data?.message || 'Could not save the setting.';
      setStatus({ type: 'error', msg });
    } finally {
      setSaving(false);
    }
  };

  // One platform's URL + optional version/date fields.
  const renderAppFields = (Icon, titleText, helpText, state, setState) => (
    <div className="rounded-lg border border-slate-200 p-3.5">
      <h4 className="flex items-center gap-1.5 text-[12.5px] font-bold text-navy-800"><Icon className="h-4 w-4 text-primary" aria-hidden="true" /> {titleText}</h4>
      <p className="mb-3 text-[11.5px] text-slate-500">{helpText}</p>
      <label className="mb-3 block"><span className={labelCls}>Download URL</span>
        <input type="url" placeholder="https://drive.google.com/..." value={state.url} onChange={(e) => setState({ ...state, url: e.target.value })} className={inputCls} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className={labelCls}>Version (optional)</span>
          <input type="text" placeholder="e.g. 1.2.0" value={state.version} onChange={(e) => setState({ ...state, version: e.target.value })} className={inputCls} /></label>
        <label className="block"><span className={labelCls}>Release date (optional)</span>
          <input type="date" value={state.release_date} onChange={(e) => setState({ ...state, release_date: e.target.value })} className={inputCls} /></label>
      </div>
    </div>
  );

  const more = [
    [ZapIcon, 'Flash Banner', '/admin/flash-banner'], [MonitorIcon, 'Screen Layout', '/admin/screen-layout'], [TypeIcon, 'Font Groups', '/admin/font-groups'],
    [WalletIcon, 'Payment & Referral Settings', '/admin/subscription'], [DatabaseIcon, 'Backup & Restore', '/admin/backup'],
  ];

  return (
    <div className="nd">
      <PageHeading icon={<SettingsIcon className="h-5 w-5" aria-hidden="true" />} title="Settings" subtitle="Global configuration for the typing platform." />

      {loading ? <p className="p-6 text-[12.5px] text-slate-500">Loading settings…</p> : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card icon={ClockIcon} title="Live Test Rank Update Time"
            text="Time of day when the Live Test rankings are published and refreshed for students. Results recorded after this time stay pending until the next day's update. Default is 9:00 PM.">
            <span className={labelCls}>Update time (24-hour)</span>
            <div className="flex flex-wrap items-center gap-3">
              <input type="time" value={rankTime} onChange={(e) => setRankTime(e.target.value)} aria-label="Rank update time" className={`${inputCls} w-[150px]`} />
              <span className="text-[12.5px] text-slate-600">= <b>{to12h(rankTime) || '—'}</b></span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleSave} disabled={saving} className={btnCls}>{saving ? 'Saving…' : 'Save'}</button>
              <Status status={status} />
            </div>
          </Card>

          <Card icon={ImageIcon} title="Institute Branding"
            text="Shown on downloaded PDFs/passages (e.g. the Steno dictation passage download) so students see your institute's name and logo on the document.">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block"><span className={labelCls}>Institute Name</span>
                <input type="text" placeholder="e.g. ABC Typing Institute" value={instituteName} onChange={(e) => setInstituteName(e.target.value)} className={inputCls} /></label>
              <div>
                <span className={labelCls}>Institute Logo</span>
                <div className="flex items-center gap-2.5">
                  {(instituteLogoFile || instituteLogoUrl)
                    ? <img src={instituteLogoFile ? URL.createObjectURL(instituteLogoFile) : resolveAssetUrl(instituteLogoUrl)} alt="Institute logo" className="h-11 w-11 rounded-md border border-slate-200 bg-white object-contain" />
                    : <span className="grid h-11 w-11 place-items-center rounded-md border border-dashed border-slate-300 text-slate-400"><ImageIcon className="h-5 w-5" aria-hidden="true" /></span>}
                  <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-[12px] text-slate-600 hover:bg-slate-50">
                    {instituteLogoFile ? 'Change' : 'Choose Logo'}
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => setInstituteLogoFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleSaveBranding} disabled={brandSaving} className={btnCls}>{brandSaving ? 'Saving…' : 'Save Branding'}</button>
              <Status status={brandStatus} />
            </div>
          </Card>

          <Card icon={DownloadIcon} title="Application Download Links" className="xl:col-span-2"
            text="Paste the external download links (e.g. Google Drive share links) for the Desktop and Mobile apps. The landing page's download buttons use these URLs automatically — update a link here to publish a new version without any code change. Leave a URL blank to hide its button.">
            <div className="grid gap-3 lg:grid-cols-2">
              {renderAppFields(MonitorIcon, 'Desktop App', 'Windows installer link. Shown as "Download Desktop App" on the landing page.', desktop, setDesktop)}
              {renderAppFields(SmartphoneIcon, 'Mobile App', 'Android/iOS app link (APK or store URL). Shown as "Download Mobile App" on the landing page.', mobile, setMobile)}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleSaveLinks} disabled={appSaving} className={btnCls}>{appSaving ? 'Saving…' : 'Save Download Links'}</button>
              <Status status={appStatus} />
            </div>
          </Card>

          <div className="xl:col-span-2"><AiSettingsCard /></div>

          <Card icon={SettingsIcon} title="More Settings" className="xl:col-span-2" text="Other settings live on their own pages.">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {more.map(([Icon, label, to]) => (
                <li key={to}><Link to={to} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-[12px] font-medium text-navy-800 hover:border-primary hover:bg-primary-50"><Icon className="h-4 w-4 text-primary" aria-hidden="true" /> {label}</Link></li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
