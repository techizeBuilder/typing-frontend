import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNav from '../components/DashboardNav';
import Header from '../components/Header';
import { resultService, getCurrentUserUuid } from '../services/api';
import './StudentDashboard.css';

const MyResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('typing'); // 'typing', 'steno', or 'live'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [saveErrorBanner, setSaveErrorBanner] = useState('');

  useEffect(() => {
    // Surface the most recent save error from TestEngine, if any.
    const lastErr = sessionStorage.getItem('lastSaveError');
    if (lastErr) {
      setSaveErrorBanner(lastErr);
      sessionStorage.removeItem('lastSaveError');
    }

    const fetchResults = async () => {
      try {
        const userId = getCurrentUserUuid();
        if (!userId) {
          setFetchError('Your session is missing a valid user ID. Please log out and log in again to see your past results.');
          setLoading(false);
          return;
        }
        console.log('[MyResults] Fetching results for userId:', userId);
        const data = await resultService.getUserResults(userId);
        console.log('[MyResults] Got', data?.length ?? 0, 'results');
        setResults(data || []);
      } catch (error) {
        console.error('Error fetching results:', error);
        const msg = error?.response?.data?.message || error?.message || 'Could not load results.';
        setFetchError(Array.isArray(msg) ? msg.join(', ') : msg);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const handleViewResult = (result) => {
    navigate('/result', { 
      state: { 
        gwpm: result.gwpm,
        nwpm: result.nwpm,
        accuracy: result.accuracy,
        fullErrors: result.full_errors,
        halfErrors: result.half_errors,
        totalStrokes: result.total_strokes,
        timeElapsed: result.time_elapsed,
        exam_name: result.exam?.name || 'Practice Test',
        date_taken: result.date_taken,
        mode: result.mode,
        userInput: result.user_input,
        typedText: result.user_input, // for steno compatibility
        referenceWords: result.reference_words || [],
        referenceText: result.reference_words ? result.reference_words.join(' ') : '', // for steno compatibility
        wordStatuses: result.word_statuses || [],
        pattern: result.pattern_data,
      } 
    });
  };

  const filteredResults = results.filter(r => {
    const isLive = r.test_type === 'Live Test';
    const isSteno = r.mode?.toLowerCase().includes('steno');
    let isTabMatch = false;
    if (activeTab === 'live') {
      isTabMatch = isLive;
    } else if (activeTab === 'steno') {
      isTabMatch = isSteno && !isLive;
    } else {
      isTabMatch = !isSteno && !isLive;
    }
    if (!isTabMatch) return false;

    if (startDate) {
      const resultDate = new Date(r.date_taken);
      const filterStart = new Date(startDate);
      filterStart.setHours(0, 0, 0, 0);
      if (resultDate < filterStart) return false;
    }
    
    if (endDate) {
      const resultDate = new Date(r.date_taken);
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);
      if (resultDate > filterEnd) return false;
    }

    return true;
  });

  return (
    <div className="dashboard-page-container">
      <Header />
      
      {/* Blue Welcome Bar */}
      <div className="dashboard-welcome-bar">
        <div className="welcome-text-content">
          <h2>My Performance History</h2>
          <p>Review your past typing tests and track your progress over time.</p>
        </div>
      </div>

      <div className="dashboard-layout">
        <DashboardNav />
        <div className="dashboard-content" style={{ backgroundColor: '#fafafa' }}>
          <button className="btn-back-floating" style={{position: 'static', marginBottom: '20px', display: 'inline-block'}} onClick={() => navigate(-1)}>&larr; Back</button>

          <div className="available-tests-container" style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h2 className="explore-title" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: '#0b4bcc' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Past Test Result
            </h2>
            
            <div className="reports-filters" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
              <div className="reports-tabs" style={{ display: 'flex', gap: '10px' }}>
                <button
                  style={{ padding: '8px 16px', background: activeTab === 'typing' ? '#0b4bcc' : '#f1f5f9', color: activeTab === 'typing' ? 'white' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: activeTab === 'typing' ? 'bold' : 'normal', fontSize: '0.9rem' }}
                  onClick={() => setActiveTab('typing')}
                >
                  ⌨ Typing Reports
                </button>
                <button
                  style={{ padding: '8px 16px', background: activeTab === 'steno' ? '#0b4bcc' : '#f1f5f9', color: activeTab === 'steno' ? 'white' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: activeTab === 'steno' ? 'bold' : 'normal', fontSize: '0.9rem' }}
                  onClick={() => setActiveTab('steno')}
                >
                  🎙 Steno Reports
                </button>
                <button
                  style={{ padding: '8px 16px', background: activeTab === 'live' ? '#0b4bcc' : '#f1f5f9', color: activeTab === 'live' ? 'white' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: activeTab === 'live' ? 'bold' : 'normal', fontSize: '0.9rem' }}
                  onClick={() => setActiveTab('live')}
                >
                  🏆 Live Reports
                </button>
              </div>

              <div className="date-filter-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>From:</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', color: '#334155' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>To:</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', color: '#334155' }}
                  />
                </div>
                {(startDate || endDate) && (
                  <button 
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            {saveErrorBanner && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.88rem' }}>
                <strong>⚠ Save warning:</strong> {saveErrorBanner}
              </div>
            )}
            {fetchError && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.88rem' }}>
                <strong>⚠ Could not load results:</strong> {fetchError}
              </div>
            )}
            <div className="test-list custom-result-list">
              {loading ? (
                <p>Loading your results...</p>
              ) : filteredResults.length === 0 ? (
                <p>No tests found matching the selected criteria. {results.length > 0 && '(Try switching the Typing/Steno tab or clearing the date range.)'}</p>
              ) : (
                filteredResults.map((result) => {
                  const dateObj = new Date(result.date_taken);
                  const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                  const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={result.id} className="result-card-custom">
                      <div className="result-card-left">
                        <div className="result-icon-container">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                            <polyline points="9 10 11 12 15 8"></polyline>
                          </svg>
                        </div>
                        <div className="result-details-custom">
                          <h4 className="result-title-custom">{result.exam?.name || 'Self Practice'}</h4>
                          <div className="result-stats-custom">
                            <span className="stat-blue">{Math.round(result.nwpm)} WPM</span>
                            <span className="stat-blue">{parseFloat(result.accuracy).toFixed(2)}% Acc</span>
                          </div>
                        </div>
                      </div>

                      <div className="result-card-middle">
                        <div className="result-rank-badge">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                          <span>{result.rank ? `${result.rank}Th Rank` : 'Completed'}</span>
                        </div>
                        <div className="result-date-time">
                          <div className="datetime-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <span>{dateStr}</span>
                          </div>
                          <div className="datetime-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <span>{timeStr}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="result-card-right">
                        <button className="btn-view-reports-custom" onClick={() => handleViewResult(result)}>
                          View Reports
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyResults;
