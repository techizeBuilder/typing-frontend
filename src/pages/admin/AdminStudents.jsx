import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, resultService } from '../../services/api';
import './Admin.css';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Tests Modal State
  const [selectedStudentForTests, setSelectedStudentForTests] = useState(null);
  const [studentTests, setStudentTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [activeTestTab, setActiveTestTab] = useState('typing'); // 'typing' or 'steno'
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [formData, setFormData] = useState({
    status: 'Active',
    validity_start: '',
    validity_end: '',
    allowed_login_time_start: '',
    allowed_login_time_end: '',
    password_hash: '',
    last_fees_submitted_date: '',
    fees_amount: '',
    roll_no: '',
    live_tests_limit: ''
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await userService.getUsers();
      setStudents(data); 
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrorMsg(error.message + ' (Check if Backend is running)');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (student) => {
    const newStatus = student.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await userService.updateUser(student.id, { status: newStatus });
      fetchStudents();
    } catch (error) {
      alert('Error updating status: ' + error.message);
    }
  };

  const openEditModal = (student) => {
    setCurrentStudent(student);
    setFormData({
      status: student.status || 'Active',
      validity_start: student.validity_start ? new Date(student.validity_start).toISOString().split('T')[0] : '',
      validity_end: student.validity_end ? new Date(student.validity_end).toISOString().split('T')[0] : '',
      allowed_login_time_start: student.allowed_login_time_start || '',
      allowed_login_time_end: student.allowed_login_time_end || '',
      password_hash: '',
      last_fees_submitted_date: student.last_fees_submitted_date ? new Date(student.last_fees_submitted_date).toISOString().split('T')[0] : '',
      fees_amount: student.fees_amount || '',
      roll_no: student.roll_no || '',
      live_tests_limit: student.live_tests_limit !== null && student.live_tests_limit !== undefined ? student.live_tests_limit : ''
    });
    setShowEditModal(true);
  };

  const generatePassword = () => {
    const randomPass = Math.random().toString(36).slice(-8);
    setFormData(prev => ({ ...prev, password_hash: randomPass }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      
      // Clean up empty fields
      if (!payload.validity_start) payload.validity_start = null;
      if (!payload.validity_end) payload.validity_end = null;
      if (!payload.allowed_login_time_end) payload.allowed_login_time_end = null;
      if (!payload.last_fees_submitted_date) payload.last_fees_submitted_date = null;
      if (payload.fees_amount === '') payload.fees_amount = null;
      if (payload.live_tests_limit === '') {
        payload.live_tests_limit = null;
      } else {
        payload.live_tests_limit = parseInt(payload.live_tests_limit, 10);
      }
      if (!payload.password_hash || payload.password_hash.trim() === '') {
        delete payload.password_hash;
      }

      await userService.updateUser(currentStudent.id, payload);
      setShowEditModal(false);
      fetchStudents();
    } catch (error) {
      alert('Error updating user: ' + (error.response?.data?.message || error.message));
    }
  };

  const openTestsModal = async (student) => {
    setSelectedStudentForTests(student);
    setActiveTestTab('typing'); // reset tab on open
    setLoadingTests(true);
    try {
      const results = await resultService.getUserResults(student.id);
      setStudentTests(results);
    } catch (err) {
      alert("Error fetching tests: " + err.message);
    } finally {
      setLoadingTests(false);
    }
  };

  const handleViewResult = (test) => {
    navigate('/result', {
      state: {
        gwpm: test.gwpm,
        nwpm: test.nwpm,
        accuracy: test.accuracy,
        fullErrors: test.full_errors,
        halfErrors: test.half_errors,
        totalStrokes: test.total_strokes,
        timeElapsed: test.time_elapsed,
        exam_name: test.exam ? test.exam.name : 'Practice Mode',
        date_taken: test.date_taken,
        studentName: selectedStudentForTests.name,
        rollNo: selectedStudentForTests.user_id,
        mode: test.mode,
        userInput: test.user_input,
        typedText: test.user_input, // for steno compatibility
        referenceWords: test.reference_words || [],
        referenceText: test.reference_words ? test.reference_words.join(' ') : '', // for steno compatibility
        wordStatuses: test.word_statuses || [],
        pattern: test.pattern_data,
      }
    });
  };

  return (
    <div className="admin-card">
      <header className="admin-header">
        <h2>Student Management</h2>
        <div className="admin-stats-bar" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div>Total Found: <strong>{students.length}</strong></div>
          <input 
            type="text" 
            placeholder="Search matching name or phone..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button onClick={fetchStudents} style={{ fontSize: '0.7rem' }}>🔄 Refresh</button>
        </div>
      </header>
      
      {errorMsg && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {showEditModal && (
        <div className="admin-form-container pattern-setup" style={{ marginBottom: '20px' }}>
          <h3>Edit Student Details: {currentStudent.name}</h3>
          <form onSubmit={handleEditSubmit} className="admin-grid-form">
             <div className="form-section">
                <h4>Status & Validity</h4>
                <div className="input-group">
                  <label>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Validity End Date</label>
                  <input type="date" value={formData.validity_end} onChange={(e) => setFormData({...formData, validity_end: e.target.value})} />
                </div>
             </div>
             
             <div className="form-section">
                <h4>Fee & Academic Details</h4>
                <div className="admin-inline-group">
                  <div className="input-group">
                    <label>Roll No</label>
                    <input type="text" value={formData.roll_no} onChange={(e) => setFormData({...formData, roll_no: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>Live Tests Per Day Limit</label>
                    <input type="number" min="0" placeholder="Empty = Default 1" value={formData.live_tests_limit} onChange={(e) => setFormData({...formData, live_tests_limit: e.target.value})} />
                  </div>
                </div>
                <div className="admin-inline-group">
                  <div className="input-group">
                    <label>Last Fees Submitted Date</label>
                    <input type="date" value={formData.last_fees_submitted_date} onChange={(e) => setFormData({...formData, last_fees_submitted_date: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>Fees Amount</label>
                    <input type="number" step="0.01" value={formData.fees_amount} onChange={(e) => setFormData({...formData, fees_amount: e.target.value})} />
                  </div>
                </div>
             </div>

             <div className="form-section">
                <h4>Login Control</h4>
                <div className="admin-inline-group">
                  <div className="input-group">
                    <label>Allowed Start Time (e.g. 09:00)</label>
                    <input type="time" value={formData.allowed_login_time_start} onChange={(e) => setFormData({...formData, allowed_login_time_start: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>Allowed End Time (e.g. 17:00)</label>
                    <input type="time" value={formData.allowed_login_time_end} onChange={(e) => setFormData({...formData, allowed_login_time_end: e.target.value})} />
                  </div>
                </div>
                <p style={{fontSize: '0.8rem', color: '#666', marginTop: '5px'}}>Leave time inputs empty to allow 24/7 access.</p>
                
                <div className="input-group" style={{ marginTop: '20px' }}>
                  <label>Override Password</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                     <input 
                       type="text" 
                       placeholder="Leave blank to keep unchanged" 
                       value={formData.password_hash} 
                       onChange={(e) => setFormData({...formData, password_hash: e.target.value})} 
                       style={{ flex: 1 }}
                     />
                     <button type="button" onClick={generatePassword} className="btn-secondary" style={{ padding: '0 15px' }}>Generate Random</button>
                  </div>
                </div>
             </div>

             <div className="form-actions-full" style={{ gap: '10px' }}>
               <button type="submit" className="btn-primary">Save Changes</button>
               <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
             </div>
          </form>
        </div>
      )}

      {selectedStudentForTests && (
        <div className="admin-form-container pattern-setup" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Tests History: {selectedStudentForTests.name}</h3>
            <button className="btn-secondary" onClick={() => setSelectedStudentForTests(null)}>Close X</button>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', marginTop: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            <button 
              style={{ padding: '6px 12px', background: activeTestTab === 'typing' ? '#2563eb' : '#f1f5f9', color: activeTestTab === 'typing' ? 'white' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: activeTestTab === 'typing' ? 'bold' : 'normal', fontSize: '0.9rem' }}
              onClick={() => setActiveTestTab('typing')}
            >
              ⌨ Typing Reports
            </button>
            <button 
              style={{ padding: '6px 12px', background: activeTestTab === 'steno' ? '#2563eb' : '#f1f5f9', color: activeTestTab === 'steno' ? 'white' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: activeTestTab === 'steno' ? 'bold' : 'normal', fontSize: '0.9rem' }}
              onClick={() => setActiveTestTab('steno')}
            >
              🎙 Steno Reports
            </button>
          </div>

          {loadingTests ? (
            <p>Loading tests...</p>
          ) : studentTests.filter(t => activeTestTab === 'steno' ? t.mode?.toLowerCase().includes('steno') : !t.mode?.toLowerCase().includes('steno')).length === 0 ? (
            <p style={{marginTop: '10px'}}>No {activeTestTab === 'steno' ? 'Steno' : 'Typing'} tests taken yet.</p>
          ) : (
            <table className="admin-table" style={{ marginTop: '10px' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Exam</th>
                  <th>Speed (NWPM)</th>
                  <th>Accuracy</th>
                  <th>Errors</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {studentTests.filter(t => activeTestTab === 'steno' ? t.mode?.toLowerCase().includes('steno') : !t.mode?.toLowerCase().includes('steno')).map(test => (
                  <tr key={test.id}>
                    <td>{new Date(test.date_taken).toLocaleDateString()}</td>
                    <td>{test.exam ? test.exam.name : 'Practice'}<br/><span style={{fontSize: '0.75rem', color: '#64748b'}}>{test.mode}</span></td>
                    <td><strong>{test.nwpm} WPM</strong></td>
                    <td>{test.accuracy}%</td>
                    <td>{test.total_errors}</td>
                    <td>
                      <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handleViewResult(test)}>View Result</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Validity</th>
            <th>Login Window</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="7">Loading...</td></tr>
          ) : students.length === 0 ? (
            <tr><td colSpan="7">No Users found in database.</td></tr>
          ) : students.filter(s => (s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone?.includes(searchTerm))).map((s) => (
            <tr key={s.id}>
              <td><strong>{s.name}</strong></td>
              <td>{s.role}</td>
              <td>{s.phone}</td>
              <td>
                <span className={`status-badge ${s.status?.toLowerCase() || 'pending'}`}>
                  {s.status}
                </span>
              </td>
              <td>{s.validity_end ? new Date(s.validity_end).toLocaleDateString() : 'N/A'}</td>
              <td>
                {s.allowed_login_time_start && s.allowed_login_time_end 
                  ? `${s.allowed_login_time_start} to ${s.allowed_login_time_end}` 
                  : 'Anytime'}
              </td>
              <td>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button className="btn-action btn-edit" onClick={() => openEditModal(s)}>Edit</button>
                  <button className="btn-action btn-edit" onClick={() => handleStatusToggle(s)}>Toggle</button>
                  <button className="btn-action btn-edit" style={{ background: '#3b82f6', color: 'white' }} onClick={() => openTestsModal(s)}>View Tests</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminStudents;
