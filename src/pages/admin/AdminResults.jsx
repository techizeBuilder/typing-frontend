import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resultService } from '../../services/api';
import './Admin.css';

const COURSES = [
  'Typing English',
  'Typing Hindi',
  'Steno English',
  'Steno Hindi',
];

const AdminResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [usernameSearch, setUsernameSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const data = await resultService.getAllResults();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setUsernameSearch('');
    setDateFrom('');
    setDateTo('');
    setCourseFilter('All');
    setModeFilter('All');
  };

  const hasActiveFilter = usernameSearch || dateFrom || dateTo || courseFilter !== 'All' || modeFilter !== 'All';

  const handleViewResult = (r) => {
    navigate('/result', {
      state: {
        gwpm: r.gwpm,
        nwpm: r.nwpm,
        accuracy: r.accuracy,
        fullErrors: r.full_errors,
        halfErrors: r.half_errors,
        totalStrokes: r.total_strokes,
        timeElapsed: r.time_elapsed,
        exam_name: r.exam ? r.exam.name : 'Practice Mode',
        date_taken: r.date_taken,
        studentName: r.user ? (r.user.name || r.user.user_id) : '—',
        rollNo: r.user ? r.user.user_id : '—',
        mode: r.mode,
        userInput: r.user_input,
        typedText: r.user_input,
        referenceWords: r.reference_words || [],
        referenceText: r.reference_words ? r.reference_words.join(' ') : '',
        wordStatuses: r.word_statuses || [],
        pattern: r.pattern_data,
      },
    });
  };

  const getModeLabel = (mode) => {
    if (!mode) return 'Typing';
    if (mode.toLowerCase().includes('steno')) return 'Steno';
    return 'Typing';
  };

  const filtered = results.filter((r) => {
    // Username / name search
    const uName = (r.user?.name || '').toLowerCase();
    const uId   = (r.user?.user_id || '').toLowerCase();
    const matchUsername =
      !usernameSearch ||
      uName.includes(usernameSearch.toLowerCase()) ||
      uId.includes(usernameSearch.toLowerCase());

    // Date range
    const taken = r.date_taken ? new Date(r.date_taken) : null;
    const matchFrom = !dateFrom || (taken && taken >= new Date(dateFrom));
    const matchTo   = !dateTo   || (taken && taken <= new Date(dateTo + 'T23:59:59'));

    // Course (student category)
    const matchCourse =
      courseFilter === 'All' || (r.user?.category || '') === courseFilter;

    // Mode (Typing / Steno)
    const matchMode =
      modeFilter === 'All' ||
      (modeFilter === 'Steno'  && getModeLabel(r.mode) === 'Steno') ||
      (modeFilter === 'Typing' && getModeLabel(r.mode) === 'Typing');

    return matchUsername && matchFrom && matchTo && matchCourse && matchMode;
  });

  const inputStyle = {
    padding: '7px 10px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    fontSize: '0.85rem',
    background: '#fff',
  };

  const labelStyle = {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    display: 'block',
    marginBottom: '4px',
  };

  return (
    <div className="admin-card">
      <header className="admin-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Typing &amp; Steno Results</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={clearFilters}
                style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                ✕ Clear Filters
              </button>
            )}
            <button
              onClick={fetchResults}
              style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* ── Filter Row ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', width: '100%', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>

          {/* Username */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px', flex: '1' }}>
            <label style={labelStyle}>Username / Login ID</label>
            <input
              type="text"
              placeholder="Search by name or login ID..."
              value={usernameSearch}
              onChange={(e) => setUsernameSearch(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Date From */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Date To */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Course */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '170px' }}>
            <label style={labelStyle}>Course</label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="All">All Courses</option>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Mode */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '140px' }}>
            <label style={labelStyle}>Mode</label>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="All">All Modes</option>
              <option value="Typing">Typing</option>
              <option value="Steno">Steno</option>
            </select>
          </div>
        </div>
      </header>

      <div style={{ margin: '10px 0', fontSize: '0.85rem', color: '#475569' }}>
        Showing <strong>{filtered.length}</strong> of <strong>{results.length}</strong> results
        {hasActiveFilter && <span style={{ marginLeft: '10px', color: '#2563eb', fontWeight: 600 }}>(filtered)</span>}
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Student Name</th>
            <th>Username</th>
            <th>Course</th>
            <th>Mode</th>
            <th>Exam</th>
            <th>NWPM</th>
            <th>GWPM</th>
            <th>Accuracy</th>
            <th>Errors</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="11">Loading results...</td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan="11" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No results found matching the selected filters.</td></tr>
          ) : (
            filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.date_taken ? new Date(r.date_taken).toLocaleDateString('en-IN') : '—'}</td>
                <td><strong>{r.user ? (r.user.name || '—') : '—'}</strong></td>
                <td>
                  <span style={{ fontFamily: 'monospace', background: '#eff6ff', padding: '2px 7px', borderRadius: '4px', fontSize: '0.78rem', color: '#1e40af', fontWeight: 600 }}>
                    {r.user ? (r.user.user_id || '—') : '—'}
                  </span>
                </td>
                <td>
                  {r.user?.category
                    ? <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 7px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{r.user.category}</span>
                    : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>}
                </td>
                <td>
                  <span className={`status-badge ${getModeLabel(r.mode) === 'Steno' ? 'pending' : 'active'}`}>
                    {r.mode || 'Typing'}
                  </span>
                </td>
                <td>{r.exam ? r.exam.name : <span style={{ color: '#94a3b8' }}>Practice</span>}</td>
                <td><strong>{r.nwpm}</strong></td>
                <td>{r.gwpm}</td>
                <td>{r.accuracy}%</td>
                <td style={{ whiteSpace: 'nowrap' }}>{r.full_errors || 0}F / {r.half_errors || 0}H</td>
                <td>
                  <button
                    className="btn-primary"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => handleViewResult(r)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminResults;
