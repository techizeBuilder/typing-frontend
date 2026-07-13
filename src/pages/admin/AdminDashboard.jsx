import { useState, useEffect } from 'react';
import { userService, resultService, chapterService } from '../../services/api';
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

  if (loading) return <div style={{ padding: '40px' }}>Loading Data...</div>;

  return (
    <div className="admin-dashboard">
      <header className="admin-heading">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Overview Dashboard</h1>
            <p>Real-time statistics and student performance metrics.</p>
          </div>
          <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ marginRight: '10px', color: '#64748b', fontWeight: 'bold' }}>Date Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="daily">Daily (Today)</option>
              <option value="weekly">Weekly (Last 7 Days)</option>
              <option value="monthly">Monthly (This Month)</option>
              <option value="yearly">Yearly (This Year)</option>
            </select>
            <button
              onClick={handleClearOldResults}
              title="Delete all result records older than the last 10 days"
              style={{ padding: '8px 14px', borderRadius: '4px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Clear Results
            </button>
          </div>
        </div>
      </header>

      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stats-card total">
          <label>Total Students</label>
          <div className="value">{stats.total}</div>
        </div>
        <div className="stats-card active">
          <label>Active Students</label>
          <div className="value">{stats.active}</div>
        </div>
        <div className="stats-card pending">
          <label>Pending Requests</label>
          <div className="value">{stats.pending}</div>
        </div>
        <div className="stats-card inactive">
          <label>Inactive / Expired</label>
          <div className="value">{stats.inactive}</div>
        </div>
      </div>
      
      {/* Chapter Breakdown */}
      <div className="stats-grid">
        <div className="stats-card" style={{ borderBottom: '4px solid #8b5cf6' }}>
          <label>Total Exams Performed</label>
          <div className="value">{stats.totalTests}</div>
          <p style={{ fontSize: '0.75rem', marginTop: '5px', color: '#64748b' }}>Filtered by {filter}</p>
        </div>
        <div className="stats-card" style={{ borderBottom: '4px solid #06b6d4' }}>
          <label>Total Typing Chapters</label>
          <div className="value">{stats.typingChapters}</div>
        </div>
        <div className="stats-card" style={{ borderBottom: '4px solid #f43f5e' }}>
          <label>Total Steno Chapters</label>
          <div className="value">{stats.stenoChapters}</div>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card">
          <h4>Performance Overview</h4>
          <div className="kpi-main">
            <div className="kpi-item">
              <span className="kpi-value">{stats.totalTests}</span>
              <span className="kpi-label">Tests Taken</span>
            </div>
            <div className="kpi-item">
              <span className="kpi-value">{stats.avgSpeed}</span>
              <span className="kpi-label">Avg. WPM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
