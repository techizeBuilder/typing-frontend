import { useState, useEffect } from 'react';
import { chapterService, examService } from '../../services/api';
import { API_BASE_URL } from '../../config';
import mammoth from 'mammoth';
import './Admin.css';

const AdminChapters = () => {
  const [chapters, setChapters] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentChapter, setCurrentChapter] = useState(null);
  const [audioFile, setAudioFile] = useState(null);   // raw File object for steno
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    chapter_no: '',
    name: '',
    test_date: new Date().toISOString().split('T')[0],
    font_group: 'English Typing',
    test_type: 'Pre-load Test',
    exam_id: '',
    content_text: '',
  });

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    try {
      const [data, examData] = await Promise.all([
        chapterService.getChapters(),
        examService.getExams()
      ]);
      setChapters(data);
      setExams(examData);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
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
    setFormData({
      ...chapter,
      exam_id: chapter.exam?.id || chapter.exam_id || '',
      test_date: new Date(chapter.test_date).toISOString().split('T')[0]
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const { id, created_at, updated_at, audio_url, exam, ...cleanData } = formData;
      if (!cleanData.exam_id) cleanData.exam_id = null; // Handle empty selection
      
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
        font_group: 'English Typing', test_type: 'Pre-load Test', exam_id: '', content_text: '',
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
      fetchChapters();
    }
  };

  const isSteno = formData.font_group.includes('Steno');

  return (
    <div className="admin-card">
      <header className="admin-header">
        <h2>{currentChapter ? 'Edit Chapter' : 'Add Chapter (Typing/Steno)'}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search matching NO or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
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
                <input type="number" value={formData.chapter_no} onChange={(e) => setFormData({...formData, chapter_no: e.target.value})} placeholder="e.g. 101" required />
              </div>
              <div className="input-group">
                <label>Select Date</label>
                <input type="date" value={formData.test_date} onChange={(e) => setFormData({...formData, test_date: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Assign to Exam</label>
                <select value={formData.exam_id} onChange={(e) => setFormData({...formData, exam_id: e.target.value})}>
                  <option value="">-- No Exam (Independent) --</option>
                  {exams.map(exam => (
                    <option key={exam.id} value={exam.id}>{exam.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Font Group</label>
                <select value={formData.font_group} onChange={(e) => setFormData({...formData, font_group: e.target.value})}>
                  <option value="English Typing">English Typing</option>
                  <option value="Hindi Mangal">Hindi Mangal</option>
                  <option value="Hindi Kruti Dev">Hindi Kruti Dev</option>
                  <option value="Hindi Remington (GAIL)">Hindi Remington (GAIL)</option>
                  <option value="Steno English">Steno English</option>
                  <option value="Steno Hindi">Steno Hindi</option>
                </select>
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
                    fontFamily: ['Hindi Kruti Dev','Hindi Mangal','Hindi Remington (GAIL)'].includes(formData.font_group)
                      ? "'Noto Sans Devanagari', 'Mangal', sans-serif"
                      : 'inherit',
                    fontSize: ['Hindi Kruti Dev','Hindi Mangal','Hindi Remington (GAIL)'].includes(formData.font_group) ? '18px' : undefined,
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

      <table className="admin-table">
        <thead>
          <tr>
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
            <tr><td colSpan="7">Loading...</td></tr>
          ) : chapters.filter(c =>
            c.font_group?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(c.chapter_no).includes(searchTerm)
          ).map((c) => (
            <tr key={c.id}>
              <td>{c.id.substring(0, 8)}</td>
              <td>{c.chapter_no}</td>
              <td>{c.exam?.name || <span style={{color: '#94a3b8'}}>None</span>}</td>
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
    </div>
  );
};

export default AdminChapters;
