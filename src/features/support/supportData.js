// Ticket constants and helpers shared by the student and admin support pages.
export const TICKET_CATEGORIES = ['Result / Score', 'Payment / Subscription', 'Test Not Loading', 'Account / Login', 'Other'];
export const TICKET_PRIORITIES = ['Low', 'Medium', 'High'];
export const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved'];

export const statusTone = {
  Open: 'bg-rose-50 text-rose-700',
  'In Progress': 'bg-amber-50 text-amber-700',
  Resolved: 'bg-emerald-50 text-emerald-700',
};

export const priorityTone = {
  High: 'text-danger',
  Medium: 'text-amber-600',
  Low: 'text-slate-500',
};

export const ticketNo = (t) => `T-${1000 + Number(t.ticket_no || 0)}`;

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-primary';

// Same look as inputCls but sized to its content (filters, inline status pickers).
export const inlineFieldCls = inputCls.replace('w-full ', 'w-auto ');

export const errorMessage = (err, fallback) => {
  const msg = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};
