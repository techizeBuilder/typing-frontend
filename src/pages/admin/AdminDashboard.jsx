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
  
  const [topPerformers, setTopPerformers] = useState([]);
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
      const [usersResponse, resultsResponse, chaptersResponse] = await Promise.all([
        userService.getUsers(),
        resultService.getAllResults(),
        chapterService.getChapters() // Fetches all if no param passed
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

    // Top Performers (Filtered, Unique Users, Top 10)
    const userMaxMap = {};
    filteredResults.forEach(r => {
      if (!userMaxMap[r.student_id] || r.nwpm > userMaxMap[r.student_id].nwpm) {
        userMaxMap[r.student_id] = r;
      }
    });

    const uniqueTopResults = Object.values(userMaxMap)
      .sort((a, b) => b.nwpm - a.nwpm)
      .slice(0, 10);

    const performersWithNames = uniqueTopResults.map(r => {
      const user = users.find(u => u.id === r.student_id);
      return {
        ...r,
        user_name: user ? user.name : 'Unknown Student',
        exam_name: r.exam ? r.exam.name : 'Practice Test'
      };
    });

    setTopPerformers(performersWithNames);
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
          <div className="filter-group">
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

        <div className="kpi-card top-performers">
           <h4>Top Performers ({filter === 'daily' ? 'Today' : filter === 'weekly' ? 'This Week' : filter === 'monthly' ? 'This Month' : 'This Year'})</h4>
           {topPerformers.length === 0 ? (
             <p style={{ color: '#64748b', marginTop: '20px' }}>No tests taken in this period.</p>
           ) : (
             <ul className="performer-list">
               {topPerformers.map((p, idx) => (
                 <li key={p.id}>
                    <span>{idx + 1}. {p.user_name} ({p.exam_name})</span> 
                    <strong>{p.nwpm} WPM</strong>
                 </li>
               ))}
             </ul>
           )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
