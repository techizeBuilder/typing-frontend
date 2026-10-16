import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckSquareIcon, EyeIcon, GaugeIcon, InfoIcon, SaveIcon, ScaleIcon, SquareIcon, TargetIcon } from 'lucide-react';
import { resultPatternService } from '../../services/api';
import { PageHeading } from '../../ui/PageHeading';
import { VISIBILITY, defaultPatternData, msgOf, patternPayload } from '../../features/exams/adminExamData';

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
        setP({ ...defaultPatternData(), ...patternPayload(found) });
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
        subtitle="Penalty rules, passing criteria and which result components students see."
        crumbs={[{ label: 'Exam Management', to: '/admin/exams' }, { label: 'Result Patterns', to: '/admin/result-patterns' }, { label: editing ? 'Edit' : 'New' }]} />

      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger">{error}</p>}

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <Card icon={GaugeIcon} title="Pattern Information & Speed">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Result Name" required><input type="text" required value={p.name} onChange={(e) => setVal('name')(e.target.value)} placeholder="e.g. SSC Standard" className={inputCls} /></Field></div>
              <Field label="Speed Count">
                <select value={p.speed_count} onChange={(e) => setVal('speed_count')(e.target.value)} className={inputCls}><option value="Words">Words</option><option value="Strokes">Strokes</option></select>
              </Field>
              <YesNo name="crw" label="Count only Right Words" value={p.count_right_words_only} onChange={setVal('count_right_words_only')} />
              <YesNo name="hm" label="Half Mistake (Count or Not)" value={p.half_mistake_enabled} onChange={setVal('half_mistake_enabled')} />
              <YesNo name="om" label="Count Omitted / Left Words as Error" value={p.count_omissions_as_errors !== false} onChange={setVal('count_omissions_as_errors')} />
            </div>
          </Card>

          <Card icon={TargetIcon} title="Passing Criteria & Penalty">
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field label="Qualify on">
                <select value={p.qualify_on} onChange={(e) => setVal('qualify_on')(e.target.value)} className={inputCls}><option value="NWPM">NWPM</option><option value="GWPM">GWPM</option></select>
              </Field>
              <Field label="Qualifying Speed" required><input type="number" required value={p.required_speed} onChange={num('required_speed', (v) => parseInt(v, 10))} className={inputCls} /></Field>
              <Field label="Qualifying Accuracy (%)" required><input type="number" required value={p.required_accuracy} onChange={num('required_accuracy', (v) => parseInt(v, 10))} className={inputCls} /></Field>
              <Field label="Penalty (Word / Stroke)">
                <select value={p.penalty_type} onChange={(e) => setVal('penalty_type')(e.target.value)} className={inputCls}><option value="Word">Word</option><option value="Stroke">Stroke</option></select>
              </Field>
              <Field label="How Much Penalty" required><input type="number" step="0.5" required value={p.penalty_value} onChange={num('penalty_value', parseFloat)} className={inputCls} /></Field>
            </div>
          </Card>
        </div>

        <Card icon={ScaleIcon} title="Ignorable Mistakes">
          <div className="grid gap-3.5 sm:grid-cols-3">
            <YesNo name="ign" label="Ignorable Mistakes" yes="Enabled" no="Disabled" value={p.ignorable_mistakes_enabled} onChange={setVal('ignorable_mistakes_enabled')} />
            {p.ignorable_mistakes_enabled && <>
              <Field label="Ignorable Allowance (% of words typed)" hint="Mistakes up to this % of total words typed are ignored (e.g. 5% of 400 words = 20 free mistakes).">
                <input type="number" min="0" max="100" step="0.1" placeholder="e.g. 5" value={p.ignorable_mistakes_percent ?? 0} className={inputCls}
                  onChange={(e) => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value); setVal('ignorable_mistakes_percent')(Math.max(0, Math.min(100, Number.isNaN(v) ? 0 : v))); }} />
              </Field>
              <Field label="Words Deducted per Excess Mistake" hint="Each mistake beyond the allowance deducts this many words from net speed.">
                <input type="number" min="0" step="1" placeholder="e.g. 10" value={p.ignorable_penalty_words_per_mistake ?? 10} className={inputCls}
                  onChange={(e) => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value); setVal('ignorable_penalty_words_per_mistake')(Math.max(0, Number.isNaN(v) ? 0 : v)); }} />
              </Field>
            </>}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500"><InfoIcon className="h-3.5 w-3.5" aria-hidden="true" /> When enabled, a percentage of the student’s mistakes is ignored before scoring.</p>
        </Card>

        <Card icon={EyeIcon} title="Result Component Visibility (Show / Hide on the Result Screen)">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {VISIBILITY.map(([key, label]) => (
              <li key={key}>
                <label className="flex items-center gap-2 text-[12.5px] font-medium text-navy-800">
                  <input type="checkbox" checked={p[key] !== false} onChange={(e) => setVal(key)(e.target.checked)} className="h-4 w-4 accent-primary" /> {label}
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setP((x) => ({ ...x, ...Object.fromEntries(VISIBILITY.map(([k]) => [k, true])) }))} className="flex items-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1.5 text-[12px] font-medium text-emerald-700 hover:bg-emerald-50"><CheckSquareIcon className="h-3.5 w-3.5" aria-hidden="true" /> Select All</button>
            <button type="button" onClick={() => setP((x) => ({ ...x, ...Object.fromEntries(VISIBILITY.map(([k]) => [k, false])) }))} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"><SquareIcon className="h-3.5 w-3.5" aria-hidden="true" /> Unselect All</button>
          </div>
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
