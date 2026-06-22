import { useState, useEffect } from 'react';
import { chapterService, examService } from '../../services/api';
import { API_BASE_URL } from '../../config';
import { fontFamilyForFontGroup, fontFamilyForHindiType } from '../../utils/hindiFonts';
import mammoth from 'mammoth';
import Pagination from '../../components/Pagination';
import './Admin.css';

const AdminChapters = () => {
  const [chapters, setChapters] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [testTypeFilter, setTestTypeFilter] = useState('All');
  const [fontGroupFilter, setFontGroupFilter] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  const [chapPage, setChapPage] = useState(1);
  const [chapPageSize, setChapPageSize] = useState(20);

  useEffect(() => { setChapPage(1); }, [searchTerm, testTypeFilter, fontGroupFilter, filterDate]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [audioFile, setAudioFile] = useState(null);   // raw File object for steno
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    chapter_no: '',
    name: '',
    test_date: new Date().toISOString().split('T')[0],
    font_group: 'English Typing',
    test_type: 'Pre-load Test',
    exam_ids: [],
    content_text: '',
  });
  const [examDropdownOpen, setExamDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    try {
      const data = await chapterService.getChapters();
      // Newest chapters first
      setChapters([...data].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
    try {
      const examData = await examService.getExams();
      setExams(Array.isArray(examData) ? examData : []);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const handleTextFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, content_text: event.target.result }));
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: event.target.result });
          setFormData(prev => ({ ...prev, content_text: result.value }));
        } catch (error) {
          console.error("Error reading Word document", error);
          alert("Could not extract text from Word document.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Unsupported file format. Please upload .txt or .docx");
    }
  };

  const handleEdit = (chapter) => {
    setCurrentChapter(chapter);
    setAudioFile(null);
    const existingIds = Array.isArray(chapter.exam_ids) && chapter.exam_ids.length > 0
      ? chapter.exam_ids
      : (chapter.exam?.id || chapter.exam_id ? [chapter.exam?.id || chapter.exam_id] : []);
    setFormData({
      ...chapter,
      exam_ids: existingIds,
      test_date: new Date(chapter.test_date).toISOString().split('T')[0]
    });
    setShowForm(true);
  };

  const toggleExamId = (id) => {
    setFormData(prev => {
      const set = new Set(prev.exam_ids || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...prev, exam_ids: Array.from(set) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const { id, created_at, updated_at, audio_url, exam, exams: _exams, ...cleanData } = formData;
      const ids = Array.isArray(cleanData.exam_ids) ? cleanData.exam_ids.filter(Boolean) : [];
      cleanData.exam_ids = ids;
      cleanData.exam_id = ids.length > 0 ? ids[0] : null;

      // The Hindi-Steno font columns are opt-in: only Steno chapters send them, so
      // existing English/Hindi typing chapters still save on databases where the
      // language_type / hindi_font_type migration has not been applied yet.
      if ((cleanData.font_group || '').includes('Steno')) {
        cleanData.language_type   = cleanData.font_group === 'Steno Hindi' ? 'Hindi' : 'English';
        cleanData.hindi_font_type = cleanData.font_group === 'Steno Hindi'
          ? (cleanData.hindi_font_type || 'Mangal')
          : null;
      } else {
        delete cleanData.language_type;
        delete cleanData.hindi_font_type;
      }

      let savedId = currentChapter?.id;

      if (currentChapter) {
        await chapterService.updateChapter(currentChapter.id, cleanData);
      } else {
        const created = await chapterService.createChapter(cleanData);
        savedId = created.id;
      }

      // Upload audio file separately if one was selected
      if (audioFile && savedId) {
        await chapterService.uploadAudio(savedId, audioFile);
      }

      setShowForm(false);
      setCurrentChapter(null);
      setAudioFile(null);
      setFormData({
        chapter_no: '', name: '',
        test_date: new Date().toISOString().split('T')[0],
        font_group: 'English Typing', test_type: 'Pre-load Test', exam_ids: [], content_text: '',
      });
      fetchChapters();
    } catch (error) {
      alert('Error saving chapter: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this?')) {
      await chapterService.deleteChapter(id);
      setSelectedIds(prev => prev.filter(sid => sid !== id));
      fetchChapters();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected chapter(s)? This cannot be undone.`)) return;
    try {
      await Promise.all(selectedIds.map(id => chapterService.deleteChapter(id)));
      setSelectedIds([]);
      fetchChapters();
    } catch (err) {
      alert('Error deleting some chapters: ' + err.message);
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const isSteno = formData.font_group.includes('Steno');

  // Editor font so pasted Hindi renders correctly. Steno Hindi uses the per-chapter
  // hindi_font_type; everything else is keyed off font_group.
  const contentFontFamily = formData.font_group === 'Steno Hindi'
    ? (fontFamilyForHindiType(formData.hindi_font_type) || 'inherit')
    : (fontFamilyForFontGroup(formData.font_group) || 'inherit');
  const useHindiFont = contentFontFamily !== 'inherit';

  // Only show exams that support the selected font group
  const filteredExams = exams.filter(exam => {
    const groups = Array.isArray(exam.font_groups) && exam.font_groups.length > 0
      ? exam.font_groups
      : (exam.font_group ? [exam.font_group] : []);
    return groups.length === 0 || groups.includes(formData.font_group);
  });

  return (
    <div className="admin-card">
      <header className="admin-header">
        <h2>{currentChapter ? 'Edit Chapter' : 'Add Chapter (Typing/Steno)'}</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={testTypeFilter}
            onChange={(e) => setTestTypeFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="All">All Test Types</option>
            <option value="Pre-load Test">Pre-load Test</option>
            <option value="Live Test">Live Test</option>
          </select>
          <select
            value={fontGroupFilter}
            onChange={(e) => setFontGroupFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="All">All Font Groups</option>
            <option value="English Typing">English Typing</option>
            <option value="Hindi Mangal">Hindi Mangal</option>
            <option value="Hindi Kruti Dev">Hindi Kruti Dev</option>
            <option value="Hindi Remington (GAIL)">Hindi Remington (GAIL)</option>
            <option value="Steno English">Steno English</option>
            <option value="Steno Hindi">Steno Hindi</option>
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            title="Filter by Test Date (Live Test date wise)"
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          {filterDate && (
            <button type="button" onClick={() => setFilterDate('')} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
              Clear Date
            </button>
          )}
          <input
            type="text"
            placeholder="Search matching NO or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              style={{ padding: '8px 14px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setCurrentChapter(null); setAudioFile(null); }}>
            {showForm ? 'Cancel' : '+ Add Chapter'}
          </button>
        </div>
      </header>

      {showForm && (
        <div className="admin-form-container">
          <form onSubmit={handleSubmit} className="admin-grid-form">
            <div className="form-section">
              <div className="input-group">
                <label>Chapter No</label>
                <input type="text" value={formData.chapter_no} onChange={(e) => setFormData({...formData, chapter_no: e.target.value})} placeholder="e.g. 101, A-1, CH-01" required />
              </div>
              <div className="input-group">
                <label>Select Date</label>
                <input type="date" value={formData.test_date} onChange={(e) => setFormData({...formData, test_date: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Font Group</label>
                <select
                  value={formData.font_group}
                  onChange={(e) => {
                    const fg = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      font_group: fg,
                      exam_ids: [],
                      // Default the Steno Hindi font picker; language_type + final value
                      // are derived on submit (and only sent for Steno chapters).
                      hindi_font_type: fg === 'Steno Hindi' ? (prev.hindi_font_type || 'Mangal') : null,
                    }));
                  }}
                >
                  <option value="English Typing">English Typing</option>
                  <option value="Hindi Mangal">Hindi Mangal</option>
                  <option value="Hindi Kruti Dev">Hindi Kruti Dev</option>
                  <option value="Hindi Remington (GAIL)">Hindi Remington (GAIL)</option>
                  <option value="Steno English">Steno English</option>
                  <option value="Steno Hindi">Steno Hindi</option>
                </select>
              </div>

              {/* Steno Hindi → choose the Hindi font standard the student types/views in */}
              {formData.font_group === 'Steno Hindi' && (
                <div className="input-group">
                  <label>Hindi Font Type</label>
                  <select
                    value={formData.hindi_font_type || 'Mangal'}
                    onChange={(e) => setFormData({ ...formData, hindi_font_type: e.target.value })}
                  >
                    <option value="Mangal">Hindi Mangal (Unicode)</option>
                    <option value="KrutiDev">Kruti Dev</option>
                    <option value="RemingtonGail">Remington Gail</option>
                  </select>
                </div>
              )}
              <div className="input-group">
                <label>Assign to Exam</label>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setExamDropdownOpen(o => !o)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      color: '#0f172a',
                    }}
                  >
                    {(() => {
                      const selected = formData.exam_ids || [];
                      if (selected.length === 0) return '-- No Exam (Independent) --';
                      if (selected.length === filteredExams.length && filteredExams.length > 0) return 'All Exams Selected';
                      const names = filteredExams.filter(e => selected.includes(e.id)).map(e => e.name);
                      if (names.length <= 2) return names.join(', ');
                      return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
                    })()}
                    <span style={{ float: 'right', color: '#64748b' }}>▾</span>
                  </button>
                  {examDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        marginTop: '2px',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        zIndex: 10,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderBottom: '1px solid #e2e8f0',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: '#f8fafc',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={filteredExams.length > 0 && filteredExams.every(e => (formData.exam_ids || []).includes(e.id))}
                          onChange={() => {
                            const allIds = filteredExams.map(e => e.id);
                            const allSelected = allIds.every(id => (formData.exam_ids || []).includes(id));
                            setFormData(prev => ({ ...prev, exam_ids: allSelected ? [] : allIds }));
                          }}
                        />
                        Select All
                      </label>
                      {filteredExams.map(exam => (
                        <label
                          key={exam.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={(formData.exam_ids || []).includes(exam.id)}
                            onChange={() => toggleExamId(exam.id)}
                          />
                          {exam.name}
                        </label>
                      ))}
                      {filteredExams.length === 0 && (
                        <div style={{ padding: '10px', color: '#94a3b8', fontSize: '0.85rem' }}>No exams support this font group</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="input-group">
                <label>Test Type</label>
                <select value={formData.test_type} onChange={(e) => setFormData({...formData, test_type: e.target.value})}>
                  <option value="Pre-load Test">Pre-load Test</option>
                  <option value="Live Test">Live Test</option>
                </select>
              </div>
            </div>

            <div className="form-section">
              <div className="input-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    Content (Text — used for result comparison)
                    {formData.font_group === 'Hindi Kruti Dev' && <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: '#fef9c3', color: '#713f12', padding: '2px 6px', borderRadius: '4px' }}>⌨ Kruti Dev layout active</span>}
                    {formData.font_group === 'Hindi Mangal' && <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: '#eff6ff', color: '#1e3a8a', padding: '2px 6px', borderRadius: '4px' }}>🌐 Use Windows Hindi IME</span>}
                    {formData.font_group === 'Hindi Remington (GAIL)' && <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: '#f0fff4', color: '#14532d', padding: '2px 6px', borderRadius: '4px' }}>⌨ Remington GAIL layout active</span>}
                    {isSteno && <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: '#f0fdf4', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>🎙 Steno: text hidden from student, used for scoring only</span>}
                    {formData.font_group === 'Steno Hindi' && <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: '#fef9c3', color: '#713f12', padding: '2px 6px', borderRadius: '4px' }}>⌨ Hindi font: {formData.hindi_font_type || 'Mangal'}</span>}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Or Upload File (.txt, .docx):</span>
                    <input type="file" accept=".txt,.docx" onChange={handleTextFileUpload} style={{ fontSize: '0.8rem', width: '200px' }} />
                  </div>
                </label>
                <textarea
                  rows="10"
                  value={formData.content_text}
                  onChange={(e) => setFormData({...formData, content_text: e.target.value})}
                  placeholder={isSteno ? "Paste the dictation transcript here (hidden from student, used for scoring only)" : "Paste content here or upload a .txt/.docx file..."}
                  spellCheck={false}
                  lang={formData.font_group === 'Hindi Mangal' ? 'hi' : 'en'}
                  style={{
                    // Kruti Dev / Remington are legacy glyph fonts (Hindi glyphs at ASCII
                    // positions) and MUST render in the Kruti Dev font or pasted text shows
                    // as raw English (e.g. "mik/;{k"). Mangal is true Unicode Devanagari.
                    // The stored value is never transformed — this only controls display.
                    fontFamily: contentFontFamily,
                    fontSize: useHindiFont ? '18px' : undefined,
                    lineHeight: 1.8,
                  }}
                  required
                />
              </div>

              {isSteno && (
                <div className="input-group">
                  <label style={{ fontWeight: 600, color: '#166534' }}>🎙 Steno Audio Dictation (MP3 / WAV / OGG)</label>
                  {/* Show existing audio if editing */}
                  {currentChapter?.audio_url && !audioFile && (
                    <div style={{ marginBottom: '8px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <strong>Current audio:</strong>{' '}
                      <audio controls src={`${API_BASE_URL}${currentChapter.audio_url}`} style={{ verticalAlign: 'middle', height: '28px' }} />
                      <span style={{ marginLeft: '8px', color: '#16a34a' }}>✔ Uploaded</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/*"
                    onChange={(e) => setAudioFile(e.target.files[0] || null)}
                    style={{ fontSize: '0.9rem' }}
                  />
                  {audioFile && (
                    <p style={{ marginTop: '6px', color: '#16a34a', fontSize: '0.85rem' }}>
                      ✔ Selected: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB) — will upload on Save
                    </p>
                  )}
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                    This audio will be played to the student during the steno test. Text above is used for grading only and is hidden from the student.
                  </p>
                </div>
              )}
            </div>

            <div className="form-actions-full">
              <button type="submit" className="btn-primary" disabled={uploading}>
                {uploading ? 'Saving & Uploading...' : 'Save Chapter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {(() => {
        const visibleChapters = chapters
          .filter(c => testTypeFilter === 'All' || c.test_type === testTypeFilter)
          .filter(c => fontGroupFilter === 'All' || c.font_group === fontGroupFilter)
          .filter(c => {
            if (!filterDate) return true;
            const chapDate = new Date(c.test_date).toISOString().split('T')[0];
            return chapDate === filterDate;
          })
          .filter(c =>
            !searchTerm ||
            c.font_group?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(c.chapter_no).includes(searchTerm)
          );
        const chapTotalPages = Math.max(1, Math.ceil(visibleChapters.length / chapPageSize));
        const pagedChapters = visibleChapters.slice((chapPage - 1) * chapPageSize, chapPage * chapPageSize);
        const visibleIds = pagedChapters.map(c => c.id);
        const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
        const toggleAll = () => {
          if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
          } else {
            setSelectedIds(prev => [...new Set([...prev, ...visibleIds])]);
          }
        };
        return (
          <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    title="Select all on page"
                  />
                </th>
                <th>ID</th>
                <th>No</th>
                <th>Exam</th>
                <th>Type</th>
                <th>Font Group</th>
                <th>Audio</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9">Loading...</td></tr>
              ) : pagedChapters.map((c) => (
                <tr key={c.id} style={selectedIds.includes(c.id) ? { background: '#fef3c7' } : {}}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleSelectId(c.id)}
                    />
                  </td>
                  <td>{c.id.substring(0, 8)}</td>
                  <td>{c.chapter_no}</td>
                  <td>
                    {(() => {
                      const names = Array.isArray(c.exams) && c.exams.length > 0
                        ? c.exams.map(e => e?.name).filter(Boolean)
                        : (c.exam?.name ? [c.exam.name] : []);
                      if (names.length === 0) return <span style={{color: '#94a3b8'}}>None</span>;
                      return (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {names.map((n, i) => (
                            <span key={i} style={{ background: '#eff6ff', color: '#1e3a8a', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #bfdbfe' }}>
                              {n}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td><span className={`status-badge ${c.test_type === 'Live Test' ? 'active' : 'pending'}`}>{c.test_type}</span></td>
                  <td><span className="badge-control">{c.font_group}</span></td>
                  <td>
                    {c.audio_url
                      ? <span style={{ color: '#16a34a', fontSize: '0.8rem' }}>🎙 Audio</span>
                      : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>}
                  </td>
                  <td>{new Date(c.test_date).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-action btn-edit" onClick={() => handleEdit(c)}>Edit</button>
                    <button className="btn-action btn-delete" onClick={() => handleDelete(c.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={chapPage} totalPages={chapTotalPages} totalItems={visibleChapters.length}
            pageSize={chapPageSize} onPageChange={setChapPage} onPageSizeChange={p => { setChapPageSize(p); setChapPage(1); }}
          />
          </>
        );
      })()}
    </div>
  );
};

export default AdminChapters;
