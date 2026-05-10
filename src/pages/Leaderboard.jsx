import React, { useState, useEffect } from 'react';
import DashboardNav from '../components/DashboardNav';
import Header from '../components/Header';
import { resultService } from '../services/api';
import './StudentDashboard.css';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const data = await resultService.getLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

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
            <h2 className="explore-title" style={{ marginBottom: '20px' }}>Current Rankings</h2>
            
            {loading ? (
              <p>Loading leaderboard...</p>
            ) : leaderboard.length === 0 ? (
              <p>No test records found yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', color: '#475569', borderTopLeftRadius: '6px' }}>Rank</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', color: '#475569' }}>Student Name</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', color: '#475569' }}>Top Speed (NWPM)</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', color: '#475569', borderTopRightRadius: '6px' }}>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row, index) => (
                      <tr key={index} style={{ 
                        borderBottom: '1px solid #e2e8f0', 
                        backgroundColor: index === 0 ? '#fefce8' : index === 1 ? '#f8fafc' : index === 2 ? '#fff7ed' : 'white',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => {
                        if (index > 2) e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseOut={(e) => {
                        if (index > 2) e.currentTarget.style.backgroundColor = 'white';
                      }}>
                        <td style={{ padding: '15px 20px', fontWeight: 'bold', color: index < 3 ? '#b45309' : '#64748b' }}>
                          #{index + 1} {index === 0 && '🥇'} {index === 1 && '🥈'} {index === 2 && '🥉'}
                        </td>
                        <td style={{ padding: '15px 20px', fontWeight: '600', color: '#1e293b' }}>{row.username}</td>
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
