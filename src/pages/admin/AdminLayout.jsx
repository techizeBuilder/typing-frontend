import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BellIcon, ChevronDownIcon, CornerDownLeftIcon, LogOutIcon, MenuIcon, MessageSquareIcon, RepeatIcon, SearchIcon, SettingsIcon, UserIcon, ZapIcon,
} from 'lucide-react';
import { AdminSidebar } from '../../layouts/AdminSidebar';
import { adminNav, getSessionUser, isItemActive } from '../../layouts/navigation';
import NotFoundPage from '../../components/NotFoundPage';
import { adminSummaryService, authService } from '../../services/api';
import './Admin.css';
import './admin-theme.css';

const ROLE_LABELS = { SuperAdmin: 'Super Admin', Admin: 'Admin', 'Sub-Admin': 'Sub Admin' };

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AD';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

// Close a dropdown when clicking anywhere outside it.
function useOutsideClose(ref, open, close) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [ref, open, close]);
}

// Counts for the notification bell; refreshed every minute.
function useAdminSummary() {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const load = () => adminSummaryService.get().then((s) => { if (!cancelled) setSummary(s); }).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);
  return summary;
}

// Header search: jump to any admin page, or search students / tests / results.
function GlobalSearch({ can, isAdmin }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef(null);
  const input = useRef(null);
  useOutsideClose(box, open, () => setOpen(false));

  useEffect(() => {
    const onKey = (e) => { if (e.ctrlKey && e.key === '/') { e.preventDefault(); input.current?.focus(); setOpen(true); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const options = useMemo(() => {
    const term = q.trim().toLowerCase();
    const user = getSessionUser();
    const pages = adminNav.filter((i) => !i.visible || i.visible(user))
      .flatMap((i) => [{ label: i.label, to: i.to }, ...(i.children || []).filter((c) => c.to !== i.to).map((c) => ({ label: `${i.label} › ${c.label}`, to: c.to }))]);
    const list = term ? pages.filter((p) => p.label.toLowerCase().includes(term)).slice(0, 6).map((p) => ({ ...p, kind: 'Page' })) : [];
    if (term) {
      const enc = encodeURIComponent(q.trim());
      if (can('students')) list.push({ kind: 'Search', label: `Students matching “${q.trim()}”`, to: `/admin/students?search=${enc}` });
      if (can('chapters')) list.push({ kind: 'Search', label: `Tests matching “${q.trim()}”`, to: `/admin/content?search=${enc}` });
      if (isAdmin) list.push({ kind: 'Search', label: `Results for “${q.trim()}”`, to: `/admin/results?search=${enc}` });
    }
    return list;
  }, [q, can, isAdmin]);

  const go = (opt) => { if (!opt) return; navigate(opt.to); setOpen(false); setQ(''); input.current?.blur(); };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(options[hi]); }
    else if (e.key === 'Escape') { setOpen(false); input.current?.blur(); }
  };

  return (
    <div ref={box} className="relative order-3 w-full sm:order-none sm:w-[420px] sm:max-w-full">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        ref={input}
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setHi(0); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search pages, students, tests, results..."
        aria-label="Search the admin panel"
        role="combobox"
        aria-expanded={open && options.length > 0}
        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-16 text-[12.5px] outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-primary" />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] text-slate-400">Ctrl + /</span>
      {open && options.length > 0 &&
        <ul role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((o, i) => (
            <li key={o.to + o.label} role="option" aria-selected={i === hi}>
              <button
                type="button"
                onMouseEnter={() => setHi(i)}
                onClick={() => go(o)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] ${i === hi ? 'bg-primary-50 text-primary-700' : 'text-navy-800'}`}>
                <span className={`rounded px-1.5 py-[1px] text-[10px] font-semibold ${o.kind === 'Page' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{o.kind}</span>
                <span className="truncate">{o.label}</span>
                {i === hi && <CornerDownLeftIcon className="ml-auto h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      }
    </div>
  );
}

// Bell: things waiting for an admin (only the sections this user may manage).
function Notifications({ summary, can }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useOutsideClose(box, open, () => setOpen(false));
  const items = summary ? [
    can('support') && { n: summary.open_tickets, label: 'Open support tickets', to: '/admin/support' },
    can('plans') && { n: summary.purchase_requests, label: 'Plan purchase requests', to: '/admin/subscription' },
    can('reviews') && { n: summary.pending_reviews, label: 'Reviews waiting for approval', to: '/admin/reviews' },
    can('students') && { n: summary.pending_students, label: 'Pending student requests', to: '/admin/students?status=Pending' },
  ].filter(Boolean) : [];
  const total = items.reduce((t, i) => t + (i.n || 0), 0);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={total ? `Notifications, ${total} waiting` : 'Notifications'}
        aria-expanded={open}
        className="relative rounded-full p-1.5 text-navy-800 transition-colors duration-150 hover:bg-slate-100">
        <BellIcon className="h-5 w-5" />
        {total > 0 &&
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
            {total > 99 ? '99+' : total}
          </span>
        }
      </button>
      {open &&
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <p className="border-b border-slate-100 px-3 py-2 text-[12px] font-semibold text-navy-800">Needs your attention</p>
          {items.length === 0 || total === 0
            ? <p className="px-3 py-4 text-center text-[12px] text-slate-500">All caught up.</p>
            : items.filter((i) => i.n > 0).map((i) => (
              <Link key={i.to} to={i.to} onClick={() => setOpen(false)} className="flex items-center justify-between px-3 py-2 text-[12.5px] text-navy-800 hover:bg-slate-50">
                {i.label}
                <span className="rounded-full bg-danger px-2 py-[1px] text-[10.5px] font-bold text-white">{i.n}</span>
              </Link>
            ))}
        </div>
      }
    </div>
  );
}

function ProfileMenu({ name, role, isAdmin }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useOutsideClose(box, open, () => setOpen(false));
  const logout = () => { authService.logout(); navigate('/login'); };
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-navy-800 hover:bg-slate-50';
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-slate-100">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
          {initials(name)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[160px] truncate text-[12.5px] font-semibold text-navy-800">{name || 'Admin'}</span>
          <span className="block text-[10.5px] text-slate-500">{ROLE_LABELS[role] || role}</span>
        </span>
        <ChevronDownIcon className="hidden h-4 w-4 text-slate-500 sm:block" aria-hidden="true" />
      </button>
      {open &&
        <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <Link role="menuitem" to="/profile" onClick={() => setOpen(false)} className={item}><UserIcon className="h-4 w-4 text-slate-500" /> My Account</Link>
          {isAdmin && <Link role="menuitem" to="/admin/settings" onClick={() => setOpen(false)} className={item}><SettingsIcon className="h-4 w-4 text-slate-500" /> Settings</Link>}
          <Link role="menuitem" to="/dashboard" onClick={() => setOpen(false)} className={item}><RepeatIcon className="h-4 w-4 text-slate-500" /> Switch to Student View</Link>
          <button role="menuitem" type="button" onClick={logout} className={`${item} text-danger`}><LogOutIcon className="h-4 w-4" /> Secure logout</button>
        </div>
      }
    </div>
  );
}

const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname, search } = useLocation();
  const { role, permissions, name } = getSessionUser();
  // Typed address of a section this account can't open: same rule as the sidebar.
  const section = adminNav.find((item) => isItemActive(item, pathname, search));
  const blocked = !!section?.visible && !section.visible({ role, permissions });
  const isAdmin = role === 'Admin' || role === 'SuperAdmin';
  const permKey = permissions.join(',');
  const can = useMemo(() => {
    const perms = permKey ? permKey.split(',') : [];
    return (perm) => isAdmin || perms.includes(perm);
  }, [isAdmin, permKey]);
  const summary = useAdminSummary();

  return (
    <div className="flex h-screen w-full bg-canvas">
      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="nd flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-3 py-2.5 sm:gap-4 sm:px-5">
          <button
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen(true)}
            className="rounded p-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-100 lg:hidden">
            <MenuIcon className="h-5 w-5" />
          </button>

          <GlobalSearch can={can} isAdmin={isAdmin} />

          <div className="ml-auto flex items-center gap-3">
            <Notifications summary={summary} can={can} />
            {can('messages') &&
              <Link
                to="/admin/messages"
                className="hidden items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-[12px] font-medium text-navy-800 transition-colors duration-150 hover:bg-slate-50 lg:flex">
                <MessageSquareIcon className="h-3.5 w-3.5 text-primary" /> Message Center
              </Link>
            }
            {can('flash_banner') &&
              <Link
                to="/admin/flash-banner"
                className="hidden items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-[12px] font-medium text-navy-800 transition-colors duration-150 hover:bg-slate-50 lg:flex">
                <ZapIcon className="h-3.5 w-3.5 text-danger" /> Flash Banner
              </Link>
            }
            <ProfileMenu name={name} role={role} isAdmin={isAdmin} />
          </div>
        </header>

        <main className="admin-v2 scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-8">
          {/* Keyed by the URL so sidebar sub-links (?new=1, ?search=…) re-open the page in that state. */}
          <div key={pathname + search}>
            {blocked ? <NotFoundPage kind="noAccess" inAdmin /> : <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
