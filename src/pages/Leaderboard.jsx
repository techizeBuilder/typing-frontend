import React, { useState, useEffect } from 'react';
import DashboardNav from '../components/DashboardNav';
import Header from '../components/Header';
import { resultService } from '../services/api';
import './StudentDashboard.css';

const Leaderboard = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examFilter, setExamFilter] = useState('All');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await resultService.getLeaderboard();
      setRawData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Unique exam names for dropdown
  const examOptions = Array.from(
    new Set(rawData.map(r => r.exam_name || 'Self Practice'))
  ).sort();

  // Filter → deduplicate by username (keep best NWPM) → top 10
  const leaderboard = (() => {
    const filtered = examFilter === 'All'
      ? rawData
      : rawData.filter(r => (r.exam_name || 'Self Practice') === examFilter);
    const seen = new Set();
    const result = [];
    for (const row of filtered) {
      if (!seen.has(row.username)) {
        seen.add(row.username);
        result.push(row);
        if (result.length >= 10) break;
      }
    }
    return result;
  })();

  return (
    <div className="dashboard-page-container">
      <Header />

      {/* Blue Welcome Bar */}
      <div className="dashboard-welcome-bar">
        <div className="welcome-text-content">
          <h2>🏆 Top Performers</h2>
          <p>Global Live Test Rank Leaderboard</p>
        </div>
      </div>

      <div className="dashboard-layout">
        <DashboardNav />

        <div className="dashboard-content">
          <div className="selection-panel" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 className="explore-title" style={{ margin: 0 }}>Current Rankings</h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>Exam:</label>
                <select
                  value={examFilter}
                  onChange={(e) => setExamFilter(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', background: '#fff', minWidth: '180px' }}
                >
                  <option value="All">All Exams</option>
                  {examOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                {examFilter !== 'All' && (
                  <button
                    onClick={() => setExamFilter('All')}
                    style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <p>Loading leaderboard...</p>
            ) : leaderboard.length === 0 ? (
              <p>No test records found{examFilter !== 'All' ? ` for "${examFilter}"` : ''} yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', color: '#475569', borderTopLeftRadius: '6px' }}>Rank</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', color: '#475569' }}>Student Name</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', color: '#475569' }}>Gross Speed (GWPM)</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', color: '#475569' }}>Net Speed (NWPM)</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', color: '#475569', borderTopRightRadius: '6px' }}>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row, index) => (
                      <tr
                        key={index}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: index === 0 ? '#fefce8' : index === 1 ? '#f8fafc' : index === 2 ? '#fff7ed' : 'white',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseOver={(e) => { if (index > 2) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseOut={(e) => { if (index > 2) e.currentTarget.style.backgroundColor = 'white'; }}
                      >
                        <td style={{ padding: '15px 20px', fontWeight: 'bold', color: index < 3 ? '#b45309' : '#64748b' }}>
                          #{index + 1} {index === 0 && '🥇'} {index === 1 && '🥈'} {index === 2 && '🥉'}
                        </td>
                        <td style={{ padding: '15px 20px', fontWeight: '600', color: '#1e293b' }}>{row.username}</td>
                        <td style={{ padding: '15px 20px', color: '#475569', fontWeight: '600' }}>{Math.round(row.max_gwpm)} WPM</td>
                        <td style={{ padding: '15px 20px', color: '#0b4bcc', fontWeight: 'bold' }}>{Math.round(row.max_nwpm)} WPM</td>
                        <td style={{ padding: '15px 20px', color: '#0f172a' }}>{parseFloat(row.max_accuracy).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
