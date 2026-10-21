import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardListIcon, FileTextIcon, ImagePlusIcon, InfoIcon, LandmarkIcon, LayersIcon, ListChecksIcon, SaveIcon, ScaleIcon, SettingsIcon, TypeIcon,
} from 'lucide-react';
import { examService, resultPatternService } from '../../services/api';
import { PageHeading } from '../../ui/PageHeading';
import { resolveAssetUrl } from '../../features/exams/examData';
import { useFontGroupSettings } from '../../features/fontGroups/fontGroups';
import {
  BACKSPACE, EXAM_REGIONS, FONT_GROUPS, FONT_SIZES, HIGHLIGHT_COLORS, SCREENS, TEST_TIMES, defaultExamData, examToForm, msgOf, saveExam, screenLabel,
} from '../../features/exams/adminExamData';

const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none transition-colors duration-150 focus:border-primary';
const labelCls = 'mb-1.5 block text-[12px] font-semibold text-navy-800';

function Card({ icon: Icon, title, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-card ${className}`}>
      <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-bold text-navy-800"><Icon className="h-4 w-4 text-primary" aria-hidden="true" /> {title}</h3>
      {children}
    </section>
  );
}
function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}{required && <span className="text-danger"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}
// Yes / No as two radio buttons (the old form used Y/N selects).
function YesNo({ label, value, onChange, name }) {
  return (
    <fieldset>
      <legend className={labelCls}>{label}</legend>
      <div className="flex gap-4">
        {[[true, 'Yes'], [false, 'No']].map(([v, t]) => (
          <label key={t} className="flex items-center gap-1.5 text-[12.5px] text-slate-700">
            <input type="radio" name={name} checked={!!value === v} onChange={() => onChange(v)} className="h-3.5 w-3.5 accent-primary" /> {t}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function AdminExamForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const { isActive: isFontGroupActive } = useFontGroupSettings();
  const [examData, setExamData] = useState(defaultExamData);
  const [currentExam, setCurrentExam] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [logo, setLogo] = useState(null);
  const [rulesPdf, setRulesPdf] = useState(null);
  const [removeRulesPdf, setRemoveRulesPdf] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    resultPatternService.getPatterns().then((p) => {
      if (cancelled) return;
      setPatterns(p || []);
      // A new exam starts with the Default pattern selected.
      const def = !editing && (p || []).find((x) => x.is_default);
      if (def) setExamData((d) => (d.result_pattern_id ? d : { ...d, result_pattern_id: def.id }));
    }).catch(() => {});
    if (editing) {
      examService.getExamById(id)
        .then((e) => { if (cancelled) return; if (!e) { setError('Exam not found.'); return; } setCurrentExam(e); setExamData(examToForm(e)); })
        .catch((err) => { if (!cancelled) setError(msgOf(err, 'Could not load the exam.')); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [editing, id]);

  const set = (key, parse = (v) => v) => (e) => setExamData((d) => ({ ...d, [key]: parse(e.target.value) }));
  const setVal = (key) => (v) => setExamData((d) => ({ ...d, [key]: v }));

  // Inactive font groups (Font Groups page) can't be newly assigned; ones the exam
  // already uses stay visible so they can be removed.
  const offeredFontGroups = FONT_GROUPS.filter((fg) => isFontGroupActive(fg) || (examData.font_groups || []).includes(fg));
  const allGroups = offeredFontGroups.length > 0 && offeredFontGroups.every((g) => (examData.font_groups || []).includes(g));
  const toggleGroup = (fg) => setExamData((d) => {
    const s = new Set(d.font_groups || []);
    if (s.has(fg)) s.delete(fg); else s.add(fg);
    return { ...d, font_groups: [...s] };
  });

  // The MAX/MIN fields are counted in Words or Strokes depending on the
  // selected result pattern's speed_count. The unit follows the exam type
  // automatically instead of being chosen separately.
  const pattern = patterns.find((p) => String(p.id) === String(examData.result_pattern_id));
  // Patterns marked for this exam's kind (Typing / Steno font groups); the
  // currently chosen one always stays in the list.
  const groups = examData.font_groups || [];
  const wantsSteno = groups.some((g) => g.startsWith('Steno'));
  const wantsTyping = groups.some((g) => !g.startsWith('Steno'));
  const offeredPatterns = patterns.filter((p) => String(p.id) === String(examData.result_pattern_id) || groups.length === 0
    || (wantsTyping && p.applicable_typing !== false) || (wantsSteno && p.applicable_steno !== false));
  const unit = pattern?.speed_count === 'Strokes' ? 'Strokes' : 'Words';
  // MAXIMUM must always be greater than MINIMUM. A maximum of 0 means "No Limit"
  // (effectively unbounded) and a minimum of 0 means "No Minimum", so the rule
  // only applies when both fields hold a real (> 0) value.
  const maxWS = Number(examData.max_words_strokes) || 0;
  const minWS = Number(examData.no_of_words_strokes) || 0;
  const rangeInvalid = maxWS > 0 && minWS > 0 && maxWS <= minWS;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (rangeInvalid) { setError(`MAXIMUM WORD/STROKE (${maxWS}) must be greater than MINIMUM WORD/STROKE (${minWS}).`); return; }
    if ((examData.font_groups || []).length === 0) { setError('Select at least one font group.'); return; }
    setSaving(true);
    try {
      await saveExam(examData, currentExam, { logo, rulesPdf, removeRulesPdf });
      navigate('/admin/exams', { state: { notice: editing ? `Saved exam ${examData.name}.` : `Exam ${examData.name} created.` } });
    } catch (err) {
      setError(`Error saving exam: ${msgOf(err)}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const logoPreview = logo ? URL.createObjectURL(logo) : (currentExam?.image_url ? resolveAssetUrl(currentExam.image_url) : null);
  const summary = [
    ['Exam Name', examData.name || '—'], ['Display Title', examData.display_title || '—'], ['Test Time', `${examData.test_time_minutes} min`],
    ['Screen Layout', screenLabel(examData.screen_type)], ['Result Pattern', pattern?.name || '—'], ['Backspace', BACKSPACE.find(([v]) => v === examData.backspace_control)?.[1] || '—'],
    ['Font Groups', (examData.font_groups || []).join(', ') || '—'], ['Test Mode', examData.test_paper_screen === 'Paper' ? 'On Paper' : 'On Screen'],
    ['Auto Submit', examData.auto_submit ? 'Yes' : 'No'], ['Region', examData.region || 'All India'], ['Status', examData.is_active === false ? 'Inactive' : 'Active'],
  ];

  if (loading) return <div className="nd p-6 text-[12.5px] text-slate-500">Loading exam…</div>;

  return (
    <div className="nd">
      <PageHeading
        icon={<LayersIcon className="h-5 w-5" />}
        title={editing ? `Edit Exam${currentExam ? `: ${currentExam.name}` : ''}` : 'Add New Exam'}
        subtitle={editing ? 'Change the exam settings. Students see the changes on their next test.' : 'Create a new exam with required settings.'}
        crumbs={[{ label: 'Exam Management', to: '/admin/exams' }, { label: editing ? 'Edit Exam' : 'Add New Exam' }]} />

      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger">{error}</p>}

      <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 2xl:grid-cols-[1fr_260px]">
            <Card icon={FileTextIcon} title="1. Basic Information">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Exam Name" required><input type="text" required value={examData.name} onChange={set('name')} placeholder="Enter exam name" className={inputCls} /></Field>
                <Field label="Display Title" hint="Shown to students under the exam name."><input type="text" maxLength={150} value={examData.display_title || ''} onChange={set('display_title')} placeholder="Optional, e.g. SSC CGL Tier-II DEST 2026" className={inputCls} /></Field>
                <Field label="Test Time" required>
                  <select value={examData.test_time_minutes} onChange={set('test_time_minutes', (v) => parseInt(v, 10))} className={inputCls}>{TEST_TIMES.map((t) => <option key={t} value={t}>{t} mins</option>)}</select>
                </Field>
                <Field label="Screen Layout" required>
                  <select value={examData.screen_type} onChange={set('screen_type')} className={inputCls}>{SCREENS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </Field>
                <Field label="Region" hint="Used by the region filter on the student Typing Exam page.">
                  <select value={examData.region || ''} onChange={set('region')} className={inputCls}><option value="">Not set (All India)</option>{EXAM_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
                </Field>
                <fieldset>
                  <legend className={labelCls}>Status</legend>
                  <div className="flex gap-4 py-2">
                    {[[true, 'Active'], [false, 'Inactive']].map(([v, t]) => (
                      <label key={t} className="flex items-center gap-1.5 text-[12.5px] text-slate-700">
                        <input type="radio" name="examStatus" checked={(examData.is_active !== false) === v} onChange={() => setVal('is_active')(v)} className="h-3.5 w-3.5 accent-primary" /> {t}
                      </label>
                    ))}
                  </div>
                  <span className="block text-[11px] text-slate-500">Inactive exams are hidden from students.</span>
                </fieldset>
              </div>
            </Card>
            <Card icon={ImagePlusIcon} title="2. Exam Logo">
              <div className="flex flex-col items-center gap-2.5 text-center">
                {logoPreview
                  ? <img src={logoPreview} alt="" className="h-24 w-24 rounded-lg border border-slate-200 bg-white object-contain p-1" />
                  : <span className="grid h-24 w-24 place-items-center rounded-lg border-2 border-dashed border-slate-300 text-primary"><LandmarkIcon className="h-8 w-8" aria-hidden="true" /></span>}
                <label className="cursor-pointer rounded-md bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-700">
                  {logoPreview ? 'Change Logo' : 'Choose File'}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => setLogo(e.target.files[0] || null)} />
                </label>
                <span className="text-[10.5px] text-slate-400">JPG, PNG</span>
              </div>
            </Card>
          </div>

          <Card icon={SettingsIcon} title="3. Exam Rules & Flow Settings">
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Result Rule (Pattern)" required>
                <select required value={examData.result_pattern_id} onChange={set('result_pattern_id')} className={inputCls}>
                  <option value="">--Select--</option>{offeredPatterns.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_default ? ' (Default)' : ''}</option>)}
                </select>
              </Field>
              <Field label="Backspace Option">
                <select value={examData.backspace_control} onChange={set('backspace_control')} className={inputCls}>{BACKSPACE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </Field>
              <Field label="Highlighting Color">
                <span className="flex items-center gap-2">
                  <span className="h-8 w-8 shrink-0 rounded border border-slate-300" style={{ backgroundColor: examData.highlight_color }} aria-hidden="true" />
                  <select value={examData.highlight_color} onChange={set('highlight_color')} className={`${inputCls} capitalize`}>{HIGHLIGHT_COLORS.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}</select>
                </span>
              </Field>
              <YesNo name="hw" label="Highlight Word" value={examData.highlight_word} onChange={setVal('highlight_word')} />
              <YesNo name="as" label="Auto Scroll" value={examData.auto_scroll} onChange={setVal('auto_scroll')} />
              <YesNo name="he" label="Highlight Error" value={examData.highlight_error} onChange={setVal('highlight_error')} />
              <Field label="Font Size (User Screen)">
                <select value={examData.font_size_user_screen} onChange={set('font_size_user_screen', (v) => parseInt(v, 10))} className={inputCls}>{FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}</select>
              </Field>
              <Field label="Font Size (Exam Screen)">
                <select value={examData.font_size_test_screen} onChange={set('font_size_test_screen', (v) => parseInt(v, 10))} className={inputCls}>{FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}</select>
              </Field>
              <fieldset>
                <legend className={labelCls}>Test (On Paper / On Screen)</legend>
                <div className="flex gap-4">
                  {[['Screen', 'On Screen'], ['Paper', 'On Paper']].map(([v, t]) => (
                    <label key={v} className="flex items-center gap-1.5 text-[12.5px] text-slate-700">
                      <input type="radio" name="paper" checked={examData.test_paper_screen === v} onChange={() => setVal('test_paper_screen')(v)} className="h-3.5 w-3.5 accent-primary" /> {t}
                    </label>
                  ))}
                </div>
              </fieldset>
              <YesNo name="asub" label="Auto Submit" value={examData.auto_submit} onChange={setVal('auto_submit')} />
              <YesNo name="rt" label="Test Re-type" value={examData.test_re_type} onChange={setVal('test_re_type')} />
            </div>
          </Card>

          <Card icon={TypeIcon} title="4. Font Groups & Word Limits">
            <span className={labelCls}>Font Groups <span className="text-danger">*</span> <span className="font-normal text-slate-500">— which languages / fonts this exam is offered in</span></span>
            <div className="mb-3.5 flex flex-wrap gap-2">
              <label className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold ${allGroups ? 'border-primary bg-primary-50 text-primary-700' : 'border-slate-300 text-slate-600'}`}>
                <input type="checkbox" checked={allGroups} onChange={() => setExamData((d) => ({ ...d, font_groups: allGroups ? [] : [...offeredFontGroups] }))} className="h-3.5 w-3.5 accent-primary" /> Select All
              </label>
              {offeredFontGroups.map((fg) => {
                const on = (examData.font_groups || []).includes(fg);
                return (
                  <label key={fg} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium ${on ? 'border-primary bg-primary-50 text-primary-700' : 'border-slate-300 text-slate-600'}`}>
                    <input type="checkbox" checked={on} onChange={() => toggleGroup(fg)} className="h-3.5 w-3.5 accent-primary" /> {fg}
                  </label>
                );
              })}
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label={`Maximum Words / Strokes (${unit})`} hint={`Maximum ${unit.toLowerCase()} from the uploaded content shown to the student (0 = No Limit).`}>
                <input type="number" min="0" step="1" value={examData.max_words_strokes ?? 0} placeholder="0 = No Limit" className={inputCls}
                  onChange={(e) => setVal('max_words_strokes')(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))} />
              </Field>
              <Field label={`Minimum Words / Strokes (${unit})`} hint={`Minimum ${unit.toLowerCase()} the student must type. The exam cannot be submitted until this many are typed (0 = No Minimum).`}>
                <input type="number" min="0" step="1" value={examData.no_of_words_strokes ?? 0} placeholder="0 = No Minimum" className={`${inputCls} ${rangeInvalid ? 'border-danger' : ''}`}
                  onChange={(e) => setVal('no_of_words_strokes')(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))} />
              </Field>
            </div>
            {rangeInvalid && <p className="mt-2 text-[12px] font-semibold text-danger">Maximum ({maxWS}) must be greater than Minimum ({minWS}).</p>}
          </Card>

          <Card icon={ClipboardListIcon} title="5. Information for Students">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Conducted By"><input type="text" maxLength={150} value={examData.conducted_by || ''} onChange={set('conducted_by')} placeholder="Optional, e.g. Staff Selection Commission" className={inputCls} /></Field>
              <Field label="Mistake Policy" hint="Information only — scoring always follows the Result Pattern."><input type="text" maxLength={200} value={examData.mistake_policy || ''} onChange={set('mistake_policy')} placeholder="Optional, e.g. 10 words deducted per full mistake" className={inputCls} /></Field>
              <div className="sm:col-span-2">
                <span className={labelCls}>Official Rules PDF <span className="font-normal text-slate-500">— students can download it from the exam page (PDF, max 10 MB)</span></span>
                {currentExam?.rules_pdf_url && !rulesPdf && !removeRulesPdf &&
                  <p className="mb-1.5 flex items-center gap-3 text-[12px]">
                    <a href={resolveAssetUrl(currentExam.rules_pdf_url)} target="_blank" rel="noreferrer" className="font-medium text-primary underline">View current PDF</a>
                    <button type="button" onClick={() => setRemoveRulesPdf(true)} className="text-danger">Remove</button>
                  </p>}
                {removeRulesPdf && !rulesPdf && <p className="mb-1.5 text-[12px] text-danger">PDF will be removed on save. <button type="button" onClick={() => setRemoveRulesPdf(false)} className="text-primary">Undo</button></p>}
                <input type="file" accept="application/pdf,.pdf" className="text-[12px]" onChange={(e) => {
                  const f = e.target.files[0];
                  if (f && f.size > 10 * 1024 * 1024) { alert('The rules PDF must be 10 MB or smaller.'); e.target.value = ''; return; }
                  setRulesPdf(f || null);
                }} />
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-bold text-navy-800"><ListChecksIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Exam Summary (Preview)</h3>
            <dl className="space-y-1.5 text-[12px]">
              {summary.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold text-navy-800">{v}</dd></div>)}
            </dl>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-bold text-navy-800"><ScaleIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Result Pattern Rules</h3>
            {pattern ? (
              <>
                <dl className="space-y-1.5 text-[12px]">
                  {[
                    ['Qualifying', `${pattern.required_speed} ${pattern.qualify_on} · ${pattern.required_accuracy}%`],
                    ['Speed Count', pattern.speed_count], ['Penalty', `${pattern.penalty_value} ${pattern.penalty_type}(s) per mistake`],
                    ['Half Mistakes', pattern.half_mistake_enabled ? 'Count as 0.5' : 'Count as full'],
                    ['Ignorable Mistakes', pattern.ignorable_mistakes_enabled ? `${pattern.ignorable_mistakes_percent}%` : 'Off'],
                  ].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold text-navy-800">{v}</dd></div>)}
                </dl>
                <Link to={`/admin/result-patterns/${pattern.id}/edit`} className="mt-3 inline-block text-[12px] font-semibold text-primary">Edit this pattern →</Link>
              </>
            ) : <p className="text-[12px] text-slate-500">Select a result pattern to see its rules. <Link to="/admin/result-patterns/new" className="font-semibold text-primary">Create one →</Link></p>}
          </section>
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11.5px] text-amber-900">
            <p className="mb-1.5 flex items-center gap-1.5 font-semibold"><InfoIcon className="h-4 w-4" aria-hidden="true" /> Important Notes</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Scoring always follows the selected Result Pattern.</li>
              <li>Tests are linked to exams from Test Management.</li>
              <li>Inactive font groups can’t be newly assigned.</li>
            </ul>
          </section>
        </aside>

        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-card backdrop-blur xl:col-span-2">
          <p className="text-[11.5px] text-slate-500">Fields marked <span className="text-danger">*</span> are required.</p>
          <div className="ml-auto flex gap-2">
            <Link to="/admin/exams" className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
            <button type="submit" disabled={saving || rangeInvalid} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
              <SaveIcon className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Exam'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
