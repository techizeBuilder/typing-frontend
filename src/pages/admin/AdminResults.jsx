import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { resultService, examService } from '../../services/api';
import { computeResultMetrics } from '../../utils/resultMetrics';
import Pagination from '../../components/Pagination';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
  const [testTypeFilter, setTestTypeFilter] = useState('All');
  const [examFilter, setExamFilter] = useState('All');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [examOptions, setExamOptions] = useState([]);
  // Guards against out-of-order responses when filters/page change quickly.
  const fetchIdRef = useRef(0);

  useEffect(() => { setPage(1); }, [usernameSearch, dateFrom, dateTo, courseFilter, testTypeFilter, examFilter]);

  // Exam names for the filter dropdown (small list, fetched once).
  useEffect(() => {
    examService.getExams()
      .then((exams) => {
        const names = Array.from(new Set((exams || []).map((e) => e.name).filter(Boolean))).sort();
        setExamOptions(['Practice', ...names]);
      })
      .catch(() => setExamOptions(['Practice']));
  }, []);

  const filterParams = () => ({
    search: usernameSearch || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    course: courseFilter !== 'All' ? courseFilter : undefined,
    testType:
      testTypeFilter === 'Preloaded' ? 'Pre-load Test'
      : testTypeFilter === 'Live' ? 'Live Test'
      : undefined,
    examName: examFilter !== 'All' ? examFilter : undefined,
  });

  // Filtering + pagination happen SERVER-SIDE: only the visible page of rows is
  // downloaded (the old code pulled every result ever recorded — tens of MB).
  // The username search is debounced so we don't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(fetchResults, usernameSearch ? 350 : 0);
    return () => clearTimeout(timer);
  }, [page, pageSize, usernameSearch, dateFrom, dateTo, courseFilter, testTypeFilter, examFilter]);

  const withMetrics = (rows) =>
    // Recompute NWPM/GWPM/accuracy from the stored raw data using the canonical
    // formula so the table matches the result detail view (the engine-stored
    // values can drift for typing results — see resultMetrics.js).
    (rows || []).map((r) => ({ ...r, _metrics: computeResultMetrics(r) }));

  const fetchResults = async () => {
    const fetchId = ++fetchIdRef.current;
    try {
      setLoading(true);
      const data = await resultService.getResultsPage({ page, pageSize, ...filterParams() });
      if (fetchId !== fetchIdRef.current) return; // a newer request superseded this one
      setResults(withMetrics(data?.rows));
      setTotal(Number(data?.total) || 0);
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  };

  const clearFilters = () => {
    setUsernameSearch('');
    setDateFrom('');
    setDateTo('');
    setCourseFilter('All');
    setTestTypeFilter('All');
    setExamFilter('All');
  };

  const hasActiveFilter = usernameSearch || dateFrom || dateTo || courseFilter !== 'All' || testTypeFilter !== 'All' || examFilter !== 'All';

  const handleViewResult = async (row) => {
    // The results list is fetched without the chapter's full passage text (it
    // would bloat every row); pull the complete record for the detail view.
    let r = row;
    try {
      const full = await resultService.getResultById(row.id);
      if (full) r = full;
    } catch {
      // Offline / fetch failure — fall back to the list row; the passage then
      // falls back to reference_words below.
    }
    // Only steno results use the StenoDiff view (driven by typedText + referenceText).
    // For typing results these must stay unset so ResultScreen renders the full
    // TypingPassageReview with its Test Analysis / Mistake / Compare tabs — matching
    // what the student sees on their own result screen.
    const isSteno = (r.mode || '').toLowerCase().includes('steno');
    // Full uploaded passage so the "Original Passage" column shows the complete text,
    // not just the (possibly trimmed) reference_words the student reached.
    const fullPassage = r.chapter?.content_text || (r.reference_words ? r.reference_words.join(' ') : '');
    navigate('/result', {
      state: {
        returnTo: '/admin/results',
        gwpm: r.gwpm,
        nwpm: r.nwpm,
        accuracy: r.accuracy,
        fullErrors: r.full_errors,
        halfErrors: r.half_errors,
        totalStrokes: r.total_strokes,
        timeElapsed: r.time_elapsed,
        testDurationMinutes: r.exam?.test_time_minutes || undefined,
        exam_name: r.exam ? r.exam.name : 'Practice Mode',
        chapter_no: r.chapter?.chapter_no || null,
        date_taken: r.date_taken,
        studentName: r.user ? (r.user.name || r.user.user_id) : '—',
        rollNo: r.user ? r.user.user_id : '—',
        mode: r.mode,
        userInput: r.user_input,
        referenceWords: r.reference_words || [],
        wordStatuses: r.word_statuses || [],
        pattern: r.pattern_data,
        originalPassage: fullPassage,
        ...(isSteno ? { typedText: r.user_input, referenceText: fullPassage } : {}),
      },
    });
  };

  // Exports cover ALL rows matching the current filters, not just the visible
  // page — fetched on demand so the heavy raw data is only downloaded when the
  // admin actually exports.
  const fetchAllFiltered = async () => {
    const data = await resultService.getResultsPage({ page: 1, pageSize: 0, ...filterParams() });
    return withMetrics(data?.rows);
  };

  const getExportRows = (rows) =>
    rows.map((r) => ({
      Date: r.date_taken ? new Date(r.date_taken).toLocaleDateString('en-IN') : '—',
      'Student Name': r.user?.name || '—',
      Username: r.user?.user_id || '—',
      Course: r.user?.category || '—',
      Mode: r.mode || 'Typing',
      'Test Type': r.test_type === 'Live Test' ? 'Live' : r.test_type === 'Pre-load Test' ? 'Preloaded' : '—',
      Exam: r.exam?.name || 'Practice',
      'Chapter No.': r.chapter?.chapter_no ? `#${r.chapter.chapter_no}` : '—',
      NWPM: r._metrics ? r._metrics.nwpm : r.nwpm,
      GWPM: r._metrics ? r._metrics.gwpm : r.gwpm,
      'Accuracy (%)': r._metrics ? r._metrics.accuracy : r.accuracy,
      'Full Errors': r._metrics ? r._metrics.fullErrors : (r.full_errors || 0),
      'Half Errors': r._metrics ? r._metrics.halfErrors : (r.half_errors || 0),
    }));

  const exportExcel = async () => {
    const rows = getExportRows(await fetchAllFiltered());
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `results_export_${Date.now()}.xlsx`);
  };

  const exportPDF = async () => {
    const rows = getExportRows(await fetchAllFiltered());
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(13);
    doc.text('Typing & Steno Results', 40, 36);
    doc.setFontSize(9);
    doc.text(`Exported: ${new Date().toLocaleString('en-IN')}  |  Total: ${rows.length} records`, 40, 52);
    autoTable(doc, {
      startY: 65,
      head: [Object.keys(rows[0] || {})],
      body: rows.map(Object.values),
      styles: { fontSize: 7.5, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });
    doc.save(`results_export_${Date.now()}.pdf`);
  };

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
              onClick={exportExcel}
              disabled={total === 0}
              style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: total === 0 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600, opacity: total === 0 ? 0.5 : 1 }}
            >
              ⬇ Excel
            </button>
            <button
              onClick={exportPDF}
              disabled={total === 0}
              style={{ padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: total === 0 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600, opacity: total === 0 ? 0.5 : 1 }}
            >
              ⬇ PDF
            </button>
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

          {/* Test Type */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '150px' }}>
            <label style={labelStyle}>Test Type</label>
            <select
              value={testTypeFilter}
              onChange={(e) => setTestTypeFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="All">All Types</option>
              <option value="Preloaded">Preloaded</option>
              <option value="Live">Live</option>
            </select>
          </div>

          {/* Exam */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '180px', flex: '1' }}>
            <label style={labelStyle}>Exam</label>
            <select
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="All">All Exams</option>
              {examOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {(() => {
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        return (
      <>
      <div style={{ margin: '10px 0', fontSize: '0.85rem', color: '#475569' }}>
        Showing <strong>{results.length}</strong> of <strong>{total}</strong> results
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
            <th>Test Type</th>
            <th>Exam</th>
            <th>Chapter No.</th>
            <th>NWPM</th>
            <th>GWPM</th>
            <th>Accuracy</th>
            <th>Errors</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="13">Loading results...</td></tr>
          ) : results.length === 0 ? (
            <tr><td colSpan="13" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No results found matching the selected filters.</td></tr>
          ) : (
            results.map((r) => (
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
                  <span className={`status-badge ${r.mode?.toLowerCase().includes('steno') ? 'pending' : 'active'}`}>
                    {r.mode || 'Typing'}
                  </span>
                </td>
                <td>
                  {r.test_type
                    ? <span style={{ background: r.test_type === 'Live Test' ? '#fef9c3' : '#dcfce7', color: r.test_type === 'Live Test' ? '#854d0e' : '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{r.test_type === 'Live Test' ? 'Live' : 'Preloaded'}</span>
                    : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>}
                </td>
                <td>{r.exam ? r.exam.name : <span style={{ color: '#94a3b8' }}>Practice</span>}</td>
                <td>
                  {r.chapter?.chapter_no
                    ? <span style={{ fontWeight: 700, color: '#1e40af' }}>#{r.chapter.chapter_no}</span>
                    : <span style={{ color: '#94a3b8' }}>—</span>}
                </td>
                <td><strong>{r._metrics ? r._metrics.nwpm : r.nwpm}</strong></td>
                <td>{r._metrics ? r._metrics.gwpm : r.gwpm}</td>
                <td>{r._metrics ? r._metrics.accuracy : r.accuracy}%</td>
                <td style={{ whiteSpace: 'nowrap' }}>{r._metrics ? r._metrics.fullErrors : (r.full_errors || 0)}F / {r._metrics ? r._metrics.halfErrors : (r.half_errors || 0)}H</td>
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
      <Pagination
        page={page} totalPages={totalPages} totalItems={total}
        pageSize={pageSize} onPageChange={setPage} onPageSizeChange={p => { setPageSize(p); setPage(1); }}
      />
      </>
        );
      })()}
    </div>
  );
};

export default AdminResults;
