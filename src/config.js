/**
 * Configuration file for API Base URL
 *
 * PRIORITY:
 * 1. Electron: Uses IPC to fetch from centralized API_CONFIG.js
 * 2. Web: Uses environment variable VITE_API_BASE_URL
 * 3. Fallback: http://localhost:3012/api
 */

let API_BASE_URL = 'http://localhost:3012/api';

// Load from Electron if available
if (window.electronAPI?.getAPIBaseURL) {
  window.electronAPI.getAPIBaseURL().then((url) => {
    API_BASE_URL = url;
  });
}
// Otherwise use environment variable
else if (import.meta.env.VITE_API_BASE_URL) {
  API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
}

export { API_BASE_URL };
