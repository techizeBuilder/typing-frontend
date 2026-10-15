import { useEffect, useState } from 'react';
import { HeadphonesIcon, SendIcon, CheckCircle2Icon, ChevronDownIcon, ChevronUpIcon, InboxIcon } from 'lucide-react';
import { supportService } from '../../services/api';
import { Breadcrumbs } from '../../ui/PageHeading';
import { LoadingState } from '../../features/exams/ExamUI';
import { AttachmentPicker, TicketThread } from '../../features/support/SupportUI';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  statusTone,
  ticketNo,
  fmtDateTime,
  inputCls,
  errorMessage,
} from '../../features/support/supportData';

export default function Support() {
  const [tickets, setTickets] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ subject: '', category: TICKET_CATEGORIES[0], priority: 'Medium', message: '' });
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [sentNo, setSentNo] = useState('');
  const [openId, setOpenId] = useState(null);
  const [reply, setReply] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState('');

  useEffect(() => {
    supportService.getMyTickets()
      .then((data) => setTickets(Array.isArray(data) ? data : []))
      .catch((err) => { setTickets([]); setLoadError(errorMessage(err, 'Could not load your tickets.')); });
  }, []);

  const upsert = (ticket) => setTickets((prev) => {
    const rest = (prev || []).filter((t) => t.id !== ticket.id);
    return [ticket, ...rest].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  });

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.subject.trim() || !form.message.trim()) {
      setFormError('Please add a subject and describe the problem.');
      return;
    }
    setSending(true);
    try {
      const ticket = await supportService.createTicket(form, files);
      upsert(ticket);
      setSentNo(ticketNo(ticket));
      setOpenId(ticket.id);
      setForm({ subject: '', category: TICKET_CATEGORIES[0], priority: 'Medium', message: '' });
      setFiles([]);
    } catch (err) {
      setFormError(errorMessage(err, 'Could not send your ticket. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (ticket) => {
    setReplyError('');
    if (!reply.trim() && replyFiles.length === 0) return;
    setReplying(true);
    try {
      upsert(await supportService.reply(ticket.id, reply, replyFiles));
      setReply('');
      setReplyFiles([]);
    } catch (err) {
      setReplyError(errorMessage(err, 'Could not send your reply.'));
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-4 flex flex-wrap items-start gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[24px] font-bold text-navy-800">
            <HeadphonesIcon className="h-6 w-6 text-primary" aria-hidden="true" /> Support
          </h2>
          <p className="text-[12.5px] text-slate-500">Raise a ticket and our team will reply here. Attach a screenshot or short video if it helps.</p>
        </div>
        <div className="ml-auto">
          <Breadcrumbs crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Support' }]} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="mb-3 font-display text-[15px] font-bold text-navy-800">Raise a Ticket</h3>
          {sentNo &&
            <p role="status" className="mb-3 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-emerald-700">
              <CheckCircle2Icon className="h-4 w-4" aria-hidden="true" /> Ticket {sentNo} sent. We&apos;ll reply here.
            </p>
          }
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[12px] font-semibold text-navy-800">Subject</span>
              <input
                value={form.subject}
                maxLength={200}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Briefly describe your issue"
                className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-navy-800">Category</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                {TICKET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-navy-800">Priority</span>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                {TICKET_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[12px] font-semibold text-navy-800">Message</span>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={5}
                placeholder="Describe the problem in detail (test name, what happened, when)"
                className={`${inputCls} resize-y`} />
            </label>
            <div className="sm:col-span-2">
              <AttachmentPicker files={files} onChange={setFiles} />
            </div>
            {formError && <p role="alert" className="text-[12px] font-medium text-danger sm:col-span-2">{formError}</p>}
            <button
              type="submit"
              disabled={sending || !navigator.onLine}
              className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-700 disabled:opacity-60 sm:col-span-2">
              <SendIcon className="h-4 w-4" aria-hidden="true" /> {sending ? 'Sending…' : 'Submit Ticket'}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="mb-3 font-display text-[15px] font-bold text-navy-800">My Tickets</h3>
          {tickets === null ? <LoadingState>Loading your tickets…</LoadingState> :
            loadError ? <p role="alert" className="py-6 text-center text-[12.5px] text-danger">{loadError}</p> :
              tickets.length === 0 ?
                <p className="flex flex-col items-center gap-2 py-10 text-center text-[12.5px] text-slate-500">
                  <InboxIcon className="h-8 w-8 text-slate-300" aria-hidden="true" /> No tickets yet. Raise one when you need help.
                </p> :
                <ul className="divide-y divide-slate-100">
                  {tickets.map((t) => {
                    const open = openId === t.id;
                    return (
                      <li key={t.id} className="py-3">
                        <button
                          type="button"
                          onClick={() => { setOpenId(open ? null : t.id); setReply(''); setReplyFiles([]); setReplyError(''); }}
                          aria-expanded={open}
                          className="flex w-full flex-wrap items-center gap-2 text-left">
                          <span className="text-[11.5px] font-semibold text-slate-400">{ticketNo(t)}</span>
                          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-navy-800">{t.subject}</span>
                          <span className={`rounded px-2 py-[2px] text-[10.5px] font-semibold ${statusTone[t.status] || ''}`}>{t.status}</span>
                          {open ? <ChevronUpIcon className="h-4 w-4 text-slate-400" /> : <ChevronDownIcon className="h-4 w-4 text-slate-400" />}
                        </button>
                        <p className="mt-0.5 text-[11px] text-slate-400">{t.category} · {fmtDateTime(t.created_at)}</p>
                        {open &&
                          <div className="mt-3 rounded-lg bg-slate-50 p-3">
                            <TicketThread replies={t.replies} viewer="student" />
                            {t.status === 'Resolved' ?
                              <p className="mt-3 text-center text-[12px] text-slate-500">This ticket is resolved. Raise a new ticket if you still need help.</p> :
                              <div className="mt-3 space-y-2">
                                <textarea
                                  value={reply}
                                  onChange={(e) => setReply(e.target.value)}
                                  rows={3}
                                  placeholder="Write a reply..."
                                  aria-label="Reply"
                                  className={`${inputCls} resize-y`} />
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <AttachmentPicker files={replyFiles} onChange={setReplyFiles} />
                                  <button
                                    type="button"
                                    onClick={() => sendReply(t)}
                                    disabled={replying || (!reply.trim() && replyFiles.length === 0)}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-navy-800 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-900 disabled:opacity-50">
                                    <SendIcon className="h-3.5 w-3.5" aria-hidden="true" /> {replying ? 'Sending…' : 'Send Reply'}
                                  </button>
                                </div>
                                {replyError && <p role="alert" className="text-[12px] font-medium text-danger">{replyError}</p>}
                              </div>
                            }
                          </div>
                        }
                      </li>
                    );
                  })}
                </ul>
          }
        </section>
      </div>
    </div>
  );
}
