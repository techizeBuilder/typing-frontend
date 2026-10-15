import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { MenuIcon, MessageSquareIcon, ZapIcon } from 'lucide-react';
import { AdminSidebar } from '../../layouts/AdminSidebar';
import { getSessionUser } from '../../layouts/navigation';
import './Admin.css';
import './admin-theme.css';

const ROLE_LABELS = { SuperAdmin: 'Super Admin', Admin: 'Admin', 'Sub-Admin': 'Sub Admin' };

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AD';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { role, permissions, name } = getSessionUser();
  const isAdmin = role === 'Admin' || role === 'SuperAdmin';
  const canMessages = isAdmin || permissions.includes('messages');
  const canFlash = isAdmin || permissions.includes('flash_banner');

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

          <div className="ml-auto flex items-center gap-3">
            {canMessages &&
              <Link
                to="/admin/messages"
                className="hidden items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-[12px] font-medium text-navy-800 transition-colors duration-150 hover:bg-slate-50 lg:flex">
                <MessageSquareIcon className="h-3.5 w-3.5 text-primary" /> Message Center
              </Link>
            }
            {canFlash &&
              <Link
                to="/admin/flash-banner"
                className="hidden items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-[12px] font-medium text-navy-800 transition-colors duration-150 hover:bg-slate-50 lg:flex">
                <ZapIcon className="h-3.5 w-3.5 text-danger" /> Flash Banner
              </Link>
            }

            <div className="flex items-center gap-2 rounded-md px-1.5 py-1">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
                {initials(name)}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-[160px] truncate text-[12.5px] font-semibold text-navy-800">{name || 'Admin'}</span>
                <span className="block text-[10.5px] text-slate-500">{ROLE_LABELS[role] || role}</span>
              </span>
            </div>
          </div>
        </header>

        <main className="admin-v2 scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
