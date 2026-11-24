// On-screen steno result. Steno is percentage based: % of mistakes and accuracy decide
// Qualified / Not Qualified. Every figure is computed by the caller; this only lays
// them out. The pattern's show_* toggles still decide which tiles appear.
import { Fragment } from 'react';
import {
  DownloadIcon, FileTextIcon, GaugeIcon, HelpCircleIcon, KeyboardIcon, MinusSquareIcon, PercentIcon, PrinterIcon, RotateCcwIcon, ShuffleIcon, TargetIcon, TrophyIcon, UserIcon, XCircleIcon, XSquareIcon,
} from 'lucide-react';
import { Breadcrumbs } from '../../ui/PageHeading';
import { Panel } from '../../ui/Pill';

const LEGEND = [
  { label: 'Correct', color: '#198754' },
  { label: 'Spelling Mistake', color: '#DC3545' },
  { label: 'Omission', color: '#F59E0B' },
  { label: 'Addition', color: '#0D6EFD' },
  { label: 'Punctuation Error', color: '#0EA5E9' },
  { label: 'Transposition', color: '#F97316' },
  { label: 'Extra Space', color: '#6F42C1' },
  { label: 'Half Error', color: '#EAB308' },
];

const TRANSPOSITION_NOTE = { none: 'not counted', half: 'counted as half', full: 'counted as full' };

const headerBtn = 'flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-navy-800 transition-colors duration-150 hover:bg-slate-50';

const Row = ({ label, children, w = 'w-[70px]' }) => (
  <div className="flex gap-1.5">
    <dt className={`${w} shrink-0 text-slate-500`}>{label}</dt>
    <dd className="min-w-0 break-words font-medium text-navy-800">: {children}</dd>
  </div>
);

function Word({ item }) {
  const { type, typed, ref } = item;
  if (type === 'correct' || type === 'alt') return <>{typed || ref}</>;
  if (type === 'omission') return <mark data-mark="omission" className="rounded bg-amber-100 px-1 text-navy-900">{ref}</mark>;
  if (type === 'addition') return <mark data-mark="addition" className="rounded bg-blue-100 px-1 text-navy-900 line-through">{typed}</mark>;
  if (type === 'transposition') return <mark data-mark="transposition" className="rounded bg-orange-100 px-1 text-navy-900">{typed}</mark>;
  if (type === 'punctuation') return <mark data-mark="punctuation" className="rounded bg-sky-100 px-1 text-navy-900">{typed} {ref}</mark>;
  if (type === 'half') return <mark data-mark="half" className="rounded bg-yellow-100 px-1 text-navy-900">{typed} {ref}</mark>;
  // spelling, and words typed in ALL CAPITALS
  return <mark data-mark="spelling" className="rounded bg-rose-100 px-1 text-navy-900"><s className="text-rose-600">{typed}</s> {ref}</mark>;
}

export default function StenoResultView({
  candidate, dictation, test, verdict, tiles, markup, typedText, plainText, setPlainText, passageFontFamily,
  listLabel, listTo, onDownload, onPrint, onReattempt, actionArea,
}) {
  const tileList = [
    tiles.showTestWords && { icon: FileTextIcon, label: 'Total Words (Original)', value: tiles.originalWords, color: '#0D6EFD' },
    tiles.showWords && { icon: FileTextIcon, label: 'Total Words (Typed)', value: tiles.typedWords, color: '#6F42C1' },
    tiles.showFull && { icon: XSquareIcon, label: 'Full Mistakes', value: tiles.full, color: '#DC3545' },
    tiles.showHalf && { icon: MinusSquareIcon, label: 'Half Mistakes', value: tiles.half, color: '#F59E0B' },
    tiles.showHalf && { icon: HelpCircleIcon, label: 'Punctuation Mistakes', value: tiles.punctuation, color: '#0EA5E9' },
    { icon: ShuffleIcon, label: 'Transposition Mistakes', value: tiles.transposition, color: '#F97316', sub: TRANSPOSITION_NOTE[tiles.transpositionRule] || TRANSPOSITION_NOTE.none, title: 'Words typed in swapped order. The result pattern decides whether they count.' },
    { icon: PercentIcon, label: '% of Mistakes', value: `${tiles.mistakePercent.toFixed(2)}%`, color: '#EC4899' },
    tiles.showAccuracy && { icon: TargetIcon, label: 'Accuracy', value: `${tiles.accuracy.toFixed(2)}%`, color: '#198754' },
    tiles.showStrokes && { icon: KeyboardIcon, label: 'Keystrokes', value: Number(tiles.strokes).toLocaleString('en-IN'), color: '#0D6EFD' },
    tiles.showSpeed && { icon: GaugeIcon, label: 'Typing Speed', value: `${Math.round(tiles.speed)} WPM`, color: '#6F42C1' },
    ...(tiles.extra || []),
  ].filter(Boolean);

  return (
    <div className="nd no-print">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Breadcrumbs crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Test Analysis (Results)', to: listTo }, { label: listLabel, to: listTo }, { label: 'Result Details' }]} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={onDownload} title="Choose 'Save as PDF' in the print dialog" className={headerBtn}><DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" /> Download Result (PDF)</button>
          <button type="button" onClick={onPrint} className={headerBtn}><PrinterIcon className="h-3.5 w-3.5" aria-hidden="true" /> Print Result</button>
          {onReattempt && <button type="button" onClick={onReattempt} className={headerBtn}><RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Re-Attempt Test</button>}
        </div>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_280px]">
        <Panel title="Candidate Details">
          <div className="flex gap-3">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
              {candidate.photo ? <img src={candidate.photo} alt="" className="h-full w-full object-cover" /> : <UserIcon className="h-8 w-8" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-display text-[16px] font-bold text-navy-800">
                <span className="break-words">{candidate.name}</span>
                <span className={`rounded px-1.5 py-[1px] text-[10px] font-semibold ${verdict.qualified ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {verdict.qualified ? 'Qualified' : 'Not Qualified'}
                </span>
              </p>
              <dl className="mt-1.5 space-y-0.5 text-[11.5px]">
                <Row label="User ID">{candidate.userId}</Row>
                <Row label="Course">{candidate.course}</Row>
                {candidate.rollNo && <Row label="Roll No.">{candidate.rollNo}</Row>}
              </dl>
            </div>
          </div>
        </Panel>

        <Panel title="Dictation Details">
          <dl className="space-y-1.5 text-[11.5px]">
            <div><dt className="text-slate-500">Dictation Name</dt><dd className="font-medium leading-snug text-navy-800">{dictation.name}{dictation.topic && <> — Topic: <span style={passageFontFamily ? { fontFamily: passageFontFamily } : undefined}>{dictation.topic}</span></>}</dd></div>
            <div><dt className="text-slate-500">Dictation No.</dt><dd className="font-medium leading-snug text-navy-800">{dictation.no || '—'}</dd></div>
            <div><dt className="text-slate-500">Language</dt><dd className="font-medium leading-snug text-navy-800">{dictation.language}</dd></div>
          </dl>
        </Panel>

        <Panel title="Test Information">
          <dl className="space-y-1 text-[11.5px]">
            <Row label="Test Type" w="w-[80px]"><span className="rounded bg-primary-50 px-1.5 py-[1px] text-[10.5px] font-semibold text-primary-700">{test.type}</span></Row>
            <Row label="Test Date" w="w-[80px]">{test.date}</Row>
            <Row label="Start Time" w="w-[80px]">{test.start}</Row>
            <Row label="End Time" w="w-[80px]">{test.end}</Row>
            <Row label="Total Time" w="w-[80px]">{test.total}</Row>
            <Row label="Test Mode" w="w-[80px]">Steno Test</Row>
            {test.pattern && <Row label="Result Pattern" w="w-[80px]">{test.pattern}</Row>}
          </dl>
        </Panel>

        <section className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-card">
          {verdict.qualified
            ? <TrophyIcon className="mx-auto h-16 w-16 text-warn" aria-hidden="true" />
            : <XCircleIcon className="mx-auto h-16 w-16 text-danger" aria-hidden="true" />}
          <p className={`mx-auto mt-2 w-fit rounded px-4 py-1.5 font-display text-[13px] font-bold text-white ${verdict.qualified ? 'bg-success' : 'bg-danger'}`}>
            {verdict.qualified ? 'QUALIFIED' : 'NOT QUALIFIED'}
          </p>
          {verdict.rank?.rank ? <>
            <p className="mt-3 text-[12.5px] font-semibold text-navy-800">Your Rank</p>
            <p className="font-display text-[30px] font-extrabold leading-tight text-primary">{verdict.rank.rank} / {verdict.rank.total}</p>
          </> : verdict.rank?.pending_until ?
            <p className="mt-3 rounded bg-slate-50 px-2 py-1.5 text-[11.5px] text-slate-500">Rank will be shown after the live test session ends.</p> : null}
          <p className="mt-2 text-[11.5px] text-slate-500">Minimum Qualifying Accuracy : {verdict.requiredAccuracy}%</p>
          <p className="text-[11.5px] text-slate-500">Maximum Mistakes Allowed : {Math.max(0, 100 - verdict.requiredAccuracy)}%</p>
        </section>
      </div>

      <ul className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10">
        {tileList.map((m) => (
          <li key={m.label} title={m.title} className="rounded-xl border border-slate-200 bg-white p-2.5 text-center shadow-card">
            <m.icon className="mx-auto h-4 w-4" style={{ color: m.color }} aria-hidden="true" />
            <p className="mt-1 text-[10px] leading-snug text-slate-500">{m.label}</p>
            <p className="font-display text-[16px] font-bold text-navy-800">{m.value}</p>
            {m.sub && <p className="text-[9.5px] text-slate-400">{m.sub}</p>}
          </li>
        ))}
      </ul>

      <Panel className="mb-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="font-display text-[15px] font-semibold text-primary">Your Typed Text</h3>
          {!plainText && LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[10.5px] font-medium text-slate-600">
              <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: l.color }} aria-hidden="true" /> {l.label}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
            View Mode :
            {[[false, 'Highlighted'], [true, 'Plain Text']].map(([value, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setPlainText(value)}
                aria-pressed={plainText === value}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 ${plainText === value ? 'bg-primary text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                {label}
              </button>
            ))}
          </span>
        </div>
        <div className="max-h-[520px] overflow-y-auto rounded-lg border border-slate-200 p-4">
          {plainText ?
            <p className="whitespace-pre-wrap text-[13px] leading-[2.2] text-navy-900" style={passageFontFamily ? { fontFamily: passageFontFamily } : undefined}>{typedText}</p> :
            <p data-testid="steno-typed" className="text-[13px] leading-[2.2] text-navy-900" style={passageFontFamily ? { fontFamily: passageFontFamily } : undefined}>
              {markup.items.map((item, i) => (
                <Fragment key={i}>
                  {item.extraSpaceBefore && <><mark data-mark="extra-space" className="rounded bg-violet-200 px-1 text-violet-800">␣</mark>{' '}</>}
                  <Word item={item} />{' '}
                </Fragment>
              ))}
            </p>
          }
        </div>
      </Panel>

      {actionArea}
    </div>
  );
}
