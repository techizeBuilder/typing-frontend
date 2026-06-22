import { useState, useEffect, useMemo } from 'react';
import { resultService } from '../../services/api';

const TOP_N = 25;

// Local YYYY-MM-DD for date inputs (en-CA formats as ISO, in local time).
const todayStr = () => new Date().toLocaleDateString('en-CA');

// Admin Live Test leaderboard. Shows Live Test results ranked by Net Speed (NWPM),
// deduplicated to each student's best attempt, with an exam filter and a date-range
// filter. Displays the Top 25 ranked students plus the total number of students who
// appeared for the current filter selection.
const AdminLeaderboard = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examFilter, setExamFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const range = {};
      if (dateFrom) range.from = dateFrom;
      if (dateTo) range.to = dateTo;
      const useRange = range.from || range.to;
      const data = await resultService.getLeaderboard(useRange ? undefined : 'today', useRange ? range : undefined);
      setRawData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setRawData([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh whenever the date range changes (and on first mount).
  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  // Unique exam names for the dropdown
  const examOptions = useMemo(
    () => Array.from(new Set(rawData.map(r => r.exam_name || 'Self Practice'))).sort(),
    [rawData],
  );

  // Filter by exam → keep each student's best (rows arrive NWPM-desc) → derive the
  // total participant count and the Top 25.
  const { ranked, participantCount } = useMemo(() => {
    const filtered = examFilter === 'All'
      ? rawData
      : rawData.filter(r => (r.exam_name || 'Self Practice') === examFilter);
    const seen = new Set();
    const deduped = [];
    for (const row of filtered) {
      const key = row.user_id || row.username;
      if (key && !seen.has(key)) {
        seen.add(key);
        deduped.push(row);
      }
    }
    return { ranked: deduped.slice(0, TOP_N), participantCount: deduped.length };
  }, [rawData, examFilter]);

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const rangeLabel = dateFrom && dateTo
    ? (dateFrom === dateTo ? fmt(dateFrom) : `${fmt(dateFrom)} – ${fmt(dateTo)}`)
    : (dateFrom ? `from ${fmt(dateFrom)}` : dateTo ? `until ${fmt(dateTo)}` : 'all dates');

  const th = { padding: '13px 18px', fontWeight: 'bold', color: '#475569', textAlign: 'left' };
  const td = { padding: '13px 18px' };
  const dateInput = { padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', background: '#fff' };

  return (
    <div className="admin-card">
      <header className="admin-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0 }}>🏆 Live Test Leaderboard</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Top {TOP_N} by Net Speed · {rangeLabel}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>From:</label>
            <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} style={dateInput} />
            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>To:</label>
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} style={dateInput} />
            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Exam:</label>
            <select
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', background: '#fff', minWidth: '160px' }}
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

        {/* Total participants for the current exam + date selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 16px' }}>
          <span style={{ fontSize: '0.85rem', color: '#1e40af' }}>
            {examFilter === 'All' ? 'Total students appeared' : `Students appeared for "${examFilter}"`}:
          </span>
          <strong style={{ fontSize: '1.05rem', color: '#0b4bcc' }}>{participantCount}</strong>
          {participantCount > TOP_N && (
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>(showing top {TOP_N})</span>
          )}
        </div>
      </header>

      {loading ? (
        <p style={{ padding: '20px' }}>Loading leaderboard...</p>
      ) : ranked.length === 0 ? (
        <p style={{ padding: '20px', color: '#64748b' }}>
          No Live Test records found for {rangeLabel}{examFilter !== 'All' ? ` for "${examFilter}"` : ''} yet.
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
              {ranked.map((row, index) => (
                <tr
                  key={row.user_id || row.username || index}
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
