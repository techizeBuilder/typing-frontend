// Shared helpers for Plan & Pricing (student + admin pages).
export const PLAN_CATEGORIES = [
  { value: 'typing', label: 'Typing Pass', heading: 'Typing' },
  { value: 'english_steno', label: 'English Steno', heading: 'English Steno' },
  { value: 'hindi_steno', label: 'Hindi Steno', heading: 'Hindi Steno' },
  { value: 'all', label: 'All Access', heading: 'All Access' },
];
// A plan's category is one value or several joined by commas ("typing,english_steno").
export const planCategories = (v) => String(v ?? 'all').split(',').map((c) => c.trim()).filter(Boolean);
export const categoryLabel = (v) => planCategories(v).map((c) => PLAN_CATEGORIES.find((x) => x.value === c)?.label || c).join(' + ');
// True when the plan belongs in a category tab ("All Access" plans belong in every tab).
export const planInCategory = (plan, category) => { const cats = planCategories(plan.category); return cats.includes('all') || cats.includes(category); };

export const rupees = (n) => (n === null || n === undefined ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
export const discountPct = (p) => (p.original_price && p.original_price > p.price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0);
export const perMonth = (p) => (p.duration_days >= 60 ? Math.round(p.price / (p.duration_days / 30)) : null);
export const durationLabel = (days) => (days % 365 === 0 ? `${days / 365} year${days === 365 ? '' : 's'}` : days % 30 === 0 ? `${days / 30} month${days === 30 ? '' : 's'}` : `${days} days`);

export const fmtDate = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const daysLeft = (end) => {
  if (!end) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${String(end).slice(0, 10)}T00:00:00`) - t) / 86400000);
};

export const STATUS_TONE = {
  Requested: 'bg-amber-50 text-amber-700',
  Active: 'bg-emerald-50 text-emerald-700',
  Expired: 'bg-slate-100 text-slate-600',
  Rejected: 'bg-rose-50 text-rose-700',
  Cancelled: 'bg-slate-100 text-slate-500',
};
export const statusLabel = (s) => (s === 'Requested' ? 'Pending' : s);

export const waLink = (num) => `https://wa.me/${String(num || '').replace(/\D/g, '')}`;

export const errorMessage = (err, fallback) => {
  const msg = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};
