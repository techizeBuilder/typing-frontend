import { useEffect, useState } from 'react';
import { BrainIcon } from 'lucide-react';
import { aiAnalysisService, settingService } from '../../services/api';

const errorMessage = (err, fallback) => {
  const msg = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};

// Admin Settings: AI Deep Analysis switch, daily limit and usage.
export default function AiSettingsCard() {
  const [form, setForm] = useState(null);
  const [usage, setUsage] = useState(null);
  const [status, setStatus] = useState({ kind: '', text: '' });

  useEffect(() => {
    settingService.getAll()
      .then((s) => setForm({ enabled: s?.ai_analysis_enabled !== 'false', limit: s?.ai_daily_limit || '5' }))
      .catch(() => setForm({ enabled: true, limit: '5' }));
    aiAnalysisService.usage().then(setUsage).catch(() => {});
  }, []);
  if (!form) return null;

  const save = async () => {
    setStatus({ kind: '', text: '' });
    try {
      await settingService.update('ai_analysis_enabled', form.enabled ? 'true' : 'false');
      await settingService.update('ai_daily_limit', String(form.limit));
      setStatus({ kind: 'ok', text: 'AI analysis settings saved.' });
    } catch (err) { setStatus({ kind: 'error', text: errorMessage(err, 'Could not save.') }); }
  };

  return (
    <section className="nd mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="flex items-center gap-2 font-display text-[16px] font-bold text-navy-800"><BrainIcon className="h-5 w-5 text-violet-600" aria-hidden="true" /> AI Deep Analysis</h3>
      <p className="mt-1 text-[12.5px] text-slate-500">
        Students can open an AI-written analysis of any typing result. Only the result&apos;s numbers and mistaken words are sent to the AI — never names or contact details.
        Each result is analysed once and saved.
      </p>
      {usage && !usage.configured &&
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
          Not set up yet: add <code className="font-mono">ANTHROPIC_API_KEY</code> to the backend <code className="font-mono">.env</code> and restart the backend. Until then students see a rule-based analysis.
        </p>}
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-[13px] text-slate-700"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-4 w-4 accent-primary" /> AI analysis is on</label>
        <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">New AI analyses per student per day</span>
          <input type="number" min="1" max="100" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} className="w-[120px] rounded-md border border-slate-300 px-3 py-2 text-[12.5px] outline-none focus:border-primary" /></label>
        <button type="button" onClick={save} className="rounded-md bg-primary px-5 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700">Save AI Settings</button>
      </div>
      {status.text && <p role={status.kind === 'error' ? 'alert' : 'status'} className={`mt-2 text-[12.5px] ${status.kind === 'error' ? 'text-danger' : 'text-emerald-700'}`}>{status.text}</p>}
      {usage && <p className="mt-3 text-[12px] text-slate-500">Model: {usage.model} · {usage.total} analyses so far ({usage.this_month} this month) · {usage.input_tokens.toLocaleString('en-IN')} input / {usage.output_tokens.toLocaleString('en-IN')} output tokens.</p>}
    </section>
  );
}
