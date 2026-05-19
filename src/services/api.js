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

// Handle offline caching and 401 Unauthorized globally
api.interceptors.response.use(
  (response) => {
    if (response.config.method === 'get') {
      const url = response.config.url;
      const params = response.config.params || {};
      if (params.testType !== 'Live Test') {
        const cacheKey = `offline_cache_${url}_${JSON.stringify(params)}`;
        localStorage.setItem(cacheKey, JSON.stringify(response.data));
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
          if (payload.permissions) localStorage.setItem('permissions', JSON.stringify(payload.permissions));
        } catch (e) {
          console.error('Error decoding token:', e);
          // Fall back to the response body if the JWT decode failed
          if (response.data.user?.id) localStorage.setItem('userId', response.data.user.id);
        }
      }
      return response.data;
    } catch (error) {
      // Offline fallback
      if (!error.response || error.code === 'ERR_NETWORK') {
        const storedUser = localStorage.getItem('username');
        const storedToken = localStorage.getItem('token');
        if (storedUser === username && storedToken) {
          console.warn('[Offline Mode] Authenticated via cached token.');
          return { access_token: storedToken };
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
  deleteExam: async (id) => {
    const response = await api.delete(`/exams/${id}`);
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
  getChapters: async (fontGroup, testType, examId) => {
    const params = {};
    if (fontGroup) params.fontGroup = fontGroup;
    if (testType) params.testType = testType;
    if (examId) params.examId = examId;
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

export const resultService = {
  saveResult: async (resultData) => {
    try {
      const response = await api.post('/results', resultData);
      return response.data;
    } catch (err) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        if (resultData.testType === 'Live Test') {
          throw new Error('Network error. Cannot submit Live Test offline.');
        }
        console.warn('[Offline Mode] Saving result locally.');
        const offlineResults = JSON.parse(localStorage.getItem('offline_results') || '[]');
        const mockResult = {
          ...resultData,
          id: 'offline-' + Date.now(),
          created_at: new Date().toISOString()
        };
        offlineResults.push(mockResult);
        localStorage.setItem('offline_results', JSON.stringify(offlineResults));
        return { result: mockResult };
      }
      throw err;
    }
  },
  syncOfflineResults: async () => {
    const offlineResults = JSON.parse(localStorage.getItem('offline_results') || '[]');
    if (offlineResults.length === 0) return;
    
    const remaining = [];
    for (const res of offlineResults) {
      try {
        const payload = { ...res };
        delete payload.id;
        delete payload.created_at;
        await api.post('/results', payload);
      } catch (err) {
        remaining.push(res);
      }
    }
    localStorage.setItem('offline_results', JSON.stringify(remaining));
  },
  getUserResults: async (userId) => {
    const response = await api.get(`/results/user/${userId}`);
    return response.data;
  },
  getAllResults: async () => {
    const response = await api.get('/results');
    return response.data;
  },
  getLeaderboard: async () => {
    const response = await api.get('/results/leaderboard');
    return response.data;
  },
  getChapterRank: async (chapterId, studentId) => {
    const response = await api.get('/results/rank', { params: { chapterId, studentId } });
    return response.data;
  }
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

export default api;
