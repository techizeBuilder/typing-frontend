import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOutIcon, RepeatIcon, XIcon } from 'lucide-react';
import { authService } from '../services/api';
import { NavIcon } from '../ui/NavIcon';
import { LOGO_URL, COLLEGE_NAME } from '../ui/brand';
import { adminNav, getSessionUser, isItemActive } from './navigation';

export function AdminSidebar({ mobileOpen = false, onClose }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = getSessionUser();
  const items = adminNav.filter((item) => !item.visible || item.visible(user));

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

        <p className="px-4 pb-1.5 pt-3 text-[10px] font-semibold tracking-wide text-slate-400">
          MAIN NAVIGATION
        </p>

        <nav className="scroll-thin flex-1 overflow-y-auto pb-3" aria-label="Admin navigation">
          <ul>
            {items.map((item) => {
              const color = item.color ?? '#38BDF8';
              const active = isItemActive(item, pathname);
              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2.5 border-l-4 px-4 py-2.5 text-[13px] transition-all duration-200 ease-out hover:translate-x-1 ${
                      active ?
                        'border-amber-400 bg-primary font-semibold text-white hover:bg-primary-700' :
                        'border-transparent text-slate-600 hover:bg-slate-50'}`}>
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                      style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : `${color}1F` }}>
                      <NavIcon name={item.icon} className="h-4 w-4" style={{ color: active ? '#fff' : color }} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-1.5 border-t border-slate-100 px-3 py-3">
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
