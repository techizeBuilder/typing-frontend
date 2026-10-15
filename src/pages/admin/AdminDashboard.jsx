import { useState, useEffect } from 'react';
import { userService, resultService, chapterService } from '../../services/api';
import { Link } from 'react-router-dom';
import {
  CalendarIcon,
  ClipboardCheckIcon,
  ClockIcon,
  GaugeIcon,
  HeadphonesIcon,
  KeyboardIcon,
  LayoutDashboardIcon,
  Loader2Icon,
  Trash2Icon,
  UserCheckIcon,
  UsersIcon,
  UserXIcon,
} from 'lucide-react';
import { PageHeading } from '../../ui/PageHeading';
import { StatCard } from '../../ui/StatCard';
import { Panel } from '../../ui/Pill';
import { NavIcon } from '../../ui/NavIcon';
import { adminNav, getSessionUser } from '../../layouts/navigation';
import './Admin.css';

const AdminDashboard = () => {
  const [filter, setFilter] = useState('daily'); // daily, weekly, monthly, yearly

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
    totalTests: 0,
    avgSpeed: 0,
    typingChapters: 0,
    stenoChapters: 0
  });
  
  const [loading, setLoading] = useState(true);

  // Raw data to perform filtering
  const [allUsers, setAllUsers] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [allChapters, setAllChapters] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (allResults.length > 0) {
      applyFilter(filter, allResults, allUsers, allChapters);
    }
  }, [filter, allResults, allUsers, allChapters]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // The dashboard only aggregates counts and stored metrics, so request the
      // lean results list (no raw grading data) and chapter summaries (no
      // passage text) — a fraction of the full payloads.
      const [usersResponse, resultsResponse, chaptersResponse] = await Promise.all([
        userService.getUsers(),
        resultService.getAllResults(true),
        chapterService.getChapters(undefined, undefined, undefined, true)
      ]);

      setAllUsers(usersResponse);
      setAllResults(resultsResponse);
      setAllChapters(chaptersResponse);

      applyFilter(filter, resultsResponse, usersResponse, chaptersResponse);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (currentFilter, results, users, chapters) => {
    const now = new Date();
    
    const filteredResults = results.filter(r => {
      const resultDate = new Date(r.date_taken);
      if (currentFilter === 'daily') {
        return resultDate.toDateString() === now.toDateString();
      } else if (currentFilter === 'weekly') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return resultDate >= oneWeekAgo && resultDate <= now;
      } else if (currentFilter === 'monthly') {
        return resultDate.getMonth() === now.getMonth() && resultDate.getFullYear() === now.getFullYear();
      } else if (currentFilter === 'yearly') {
        return resultDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    // User Stats
    const total = users.length;
    const active = users.filter(u => u.status === 'Active').length;
    const pending = users.filter(u => u.status === 'Pending').length;
    const inactive = users.filter(u => u.status === 'Inactive').length;

    // Chapter Stats
    const typingChapters = chapters.filter(c => c.font_group && !c.font_group.toLowerCase().includes('steno')).length;
    const stenoChapters = chapters.filter(c => c.font_group && c.font_group.toLowerCase().includes('steno')).length;

    // Result Stats (Filtered)
    const totalTests = filteredResults.length;
    const avgSpeed = totalTests > 0 
      ? Math.round(filteredResults.reduce((acc, curr) => acc + curr.nwpm, 0) / totalTests) 
      : 0;

    setStats({ total, active, pending, inactive, totalTests, avgSpeed, typingChapters, stenoChapters });
  };

  const handleClearOldResults = async () => {
    if (!window.confirm('This will permanently delete all result records older than the last 10 days. Continue?')) {
      return;
    }
    try {
      const { deleted } = await resultService.clearOldResults(10);
      alert(`Cleared ${deleted} old result(s). The last 10 days of data have been kept.`);
      fetchDashboardData();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';
      alert(`Error clearing results: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
      console.error('Clear results error:', error?.response?.data || error);
    }
  };

  if (loading) {
    return (
      <p className="nd flex items-center gap-2 p-10 text-[13px] text-slate-500">
        <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading Data...
      </p>
    );
  }

  const user = getSessionUser();
  const quickLinks = adminNav.filter((item) => item.to !== '/admin' && (!item.visible || item.visible(user)));

  return (
    <div className="nd admin-dashboard">
      <PageHeading
        icon={<LayoutDashboardIcon className="h-5 w-5" aria-hidden="true" />}
        title="Overview Dashboard"
        subtitle="Real-time statistics and student performance metrics."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-600">
              <CalendarIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Date Filter
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
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
        <StatCard icon={<UsersIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Total Students" value={stats.total} accentBar="#0D6EFD" />
        <StatCard icon={<UserCheckIcon className="h-5 w-5" />} iconBg="#198754" label="Active Students" value={stats.active} accentBar="#198754" />
        <StatCard icon={<ClockIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Pending Requests" value={stats.pending} accentBar="#F59E0B" />
        <StatCard icon={<UserXIcon className="h-5 w-5" />} iconBg="#DC3545" label="Inactive / Expired" value={stats.inactive} accentBar="#DC3545" />
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<ClipboardCheckIcon className="h-5 w-5" />}
          iconBg="#7C3AED"
          label="Total Exams Performed"
          value={stats.totalTests}
          sub={`Filtered by ${filter}`}
          accentBar="#7C3AED" />
        <StatCard icon={<GaugeIcon className="h-5 w-5" />} iconBg="#0EA5E9" label="Average Speed" value={`${stats.avgSpeed} WPM`} sub={`Avg. NWPM, ${filter}`} accentBar="#0EA5E9" />
        <StatCard icon={<KeyboardIcon className="h-5 w-5" />} iconBg="#06B6D4" label="Total Typing Chapters" value={stats.typingChapters} accentBar="#06B6D4" />
        <StatCard icon={<HeadphonesIcon className="h-5 w-5" />} iconBg="#F43F5E" label="Total Steno Chapters" value={stats.stenoChapters} accentBar="#F43F5E" />
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
    </div>
  );
};

export default AdminDashboard;
