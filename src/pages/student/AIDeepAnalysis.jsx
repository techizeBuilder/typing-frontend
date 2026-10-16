import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ActivityIcon, AlertTriangleIcon, ArrowLeftIcon, BotIcon, BrainIcon, DumbbellIcon, InfoIcon, Loader2Icon, SparklesIcon, TargetIcon, ZapIcon,
} from 'lucide-react';
import { aiAnalysisService, resultService, getCurrentUserUuid } from '../../services/api';
import { buildAnalysis, ruleText } from '../../features/results/aiAnalysis';

const TONE = {
  success: '#198754', primary: '#0D6EFD', warning: '#D97706', danger: '#DC2626', muted: '#64748B',
};
const ICONS = { speed: ZapIcon, accuracy: TargetIcon, mistakes: AlertTriangleIcon, consistency: ActivityIcon };
const REASON = {
  disabled: 'AI analysis is switched off by your institute, so this analysis was made by the app\'s built-in rules.',
  not_configured: 'AI analysis is not set up yet, so this analysis was made by the app\'s built-in rules.',
  daily_limit: 'You have used today\'s AI analyses, so this one was made by the app\'s built-in rules. More are available tomorrow.',
  error: 'The AI service could not be reached, so this analysis was made by the app\'s built-in rules.',
  offline: 'You are offline, so this analysis was made by the app\'s built-in rules.',
};

function Panel({ title, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-card ${className}`}>
      {title && <h3 className="mb-3 font-display text-[14.5px] font-bold text-navy-800">{title}</h3>}
      {children}
    </section>
  );
}

export default function AIDeepAnalysis() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const input = state?.input;
  const [history, setHistory] = useState([]);
  const [ai, setAi] = useState(() => (!input ? { status: 'none' } : navigator.onLine ? { status: 'loading' } : { status: 'done', source: 'rules', reason: 'offline' }));
  const firstName = (localStorage.getItem('name') || '').split(' ')[0];

  useEffect(() => {
    if (!input) return;
    const uid = getCurrentUserUuid() || localStorage.getItem('userId');
    if (uid && navigator.onLine) resultService.getUserResults(uid).then((r) => setHistory(Array.isArray(r) ? r.slice().sort((x, y) => new Date(y.date_taken || 0) - new Date(x.date_taken || 0)) : [])).catch(() => {});
    if (!navigator.onLine) return;
    aiAnalysisService.analyse(input)
      .then((r) => setAi(r.source === 'ai' ? { status: 'done', source: 'ai', text: r.analysis, remaining: r.remaining_today } : { status: 'done', source: 'rules', reason: r.reason }))
      .catch(() => setAi({ status: 'done', source: 'rules', reason: 'error' }));
  }, [input]);

  const a = useMemo(() => (input ? buildAnalysis(input, history) : null), [input, history]);
  if (!input) {
    return (
      <div className="nd p-5">
        <Panel><p className="text-[13px] text-slate-600">Open AI Deep Analysis from a test result. <Link to="/my-tests" className="font-semibold text-primary hover:underline">Go to Test Analysis</Link></p></Panel>
      </div>
    );
  }

  const text = ai.source === 'ai' ? ai.text : ruleText(input, a);
  const isAi = ai.source === 'ai';
  const pctOf = (v) => `${Math.min(100, Math.max(0, (v / Math.max(a.target * 1.5, a.net * 1.1, 1)) * 100))}%`;

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 font-display text-[22px] font-bold text-navy-800">
            <BrainIcon className="h-6 w-6 text-violet-600" aria-hidden="true" /> AI Deep Analysis
            {ai.status === 'done' && (isAi ?
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-primary px-2.5 py-0.5 text-[10.5px] font-bold text-white"><SparklesIcon className="h-3 w-3" aria-hidden="true" /> AI POWERED</span> :
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10.5px] font-bold text-slate-600">RULE-BASED</span>)}
          </h2>
          <p className="text-[12.5px] text-slate-500">{input.exam} · {input.mode}</p>
        </div>
        <button type="button" onClick={() => navigate(-1)} className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] font-medium text-navy-800 hover:bg-slate-50">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Back to Result
        </button>
      </div>

      {ai.status === 'done' && !isAi && <p className="mb-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600"><InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {REASON[ai.reason] || REASON.error}</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Panel title="Executive Summary">
            {ai.status === 'loading' ?
              <p className="flex items-center gap-2 text-[13px] text-slate-500"><Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> Writing your personal analysis…</p> :
              <p className="text-[13px] leading-relaxed text-slate-700">{text.executive_summary}</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {a.metrics.map((m) => {
                const Icon = ICONS[m.key];
                return (
                  <div key={m.key} className="rounded-lg border border-slate-200 p-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: TONE[m.tone] }}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                    <p className="mt-2 text-[11px] text-slate-500">{m.label}</p>
                    <p className="font-display text-[15px] font-bold" style={{ color: TONE[m.tone] }}>{m.value}</p>
                    <p className="text-[11px] text-slate-500">{m.sub}</p>
                  </div>
                );
              })}
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Performance Analysis">
              <p className="mb-2 flex justify-between text-[12px] font-semibold"><span className="text-primary">Current: {a.net} WPM</span><span className="text-success">Target: {a.target} WPM</span></p>
              <div className="relative h-3 rounded-full bg-slate-100" role="img" aria-label={`Current ${a.net} WPM against a target of ${a.target} WPM`}>
                <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: pctOf(a.net) }} />
                <span className="absolute -top-1 h-5 w-1 rounded bg-success" style={{ left: pctOf(a.target) }} />
              </div>
              <p className="mt-3 text-[12px] text-slate-600">{a.net >= a.target ? `You are ${Math.round((a.net - a.target) * 10) / 10} WPM above your target.` : `You are ${Math.round((a.target - a.net) * 10) / 10} WPM below your target. Keep practising to reach ${a.target} WPM.`}</p>
            </Panel>
            <Panel title="Mistake Pattern Analysis">
              {a.totalMistakes === 0 ? <p className="text-[12.5px] text-slate-500">No mistakes in this test.</p> :
                <ul className="space-y-2">
                  {a.pattern.filter((p) => p.count > 0).map((p) => (
                    <li key={p.key} className="text-[12px]">
                      <span className="flex justify-between"><span className="text-slate-700">{p.label}</span><span className="font-semibold text-navy-800">{p.count} ({p.pct}%)</span></span>
                      <span className="mt-1 block h-1.5 rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${p.pct}%`, background: p.color }} /></span>
                    </li>
                  ))}
                </ul>}
            </Panel>
          </div>

          <Panel title={isAi ? 'AI Recommendations' : 'Recommendations'}>
            {ai.status === 'loading' ? <p className="text-[12.5px] text-slate-400">Preparing recommendations…</p> :
              <ol className="space-y-3">
                {text.recommendations.map((r, i) => (
                  <li key={r.title} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-100 font-display text-[13px] font-bold text-violet-700">{i + 1}</span>
                    <span><span className="block text-[13px] font-semibold text-navy-800">{r.title}</span><span className="block text-[12.5px] text-slate-600">{r.text}</span></span>
                  </li>
                ))}
              </ol>}
          </Panel>

          <Panel title="30-Day Improvement Plan">
            {ai.status === 'loading' ? <p className="text-[12.5px] text-slate-400">Building your plan…</p> :
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {text.plan.map((p, i) => (
                  <div key={p.title + i} className="rounded-lg border border-slate-200 p-3">
                    <span className="grid h-7 w-7 place-items-center rounded-full font-display text-[12px] font-bold text-white" style={{ background: ['#0D6EFD', '#198754', '#7C3AED', '#F59E0B'][i % 4] }}>{i + 1}</span>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Week {i + 1}</p>
                    <p className="text-[13px] font-bold text-navy-800">{p.title}</p>
                    <ul className="mt-1.5 space-y-0.5 text-[11.5px] text-slate-600">{p.items.map((it) => <li key={it}>• {it}</li>)}</ul>
                    <p className="mt-2 rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Goal: {p.goal}</p>
                  </div>
                ))}
              </div>}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel>
            <p className="mb-2 flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 text-violet-700"><BotIcon className="h-5 w-5" aria-hidden="true" /></span><span><span className="block text-[13px] font-bold text-navy-800">{isAi ? 'AI Coach' : 'Coach'}</span><span className="block text-[11px] text-slate-500">Your personal coach</span></span></p>
            {ai.status === 'loading' ? <p className="text-[12.5px] text-slate-400">…</p> :
              <p className="rounded-lg bg-violet-50 p-3 text-[12.5px] leading-relaxed text-violet-900">{firstName ? `Hi ${firstName}! ` : ''}{text.coach_message}</p>}
            <div className="mt-3 grid gap-2">
              <button type="button" onClick={() => navigate(-1)} className="rounded-md border border-slate-300 py-2 text-[12.5px] font-semibold text-navy-800 hover:bg-slate-50">Detailed Report</button>
              {state.practiceWords?.length > 0 &&
                <button type="button" onClick={() => navigate('/practice-words', { state: { words: state.practiceWords, mode: input.mode, examName: input.exam, passageFontFamily: state.passageFontFamily } })}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700"><DumbbellIcon className="h-4 w-4" aria-hidden="true" /> Practise Your Mistakes ({state.practiceWords.length})</button>}
            </div>
          </Panel>
          <Panel title="Quick Stats">
            <dl className="divide-y divide-slate-100 text-[12.5px]">
              {a.quick.map(([k, v]) => <div key={k} className="flex justify-between py-1.5"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-navy-800">{v}</dd></div>)}
            </dl>
          </Panel>
          {isAi && <p className="text-[11px] leading-relaxed text-slate-400">Written by AI from your result numbers only — your name and contact details are not shared.{Number.isFinite(ai.remaining) ? ` ${ai.remaining} more AI analyses available today.` : ''}</p>}
        </aside>
      </div>
    </div>
  );
}
