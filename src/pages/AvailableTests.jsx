import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardNav from '../components/DashboardNav';
import Header from '../components/Header';
import { chapterService, userService } from '../services/api';
import './StudentDashboard.css';
import './AvailableTests.css';

const AvailableTests = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { selectedMode, testType, selectedExam } = location.state || {};
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userProfile, setUserProfile] = useState(null);

  const moduleType = localStorage.getItem('moduleType') || 'typing';

  useEffect(() => {
    if (!selectedMode || !testType || !selectedExam) {
      // If accessed directly without state, redirect back to dashboard
      navigate('/dashboard');
      return;
    }
    fetchChapters();
  }, [selectedMode, testType, selectedExam, navigate]);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      const [data, profileData] = await Promise.all([
        chapterService.getChapters(selectedMode, testType, selectedExam.id),
        userService.getProfile().catch(() => null)
      ]);
      setChapters(data);
      if (profileData) setUserProfile(profileData);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = (chapter) => {
    const isSteno = selectedMode === 'Steno English' || selectedMode === 'Steno Hindi';
    navigate(isSteno ? '/steno-test' : '/test', {
      state: {
        exam: selectedExam,
        chapter: chapter,
        mode: selectedMode,
        testType: testType
      }
    });
  };

  const shiftDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isLiveTest = testType === 'Live Test';

  // Date filter applies ONLY for Live Tests
  const filteredChapters = isLiveTest
    ? chapters.filter((chapter) => {
        if (!chapter.test_date) return true;
        const cDate = new Date(chapter.test_date);
        return (
          cDate.getDate()     === selectedDate.getDate()     &&
          cDate.getMonth()    === selectedDate.getMonth()    &&
          cDate.getFullYear() === selectedDate.getFullYear()
        );
      })
    : chapters; // Pre-load: show all, no date filter

  // Determine how many tests are unlocked for the user. Default is 1 if not set by admin.
  const unlockedCount = userProfile?.live_tests_limit ?? 1;

  return (
    <div className="dashboard-page-container">
      <Header />
      
      <div className="dashboard-welcome-bar">
        <div className="welcome-text-content">
          <h2>Available Tests</h2>
          <p>Browse and practice exercises for {selectedMode}</p>
        </div>
      </div>

      <div className="dashboard-layout">
        <DashboardNav />

        <div className="available-tests-wrapper">
          <button
            className="custom-tab-btn"
            style={{ marginBottom: '10px', backgroundColor: '#e2e8f0', color: '#334155', padding: '6px 14px', fontSize: '0.85rem' }}
            onClick={() => navigate('/dashboard')}
          >
            &larr; Back to Dashboard
          </button>

          <div className="page-header">
            <h1>{testType === 'Live Test' ? 'Live Test' : testType}</h1>
            <p>Take Tests Daily & Improve Your Speed & Accuracy</p>
          </div>

          {/* Date selector — Live Test only */}
          {isLiveTest && (
            <div className="date-selector-bar">
              <button className="date-btn" onClick={() => shiftDate(-1)}>&lt;</button>
              <div className="date-display">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <button className="date-btn" onClick={() => shiftDate(1)}>&gt;</button>
            </div>
          )}

          <div className="tests-table-container">
            {loading ? (
              <p style={{ padding: '20px', textAlign: 'center' }}>Loading available tests...</p>
            ) : (
              <table className="tests-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Exam No</th>
                    <th>Exam Name</th>
                    <th>Exam Start</th>
                    <th>Exam end</th>
                    <th>Language</th>
                    <th>Duration</th>
                    <th>Rank</th>
                    <th>Result</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChapters.length === 0 ? (
                    <tr>
                      <td colSpan="10">
                        {isLiveTest
                          ? `No live chapters found for ${selectedMode} on this date.`
                          : `No exercises found for ${selectedMode}.`}
                      </td>
                    </tr>
                  ) : (
                    filteredChapters.map((chapter, index) => (
                      <tr key={chapter.id}>
                        <td>{String(index + 1).padStart(2, '0')}</td>
                        <td>{selectedExam?.id?.substring(0, 5) || '76299'}</td>
                        <td>{selectedExam?.name}</td>
                        <td>12:00 AM</td>
                        <td>11:59 PM</td>
                        <td>{selectedMode.includes('Hindi') ? 'Hindi' : 'English'}</td>
                        <td>{selectedExam?.test_time_minutes} Min</td>
                        <td>-</td>
                        <td>-</td>
                        <td>
                          {index < unlockedCount ? (
                            <button className="btn-start-table" onClick={() => handleStartTest(chapter)}>Start</button>
                          ) : (
                            <button className="btn-locked-table">
                              Locked 
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="info-cards-container">
            <div className="info-card green">
              <div className="info-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <h3>Daily Free Test(s)</h3>
              <p>You have {unlockedCount} unlocked test{unlockedCount !== 1 ? 's' : ''} available per day. Beyond this limit, tests remain locked unless updated by your administrator.</p>
            </div>
            <div className="info-card blue">
              <div className="info-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </div>
              <h3>About Results</h3>
              <p>Your latest result will be shown here. If you give the same test again, only the latest result will be displayed.</p>
            </div>
            <div className="info-card purple">
              <div className="info-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 21h8m-4-4v4m-5-4l-3-3m11 3l3-3M6 10h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h3>About Rank</h3>
              <p>Rank will be shown behind the result. Ranks are visible in the evening (7:00 PM To 10 PM) for all students who took the test throughout the day</p>
            </div>
          </div>

          <div className="reattempt-banner">
            <div className="reattempt-left">
              <div className="reattempt-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
              </div>
              <div className="reattempt-text">
                <h3>Re-attempt Option</h3>
                <p>You Can Re-Attempt A Test Upto 3 Times</p>
              </div>
            </div>
            <div className="reattempt-right">
              <div className="attempts-left">Attempts Left: 2/3</div>
              <button className="btn-reattempt">Re-Attempt</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AvailableTests;
