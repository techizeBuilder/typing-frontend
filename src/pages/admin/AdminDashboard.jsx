import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3Icon, CalendarIcon, ClipboardCheckIcon, ClipboardListIcon, ClockIcon, FilePlus2Icon, GaugeIcon, HeadphonesIcon, KeyboardIcon, LayersIcon,
  LayoutDashboardIcon, Loader2Icon, MicIcon, PlusIcon, SettingsIcon, Trash2Icon, TrophyIcon, UserCheckIcon, UserPlusIcon, UsersIcon, UserXIcon, ZapIcon,
} from 'lucide-react';
import { adminSummaryService, resultService } from '../../services/api';
import { PageHeading } from '../../ui/PageHeading';
import { StatCard } from '../../ui/StatCard';
import { Panel } from '../../ui/Pill';
import { NavIcon } from '../../ui/NavIcon';
import { LineChart } from '../../features/results/adminCharts';
import { adminNav, getSessionUser } from '../../layouts/navigation';
import './Admin.css';

const PERIOD_LABEL = { daily: 'today', weekly: 'last 7 days', monthly: 'this month', yearly: 'this year' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const pct = (n, t) => (t ? `${((n / t) * 100).toFixed(1)}% of all` : undefined);

function Split({ items }) {
  return (
    <div className="mt-1 grid grid-cols-2 gap-2">
      {items.map(([label, value]) => (
        <div key={label}><p className="text-[10.5px] text-slate-500">{label}</p><p className="font-display text-[19px] font-bold text-navy-800">{value}</p></div>
      ))}
    </div>
  );
}

const AdminDashboard = () => {
  const [filter, setFilter] = useState('daily'); // daily, weekly, monthly, yearly
  const [summary, setSummary] = useState(null);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Load each part independently so one failing request doesn't blank the page.
    Promise.allSettled([adminSummaryService.get(), adminSummaryService.dashboard(filter)])
      .then(([s, d]) => {
        if (cancelled) return;
        if (s.status === 'fulfilled') setSummary(s.value); else console.error('Failed to load dashboard counts:', s.reason);
        if (d.status === 'fulfilled') setDash(d.value); else console.error('Failed to load dashboard data:', d.reason);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filter, refreshKey]);

  const handleClearOldResults = async () => {
    if (!window.confirm('This will permanently delete all result records older than the last 10 days. Continue?')) {
      return;
    }
    try {
      const { deleted } = await resultService.clearOldResults(10);
      alert(`Cleared ${deleted} old result(s). The last 10 days of data have been kept.`);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';
      alert(`Error clearing results: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
      console.error('Clear results error:', error?.response?.data || error);
    }
  };

  if (loading && !summary && !dash) {
    return (
      <p className="nd flex items-center gap-2 p-10 text-[13px] text-slate-500">
        <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading Data...
      </p>
    );
  }

  const s = summary || {};
  const d = dash || { results: {}, tests: {}, activity: [], recent_tests: [], recent_exams: [], top_students: [] };
  const user = getSessionUser();
  const quickLinks = adminNav.filter((item) => item.to !== '/admin' && (!item.visible || item.visible(user)));
  const activity = d.activity.map((a) => ({ label: fmtDay(a.date), students: a.new_students, tests: a.tests, active: a.active_students }));
  const actions = [
    [FilePlus2Icon, 'Add New Test', '/admin/content/new'], [UserPlusIcon, 'Add Student', '/admin/students/new'], [LayersIcon, 'Add New Exam', '/admin/exams/new'],
    [ZapIcon, 'Add Live Chapter', '/admin/content/new'], [KeyboardIcon, 'Add Preload Chapter', '/admin/content/new'], [MicIcon, 'Add Steno Dictation', '/admin/content/new'],
    [BarChart3Icon, 'View Results', '/admin/results'], [TrophyIcon, 'Leaderboard', '/admin/leaderboard'], [SettingsIcon, 'System Settings', '/admin/settings'],
  ];

  return (
    <div className="nd admin-dashboard">
      <PageHeading
        icon={<LayoutDashboardIcon className="h-5 w-5" aria-hidden="true" />}
        title="Overview Dashboard"
        subtitle={`Welcome back${user.name ? `, ${user.name}` : ''}! Here's an overview of your platform.`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-600">
              <CalendarIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Date Filter
              <select
                value={filter}
                onChange={(e) => { setLoading(true); setFilter(e.target.value); }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] font-medium text-navy-800 outline-none focus:border-primary">
                <option value="daily">Daily (Today)</option>
                <option value="weekly">Weekly (Last 7 Days)</option>
                <option value="monthly">Monthly (This Month)</option>
                <option value="yearly">Yearly (This Year)</option>
              </select>
            </label>
            <button
              type="button"
              onClick={handleClearOldResults}
              title="Delete all result records older than the last 10 days"
              className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-[#bb2d3b]">
              <Trash2Icon className="h-4 w-4" aria-hidden="true" /> Clear Results
            </button>
          </div>
        } />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<UsersIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Total Students" value={(s.students ?? 0).toLocaleString('en-IN')} action="View All Students" onAction={() => { window.location.hash = '#/admin/students'; }} />
        <StatCard icon={<UserCheckIcon className="h-5 w-5" />} iconBg="#198754" label="Active Students" value={(s.active_students ?? 0).toLocaleString('en-IN')} sub={pct(s.active_students, s.students)} subClass="text-emerald-700" action="View Active Students" onAction={() => { window.location.hash = '#/admin/students?status=Active'; }} />
        <StatCard icon={<ClockIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Pending Requests" value={(s.pending_students ?? 0).toLocaleString('en-IN')} action="View Pending Requests" onAction={() => { window.location.hash = '#/admin/students?status=Pending'; }} />
        <StatCard icon={<UserXIcon className="h-5 w-5" />} iconBg="#DC3545" label="Inactive / Expired" value={(s.inactive_students ?? 0).toLocaleString('en-IN')} sub={pct(s.inactive_students, s.students)} subClass="text-danger" action="View Inactive Students" onAction={() => { window.location.hash = '#/admin/students?status=Inactive'; }} />
      </div>

      <div className={`mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
        <StatCard icon={<ClipboardCheckIcon className="h-5 w-5" />} iconBg="#7C3AED" label="Total Exams Performed" value={(d.results.total ?? 0).toLocaleString('en-IN')} sub={`${d.results.qualified ?? 0} qualified · ${PERIOD_LABEL[filter]}`} action="View Results" onAction={() => { window.location.hash = '#/admin/results'; }} />
        <StatCard icon={<GaugeIcon className="h-5 w-5" />} iconBg="#0EA5E9" label="Average Speed" value={`${Math.round(d.results.avg_nwpm ?? 0)} WPM`} sub={`Avg. NWPM, ${PERIOD_LABEL[filter]} · ${d.results.avg_accuracy ?? 0}% accuracy`} />
        <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#06B6D4] text-white"><KeyboardIcon className="h-5 w-5" aria-hidden="true" /></span><p className="text-[12px] text-slate-500">Total Typing Chapters <b className="text-navy-800">{s.typing_tests ?? 0}</b></p></div>
          <Split items={[['English', d.tests.typing_english ?? 0], ['Hindi', d.tests.typing_hindi ?? 0]]} />
          <Link to="/admin/content" className="mt-auto pt-2 text-[12px] font-semibold text-primary">View Chapters →</Link>
        </div>
        <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#F43F5E] text-white"><HeadphonesIcon className="h-5 w-5" aria-hidden="true" /></span><p className="text-[12px] text-slate-500">Total Steno Dictation <b className="text-navy-800">{s.steno_tests ?? 0}</b></p></div>
          <Split items={[['English', d.tests.steno_english ?? 0], ['Hindi', d.tests.steno_hindi ?? 0]]} />
          <Link to="/admin/content" className="mt-auto pt-2 text-[12px] font-semibold text-primary">View Dictations →</Link>
        </div>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Activity Overview (Last 30 Days)">
          <div className="mb-1 flex flex-wrap gap-4 text-[11px] text-slate-600">
            {[['#0D6EFD', 'New Students'], ['#198754', 'Tests Attempted'], ['#7C3AED', 'Students Active']].map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ backgroundColor: c }} />{l}</span>)}
          </div>
          {activity.length > 0
            ? <LineChart points={activity} series={[{ key: 'students', label: 'New Students', color: '#0D6EFD' }, { key: 'tests', label: 'Tests Attempted', color: '#198754' }, { key: 'active', label: 'Students Active', color: '#7C3AED' }]} />
            : <p className="py-10 text-center text-[12px] text-slate-400">No activity yet.</p>}
        </Panel>
        <Panel title="Quick Actions">
          <ul className="grid grid-cols-3 gap-2">
            {actions.map(([Icon, label, to]) => (
              <li key={label}>
                <Link to={to} className="flex h-full flex-col items-center gap-1.5 rounded-lg border border-slate-200 px-1.5 py-2.5 text-center text-[11px] font-medium text-navy-800 hover:border-primary hover:bg-primary-50">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" /> {label}
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/admin/content/new" className="mt-3 flex items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700"><PlusIcon className="h-4 w-4" aria-hidden="true" /> Add New Test</Link>
        </Panel>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Recent Tests" right={<Link to="/admin/content" className="text-[12px] font-semibold text-primary">View All →</Link>}>
          {d.recent_tests.length === 0 ? <p className="text-[12px] text-slate-400">No tests yet.</p> : (
            <table className="w-full text-left text-[11.5px]">
              <thead className="text-slate-500"><tr><th className="pb-1.5 font-semibold">Test</th><th className="pb-1.5 font-semibold">Type</th><th className="pb-1.5 font-semibold">Status</th><th className="pb-1.5 font-semibold">Created</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {d.recent_tests.map((t) => (
                  <tr key={t.id}>
                    <td className="py-1.5"><Link to={`/admin/content/${t.id}/edit`} className="font-semibold text-primary-700">{t.chapter_no}</Link><span className="block max-w-[140px] truncate text-[10.5px] text-slate-500">{t.name || t.font_group}</span></td>
                    <td className="py-1.5 text-slate-600">{t.test_type === 'Live Test' ? 'Live' : 'Preload'}</td>
                    <td className="py-1.5"><span className={`rounded px-1.5 py-[1px] text-[10px] font-medium ${t.is_active === false ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{t.is_active === false ? 'Inactive' : 'Active'}</span></td>
                    <td className="whitespace-nowrap py-1.5 text-slate-500">{fmtDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Recent Exams" right={<Link to="/admin/exams" className="text-[12px] font-semibold text-primary">View All →</Link>}>
          {d.recent_exams.length === 0 ? <p className="text-[12px] text-slate-400">No exams yet.</p> : (
            <table className="w-full text-left text-[11.5px]">
              <thead className="text-slate-500"><tr><th className="pb-1.5 font-semibold">Exam</th><th className="pb-1.5 font-semibold">Tests</th><th className="pb-1.5 font-semibold">Students</th><th className="pb-1.5 font-semibold">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {d.recent_exams.map((e) => (
                  <tr key={e.id}>
                    <td className="py-1.5"><Link to={`/admin/exams/${e.id}/edit`} className="font-semibold text-primary-700">{e.name}</Link><span className="block text-[10.5px] text-slate-500">{fmtDate(e.created_at)}</span></td>
                    <td className="py-1.5 text-slate-600">{e.tests}</td>
                    <td className="py-1.5 text-slate-600">{e.students}</td>
                    <td className="py-1.5"><span className={`rounded px-1.5 py-[1px] text-[10px] font-medium ${e.is_active === false ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{e.is_active === false ? 'Inactive' : 'Active'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Top Performing Students (30 Days)" right={<Link to="/admin/leaderboard" className="text-[12px] font-semibold text-primary">View Leaderboard →</Link>}>
          {d.top_students.length === 0 ? <p className="text-[12px] text-slate-400">No results in the last 30 days.</p> : (
            <table className="w-full text-left text-[11.5px]">
              <thead className="text-slate-500"><tr><th className="pb-1.5 font-semibold">Rank</th><th className="pb-1.5 font-semibold">Student</th><th className="pb-1.5 font-semibold">Net WPM</th><th className="pb-1.5 font-semibold">Accuracy</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {d.top_students.map((t) => (
                  <tr key={t.user_id + t.rank}>
                    <td className="py-1.5 font-bold text-navy-800">{['🥇', '🥈', '🥉'][t.rank - 1] || t.rank}</td>
                    <td className="py-1.5"><span className="font-semibold text-navy-800">{t.name}</span><span className="block text-[10.5px] text-slate-500">{t.exam_name}</span></td>
                    <td className="py-1.5 font-semibold text-primary-700">{Math.round(t.nwpm)}</td>
                    <td className="py-1.5 text-slate-600">{t.accuracy.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      {quickLinks.length > 0 &&
        <Panel title="Quick Access">
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {quickLinks.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-[12.5px] font-medium text-navy-800 transition-colors duration-150 hover:border-primary hover:bg-primary-50">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${item.color}1F` }}>
                    <NavIcon name={item.icon} className="h-4 w-4" style={{ color: item.color }} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      }
      <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-slate-400"><ClipboardListIcon className="h-3 w-3" aria-hidden="true" /> Speeds use the same formula as the result screen.</p>
    </div>
  );
};

export default AdminDashboard;
