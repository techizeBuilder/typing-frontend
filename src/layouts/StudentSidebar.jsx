import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOutIcon, XIcon } from 'lucide-react';
import { authService } from '../services/api';
import { NavIcon } from '../ui/NavIcon';
import { LOGO_URL } from '../ui/brand';
import { studentNav, getSessionUser, isItemActive } from './navigation';

function Badge({ kind }) {
  if (kind === 'live') {
    return (
      <span className="ml-auto rounded bg-danger px-1.5 py-[1px] text-[9px] font-bold tracking-wide text-white">
        LIVE
      </span>
    );
  }
  if (kind === 'premium') {
    return (
      <span className="ml-auto rounded bg-warn px-1.5 py-[1px] text-[9px] font-bold text-navy-900">
        Go Premium
      </span>
    );
  }
  return (
    <span className="ml-auto rounded bg-success px-1.5 py-[1px] text-[9px] font-bold text-white">
      NEW
    </span>
  );
}

export function StudentSidebar({ mobileOpen = false, onClose }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = getSessionUser();
  const items = studentNav.filter((item) => !item.visible || item.visible(user));

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

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
        className={`nd fixed inset-y-0 left-0 z-50 flex h-full w-[276px] shrink-0 flex-col border-r border-slate-200 bg-white text-navy-800 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
          <img
            src={LOGO_URL}
            alt="Balaji Typing College"
            className="h-11 w-11 rounded-full bg-white object-contain p-[2px] shadow-card" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="font-display text-[13px] font-semibold text-navy-800">Balaji Typing &amp;</p>
            <p className="font-display text-[13px] font-semibold text-navy-800">Steno College</p>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 lg:hidden">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-3" aria-label="Student navigation">
          <ul className="space-y-[3px]">
            {items.map((item) => {
              const active = isItemActive(item, pathname);
              const color = item.color ?? '#38BDF8';
              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-[13px] transition-all duration-200 ease-out hover:translate-x-1 ${
                      active ?
                        'border-amber-400 bg-primary font-semibold text-white shadow-sm hover:bg-primary-700' :
                        'border-transparent text-slate-600 hover:bg-slate-50'}`}>
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                      style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : `${color}1F` }}>
                      <NavIcon name={item.icon} className="h-4 w-4" style={{ color: active ? '#fff' : color }} />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {item.badge && <Badge kind={item.badge} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-slate-100 px-3 py-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-danger transition-colors duration-150 hover:bg-rose-50">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-50">
              <LogOutIcon className="h-4 w-4" />
            </span>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
