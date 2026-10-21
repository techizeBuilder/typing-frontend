import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon, LogOutIcon, RepeatIcon, XIcon } from 'lucide-react';
import { authService } from '../services/api';
import { NavIcon } from '../ui/NavIcon';
import { LOGO_URL, COLLEGE_NAME } from '../ui/brand';
import { adminNav, getSessionUser, isChildActive, isItemActive } from './navigation';

export function AdminSidebar({ mobileOpen = false, onClose }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const user = getSessionUser();
  const items = adminNav.filter((item) => !item.visible || item.visible(user));
  // Groups open automatically on their own pages; the admin can also toggle them.
  const [toggled, setToggled] = useState({});
  const isOpen = (item) => toggled[item.label] ?? isItemActive(item, pathname, search);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const rowClass = (active) => `flex w-full items-center gap-2.5 border-l-4 px-4 py-2.5 text-[13px] transition-all duration-200 ease-out hover:translate-x-1 ${
    active ? 'border-amber-400 bg-primary font-semibold text-white hover:bg-primary-700' : 'border-transparent text-slate-600 hover:bg-slate-50'}`;
  const icon = (item, active) => (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
      style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : `${item.color ?? '#38BDF8'}1F` }}>
      <NavIcon name={item.icon} className="h-4 w-4" style={{ color: active ? '#fff' : item.color ?? '#38BDF8' }} />
    </span>
  );

  return (
    <>
      {mobileOpen &&
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
      }
      <aside
        className={`nd fixed inset-y-0 left-0 z-50 flex h-full w-[286px] shrink-0 flex-col border-r border-slate-200 bg-white text-navy-800 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-4">
          <img
            src={LOGO_URL}
            alt=""
            className="h-9 w-9 rounded-full bg-white object-contain p-[2px] shadow-card" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[12.5px] font-semibold text-navy-800">{COLLEGE_NAME}</p>
            <p className="text-[10.5px] text-slate-500">Admin Panel</p>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 lg:hidden">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
          <p className="px-4 pb-1.5 pt-3 text-[10px] font-semibold tracking-wide text-slate-400">
            MAIN NAVIGATION
          </p>

          <nav className="pb-3" aria-label="Admin navigation">
            <ul>
              {items.map((item) => {
                const active = isItemActive(item, pathname, search);
                if (!item.children) {
                  return (
                    <li key={item.label}>
                      <Link to={item.to} onClick={onClose} aria-current={active ? 'page' : undefined} className={rowClass(active)}>
                        {icon(item, active)}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                }
                const open = isOpen(item);
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setToggled((t) => ({ ...t, [item.label]: !open }))}
                      className={rowClass(active)}>
                      {icon(item, active)}
                      <span className="truncate">{item.label}</span>
                      {open ? <ChevronUpIcon className="ml-auto h-3.5 w-3.5" /> : <ChevronDownIcon className="ml-auto h-3.5 w-3.5" />}
                    </button>
                    {open &&
                      <ul>
                        {item.children.map((child) => {
                          const childActive = isChildActive(child, pathname, search);
                          return (
                            <li key={child.to}>
                              <Link
                                to={child.to}
                                onClick={onClose}
                                aria-current={childActive ? 'page' : undefined}
                                className={`block border-l-4 py-2 pl-11 pr-4 text-[12.5px] font-medium transition-all duration-200 ease-out hover:translate-x-1 ${
                                  childActive ? 'border-amber-400 bg-primary-50 text-primary-700' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}>
                                — {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    }
                  </li>
                );
              })}
            </ul>
          </nav>

        </div>

        <div className="space-y-1.5 border-t border-slate-100 px-3 py-3">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-primary-700">
            <ExternalLinkIcon className="h-4 w-4" /> Visit Website
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50">
            <RepeatIcon className="h-4 w-4 text-primary" /> Switch to Student View
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-md bg-rose-50 px-2.5 py-2 text-[12.5px] font-semibold text-danger transition-colors duration-150 hover:bg-rose-100">
            <LogOutIcon className="h-4 w-4" /> Secure logout
          </button>
          <p className="pt-1.5 text-[10.5px] text-slate-400">© {new Date().getFullYear()} {COLLEGE_NAME}</p>
        </div>
      </aside>
    </>
  );
}
