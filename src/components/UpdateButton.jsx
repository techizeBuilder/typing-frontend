import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import './UpdateButton.css';

// Re-check the server for a newer desktop version every 30 minutes.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Returns true when the server-advertised version is newer than the installed
// one. Compares dot-separated numeric parts ("1.10.0" > "1.9.2").
const isNewerVersion = (server, current) => {
  if (!server || !current) return false;
  const parse = (v) => String(v).trim().replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const a = parse(server);
  const b = parse(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
};

/**
 * Blinking "Update Available" button — Electron desktop app only.
 *
 * Polls the public /settings endpoint for the admin-configured
 * `desktop_app_version`; when it is newer than the running app's version, a
 * blinking button appears. Clicking it downloads the installer through the
 * main process (with live progress) and launches it, after which the app
 * quits so the installer can replace it.
 */
const UpdateButton = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');
  // idle | downloading | installing | error
  const [status, setStatus] = useState('idle');
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    // Only meaningful inside the Electron desktop app.
    if (!window.electronAPI?.getAppVersion) return;

    let cancelled = false;

    const checkForUpdate = async () => {
      if (!navigator.onLine) return;
      try {
        const [currentVersion, res] = await Promise.all([
          window.electronAPI.getAppVersion(),
          fetch(`${API_BASE_URL}/settings`),
        ]);
        if (!res.ok || cancelled) return;
        const settings = await res.json();
        const serverVersion = settings?.desktop_app_version;
        if (!cancelled && isNewerVersion(serverVersion, currentVersion)) {
          setLatestVersion(serverVersion);
          setUpdateAvailable(true);
        }
      } catch {
        // Offline or server unreachable — silently try again next interval.
      }
    };

    checkForUpdate();
    const timer = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    window.addEventListener('online', checkForUpdate);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('online', checkForUpdate);
    };
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateDownloadProgress) return;
    const unsubscribe = window.electronAPI.onUpdateDownloadProgress((progress) => {
      setPercent(progress?.percent || 0);
    });
    return unsubscribe;
  }, []);

  const handleUpdate = async () => {
    if (status === 'downloading' || status === 'installing') return;
    const confirmed = window.confirm(
      `A new version${latestVersion ? ` (v${latestVersion})` : ''} is available.\n\n` +
      'The update will be downloaded and the installer will start automatically. ' +
      'The application will close during installation.\n\nDownload and install now?'
    );
    if (!confirmed) return;
    setStatus('downloading');
    setPercent(0);
    const result = await window.electronAPI.downloadAndInstallUpdate();
    if (result?.ok) {
      setStatus('installing'); // app quits moments later; installer takes over
    } else {
      setStatus('error');
      alert(`Update failed: ${result?.error || 'Unknown error'}\n\nPlease try again or contact your administrator.`);
      setTimeout(() => setStatus('idle'), 500);
    }
  };

  if (!updateAvailable) return null;

  return (
    <button
      className={`update-available-btn ${status === 'idle' || status === 'error' ? 'blinking' : ''}`}
      onClick={handleUpdate}
      disabled={status === 'downloading' || status === 'installing'}
      title={latestVersion ? `Version ${latestVersion} is available — click to update` : 'A new version is available — click to update'}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {status === 'downloading'
        ? `Downloading… ${percent}%`
        : status === 'installing'
          ? 'Starting installer…'
          : 'Update Available'}
    </button>
  );
};

export default UpdateButton;
