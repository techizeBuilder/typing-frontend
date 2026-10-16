import { useEffect, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, MegaphoneIcon, MessageSquareIcon, SearchIcon, SendIcon, Trash2Icon, UsersIcon, XIcon } from 'lucide-react';
import api from '../../services/api';
import Pagination from '../../components/Pagination';
import { PageHeading } from '../../ui/PageHeading';
import { StatCard } from '../../ui/StatCard';

const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none focus:border-primary';
const fmt = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Message Center: broadcast announcements shown to students on their home page.
const AdminMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchMessages = () => api.get('/messages')
    .then((res) => {
      // Newest broadcasts first
      const list = Array.isArray(res.data) ? res.data : [];
      setMessages([...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    })
    .catch((error) => console.error('Error fetching messages:', error))
    .finally(() => setLoading(false));
  useEffect(() => { fetchMessages(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/messages', formData);
      setFormData({ title: '', content: '' });
      setNotice('Broadcast sent. Students see it on their home page.');
      fetchMessages();
    } catch {
      alert('Error sending message!');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (msg) => {
    if (!window.confirm(`Delete the message "${msg.title}"?`)) return;
    try {
      await api.delete(`/messages/${msg.id}`);
      fetchMessages();
    } catch {
      alert('Error deleting message');
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = messages.filter((m) => !q || `${m.title} ${m.content}`.toLowerCase().includes(q));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  return (
    <div className="nd">
      <PageHeading icon={<MessageSquareIcon className="h-5 w-5" aria-hidden="true" />} title="Message Center"
        subtitle="Broadcast announcements to all students. They appear under “Latest Announcements” on the student home page." />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<MegaphoneIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Total Broadcasts" value={messages.length} />
        <StatCard icon={<SendIcon className="h-5 w-5" />} iconBg="#198754" label="Sent This Month" value={messages.filter((m) => new Date(m.created_at) >= monthStart).length} />
        <StatCard icon={<UsersIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Audience" value="All Students" sub="Every broadcast goes to all students" />
      </div>

      {notice && <p role="status" className="mb-4 flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="ml-auto"><XIcon className="h-4 w-4" /></button></p>}

      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <section className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-bold text-navy-800"><SendIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Compose New Broadcast</h3>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Message Title <span className="text-danger">*</span></span>
              <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Server Maintenance or Exam Result Update" className={inputCls} /></label>
            <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-navy-800">Message Content <span className="text-danger">*</span></span>
              <textarea required rows={6} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="Enter detailed instructions for students here..." className={inputCls} />
              <span className="mt-1 block text-right text-[11px] text-slate-400">{formData.content.length} characters</span></label>
            {(formData.title || formData.content) &&
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-amber-700">Preview — as students see it</p>
                <p className="text-[12.5px] font-semibold text-navy-800">{formData.title || 'Title'}</p>
                <p className="whitespace-pre-line text-[12px] text-slate-700">{formData.content}</p>
              </div>}
            <button type="submit" disabled={sending} className="flex items-center gap-1.5 rounded-md bg-[#f97316] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#ea580c] disabled:opacity-60"><SendIcon className="h-4 w-4" aria-hidden="true" /> {sending ? 'Sending…' : 'Send Broadcast Message'}</button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3.5">
            <h3 className="text-[13.5px] font-bold text-navy-800">Past Broadcasts</h3>
            <span className="relative ml-auto block w-full sm:w-[240px]">
              <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search messages..." aria-label="Search messages" className={`${inputCls} py-1.5 pr-8`} />
            </span>
          </div>
          {loading ? <p className="p-8 text-center text-[12.5px] text-slate-500">Loading...</p>
            : filtered.length === 0 ? <p className="p-8 text-center text-[12.5px] text-slate-500">{messages.length ? 'No messages match the search.' : 'No messages sent yet.'}</p>
              : (
                <ul className="divide-y divide-slate-100">
                  {paged.map((msg) => {
                    const long = msg.content.length > 140;
                    const expanded = open === msg.id;
                    return (
                      <li key={msg.id} className="flex gap-3 p-4">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary"><MegaphoneIcon className="h-4 w-4" aria-hidden="true" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-bold text-navy-800">{msg.title}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">{msg.target_audience || 'All'}</span>
                          </p>
                          <p className="mt-0.5 whitespace-pre-line text-[12px] text-slate-700">{long && !expanded ? `${msg.content.slice(0, 140)}…` : msg.content}</p>
                          <p className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                            {fmt(msg.created_at)}
                            {long && <button type="button" onClick={() => setOpen(expanded ? null : msg.id)} className="inline-flex items-center gap-0.5 font-semibold text-primary">{expanded ? <>Show less <ChevronUpIcon className="h-3 w-3" /></> : <>Read more <ChevronDownIcon className="h-3 w-3" /></>}</button>}
                          </p>
                        </div>
                        <button type="button" onClick={() => handleDelete(msg)} title="Delete" aria-label={`Delete ${msg.title}`} className="h-fit rounded-md border border-rose-200 p-1.5 text-danger hover:bg-rose-50"><Trash2Icon className="h-3.5 w-3.5" /></button>
                      </li>
                    );
                  })}
                </ul>
              )}
          {filtered.length > 0 &&
            <div className="border-t border-slate-100 px-3.5 pb-1 pt-3">
              <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(p) => { setPageSize(p); setPage(1); }} />
            </div>}
        </section>
      </div>
    </div>
  );
};

export default AdminMessages;
