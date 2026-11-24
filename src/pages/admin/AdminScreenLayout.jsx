import { useEffect, useState } from 'react';
import { CheckCircle2Icon, EyeIcon, InfoIcon, MonitorIcon, RotateCcwIcon, SaveIcon, Volume2Icon } from 'lucide-react';
import { examService, settingService } from '../../services/api';
import { Link } from 'react-router-dom';
import { PageHeading } from '../../ui/PageHeading';
import { LoadingState } from '../../features/exams/ExamUI';
import { resolveAssetUrl } from '../../features/exams/examData';
import InstituteScreen from '../../features/screenLayout/InstituteScreen';
import { getExamFontGroups, screenLabel, setExamScreen } from '../../features/exams/adminExamData';
import { DEFAULT_LAYOUT, HEIGHT_LIMITS, LAYOUT_POSITIONS, mergeLayout, playKeyClick, setScreenLayout } from '../../features/screenLayout/screenLayout';

const card = 'rounded-xl border border-slate-200 bg-white p-4 shadow-card';
const labelCls = 'mb-1.5 block text-[11.5px] font-semibold text-navy-800';
const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-[12px] outline-none focus:border-primary';

const HEADER_OPTIONS = [['examName', 'Exam Name'], ['mainTitle', 'Exam Title'], ['instruction', 'Instruction (sub title)'], ['logo', 'Logo'], ['showHideText', 'Show / Hide Text Option']];
const BUTTON_OPTIONS = [['fontSize', 'Font Size Buttons (A- / A+)'], ['fullScreen', 'Full Screen'], ['pause', 'Pause / Resume'], ['submit', 'Submit Button']];
const CANDIDATE_OPTIONS = [['photo', 'Candidate Photo'], ['name', 'Name'], ['rollNo', 'Roll No.']];
const COLOR_LABELS = [
  ['headerBg', 'Header BG'], ['headerText', 'Header Text'], ['bodyBg', 'Body BG'], ['passageBg', 'Passage BG'],
  ['typingBg', 'Typing BG'], ['buttonBg', 'Button BG'], ['buttonText', 'Button Text'], ['border', 'Border Color'],
  ['submitBg', 'Submit Button'], ['fontBtnBg', 'A- / A+ Button BG'], ['fontBtnText', 'A- / A+ Button Text'],
];
const SAMPLE = 'India is a land of diversity. It is a country where people of different religions, cultures and traditions live together in unity. Our country has made great progress in every field. Education, science, technology, agriculture and industry have developed rapidly.';

const errorMessage = (err, fallback) => {
  const msg = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};

function Checks({ options, values, onChange }) {
  return (
    <ul className="space-y-2">
      {options.map(([key, label]) => (
        <li key={key}>
          <label className="flex items-center gap-2 text-[12px] text-slate-700">
            <input type="checkbox" checked={values[key]} onChange={(e) => onChange({ ...values, [key]: e.target.checked })} className="h-3.5 w-3.5 accent-primary" />
            {label}
          </label>
        </li>
      ))}
    </ul>
  );
}

function PositionPicker({ value, onChange, label }) {
  return (
    <div>
      <p className={labelCls}>{label}</p>
      <ul className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={label}>
        {LAYOUT_POSITIONS.map((p) => {
          const active = p === value;
          return (
            <li key={p}>
              <button type="button" role="radio" aria-checked={active} onClick={() => onChange(p)} title={p}
                className={`relative w-full rounded-md border p-1.5 transition-colors duration-150 ${active ? 'border-primary bg-primary-50' : 'border-slate-200 hover:border-primary'}`}>
                <span className="block h-9 rounded-sm border border-slate-200 bg-white p-1">
                  <span className={`block h-2 w-7 rounded-sm bg-primary/60 ${p.includes('Bottom') ? 'mt-[18px]' : ''} ${p.startsWith('Center') ? 'mx-auto' : p.startsWith('Right') ? 'ml-auto' : ''}`} />
                </span>
                <span className="mt-1 block text-[10px] text-slate-600">{p}</span>
                {active && <CheckCircle2Icon className="absolute -right-1.5 -top-1.5 h-4 w-4 fill-primary text-white" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Where the layout appears: the typing exams whose Screen Layout is Screen 7.
function LayoutExams() {
  const [exams, setExams] = useState(null);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const load = () => examService.getExams().then((d) => setExams(Array.isArray(d) ? d : [])).catch(() => setMsg('Could not load the exams.'));
  useEffect(() => { load(); }, []);
  const typing = (exams || []).filter((e) => getExamFontGroups(e).some((g) => !g.includes('Steno')));
  const using = typing.filter((e) => e.screen_type === 'Screen 7');
  const others = typing.filter((e) => e.screen_type !== 'Screen 7');
  const apply = async () => {
    const exam = others.find((e) => e.id === pick);
    if (!exam) return;
    setBusy(true); setMsg('');
    try { await setExamScreen(exam, 'Screen 7'); setPick(''); await load(); setMsg(`${exam.name} now uses this layout.`); }
    catch (err) { setMsg(errorMessage(err, 'Could not update the exam.')); }
    finally { setBusy(false); }
  };
  return (
    <section className={`${card} mb-4`}>
      <h3 className="text-[12.5px] font-bold text-navy-800">Where this layout appears</h3>
      <p className="mb-2.5 text-[11.5px] text-slate-500">Students see it on the typing screen of every exam whose Screen Layout is “Screen 7 (Institute Layout)”. Choose it here, or on the exam’s own page.</p>
      {exams && (using.length
        ? <ul className="mb-3 flex flex-wrap gap-2">{using.map((e) => <li key={e.id}><Link to={`/admin/exams/${e.id}/edit`} className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700 hover:underline">{e.name}</Link></li>)}</ul>
        : <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">No exam uses this layout yet, so students do not see it anywhere.</p>)}
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Exam to use this layout" value={pick} onChange={(e) => setPick(e.target.value)} className={`${inputCls} max-w-[340px]`}>
          <option value="">Use this layout in another exam…</option>
          {others.map((e) => <option key={e.id} value={e.id}>{e.name} (now {screenLabel(e.screen_type)})</option>)}
        </select>
        <button type="button" onClick={apply} disabled={!pick || busy} className="rounded-md bg-primary px-4 py-2 text-[12px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{busy ? 'Applying…' : 'Apply'}</button>
        {msg && <span role="status" className="text-[12px] text-slate-600">{msg}</span>}
      </div>
    </section>
  );
}

export default function AdminScreenLayout() {
  const [layout, setLayout] = useState(null);
  const [saved, setSaved] = useState(null);
  const [branding, setBranding] = useState({ name: '', logoUrl: '' });
  const [status, setStatus] = useState({ kind: '', text: '' });
  const [saving, setSaving] = useState(false);
  const [showText, setShowText] = useState(true);
  const [fontSize, setFontSize] = useState(18);

  useEffect(() => {
    settingService.getAll()
      .then((all) => {
        const l = mergeLayout(all?.screen_layout || '');
        setLayout(l); setSaved(JSON.stringify(l));
        setBranding({ name: all?.institute_name || '', logoUrl: all?.institute_logo_url || '' });
      })
      .catch((err) => { setLayout(mergeLayout('')); setStatus({ kind: 'error', text: errorMessage(err, 'Could not load the saved layout.') }); });
  }, []);

  if (!layout) return <div className="nd"><LoadingState>Loading screen layout…</LoadingState></div>;

  const set = (patch) => { setLayout({ ...layout, ...patch }); setStatus({ kind: '', text: '' }); };
  const dirty = JSON.stringify(layout) !== saved;

  const save = async () => {
    setSaving(true); setStatus({ kind: '', text: '' });
    try {
      const res = await settingService.update('screen_layout', JSON.stringify(layout));
      setScreenLayout(res.value);
      const l = mergeLayout(res.value);
      setLayout(l); setSaved(JSON.stringify(l));
      setStatus({ kind: 'ok', text: 'Layout saved. Exams set to "Screen 7 (Institute Layout)" now use it.' });
    } catch (err) {
      setStatus({ kind: 'error', text: errorMessage(err, 'Could not save the layout.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="nd">
      <PageHeading
        icon={<MonitorIcon className="h-5 w-5" aria-hidden="true" />}
        title="Screen Layout Settings"
        subtitle={'Design the "Screen 7 (Institute Layout)" exam screen. Choose it per exam in Exam Management → Test Screen.'}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { set(JSON.parse(JSON.stringify(DEFAULT_LAYOUT))); }}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-navy-800 hover:bg-slate-50">
              <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Reset to Default
            </button>
            <button type="button" onClick={save} disabled={saving || !dirty}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[12px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
              <SaveIcon className="h-3.5 w-3.5" aria-hidden="true" /> {saving ? 'Saving…' : 'Save Layout'}
            </button>
          </div>
        } />

      {status.text &&
        <p role={status.kind === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-lg border px-3 py-2 text-[12.5px] ${status.kind === 'error' ? 'border-rose-200 bg-rose-50 text-danger' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{status.text}</p>
      }

      <LayoutExams />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        {[
          ['topHeaderTitle', '1. Top Header Title', 'Shown in the top header. Empty = your institute name.', branding.name || 'Typing Examination', 100],
          ['mainTitle', '2. Main Title', 'Shown above the passage. Empty = the exam name.', 'SSC Typing Examination', 120],
          ['subTitle', '3. Sub Title', 'Instruction shown under the main title.', '', 200],
        ].map(([key, title, help, placeholder, max]) => (
          <section key={key} className={card}>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-navy-800">{title}</span>
              <span className="mb-2 block text-[11px] text-slate-500">{help}</span>
              <input type="text" maxLength={max} value={layout[key]} placeholder={placeholder} onChange={(e) => set({ [key]: e.target.value })} className={inputCls} />
            </label>
          </section>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="space-y-4">
          <section className={card}>
            <h3 className="mb-2.5 text-[12.5px] font-bold text-navy-800">Header Content</h3>
            <Checks options={HEADER_OPTIONS} values={layout.header} onChange={(header) => set({ header })} />
          </section>
          <section className={card}>
            <PositionPicker label="Timer Position" value={layout.timerPosition} onChange={(timerPosition) => set({ timerPosition })} />
          </section>
          <section className={card}>
            <p className={labelCls}>Buttons (Show / Hide)</p>
            <Checks options={BUTTON_OPTIONS} values={layout.buttons} onChange={(buttons) => set({ buttons })} />
            <div className="mt-3">
              <PositionPicker label="Button Position" value={layout.buttonPosition} onChange={(buttonPosition) => set({ buttonPosition })} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelCls}>Button Style</span>
                <select value={layout.buttonStyle} onChange={(e) => set({ buttonStyle: e.target.value })} className={inputCls}>
                  <option>Modern</option><option>Classic</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Keyboard Sound</span>
                <span className="flex gap-1.5">
                  <select value={layout.keyboardSound} onChange={(e) => set({ keyboardSound: e.target.value })} className={inputCls}>
                    <option>Off</option><option>Click 1</option><option>Click 2</option>
                  </select>
                  <button type="button" aria-label="Play keyboard sound" disabled={layout.keyboardSound === 'Off'} onClick={() => playKeyClick(layout.keyboardSound)}
                    className="grid w-9 shrink-0 place-items-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                    <Volume2Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              </label>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className={card}>
            <h3 className="mb-2.5 text-[12.5px] font-bold text-navy-800">Candidate Details</h3>
            <Checks options={CANDIDATE_OPTIONS} values={layout.candidate} onChange={(candidate) => set({ candidate })} />
          </section>
          <section className={card}>
            <h3 className="mb-2.5 text-[12.5px] font-bold text-navy-800">Panel Heights <span className="font-normal text-slate-500">(10pt to 250pt)</span></h3>
            {[['header', 'Header Height'], ['passage', 'Passage Height'], ['typing', 'Typing Box Height']].map(([key, label], i) => (
              <label key={key} className="mb-3 block">
                <span className={labelCls}>{i + 1}. {label}</span>
                <span className="flex items-center gap-2">
                  <input type="range" min={HEIGHT_LIMITS[key][0]} max={HEIGHT_LIMITS[key][1]} value={layout.heights[key]} aria-label={label}
                    onChange={(e) => set({ heights: { ...layout.heights, [key]: Number(e.target.value) } })} className="flex-1 accent-primary" />
                  <input type="number" min={HEIGHT_LIMITS[key][0]} max={HEIGHT_LIMITS[key][1]} key={layout.heights[key]} defaultValue={layout.heights[key]} aria-label={`${label} in points`}
                    onBlur={(e) => { const n = Math.round(Number(e.target.value)); const v = Number.isFinite(n) && e.target.value !== '' ? Math.max(HEIGHT_LIMITS[key][0], Math.min(HEIGHT_LIMITS[key][1], n)) : layout.heights[key]; e.target.value = v; if (v !== layout.heights[key]) set({ heights: { ...layout.heights, [key]: v } }); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    className="w-[64px] rounded-md border border-slate-300 px-2 py-1 text-right text-[12px] font-semibold text-navy-800" />
                  <span className="text-[12px] text-slate-500">pt</span>
                </span>
              </label>
            ))}
          </section>
          <section className={card}>
            <h3 className="mb-2.5 text-[12.5px] font-bold text-navy-800">Colours</h3>
            <ul className="grid grid-cols-2 gap-2.5">
              {COLOR_LABELS.map(([key, label]) => (
                <li key={key}>
                  <label className="flex items-center gap-2 text-[11.5px] text-slate-700">
                    <input type="color" value={layout.colors[key]} aria-label={label}
                      onChange={(e) => set({ colors: { ...layout.colors, [key]: e.target.value.toUpperCase() } })}
                      className="h-7 w-9 shrink-0 cursor-pointer rounded border border-slate-300 bg-white p-0.5" />
                    <span className="min-w-0"><span className="block truncate font-medium">{label}</span><span className="block text-[10.5px] text-slate-400">{layout.colors[key]}</span></span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className={`${card} min-w-0`}>
          <h3 className="mb-1 flex items-center gap-2 text-[12.5px] font-bold text-navy-800">
            <EyeIcon className="h-4 w-4 text-primary" aria-hidden="true" /> LIVE PREVIEW
          </h3>
          <p className="mb-3 text-[11px] text-slate-500">This is how students will see the exam screen. Buttons here only change the preview.</p>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <InstituteScreen
              preview
              layout={layout}
              branding={branding}
              logoSrc={branding.logoUrl ? resolveAssetUrl(branding.logoUrl) : null}
              examName="SSC CGL Typing Test"
              candidate={{ name: 'Student Name', rollNo: 'student_login' }}
              timeText="13:45"
              passage={<p>{SAMPLE}</p>}
              showText={showText}
              onToggleText={() => setShowText((v) => !v)}
              fontSize={fontSize}
              onFontSize={(d) => setFontSize((f) => Math.max(10, f + d))}
              onSubmit={() => {}}
              onPause={() => {}}
              onFullScreen={() => {}}
              textareaProps={{ placeholder: 'Students type here…', style: { fontSize: `${fontSize}px` } }} />
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-md bg-primary-50 p-2.5 text-[11px] text-primary-700">
            <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Only the look changes. Timer, backspace rules, highlighting and result calculation come from each exam&apos;s own settings, exactly as on Screens 1–6.
          </p>
        </section>
      </div>
    </div>
  );
}
