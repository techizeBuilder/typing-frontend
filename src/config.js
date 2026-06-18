/**
 * Configuration file for API Base URL
 *
 * PRIORITY:
 * 1. Electron: Uses IPC to fetch from centralized API_CONFIG.js
 * 2. Web: Uses environment variable VITE_API_BASE_URL
 * 3. Fallback: http://localhost:3012/api
 */

// Synchronous default: the build-time env var (baked into desktop/web prod
// builds) if present, else the local dev server. This avoids any window where
// early requests would hit localhost before the async Electron lookup resolves.
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3012/api';

// In Electron, override with the centralized runtime config once IPC resolves.
if (window.electronAPI?.getAPIBaseURL) {
  window.electronAPI.getAPIBaseURL().then((url) => {
    if (url) API_BASE_URL = url;
  });
}

export { API_BASE_URL };
