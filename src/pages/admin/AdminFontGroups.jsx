import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  FileTextIcon,
  InfoIcon,
  ListIcon,
  PauseCircleIcon,
  PencilIcon,
  RotateCcwIcon,
  SearchIcon,
  TypeIcon,
  XIcon,
} from 'lucide-react';
import { fontGroupService } from '../../services/api';
import { PageHeading } from '../../ui/PageHeading';
import { StatCard } from '../../ui/StatCard';
import { LoadingState } from '../../features/exams/ExamUI';
import { BUILT_IN_FONT_GROUPS, fontGroupInfo, refreshFontGroups } from '../../features/fontGroups/fontGroups';

const fieldCls = 'rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[12px] text-slate-600 outline-none focus:border-primary';
const codeTone = { English: 'bg-primary-50 text-primary-700', Hindi: 'bg-emerald-50 text-emerald-700' };

const errorMessage = (err, fallback) => {
  const msg = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Built-in');

function Toggle({ on, onChange, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 disabled:opacity-50 ${on ? 'bg-success' : 'bg-slate-300'}`}>
      <span className={`absolute left-0 top-[2px] h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${on ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
    </button>
  );
}

function EditModal({ group, onClose, onSaved }) {
  const info = fontGroupInfo(group.value);
  const [description, setDescription] = useState(group.description || '');
  const [preview, setPreview] = useState(group.preview_text || '');
  const [active, setActive] = useState(group.is_active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const input = 'w-full rounded-md border border-slate-300 px-3 py-2 text-[12.5px] outline-none focus:border-primary';

  const save = async () => {
    setSaving(true); setError('');
    try {
      await fontGroupService.update(group.value, { description, preview_text: preview, is_active: active });
      await onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the font group.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/50 p-4" role="dialog" aria-modal="true" aria-label={`Edit ${group.value}`} onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-[18px] font-bold text-navy-800">{group.value}</h3>
            <p className="text-[12px] text-slate-500">{info.code} · {info.language} · {info.kind}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <XIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <dl className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-[12px]">
          <div><dt className="text-slate-500">Font Type</dt><dd className="font-medium text-navy-800">{info.fontType}</dd></div>
          <div><dt className="text-slate-500">Keyboard</dt><dd className="font-medium text-navy-800">{info.keyboard}</dd></div>
          <div className="col-span-2 text-[11px] text-slate-500">Font, keyboard and checking rules are built into the typing engine and can&apos;t be changed here.</div>
        </dl>
        <label className="mb-3 block">
          <span className="mb-1 block text-[12px] font-semibold text-navy-800">Description</span>
          <textarea rows={3} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Shown to admins; describe who this group is for" className={`${input} resize-none`} />
        </label>
        <label className="mb-1 block">
          <span className="mb-1 block text-[12px] font-semibold text-navy-800">Preview Text</span>
          <input maxLength={200} value={preview} onChange={(e) => setPreview(e.target.value)} placeholder={info.sample} className={input} style={info.fontFamily ? { fontFamily: info.fontFamily } : undefined} />
        </label>
        <p className="mb-3 rounded-md border border-slate-200 p-3 text-[15px] text-navy-800" style={info.fontFamily ? { fontFamily: info.fontFamily } : undefined}>{preview || info.sample}</p>
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
          <Toggle on={active} onChange={setActive} label="Active" />
          <span className="text-[12.5px] text-slate-600">
            <span className="font-semibold text-navy-800">{active ? 'Active' : 'Inactive'}</span> — {active
              ? 'offered to students and can be assigned to exams and tests.'
              : 'hidden from students and from the exam / test forms. Existing tests and results are kept.'}
          </span>
        </div>
        {error && <p role="alert" className="mt-3 text-[12.5px] text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-primary px-5 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save Font Group'}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminFontGroups() {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [language, setLanguage] = useState('');
  const [kind, setKind] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => fontGroupService.adminList()
    .then((d) => { setGroups(d); setError(''); refreshFontGroups(); })
    .catch((err) => { setGroups([]); setError(errorMessage(err, 'Could not load font groups.')); });
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => (groups || []).map((g, i) => ({ ...g, ...fontGroupInfo(g.value), no: i + 1 })).filter((g) => {
    if (status && (status === 'Active') !== g.is_active) return false;
    if (language && g.language !== language) return false;
    if (kind && g.kind !== kind) return false;
    const q = query.trim().toLowerCase();
    return !q || [g.value, g.code, g.description, g.fontType, g.keyboard].some((v) => String(v || '').toLowerCase().includes(q));
  }), [groups, status, language, kind, query]);

  const toggle = async (g, on) => {
    setBusy(g.value); setError('');
    try { await fontGroupService.update(g.value, { is_active: on }); await load(); } catch (err) { setError(errorMessage(err, 'Could not update the font group.')); } finally { setBusy(null); }
  };

  const exportCsv = () => {
    const head = ['S.No.', 'Font Group', 'Code', 'Language', 'Kind', 'Font Type', 'Keyboard', 'Assigned Tests', 'Live Tests', 'Exams', 'Status', 'Description'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...rows.map((g) => [g.no, g.value, g.code, g.language, g.kind, g.fontType, g.keyboard, g.tests, g.live_tests, g.exams, g.is_active ? 'Active' : 'Inactive', g.description || ''])]
      .map((r) => r.map(esc).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'font-groups.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const all = groups || [];
  const activeCount = all.filter((g) => g.is_active).length;

  return (
    <div className="nd">
      <PageHeading
        icon={<TypeIcon className="h-5 w-5" aria-hidden="true" />}
        title="Font Groups"
        subtitle="The font groups built into the typing engine. Describe them and choose which ones students are offered." />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<TypeIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Total Font Groups" value={BUILT_IN_FONT_GROUPS.length} />
        <StatCard icon={<CheckCircle2Icon className="h-5 w-5" />} iconBg="#198754" label="Active Font Groups" value={groups ? activeCount : '—'} />
        <StatCard icon={<PauseCircleIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Inactive Font Groups" value={groups ? all.length - activeCount : '—'} />
        <StatCard icon={<ListIcon className="h-5 w-5" />} iconBg="#6F42C1" label="Assigned to Tests" value={groups ? all.filter((g) => g.tests > 0).length : '—'} />
      </div>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white shadow-card print:shadow-none">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 p-3.5 print:hidden">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldCls} aria-label="Filter by status">
            <option value="">-- Status --</option><option>Active</option><option>Inactive</option>
          </select>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className={fieldCls} aria-label="Filter by language">
            <option value="">-- Language --</option><option>English</option><option>Hindi</option>
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={fieldCls} aria-label="Filter by kind">
            <option value="">-- Typing / Steno --</option><option>Typing</option><option>Steno</option>
          </select>
          <div className="relative ml-auto">
            <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, code, description..." aria-label="Search font groups" className={`${fieldCls} w-[260px] pr-8`} />
          </div>
          <button type="button" onClick={() => { setStatus(''); setLanguage(''); setKind(''); setQuery(''); }}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50">
            <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Reset Filters
          </button>
        </div>
        {error && <p role="alert" className="border-b border-slate-100 px-4 py-2.5 text-[12.5px] text-danger">{error}</p>}
        {groups === null ? <LoadingState>Loading font groups…</LoadingState> :
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-600">
                <tr>
                  {['S.No.', 'Font Group Name', 'Code / Language', 'Font Type / Keyboard', 'Preview', 'Assigned Tests', 'Exams', 'Status', 'Actions'].map((h) => (
                    <th key={h} scope="col" className={`px-3 py-2.5 ${h === 'Assigned Tests' || h === 'Exams' ? 'text-center' : ''} ${h === 'Actions' ? 'print:hidden' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11.5px]">
                {rows.length === 0 &&
                  <tr><td colSpan={9} className="p-8 text-center text-slate-500">No font groups match your filters.</td></tr>
                }
                {rows.map((g) => (
                  <tr key={g.value} className="transition-colors duration-150 hover:bg-slate-50/70">
                    <td className="px-3 py-2.5 text-slate-600">{g.no}</td>
                    <td className="px-3 py-2.5">
                      <span className="block whitespace-nowrap font-semibold text-primary">{g.value}</span>
                      {g.description && <span className="block max-w-[220px] text-[10.5px] text-slate-500">{g.description}</span>}
                    </td>
                    <td className="px-3 py-2.5"><span className={`whitespace-nowrap rounded px-2 py-[2px] text-[10.5px] font-semibold ${codeTone[g.language]}`}>{g.code}</span><span className="mt-1 block whitespace-nowrap text-[10.5px] text-slate-500">{g.language} · {g.kind}</span></td>
                    <td className="min-w-[150px] px-3 py-2.5 text-slate-600"><span className="block">{g.fontType}</span><span className="block text-[10.5px] text-slate-400">{g.keyboard}</span></td>
                    <td className="max-w-[190px] truncate px-3 py-2.5 text-[13px] text-slate-700" style={g.fontFamily ? { fontFamily: g.fontFamily } : undefined} title={g.preview_text || g.sample}>{g.preview_text || g.sample}</td>
                    <td className="px-3 py-2.5 text-center font-medium text-primary">{g.tests}{g.live_tests ? <span className="block text-[10px] font-normal text-slate-400">{g.live_tests} live</span> : null}</td>
                    <td className="px-3 py-2.5 text-center text-slate-600">{g.exams}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="print:hidden"><Toggle on={g.is_active} disabled={busy === g.value} onChange={(on) => toggle(g, on)} label={`${g.value} active`} /></span>
                        <span className={`rounded px-2 py-[2px] text-[10.5px] font-medium ${g.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{g.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                      <span className="mt-1 block whitespace-nowrap text-[10px] text-slate-400">{g.updated_at ? `Updated ${fmtDate(g.updated_at)}` : 'Built-in'}</span>
                    </td>
                    <td className="px-3 py-2.5 print:hidden">
                      <button type="button" onClick={() => setEditing(g)} aria-label={`Edit ${g.value}`} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-slate-600 hover:border-primary hover:text-primary">
                        <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 p-3.5 text-[12px] text-slate-600 print:hidden">
          <span>Showing {rows.length} of {BUILT_IN_FONT_GROUPS.length} font groups</span>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={exportCsv} className="flex items-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1.5 text-[12px] font-medium text-emerald-700 hover:bg-emerald-50">
              <FileSpreadsheetIcon className="h-3.5 w-3.5" aria-hidden="true" /> Export Excel
            </button>
            <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 rounded-md border border-rose-300 px-3 py-1.5 text-[12px] font-medium text-rose-600 hover:bg-rose-50">
              <FileTextIcon className="h-3.5 w-3.5" aria-hidden="true" /> Export PDF
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_300px] print:hidden">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <h3 className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-navy-800">
            <InfoIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> About Font Groups
          </h3>
          <p className="text-[11.5px] leading-relaxed text-slate-500">
            Every test belongs to one of these font groups. Each one has its own font, keyboard handling and mistake
            checking built into the typing engine, so groups can&apos;t be added or deleted here. Use the Exam and Test
            forms to assign them, and switch a group off if your institute doesn&apos;t offer it.
          </p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <h3 className="mb-2 text-[12.5px] font-semibold text-navy-800">Font Group Status</h3>
          <ul className="space-y-2 text-[11px]">
            <li className="flex items-start gap-2"><span className="rounded bg-emerald-50 px-2 py-[2px] text-[10.5px] font-medium text-emerald-700">Active</span><span className="text-slate-500">Offered to students; can be assigned to exams and tests.</span></li>
            <li className="flex items-start gap-2"><span className="rounded bg-rose-50 px-2 py-[2px] text-[10.5px] font-medium text-rose-700">Inactive</span><span className="text-slate-500">Hidden from students and the exam / test forms. Existing tests and results are kept.</span></li>
          </ul>
        </section>
      </div>

      {editing && <EditModal group={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}
