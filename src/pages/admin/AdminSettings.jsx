import React, { useState, useEffect } from 'react';
import { settingService } from '../../services/api';

// Admin settings panel. Currently exposes the Live Test rank-update time — the
// time of day at which live-test rankings are published/refreshed for students.
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

  useEffect(() => {
    (async () => {
      try {
        const all = await settingService.getAll();
        if (all && all[LIVE_RANK_KEY]) setRankTime(all[LIVE_RANK_KEY]);
      } catch (err) {
        console.error('Error loading settings:', err);
        setStatus({ type: 'error', msg: 'Could not load settings.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
