import React, { useState, useEffect } from 'react';
import DashboardNav from '../components/DashboardNav';
import Header from '../components/Header';
import { resultService, settingService } from '../services/api';
import './StudentDashboard.css';

// "21:00" → "9:00 PM" for display.
const to12h = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ampm}`;
};

const Leaderboard = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examFilter, setExamFilter] = useState('All');
  const [rankUpdateTime, setRankUpdateTime] = useState('21:00');

  useEffect(() => {
    fetchLeaderboard();
    settingService.getAll()
      .then((s) => { if (s && s.live_rank_update_time) setRankUpdateTime(s.live_rank_update_time); })
      .catch(() => {});
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

  // Logged-in student's identifiers. user_id is unique, so it's the reliable key for
  // locating this student in the ranking; name is only a display fallback for legacy
  // rows that predate user_id being returned by the leaderboard query.
  const myUserId = localStorage.getItem('user_id') || '';
  const myName   = localStorage.getItem('name') || localStorage.getItem('username') || '';

  // True when a ranking row belongs to the logged-in student.
  const rowIsMe = (row) => (myUserId && row.user_id)
    ? row.user_id === myUserId
    : (!!myName && row.username === myName);

  // Filter → deduplicate per student (rows arrive NWPM-desc, so first seen = best).
  // Keep the FULL ranking so we can compute the logged-in student's rank even when
  // they fall outside the visible top 10.
  const fullRanking = (() => {
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
      }
    }
    return result;
  })();

  const leaderboard = fullRanking.slice(0, 10);

  // The logged-in student's position in the full ranking (1-based) and their best row.
  const myIndex = fullRanking.findIndex(rowIsMe);
  const myRank  = myIndex >= 0 ? myIndex + 1 : null;
  const myEntry = myIndex >= 0 ? fullRanking[myIndex] : null;

  return (
    <div className="dashboard-page-container">
      <Header />

      {/* Blue Welcome Bar */}
      <div className="dashboard-welcome-bar">
        <div className="welcome-text-content">
          <h2>🏆 Top Performers</h2>
          <p>Global Live Test Rank Leaderboard · Rankings update daily at {to12h(rankUpdateTime)}</p>
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

            {/* Logged-in student's own rank — always shown on top */}
            {!loading && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
                background: myRank ? 'linear-gradient(90deg,#eff6ff,#dbeafe)' : '#f8fafc',
                border: myRank ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: '10px', padding: '14px 20px', marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '1.6rem' }}>🎯</span>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Your Rank</div>
                    {myRank ? (
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1d4ed8' }}>
                        #{myRank} {myRank === 1 && '🥇'} {myRank === 2 && '🥈'} {myRank === 3 && '🥉'}
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}> of {fullRanking.length}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569' }}>
                        No ranked Live Test{examFilter !== 'All' ? ` for "${examFilter}"` : ''} yet
                      </div>
                    )}
                  </div>
                </div>
                {myEntry && (
                  <div style={{ display: 'flex', gap: '22px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>GWPM</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#475569' }}>{Math.round(myEntry.max_gwpm)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>NWPM</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b4bcc' }}>{Math.round(myEntry.max_nwpm)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Accuracy</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{parseFloat(myEntry.max_accuracy).toFixed(2)}%</div>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                    {leaderboard.map((row, index) => {
                      const isMe = rowIsMe(row);
                      const baseBg = isMe ? '#dbeafe' : index === 0 ? '#fefce8' : index === 1 ? '#f8fafc' : index === 2 ? '#fff7ed' : 'white';
                      return (
                      <tr
                        key={index}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: baseBg,
                          boxShadow: isMe ? 'inset 3px 0 0 #3b82f6' : 'none',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseOver={(e) => { if (!isMe && index > 2) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseOut={(e) => { if (!isMe && index > 2) e.currentTarget.style.backgroundColor = 'white'; }}
                      >
                        <td style={{ padding: '15px 20px', fontWeight: 'bold', color: index < 3 ? '#b45309' : '#64748b' }}>
                          #{index + 1} {index === 0 && '🥇'} {index === 1 && '🥈'} {index === 2 && '🥉'}
                        </td>
                        <td style={{ padding: '15px 20px', fontWeight: '600', color: '#1e293b' }}>
                          {row.username}
                          {isMe && <span style={{ marginLeft: '8px', background: '#3b82f6', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>You</span>}
                        </td>
                        <td style={{ padding: '15px 20px', color: '#475569', fontWeight: '600' }}>{Math.round(row.max_gwpm)} WPM</td>
                        <td style={{ padding: '15px 20px', color: '#0b4bcc', fontWeight: 'bold' }}>{Math.round(row.max_nwpm)} WPM</td>
                        <td style={{ padding: '15px 20px', color: '#0f172a' }}>{parseFloat(row.max_accuracy).toFixed(2)}%</td>
                      </tr>
                      );
                    })}
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
