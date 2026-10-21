// A random id for this browser / desktop install, sent at login so the server can
// keep a "Single Device" student on the device they first logged in on. It must
// survive logouts, so code that wipes localStorage uses clearSessionStorage().
const KEY = 'device_id_v1';

const randomId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export function getDeviceId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id || !/^[A-Za-z0-9-]{16,64}$/.test(id)) {
      id = randomId();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

// Short label shown to the admin, e.g. "Desktop app · Windows" or "Chrome · Android".
export function getDeviceInfo() {
  const ua = navigator.userAgent || '';
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Unknown OS';
  if (window.electronAPI) return `Desktop app · ${os}`;
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${browser} · ${os}`;
}

// localStorage.clear() that keeps the device id.
export function clearSessionStorage() {
  let id = null;
  try { id = localStorage.getItem(KEY); } catch { /* storage unavailable */ }
  localStorage.clear();
  if (id) { try { localStorage.setItem(KEY, id); } catch { /* storage unavailable */ } }
}
