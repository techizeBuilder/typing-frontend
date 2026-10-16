import { API_BASE_URL } from '../../config';

// Shared student helpers for the admin Students pages (list, add/edit form, import).
// The payload rules are the ones the old single-page form used.

export const ALL_CATEGORIES = ['Typing English', 'Typing Hindi', 'Steno English', 'Steno Hindi'];
export const STATUSES = ['Active', 'Inactive', 'Pending'];
export const EXTRA_FIELDS = { email: '', city: '', state: '', pin_code: '', address: '', guardian_phone: '', remarks: '' };

export const photoUrl = (p) => (p ? (p.startsWith('http') ? p : `${API_BASE_URL}${p}`) : null);
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const toDateInput = (d) => (d ? new Date(d).toISOString().split('T')[0] : '');
export const categoriesOf = (s) => (s?.category ? s.category.split(',').map((c) => c.trim()).filter(Boolean) : []);
export const hasLoginWindow = (s) => !!(s?.allowed_login_time_start && s?.allowed_login_time_end);
export const isExpired = (s) => !!(s?.validity_end && new Date(s.validity_end) < new Date(new Date().toDateString()));

export const blankStudent = () => ({
  name: '', fathers_name: '', phone: '', user_id: '', password_hash: '',
  selectedCategories: ['Typing English'], status: 'Active', roll_no: '', fees_amount: '',
  last_fees_submitted_date: '', validity_start: '', validity_end: '',
  allowed_login_time_start: '', allowed_login_time_end: '',
  live_tests_limit: '', preload_tests_limit: '', steno_tests_limit: '',
  ...EXTRA_FIELDS,
});

const limit = (v) => (v !== null && v !== undefined ? v : '');
export const studentToForm = (s) => ({
  name: s.name || '', fathers_name: s.fathers_name || '', phone: s.phone || '', user_id: s.user_id || '', password_hash: '',
  selectedCategories: categoriesOf(s), status: s.status || 'Active', roll_no: s.roll_no || '', fees_amount: s.fees_amount || '',
  last_fees_submitted_date: toDateInput(s.last_fees_submitted_date), validity_start: toDateInput(s.validity_start), validity_end: toDateInput(s.validity_end),
  allowed_login_time_start: s.allowed_login_time_start || '', allowed_login_time_end: s.allowed_login_time_end || '',
  live_tests_limit: limit(s.live_tests_limit), preload_tests_limit: limit(s.preload_tests_limit), steno_tests_limit: limit(s.steno_tests_limit),
  ...Object.fromEntries(Object.keys(EXTRA_FIELDS).map((k) => [k, s[k] || ''])),
});

const LIMITS = ['live_tests_limit', 'preload_tests_limit', 'steno_tests_limit'];

// New student (POST /users). Empty optional values are left out.
export function buildCreatePayload(form) {
  const { selectedCategories, ...rest } = form;
  const payload = { ...rest, role: 'Student', category: selectedCategories.join(', ') };
  ['validity_start', 'validity_end', 'last_fees_submitted_date', 'allowed_login_time_start', 'allowed_login_time_end'].forEach((k) => { if (!payload[k]) delete payload[k]; });
  if (payload.fees_amount === '') delete payload.fees_amount;
  LIMITS.forEach((k) => { if (payload[k] === '') delete payload[k]; else payload[k] = parseInt(payload[k], 10); });
  if (!payload.user_id) payload.user_id = payload.phone;
  return payload;
}

// Existing student (PUT /users/:id). Empty values clear the field; a blank password keeps the old one.
export function buildUpdatePayload(form) {
  const { selectedCategories, ...rest } = form;
  const payload = { ...rest, category: selectedCategories.length > 0 ? selectedCategories.join(', ') : null };
  ['validity_start', 'validity_end', 'allowed_login_time_start', 'allowed_login_time_end', 'last_fees_submitted_date'].forEach((k) => { if (!payload[k]) payload[k] = null; });
  if (payload.fees_amount === '') payload.fees_amount = null;
  LIMITS.forEach((k) => { payload[k] = payload[k] === '' ? null : parseInt(payload[k], 10); });
  if (!payload.password_hash || payload.password_hash.trim() === '') delete payload.password_hash;
  delete payload.user_id; // the login ID is not changed from this form
  return payload;
}

export const errorText = (err, fallback) => {
  const m = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(m) ? m.join(', ') : m;
};
