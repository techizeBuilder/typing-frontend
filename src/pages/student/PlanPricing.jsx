import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckIcon,
  ClockIcon,
  CrownIcon,
  MessageCircleIcon,
  MinusIcon,
  PhoneIcon,
  PlusIcon,
  SendIcon,
  ShieldCheckIcon,
  TagIcon,
  XIcon,
} from 'lucide-react';
import { planService, settingService } from '../../services/api';
import { Breadcrumbs } from '../../ui/PageHeading';
import { EmptyState, LoadingState } from '../../features/exams/ExamUI';
import {
  PLAN_CATEGORIES, STATUS_TONE, planCategories, planInCategory, daysLeft, discountPct, durationLabel, errorMessage, fmtDate, perMonth, rupees, statusLabel, waLink,
} from '../../features/plans/planData';

const FAQS = [
  ['How do I buy a plan?', 'Choose a plan and tap "Buy Now" to send a request. Pay the institute using the details shown, and they will activate your plan — usually the same day.'],
  ['When does my plan start?', 'From the day it is activated. If you still have days left, the new plan starts the day after your current validity ends, so you never lose days.'],
  ['What does a plan unlock?', 'Your account stays active until the end date shown, with the tests and premium PDF magazines included in the plan.'],
  ['My validity has ended and I cannot sign in to use tests. What now?', 'Contact the institute using the phone or WhatsApp number on this page. Your plan can be renewed straight away.'],
];

function BuyModal({ plan, contact, referral, onClose, onSent }) {
  const [note, setNote] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const discount = referral?.enabled && referral.first_plan && (referral.referred || code.trim()) ? referral.discount_pct : 0;
  const send = async () => {
    setBusy(true); setError('');
    try { await planService.request(plan.id, note, referral?.referred ? undefined : code.trim() || undefined); onSent(); } catch (err) { setError(errorMessage(err, 'Could not send your request.')); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/50 p-4" role="dialog" aria-modal="true" aria-label={`Buy ${plan.name}`} onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-[18px] font-bold text-navy-800">{plan.name}</h3>
            <p className="text-[12.5px] text-slate-500">
              {discount ? <><span className="line-through">{rupees(plan.price)}</span> <b className="text-emerald-700">{rupees(plan.price - Math.round((plan.price * discount) / 100))}</b></> : rupees(plan.price)} · {durationLabel(plan.duration_days)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><XIcon className="h-4 w-4" aria-hidden="true" /></button>
        </div>
        <div className="mb-4 rounded-lg border border-primary-100 bg-primary-50 p-3 text-[12.5px] text-primary-700">
          <p className="mb-1 font-semibold">How to pay</p>
          {contact.note ? <p className="whitespace-pre-wrap">{contact.note}</p> : <p>Pay the institute and mention your login ID. They will activate your plan.</p>}
          <ContactLinks contact={contact} className="mt-2" />
        </div>
        {referral?.enabled && referral.first_plan &&
          (referral.referred ?
            <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">Referral discount applied: <b>{referral.discount_pct}% off</b> your first plan.</p> :
            <label className="mb-3 block">
              <span className="mb-1 block text-[12px] font-semibold text-navy-800">Referral code (optional — {referral.discount_pct}% off your first plan)</span>
              <input value={code} maxLength={16} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. 7KQ2MXRA" className="w-full rounded-md border border-slate-300 px-3 py-2 text-[12.5px] uppercase outline-none focus:border-primary" />
            </label>)
        }
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-navy-800">Message for the institute (optional)</span>
          <textarea rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid by UPI, reference 4512…" className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-[12.5px] outline-none focus:border-primary" />
        </label>
        {error && <p role="alert" className="mt-2 text-[12.5px] text-danger">{error}</p>}
        <button type="button" onClick={send} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-[13px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
          <SendIcon className="h-4 w-4" aria-hidden="true" /> {busy ? 'Sending…' : 'Send Purchase Request'}
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-500">Your plan is activated by the institute after payment.</p>
      </div>
    </div>
  );
}

function ContactLinks({ contact, className = '' }) {
  if (!contact.phone && !contact.whatsapp) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {contact.phone && <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-navy-800 hover:bg-slate-50"><PhoneIcon className="h-3.5 w-3.5" aria-hidden="true" /> {contact.phone}</a>}
      {contact.whatsapp && <a href={waLink(contact.whatsapp)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"><MessageCircleIcon className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp</a>}
    </div>
  );
}

function PlanCard({ plan, onBuy, publicView }) {
  const off = discountPct(plan);
  const pm = perMonth(plan);
  return (
    <div className={`relative flex flex-col rounded-2xl border p-5 shadow-card ${plan.popular ? 'border-amber-200 bg-gradient-to-b from-amber-50/60 to-white' : 'border-slate-200 bg-white'}`}>
      {plan.popular && <span className="absolute -top-3 left-5 rounded-full bg-amber-400 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wide text-navy-900">Most Popular</span>}
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-[18px] font-bold text-navy-800">
          <span className={`grid h-8 w-8 place-items-center rounded-full text-white ${plan.popular ? 'bg-amber-400' : 'bg-slate-400'}`}><CrownIcon className="h-4 w-4" aria-hidden="true" /></span>
          {plan.name}
        </h3>
        {off > 0 && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{off}% OFF</span>}
      </div>
      {plan.tagline && <p className="mt-1.5 text-[12.5px] text-slate-500">{plan.tagline}</p>}
      <div className="mt-4 flex items-end gap-2">
        <span className="font-display text-[30px] font-extrabold leading-none text-navy-800">{rupees(plan.price)}</span>
        {plan.original_price > plan.price && <span className="pb-1 text-[14px] text-slate-400 line-through">{rupees(plan.original_price)}</span>}
      </div>
      <p className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px] text-slate-600">
        <span className="inline-flex items-center gap-1"><ClockIcon className="h-3.5 w-3.5" aria-hidden="true" /> Validity {durationLabel(plan.duration_days)}</span>
        {pm && <span className="inline-flex items-center gap-1"><TagIcon className="h-3.5 w-3.5" aria-hidden="true" /> {rupees(pm)}/month</span>}
      </p>
      <ul className="mt-4 flex-1 space-y-2">
        {(plan.features || []).map((f) => (
          <li key={f.label} className={`flex items-start gap-2 text-[12.5px] ${f.included ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
            {f.included ? <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" /> : <XIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />}
            {f.label}
          </li>
        ))}
      </ul>
      {publicView ?
        <Link to="/login" className={`mt-5 block rounded-lg py-2.5 text-center text-[13px] font-bold ${plan.popular ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-navy-900' : 'border border-primary text-primary hover:bg-primary-50'}`}>Sign in to buy</Link> :
        <button type="button" onClick={() => onBuy(plan)} className={`mt-5 rounded-lg py-2.5 text-[13px] font-bold transition-colors duration-150 ${plan.popular ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-navy-900 hover:from-amber-500 hover:to-amber-500' : 'border border-primary text-primary hover:bg-primary-50'}`}>Buy Now</button>
      }
    </div>
  );
}

export default function PlanPricing({ publicView = false }) {
  const [plans, setPlans] = useState(null);
  const [mine, setMine] = useState(null);
  const [contact, setContact] = useState({ phone: '', whatsapp: '', note: '' });
  const [tab, setTab] = useState(null);
  const [buying, setBuying] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState(0);

  const loadMine = () => planService.mine().then(setMine).catch(() => setMine(null));
  useEffect(() => {
    planService.list().then(setPlans).catch((err) => { setPlans([]); setError(errorMessage(err, 'Could not load plans. Check your internet connection.')); });
    settingService.getAll()
      .then((s) => setContact({ phone: s?.plans_contact_phone || '', whatsapp: s?.plans_contact_whatsapp || '', note: s?.plans_payment_note || '' }))
      .catch(() => {});
    if (!publicView) loadMine();
  }, [publicView]);

  // Category tabs: only categories that have plans; "All Access" plans show in every tab.
  const tabs = useMemo(() => PLAN_CATEGORIES.filter((c) => c.value !== 'all' && (plans || []).some((p) => planCategories(p.category).includes(c.value))), [plans]);
  const activeTab = tabs.find((t) => t.value === tab) || tabs[0] || null;
  const visible = (plans || []).filter((p) => !activeTab || planInCategory(p, activeTab.value));
  const featureRows = [...new Set(visible.flatMap((p) => (p.features || []).map((f) => f.label)))];

  const left = daysLeft(mine?.validity_end);
  const pending = (mine?.subscriptions || []).filter((s) => s.status === 'Requested');
  const history = (mine?.subscriptions || []).filter((s) => s.status !== 'Requested').slice(0, 5);

  const cancel = async (id) => {
    try { await planService.cancel(id); await loadMine(); } catch (err) { setError(errorMessage(err, 'Could not cancel the request.')); }
  };

  const body = (
    <>
      {!publicView && mine &&
        <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className={`flex items-start gap-3 rounded-xl border p-4 shadow-card ${left !== null && left >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
            <ShieldCheckIcon className={`h-6 w-6 shrink-0 ${left !== null && left >= 0 ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden="true" />
            <div>
              <p className="font-display text-[14px] font-bold text-navy-800">{left !== null && left >= 0 ? 'Your access is active' : 'No active plan'}</p>
              <p className="text-[12.5px] text-slate-600">
                {left !== null && left >= 0 ? <>Valid until <b>{fmtDate(mine.validity_end)}</b> · {left === 0 ? 'last day today' : `${left} day${left === 1 ? '' : 's'} left`}. Buying another plan extends it.</> : 'Choose a plan below to unlock premium tests and PDF magazines.'}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <p className="mb-2 font-display text-[13.5px] font-bold text-navy-800">Your requests</p>
            {pending.length === 0 && history.length === 0 ? <p className="text-[12.5px] text-slate-500">No plan requests yet.</p> :
              <ul className="space-y-1.5 text-[12.5px]">
                {[...pending, ...history].map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-navy-800">{s.plan_name}</span>
                    <span className={`rounded px-2 py-[1px] text-[10.5px] font-semibold ${STATUS_TONE[s.display_status]}`}>{statusLabel(s.display_status)}</span>
                    <span className="text-slate-500">{s.status === 'Active' ? `${fmtDate(s.starts_on)} – ${fmtDate(s.ends_on)}` : fmtDate(s.created_at)}</span>
                    {s.status === 'Requested' && <button type="button" onClick={() => cancel(s.id)} className="ml-auto text-[11.5px] font-medium text-danger hover:underline">Cancel</button>}
                  </li>
                ))}
              </ul>
            }
          </div>
        </section>
      }

      {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger">{error}</p>}

      <section className="mb-6 text-center">
        <h2 className="font-display text-[26px] font-extrabold text-navy-800 sm:text-[30px]">
          Choose Your <span className="bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">{activeTab ? activeTab.heading : ''}</span> {activeTab ? 'Pass' : 'Plan'}
        </h2>
        <p className="mx-auto mt-1 max-w-xl text-[13px] text-slate-500">Pick a plan and start practising today.</p>
        {tabs.length > 1 &&
          <div className="mx-auto mt-4 inline-flex flex-wrap justify-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-card" role="tablist" aria-label="Plan category">
            {tabs.map((c) => (
              <button key={c.value} type="button" role="tab" aria-selected={activeTab?.value === c.value} onClick={() => setTab(c.value)}
                className={`rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors duration-150 ${activeTab?.value === c.value ? 'bg-gradient-to-r from-primary to-violet-600 text-white shadow' : 'text-slate-500 hover:text-navy-800'}`}>
                {c.label}
              </button>
            ))}
          </div>
        }
      </section>

      {plans === null ? <LoadingState>Loading plans…</LoadingState> :
        visible.length === 0 ? <EmptyState>No plans are available right now. Please contact the institute.</EmptyState> :
          <div className="mx-auto mb-8 grid max-w-5xl gap-6 pt-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((p) => <PlanCard key={p.id} plan={p} publicView={publicView} onBuy={(plan) => { setNotice(''); setBuying(plan); }} />)}
          </div>
      }

      {visible.length > 1 && featureRows.length > 0 &&
        <section className="mx-auto mb-8 max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <h3 className="border-b border-slate-100 px-5 py-3 font-display text-[15px] font-bold text-navy-800">Compare plans</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[12.5px]">
              <thead className="bg-slate-50 text-[12px] font-semibold text-slate-600">
                <tr><th scope="col" className="px-5 py-2.5">Feature</th>{visible.map((p) => <th key={p.id} scope="col" className="px-5 py-2.5 text-center">{p.name}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr><td className="px-5 py-2.5 font-medium text-navy-800">Price</td>{visible.map((p) => <td key={p.id} className="px-5 py-2.5 text-center font-semibold text-navy-800">{rupees(p.price)}</td>)}</tr>
                <tr><td className="px-5 py-2.5 font-medium text-navy-800">Validity</td>{visible.map((p) => <td key={p.id} className="px-5 py-2.5 text-center text-slate-600">{durationLabel(p.duration_days)}</td>)}</tr>
                {featureRows.map((label) => (
                  <tr key={label}>
                    <td className="px-5 py-2.5 text-slate-700">{label}</td>
                    {visible.map((p) => {
                      const f = (p.features || []).find((x) => x.label === label);
                      return <td key={p.id} className="px-5 py-2.5 text-center">{f?.included ? <CheckIcon className="mx-auto h-4 w-4 text-success" aria-label="Included" /> : <MinusIcon className="mx-auto h-4 w-4 text-slate-300" aria-label="Not included" />}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      }

      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="mb-3 font-display text-[15px] font-bold text-navy-800">Frequently Asked Questions</h3>
          <ul className="divide-y divide-slate-100">
            {FAQS.map(([q, a], i) => (
              <li key={q}>
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i} className="flex w-full items-center gap-3 py-3 text-left text-[13px] font-semibold text-navy-800">
                  {q}
                  {openFaq === i ? <MinusIcon className="ml-auto h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : <PlusIcon className="ml-auto h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
                </button>
                {openFaq === i && <p className="pb-3 text-[12.5px] leading-relaxed text-slate-600">{a}</p>}
              </li>
            ))}
          </ul>
        </section>
        <section className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="mb-2 font-display text-[15px] font-bold text-navy-800">Need help buying?</h3>
          {contact.note && <p className="mb-2 whitespace-pre-wrap text-[12.5px] text-slate-600">{contact.note}</p>}
          {contact.phone || contact.whatsapp ? <ContactLinks contact={contact} /> : <p className="text-[12.5px] text-slate-500">Contact the institute office to buy or renew a plan.</p>}
        </section>
      </div>

      {buying && <BuyModal plan={buying} contact={contact} referral={mine?.referral} onClose={() => setBuying(null)}
        onSent={() => { setBuying(null); setNotice(`Request sent for ${buying.name}. The institute will activate it after payment.`); loadMine(); }} />}
    </>
  );

  if (publicView) {
    return (
      <div className="nd min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between">
          <Link to="/" className="font-display text-[16px] font-bold text-navy-800">Plans &amp; Pricing</Link>
          <Link to="/login" className="rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700">Sign in</Link>
        </div>
        {body}
      </div>
    );
  }
  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-3"><Breadcrumbs crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Plan & Pricing' }]} /></div>
      {body}
    </div>
  );
}
