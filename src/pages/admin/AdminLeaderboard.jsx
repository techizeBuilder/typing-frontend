import React, { useState, useEffect } from 'react';
import { resultService } from '../../services/api';

// Admin "Top Performer of the Day" leaderboard. Shows today's Live Test results
// ranked by Net Speed (NWPM), deduplicated to each student's best attempt, with an
// optional exam filter (or overall). Mirrors the student leaderboard's ranking logic
// but scoped to today and rendered with the admin panel styling.
const AdminLeaderboard = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examFilter, setExamFilter] = useState('All');

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await resultService.getLeaderboard('today');
      setRawData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setRawData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Unique exam names for the dropdown
  const examOptions = Array.from(
    new Set(rawData.map(r => r.exam_name || 'Self Practice'))
  ).sort();

  // Filter by exam → keep each student's best (rows arrive NWPM-desc) → top 10
  const leaderboard = (() => {
    const filtered = examFilter === 'All'
      ? rawData
      : rawData.filter(r => (r.exam_name || 'Self Practice') === examFilter);
    const seen = new Set();
    const result = [];
    for (const row of filtered) {
      const key = row.user_id || row.username;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(row);
        if (result.length >= 10) break;
      }
    }
    return result;
  })();

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const th = { padding: '13px 18px', fontWeight: 'bold', color: '#475569', textAlign: 'left' };
  const td = { padding: '13px 18px' };

  return (
    <div className="admin-card">
      <header className="admin-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0 }}>🏆 Top Performer of the Day</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Live Test rankings by Net Speed · {today}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Exam:</label>
            <select
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', background: '#fff', minWidth: '180px' }}
            >
              <option value="All">All Exams (Overall)</option>
              {examOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              onClick={fetchLeaderboard}
              style={{ padding: '7px 12px', background: '#0b4bcc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
            >
              ⟳ Refresh
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <p style={{ padding: '20px' }}>Loading leaderboard...</p>
      ) : leaderboard.length === 0 ? (
        <p style={{ padding: '20px', color: '#64748b' }}>
          No Live Test records found for today{examFilter !== 'All' ? ` for "${examFilter}"` : ''} yet.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                <th style={th}>Rank</th>
                <th style={th}>Student Name</th>
                <th style={th}>Exam</th>
                <th style={th}>Gross Speed (GWPM)</th>
                <th style={th}>Net Speed (NWPM)</th>
                <th style={th}>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, index) => (
                <tr
                  key={index}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: index === 0 ? '#fefce8' : index === 1 ? '#f8fafc' : index === 2 ? '#fff7ed' : 'white',
                  }}
                >
                  <td style={{ ...td, fontWeight: 'bold', color: index < 3 ? '#b45309' : '#64748b' }}>
                    #{index + 1} {index === 0 && '🥇'} {index === 1 && '🥈'} {index === 2 && '🥉'}
                  </td>
                  <td style={{ ...td, fontWeight: 600, color: '#1e293b' }}>{row.username || '—'}</td>
                  <td style={{ ...td, color: '#475569' }}>{row.exam_name || 'Self Practice'}</td>
                  <td style={{ ...td, color: '#475569', fontWeight: 600 }}>{Math.round(row.max_gwpm)} WPM</td>
                  <td style={{ ...td, color: '#0b4bcc', fontWeight: 'bold' }}>{Math.round(row.max_nwpm)} WPM</td>
                  <td style={{ ...td, color: '#0f172a' }}>{parseFloat(row.max_accuracy).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminLeaderboard;
