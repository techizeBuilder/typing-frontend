import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangleIcon, CalendarClockIcon, CheckIcon, ClipboardCopyIcon, DatabaseIcon, DownloadIcon, HardDriveIcon, HistoryIcon, Loader2Icon, PlayIcon, ShieldAlertIcon, TerminalIcon, Trash2Icon,
} from 'lucide-react';
import { backupService, settingService } from '../../services/api';
import { PageHeading } from '../../ui/PageHeading';
import { StatCard } from '../../ui/StatCard';
import { LoadingState } from '../../features/exams/ExamUI';

const KIND = {
  manual: ['Manual', 'bg-primary-50 text-primary-700'],
  scheduled: ['Automatic', 'bg-emerald-50 text-emerald-700'],
  'pre-restore': ['Before restore', 'bg-amber-50 text-amber-700'],
};
const fmtSize = (b) => (b >= 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const errorMessage = (err, fallback) => {
  const msg = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};
const inputCls = 'rounded-md border border-slate-300 px-3 py-2 text-[12.5px] outline-none focus:border-primary';

function ScheduleCard({ schedule, onSaved }) {
  const [form, setForm] = useState(schedule);
  const [msg, setMsg] = useState({ kind: '', text: '' });
  const save = async () => {
    setMsg({ kind: '', text: '' });
    try {
      await settingService.update('backup_schedule_enabled', form.enabled ? 'true' : 'false');
      await settingService.update('backup_time', form.time);
      await settingService.update('backup_keep', String(form.keep));
      setMsg({ kind: 'ok', text: 'Schedule saved.' });
      onSaved();
    } catch (err) { setMsg({ kind: 'error', text: errorMessage(err, 'Could not save the schedule.') }); }
  };
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="mb-1 flex items-center gap-2 text-[13.5px] font-bold text-navy-800"><CalendarClockIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Automatic Backups</h3>
      <p className="mb-3 text-[12px] text-slate-500">One backup every day at the chosen server time. Older automatic backups are removed; manual ones stay until you delete them.</p>
      <label className="mb-3 flex items-center gap-2 text-[12.5px] text-slate-700"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-4 w-4 accent-primary" /> Back up automatically every day</label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Time (server)</span><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Keep last</span><input type="number" min="1" max="90" value={form.keep} onChange={(e) => setForm({ ...form, keep: e.target.value })} className={`${inputCls} w-[90px]`} /></label>
        <button type="button" onClick={save} className="rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700">Save Schedule</button>
      </div>
      {msg.text && <p role={msg.kind === 'error' ? 'alert' : 'status'} className={`mt-2 text-[12px] ${msg.kind === 'error' ? 'text-danger' : 'text-emerald-700'}`}>{msg.text}</p>}
    </section>
  );
}

export default function AdminBackup() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [progress, setProgress] = useState({});
  const [copied, setCopied] = useState(null);

  const load = useCallback(() => backupService.status()
    .then((d) => { setData(d); setError(''); })
    .catch((err) => { setData((d) => d || { backups: [], schedule: { enabled: true, time: '02:00', keep: 7 } }); setError(errorMessage(err, 'Could not load backups.')); }), []);
  useEffect(() => { load(); }, [load]);

  // Poll while a backup is running.
  const running = data?.running;
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [running, load]);

  const start = async () => {
    setError(''); setNotice('');
    try { await backupService.create(); setNotice('Backup started. It keeps running if you leave this page.'); await load(); } catch (err) { setError(errorMessage(err, 'Could not start a backup.')); }
  };
  const download = async (b) => {
    setProgress((p) => ({ ...p, [b.name]: 0 }));
    try {
      const blob = await backupService.download(b.name, (pct) => setProgress((p) => ({ ...p, [b.name]: pct })));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = b.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (err) { setError(errorMessage(err, 'Download failed.')); } finally { setProgress((p) => { const n = { ...p }; delete n[b.name]; return n; }); }
  };
  const remove = async (b) => {
    if (!window.confirm(`Delete ${b.name}? This backup cannot be recovered.`)) return;
    try { await backupService.remove(b.name); await load(); } catch (err) { setError(errorMessage(err, 'Could not delete.')); }
  };
  const command = (b) => `npm run backup:restore -- ${b.name} --confirm <DB_DATABASE>`;
  const copy = (b) => { navigator.clipboard?.writeText(command(b)).catch(() => {}); setCopied(b.name); setTimeout(() => setCopied(null), 1500); };

  if (!data) return <div className="nd"><LoadingState>Loading backups…</LoadingState></div>;
  const list = data.backups || [];
  const totalSize = list.reduce((n, b) => n + b.size_bytes, 0);
  const rows = (b) => Object.values(b.tables || {}).reduce((n, x) => n + Number(x), 0);

  return (
    <div className="nd">
      <PageHeading icon={<DatabaseIcon className="h-5 w-5" aria-hidden="true" />} title="Backup & Restore"
        subtitle="Back up the whole database and every uploaded file. Download copies to keep them safe off the server."
        actions={
          <button type="button" onClick={start} disabled={!!running} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            {running ? <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlayIcon className="h-4 w-4" aria-hidden="true" />} {running ? 'Backing up…' : 'Back Up Now'}
          </button>
        } />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<HistoryIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Backups" value={list.length} />
        <StatCard icon={<CheckIcon className="h-5 w-5" />} iconBg="#198754" label="Latest Backup" value={list[0] ? fmtDate(list[0].created_at) : 'None yet'} />
        <StatCard icon={<HardDriveIcon className="h-5 w-5" />} iconBg="#6F42C1" label="Space Used" value={fmtSize(totalSize)} />
        <StatCard icon={<CalendarClockIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Next Automatic" value={data.schedule?.next_run ? fmtDate(data.schedule.next_run) : 'Off'} />
      </div>

      {running && <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-[12.5px] text-primary-700"><Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> {running.kind === 'scheduled' ? 'Automatic' : 'Manual'} backup in progress since {fmtDate(running.started_at)}…</p>}
      {notice && !running && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">{notice}</p>}
      {(error || data.last_error) && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger">{error || `Last backup failed: ${data.last_error}`}</p>}

      <section className="mb-4 rounded-xl border border-slate-200 bg-white shadow-card">
        <h3 className="border-b border-slate-100 px-4 py-3 text-[13.5px] font-bold text-navy-800">Backups</h3>
        {list.length === 0 ? <p className="p-8 text-center text-[12.5px] text-slate-500">No backups yet. Click <b>Back Up Now</b> to create the first one.</p> :
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[12px]">
              <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-600">
                <tr>{['Backup', 'Type', 'Created', 'Size', 'Contents', 'Actions'].map((h) => <th key={h} scope="col" className="px-3 py-2.5">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((b) => (
                  <tr key={b.name} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5 font-mono text-[11.5px] text-navy-800">{b.name}</td>
                    <td className="px-3 py-2.5"><span className={`rounded px-2 py-[2px] text-[10.5px] font-semibold ${KIND[b.kind]?.[1]}`}>{KIND[b.kind]?.[0] || b.kind}</span></td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{fmtDate(b.created_at)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{fmtSize(b.size_bytes)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{Object.keys(b.tables || {}).length} tables · {rows(b).toLocaleString('en-IN')} rows · {b.files} files</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => download(b)} disabled={b.name in progress} className="inline-flex items-center gap-1 rounded-md bg-success px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[#146c43] disabled:opacity-60">
                          <DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" /> {b.name in progress ? `${progress[b.name]}%` : 'Download'}
                        </button>
                        <button type="button" onClick={() => copy(b)} title="Copy the restore command" className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[11.5px] text-slate-600 hover:bg-slate-50">
                          {copied === b.name ? <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> : <ClipboardCopyIcon className="h-3.5 w-3.5" aria-hidden="true" />} {copied === b.name ? 'Copied' : 'Restore command'}
                        </button>
                        <button type="button" onClick={() => remove(b)} aria-label={`Delete ${b.name}`} className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-danger hover:bg-rose-100"><Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ScheduleCard schedule={{ enabled: data.schedule.enabled, time: data.schedule.time, keep: data.schedule.keep }} onSaved={load} />
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <h3 className="mb-1 flex items-center gap-2 text-[13.5px] font-bold text-navy-800"><TerminalIcon className="h-4 w-4 text-primary" aria-hidden="true" /> How to Restore</h3>
          <p className="mb-2 text-[12px] text-slate-500">Restoring replaces <b>all</b> current data, so it is done on the server, not from this page.</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-[12px] text-slate-700">
            <li>Put the backup file in <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">backend/private/backups</code> (backups made here are already there).</li>
            <li>Stop the backend so nobody changes data during the restore.</li>
            <li>In the <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">backend</code> folder run (use <b>Restore command</b> above to copy it):<br />
              <code className="mt-1 block rounded bg-navy-900 px-2 py-1.5 font-mono text-[11px] text-emerald-300">npm run backup:restore -- backup-….zip --confirm &lt;DB_DATABASE&gt;</code></li>
            <li>Start the backend again. Everyone has to sign in again.</li>
          </ol>
          <p className="mt-2 text-[11.5px] text-slate-500">A safety backup of the current data is taken automatically before restoring, and the database part runs as one transaction, so a failed restore changes nothing. Running the command without <code className="font-mono">--confirm</code> only shows what the backup contains.</p>
        </section>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
        <ShieldAlertIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Backups contain every account (including password hashes), results and uploaded files. Only admins can download them — store downloaded copies securely.
        Backups saved here are on the same server as the app, so download one regularly to keep a copy elsewhere.
      </p>
      {data.folder && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400"><AlertTriangleIcon className="h-3 w-3" aria-hidden="true" /> Server folder: {data.folder}</p>}
    </div>
  );
}
