import { useEffect, useState } from 'react';
import { ArrowUpIcon, CheckIcon, CopyIcon, FileTextIcon, GiftIcon, InfoIcon, LinkIcon, SendIcon, UserIcon, UsersIcon, WalletIcon } from 'lucide-react';
import { referralService } from '../../services/api';
import { API_BASE_URL } from '../../config';
import { Breadcrumbs } from '../../ui/PageHeading';
import { LoadingState } from '../../features/exams/ExamUI';
import { errorMessage, rupees } from '../../features/plans/planData';

// Public sign-up address for the share link. The web app uses its own address;
// the desktop app (file://) uses the site that serves the API.
const siteBase = () => (window.location.protocol.startsWith('http')
  ? `${window.location.origin}${window.location.pathname}`
  : `${API_BASE_URL.replace(/\/api\/?$/, '')}/`);

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—');
const PAYOUT_TONE = { Requested: 'bg-amber-50 text-amber-700', Paid: 'bg-emerald-50 text-emerald-700', Rejected: 'bg-rose-50 text-rose-700' };

export default function ReferEarn() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState('');
  const [upi, setUpi] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = () => referralService.mine()
    .then((d) => { setData(d); setError(''); })
    .catch((err) => { setData(false); setError(errorMessage(err, 'Could not load your referral details.')); });
  useEffect(() => { load(); }, []);

  if (data === null) return <div className="nd p-5"><LoadingState>Loading…</LoadingState></div>;
  if (data === false) return <div className="nd p-5"><p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger">{error}</p></div>;

  const { settings: s, stats } = data;
  const link = `${siteBase()}#/signup?ref=${data.code}`;
  const shareText = `Practise typing & steno for government exams with me! Sign up with my link and get ${s.discount_pct}% off your first plan: ${link}`;
  const copy = () => {
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const canWithdraw = stats.balance >= s.min_payout && !data.payouts.some((p) => p.status === 'Requested');
  const requestPayout = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      await referralService.requestPayout({ amount: Number(amount || stats.balance), upi_id: upi });
      setNotice('Payout requested. The institute will send it to your UPI ID.');
      setAmount('');
      await load();
    } catch (err) { setError(errorMessage(err, 'Could not request the payout.')); } finally { setBusy(false); }
  };

  const statCards = [
    ['Total Referrals', stats.total_referrals, 'text-primary'],
    ['Total Earned', rupees(stats.total_earned), 'text-success'],
    ['Available Balance', rupees(stats.balance), 'text-[#D97706]'],
    ['Paid Out', rupees(stats.paid_out), 'text-primary'],
  ];
  const steps = [
    ['Copy Your Link', 'Grab your unique referral link from above'],
    ['Share With Friends', 'Send it on WhatsApp, Telegram or anywhere'],
    ['They Buy a Plan', `Your friend signs up and gets ${s.discount_pct}% off their first plan`],
    ['You Earn', `${data.rate}% of what they pay is added to your balance once the plan is activated`],
  ];
  const terms = [
    `Your referral code also works as a coupon: a new student who signs up with your link or enters your code when buying gets ${s.discount_pct}% off their first plan.`,
    'You earn commission only on a referred student\'s first plan. Each student can be referred by one person only.',
    `Commission is ${s.commission_pct}% of the amount paid, or ${s.premium_commission_pct}% while you have an active plan yourself.`,
    'Commission is added when the institute activates your friend\'s plan after payment.',
    `The minimum payout is ${rupees(s.min_payout)}. Payouts are sent to your UPI ID by the institute.`,
    'The institute may verify referrals and withhold commission for fraudulent or invalid referrals.',
  ];

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-3"><Breadcrumbs crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Refer & Earn' }]} /></div>
      <div className="mb-4">
        <h2 className="flex items-center gap-2 font-display text-[22px] font-bold text-navy-800"><GiftIcon className="h-6 w-6 text-emerald-600" aria-hidden="true" /> Refer &amp; Earn</h2>
        <p className="text-[12.5px] text-slate-500">Share your referral link and earn commission when your friends buy their first plan.</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-semibold text-primary-700"><UserIcon className="h-3 w-3" aria-hidden="true" /> {data.premium ? 'Plan member' : 'Free referrer'} — {data.rate}% Commission</span>
          {!data.premium && s.premium_commission_pct > s.commission_pct &&
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-[#B45309]"><ArrowUpIcon className="h-3 w-3" aria-hidden="true" /> Get {s.premium_commission_pct}% with an active plan</span>}
        </div>
      </div>

      {!s.enabled && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">Refer &amp; Earn is paused by the institute. Your earnings so far are kept.</p>}

      <section className="mb-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white shadow-card">
        <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold"><LinkIcon className="h-4 w-4" aria-hidden="true" /> Your Referral Link</p>
        <div className="flex flex-wrap items-center gap-2.5 rounded-lg bg-white/15 p-2.5">
          <span className="min-w-0 flex-1 truncate px-1.5 text-[13px]" title={link}>{link}</span>
          <button type="button" onClick={copy} className="flex shrink-0 items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-[12px] font-semibold text-violet-700 hover:bg-violet-50">
            {copied ? <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> : <CopyIcon className="h-3.5 w-3.5" aria-hidden="true" />} {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-[12.5px]">Your Code: <span className="font-display text-[15px] font-bold tracking-wider">{data.code}</span></p>
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-md bg-[#25D366] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1ebc59]"><SendIcon className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp</a>
          <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-md bg-[#229ED9] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1c8cc1]"><SendIcon className="h-3.5 w-3.5" aria-hidden="true" /> Telegram</a>
        </div>
      </section>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(([label, value, color]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-card">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-1 font-display text-[20px] font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger">{error}</p>}

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-2.5 flex items-center gap-2 font-display text-[14px] font-semibold text-navy-800"><WalletIcon className="h-4 w-4 text-success" aria-hidden="true" /> Request Payout</h3>
        <p className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2.5 text-[12px] text-slate-600">
          <InfoIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          Minimum {rupees(s.min_payout)} required to request a payout. Available balance: <span className="font-semibold text-navy-800">{rupees(stats.balance)}</span>
          {stats.requested > 0 && <> · In progress: <span className="font-semibold text-navy-800">{rupees(stats.requested)}</span></>}
        </p>
        {canWithdraw &&
          <form onSubmit={requestPayout} className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Amount (₹)</span>
              <input type="number" min={s.min_payout} max={stats.balance} value={amount} placeholder={String(stats.balance)} onChange={(e) => setAmount(e.target.value)} className="w-[130px] rounded-md border border-slate-300 px-3 py-2 text-[12.5px] outline-none focus:border-primary" /></label>
            <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Your UPI ID</span>
              <input value={upi} required maxLength={100} onChange={(e) => setUpi(e.target.value)} placeholder="name@okaxis" className="w-[220px] rounded-md border border-slate-300 px-3 py-2 text-[12.5px] outline-none focus:border-primary" /></label>
            <button type="submit" disabled={busy} className="rounded-md bg-success px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#146c43] disabled:opacity-60">{busy ? 'Requesting…' : 'Request Payout'}</button>
          </form>
        }
        {data.payouts.length > 0 &&
          <ul className="mt-3 divide-y divide-slate-100 text-[12px]">
            {data.payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-semibold text-navy-800">{rupees(p.amount)}</span>
                <span className="text-slate-500">to {p.upi_id}</span>
                <span className={`rounded px-2 py-[1px] text-[10.5px] font-semibold ${PAYOUT_TONE[p.status]}`}>{p.status === 'Requested' ? 'In progress' : p.status}</span>
                <span className="ml-auto text-slate-500">{fmt(p.processed_at || p.created_at)}{p.payment_ref ? ` · Ref ${p.payment_ref}` : ''}{p.admin_note ? ` · ${p.admin_note}` : ''}</span>
              </li>
            ))}
          </ul>
        }
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="font-display text-[14px] font-semibold text-navy-800">How It Works</h3>
        <p className="mb-3.5 text-[12px] text-slate-500">Earning is as easy as 1-2-3-4</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map(([title, desc], i) => (
            <div key={title} className="text-center">
              <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-violet-600 font-display text-[14px] font-bold text-white">{i + 1}</span>
              <p className="mt-2 text-[12.5px] font-semibold text-navy-800">{title}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-2.5 flex items-center gap-2 font-display text-[14px] font-semibold text-navy-800"><FileTextIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Terms and Conditions</h3>
        <ul className="space-y-1.5">
          {terms.map((t) => <li key={t} className="flex items-start gap-1.5 text-[11.5px] text-slate-600"><CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" /> {t}</li>)}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="flex items-center gap-2 font-display text-[14px] font-semibold text-navy-800"><UsersIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Your Referrals</h3>
        <p className="mb-2.5 text-[12px] text-slate-500">Everyone who joined through your link or code</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[12px]">
            <thead className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr><th scope="col" className="pb-2">Name</th><th scope="col" className="pb-2">Joined</th><th scope="col" className="pb-2">Plan Purchased</th><th scope="col" className="pb-2">Commission Earned</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.referrals.length === 0 ?
                <tr><td colSpan={4} className="py-6 text-center text-[12px] text-slate-400">No referrals yet. Share your link to start earning!</td></tr> :
                data.referrals.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium text-navy-800">{r.name}</td>
                    <td className="py-2 text-slate-600">{fmt(r.joined_at)}</td>
                    <td className="py-2 text-slate-600">{r.plan || <span className="text-slate-400">Not yet</span>}</td>
                    <td className="py-2 font-semibold text-success">{r.commission ? rupees(r.commission) : '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
