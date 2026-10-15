import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { StudentSidebar } from './StudentSidebar';
import { StudentHeader } from './StudentHeader';

// Shell for student pages: sidebar + header around the routed page. The page
// area itself is not `.nd`, so pages still on legacy CSS render as before;
// redesigned pages put `.nd` on their own root.
export default function StudentLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-canvas">
      <StudentSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <StudentHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="layout-main scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
