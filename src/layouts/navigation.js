// Sidebar navigation for the new-design layouts. Only routes that exist in the
// app are listed; design entries for modules not yet built are added as each
// module lands. `match` lists extra paths that should highlight the item.

const isAdminRole = (role) => role === 'Admin' || role === 'SuperAdmin';

// Same rule as the legacy DashboardNav: the Admin Panel shortcut is shown to Admins.
export const studentNav = [
  { label: 'Home', icon: 'home', to: '/dashboard', color: '#38BDF8' },
  { label: 'My Account', icon: 'userCircle', to: '/profile', color: '#A78BFA' },
  { label: 'Typing Exam', icon: 'keyboard', to: '/typing-exam', color: '#34D399', fontGroups: ['English Typing', 'Hindi Mangal', 'Hindi Kruti Dev', 'Hindi Remington (GAIL)'] },
  { label: 'English Steno Exam', icon: 'penLine', to: '/english-steno', matchMode: 'Steno English', color: '#FB923C', fontGroups: ['Steno English'] },
  { label: 'Hindi Steno Exam', icon: 'penLine', to: '/hindi-steno', matchMode: 'Steno Hindi', color: '#F472B6', fontGroups: ['Steno Hindi'] },
  { label: 'My Dictations', icon: 'heart', to: '/my-dictations', color: '#FB7185' },
  { label: 'PDF File', icon: 'file', to: '/pdf/kc-magazines', match: ['/pdf'], color: '#F87171',
    children: [{ label: 'KC Magazines', to: '/pdf/kc-magazines' }, { label: 'Progressive Magazines', to: '/pdf/progressive-magazines' }] },
  { label: 'Live Test (Typing)', icon: 'play', to: '/live-test/typing', badge: 'live', color: '#FB7185', fontGroups: ['English Typing', 'Hindi Mangal', 'Hindi Kruti Dev', 'Hindi Remington (GAIL)'] },
  { label: 'Live Test (Steno)', icon: 'play', to: '/live-test/steno', badge: 'live', color: '#FBBF24', fontGroups: ['Steno English', 'Steno Hindi'] },
  { label: 'Test Analysis (Results)', icon: 'barChart', to: '/my-tests', match: ['/results'], color: '#60A5FA' },
  { label: 'Self Assessment', icon: 'graduationCap', to: '/self-assessment', color: '#C084FC',
    children: [
      { label: 'Eng. Typing', to: '/self-assessment/eng-typing' },
      { label: 'Hindi Typing', to: '/self-assessment/hindi-typing' },
      { label: 'Eng. Steno', to: '/self-assessment/eng-steno' },
      { label: 'Hindi Steno', to: '/self-assessment/hindi-steno' },
    ] },
  { label: 'Test Analysis', icon: 'gauge', to: '/test-analysis', color: '#22D3EE',
    children: [
      { label: 'Typing', to: '/test-analysis/typing' },
      { label: 'Eng. Steno', to: '/test-analysis/eng-steno' },
      { label: 'Hindi Steno', to: '/test-analysis/hindi-steno' },
    ] },
  { label: 'Typing Games', icon: 'gamepad', to: '/typing-games', color: '#F472B6' },
  { label: 'Leaderboard', icon: 'trophy', to: '/leaderboard', color: '#FACC15' },
  { label: 'Top Ranks', icon: 'trophy', to: '/top-ranks', color: '#2DD4BF' },
  { label: 'Plan & Pricing', icon: 'crown', to: '/plan-pricing', badge: 'premium', highlight: true, color: '#F59E0B' },
  { label: 'Refer & Earn', icon: 'gift', to: '/refer-earn', color: '#34D399' },
  { label: 'Write a Review', icon: 'star', to: '/write-review', color: '#FBBF24' },
  { label: 'Support', icon: 'headphones', to: '/support', color: '#34D399' },
  { label: 'How to use?', icon: 'help', to: '/how-to-use', color: '#94A3B8' },
  { label: 'Admin Panel', icon: 'settings', to: '/admin', color: '#94A3B8', visible: ({ role }) => role === 'Admin' },
];

// Mirrors the role/permission checks of the legacy AdminLayout exactly.
const can = (perm) => ({ role, permissions }) => isAdminRole(role) || permissions.includes(perm);
const adminOnly = ({ role }) => isAdminRole(role);

export const adminNav = [
  { label: 'Dashboard', icon: 'home', to: '/admin', end: true, color: '#38BDF8' },
  { label: 'Students Management', icon: 'users', to: '/admin/students', color: '#A78BFA', visible: can('students'),
    children: [{ label: 'All Students', to: '/admin/students' }, { label: 'Add Student', to: '/admin/students/new' }, { label: 'Import Students', to: '/admin/students?import=1' }, { label: 'Pending Requests', to: '/admin/students?status=Pending' }] },
  { label: 'Exam Management', icon: 'layers', to: '/admin/exams', match: ['/admin/result-patterns'], color: '#FB923C', visible: can('exams'),
    children: [{ label: 'Manage Exams', to: '/admin/exams' }, { label: 'Add New Exam', to: '/admin/exams/new' }, { label: 'Result Patterns', to: '/admin/result-patterns' }] },
  { label: 'Font Groups', icon: 'type', to: '/admin/font-groups', color: '#60A5FA', visible: can('exams') },
  { label: 'Screen Layout', icon: 'monitor', to: '/admin/screen-layout', color: '#2DD4BF', visible: adminOnly },
  { label: 'Test Management', icon: 'clipboard', to: '/admin/content', color: '#34D399', visible: can('chapters'),
    children: [{ label: 'Manage Test (Live, Preload)', to: '/admin/content' }, { label: 'Add New Test (Live, Preload)', to: '/admin/content/new' }] },
  { label: 'Message Center', icon: 'mail', to: '/admin/messages', color: '#0EA5E9', visible: can('messages') },
  { label: 'Flash Banner', icon: 'zap', to: '/admin/flash-banner', color: '#F59E0B', visible: can('flash_banner') },
  { label: 'Staff Management', icon: 'shield', to: '/admin/staff', color: '#F472B6', visible: can('staff') },
  { label: 'Support Tickets', icon: 'headphones', to: '/admin/support', color: '#34D399', visible: can('support') },
  { label: 'Student Reviews', icon: 'star', to: '/admin/reviews', color: '#FBBF24', visible: can('reviews') },
  { label: 'PDF Magazines', icon: 'file', to: '/admin/magazines', color: '#F87171', visible: can('magazines') },
  { label: 'Subscription & Plan', icon: 'wallet', to: '/admin/subscription', color: '#4ADE80', visible: can('plans') },
  { label: 'Results (Typing/Steno)', icon: 'barChart', to: '/admin/results', color: '#FACC15', visible: adminOnly },
  { label: 'Leaderboard', icon: 'trophy', to: '/admin/leaderboard', color: '#FBBF24', visible: adminOnly },
  { label: 'Backup & Restore', icon: 'database', to: '/admin/backup', color: '#94A3B8', visible: adminOnly },
  { label: 'Settings', icon: 'settings', to: '/admin/settings', color: '#C084FC', visible: adminOnly },
];

// `fontGroups` items are hidden when every listed font group is switched off.
export const offersFontGroups = (item, isActive) => !item.fontGroups || item.fontGroups.some(isActive);

export function getSessionUser() {
  let permissions;
  try {
    permissions = JSON.parse(localStorage.getItem('permissions') || '[]') || [];
  } catch {
    permissions = [];
  }
  return {
    role: localStorage.getItem('role'),
    permissions,
    name: localStorage.getItem('name') || localStorage.getItem('username') || '',
  };
}

// Sub-links (admin groups) carry their own query string: active only on an exact match.
export function isChildActive(child, pathname, search = '') {
  const [path, query = ''] = child.to.split('?');
  return pathname === path && new URLSearchParams(search).toString() === new URLSearchParams(query).toString();
}

export function isItemActive(item, pathname, search = '') {
  if (item.end) return pathname === item.to;
  if ([item.to, ...(item.match || [])].some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;

  // Detail pages shared by several sections are attributed by their ?mode=.
  const mode = new URLSearchParams(search).get('mode') || '';
  const stenoMode = mode === 'Steno English' || mode === 'Steno Hindi';
  if (pathname.startsWith('/steno/')) return item.matchMode === mode;
  if (pathname.startsWith('/live-test/exam/')) {
    return item.to === (stenoMode ? '/live-test/steno' : '/live-test/typing');
  }
  return false;
}
