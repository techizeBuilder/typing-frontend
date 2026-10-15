import { useEffect, useState } from 'react';
import { CheckCircle2Icon, EyeIcon, InfoIcon, MonitorIcon, RotateCcwIcon, SaveIcon, Volume2Icon } from 'lucide-react';
import { settingService } from '../../services/api';
import { PageHeading } from '../../ui/PageHeading';
import { LoadingState } from '../../features/exams/ExamUI';
import { resolveAssetUrl } from '../../features/exams/examData';
import InstituteScreen from '../../features/screenLayout/InstituteScreen';
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
            <h3 className="mb-2.5 text-[12.5px] font-bold text-navy-800">Panel Heights</h3>
            {[['header', 'Header Height'], ['passage', 'Passage Height'], ['typing', 'Typing Box Height']].map(([key, label], i) => (
              <label key={key} className="mb-3 block">
                <span className={labelCls}>{i + 1}. {label}</span>
                <span className="flex items-center gap-3">
                  <input type="range" min={HEIGHT_LIMITS[key][0]} max={HEIGHT_LIMITS[key][1]} value={layout.heights[key]} aria-label={label}
                    onChange={(e) => set({ heights: { ...layout.heights, [key]: Number(e.target.value) } })} className="flex-1 accent-primary" />
                  <span className="w-14 text-right text-[12px] font-semibold text-navy-800">{layout.heights[key]}px</span>
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
