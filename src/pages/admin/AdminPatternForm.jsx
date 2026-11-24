import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClockIcon, GaugeIcon, InfoIcon, PlusIcon, SaveIcon, ScaleIcon, SettingsIcon, TargetIcon, Trash2Icon } from 'lucide-react';
import { resultPatternService } from '../../services/api';
import { PageHeading } from '../../ui/PageHeading';
import { defaultPatternData, msgOf, patternPayload, patternToForm } from '../../features/exams/adminExamData';

const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none transition-colors duration-150 focus:border-primary';
const labelCls = 'mb-1.5 block text-[12px] font-semibold text-navy-800';

function Card({ icon: Icon, title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
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
function YesNo({ label, value, onChange, name, yes = 'Yes', no = 'No' }) {
  return (
    <fieldset>
      <legend className={labelCls}>{label}</legend>
      <div className="flex gap-4">
        {[[true, yes], [false, no]].map(([v, t]) => (
          <label key={t} className="flex items-center gap-1.5 text-[12.5px] text-slate-700">
            <input type="radio" name={name} checked={!!value === v} onChange={() => onChange(v)} className="h-3.5 w-3.5 accent-primary" /> {t}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TimingBox({ title, badge, tone, children }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3.5">
      <h4 className="mb-2.5 flex items-center gap-2 text-[12.5px] font-bold text-navy-800">{title} <span className={`rounded px-1.5 py-[1px] text-[9.5px] font-bold ${tone}`}>{badge}</span></h4>
      {children}
    </div>
  );
}
function ResultWhen({ name, mode, time, onMode, onTime }) {
  return (
    <fieldset>
      <legend className={labelCls}>Show Result to Students</legend>
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[12.5px] text-slate-700">
          <input type="radio" name={name} checked={mode !== 'scheduled'} onChange={() => onMode('immediate')} className="h-3.5 w-3.5 accent-primary" /> Immediately
        </label>
        <label className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-slate-700">
          <input type="radio" name={name} checked={mode === 'scheduled'} onChange={() => onMode('scheduled')} className="h-3.5 w-3.5 accent-primary" /> At a set time
          <input type="time" aria-label="Result time" value={time || '21:00'} disabled={mode !== 'scheduled'} onChange={(e) => onTime(e.target.value)} className="ml-1 w-[120px] rounded-md border border-slate-300 bg-white px-2 py-1 text-[12px] text-navy-800 disabled:bg-slate-50 disabled:text-slate-400" />
        </label>
      </div>
    </fieldset>
  );
}

function Box({ title, children }) {
  return <fieldset className="rounded-lg border border-slate-200 p-3.5"><legend className="px-1.5 text-[12px] font-semibold text-slate-500">{title}</legend>{children}</fieldset>;
}
function Radios({ label, name, options, value, onChange }) {
  return (
    <fieldset>
      <legend className={labelCls}>{label}</legend>
      <div className="space-y-1.5">
        {options.map(([v, t, hint]) => (
          <label key={String(v)} className="flex items-start gap-1.5 text-[12.5px] text-slate-700">
            <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} className="mt-[3px] h-3.5 w-3.5 accent-primary" />
            <span>{t}{hint && <span className="block text-[11px] text-slate-500">{hint}</span>}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PenaltySettings({ p, setP }) {
  const set = (patch) => setP((x) => ({ ...x, ...patch }));
  const number = (key, label, { min = 0, max = 100, step = 'any', disabled = false } = {}) => (
    <input type="number" required min={min} max={max} step={step} aria-label={label} disabled={disabled} value={p[key] ?? ''}
      onChange={(e) => set({ [key]: e.target.value === '' ? '' : Number(e.target.value) })} className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-400`} />
  );
  const weight = (key, label) => <label key={key} className="block"><span className="mb-1 block text-[12px] text-slate-600">{label}</span>{number(key, label)}</label>;
  const source = p.count_right_words_only ? 'right' : p.speed_count === 'Strokes' ? 'strokes' : 'words';
  const ranges = p.marks_ranges || [];
  const setRange = (i, patch) => set({ marks_ranges: ranges.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  const rangeInput = (i, key, label) => (
    <input type="number" required min="0" step="any" aria-label={`${label} ${i + 1}`} value={ranges[i][key]} onChange={(e) => setRange(i, { [key]: e.target.value === '' ? '' : Number(e.target.value) })} className={`${inputCls} w-full`} />
  );
  return (
    <Card icon={SettingsIcon} title="Penalty & Calculation Settings">
      <div className="grid gap-4 sm:grid-cols-3">
        <Radios label="Speed Source" name="speedSource" value={source} options={[['words', 'Typed Words'], ['strokes', 'Typed Strokes'], ['right', 'Right Words Only']]}
          onChange={(v) => set(v === 'right' ? { count_right_words_only: true, speed_count: 'Words' } : { count_right_words_only: false, speed_count: v === 'strokes' ? 'Strokes' : 'Words' })} />
        <Radios label="Unit" name="speedUnit" value={p.speed_unit} options={[['WPM', 'WPM'], ['KDPH', 'KDPH', 'Key depressions per hour']]}
          onChange={(v) => { if (v !== p.speed_unit) { const f = (Number(p.strokes_per_word) || 5) * 60; set({ speed_unit: v, required_speed: Math.round(v === 'KDPH' ? p.required_speed * f : p.required_speed / f) }); } }} />
        <Field label="Strokes Per Word" required hint="(eg. 5)">{number('strokes_per_word', 'Strokes Per Word', { min: 1, max: 20 })}</Field>
      </div>
      <div className="mt-4">
        <Radios label="Remaining Words as Mistakes" name="remaining" value={p.count_omissions_as_errors !== false} onChange={(v) => set({ count_omissions_as_errors: v })}
          options={[[false, 'Enabled', 'Words skipped in the middle count; words left untyped at the end do not.'], [true, 'Count unattempted Ending words', 'Words left untyped at the end also count as mistakes.']]} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Box title="Mistake Penalty">
          <div className="space-y-3">
            {[['speed', 'Speed Penalty', 'WPM deducted from net speed per mistake'], ['words', 'Words Penalty', 'words deducted per mistake'], ['strokes', 'Strokes Penalty', 'strokes deducted per mistake']].map(([k, label, hint]) => (
              <div key={k}>
                <label className="mb-1 flex items-center gap-1.5 text-[12px] text-slate-700">
                  <input type="checkbox" aria-label={`Enable ${label}`} checked={!!p[`${k}_penalty_enabled`]} onChange={(e) => set({ [`${k}_penalty_enabled`]: e.target.checked })} className="h-3.5 w-3.5 accent-primary" /> {label} <span className="text-[11px] text-slate-400">({hint})</span>
                </label>
                {number(`${k}_penalty`, label, { disabled: !p[`${k}_penalty_enabled`] })}
              </div>
            ))}
            <p className="text-[11px] text-slate-500">Every ticked penalty is applied for each mistake. While Ignorable Mistakes is on, its own words deduction replaces the Words and Strokes penalties.</p>
          </div>
        </Box>
        <Box title="Mistakes Weight">
          <div className="grid gap-3 sm:grid-cols-2">
            {[['full_mistake_weight', 'Full Mistake Penalty'], ['half_mistake_weight', 'Half Mistake Penalty'], ['extra_word_weight', 'Extra Words Penalty'], ['missing_word_weight', 'Missing Words Penalty'], ['extra_space_weight', 'Extra Space Penalty'], ['punctuation_weight', 'Punctuation Penalty']].map(([k, l]) => weight(k, l))}
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-[12px] text-slate-600"><input type="checkbox" aria-label="Enable Ignorable Mistakes" checked={!!p.ignorable_mistakes_enabled} onChange={(e) => set({ ignorable_mistakes_enabled: e.target.checked })} className="h-3.5 w-3.5 accent-primary" /> Ignorable Mistakes (%)</label>
              {number('ignorable_mistakes_percent', 'Ignorable Mistakes (%)', { disabled: !p.ignorable_mistakes_enabled })}
            </div>
            {weight('mistakes_multiply', 'Mistakes Multiply')}
            {p.ignorable_mistakes_enabled && <div className="sm:col-span-2">{weight('ignorable_penalty_words_per_mistake', 'Words deducted per mistake beyond the ignorable limit')}</div>}
          </div>
        </Box>
        <Box title="Accuracy ON">
          <Radios label="" name="accuracyOn" value={p.accuracy_on} onChange={(v) => set({ accuracy_on: v })}
            options={[['typed_words', 'Typed Words'], ['total_words', 'Total Words'], ['typed_strokes', 'Typed Keystrokes'], ['total_strokes', 'Total Keystrokes'], ['speed', 'Net Speed ÷ Gross Speed', 'How patterns worked before this setting.']]} />
          <p className="mt-2 text-[11px] text-slate-500">For typing. Steno accuracy is always 100 − % of mistakes on the original words.</p>
        </Box>
        <Box title="Marks">
          <label className="mb-1 flex items-center gap-1.5 text-[12px] text-slate-700"><input type="checkbox" checked={!!p.marks_right_words_enabled} onChange={(e) => set({ marks_right_words_enabled: e.target.checked })} className="h-3.5 w-3.5 accent-primary" /> On Right Words</label>
          {number('marks_per_right_word', 'Marks per right word', { disabled: !p.marks_right_words_enabled })}
          <label className="mb-1 mt-3 flex items-center gap-1.5 text-[12px] text-slate-700"><input type="checkbox" checked={!!p.marks_net_wpm_enabled} onChange={(e) => set({ marks_net_wpm_enabled: e.target.checked, marks_ranges: e.target.checked && !ranges.length ? [{ from: 31, to: 35, marks: 12 }] : ranges })} className="h-3.5 w-3.5 accent-primary" /> On Net WPM</label>
          {p.marks_net_wpm_enabled && <>
            <div className="grid grid-cols-[1fr_auto_1fr_90px_28px] items-center gap-2 text-[11px] text-slate-500"><span className="col-span-3">Speed Range (WPM)</span><span>Marks</span></div>
            {ranges.map((r, i) => (
              <div key={i} className="mt-1 grid grid-cols-[1fr_auto_1fr_90px_28px] items-center gap-2">
                {rangeInput(i, 'from', 'Range from')}<span>-</span>{rangeInput(i, 'to', 'Range to')}{rangeInput(i, 'marks', 'Range marks')}
                <button type="button" aria-label={`Remove range ${i + 1}`} onClick={() => set({ marks_ranges: ranges.filter((_, k) => k !== i) })} className="text-rose-500"><Trash2Icon className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            ))}
            <button type="button" onClick={() => { const last = ranges[ranges.length - 1]; const from = last ? Number(last.to) + 1 : 31; set({ marks_ranges: [...ranges, { from, to: from + 4, marks: 0 }] }); }} className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-primary"><PlusIcon className="h-3.5 w-3.5" aria-hidden="true" /> Add Range</button>
          </>}
        </Box>
      </div>
    </Card>
  );
}

export default function AdminPatternForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [p, setP] = useState(defaultPatternData);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return undefined;
    let cancelled = false;
    resultPatternService.getPatterns()
      .then((list) => {
        if (cancelled) return;
        const found = (list || []).find((x) => x.id === id);
        if (!found) { setError('Pattern not found.'); return; }
        setP(patternToForm(found));
      })
      .catch((err) => { if (!cancelled) setError(msgOf(err, 'Could not load the pattern.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [editing, id]);

  const setVal = (key) => (v) => setP((x) => ({ ...x, [key]: v }));
  const num = (key, parse) => (e) => setVal(key)(parse(e.target.value));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (p.applicable_typing === false && p.applicable_steno === false) { setError('Choose at least one of Typing Exam or Steno Exam under Applicable For.'); return; }
    setSaving(true);
    try {
      if (editing) await resultPatternService.updatePattern(id, patternPayload(p));
      else await resultPatternService.createPattern(patternPayload(p));
      navigate('/admin/result-patterns', { state: { notice: editing ? `Saved pattern ${p.name}.` : `Pattern ${p.name} created.` } });
    } catch (err) {
      setError(`Error saving pattern: ${msgOf(err)}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="nd p-6 text-[12.5px] text-slate-500">Loading pattern…</div>;

  return (
    <div className="nd">
      <PageHeading
        icon={<ScaleIcon className="h-5 w-5" />}
        title={editing ? `Edit Result Pattern: ${p.name}` : 'New Result Pattern'}
        subtitle="Passing criteria, penalty and calculation rules. Result components are chosen on each exam."
        crumbs={[{ label: 'Exam Management', to: '/admin/exams' }, { label: 'Result Patterns', to: '/admin/result-patterns' }, { label: editing ? 'Edit' : 'New' }]} />

      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger">{error}</p>}

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <Card icon={GaugeIcon} title="Pattern Information">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Result Name" required><input type="text" required value={p.name} onChange={(e) => setVal('name')(e.target.value)} placeholder="e.g. SSC Standard" className={inputCls} /></Field></div>
              <div className="sm:col-span-2"><Field label="Description (optional)"><textarea rows={2} maxLength={500} value={p.description || ''} onChange={(e) => setVal('description')(e.target.value)} placeholder="e.g. Standard result pattern for SSC typing exams." className={inputCls} /></Field></div>
              <fieldset>
                <legend className={labelCls}>Applicable For <span className="text-danger">*</span></legend>
                <div className="flex gap-4">
                  {[['applicable_typing', 'Typing Exam'], ['applicable_steno', 'Steno Exam']].map(([k, t]) => (
                    <label key={k} className="flex items-center gap-1.5 text-[12.5px] text-slate-700">
                      <input type="checkbox" checked={p[k] !== false} onChange={(e) => setVal(k)(e.target.checked)} className="h-4 w-4 accent-primary" /> {t}
                    </label>
                  ))}
                </div>
                <span className="mt-1 block text-[11px] text-slate-500">Only these exam types offer this pattern.</span>
              </fieldset>
              <div>
                <YesNo name="def" label="Default Pattern" value={p.is_default} onChange={setVal('is_default')} />
                <span className="mt-1 block text-[11px] text-slate-500">Pre-selected when you add a new exam.</span>
              </div>
              <Field label="Transposition (Steno)" hint="Words typed in swapped order, e.g. “public since” for “since public”.">
                <select value={p.transposition_mistake || 'none'} onChange={(e) => setVal('transposition_mistake')(e.target.value)} className={inputCls}>
                  <option value="none">Not a mistake</option><option value="half">Half mistake</option><option value="full">Full mistake</option>
                </select>
              </Field>
            </div>
          </Card>

          <Card icon={TargetIcon} title="Passing Criteria">
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field label="Result Mode" required>
                <select value={p.qualify_on} onChange={(e) => setVal('qualify_on')(e.target.value)} className={inputCls}><option value="NWPM">Net WPM + Accuracy</option><option value="GWPM">Gross WPM + Accuracy</option></select>
              </Field>
              <Field label={`Minimum Qualifying Speed (${p.speed_unit})`} required hint="An exam can set its own per language."><input type="number" required value={p.required_speed} onChange={num('required_speed', (v) => parseInt(v, 10))} className={inputCls} /></Field>
              <Field label="Minimum Accuracy (%)" required><input type="number" required value={p.required_accuracy} onChange={num('required_accuracy', (v) => parseInt(v, 10))} className={inputCls} /></Field>
            </div>
          </Card>
        </div>

        <PenaltySettings p={p} setP={setP} />

        <Card icon={ClockIcon} title="When Students See Their Result and Rank">
          <div className="grid gap-3 lg:grid-cols-2">
            <TimingBox title="Live Test" tone="bg-emerald-100 text-emerald-700" badge="LIVE">
              <ResultWhen name="lr" mode={p.live_result_mode} time={p.live_result_time} onMode={setVal('live_result_mode')} onTime={setVal('live_result_time')} />
              <fieldset className="mt-3">
                <legend className={labelCls}>Show Rank</legend>
                <div className="space-y-1.5">
                  {[['immediate', 'Immediately'], ['after_session', 'After the live test session ends (end of the test day)']].map(([v, t]) => (
                    <label key={v} className="flex items-center gap-1.5 text-[12.5px] text-slate-700">
                      <input type="radio" name="lrank" checked={p.live_rank_mode === v} onChange={() => setVal('live_rank_mode')(v)} className="h-3.5 w-3.5 accent-primary" /> {t}
                    </label>
                  ))}
                </div>
              </fieldset>
            </TimingBox>
            <TimingBox title="Pre-load Test" tone="bg-amber-100 text-amber-700" badge="PRELOAD">
              <ResultWhen name="pr" mode={p.preload_result_mode} time={p.preload_result_time} onMode={setVal('preload_result_mode')} onTime={setVal('preload_result_time')} />
            </TimingBox>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500"><InfoIcon className="h-3.5 w-3.5" aria-hidden="true" /> Times are India time. A test taken after the set time shows its result at that time the next day. Scores are not affected.</p>
        </Card>

        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-card backdrop-blur">
          <p className="text-[11.5px] text-slate-500">Changes apply to every exam using this pattern, for new results.</p>
          <div className="ml-auto flex gap-2">
            <Link to="/admin/result-patterns" className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-md bg-[#6F42C1] px-4 py-2 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-60">
              <SaveIcon className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : editing ? 'Save Changes' : 'Save Pattern'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
