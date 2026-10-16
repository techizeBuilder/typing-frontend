import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import mammoth from 'mammoth';
import {
  BarChart3Icon, CheckCircle2Icon, ClipboardListIcon, EyeIcon, FileTextIcon, HeadphonesIcon, KeyboardIcon, LayersIcon, MicIcon, SaveIcon, UploadIcon,
} from 'lucide-react';
import { chapterService, examService } from '../../services/api';
import { API_BASE_URL } from '../../config';
import { PageHeading } from '../../ui/PageHeading';
import { fontFamilyForFontGroup, fontFamilyForHindiType } from '../../utils/hindiFonts';
import { useFontGroupSettings } from '../../features/fontGroups/fontGroups';
import { urlParam } from '../../features/admin/urlParams';
import {
  FONT_GROUPS, LIVE, PRELOAD, blankChapter, chapterToForm, countStrokes, countWords, errorText, isStenoGroup, saveChapter,
} from '../../features/tests/testData';

const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none transition-colors duration-150 focus:border-primary';
const labelCls = 'mb-1.5 block text-[12px] font-semibold text-navy-800';
const GROUP_ICON = { 'English Typing': KeyboardIcon, 'Hindi Mangal': KeyboardIcon, 'Hindi Kruti Dev': KeyboardIcon, 'Hindi Remington (GAIL)': KeyboardIcon, 'Steno English': MicIcon, 'Steno Hindi': MicIcon };

function Section({ n, title, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-card ${className}`}>
      <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-bold text-navy-800">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[11px] text-white">{n}</span> {title}
      </h3>
      {children}
    </section>
  );
}

export default function AdminTestForm() {
  const { id } = useParams();
  const duplicateOf = urlParam('duplicate');
  const sourceId = id || duplicateOf;
  const editing = !!id;
  const navigate = useNavigate();
  const { isActive: isFontGroupActive } = useFontGroupSettings();
  const [formData, setFormData] = useState(blankChapter);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [exams, setExams] = useState([]);
  const [audioFile, setAudioFile] = useState(null); // raw File object for steno
  const [loading, setLoading] = useState(!!sourceId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    examService.getExams().then((d) => { if (!cancelled) setExams(Array.isArray(d) ? d : []); }).catch(() => {});
    if (sourceId) {
      chapterService.getChapters()
        .then((list) => {
          if (cancelled) return;
          const ch = (list || []).find((c) => c.id === sourceId);
          if (!ch) { setError('Test not found.'); return; }
          if (editing) { setCurrentChapter(ch); setFormData(chapterToForm(ch)); return; }
          // Duplicate: same content and settings, new number/title, no audio.
          const copy = chapterToForm(ch);
          ['id', 'audio_url', 'created_at', 'updated_at'].forEach((k) => delete copy[k]);
          setFormData({ ...copy, chapter_no: `${ch.chapter_no}-copy`, name: ch.name ? `${ch.name} (copy)` : '' });
        })
        .catch((err) => { if (!cancelled) setError(errorText(err, 'Could not load the test.')); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [sourceId, editing]);

  const set = (key) => (e) => setFormData((f) => ({ ...f, [key]: e.target.value }));
  const isSteno = isStenoGroup(formData.font_group);

  // Editor font so pasted Hindi renders correctly. Steno Hindi uses the per-chapter
  // hindi_font_type; everything else is keyed off font_group.
  const contentFontFamily = formData.font_group === 'Steno Hindi'
    ? (fontFamilyForHindiType(formData.hindi_font_type) || 'inherit')
    : (fontFamilyForFontGroup(formData.font_group) || 'inherit');
  const useHindiFont = contentFontFamily !== 'inherit';

  // Only show exams that support the selected font group
  const filteredExams = useMemo(() => exams.filter((exam) => {
    const groups = Array.isArray(exam.font_groups) && exam.font_groups.length > 0 ? exam.font_groups : (exam.font_group ? [exam.font_group] : []);
    return groups.length === 0 || groups.includes(formData.font_group);
  }), [exams, formData.font_group]);

  const chooseGroup = (fg) => setFormData((prev) => ({
    ...prev,
    font_group: fg,
    exam_ids: [],
    // Default the Steno Hindi font picker; language_type + final value
    // are derived on submit (and only sent for Steno chapters).
    hindi_font_type: fg === 'Steno Hindi' ? (prev.hindi_font_type || 'Mangal') : null,
  }));
  const toggleExam = (examId) => setFormData((prev) => {
    const s = new Set(prev.exam_ids || []);
    if (s.has(examId)) s.delete(examId); else s.add(examId);
    return { ...prev, exam_ids: [...s] };
  });
  const allExamsSelected = filteredExams.length > 0 && filteredExams.every((e) => (formData.exam_ids || []).includes(e.id));

  const handleTextFileUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        setFormData((prev) => ({ ...prev, content_text: text, word_count: countWords(text) }));
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: event.target.result });
          setFormData((prev) => ({ ...prev, content_text: result.value, word_count: countWords(result.value) }));
        } catch (err) {
          console.error('Error reading Word document', err);
          alert('Could not extract text from Word document.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file format. Please upload .txt or .docx');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.content_text.trim()) { setError('Add the test content (type, paste or upload a file).'); return; }
    setSaving(true);
    try {
      await saveChapter(formData, currentChapter, audioFile);
      navigate('/admin/content', { state: { notice: editing ? `Saved test ${formData.chapter_no}.` : `Test ${formData.chapter_no} created.` } });
    } catch (err) {
      setError('Error saving chapter: ' + errorText(err, 'failed'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const words = countWords(formData.content_text);
  const strokes = countStrokes(formData.content_text);
  const wordCount = parseInt(formData.word_count, 10) || words;
  const estMinutes = isSteno ? wordCount / (parseInt(formData.steno_speed, 10) || 100) : wordCount / 35;
  const previewText = formData.content_text.trim().split(/\s+/).slice(0, 80).join(' ');
  const title = editing ? `Edit Test${currentChapter ? `: ${currentChapter.chapter_no}` : ''}` : duplicateOf ? 'Duplicate Test' : 'Add New Test (Live / Preload)';

  if (loading) return <div className="nd p-6 text-[12.5px] text-slate-500">Loading test…</div>;

  return (
    <div className="nd">
      <PageHeading
        icon={<ClipboardListIcon className="h-5 w-5" />}
        title={title}
        subtitle={editing ? 'Update the test content, schedule and assignment.' : 'Create a new live or pre-load test for students.'}
        crumbs={[{ label: 'Test Management', to: '/admin/content' }, { label: editing ? 'Edit Test' : 'Add New Test' }]} />

      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger">{error}</p>}

      <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 2xl:grid-cols-2">
            <Section n={1} title="Basic Information">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>Test ID / Chapter No. <span className="text-danger">*</span></span>
                  <input type="text" required value={formData.chapter_no} onChange={set('chapter_no')} placeholder="e.g. 101, A-1, CH-01" className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>Test Title</span>
                  <input type="text" maxLength={150} value={formData.name || ''} onChange={set('name')} placeholder="Optional, e.g. Rural Development Budget" className={inputCls} />
                </label>
              </div>
              <label className="mt-3.5 block">
                <span className={labelCls}>Description (Optional)</span>
                <textarea rows={2} maxLength={500} value={formData.description || ''} onChange={set('description')} placeholder="Short note shown to students with the test" className={`${inputCls} resize-none`} />
                <span className="mt-1 block text-right text-[11px] text-slate-400">{(formData.description || '').length} / 500</span>
              </label>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <fieldset>
                  <legend className={labelCls}>Test Mode <span className="text-danger">*</span></legend>
                  {[[LIVE, 'Live Test (Real Time Exam)'], [PRELOAD, 'Pre-load Test (Practice)']].map(([v, label]) => (
                    <label key={v} className="mb-1.5 flex items-center gap-2 text-[12.5px] text-slate-700">
                      <input type="radio" name="testMode" checked={formData.test_type === v} onChange={() => setFormData((f) => ({ ...f, test_type: v }))} className="h-3.5 w-3.5 accent-primary" /> {label}
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend className={labelCls}>Status</legend>
                  <div className="flex gap-5">
                    {[[true, 'Active'], [false, 'Inactive']].map(([v, label]) => (
                      <label key={label} className="flex items-center gap-2 text-[12.5px] text-slate-700">
                        <input type="radio" name="testStatus" checked={(formData.is_active !== false) === v} onChange={() => setFormData((f) => ({ ...f, is_active: v }))} className="h-3.5 w-3.5 accent-primary" /> {label}
                      </label>
                    ))}
                  </div>
                  <span className="mt-1 block text-[11px] text-slate-500">Inactive tests are hidden from students.</span>
                </fieldset>
              </div>
            </Section>

            <Section n={2} title="Test Type & Schedule">
              <p className={labelCls}>Font Group / Test Type <span className="text-danger">*</span></p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {/* Inactive font groups can't be newly assigned; the current one always shows. */}
                {FONT_GROUPS.filter((fg) => isFontGroupActive(fg) || fg === formData.font_group).map((fg) => {
                  const Icon = GROUP_ICON[fg];
                  const on = formData.font_group === fg;
                  return (
                    <button key={fg} type="button" aria-pressed={on} onClick={() => chooseGroup(fg)}
                      className={`relative flex items-center gap-2 rounded-lg border px-2.5 py-2.5 text-left text-[11.5px] font-semibold transition-colors duration-150 ${on ? 'border-primary bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-primary'}`}>
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> {fg}
                      {on && <CheckCircle2Icon className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
                {/* Steno Hindi → choose the Hindi font standard the student types/views in */}
                {formData.font_group === 'Steno Hindi' &&
                  <label className="block">
                    <span className={labelCls}>Hindi Font Type</span>
                    <select value={formData.hindi_font_type || 'Mangal'} onChange={set('hindi_font_type')} className={inputCls}>
                      <option value="Mangal">Hindi Mangal (Unicode)</option>
                      <option value="KrutiDev">Kruti Dev</option>
                      <option value="RemingtonGail">Remington Gail</option>
                    </select>
                  </label>}
                <label className="block">
                  <span className={labelCls}>Test Date <span className="text-danger">*</span></span>
                  <input type="date" required value={formData.test_date} onChange={set('test_date')} className={inputCls} />
                  <span className="mt-1 block text-[11px] text-slate-500">Live tests run on this date.</span>
                </label>
                <label className="block">
                  <span className={labelCls}>Difficulty Level</span>
                  <select value={formData.difficulty || ''} onChange={set('difficulty')} className={inputCls}>
                    <option value="">Not set</option><option value="Easy">Easy</option><option value="Moderate">Moderate</option><option value="Hard">Hard</option>
                  </select>
                </label>
              </div>
              <div className="mt-3.5">
                <span className={labelCls}>Category / Exam</span>
                <div className="scroll-thin max-h-[150px] overflow-y-auto rounded-md border border-slate-300">
                  <label className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-navy-800">
                    <input type="checkbox" checked={allExamsSelected} onChange={() => setFormData((prev) => ({ ...prev, exam_ids: allExamsSelected ? [] : filteredExams.map((e) => e.id) }))} className="h-3.5 w-3.5 accent-primary" />
                    Select All
                  </label>
                  {filteredExams.map((exam) => (
                    <label key={exam.id} className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-slate-700">
                      <input type="checkbox" checked={(formData.exam_ids || []).includes(exam.id)} onChange={() => toggleExam(exam.id)} className="h-3.5 w-3.5 accent-primary" /> {exam.name}
                    </label>
                  ))}
                  {filteredExams.length === 0 && <p className="px-3 py-2 text-[12px] text-slate-400">No exams support this font group</p>}
                </div>
                <span className="mt-1 block text-[11px] text-slate-500">{(formData.exam_ids || []).length === 0 ? 'No exam selected — the test is independent.' : `${formData.exam_ids.length} exam(s) selected.`}</span>
              </div>
            </Section>
          </div>

          <Section n={3} title="Test Content">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-semibold text-navy-800">Content (text used for result comparison) <span className="text-danger">*</span></span>
              {formData.font_group === 'Hindi Kruti Dev' && <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">⌨ Kruti Dev layout active</span>}
              {formData.font_group === 'Hindi Mangal' && <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] text-primary-700">🌐 Use Windows Hindi IME</span>}
              {formData.font_group === 'Hindi Remington (GAIL)' && <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">⌨ Remington GAIL layout active</span>}
              {isSteno && <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">🎙 Steno: text hidden from student, used for scoring only</span>}
              {formData.font_group === 'Steno Hindi' && <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">⌨ Hindi font: {formData.hindi_font_type || 'Mangal'}</span>}
              <label className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-[11.5px] font-medium text-primary hover:bg-primary-50">
                <UploadIcon className="h-3.5 w-3.5" aria-hidden="true" /> Upload File (.txt, .docx)
                <input type="file" accept=".txt,.docx" onChange={handleTextFileUpload} className="sr-only" />
              </label>
            </div>
            <textarea
              rows={10}
              value={formData.content_text}
              onChange={(e) => setFormData({ ...formData, content_text: e.target.value, word_count: countWords(e.target.value) })}
              placeholder={isSteno ? 'Paste the dictation transcript here (hidden from student, used for scoring only)' : 'Paste content here or upload a .txt/.docx file...'}
              spellCheck={false}
              lang={formData.font_group === 'Hindi Mangal' ? 'hi' : 'en'}
              // Kruti Dev / Remington are legacy glyph fonts (Hindi glyphs at ASCII
              // positions) and MUST render in the Kruti Dev font or pasted text shows
              // as raw English (e.g. "mik/;{k"). Mangal is true Unicode Devanagari.
              // The stored value is never transformed — this only controls display.
              style={{ fontFamily: contentFontFamily, fontSize: useHindiFont ? '18px' : undefined, lineHeight: 1.8 }}
              className={inputCls} />
            <div className="mt-3 grid gap-3.5 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block">
                <span className={labelCls}>Total Word Count <span className="font-normal text-slate-500">— auto-calculated: <b>{words}</b> words</span></span>
                <input type="number" min="0" value={formData.word_count} onChange={set('word_count')} placeholder="Auto-calculated from transcript" className={inputCls} />
                <span className="mt-1 block text-[11px] text-slate-500">Updated automatically from the transcript above. You can override it manually if needed.</span>
              </label>
              <button type="button" onClick={() => setFormData({ ...formData, word_count: countWords(formData.content_text) })} className="mb-5 rounded-md border border-slate-300 px-3.5 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50">Recalculate</button>
            </div>
          </Section>

          {isSteno &&
            <Section n={4} title="Steno Dictation">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>🎙 Default Steno Speed (WPM)</span>
                  <select value={formData.steno_speed ?? 100} onChange={(e) => setFormData({ ...formData, steno_speed: parseInt(e.target.value, 10) })} className={inputCls}>
                    {[40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150].map((s) => <option key={s} value={s}>{s} WPM</option>)}
                  </select>
                  <span className="mt-1 block text-[11px] text-slate-500">
                    Students will see three choices centred on this speed: <b>{(formData.steno_speed ?? 100) - 10}</b>, <b>{formData.steno_speed ?? 100} (default)</b> and <b>{(formData.steno_speed ?? 100) + 10}</b> WPM.
                    The audio plays at normal speed for the default and is scaled for the ±10 options.
                  </span>
                </label>
                <div>
                  <span className={labelCls}>🎙 Steno Audio Dictation (MP3 / WAV / OGG)</span>
                  {/* Show existing audio if editing */}
                  {currentChapter?.audio_url && !audioFile &&
                    <div className="mb-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px]">
                      <b>Current audio:</b> <audio controls src={`${API_BASE_URL}${currentChapter.audio_url}`} className="mt-1 h-8 w-full" />
                    </div>}
                  <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-700">
                    <HeadphonesIcon className="h-3.5 w-3.5" aria-hidden="true" /> {currentChapter?.audio_url || audioFile ? 'Replace Audio' : 'Choose Audio'}
                    <input type="file" accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/*" onChange={(e) => setAudioFile(e.target.files[0] || null)} className="sr-only" />
                  </label>
                  {audioFile && <p className="mt-1.5 text-[12px] text-emerald-700">✔ Selected: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB) — will upload on Save</p>}
                  {duplicateOf && !audioFile && <p className="mt-1.5 text-[11.5px] text-amber-700">Audio is not copied — choose the audio file for this test.</p>}
                  <p className="mt-1.5 text-[11px] text-slate-500">This audio will be played to the student during the steno test. Text above is used for grading only and is hidden from the student.</p>
                </div>
              </div>
            </Section>}
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-bold text-navy-800"><BarChart3Icon className="h-4 w-4 text-primary" aria-hidden="true" /> Content Summary</h3>
            <dl className="space-y-2 text-[12px]">
              {[
                ['Total Words', wordCount.toLocaleString('en-IN')],
                ['Total Strokes', strokes.toLocaleString('en-IN')],
                [isSteno ? 'Dictation Length' : 'Est. Duration', words ? `≈ ${Math.max(1, Math.round(estMinutes))} min${isSteno ? ` at ${formData.steno_speed ?? 100} WPM` : ' at 35 WPM'}` : '—'],
                ['Difficulty Level', formData.difficulty || 'Not set'],
                ['Mode', formData.test_type === LIVE ? 'Live Test' : 'Pre-load Test'],
                ['Font Group', formData.font_group],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold text-navy-800">{v}</dd></div>
              ))}
            </dl>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-bold text-navy-800"><EyeIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Content Preview</h3>
            {previewText
              ? <p className="max-h-[220px] overflow-hidden text-[13px] leading-relaxed text-slate-700" style={{ fontFamily: contentFontFamily, fontSize: useHindiFont ? '17px' : undefined }}>{previewText}{words > 80 ? ' …' : ''}</p>
              : <p className="text-[12px] text-slate-400">The passage will appear here.</p>}
            {isSteno && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700"><FileTextIcon className="h-3.5 w-3.5" aria-hidden="true" /> Students never see this text in steno tests.</p>}
          </section>
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11.5px] text-amber-900">
            <p className="mb-1.5 flex items-center gap-1.5 font-semibold"><LayersIcon className="h-4 w-4" aria-hidden="true" /> Notes</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Results are compared against this exact text.</li>
              <li>Changing the font group clears the selected exams.</li>
              <li>Live tests appear to students only on the test date.</li>
            </ul>
          </section>
        </aside>

        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-card backdrop-blur xl:col-span-2">
          <p className="text-[11.5px] text-slate-500">Fields marked <span className="text-danger">*</span> are required.</p>
          <div className="ml-auto flex gap-2">
            <Link to="/admin/content" className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
            {!editing && <button type="button" onClick={() => { setFormData(blankChapter()); setAudioFile(null); }} className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">Reset</button>}
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
              <SaveIcon className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving & Uploading...' : editing ? 'Save Changes' : 'Save & Create Test'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
