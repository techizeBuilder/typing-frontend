import { MenuIcon, SmartphoneIcon, MonitorDownIcon } from 'lucide-react';
import api from '../services/api';
import UpdateButton from '../components/UpdateButton';
import { COLLEGE_NAME, TAGLINE } from '../ui/brand';
import { getSessionUser } from './navigation';

// Backend routes that 302-redirect to the admin-configured download URLs
// (Admin → Settings). Same links the landing page uses.
const API_BASE = (api.defaults.baseURL || '').replace(/\/$/, '');
const DESKTOP_APP_URL = `${API_BASE}/settings/desktop-app/download`;
const MOBILE_APP_URL = `${API_BASE}/settings/mobile-app/download`;

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

export function StudentHeader({ onMenuClick }) {
  const { name } = getSessionUser();
  // Inside the desktop app the download box is pointless; the desktop app
  // instead shows the "Update Available" button when the server has a newer build.
  const isDesktop = !!window.electronAPI;

  return (
    <header className="nd flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-3 py-3 sm:gap-6 sm:px-6">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onMenuClick}
        className="rounded p-1.5 text-navy-800 hover:bg-slate-100 lg:hidden">
        <MenuIcon className="h-5 w-5" />
      </button>

      <div className="min-w-0">
        <h1 className="truncate font-display text-[17px] font-bold leading-tight text-navy-800 sm:text-[22px]">
          {COLLEGE_NAME}
        </h1>
        <p className="truncate text-[11px] font-medium text-primary sm:text-[12.5px]">{TAGLINE}</p>
      </div>

      {!isDesktop &&
        <div className="hidden rounded-lg bg-navy-900 px-3 py-2 md:ml-auto md:block">
          <p className="mb-1.5 text-center text-[11px] font-semibold text-white">Download App</p>
          <div className="flex gap-2">
            <a
              href={MOBILE_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded bg-white px-2 py-1 text-navy-900 transition-colors duration-150 hover:bg-slate-100">
              <SmartphoneIcon className="h-4 w-4 text-primary" />
              <span className="leading-tight">
                <span className="block text-[8px] text-slate-500">Mobile app</span>
                <span className="block text-[10px] font-bold">Download Now</span>
              </span>
            </a>
            <a
              href={DESKTOP_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded bg-white px-2 py-1 text-navy-900 transition-colors duration-150 hover:bg-slate-100">
              <MonitorDownIcon className="h-4 w-4 text-primary" />
              <span className="leading-tight">
                <span className="block text-[8px] text-slate-500">Download On</span>
                <span className="block text-[10px] font-bold">Windows</span>
              </span>
            </a>
          </div>
        </div>
      }

      <div className={`flex items-center gap-2 sm:gap-4 ${isDesktop ? 'ml-auto' : 'ml-auto md:ml-0'}`}>
        <UpdateButton />
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-bold text-white">
            {initials(name)}
          </span>
          <span className="hidden max-w-[160px] truncate text-[13px] font-semibold text-navy-800 sm:block">
            {name}
          </span>
        </div>
      </div>
    </header>
  );
}
