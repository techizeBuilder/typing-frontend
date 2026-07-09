import { useState, useEffect } from 'react';
import { settingService } from '../../services/api';

// Admin settings panel. Exposes the Live Test rank-update time and the external
// Desktop / Mobile application download links advertised on the public landing page.
const LIVE_RANK_KEY = 'live_rank_update_time';

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

  const label = { display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' };
  const input = { padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem', color: '#1e293b' };

  // Renders one platform's URL + optional version/date fields.
  const renderAppFields = (titleIcon, titleText, helpText, state, setState) => (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
      <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem', color: '#0f172a' }}>{titleIcon} {titleText}</h4>
      <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>{helpText}</p>

      <label style={label}>Download URL</label>
      <input
        // Plain text, not type="url": a path we host ourselves ("/downloads/app.exe")
        // is a valid value here but fails the browser's URL validation.
        type="text"
        placeholder="/downloads/app.exe"
        value={state.url}
        onChange={(e) => setState({ ...state, url: e.target.value })}
        style={{ ...input, width: '100%', boxSizing: 'border-box', marginBottom: '14px' }}
      />

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <label style={label}>Version (optional)</label>
          <input
            type="text"
            placeholder="e.g. 1.2.0"
            value={state.version}
            onChange={(e) => setState({ ...state, version: e.target.value })}
            style={input}
          />
        </div>
        <div>
          <label style={label}>Release date (optional)</label>
          <input
            type="date"
            value={state.release_date}
            onChange={(e) => setState({ ...state, release_date: e.target.value })}
            style={input}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-card">
      <header className="admin-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
        <h2 style={{ margin: 0 }}>⚙️ Settings</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Global configuration for the typing platform.</p>
      </header>

      {loading ? (
        <p style={{ padding: '20px' }}>Loading settings…</p>
      ) : (
        <div style={{ padding: '20px', maxWidth: '620px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0f172a' }}>Live Test Rank Update Time</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Time of day when the Live Test rankings are published and refreshed for students.
              Results recorded after this time stay pending until the next day's update.
              Default is 9:00 PM.
            </p>

            <label style={label}>Update time (24-hour)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="time"
                value={rankTime}
                onChange={(e) => setRankTime(e.target.value)}
                style={input}
              />
              <span style={{ color: '#475569', fontSize: '0.9rem' }}>
                = <strong>{to12h(rankTime) || '—'}</strong>
              </span>
            </div>

            <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '9px 18px', background: saving ? '#94a3b8' : '#0b4bcc', color: '#fff',
                  border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem', fontWeight: 600,
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {status && (
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: status.type === 'success' ? '#16a34a' : '#dc2626' }}>
                  {status.msg}
                </span>
              )}
            </div>
          </div>

          {/* ── Application Download Links ──────────────────────────────────── */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0f172a' }}>Application Download Links</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Paste the external download links (e.g. Google Drive share links) for the Desktop and
              Mobile apps. The landing page's download buttons use these URLs automatically — update a
              link here to publish a new version without any code change. Leave a URL blank to hide its
              button.
            </p>

            <div style={{ display: 'grid', gap: '16px' }}>
              {renderAppFields(
                '🖥️', 'Desktop App',
                'Windows installer link. Shown as "Download Desktop App" on the landing page.',
                desktop, setDesktop,
              )}
              {renderAppFields(
                '📱', 'Mobile App',
                'Android/iOS app link (APK or store URL). Shown as "Download Mobile App" on the landing page.',
                mobile, setMobile,
              )}
            </div>

            <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleSaveLinks}
                disabled={appSaving}
                style={{
                  padding: '9px 18px', background: appSaving ? '#94a3b8' : '#0b4bcc', color: '#fff',
                  border: 'none', borderRadius: '6px', cursor: appSaving ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem', fontWeight: 600,
                }}
              >
                {appSaving ? 'Saving…' : 'Save Download Links'}
              </button>
              {appStatus && (
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: appStatus.type === 'success' ? '#16a34a' : '#dc2626' }}>
                  {appStatus.msg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
