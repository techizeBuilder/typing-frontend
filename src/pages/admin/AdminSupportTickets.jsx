import { useEffect, useMemo, useState } from 'react';
import { HeadphonesIcon, InboxIcon, CircleDotIcon, ClockIcon, CheckCircle2Icon, SearchIcon, SendIcon, XIcon, RefreshCwIcon } from 'lucide-react';
import { supportService } from '../../services/api';
import { PageHeading } from '../../ui/PageHeading';
import { StatCard } from '../../ui/StatCard';
import { LoadingState } from '../../features/exams/ExamUI';
import { AttachmentPicker, TicketThread } from '../../features/support/SupportUI';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  statusTone,
  priorityTone,
  ticketNo,
  fmtDateTime,
  inputCls,
  inlineFieldCls,
  errorMessage,
} from '../../features/support/supportData';

function TicketPanel({ ticket, onChange, onClose }) {
  const [reply, setReply] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn) => {
    setError('');
    setBusy(true);
    try {
      onChange(await fn());
      return true;
    } catch (err) {
      setError(errorMessage(err, 'Could not update the ticket.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim() && files.length === 0) return;
    if (await run(() => supportService.reply(ticket.id, reply, files))) {
      setReply('');
      setFiles([]);
    }
  };

  const student = ticket.student;
  return (
    <section className="nd min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold text-slate-400">{ticketNo(ticket)} · {ticket.category} · {fmtDateTime(ticket.created_at)}</p>
          <h3 className="font-display text-[16px] font-bold text-navy-800">{ticket.subject}</h3>
          <p className="text-[12px] text-slate-500">
            {student ? `${student.name || '—'} · ${student.user_id || ''}${student.roll_no ? ` · Roll ${student.roll_no}` : ''}${student.phone ? ` · ${student.phone}` : ''}` : 'Student account not found'}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close ticket" className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-y border-slate-100 py-2.5">
        <label className="flex items-center gap-2 text-[12px] font-medium text-slate-600">
          Status
          <select value={ticket.status} disabled={busy} onChange={(e) => run(() => supportService.updateTicket(ticket.id, { status: e.target.value }))} className={inlineFieldCls}>
            {TICKET_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[12px] font-medium text-slate-600">
          Priority
          <select value={ticket.priority} disabled={busy} onChange={(e) => run(() => supportService.updateTicket(ticket.id, { priority: e.target.value }))} className={inlineFieldCls}>
            {TICKET_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <span className={`ml-auto rounded px-2 py-[2px] text-[10.5px] font-semibold ${statusTone[ticket.status] || ''}`}>{ticket.status}</span>
      </div>

      <div className="scroll-thin mt-3 max-h-[420px] overflow-y-auto rounded-lg bg-slate-50 p-3">
        <TicketThread replies={ticket.replies} viewer="staff" />
      </div>

      <div className="mt-3 space-y-2">
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Type your reply..." aria-label="Reply to student" className={`${inputCls} resize-y`} />
        <div className="flex flex-wrap items-start justify-between gap-2">
          <AttachmentPicker files={files} onChange={setFiles} />
          <button
            type="button"
            onClick={sendReply}
            disabled={busy || (!reply.trim() && files.length === 0)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
            <SendIcon className="h-3.5 w-3.5" aria-hidden="true" /> {busy ? 'Saving…' : 'Send Reply'}
          </button>
        </div>
        {ticket.status === 'Open' && <p className="text-[11px] text-slate-400">Replying moves an open ticket to In Progress.</p>}
        {error && <p role="alert" className="text-[12px] font-medium text-danger">{error}</p>}
      </div>
    </section>
  );
}

export default function AdminSupportTickets() {
  const [tickets, setTickets] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState('All');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = () => supportService.getAllTickets()
    .then((data) => { setTickets(Array.isArray(data) ? data : []); setLoadError(''); })
    .catch((err) => { setTickets([]); setLoadError(errorMessage(err, 'Could not load tickets.')); });
  useEffect(() => { load(); }, []);

  const replace = (ticket) => setTickets((prev) => (prev || []).map((t) => (t.id === ticket.id ? ticket : t)));

  const visible = useMemo(() => (tickets || []).filter((t) => {
    if (status !== 'All' && t.status !== status) return false;
    if (category !== 'All' && t.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [ticketNo(t), t.subject, t.student?.name, t.student?.user_id, t.student?.roll_no, t.student?.phone]
      .some((v) => String(v || '').toLowerCase().includes(q));
  }), [tickets, status, category, query]);

  const count = (s) => (tickets || []).filter((t) => t.status === s).length;
  const openTicket = (tickets || []).find((t) => t.id === openId);

  return (
    <div className="nd">
      <PageHeading
        icon={<HeadphonesIcon className="h-5 w-5" aria-hidden="true" />}
        title="Support Tickets"
        subtitle="Review student tickets, reply and update their status."
        actions={
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-navy-800 hover:bg-slate-50">
            <RefreshCwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
          </button>
        } />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<InboxIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Total Tickets" value={(tickets || []).length} />
        <StatCard icon={<CircleDotIcon className="h-5 w-5" />} iconBg="#DC3545" label="Open" value={count('Open')} />
        <StatCard icon={<ClockIcon className="h-5 w-5" />} iconBg="#F59E0B" label="In Progress" value={count('In Progress')} />
        <StatCard icon={<CheckCircle2Icon className="h-5 w-5" />} iconBg="#198754" label="Resolved" value={count('Resolved')} />
      </div>

      <div className={`grid gap-4 ${openTicket ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]' : ''}`}>
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 p-3.5">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inlineFieldCls} aria-label="Filter by status">
              <option value="All">All Status</option>
              {TICKET_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inlineFieldCls} aria-label="Filter by category">
              <option value="All">All Categories</option>
              {TICKET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="relative ml-auto">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ticket, student, roll no..."
                aria-label="Search tickets"
                className={`${inlineFieldCls} w-[240px] pl-8`} />
            </div>
          </div>
          {tickets === null ? <LoadingState>Loading tickets…</LoadingState> :
            loadError ? <p role="alert" className="p-6 text-center text-[12.5px] text-danger">{loadError}</p> :
              visible.length === 0 ? <p className="p-10 text-center text-[12.5px] text-slate-500">No tickets match.</p> :
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left">
                    <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-2.5">Ticket</th>
                        <th scope="col" className="px-4 py-2.5">Subject</th>
                        <th scope="col" className="px-4 py-2.5">Student</th>
                        <th scope="col" className="px-4 py-2.5">Priority</th>
                        <th scope="col" className="px-4 py-2.5">Status</th>
                        <th scope="col" className="px-4 py-2.5">Last Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[12.5px]">
                      {visible.map((t) => (
                        <tr
                          key={t.id}
                          onClick={() => setOpenId(t.id)}
                          className={`cursor-pointer transition-colors duration-150 ${openId === t.id ? 'bg-primary-50' : 'hover:bg-slate-50'}`}>
                          <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-slate-500">{ticketNo(t)}</td>
                          <td className="max-w-[260px] px-4 py-2.5">
                            <p className="truncate font-semibold text-navy-800">{t.subject}</p>
                            <p className="text-[11px] text-slate-400">{t.category} · {(t.replies || []).length} message{(t.replies || []).length === 1 ? '' : 's'}</p>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{t.student?.name || '—'}</td>
                          <td className={`px-4 py-2.5 font-semibold ${priorityTone[t.priority] || ''}`}>{t.priority}</td>
                          <td className="px-4 py-2.5"><span className={`rounded px-2 py-[2px] text-[10.5px] font-semibold ${statusTone[t.status] || ''}`}>{t.status}</span></td>
                          <td className="px-4 py-2.5 text-slate-500">{fmtDateTime(t.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          }
        </section>

        {openTicket && <TicketPanel key={openTicket.id} ticket={openTicket} onChange={replace} onClose={() => setOpenId(null)} />}
      </div>
    </div>
  );
}
