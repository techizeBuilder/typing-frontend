import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3012/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request if it exists
api.interceptors.request.use((config) => {
  // Let the browser set Content-Type automatically for FormData (multipart/form-data with boundary)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Best-effort offline cache ────────────────────────────────────────────────
// localStorage has a ~5MB per-origin quota. Some responses (e.g. a user's full
// results history) are unbounded and will eventually overflow it. Caching is a
// non-critical optimization, so a write failure must NEVER break an otherwise
// successful request — we swallow quota errors and free space when we can.
const MAX_CACHE_ENTRY_CHARS = 2_000_000; // ~4MB UTF-16; don't let one response hog the quota

const isQuotaError = (err) =>
  !!err && (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // Firefox
    err.code === 22 || err.code === 1014
  );

// Drop other offline_cache_* entries (keeping `keepKey`) to make room on a
// quota error. Returns true if anything was removed.
const pruneOfflineCache = (keepKey) => {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('offline_cache_') && k !== keepKey) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
  return keys.length > 0;
};

const safeCacheSet = (key, value) => {
  // A single oversized entry would evict everything else just to store itself.
  if (value.length > MAX_CACHE_ENTRY_CHARS) return;
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('[Offline Cache] write skipped:', err);
      return;
    }
    // Storage full: evict older cached responses and retry once.
    if (pruneOfflineCache(key)) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Still no room — caching is best-effort, so skip silently.
      }
    }
  }
};

// Handle offline caching and 401 Unauthorized globally
api.interceptors.response.use(
  (response) => {
    if (response.config.method === 'get') {
      const url = response.config.url;
      const params = response.config.params || {};
      // Admin-only bulk endpoints can be several MB; stringifying them here
      // blocks the UI thread and they never fit the cache quota anyway. The
      // offline cache only exists for student flows, so skip them entirely.
      const skipCache = url === '/results' || url === '/users' || /^\/results\/[0-9a-f-]{36}$/i.test(url);
      if (params.testType !== 'Live Test' && !skipCache) {
        const cacheKey = `offline_cache_${url}_${JSON.stringify(params)}`;
        safeCacheSet(cacheKey, JSON.stringify(response.data));
      }
    }
    return response;
  },
  (error) => {
    if (!error.response || error.code === 'ERR_NETWORK') {
      const config = error.config;
      if (config && config.method === 'get') {
        const params = config.params || {};
        if (params.testType === 'Live Test') {
          return Promise.reject(new Error('Live tests require an active internet connection.'));
        }
        const cacheKey = `offline_cache_${config.url}_${JSON.stringify(params)}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          console.warn(`[Offline Mode] Served ${config.url} from cache.`);
          return Promise.resolve({ data: JSON.parse(cachedData), status: 200, statusText: 'OK', config });
        }
      }
    }

    if (error.response && error.response.status === 401) {
      const msg = error.response.data?.message || '';
      if (msg === 'Unauthorized' || msg.includes('inactive') || msg.includes('User not found')) {
        if (window.location.pathname !== '/login') {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getCurrentUserUuid = () => {
  // Prefer the JWT 'sub' claim because it's guaranteed to be the database UUID
  // regardless of what shape the backend returns in the login response body.
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload?.sub && UUID_REGEX.test(payload.sub)) {
        return payload.sub;
      }
    } catch (_) { /* fall through */ }
  }
  const stored = localStorage.getItem('userId');
  return UUID_REGEX.test(stored || '') ? stored : null;
};

export const authService = {
  login: async (username, password) => {
    try {
      // Support both phone and username login
      const loginPayload = {
        password: password
      };

      // If username looks like a phone number (digits only), send as phone
      if (/^\d+$/.test(username)) {
        loginPayload.phone = username;
      } else {
        loginPayload.username = username;
      }

      const response = await api.post('/auth/login', loginPayload);
      if (response.data.success && response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('username', username);

        if (response.data.user) {
          localStorage.setItem('role', response.data.user.role);
          if (response.data.user.name)    localStorage.setItem('name',    response.data.user.name);
          if (response.data.user.roll_no) localStorage.setItem('roll_no', response.data.user.roll_no);
          if (response.data.user.user_id) localStorage.setItem('user_id', response.data.user.user_id);
        }

        // Decode JWT to extract the DB UUID (payload.sub). This is the source of
        // truth — the response body's user.id may be the login-id depending on
        // backend version. Always overwrite userId so stale (pre-fix) localStorage
        // values get cleaned up on the next login.
        try {
          const payload = JSON.parse(atob(response.data.access_token.split('.')[1]));
          if (payload.sub) localStorage.setItem('userId', payload.sub);
          if (!localStorage.getItem('role') && payload.role) localStorage.setItem('role', payload.role);
          if (payload.validity_end) localStorage.setItem('validity_end', payload.validity_end);
          // Premium/validity expiry only gates premium features/content, never login itself —
          // stored here so screens can show an "expired" banner without blocking access.
          localStorage.setItem('premium_expired', payload.premium_expired ? 'true' : 'false');
          if (payload.permissions) localStorage.setItem('permissions', JSON.stringify(payload.permissions));
        } catch (e) {
          console.error('Error decoding token:', e);
          // Fall back to the response body if the JWT decode failed
          if (response.data.user?.id) localStorage.setItem('userId', response.data.user.id);
        }

        // Persist auth to IPC-backed file for reliable offline login in Electron
        if (window.electronAPI?.saveAuth) {
          window.electronAPI.saveAuth({
            username,
            token:        response.data.access_token,
            role:         localStorage.getItem('role'),
            name:         localStorage.getItem('name'),
            userId:       localStorage.getItem('userId'),
            validity_end: localStorage.getItem('validity_end'),
          }).catch(() => {});
        }
      }
      return response.data;
    } catch (error) {
      // Offline fallback — return a synthetic success so Login.jsx navigates normally
      if (!error.response || error.code === 'ERR_NETWORK') {
        // Prefer IPC-backed auth file (Electron) for reliability across restarts
        if (window.electronAPI?.getAuth) {
          try {
            const stored = await window.electronAPI.getAuth();
            if (stored && stored.username === username && stored.token) {
              console.warn('[Offline Mode] Authenticated via IPC-cached token.');
              // Re-hydrate localStorage so the rest of the app works normally
              localStorage.setItem('token', stored.token);
              localStorage.setItem('username', stored.username);
              if (stored.role)         localStorage.setItem('role',         stored.role);
              if (stored.name)         localStorage.setItem('name',         stored.name);
              if (stored.userId)       localStorage.setItem('userId',       stored.userId);
              if (stored.validity_end) localStorage.setItem('validity_end', stored.validity_end);
              return {
                success: true,
                access_token: stored.token,
                user: { role: stored.role, name: stored.name },
              };
            }
          } catch (_) { /* fall through to localStorage */ }
        }
        // localStorage fallback (web / non-Electron)
        const storedUser = localStorage.getItem('username');
        const storedToken = localStorage.getItem('token');
        if (storedUser === username && storedToken) {
          console.warn('[Offline Mode] Authenticated via localStorage token.');
          const role = localStorage.getItem('role');
          return {
            success: true,
            access_token: storedToken,
            user: { role, name: localStorage.getItem('name') },
          };
        }
      }
      throw error;
    }
  },
  signup: async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('validity_end');
    localStorage.removeItem('premium_expired');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('permissions');
    localStorage.removeItem('moduleType');
  },
};

export const examService = {
  getExams: async () => {
    const response = await api.get('/exams');
    return response.data;
  },
  createExam: async (examData) => {
    const response = await api.post('/exams', examData);
    return response.data;
  },
  updateExam: async (id, examData) => {
    const response = await api.put(`/exams/${id}`, examData);
    return response.data;
  },
  getExamById: async (id) => {
    const response = await api.get(`/exams/${id}`);
    return response.data;
  },
  deleteExam: async (id, force = false) => {
    const response = await api.delete(`/exams/${id}`, { params: force ? { force: true } : undefined });
    return response.data;
  },
};

export const resultPatternService = {
  getPatterns: async () => {
    const res = await api.get('/result-patterns');
    return res.data;
  },
  createPattern: async (data) => {
    const res = await api.post('/result-patterns', data);
    return res.data;
  },
  updatePattern: async (id, data) => {
    const res = await api.put(`/result-patterns/${id}`, data);
    return res.data;
  },
  deletePattern: async (id) => {
    const res = await api.delete(`/result-patterns/${id}`);
    return res.data;
  }
};

export const chapterService = {
  // summary=true omits each chapter's full passage text — use it when only
  // chapter metadata is needed (e.g. admin dashboard counts).
  getChapters: async (fontGroup, testType, examId, summary = false) => {
    const params = {};
    if (fontGroup) params.fontGroup = fontGroup;
    if (testType) params.testType = testType;
    if (examId) params.examId = examId;
    if (summary) params.summary = 1;
    const response = await api.get('/chapters', { params });
    return response.data;
  },
  createChapter: async (chapterData) => {
    const response = await api.post('/chapters', chapterData);
    return response.data;
  },
  updateChapter: async (id, chapterData) => {
    const response = await api.put(`/chapters/${id}`, chapterData);
    return response.data;
  },
  deleteChapter: async (id) => {
    const response = await api.delete(`/chapters/${id}`);
    return response.data;
  },
  uploadAudio: async (chapterId, audioFile) => {
    const fd = new FormData();
    fd.append('audio', audioFile);
    const response = await api.post(`/chapters/${chapterId}/audio`, fd);
    return response.data;
  },
};

export const offlineTestService = {
  saveTests: async (tests) => {
    if (window.electronAPI?.savePreloadedTests) {
      return await window.electronAPI.savePreloadedTests(tests);
    }
    // localStorage fallback (web / non-Electron)
    localStorage.setItem('preloaded_tests', JSON.stringify({ tests, saved_at: new Date().toISOString() }));
    return { ok: true, count: tests.length };
  },
  getTests: async () => {
    if (window.electronAPI?.getPreloadedTests) {
      return await window.electronAPI.getPreloadedTests();
    }
    const raw = localStorage.getItem('preloaded_tests');
    return raw ? JSON.parse(raw) : { tests: [], saved_at: null };
  },
};

export const offlineExamService = {
  saveExams: async (exams) => {
    if (window.electronAPI?.saveExams) {
      return await window.electronAPI.saveExams(exams);
    }
    localStorage.setItem('offline_exams', JSON.stringify({ exams, saved_at: new Date().toISOString() }));
    return { ok: true };
  },
  getExams: async () => {
    if (window.electronAPI?.getExams) {
      return await window.electronAPI.getExams();
    }
    const raw = localStorage.getItem('offline_exams');
    return raw ? JSON.parse(raw).exams : null;
  },
};

export const resultService = {
  saveResult: async (resultData) => {
    try {
      const response = await api.post('/results', resultData);
      return response.data;
    } catch (err) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        if (resultData.test_type === 'Live Test') {
          throw new Error('Network error. Cannot submit Live Test offline.');
        }
        console.warn('[Offline Mode] Saving result locally.');
        // Prefer IPC-backed persistent storage in Electron
        if (window.electronAPI?.saveOfflineResult) {
          const saved = await window.electronAPI.saveOfflineResult(resultData);
          return { result: { ...resultData, id: saved.id } };
        }
        // Fallback: localStorage
        const offlineResults = JSON.parse(localStorage.getItem('offline_results') || '[]');
        const mockResult = { ...resultData, id: 'offline-' + Date.now(), created_at: new Date().toISOString() };
        offlineResults.push(mockResult);
        localStorage.setItem('offline_results', JSON.stringify(offlineResults));
        return { result: mockResult };
      }
      throw err;
    }
  },
  syncOfflineResults: async () => {
    let synced = 0;
    // ── IPC-backed results (Electron) ──
    if (window.electronAPI?.getOfflineResults) {
      const ipcResults = await window.electronAPI.getOfflineResults();
      for (const res of ipcResults) {
        try {
          const payload = { ...res };
          delete payload.id;
          delete payload.created_at;
          delete payload.synced;
          delete payload._hash;
          await api.post('/results', payload);
          await window.electronAPI.markResultSynced(res.id);
          synced++;
        } catch (err) {
          console.warn('[Sync] Could not sync offline result:', res.id, err?.message);
        }
      }
    }
    // ── localStorage results (fallback / web) ──
    const lsResults = JSON.parse(localStorage.getItem('offline_results') || '[]');
    if (lsResults.length > 0) {
      const remaining = [];
      for (const res of lsResults) {
        try {
          const payload = { ...res };
          delete payload.id;
          delete payload.created_at;
          await api.post('/results', payload);
          synced++;
        } catch (err) {
          remaining.push(res);
        }
      }
      localStorage.setItem('offline_results', JSON.stringify(remaining));
    }
    if (synced > 0) console.log(`[Sync] Uploaded ${synced} offline result(s).`);
    return synced;
  },
  getUserResults: async (userId) => {
    const response = await api.get(`/results/user/${userId}`);
    return response.data;
  },
  // lean=true drops the raw grading fields (typed text, word statuses, pattern
  // data) — use it when only the stored metrics are needed (admin dashboard).
  getAllResults: async (lean = false) => {
    const response = await api.get('/results', { params: lean ? { lean: 1 } : {} });
    return response.data;
  },
  // Server-side paged + filtered admin results list → { rows, total }.
  // Pass pageSize: 0 to fetch ALL rows matching the filters (exports).
  getResultsPage: async ({ page = 1, pageSize = 25, search, from, to, course, testType, examName } = {}) => {
    const params = { page, pageSize };
    if (search) params.search = search;
    if (from) params.from = from;
    if (to) params.to = to;
    if (course) params.course = course;
    if (testType) params.testType = testType;
    if (examName) params.examName = examName;
    const response = await api.get('/results', { params });
    return response.data;
  },
  // Full single-result detail including the chapter's complete passage text.
  getResultById: async (id) => {
    const response = await api.get(`/results/${id}`);
    return response.data;
  },
  getLeaderboard: async (period, range) => {
    const params = {};
    if (period) params.period = period;
    if (range?.from) params.from = range.from;
    if (range?.to) params.to = range.to;
    const response = await api.get('/results/leaderboard', { params });
    return response.data;
  },
  getChapterRank: async (chapterId, studentId) => {
    const response = await api.get('/results/rank', { params: { chapterId, studentId } });
    return response.data;
  },
  // Deletes result rows older than `days` (default 10), keeping the most
  // recent window of data. Returns { deleted: number }.
  clearOldResults: async (days = 10) => {
    const response = await api.delete('/results/cleanup', { params: { days } });
    return response.data;
  },
};

export const userService = {
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.put('/users/me', data);
    return response.data;
  },
  uploadAvatar: async (formData) => {
    const response = await api.post('/users/me/avatar', formData);
    return response.data;
  }
};

export const flashBannerService = {
  getBanners: async () => {
    const res = await api.get('/flash-banners');
    return res.data;
  },
  getActiveBanners: async () => {
    const res = await api.get('/flash-banners/active');
    return res.data;
  },
  createBanner: async (data) => {
    const res = await api.post('/flash-banners', data);
    return res.data;
  },
  updateBanner: async (id, data) => {
    const res = await api.put(`/flash-banners/${id}`, data);
    return res.data;
  },
  deleteBanner: async (id) => {
    const res = await api.delete(`/flash-banners/${id}`);
    return res.data;
  }
};

export const settingService = {
  // Returns all settings as a { key: value } object.
  getAll: async () => {
    const res = await api.get('/settings');
    return res.data;
  },
  get: async (key) => {
    const res = await api.get(`/settings/${key}`);
    return res.data;
  },
  update: async (key, value) => {
    const res = await api.put(`/settings/${key}`, { value });
    return res.data;
  },
  // Uploads the institute logo file and returns { url }. Callers still need to persist
  // that url via update('institute_logo_url', url) — the key/value store stays the
  // single source of truth (same two-step flow as exam images).
  uploadInstituteLogo: async (file) => {
    const data = new FormData();
    data.append('logo', file);
    const res = await api.post('/settings/institute-logo', data);
    return res.data;
  },
};

export default api;
