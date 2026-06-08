import { useState, useEffect } from 'react';
import { examService, resultPatternService } from '../../services/api';
import Pagination from '../../components/Pagination';
import './Admin.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3012/api';
// Strip trailing /api so we can prepend host to /uploads/...
const ASSETS_BASE = API_BASE_URL.replace(/\/api\/?$/, '');

const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${ASSETS_BASE}${url}`;
  return url;
};

const FONT_GROUPS = [
  'English Typing',
  'Hindi Mangal',
  'Hindi Kruti Dev',
  'Hindi Remington (GAIL)',
  'Steno English',
  'Steno Hindi',
];

const getExamFontGroups = (exam) => {
  if (Array.isArray(exam?.font_groups) && exam.font_groups.length > 0) return exam.font_groups;
  if (exam?.font_group) return [exam.font_group];
  return [];
};

const AdminExams = () => {
  const [activeTab, setActiveTab] = useState('exams'); // 'patterns' or 'exams'
  const [fontGroupDropdownOpen, setFontGroupDropdownOpen] = useState(false);
  
  const defaultPatternData = {
    name: '',
    speed_count: 'Words',
    half_mistake_enabled: false,
    penalty_type: 'Word',
    penalty_value: 1,
    count_right_words_only: false,
    qualify_on: 'NWPM',
    required_speed: 35,
    required_accuracy: 95,
    ignorable_mistakes_percent: 0,
    show_half_mistakes: true,
    show_full_mistakes: true,
    show_total_strokes: true,
    show_total_words: true,
    show_total_errors: true,
    show_correct_words: true,
    show_gross_speed: true,
    show_net_speed: true,
    show_accuracy: true,
    show_penalty_words: true,
    show_ignorable_mistakes: true,
    count_omissions_as_errors: true,
  };

  const [patterns, setPatterns] = useState([]);
  const [currentPattern, setCurrentPattern] = useState(null);
  const [showPatternForm, setShowPatternForm] = useState(false);
  const [patternSearch, setPatternSearch] = useState('');
  const [patPage, setPatPage] = useState(1);
  const [patPageSize, setPatPageSize] = useState(10);
  useEffect(() => { setPatPage(1); }, [patternSearch]);
  const [patternData, setPatternData] = useState({
    name: '',
    speed_count: 'Words',
    half_mistake_enabled: false,
    penalty_type: 'Word',
    penalty_value: 1,
    count_right_words_only: false,
    qualify_on: 'NWPM',
    required_speed: 35,
    required_accuracy: 95,
    ignorable_mistakes_percent: 0,
    show_half_mistakes: true,
    show_full_mistakes: true,
    show_total_strokes: true,
    show_total_words: true,
    show_total_errors: true,
    show_correct_words: true,
    show_gross_speed: true,
    show_net_speed: true,
    show_accuracy: true,
    show_penalty_words: true,
    show_ignorable_mistakes: true,
    count_omissions_as_errors: true,
  });

  // Exam States
  const [exams, setExams] = useState([]);
  const [currentExam, setCurrentExam] = useState(null);
  const [showExamForm, setShowExamForm] = useState(false);
  const [examSearch, setExamSearch] = useState('');
  const [examPage, setExamPage] = useState(1);
  const [examPageSize, setExamPageSize] = useState(10);
  useEffect(() => { setExamPage(1); }, [examSearch]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [examData, setExamData] = useState({
    name: '',
    test_time_minutes: 10,
    screen_type: 'Screen 1',
    result_pattern_id: '',
    backspace_control: 'Full Backspace',
    highlight_word: true,
    highlight_color: 'yellow',
    auto_scroll: true,
    highlight_error: true,
    font_size_user_screen: 20,
    font_size_test_screen: 20,
    font_group: 'English Typing',
    font_groups: ['English Typing'],
    test_paper_screen: 'Screen',
    auto_submit: false,
    test_re_type: false,
    max_words_strokes: 0,
    no_of_words_strokes: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch independently so one failure does not wipe the other list
    const [patternsResult, examsResult] = await Promise.allSettled([
      resultPatternService.getPatterns(),
      examService.getExams(),
    ]);

    if (patternsResult.status === 'fulfilled') {
      setPatterns(patternsResult.value);
    } else {
      console.error('Error fetching patterns:', patternsResult.reason);
    }

    if (examsResult.status === 'fulfilled') {
      setExams(examsResult.value);
    } else {
      console.error('Error fetching exams:', examsResult.reason);
    }

    setLoading(false);
  };

  /* ----- PATTERN LOGIC ----- */
  const handlePatternSubmit = async (e) => {
    e.preventDefault();
    try {
      // Strip DB-managed fields so TypeORM doesn't reject them
      const { id, created_at, updated_at, ...cleanData } = patternData;
      if (currentPattern) {
        await resultPatternService.updatePattern(currentPattern.id, cleanData);
      } else {
        await resultPatternService.createPattern(cleanData);
      }
      setShowPatternForm(false);
      setCurrentPattern(null);
      setPatternData(defaultPatternData);
      fetchData();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';
      alert(`Error saving pattern: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
      console.error('Pattern save error:', error?.response?.data || error);
    }
  };

  const handlePatternDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this result pattern? Exams using it might break.')) {
      try {
        await resultPatternService.deletePattern(id);
        fetchData();
      } catch (error) {
        alert('Error deleting pattern!');
      }
    }
  };

  /* ----- EXAM LOGIC ----- */
  const defaultExamData = {
    name: '',
    test_time_minutes: 10,
    screen_type: 'Screen 1',
    result_pattern_id: '',
    backspace_control: 'Full Backspace',
    highlight_word: true,
    highlight_color: 'yellow',
    auto_scroll: true,
    highlight_error: true,
    font_size_user_screen: 20,
    font_size_test_screen: 20,
    font_group: 'English Typing',
    font_groups: ['English Typing'],
    test_paper_screen: 'Screen',
    auto_submit: false,
    test_re_type: false,
    max_words_strokes: 0,
    no_of_words_strokes: 0
  };

  const handleExamSubmit = async (e) => {
    e.preventDefault();

    // MAXIMUM WORD/STROKE must be greater than MINIMUM WORD/STROKE.
    if (wordStrokeRangeInvalid) {
      alert(`MAXIMUM WORD/STROKE (${maxWordStroke}) must be greater than MINIMUM WORD/STROKE (${minWordStroke}).`);
      return;
    }

    try {
      const data = new FormData();
      Object.keys(examData).forEach(key => {
        if (
          key === 'id' || key === 'created_at' || key === 'updated_at' ||
          key === 'result_pattern' || key === 'result_pattern_id' ||
          key === 'font_groups' || // handled separately below
          examData[key] === null || examData[key] === undefined
        ) return;
        data.append(key, examData[key]);
      });
      // Send font_groups as JSON string; backend parses it
      data.append('font_groups', JSON.stringify(examData.font_groups || []));
      // Attach pattern ID explicitly under the field name the backend expects
      if (examData.result_pattern_id) {
          data.append('result_pattern', examData.result_pattern_id);
      }
      if (selectedFile) {
        data.append('image', selectedFile);
      }

      if (currentExam) {
        await examService.updateExam(currentExam.id, data);
      } else {
        await examService.createExam(data);
      }
      
      setShowExamForm(false);
      setCurrentExam(null);
      setSelectedFile(null);
      setExamData(defaultExamData);
      fetchData();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';
      alert(`Error saving exam: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
      console.error('Exam save error:', error?.response?.data || error);
    }
  };

  const handleExamDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        await examService.deleteExam(id);
        fetchData();
      } catch (error) {
        alert('Error deleting exam!');
      }
    }
  };

  // The MAX/MIN fields are counted in Words or Strokes depending on the
  // selected result pattern's speed_count. The unit follows the exam type
  // automatically instead of being chosen separately.
  const selectedExamPattern = patterns.find(p => String(p.id) === String(examData.result_pattern_id));
  const wordStrokeUnit = selectedExamPattern?.speed_count === 'Strokes' ? 'Strokes' : 'Words';

  // MAXIMUM must always be greater than MINIMUM. A maximum of 0 means "No Limit"
  // (effectively unbounded) and a minimum of 0 means "No Minimum", so the rule
  // only applies when both fields hold a real (> 0) value.
  const maxWordStroke = Number(examData.max_words_strokes) || 0;
  const minWordStroke = Number(examData.no_of_words_strokes) || 0;
  const wordStrokeRangeInvalid = maxWordStroke > 0 && minWordStroke > 0 && maxWordStroke <= minWordStroke;

  return (
    <div className="admin-card">
      <header className="admin-header">
        <h2>Manage Exams & Patterns</h2>
        <div className="admin-tabs">
           <button className={`tab-btn ${activeTab === 'exams' ? 'active' : ''}`} onClick={() => setActiveTab('exams')}>Exams Setup</button>
           <button className={`tab-btn ${activeTab === 'patterns' ? 'active' : ''}`} onClick={() => setActiveTab('patterns')}>Result Patterns</button>
        </div>
      </header>

      {/* ===================== RESULT PATTERNS TAB ===================== */}
      {activeTab === 'patterns' && (
        <div className="tab-content">
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <input 
                type="text" 
                placeholder="Search Pattern Name..." 
                value={patternSearch} 
                onChange={(e) => setPatternSearch(e.target.value)} 
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }}
              />
              <button className="btn-primary" onClick={() => {
                setShowPatternForm(o => !o);
                setCurrentPattern(null);
                setPatternData(defaultPatternData);
              }}>
                {showPatternForm ? 'Cancel' : '+ Add New Pattern'}
              </button>
           </div>
           
           {showPatternForm && (
             <div className="admin-form-container pattern-setup">
                <h3>{currentPattern ? 'Edit Result Pattern' : 'New Result Pattern'}</h3>
                <form onSubmit={handlePatternSubmit} className="admin-grid-form">
                    <div className="input-group">
                        <label>Result Name</label>
                        <input type="text" value={patternData.name} onChange={(e) => setPatternData({...patternData, name: e.target.value})} required placeholder="e.g. SSC Standard" />
                    </div>
                    <div className="input-group">
                        <label>Speed Count (Words/Strokes)</label>
                        <select value={patternData.speed_count} onChange={(e) => setPatternData({...patternData, speed_count: e.target.value})}>
                            <option value="Words">Words</option>
                            <option value="Strokes">Strokes</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Half Mistake (Count or Not)</label>
                        <select value={patternData.half_mistake_enabled ? "Yes" : "No"} onChange={(e) => setPatternData({...patternData, half_mistake_enabled: e.target.value === "Yes"})}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    
                    <div className="input-group">
                        <label>Penalty (Word/Strokes)</label>
                        <select value={patternData.penalty_type} onChange={(e) => setPatternData({...patternData, penalty_type: e.target.value})}>
                            <option value="Word">Word</option>
                            <option value="Stroke">Stroke</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>How Much Penalty</label>
                        <input type="number" step="0.5" value={patternData.penalty_value} onChange={(e) => setPatternData({...patternData, penalty_value: parseFloat(e.target.value)})} required />
                    </div>
                    <div className="input-group">
                        <label>Count only Right Words (Y/N)</label>
                        <select value={patternData.count_right_words_only ? "Yes" : "No"} onChange={(e) => setPatternData({...patternData, count_right_words_only: e.target.value === "Yes"})}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Count Omitted/Left Words as Error</label>
                        <select value={patternData.count_omissions_as_errors !== false ? "Yes" : "No"} onChange={(e) => setPatternData({...patternData, count_omissions_as_errors: e.target.value === "Yes"})}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Qualify show on (NWPM/GWPM)</label>
                        <select value={patternData.qualify_on} onChange={(e) => setPatternData({...patternData, qualify_on: e.target.value})}>
                            <option value="NWPM">NWPM</option>
                            <option value="GWPM">GWPM</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Qualifying Speed*</label>
                        <input type="number" value={patternData.required_speed} onChange={(e) => setPatternData({...patternData, required_speed: parseInt(e.target.value)})} required />
                    </div>
                    <div className="input-group">
                        <label>Qualifying ACCURACY (%)*</label>
                        <input type="number" value={patternData.required_accuracy} onChange={(e) => setPatternData({...patternData, required_accuracy: parseInt(e.target.value)})} required />
                    </div>
                    <div className="input-group">
                        <label>Ignorable Mistakes (%)</label>
                        <input type="number" min="0" step="0.1" placeholder="0 = not enforced" value={patternData.ignorable_mistakes_percent ?? 0} onChange={(e) => setPatternData({...patternData, ignorable_mistakes_percent: e.target.value === '' ? 0 : parseFloat(e.target.value)})} />
                        <small style={{ color: '#64748b', fontSize: '11px' }}>Max mistake rate allowed. Above this → Unqualified. 0 = not enforced.</small>
                    </div>

                    {/* Visibility Section */}
                    <div className="form-actions-full" style={{ gridColumn: '1 / -1', marginTop: '15px' }}>
                        <h4 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px', color: '#444' }}>Result Component Visibility (Show/Hide in Result Screen)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                            {[
                                { key: 'show_full_mistakes', label: 'Full Mistakes' },
                                { key: 'show_half_mistakes', label: 'Half Mistakes' },
                                { key: 'show_total_errors', label: 'Total Errors' },
                                { key: 'show_total_strokes', label: 'Total Strokes' },
                                { key: 'show_total_words', label: 'Total Words' },
                                { key: 'show_correct_words', label: 'Right/Correct Words' },
                                { key: 'show_gross_speed', label: 'Gross Speed (GWPM)' },
                                { key: 'show_net_speed', label: 'Net Speed (NWPM)' },
                                { key: 'show_accuracy', label: 'Accuracy' },
                                { key: 'show_penalty_words', label: 'Penalty Words' },
                                { key: 'show_ignorable_mistakes', label: 'Ignorable Mistakes' },
                            ].map(comp => (
                                <label key={comp.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#555' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={patternData[comp.key] !== false} 
                                        onChange={(e) => setPatternData({...patternData, [comp.key]: e.target.checked})} 
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    {comp.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-actions-full" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                        <button type="submit" className="btn-primary" style={{backgroundColor: '#800080'}}>SUBMIT</button> {/* Matching screenshot purple */}
                    </div>
                </form>
             </div>
           )}

           {(() => {
             const filteredPatterns = patterns.filter(p => p.name?.toLowerCase().includes(patternSearch.toLowerCase()));
             const patTotalPages = Math.max(1, Math.ceil(filteredPatterns.length / patPageSize));
             const pagedPatterns = filteredPatterns.slice((patPage - 1) * patPageSize, patPage * patPageSize);
             return (
               <>
               <table className="admin-table">
                   <thead>
                       <tr>
                           <th>Pattern Name</th>
                           <th>Speed Count</th>
                           <th>Penalty Factor</th>
                           <th>Qualifying</th>
                           <th>Actions</th>
                       </tr>
                   </thead>
                   <tbody>
                       {loading ? <tr><td colSpan="5">Loading...</td></tr> : filteredPatterns.length === 0 ? <tr><td colSpan="5">No patterns found.</td></tr> : pagedPatterns.map(p => (
                           <tr key={p.id}>
                               <td><strong>{p.name}</strong></td>
                               <td>{p.speed_count}</td>
                               <td>{p.penalty_value} {p.penalty_type}s</td>
                               <td>{p.required_speed} {p.qualify_on} / {p.required_accuracy}%</td>
                               <td>
                                   <button className="btn-action btn-edit" onClick={() => {
                                       const { id, created_at, updated_at, ...editFields } = p;
                                       setCurrentPattern(p);
                                       setPatternData({ ...defaultPatternData, ...editFields });
                                       setShowPatternForm(true);
                                   }}>Edit</button>
                                   <button className="btn-action btn-delete" onClick={() => handlePatternDelete(p.id)} style={{ marginLeft: '10px' }}>Delete</button>
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
               <Pagination
                 page={patPage} totalPages={patTotalPages} totalItems={filteredPatterns.length}
                 pageSize={patPageSize} onPageChange={setPatPage} onPageSizeChange={p => { setPatPageSize(p); setPatPage(1); }}
               />
               </>
             );
           })()}
        </div>
      )}

      {/* ===================== EXAMS TAB ===================== */}
      {activeTab === 'exams' && (
        <div className="tab-content">
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <input 
                type="text" 
                placeholder="Search Exam Name..." 
                value={examSearch} 
                onChange={(e) => setExamSearch(e.target.value)} 
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }}
              />
              <button className="btn-primary" onClick={() => { 
                if (showExamForm) {
                  // Cancel
                  setShowExamForm(false);
                  setCurrentExam(null);
                  setSelectedFile(null);
                  setExamData(defaultExamData);
                } else {
                  // New form
                  setExamData(defaultExamData);
                  setCurrentExam(null);
                  setSelectedFile(null);
                  setShowExamForm(true);
                }
              }}>
                {showExamForm ? 'Cancel' : '+ Add New Exam'}
              </button>
           </div>
           
           {showExamForm && (
             <div className="admin-form-container pattern-setup">
                <h3>{currentExam ? 'Edit Exam Setup' : 'New Exam Setup'}</h3>
                <form onSubmit={handleExamSubmit} className="admin-grid-form" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    
                    <div className="input-group">
                        <label style={{color: '#8b8b00', fontWeight: 'bold'}}>EXAM NAME</label>
                        <input type="text" value={examData.name} onChange={(e) => setExamData({...examData, name: e.target.value})} required placeholder="Enter Name" />
                    </div>
                    <div className="input-group">
                        <label>TEST TIME</label>
                        <select value={examData.test_time_minutes} onChange={(e) => setExamData({...examData, test_time_minutes: parseInt(e.target.value)})}>
                            <option value={5}>5 mins</option>
                            <option value={10}>10 mins</option>
                            <option value={15}>15 mins</option>
                            <option value={20}>20 mins</option>
                            <option value={25}>25 mins</option>
                            <option value={30}>30 mins</option>
                            <option value={35}>35 mins</option>
                            <option value={40}>40 mins</option>
                            <option value={45}>45 mins</option>
                            <option value={50}>50 mins</option>
                            <option value={55}>55 mins</option>
                            <option value={60}>60 mins</option>
                            <option value={65}>65 mins</option>
                            <option value={70}>70 mins</option>
                            <option value={75}>75 mins</option>
                            <option value={80}>80 mins</option>
                            <option value={85}>85 mins</option>
                            <option value={90}>90 mins</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>TEST SCREEN</label>
                        <select value={examData.screen_type} onChange={(e) => setExamData({...examData, screen_type: e.target.value})}>
                            <option value="Screen 1">Screen 1 (CRPF)</option>
                            <option value="Screen 2">Screen 2 (Green)</option>
                            <option value="Screen 3">Screen 3 (SSC - No Sidebar)</option>
                            <option value="Screen 4">Screen 4 (Line-by-Line)</option>
                            <option value="Screen 5">Screen 5 (TCS)</option>
                            <option value="Screen 6">Screen 6 (DSSSB)</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label style={{color: '#8b8b00', fontWeight: 'bold'}}>RESULT PATTERN</label>
                        <select value={examData.result_pattern_id} onChange={(e) => setExamData({...examData, result_pattern_id: e.target.value})} required>
                            <option value="">--Select--</option>
                            {patterns.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="input-group">
                        <label>BACKSPACE</label>
                        <select value={examData.backspace_control} onChange={(e) => setExamData({...examData, backspace_control: e.target.value})}>
                            <option value="Full Backspace">Full</option>
                            <option value="Current Word Backspace">Current Word</option>
                            <option value="Two Words Backspace">Two Words</option>
                            <option value="No Backspace">Disabled</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>HIGHLIGHT Word (Y/N)</label>
                        <select value={examData.highlight_word ? "Yes" : "No"} onChange={(e) => setExamData({...examData, highlight_word: e.target.value === "Yes"})}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>HIGHLIGHTING color</label>
                        <select value={examData.highlight_color} onChange={(e) => setExamData({...examData, highlight_color: e.target.value})}>
                            <option value="yellow">Yellow</option>
                            <option value="blue">Blue</option>
                            <option value="green">Green</option>
                            <option value="red">Red</option>
                            <option value="orange">Orange</option>
                            <option value="pink">Pink</option>
                            <option value="black">Black</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>AUTO SCROLL (Y/N)</label>
                        <select value={examData.auto_scroll ? "Yes" : "No"} onChange={(e) => setExamData({...examData, auto_scroll: e.target.value === "Yes"})}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    
                    <div className="input-group">
                        <label>HIGHLIGHT Error (Y/N)</label>
                        <select value={examData.highlight_error ? "Yes" : "No"} onChange={(e) => setExamData({...examData, highlight_error: e.target.value === "Yes"})}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>FONT SIZE User SCREEN</label>
                        <select value={examData.font_size_user_screen} onChange={(e) => setExamData({...examData, font_size_user_screen: parseInt(e.target.value)})}>
                            <option value="10">10px</option>
                            <option value="11">11px</option>
                            <option value="12">12px</option>
                            <option value="13">13px</option>
                            <option value="14">14px</option>
                            <option value="15">15px</option>
                            <option value="16">16px</option>
                            <option value="17">17px</option>
                            <option value="18">18px</option>
                            <option value="19">19px</option>
                            <option value="20">20px</option>
                            <option value="21">21px</option>
                            <option value="22">22px</option>
                            <option value="23">23px</option>
                            <option value="24">24px</option>
                            <option value="25">25px</option>
                            <option value="26">26px</option>
                            <option value="27">27px</option>
                            <option value="28">28px</option>
                            <option value="29">29px</option>
                            <option value="30">30px</option>
                            <option value="31">31px</option>
                            <option value="32">32px</option>
                            <option value="33">33px</option>
                            <option value="34">34px</option>
                            <option value="35">35px</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>FONT SIZE TEST SCREEN</label>
                        <select value={examData.font_size_test_screen} onChange={(e) => setExamData({...examData, font_size_test_screen: parseInt(e.target.value)})}>
                            <option value="10">10px</option>
                            <option value="11">11px</option>
                            <option value="12">12px</option>
                            <option value="13">13px</option>
                            <option value="14">14px</option>
                            <option value="15">15px</option>
                            <option value="16">16px</option>
                            <option value="17">17px</option>
                            <option value="18">18px</option>
                            <option value="19">19px</option>
                            <option value="20">20px</option>
                            <option value="21">21px</option>
                            <option value="22">22px</option>
                            <option value="23">23px</option>
                            <option value="24">24px</option>
                            <option value="25">25px</option>
                            <option value="26">26px</option>
                            <option value="27">27px</option>
                            <option value="28">28px</option>
                            <option value="29">29px</option>
                            <option value="30">30px</option>
                            <option value="31">31px</option>
                            <option value="32">32px</option>
                            <option value="33">33px</option>
                            <option value="34">34px</option>
                            <option value="35">35px</option>
                        </select>
                    </div>
                    <div className="input-group" style={{ position: 'relative' }}>
                        <label>FONT GROUP (Multi-select)</label>
                        <button
                          type="button"
                          onClick={() => setFontGroupDropdownOpen(o => !o)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem', color: '#0f172a' }}
                        >
                          {(examData.font_groups || []).length === 0
                            ? '-- Select Font Groups --'
                            : (examData.font_groups || []).length === FONT_GROUPS.length
                              ? 'All Font Groups'
                              : (examData.font_groups || []).join(', ')}
                          <span style={{ float: 'right', color: '#64748b' }}>▾</span>
                        </button>
                        {fontGroupDropdownOpen && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', marginTop: '2px', zIndex: 20, boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, cursor: 'pointer', background: '#f8fafc' }}>
                              <input
                                type="checkbox"
                                checked={(examData.font_groups || []).length === FONT_GROUPS.length}
                                onChange={() => {
                                  const all = (examData.font_groups || []).length === FONT_GROUPS.length;
                                  setExamData({ ...examData, font_groups: all ? [] : [...FONT_GROUPS] });
                                }}
                              />
                              Select All
                            </label>
                            {FONT_GROUPS.map(fg => (
                              <label key={fg} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input
                                  type="checkbox"
                                  checked={(examData.font_groups || []).includes(fg)}
                                  onChange={() => {
                                    const set = new Set(examData.font_groups || []);
                                    if (set.has(fg)) set.delete(fg); else set.add(fg);
                                    setExamData({ ...examData, font_groups: Array.from(set) });
                                  }}
                                />
                                {fg}
                              </label>
                            ))}
                          </div>
                        )}
                    </div>

                    <div className="input-group">
                        <label>TEST (PAPER/SCREEN)</label>
                        <select value={examData.test_paper_screen} onChange={(e) => setExamData({...examData, test_paper_screen: e.target.value})}>
                            <option value="Screen">On Screen</option>
                            <option value="Paper">On Paper</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>EXAM LOGO</label>
                        {currentExam?.image_url && !selectedFile && (
                          <img src={resolveAssetUrl(currentExam.image_url)} alt="Current logo" style={{width: '40px', height: '40px', objectFit: 'contain', display: 'block', marginBottom: '4px', border: '1px solid #ddd', borderRadius: '4px'}} />
                        )}
                        {selectedFile && (
                          <img src={URL.createObjectURL(selectedFile)} alt="New logo" style={{width: '40px', height: '40px', objectFit: 'contain', display: 'block', marginBottom: '4px', border: '1px solid #ddd', borderRadius: '4px'}} />
                        )}
                        <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files[0])} />
                    </div>
                    <div className="input-group">
                        <label>Auto Submit (Y/N)</label>
                        <select value={examData.auto_submit ? "Yes" : "No"} onChange={(e) => setExamData({...examData, auto_submit: e.target.value === "Yes"})}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>TEST RE-TYPE (Y/N)</label>
                        <select value={examData.test_re_type ? "Yes" : "No"} onChange={(e) => setExamData({...examData, test_re_type: e.target.value === "Yes"})}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>MAXIMUM WORD/ STROKES ({wordStrokeUnit})</label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={examData.max_words_strokes ?? 0}
                            onChange={(e) => setExamData({...examData, max_words_strokes: e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0)})}
                            placeholder="0 = No Limit"
                        />
                        <small style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '3px', display: 'block' }}>
                            Maximum {wordStrokeUnit.toLowerCase()} from the uploaded content shown to the student (0 = No Limit).
                        </small>
                    </div>
                    <div className="input-group">
                        <label>MINIMUM WORD/STROKE ({wordStrokeUnit})</label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={examData.no_of_words_strokes ?? 0}
                            onChange={(e) => setExamData({...examData, no_of_words_strokes: e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0)})}
                            placeholder="0 = No Minimum"
                            style={wordStrokeRangeInvalid ? { borderColor: '#dc2626' } : undefined}
                        />
                        <small style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '3px', display: 'block' }}>
                            Minimum {wordStrokeUnit.toLowerCase()} the student must type. The exam cannot be submitted until this many are typed (0 = No Minimum).
                        </small>
                        {wordStrokeRangeInvalid && (
                            <small style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '3px', display: 'block', fontWeight: 600 }}>
                                Maximum ({maxWordStroke}) must be greater than Minimum ({minWordStroke}).
                            </small>
                        )}
                    </div>

                    <div className="form-actions-full" style={{ gridColumn: '1 / -1' }}>
                        <button type="submit" className="btn-primary" style={{backgroundColor: '#800080'}} disabled={wordStrokeRangeInvalid}>SUBMIT</button>
                    </div>
                </form>
             </div>
           )}

           <table className="admin-table">
               <thead>
                   <tr>
                       <th>Logo</th>
                       <th>Exam Name</th>
                       <th>Screen</th>
                       <th>Pattern</th>
                       <th>Actions</th>
                   </tr>
               </thead>
               <tbody>
                   {loading ? <tr><td colSpan="5">Loading...</td></tr> : (() => {
                     const filteredExamList = exams.filter(e => e.name?.toLowerCase().includes(examSearch.toLowerCase()));
                     const examTotalPages = Math.max(1, Math.ceil(filteredExamList.length / examPageSize));
                     const pagedExams = filteredExamList.slice((examPage - 1) * examPageSize, examPage * examPageSize);
                     if (filteredExamList.length === 0) return <tr><td colSpan="5">No exams found.</td></tr>;
                     return pagedExams.map(e => (
                       <tr key={e.id}>
                           <td>
                               {e.image_url ? <img src={resolveAssetUrl(e.image_url)} alt="" style={{width: '30px', height: '30px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#fff'}} onError={(ev) => { ev.target.style.display = 'none'; ev.target.parentNode.appendChild(document.createTextNode('-')); }} /> : '-'}
                           </td>
                           <td><strong>{e.name}</strong></td>
                           <td>{e.screen_type}</td>
                           <td>{e.result_pattern?.name || 'Missing'}</td>
                           <td>
                               <button className="btn-action btn-edit" onClick={() => {
                                   setCurrentExam(e);
                                   setExamData({
                                       ...e,
                                       result_pattern_id: e.result_pattern?.id || '',
                                       font_groups: getExamFontGroups(e),
                                   });
                                   setSelectedFile(null);
                                   setShowExamForm(true);
                               }}>Edit</button>
                               <button className="btn-action btn-delete" onClick={() => handleExamDelete(e.id)} style={{ marginLeft: '10px' }}>Delete</button>
                           </td>
                       </tr>
                     ));
                   })()}
               </tbody>
           </table>
           {(() => {
             const filteredExamList = exams.filter(e => e.name?.toLowerCase().includes(examSearch.toLowerCase()));
             const examTotalPages = Math.max(1, Math.ceil(filteredExamList.length / examPageSize));
             return <Pagination page={examPage} totalPages={examTotalPages} totalItems={filteredExamList.length} pageSize={examPageSize} onPageChange={setExamPage} onPageSizeChange={p => { setExamPageSize(p); setExamPage(1); }} />;
           })()}
        </div>
      )}

    </div>
  );
};

export default AdminExams;
