import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2Icon,
  CrownIcon,
  DownloadIcon,
  HourglassIcon,
  IndianRupeeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import { planService, referralService, settingService } from '../../services/api';
import { PageHeading } from '../../ui/PageHeading';
import { StatCard } from '../../ui/StatCard';
import { LoadingState } from '../../features/exams/ExamUI';
import {
  PLAN_CATEGORIES, STATUS_TONE, categoryLabel, discountPct, durationLabel, errorMessage, fmtDate, rupees, statusLabel,
} from '../../features/plans/planData';

const card = 'rounded-xl border border-slate-200 bg-white p-4 shadow-card';
const labelCls = 'mb-1 block text-[11.5px] font-semibold text-navy-800';
const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-[12.5px] outline-none focus:border-primary';

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/50 p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-xl bg-white p-6 shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-[17px] font-bold text-navy-800">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><XIcon className="h-4 w-4" aria-hidden="true" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const EMPTY_PLAN = {
  name: '', category: 'typing', tagline: '', price: '', original_price: '', duration_days: 365, popular: false, is_active: true, sort_order: 0,
  preload_tests_limit: '', steno_tests_limit: '', live_tests_limit: '', features: [{ label: '', included: true }],
};

function PlanEditor({ plan, onClose, onSaved }) {
  const [form, setForm] = useState(plan ? {
    ...EMPTY_PLAN, ...plan,
    tagline: plan.tagline || '', original_price: plan.original_price ?? '',
    preload_tests_limit: plan.preload_tests_limit ?? '', steno_tests_limit: plan.steno_tests_limit ?? '', live_tests_limit: plan.live_tests_limit ?? '',
    features: plan.features?.length ? plan.features : [{ label: '', included: true }],
  } : EMPTY_PLAN);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm({ ...form, ...patch });
  const num = (v) => (v === '' || v === null ? null : Number(v));
  const save = async () => {
    setSaving(true); setError('');
    const payload = {
      name: form.name, category: form.category, tagline: form.tagline, price: Number(form.price), original_price: num(form.original_price),
      duration_days: Number(form.duration_days), popular: form.popular, is_active: form.is_active, sort_order: Number(form.sort_order) || 0,
      preload_tests_limit: num(form.preload_tests_limit), steno_tests_limit: num(form.steno_tests_limit), live_tests_limit: num(form.live_tests_limit),
      features: form.features.filter((f) => f.label.trim()),
    };
    try {
      if (plan) await planService.update(plan.id, payload); else await planService.create(payload);
      await onSaved(); onClose();
    } catch (err) { setError(errorMessage(err, 'Could not save the plan.')); } finally { setSaving(false); }
  };
  return (
    <Modal title={plan ? `Edit ${plan.name}` : 'Add New Plan'} onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className={labelCls}>Plan Name</span><input value={form.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Gold Pass" className={inputCls} /></label>
        <label className="block"><span className={labelCls}>Category</span>
          <select value={form.category} onChange={(e) => set({ category: e.target.value })} className={inputCls}>{PLAN_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
        <label className="block sm:col-span-2"><span className={labelCls}>Tagline</span><input value={form.tagline} maxLength={150} onChange={(e) => set({ tagline: e.target.value })} placeholder="e.g. Best for serious aspirants — full access for 1 year." className={inputCls} /></label>
        <label className="block"><span className={labelCls}>Price (₹)</span><input type="number" min="0" value={form.price} onChange={(e) => set({ price: e.target.value })} className={inputCls} /></label>
        <label className="block"><span className={labelCls}>Original Price (₹, optional — shows the discount)</span><input type="number" min="0" value={form.original_price} onChange={(e) => set({ original_price: e.target.value })} className={inputCls} /></label>
        <label className="block"><span className={labelCls}>Validity (days)</span><input type="number" min="1" max="1095" value={form.duration_days} onChange={(e) => set({ duration_days: e.target.value })} className={inputCls} /></label>
        <label className="block"><span className={labelCls}>Display Order</span><input type="number" min="0" value={form.sort_order} onChange={(e) => set({ sort_order: e.target.value })} className={inputCls} /></label>
        <div className="flex items-center gap-5 sm:col-span-2">
          <label className="flex items-center gap-2 text-[12.5px] text-slate-700"><input type="checkbox" checked={form.popular} onChange={(e) => set({ popular: e.target.checked })} className="h-4 w-4 accent-primary" /> Most Popular badge</label>
          <label className="flex items-center gap-2 text-[12.5px] text-slate-700"><input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="h-4 w-4 accent-primary" /> Shown to students</label>
        </div>
        <fieldset className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
          <legend className="px-1 text-[11.5px] font-semibold text-navy-800">Test limits set on activation (leave empty to keep the student&apos;s current limit)</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {[['preload_tests_limit', 'Pre-load tests'], ['steno_tests_limit', 'Steno tests'], ['live_tests_limit', 'Live tests']].map(([k, l]) => (
              <label key={k} className="block"><span className={labelCls}>{l}</span><input type="number" min="0" value={form[k]} onChange={(e) => set({ [k]: e.target.value })} placeholder="Keep" className={inputCls} /></label>
            ))}
          </div>
        </fieldset>
        <div className="sm:col-span-2">
          <p className={labelCls}>Features (shown on the pricing card; untick for "not included")</p>
          <ul className="space-y-2">
            {form.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2">
                <input type="checkbox" checked={f.included} aria-label="Included" onChange={(e) => set({ features: form.features.map((x, j) => (j === i ? { ...x, included: e.target.checked } : x)) })} className="h-4 w-4 accent-primary" />
                <input value={f.label} maxLength={150} aria-label={`Feature ${i + 1}`} onChange={(e) => set({ features: form.features.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder="e.g. Access to all English typing tests" className={inputCls} />
                <button type="button" aria-label="Remove feature" onClick={() => set({ features: form.features.filter((_, j) => j !== i) })} className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50"><XIcon className="h-3.5 w-3.5" aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
          {form.features.length < 20 && <button type="button" onClick={() => set({ features: [...form.features, { label: '', included: true }] })} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"><PlusIcon className="h-3.5 w-3.5" aria-hidden="true" /> Add feature</button>}
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-[12.5px] text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="button" onClick={save} disabled={saving} className="rounded-md bg-primary px-5 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save Plan'}</button>
      </div>
    </Modal>
  );
}

function PaymentForm({ title, sub, plans, onClose, onDone }) {
  const [studentId, setStudentId] = useState('');
  const [planId, setPlanId] = useState(plans[0]?.id || '');
  const plan = sub ? null : plans.find((p) => p.id === planId);
  const [amount, setAmount] = useState(sub ? sub.plan_price - (sub.discount_amount || 0) : '');
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const shownAmount = amount === '' && plan ? plan.price : amount;
  const submit = async () => {
    setBusy(true); setError('');
    const pay = { amount_paid: shownAmount === '' ? null : Number(shownAmount), payment_ref: ref, admin_note: note };
    try {
      const r = sub ? await planService.activate(sub.id, pay) : await planService.assign({ student_user_id: studentId, plan_id: planId, ...pay });
      await onDone(r); onClose();
    } catch (err) { setError(errorMessage(err, 'Could not activate the plan.')); } finally { setBusy(false); }
  };
  return (
    <Modal title={title} onClose={onClose}>
      {sub ?
        <p className="mb-3 rounded-lg bg-slate-50 p-3 text-[12.5px] text-slate-700"><b>{sub.student?.name}</b> ({sub.student?.user_id}) · {sub.plan_name} · {sub.discount_amount ? <><span className="line-through">{rupees(sub.plan_price)}</span> {rupees(sub.plan_price - sub.discount_amount)} ({sub.discount_pct}% referral discount)</> : rupees(sub.plan_price)} · {durationLabel(sub.duration_days)}{sub.student_note ? <><br /><span className="text-slate-500">Student: “{sub.student_note}”</span></> : null}</p> :
        <div className="mb-3 grid gap-3">
          <label className="block"><span className={labelCls}>Student login ID</span><input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. student01" className={inputCls} /></label>
          <label className="block"><span className={labelCls}>Plan</span>
            <select value={planId} onChange={(e) => { setPlanId(e.target.value); setAmount(''); }} className={inputCls}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {rupees(p.price)} / {durationLabel(p.duration_days)}</option>)}</select></label>
        </div>
      }
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className={labelCls}>Amount received (₹)</span><input type="number" min="0" value={shownAmount} onChange={(e) => setAmount(e.target.value)} className={inputCls} /></label>
        <label className="block"><span className={labelCls}>Payment reference</span><input value={ref} maxLength={100} onChange={(e) => setRef(e.target.value)} placeholder="UPI / receipt no." className={inputCls} /></label>
        <label className="block sm:col-span-2"><span className={labelCls}>Note (optional)</span><input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className={inputCls} /></label>
      </div>
      <p className="mt-3 text-[11.5px] text-slate-500">Validity starts today, or the day after the student&apos;s current validity if it is still running.</p>
      {error && <p role="alert" className="mt-2 text-[12.5px] text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="button" onClick={submit} disabled={busy || (!sub && (!studentId.trim() || !planId))} className="rounded-md bg-success px-5 py-2 text-[12.5px] font-semibold text-white hover:bg-[#146c43] disabled:opacity-60">{busy ? 'Activating…' : 'Activate Plan'}</button>
      </div>
    </Modal>
  );
}

function PaymentSettings() {
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ kind: '', text: '' });
  useEffect(() => {
    settingService.getAll()
      .then((s) => setForm({ plans_contact_phone: s?.plans_contact_phone || '', plans_contact_whatsapp: s?.plans_contact_whatsapp || '', plans_payment_note: s?.plans_payment_note || '' }))
      .catch(() => setForm({ plans_contact_phone: '', plans_contact_whatsapp: '', plans_payment_note: '' }));
  }, []);
  if (!form) return <LoadingState>Loading…</LoadingState>;
  const save = async () => {
    setStatus({ kind: '', text: '' });
    try {
      for (const [k, v] of Object.entries(form)) await settingService.update(k, v);
      setStatus({ kind: 'ok', text: 'Payment details saved. Students see them on the Plan & Pricing page.' });
    } catch (err) { setStatus({ kind: 'error', text: errorMessage(err, 'Could not save.') }); }
  };
  return (
    <section className={`${card} max-w-2xl`}>
      <h3 className="mb-1 text-[13px] font-bold text-navy-800">How students pay</h3>
      <p className="mb-3 text-[12px] text-slate-500">Shown on the Plan &amp; Pricing page and in the Buy dialog, including the public page for students whose validity has ended.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className={labelCls}>Phone</span><input value={form.plans_contact_phone} onChange={(e) => setForm({ ...form, plans_contact_phone: e.target.value })} placeholder="+91 98xxxxxxxx" className={inputCls} /></label>
        <label className="block"><span className={labelCls}>WhatsApp</span><input value={form.plans_contact_whatsapp} onChange={(e) => setForm({ ...form, plans_contact_whatsapp: e.target.value })} placeholder="+91 98xxxxxxxx" className={inputCls} /></label>
        <label className="block sm:col-span-2"><span className={labelCls}>Payment instructions</span><textarea rows={4} maxLength={500} value={form.plans_payment_note} onChange={(e) => setForm({ ...form, plans_payment_note: e.target.value })} placeholder={'e.g. Pay by UPI to institute@upi and send the screenshot on WhatsApp with your login ID.'} className={`${inputCls} resize-none`} /></label>
      </div>
      {status.text && <p role={status.kind === 'error' ? 'alert' : 'status'} className={`mt-2 text-[12.5px] ${status.kind === 'error' ? 'text-danger' : 'text-emerald-700'}`}>{status.text}</p>}
      <button type="button" onClick={save} className="mt-3 rounded-md bg-primary px-5 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700">Save Payment Details</button>
    </section>
  );
}

const PAYOUT_TONE = { Requested: 'bg-amber-50 text-amber-700', Paid: 'bg-emerald-50 text-emerald-700', Rejected: 'bg-rose-50 text-rose-700' };

function ReferralsPanel() {
  const [data, setData] = useState(null);
  const [paying, setPaying] = useState(null);
  const [ref, setRef] = useState('');
  const [msg, setMsg] = useState({ kind: '', text: '' });
  const load = () => referralService.adminOverview().then(setData).catch((err) => { setData({ overview: {}, commissions: [], payouts: [] }); setMsg({ kind: 'error', text: errorMessage(err, 'Could not load referrals.') }); });
  useEffect(() => { load(); }, []);
  if (!data) return <LoadingState>Loading referrals…</LoadingState>;
  const ov = data.overview;
  const pendingPayouts = data.payouts.filter((p) => p.status === 'Requested');
  const markPaid = async () => {
    try { await referralService.markPaid(paying.id, { payment_ref: ref }); setPaying(null); setRef(''); setMsg({ kind: 'ok', text: 'Payout marked as paid.' }); await load(); } catch (err) { setMsg({ kind: 'error', text: errorMessage(err, 'Could not update the payout.') }); }
  };
  const reject = async (p) => {
    const note = window.prompt(`Reject the payout of ${rupees(p.amount)} to ${p.referrer?.name}? The amount goes back to their balance. Reason:`, '');
    if (note === null) return;
    try { await referralService.reject(p.id, { admin_note: note }); await load(); } catch (err) { setMsg({ kind: 'error', text: errorMessage(err, 'Could not reject.') }); }
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<UsersIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Referred Students" value={ov.referred_students} />
        <StatCard icon={<CheckCircle2Icon className="h-5 w-5" />} iconBg="#198754" label="Bought a Plan" value={ov.converted} />
        <StatCard icon={<IndianRupeeIcon className="h-5 w-5" />} iconBg="#6F42C1" label="Commission Earned" value={rupees(ov.commissions_total)} />
        <StatCard icon={<HourglassIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Payouts Pending" value={rupees(ov.pending_payouts)} />
        <StatCard icon={<WalletIcon className="h-5 w-5" />} iconBg="#0EA5E9" label="Paid Out" value={rupees(ov.paid_out)} />
      </div>
      {msg.text && <p role={msg.kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-[12.5px] ${msg.kind === 'error' ? 'border-rose-200 bg-rose-50 text-danger' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{msg.text}</p>}
      <section className="rounded-xl border border-slate-200 bg-white shadow-card">
        <h3 className="border-b border-slate-100 px-4 py-3 text-[13px] font-bold text-navy-800">Payout Requests</h3>
        {pendingPayouts.length === 0 ? <p className="p-6 text-center text-[12.5px] text-slate-500">No payout requests waiting.</p> :
          <ul className="divide-y divide-slate-100">
            {pendingPayouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 p-4 text-[12.5px]">
                <span className="min-w-0 flex-1"><b className="text-navy-800">{p.referrer?.name}</b> <span className="text-slate-400">{p.referrer?.user_id}</span><br />{rupees(p.amount)} to <b>{p.upi_id}</b> · requested {fmtDate(p.created_at)}</span>
                <button type="button" onClick={() => { setPaying(p); setRef(''); }} className="rounded-md bg-success px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#146c43]">Mark as Paid</button>
                <button type="button" onClick={() => reject(p)} className="rounded-md border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-navy-800 hover:bg-slate-50">Reject</button>
              </li>
            ))}
          </ul>
        }
      </section>
      <section className="rounded-xl border border-slate-200 bg-white shadow-card">
        <h3 className="border-b border-slate-100 px-4 py-3 text-[13px] font-bold text-navy-800">Commissions</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[12px]">
            <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-600"><tr>{['Referrer', 'Referred Student', 'Plan', 'Paid', 'Rate', 'Commission', 'Date'].map((h) => <th key={h} scope="col" className="px-3 py-2.5">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.commissions.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No commissions yet.</td></tr>}
              {data.commissions.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2.5"><b className="text-navy-800">{c.referrer?.name}</b> <span className="text-[10.5px] text-slate-400">{c.referrer?.user_id}</span></td>
                  <td className="px-3 py-2.5 text-slate-700">{c.referred?.name}</td>
                  <td className="px-3 py-2.5 text-slate-700">{c.plan_name}</td>
                  <td className="px-3 py-2.5 text-slate-700">{rupees(c.base_amount)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{c.rate}%</td>
                  <td className="px-3 py-2.5 font-semibold text-success">{rupees(c.amount)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {data.payouts.some((p) => p.status !== 'Requested') &&
        <section className="rounded-xl border border-slate-200 bg-white shadow-card">
          <h3 className="border-b border-slate-100 px-4 py-3 text-[13px] font-bold text-navy-800">Payout History</h3>
          <ul className="divide-y divide-slate-100 text-[12px]">
            {data.payouts.filter((p) => p.status !== 'Requested').map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <b className="text-navy-800">{p.referrer?.name}</b> {rupees(p.amount)} to {p.upi_id}
                <span className={`rounded px-2 py-[1px] text-[10.5px] font-semibold ${PAYOUT_TONE[p.status]}`}>{p.status}</span>
                <span className="ml-auto text-slate-500">{fmtDate(p.processed_at)}{p.payment_ref ? ` · Ref ${p.payment_ref}` : ''}{p.admin_note ? ` · ${p.admin_note}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      }
      {paying &&
        <Modal title="Mark Payout as Paid" onClose={() => setPaying(null)}>
          <p className="mb-3 text-[12.5px] text-slate-700">Send <b>{rupees(paying.amount)}</b> to <b>{paying.upi_id}</b> ({paying.referrer?.name}), then record the UPI transaction ID.</p>
          <label className="block"><span className={labelCls}>UPI transaction ID</span><input value={ref} maxLength={100} onChange={(e) => setRef(e.target.value)} className={inputCls} /></label>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setPaying(null)} className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={markPaid} disabled={!ref.trim()} className="rounded-md bg-success px-5 py-2 text-[12.5px] font-semibold text-white hover:bg-[#146c43] disabled:opacity-60">Mark as Paid</button>
          </div>
        </Modal>
      }
    </div>
  );
}

const REFERRAL_FIELDS = [
  ['referral_commission_pct', 'Commission (%)', 'Paid to the referrer on a referred student\'s first plan.'],
  ['referral_premium_commission_pct', 'Commission with an active plan (%)', 'Higher rate for referrers who have an active plan themselves.'],
  ['referral_discount_pct', 'Discount for the new student (%)', 'Taken off the referred student\'s first plan.'],
  ['referral_min_payout', 'Minimum payout (₹)', 'Smallest balance a student can withdraw.'],
];

function ReferralSettings() {
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ kind: '', text: '' });
  useEffect(() => {
    settingService.getAll().then((s) => setForm({
      referral_enabled: s?.referral_enabled !== 'false',
      ...Object.fromEntries(REFERRAL_FIELDS.map(([k]) => [k, s?.[k] ?? ''])),
    })).catch(() => setForm(null));
  }, []);
  if (!form) return null;
  const save = async () => {
    setStatus({ kind: '', text: '' });
    try {
      await settingService.update('referral_enabled', form.referral_enabled ? 'true' : 'false');
      for (const [k] of REFERRAL_FIELDS) await settingService.update(k, String(form[k]));
      setStatus({ kind: 'ok', text: 'Refer & Earn settings saved.' });
    } catch (err) { setStatus({ kind: 'error', text: errorMessage(err, 'Could not save.') }); }
  };
  return (
    <section className={`${card} max-w-2xl`}>
      <h3 className="mb-1 text-[13px] font-bold text-navy-800">Refer &amp; Earn</h3>
      <p className="mb-3 text-[12px] text-slate-500">Students share a code; a new student gets a discount on their first plan and the referrer earns commission when it is activated.</p>
      <label className="mb-3 flex items-center gap-2 text-[12.5px] text-slate-700"><input type="checkbox" checked={form.referral_enabled} onChange={(e) => setForm({ ...form, referral_enabled: e.target.checked })} className="h-4 w-4 accent-primary" /> Refer &amp; Earn is on</label>
      <div className="grid gap-3 sm:grid-cols-2">
        {REFERRAL_FIELDS.map(([k, label, help]) => (
          <label key={k} className="block"><span className={labelCls}>{label}</span>
            <input type="number" min="0" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={inputCls} />
            <span className="mt-0.5 block text-[10.5px] text-slate-500">{help}</span></label>
        ))}
      </div>
      {status.text && <p role={status.kind === 'error' ? 'alert' : 'status'} className={`mt-2 text-[12.5px] ${status.kind === 'error' ? 'text-danger' : 'text-emerald-700'}`}>{status.text}</p>}
      <button type="button" onClick={save} className="mt-3 rounded-md bg-primary px-5 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700">Save Refer &amp; Earn Settings</button>
    </section>
  );
}

export default function AdminPlans() {
  const [plans, setPlans] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('requests');
  const [editing, setEditing] = useState(undefined); // undefined closed, null new, plan edit
  const [activating, setActivating] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [status, setStatus] = useState({ kind: '', text: '' });
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');

  const load = () => Promise.all([
    planService.adminList().then(setPlans),
    planService.subscriptions().then(setData),
  ]).catch((err) => { setPlans((p) => p || []); setData((d) => d || { overview: {}, subscriptions: [] }); setStatus({ kind: 'error', text: errorMessage(err, 'Could not load plans.') }); });
  useEffect(() => { load(); }, []);

  const subs = useMemo(() => data?.subscriptions || [], [data]);
  const pending = subs.filter((s) => s.status === 'Requested');
  const ov = data?.overview || {};
  const list = subs.filter((s) => s.status !== 'Requested'
    && (!filter || s.display_status === filter)
    && `${s.student?.name || ''} ${s.student?.user_id || ''} ${s.plan_name} ${s.payment_ref || ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  const reject = async (s) => {
    const note = window.prompt(`Reject ${s.student?.name}'s request for ${s.plan_name}? Optional reason:`, '');
    if (note === null) return;
    try { await planService.reject(s.id, { admin_note: note }); await load(); } catch (err) { setStatus({ kind: 'error', text: errorMessage(err, 'Could not reject.') }); }
  };
  const removePlan = async (p) => {
    if (!window.confirm(`Delete the plan "${p.name}"? Plans with purchase history are hidden from students instead.`)) return;
    try {
      const r = await planService.remove(p.id);
      setStatus({ kind: 'ok', text: r.deleted ? `"${p.name}" deleted.` : `"${p.name}" has purchase history, so it was hidden from students instead of deleted.` });
      await load();
    } catch (err) { setStatus({ kind: 'error', text: errorMessage(err, 'Could not delete.') }); }
  };
  const exportCsv = () => {
    const head = ['Student', 'Login ID', 'Phone', 'Plan', 'Amount', 'Reference', 'Start', 'Expiry', 'Status', 'Activated On'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...list.map((s) => [s.student?.name, s.student?.user_id, s.student?.phone, s.plan_name, s.amount_paid ?? '', s.payment_ref, s.starts_on, s.ends_on, statusLabel(s.display_status), s.activated_at ? new Date(s.activated_at).toLocaleDateString('en-GB') : ''])]
      .map((r) => r.map(esc).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'subscriptions.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const done = async (r) => {
    setStatus({ kind: 'ok', text: `Plan activated for ${r.student?.name || 'the student'}: valid ${fmtDate(r.starts_on)} – ${fmtDate(r.ends_on)}.${r.referral_commission ? ` Referral commission of ${rupees(r.referral_commission)} credited to the referrer.` : ''}${r.student?.status === 'Inactive' ? ' Note: this student account is marked Inactive in Students Management.' : ''}` });
    await load();
  };

  const tabs = [['requests', `Purchase Requests${pending.length ? ` (${pending.length})` : ''}`], ['subscriptions', 'Subscriptions'], ['plans', 'Plans'], ['referrals', 'Referrals'], ['settings', 'Payment Details']];

  return (
    <div className="nd">
      <PageHeading icon={<WalletIcon className="h-5 w-5" aria-hidden="true" />} title="Subscription & Plan"
        subtitle="Create plans, activate students' purchases after payment and track subscriptions."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setAssigning(true)} disabled={!plans?.length} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-navy-800 hover:bg-slate-50 disabled:opacity-50"><UsersIcon className="h-3.5 w-3.5" aria-hidden="true" /> Assign Plan to Student</button>
            <button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[12px] font-semibold text-white hover:bg-primary-700"><PlusIcon className="h-3.5 w-3.5" aria-hidden="true" /> Add New Plan</button>
          </div>
        } />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={<UsersIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Total Subscriptions" value={data ? ov.total : '—'} />
        <StatCard icon={<CheckCircle2Icon className="h-5 w-5" />} iconBg="#198754" label="Active" value={data ? ov.active : '—'} />
        <StatCard icon={<HourglassIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Expiring in 7 Days" value={data ? ov.expiring_soon : '—'} />
        <StatCard icon={<XCircleIcon className="h-5 w-5" />} iconBg="#DC3545" label="Expired" value={data ? ov.expired : '—'} />
        <StatCard icon={<IndianRupeeIcon className="h-5 w-5" />} iconBg="#6F42C1" label="Total Revenue" value={data ? rupees(ov.revenue_total) : '—'} />
        <StatCard icon={<TrendingUpIcon className="h-5 w-5" />} iconBg="#0EA5E9" label="This Month" value={data ? rupees(ov.revenue_month) : '—'} />
      </div>

      {status.text && <p role={status.kind === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-lg border px-3 py-2 text-[12.5px] ${status.kind === 'error' ? 'border-rose-200 bg-rose-50 text-danger' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{status.text}</p>}

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Sections">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-md border px-4 py-2 text-[12.5px] font-semibold ${tab === k ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>{l}</button>
        ))}
      </div>

      {(plans === null || data === null) && tab !== 'settings' ? <LoadingState>Loading…</LoadingState> : null}

      {tab === 'requests' && data &&
        <section className="rounded-xl border border-slate-200 bg-white shadow-card">
          {pending.length === 0 ? <p className="p-10 text-center text-[12.5px] text-slate-500">No pending purchase requests.</p> :
            <ul className="divide-y divide-slate-100">
              {pending.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy-800">{s.student?.name} <span className="text-[11.5px] font-normal text-slate-400">{s.student?.user_id} · {s.student?.phone}</span></p>
                    <p className="text-[12.5px] text-slate-600">{s.plan_name} · {s.discount_amount ? <>{rupees(s.plan_price - s.discount_amount)} <span className="text-emerald-700">({s.discount_pct}% referral discount)</span></> : rupees(s.plan_price)} · {durationLabel(s.duration_days)} · requested {fmtDate(s.created_at)}</p>
                    {s.student_note && <p className="mt-1 text-[12px] text-slate-500">“{s.student_note}”</p>}
                  </div>
                  <button type="button" onClick={() => setActivating(s)} className="inline-flex items-center gap-1 rounded-md bg-success px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#146c43]"><CheckCircle2Icon className="h-3.5 w-3.5" aria-hidden="true" /> Activate</button>
                  <button type="button" onClick={() => reject(s)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-navy-800 hover:bg-slate-50"><XCircleIcon className="h-3.5 w-3.5" aria-hidden="true" /> Reject</button>
                </li>
              ))}
            </ul>
          }
        </section>
      }

      {tab === 'subscriptions' && data &&
        <section className="rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 p-3.5">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status" className="rounded-md border border-slate-300 px-2.5 py-1.5 text-[12px] text-slate-600 outline-none focus:border-primary">
              <option value="">All Statuses</option><option>Active</option><option>Expired</option><option>Rejected</option><option>Cancelled</option>
            </select>
            <div className="relative ml-auto">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student, plan, reference..." aria-label="Search subscriptions" className="w-[260px] rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-[12px] outline-none focus:border-primary" />
            </div>
            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1.5 text-[12px] font-medium text-emerald-700 hover:bg-emerald-50"><DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" /> Export Excel</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[12px]">
              <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-600">
                <tr>{['Student', 'Plan', 'Amount', 'Reference', 'Start Date', 'Expiry Date', 'Status'].map((h) => <th key={h} scope="col" className="px-3 py-2.5">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No subscriptions.</td></tr>}
                {list.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5"><span className="block font-semibold text-navy-800">{s.student?.name}</span><span className="block text-[10.5px] text-slate-500">{s.student?.user_id}</span></td>
                    <td className="px-3 py-2.5 text-slate-700">{s.plan_name}</td>
                    <td className="px-3 py-2.5 text-slate-700">{s.amount_paid === null ? '—' : rupees(s.amount_paid)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{s.payment_ref || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{fmtDate(s.starts_on)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{fmtDate(s.ends_on)}</td>
                    <td className="px-3 py-2.5"><span className={`rounded px-2 py-[2px] text-[10.5px] font-semibold ${STATUS_TONE[s.display_status]}`}>{statusLabel(s.display_status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      }

      {tab === 'plans' && plans &&
        (plans.length === 0 ? <section className={`${card} text-center text-[12.5px] text-slate-500`}>No plans yet. Use <b>Add New Plan</b> to create your first one.</section> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((p) => (
              <section key={p.id} className={`${card} ${p.is_active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-1.5 font-display text-[15px] font-bold text-navy-800">{p.popular && <CrownIcon className="h-4 w-4 text-amber-500" aria-label="Most popular" />}{p.name}</h3>
                    <p className="text-[11.5px] text-slate-500">{categoryLabel(p.category)} · {durationLabel(p.duration_days)}{p.is_active ? '' : ' · Hidden'}</p>
                  </div>
                  <span className="rounded bg-emerald-50 px-2 py-[2px] text-[10.5px] font-semibold text-emerald-700">{p.active_subscriptions} Active</span>
                </div>
                <p className="mt-2 font-display text-[22px] font-bold text-navy-800">{rupees(p.price)} {discountPct(p) > 0 && <span className="text-[12px] font-semibold text-emerald-700">{discountPct(p)}% off {rupees(p.original_price)}</span>}</p>
                <ul className="mt-2 space-y-1 text-[12px]">
                  {(p.features || []).slice(0, 6).map((f) => <li key={f.label} className={f.included ? 'text-slate-700' : 'text-slate-400 line-through'}>• {f.label}</li>)}
                </ul>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-[12px] text-slate-600 hover:border-primary hover:text-primary"><PencilIcon className="h-3.5 w-3.5" aria-hidden="true" /> Edit</button>
                  <button type="button" onClick={() => removePlan(p)} aria-label={`Delete ${p.name}`} className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2.5 py-1 text-[12px] text-danger hover:bg-rose-100"><Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" /> Delete</button>
                </div>
              </section>
            ))}
          </div>)
      }

      {tab === 'referrals' && <ReferralsPanel />}
      {tab === 'settings' && <><PaymentSettings /><div className="mt-4"><ReferralSettings /></div></>}

      {editing !== undefined && <PlanEditor plan={editing} onClose={() => setEditing(undefined)} onSaved={load} />}
      {activating && <PaymentForm title="Activate Plan" sub={activating} plans={plans || []} onClose={() => setActivating(null)} onDone={done} />}
      {assigning && <PaymentForm title="Assign Plan to Student" plans={(plans || []).filter((p) => p.is_active)} onClose={() => setAssigning(false)} onDone={done} />}
    </div>
  );
}
