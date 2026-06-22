import { useState, useEffect } from 'react';
import { settingService } from '../../services/api';
import { API_BASE_URL } from '../../config';

// Admin settings panel. Exposes the Live Test rank-update time and the desktop
// application download managed on the public landing page.
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

const AdminSettings = () => {
  const [rankTime, setRankTime] = useState('21:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg }

  // ── Desktop application ──
  const [appInfo, setAppInfo] = useState({ url: '', filename: '', version: '', release_date: '' });
  const [appFile, setAppFile] = useState(null);
  const [appVersion, setAppVersion] = useState('');
  const [appReleaseDate, setAppReleaseDate] = useState('');
  const [appUploading, setAppUploading] = useState(false);
  const [appStatus, setAppStatus] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await settingService.getAll();
        if (all && all[LIVE_RANK_KEY]) setRankTime(all[LIVE_RANK_KEY]);
        if (all) {
          setAppInfo({
            url: all.desktop_app_url || '',
            filename: all.desktop_app_filename || '',
            version: all.desktop_app_version || '',
            release_date: all.desktop_app_release_date || '',
          });
          setAppVersion(all.desktop_app_version || '');
          setAppReleaseDate(all.desktop_app_release_date || '');
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        setStatus({ type: 'error', msg: 'Could not load settings.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUploadApp = async () => {
    if (!appFile) {
      setAppStatus({ type: 'error', msg: 'Choose a .exe file to upload.' });
      return;
    }
    if (!appFile.name.toLowerCase().endsWith('.exe')) {
      setAppStatus({ type: 'error', msg: 'Only .exe files are allowed.' });
      return;
    }
    setAppUploading(true);
    setAppStatus(null);
    try {
      const fd = new FormData();
      fd.append('file', appFile);
      fd.append('version', appVersion.trim());
      fd.append('release_date', appReleaseDate.trim());
      const res = await settingService.uploadDesktopApp(fd);
      setAppInfo({
        url: res.url || '',
        filename: res.filename || appFile.name,
        version: res.version || '',
        release_date: res.release_date || '',
      });
      setAppFile(null);
      setAppStatus({ type: 'success', msg: 'Desktop application updated. The landing page now offers this version.' });
    } catch (err) {
      console.error('Error uploading desktop app:', err);
      const msg = err?.response?.data?.message || 'Upload failed. Please try again.';
      setAppStatus({ type: 'error', msg: Array.isArray(msg) ? msg.join(', ') : msg });
    } finally {
      setAppUploading(false);
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

  return (
    <div className="admin-card">
      <header className="admin-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
        <h2 style={{ margin: 0 }}>⚙️ Settings</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Global configuration for the typing platform.</p>
      </header>

      {loading ? (
        <p style={{ padding: '20px' }}>Loading settings…</p>
      ) : (
        <div style={{ padding: '20px', maxWidth: '560px' }}>
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

          {/* ── Desktop Application ─────────────────────────────────────────── */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0f172a' }}>Desktop Application Download</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Upload the latest Windows installer (.exe). It is published immediately on the
              landing page's "Download Desktop Application" button. Uploading a new file replaces
              the current one.
            </p>

            {appInfo.url ? (
              <div style={{ marginBottom: '16px', padding: '12px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', fontSize: '0.85rem', color: '#065f46' }}>
                <div><strong>Current:</strong> {appInfo.filename || '—'}</div>
                <div>Version: <strong>{appInfo.version || '—'}</strong> · Released: <strong>{appInfo.release_date || '—'}</strong></div>
                <a href={`${API_BASE_URL}/settings/desktop-app/download`} target="_blank" rel="noreferrer" style={{ color: '#0b4bcc', fontWeight: 600 }}>
                  Download current file
                </a>
              </div>
            ) : (
              <div style={{ marginBottom: '16px', padding: '12px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', fontSize: '0.85rem', color: '#9a3412' }}>
                No desktop application uploaded yet. The landing-page button is hidden until you upload one.
              </div>
            )}

            <label style={label}>Installer file (.exe)</label>
            <input
              type="file"
              accept=".exe,application/x-msdownload"
              onChange={(e) => setAppFile(e.target.files?.[0] || null)}
              style={{ ...input, padding: '7px 10px', display: 'block', marginBottom: '14px' }}
            />

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <div>
                <label style={label}>Version</label>
                <input
                  type="text"
                  placeholder="e.g. 1.2.0"
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                  style={input}
                />
              </div>
              <div>
                <label style={label}>Release date</label>
                <input
                  type="date"
                  value={appReleaseDate}
                  onChange={(e) => setAppReleaseDate(e.target.value)}
                  style={input}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleUploadApp}
                disabled={appUploading}
                style={{
                  padding: '9px 18px', background: appUploading ? '#94a3b8' : '#0b4bcc', color: '#fff',
                  border: 'none', borderRadius: '6px', cursor: appUploading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem', fontWeight: 600,
                }}
              >
                {appUploading ? 'Uploading…' : 'Upload / Update'}
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
