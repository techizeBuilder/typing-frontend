import React, { useState, useEffect, useRef } from 'react';
import { userService, resultService, offlineTestService, chapterService } from '../services/api';
import { API_BASE_URL } from '../config';
import DashboardNav from '../components/DashboardNav';
import Header from '../components/Header';
import './StudentProfile.css';
import './StudentDashboard.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtShort = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getDate()} ${dt.toLocaleString('en-IN', { month: 'short' })}`;
};

const secondsToHMS = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const filterByDays = (results, days) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return results.filter(r => new Date(r.date_taken) >= cutoff);
};

// Default download allowances when the admin hasn't set a per-student limit.
const DEFAULT_PRELOAD_LIMIT = 10;
const DEFAULT_STENO_LIMIT = 10;

// Steno font groups vs. regular typing font groups, used to split preloaded
// exams into the "New Test Download" (typing) and "New Dictation Download" (steno)
// sections on the account page.
const STENO_FONT_GROUPS = ['Steno English', 'Steno Hindi'];
const isStenoFont = (fontGroup) => STENO_FONT_GROUPS.includes(fontGroup);

// Natural sort for alphanumeric chapter numbers (CH-01, A-1, Unit-5, 2, 10 …) so
// "10" sorts after "2" and the per-index lock lines up with Available Tests.
const chapterNoSort = (a, b) =>
  String(a?.chapter_no ?? '').localeCompare(String(b?.chapter_no ?? ''), undefined, { numeric: true, sensitivity: 'base' });

// Map a font group to the language label shown in the exam/chapter lists.
const fontLang = (fontGroup) => (String(fontGroup || '').toLowerCase().includes('hindi') ? 'Hindi' : 'English');

// Group a flat list of Pre-load chapters into exams, split by language. A chapter
// can belong to several exams (exam_ids / exams[]), so it appears under each, and
// a single exam usually holds BOTH English and Hindi chapters. Grouping by
// exam + language keeps the displayed chapter count and the Language column in
// sync (previously the count combined both languages while the label showed only
// one), and matches how Available Tests unlocks chapters per language/mode.
// Returns an array of { key, exam, language, chapters }, sorted by exam name then
// language, with chapters sorted by chapter_no.
const groupChaptersByExam = (chapters) => {
  const groups = new Map(); // `${examId}::${language}` -> { key, exam, language, chapters: [] }
  for (const ch of chapters) {
    const exams = (Array.isArray(ch.exams) && ch.exams.length > 0)
      ? ch.exams
      : (ch.exam ? [ch.exam] : []);
    const language = fontLang(ch.font_group);
    for (const exam of exams) {
      if (!exam?.id) continue;
      const key = `${exam.id}::${language}`;
      if (!groups.has(key)) groups.set(key, { key, exam, language, chapters: [] });
      groups.get(key).chapters.push(ch);
    }
  }
  const list = Array.from(groups.values());
  list.forEach((e) => e.chapters.sort(chapterNoSort));
  list.sort((a, b) =>
    String(a.exam?.name || '').localeCompare(String(b.exam?.name || '')) ||
    a.language.localeCompare(b.language));
  return list;
};

// A result/test row is "Steno" if its mode or test_type mentions steno.
const isStenoResult = (r) =>
  (r.mode || '').toLowerCase().includes('steno') ||
  (r.test_type || '').toLowerCase().includes('steno');

// Live Tests require an internet connection and cannot be downloaded for offline
// practice, so they are excluded from the download lists.
const isLiveResult = (r) =>
  (r.test_type || r.chapter?.test_type || '').toLowerCase().includes('live');

// Resolve the language (Hindi / English) for a row from its mode, test_type,
// chapter language or exam category — whichever first mentions the script.
const langOf = (r) => {
  const s = `${r.mode || ''} ${r.test_type || ''} ${r.chapter?.language_type || ''} ${r.exam?.category || ''}`.toLowerCase();
  return s.includes('hindi') ? 'Hindi' : 'English';
};

// Chapter number for a row, or a dash when not linked to a chapter.
const chapterNoOf = (r) => (r.chapter?.chapter_no != null ? r.chapter.chapter_no : '—');

// Composite key identifying a downloadable test in the offline store. Mirrors the
// exam + mode keys used when saving, so a row can be matched against saved entries.
const offlineKey = (examId, mode, chapterId) => `${examId}::${mode}::${chapterId}`;
const rowOfflineKey = (r) =>
  offlineKey(r.exam?.id || r.exam_id || null, r.mode || r.chapter?.font_group || null, r.chapter?.id || null);

// Convert a Blob to a base64 string (no data: prefix) for IPC audio storage.
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// Download a single Steno chapter's dictation audio and store it locally so the
// test can be taken offline. No-op outside Electron or when no audio exists.
const cacheChapterAudio = async (chapterId) => {
  if (!chapterId || !window.electronAPI?.saveAudio) return;
  if (window.electronAPI.hasAudio) {
    const { exists } = await window.electronAPI.hasAudio(chapterId);
    if (exists) return; // already saved locally
  }
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/chapters/${chapterId}/audio`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return; // chapter has no audio attached
  const base64 = await blobToBase64(await res.blob());
  await window.electronAPI.saveAudio(chapterId, base64);
};

// ─── SVG Line Chart ──────────────────────────────────────────────────────────

const LineChart = ({ data, color, label, unit = '' }) => {
  const W = 340, H = 120, PAD = { t: 10, r: 10, b: 30, l: 36 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  if (!data || data.length < 2) {
    return (
      <div className="chart-empty">Not enough data</div>
    );
  }

  const vals = data.map(d => d.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;

  const px = (i) => PAD.l + (i / (data.length - 1)) * iW;
  const py = (v) => PAD.t + iH - ((v - minV) / range) * iH;

  const points = data.map((d, i) => `${px(i)},${py(d.value)}`).join(' ');
  const fillPoints = `${PAD.l},${PAD.t + iH} ${points} ${px(data.length - 1)},${PAD.t + iH}`;

  const yTicks = [minV, Math.round((minV + maxV) / 2), maxV];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="line-chart-svg">
      {/* Grid lines */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={PAD.l} y1={py(v)} x2={W - PAD.r} y2={py(v)}
            stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3"
          />
          <text x={PAD.l - 4} y={py(v) + 4} textAnchor="end" fontSize="9" fill="#94a3b8">
            {Math.round(v)}{unit}
          </text>
        </g>
      ))}

      {/* Fill */}
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#grad-${color.replace('#', '')})`} />

      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={px(i)} cy={py(d.value)} r="3.5" fill={color} stroke="white" strokeWidth="1.5">
          <title>{d.label}: {d.value}{unit}</title>
        </circle>
      ))}

      {/* X labels — show first, mid, last */}
      {[0, Math.floor((data.length - 1) / 2), data.length - 1].map(i => (
        <text key={i} x={px(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">
          {data[i]?.label}
        </text>
      ))}
    </svg>
  );
};

// ─── Donut Chart ─────────────────────────────────────────────────────────────

const DonutChart = ({ segments, total }) => {
  const R = 52, CX = 70, CY = 70, stroke = 22;
  const circumference = 2 * Math.PI * R;

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circumference;
    const arc = { ...seg, dash, offset };
    offset += dash;
    return arc;
  });

  return (
    <svg viewBox="0 0 140 140" className="donut-svg">
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={arc.color}
          strokeWidth={stroke}
          strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
          strokeDashoffset={-arc.offset}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        >
          <title>{arc.label}: {arc.value} ({Math.round((arc.value / total) * 100)}%)</title>
        </circle>
      ))}
      <text x={CX} y={CY - 8} textAnchor="middle" fontSize="10" fill="#64748b">Total</text>
      <text x={CX} y={CY + 6} textAnchor="middle" fontSize="16" fontWeight="700" fill="#0f172a">{total}</text>
      <text x={CX} y={CY + 20} textAnchor="middle" fontSize="9" fill="#64748b">Mistakes</text>
    </svg>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const StudentProfile = () => {
  const [user, setUser] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [speedDays, setSpeedDays] = useState(7);
  const [accDays, setAccDays] = useState(7);
  const [mistakeDays, setMistakeDays] = useState(7);
  const [downloadNotice, setDownloadNotice] = useState('');
  const [downloadOk, setDownloadOk] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState(null);
  // Composite keys (examId::mode::chapterId) of tests already saved for offline use.
  const [downloadedKeys, setDownloadedKeys] = useState(new Set());
  // Preloaded exams (grouped from Pre-load chapters), split into typing vs steno.
  const [typingExams, setTypingExams] = useState([]);
  const [stenoExams, setStenoExams] = useState([]);
  // The exam whose chapter list is open in the popup: { exam, chapters, kind } | null.
  const [modalExam, setModalExam] = useState(null);
  // Exam id currently being downloaded, so its button can show a spinner.
  const [downloadingExamId, setDownloadingExamId] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '', fathers_name: '', phone: '', city: '', state: '',
    password: '', confirm_password: ''
  });

  useEffect(() => { fetchData(); refreshDownloaded(); fetchPreloadExams(); }, []);

  // Load every Pre-load Test chapter once and group it into exams, so the account
  // page can list downloadable exams (typing + steno) regardless of whether the
  // student has taken them yet. Works offline via the api-layer response cache.
  const fetchPreloadExams = async () => {
    try {
      const chapters = await chapterService.getChapters(undefined, 'Pre-load Test', undefined);
      const list = Array.isArray(chapters) ? chapters : [];
      setTypingExams(groupChaptersByExam(list.filter(c => !isStenoFont(c.font_group))));
      setStenoExams(groupChaptersByExam(list.filter(c => isStenoFont(c.font_group))));
    } catch (err) {
      console.warn('[Downloads] Could not load preloaded exams:', err?.message);
    }
  };

  // Build the set of tests already saved for offline use, so their Download
  // buttons can be disabled/shown as downloaded.
  const refreshDownloaded = async () => {
    try {
      const data = await offlineTestService.getTests();
      const set = new Set();
      (data.tests || []).forEach(t => {
        (t.chapters || []).forEach(c => { if (c?.id) set.add(offlineKey(t.examId, t.mode, c.id)); });
      });
      setDownloadedKeys(set);
    } catch (err) {
      console.warn('[Downloads] Could not read offline store:', err?.message);
    }
  };

  const fetchData = async () => {
    try {
      const userData = await userService.getProfile();
      setUser(userData);
      setFormData({
        name: userData.name || '',
        fathers_name: userData.fathers_name || '',
        phone: userData.phone || '',
        city: userData.city || '',
        state: userData.state || '',
        password: '',
        confirm_password: ''
      });
      const userId = localStorage.getItem('userId');
      if (userId) {
        const resultData = await resultService.getUserResults(userId);
        setResults(Array.isArray(resultData) ? resultData : []);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (formData.password && formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const updateData = {
        name: formData.name, fathers_name: formData.fathers_name,
        phone: formData.phone, city: formData.city, state: formData.state,
      };
      if (formData.password) updateData.password_hash = formData.password;
      await userService.updateProfile(updateData);
      setSuccess('Profile updated successfully!');
      setFormData({ ...formData, password: '', confirm_password: '' });
      setIsEditing(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      setLoading(true);
      await userService.uploadAvatar(fd);
      setSuccess('Profile picture updated!');
      fetchData();
    } catch (err) {
      setError('Failed to upload picture.');
      setLoading(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const highestSpeedResult = results.reduce((best, r) =>
    (r.nwpm || 0) > (best?.nwpm || 0) ? r : best, null);
  const highestAccuracyResult = results.reduce((best, r) =>
    (parseFloat(r.accuracy) || 0) > (parseFloat(best?.accuracy) || 0) ? r : best, null);

  const highestSpeed = highestSpeedResult?.nwpm || 0;
  const highestSpeedDate = highestSpeedResult?.date_taken;
  const avgSpeed = results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.nwpm || 0), 0) / results.length) : 0;
  const highestAccuracy = parseFloat(highestAccuracyResult?.accuracy) || 0;
  const highestAccuracyDate = highestAccuracyResult?.date_taken;
  const totalTimeSecs = results.reduce((s, r) => s + (r.time_elapsed || 0), 0);

  // ── Chart Data ────────────────────────────────────────────────────────────

  const buildDailyChart = (days, key) => {
    const filtered = filterByDays(results, days);
    const map = {};
    filtered.forEach(r => {
      const label = fmtShort(r.date_taken);
      if (!map[label]) map[label] = [];
      map[label].push(parseFloat(r[key]) || 0);
    });
    return Object.entries(map).map(([label, vals]) => ({
      label,
      value: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
    }));
  };

  const speedChartData = buildDailyChart(speedDays, 'nwpm');
  const accChartData = buildDailyChart(accDays, 'accuracy');

  // ── Mistake Pattern ───────────────────────────────────────────────────────

  const mistakeFiltered = filterByDays(results, mistakeDays);
  const backspaceCount = mistakeFiltered.reduce((s, r) => {
    const inp = r.user_input || '';
    return s + (inp.split('').filter(c => c === '\b').length);
  }, 0);
  const totalErrors = mistakeFiltered.reduce((s, r) => s + (r.total_errors || 0), 0);
  const halfErrors = mistakeFiltered.reduce((s, r) => s + (r.half_errors || 0), 0);
  const fullErrors = mistakeFiltered.reduce((s, r) => s + (r.full_errors || 0), 0);

  // Wrong word = full_errors, Extra chars = half_errors, Omitted = remaining
  const wrongWord = fullErrors;
  const extraChars = halfErrors;
  const omitted = Math.max(0, totalErrors - fullErrors - halfErrors);
  const bksp = backspaceCount > 0 ? backspaceCount : Math.round(totalErrors * 0.44);
  const totalMistakes = bksp + wrongWord + extraChars + omitted || 1;

  const mistakeSegments = [
    { label: 'Backspace', value: bksp, color: '#ef4444' },
    { label: 'Wrong Word', value: wrongWord || Math.round(totalMistakes * 0.26), color: '#f59e0b' },
    { label: 'Extra Characters', value: extraChars || Math.round(totalMistakes * 0.17), color: '#22c55e' },
    { label: 'Omitted Words', value: omitted || Math.round(totalMistakes * 0.13), color: '#3b82f6' },
  ];

  // ── Days left ─────────────────────────────────────────────────────────────

  const daysLeft = user?.validity_end
    ? Math.max(0, Math.ceil((new Date(user.validity_end) - new Date()) / 86400000))
    : null;

  // ── Download allowances (admin-controlled, per student) ─────────────────────
  const typingDownloadLimit = user?.preload_tests_limit ?? DEFAULT_PRELOAD_LIMIT;
  const stenoDownloadLimit  = user?.steno_tests_limit ?? DEFAULT_STENO_LIMIT;

  // Lock rule (matches Available Tests): within an exam the first N chapters are
  // unlocked, where N is the student's admin-set preload/steno limit. Chapters
  // beyond N stay locked until the administrator raises the limit.
  const unlockedCountFor = (kind) => (kind === 'steno' ? stenoDownloadLimit : typingDownloadLimit);

  // True when every UNLOCKED chapter of an exam is already saved offline.
  const isExamDownloaded = (kind, exam, chapters) => {
    const unlocked = chapters.slice(0, unlockedCountFor(kind));
    if (unlocked.length === 0) return false;
    return unlocked.every(c => downloadedKeys.has(offlineKey(exam.id, c.font_group, c.id)));
  };

  // Download a whole preloaded exam for offline use: caches every UNLOCKED chapter
  // (locked ones are skipped) into the offline store, grouped by font group / mode
  // so the Available Tests screen finds them while offline. Steno chapters also get
  // their dictation audio cached so the dictation plays with no internet.
  const handleDownloadExam = async (kind, exam, chapters, rowKey) => {
    const unlocked = chapters.slice(0, unlockedCountFor(kind));
    if (unlocked.length === 0) {
      setDownloadOk(false);
      setDownloadNotice('No unlocked chapters to download. Please contact your administrator to unlock tests.');
      return;
    }
    try {
      setDownloadingExamId(rowKey ?? exam.id);
      setDownloadNotice('');
      const testType = 'Pre-load Test';

      // Group unlocked chapters by font group — that is the "mode" the offline reader
      // keys on (examId + mode + testType), so chapters of different scripts within
      // the same exam are stored under their own entry and still resolve offline.
      const byMode = new Map();
      for (const c of unlocked) {
        const mode = c.font_group || null;
        if (!byMode.has(mode)) byMode.set(mode, []);
        byMode.get(mode).push(c);
      }

      const existing = await offlineTestService.getTests();
      let tests = existing.tests || [];
      const newlyDownloaded = [];

      for (const [mode, modeChapters] of byMode.entries()) {
        const match = (t) => t.examId === exam.id && t.mode === mode && t.testType === testType;
        const current = tests.find(match);
        tests = tests.filter(t => !match(t));
        const merged = current ? [...current.chapters] : [];
        for (const c of modeChapters) {
          if (!merged.some(x => x.id === c.id)) merged.push(c);
          newlyDownloaded.push(offlineKey(exam.id, mode, c.id));
        }
        tests.push({ examId: exam.id, mode, testType, exam, chapters: merged, saved_at: new Date().toISOString() });
      }

      await offlineTestService.saveTests(tests);

      // Steno chapters need their dictation audio stored locally too.
      if (kind === 'steno') {
        for (const c of unlocked) await cacheChapterAudio(c.id);
      }

      setDownloadedKeys(prev => {
        const next = new Set(prev);
        newlyDownloaded.forEach(k => next.add(k));
        return next;
      });
      setDownloadOk(true);
      const skipped = chapters.length - unlocked.length;
      setDownloadNotice(
        `"${exam.name}" saved for offline practice — ${unlocked.length} chapter${unlocked.length !== 1 ? 's' : ''} downloaded` +
        (skipped > 0 ? `, ${skipped} locked chapter${skipped !== 1 ? 's' : ''} skipped.` : '.')
      );
    } catch (err) {
      console.error('[Download Exam] failed:', err);
      setDownloadOk(false);
      setDownloadNotice('Download failed. Please try again while connected to the internet.');
    } finally {
      setDownloadingExamId(null);
    }
  };

  if (loading && !user) return <div className="profile-loading"><div className="spinner" /></div>;

  return (
    <div className="dashboard-page-container" style={{ height: 'auto', minHeight: '100vh', overflow: 'visible' }}>
      <Header />

      <div className="dashboard-welcome-bar">
        <div className="welcome-text-content">
          <h2>My Account</h2>
          <p>Manage Your Profile, Subscription &amp; Typing Performance</p>
        </div>
        {daysLeft !== null && (
          <div className="days-left-badge">{daysLeft} Days Left</div>
        )}
      </div>

      <div className="dashboard-layout" style={{ overflow: 'visible', minHeight: 0 }}>
        <DashboardNav />
        <div className="dashboard-content sp-container" style={{ overflowY: 'visible' }}>

          {/* ── Row 1: Profile + Subscription ── */}
          <div className="sp-row-2">

            {/* Student Profile Card */}
            <div className="sp-card">
              <div className="sp-card-header">
                <h3>Student Profile</h3>
                <button className="sp-btn-outline" onClick={() => setIsEditing(!isEditing)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>
              <div className="sp-profile-info">
                <div className="sp-avatar" onClick={() => fileInputRef.current?.click()} title="Click to change photo">
                  {user?.profile_image
                    ? <img src={`${API_BASE_URL}${user.profile_image}`} alt="Profile" />
                    : <span>{user?.name ? user.name.charAt(0).toUpperCase() : '?'}</span>
                  }
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                </div>
                <div className="sp-details">
                  <h4>{user?.name || 'Student'}</h4>
                  <p>{user?.user_id || ''}</p>
                  <p>{user?.phone ? `+91 ${user.phone}` : ''}</p>
                  {user?.fathers_name && <p>S/o {user.fathers_name}</p>}
                  <p className="sp-member-since">Member Since: {fmt(user?.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Subscription Card */}
            <div className="sp-card">
              <div className="sp-card-header">
                <h3>Subscription Details</h3>
                <button className="sp-btn-light">View Details</button>
              </div>
              <div className="sp-subs-grid">
                <div className="sp-subs-item">
                  <span className="sp-subs-label">Plan Name</span>
                  <span className="sp-subs-val sp-primary">{user?.category || 'Basic Plan'}</span>
                </div>
                <div className="sp-subs-item">
                  <span className="sp-subs-label">Status</span>
                  <span className={`sp-badge sp-badge-${(user?.status || 'inactive').toLowerCase()}`}>
                    {user?.status || 'Inactive'}
                  </span>
                </div>
                <div className="sp-subs-item">
                  <span className="sp-subs-label">Start Date</span>
                  <span className="sp-subs-val">{fmt(user?.validity_start)}</span>
                </div>
                <div className="sp-subs-item">
                  <span className="sp-subs-label">Valid Plan</span>
                  <span className="sp-subs-val">{fmt(user?.validity_end)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 2: Stats ── */}
          <div className="sp-stats-row">
            <div className="sp-stat-card">
              <div className="sp-stat-icon bg-green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
              <div className="sp-stat-body">
                <span className="sp-stat-label">Highest Speed</span>
                <span className="sp-stat-val">{highestSpeed} <small>WPM</small></span>
                <span className="sp-stat-sub">Achieved On {fmt(highestSpeedDate)}</span>
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-icon bg-blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
              <div className="sp-stat-body">
                <span className="sp-stat-label">Average Speed</span>
                <span className="sp-stat-val">{avgSpeed} <small>WPM</small></span>
                <span className="sp-stat-sub">All Time Average</span>
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-icon bg-emerald"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
              <div className="sp-stat-body">
                <span className="sp-stat-label">Highest Accuracy</span>
                <span className="sp-stat-val">{highestAccuracy.toFixed(0)}<small>%</small></span>
                <span className="sp-stat-sub">Achieved On {fmt(highestAccuracyDate)}</span>
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-icon bg-purple"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
              <div className="sp-stat-body">
                <span className="sp-stat-label">Test Attempted</span>
                <span className="sp-stat-val">{results.length}</span>
                <span className="sp-stat-sub">All Time</span>
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-icon bg-orange"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <div className="sp-stat-body">
                <span className="sp-stat-label">Total Practice</span>
                <span className="sp-stat-val" style={{ fontSize: '1.1rem' }}>{secondsToHMS(totalTimeSecs)}</span>
                <span className="sp-stat-sub">Hours Practiced</span>
              </div>
            </div>
          </div>

          {/* ── Row 3: Charts ── */}
          <div className="sp-charts-row">

            {/* Speed Growth Chart */}
            <div className="sp-card sp-chart-card">
              <div className="sp-chart-header">
                <div>
                  <div className="sp-chart-title">Speed Growth Chart (WPM)</div>
                  <div className="sp-chart-sub">Your Typing Speed Is Improving Consistently</div>
                </div>
                <div className="sp-day-tabs">
                  {[7, 14, 30].map(d => (
                    <button key={d} className={`sp-day-tab${speedDays === d ? ' active' : ''}`} onClick={() => setSpeedDays(d)}>
                      Last {d} Days
                    </button>
                  ))}
                </div>
              </div>
              <LineChart data={speedChartData} color="#3b82f6" label="WPM" unit="" />
            </div>

            {/* Accuracy Growth Chart */}
            <div className="sp-card sp-chart-card">
              <div className="sp-chart-header">
                <div>
                  <div className="sp-chart-title">Accuracy Growth Chart (%)</div>
                  <div className="sp-chart-sub">Your Accuracy Is Getting Better</div>
                </div>
                <div className="sp-day-tabs">
                  {[7, 14, 30].map(d => (
                    <button key={d} className={`sp-day-tab${accDays === d ? ' active' : ''}`} onClick={() => setAccDays(d)}>
                      Last {d} Days
                    </button>
                  ))}
                </div>
              </div>
              <LineChart data={accChartData} color="#22c55e" label="%" unit="%" />
            </div>

            {/* Mistake Pattern */}
            <div className="sp-card sp-chart-card sp-mistake-card">
              <div className="sp-chart-header">
                <div>
                  <div className="sp-chart-title">Mistake Pattern (Last {mistakeDays} Days)</div>
                  <div className="sp-chart-sub">See Where You Make Mistakes Most</div>
                </div>
                <div className="sp-day-tabs">
                  {[7, 14, 30].map(d => (
                    <button key={d} className={`sp-day-tab${mistakeDays === d ? ' active' : ''}`} onClick={() => setMistakeDays(d)}>
                      Last {d} Days
                    </button>
                  ))}
                </div>
              </div>
              <div className="sp-mistake-body">
                <DonutChart segments={mistakeSegments} total={totalMistakes} />
                <div className="sp-mistake-legend">
                  {mistakeSegments.map((seg, i) => (
                    <div key={i} className="sp-legend-item">
                      <span className="sp-legend-dot" style={{ background: seg.color }} />
                      <span className="sp-legend-label">{seg.label}</span>
                      <span className="sp-legend-val">
                        {seg.value}({Math.round((seg.value / totalMistakes) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 4: Downloads ── */}
          {downloadNotice && (
            <div className={`sp-alert ${downloadOk ? 'sp-alert-success' : 'sp-alert-error'}`} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span>{downloadOk ? '✓' : '⚠'} {downloadNotice}</span>
              <button className="sp-btn-outline" style={{ padding: '2px 10px' }} onClick={() => setDownloadNotice('')}>Dismiss</button>
            </div>
          )}
          <div className="sp-row-2 sp-downloads-row">

            {/* Test Downloads — preloaded typing exams */}
            <div className="sp-card">
              <div className="sp-card-header">
                <div>
                  <div className="sp-section-title">New Test Download</div>
                  <div className="sp-section-sub">Preloaded Typing Exams — first {typingDownloadLimit} chapters unlocked each</div>
                </div>
              </div>
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Exam</th><th>Chapters</th><th>Language</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {typingExams.length === 0 ? (
                    <tr><td colSpan="4" className="sp-table-empty">No preloaded typing exams available</td></tr>
                  ) : typingExams.map(({ key, exam, language, chapters }) => {
                    const downloaded = isExamDownloaded('typing', exam, chapters);
                    const busy = downloadingExamId === key;
                    return (
                    <tr key={key} style={{ cursor: 'pointer' }} onClick={() => setModalExam({ key, exam, language, chapters, kind: 'typing' })}>
                      <td>
                        <span className="sp-file-icon">📄</span>
                        {exam.name}
                      </td>
                      <td>{chapters.length}</td>
                      <td>{language}</td>
                      <td>
                        <button
                          className="sp-dl-btn"
                          onClick={(e) => { e.stopPropagation(); setModalExam({ key, exam, language, chapters, kind: 'typing' }); }}
                          disabled={busy}
                          title="View chapters and download this exam for offline use"
                          style={downloaded ? { background: '#f0fdf4', color: '#16a34a' } : undefined}
                        >
                          {downloaded ? '✓ Downloaded' : busy ? 'Saving…' : 'View / Download'}
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Dictation Downloads — preloaded steno exams */}
            <div className="sp-card">
              <div className="sp-card-header">
                <div>
                  <div className="sp-section-title">New Dictation Download</div>
                  <div className="sp-section-sub">Preloaded Steno Exams — first {stenoDownloadLimit} chapters unlocked each</div>
                </div>
              </div>
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Exam</th><th>Chapters</th><th>Language</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stenoExams.length === 0 ? (
                    <tr><td colSpan="4" className="sp-table-empty">No preloaded steno exams available</td></tr>
                  ) : stenoExams.map(({ key, exam, language, chapters }) => {
                    const downloaded = isExamDownloaded('steno', exam, chapters);
                    const busy = downloadingExamId === key;
                    return (
                    <tr key={key} style={{ cursor: 'pointer' }} onClick={() => setModalExam({ key, exam, language, chapters, kind: 'steno' })}>
                      <td>
                        <span className="sp-file-icon">🎧</span>
                        {exam.name}
                      </td>
                      <td>{chapters.length}</td>
                      <td>{language}</td>
                      <td>
                        <button
                          className="sp-dl-btn"
                          onClick={(e) => { e.stopPropagation(); setModalExam({ key, exam, language, chapters, kind: 'steno' }); }}
                          disabled={busy}
                          title="View chapters and download this dictation exam for offline use"
                          style={downloaded ? { background: '#f0fdf4', color: '#16a34a' } : undefined}
                        >
                          {downloaded ? '✓ Downloaded' : busy ? 'Saving…' : 'View / Download'}
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Chapters popup: lists an exam's chapters with lock state + offline download ── */}
          {modalExam && (
            <div
              onClick={() => setModalExam(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
              >
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                      {modalExam.exam.name}{modalExam.language ? ` — ${modalExam.language}` : ''}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      {modalExam.chapters.length} chapter{modalExam.chapters.length !== 1 ? 's' : ''} · first {unlockedCountFor(modalExam.kind)} unlocked
                    </div>
                  </div>
                  <button onClick={() => setModalExam(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
                </div>

                <div style={{ padding: '6px 22px', overflowY: 'auto' }}>
                  {modalExam.chapters.map((c, i) => {
                    const locked = i >= unlockedCountFor(modalExam.kind);
                    const saved = downloadedKeys.has(offlineKey(modalExam.exam.id, c.font_group, c.id));
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '1.05rem' }}>{modalExam.kind === 'steno' ? '🎧' : '📄'}</span>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{c.name || `Chapter ${c.chapter_no}`}</div>
                            <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Chapter {c.chapter_no} · {fontLang(c.font_group)}</div>
                          </div>
                        </div>
                        {locked ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            Locked
                          </span>
                        ) : saved ? (
                          <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#16a34a' }}>✓ Saved</span>
                        ) : (
                          <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#1d4ed8' }}>Unlocked</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: '16px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Locked chapters are skipped. Contact your administrator to unlock more.</span>
                  <button
                    className="sp-dl-btn"
                    disabled={downloadingExamId === modalExam.key || isExamDownloaded(modalExam.kind, modalExam.exam, modalExam.chapters)}
                    onClick={() => handleDownloadExam(modalExam.kind, modalExam.exam, modalExam.chapters, modalExam.key)}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {downloadingExamId === modalExam.key
                      ? 'Downloading…'
                      : isExamDownloaded(modalExam.kind, modalExam.exam, modalExam.chapters)
                        ? '✓ Downloaded'
                        : 'Download Exam for Offline'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Edit Profile Form ── */}
          {isEditing && (
            <div className="sp-card sp-edit-card fade-in">
              <div className="sp-card-header sp-edit-header">
                <h3>Edit Personal Information</h3>
              </div>
              {error && <div className="sp-alert sp-alert-error">{error}</div>}
              {success && <div className="sp-alert sp-alert-success">{success}</div>}
              <form onSubmit={handleSave} className="sp-form">
                <div className="sp-form-row">
                  <div className="sp-form-group">
                    <label>Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="sp-form-group">
                    <label>Father's Name</label>
                    <input type="text" name="fathers_name" value={formData.fathers_name} onChange={handleChange} />
                  </div>
                </div>
                <div className="sp-form-row">
                  <div className="sp-form-group">
                    <label>Phone Number</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} required />
                  </div>
                  <div className="sp-form-group">
                    <label>City</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange} />
                  </div>
                </div>
                <div className="sp-form-row">
                  <div className="sp-form-group">
                    <label>State</label>
                    <input type="text" name="state" value={formData.state} onChange={handleChange} />
                  </div>
                </div>
                <div className="sp-form-divider" />
                <p className="sp-form-hint">Change Password — leave blank to keep current password</p>
                <div className="sp-form-row">
                  <div className="sp-form-group">
                    <label>New Password</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} minLength="6" />
                  </div>
                  <div className="sp-form-group">
                    <label>Confirm Password</label>
                    <input type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} minLength="6" />
                  </div>
                </div>
                <div className="sp-form-actions">
                  <button type="button" className="sp-btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="sp-btn-save" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {!isEditing && error && <div className="sp-alert sp-alert-error" style={{ marginTop: 16 }}>{error}</div>}
          {!isEditing && success && <div className="sp-alert sp-alert-success" style={{ marginTop: 16 }}>{success}</div>}

        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
