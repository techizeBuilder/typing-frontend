// Renders "Screen 7 — Institute Layout" from an admin-designed layout. Used by
// TestEngine (live test, fed the engine's own state and handlers) and by the
// Screen Layout admin page (live preview with sample text).
import { ClockIcon, EyeIcon, EyeOffIcon, MaximizeIcon, MinimizeIcon, PauseIcon, PlayIcon, SendIcon, UserCircle2Icon } from 'lucide-react';
import { playKeyClick } from './screenLayout';

const slotOf = (position) => {
  const [h, v] = position.split(' ');
  return { bar: v === 'Top' ? 'top' : 'bottom', align: h.toLowerCase() };
};

function Bar({ items, color }) {
  if (!items.left.length && !items.center.length && !items.right.length) return null;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2" style={{ color }}>
      <div className="flex flex-wrap items-center gap-2">{items.left}</div>
      <div className="flex flex-wrap items-center justify-center gap-2">{items.center}</div>
      <div className="flex flex-wrap items-center justify-end gap-2">{items.right}</div>
    </div>
  );
}

export default function InstituteScreen({
  layout,
  branding = {},
  logoSrc,
  examName,
  candidate = {},
  timeText,
  passage,
  hindiBanner = null,
  showText = true,
  onToggleText,
  fontSize,
  onFontSize,
  isFullscreen,
  onFullScreen,
  paused = false,
  onPause,
  pauseDisabled = false,
  onSubmit,
  textareaProps = {},
  preview = false,
}) {
  const c = layout.colors;
  const rounded = layout.buttonStyle === 'Modern' ? 'rounded-lg shadow-sm' : 'rounded-none border';
  const btn = `inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 ${rounded}`;
  const btnStyle = { background: c.buttonBg, color: c.buttonText, borderColor: c.border };
  const title = layout.topHeaderTitle || branding.name || 'Typing Examination';
  const mainTitle = layout.mainTitle || examName || '';

  const timer = (
    <span key="timer" className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold ${rounded}`}
      style={{ background: '#FFFFFF', color: c.headerBg, borderColor: c.border }}>
      <ClockIcon className="h-4 w-4" aria-hidden="true" /> {timeText}
    </span>
  );
  const buttons = [];
  if (layout.buttons.fontSize) {
    buttons.push(
      <span key="font" className="inline-flex items-center gap-1">
        <button type="button" aria-label="Decrease font size" onClick={() => onFontSize?.(-2)} className={`px-2.5 py-1.5 text-[12px] font-bold ${rounded}`} style={{ background: c.fontBtnBg, color: c.fontBtnText, borderColor: c.border }}>A-</button>
        <span className="w-7 text-center text-[12px] font-semibold">{fontSize}</span>
        <button type="button" aria-label="Increase font size" onClick={() => onFontSize?.(2)} className={`px-2.5 py-1.5 text-[12px] font-bold ${rounded}`} style={{ background: c.fontBtnBg, color: c.fontBtnText, borderColor: c.border }}>A+</button>
      </span>,
    );
  }
  if (layout.header.showHideText) {
    buttons.push(
      <button key="text" type="button" onClick={onToggleText} className={btn} style={btnStyle}>
        {showText ? <EyeOffIcon className="h-4 w-4" aria-hidden="true" /> : <EyeIcon className="h-4 w-4" aria-hidden="true" />} {showText ? 'Hide Text' : 'Show Text'}
      </button>,
    );
  }
  if (layout.buttons.fullScreen) {
    buttons.push(
      <button key="fs" type="button" onClick={onFullScreen} className={btn} style={btnStyle}>
        {isFullscreen ? <MinimizeIcon className="h-4 w-4" aria-hidden="true" /> : <MaximizeIcon className="h-4 w-4" aria-hidden="true" />} {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
      </button>,
    );
  }
  if (layout.buttons.pause) {
    buttons.push(
      <button key="pause" type="button" onClick={onPause} disabled={pauseDisabled} className={btn} style={btnStyle}>
        {paused ? <PlayIcon className="h-4 w-4" aria-hidden="true" /> : <PauseIcon className="h-4 w-4" aria-hidden="true" />} {paused ? 'Resume' : 'Pause'}
      </button>,
    );
  }
  if (layout.buttons.submit) {
    buttons.push(
      <button key="submit" type="button" onClick={onSubmit} className={btn} style={{ ...btnStyle, background: c.submitBg }}>
        <SendIcon className="h-4 w-4" aria-hidden="true" /> Submit
      </button>,
    );
  }

  const bars = { top: { left: [], center: [], right: [] }, bottom: { left: [], center: [], right: [] } };
  const t = slotOf(layout.timerPosition);
  bars[t.bar][t.align].push(timer);
  const b = slotOf(layout.buttonPosition);
  bars[b.bar][b.align].push(...buttons);

  const showCandidate = layout.candidate.photo || layout.candidate.name || layout.candidate.rollNo;

  const onKeyDown = (e) => {
    playKeyClick(layout.keyboardSound);
    textareaProps.onKeyDown?.(e);
  };

  return (
    <div className={`nd flex flex-col ${preview ? '' : 'min-h-screen'}`} style={{ background: c.bodyBg }}>
      <header className="flex items-center gap-3 px-4" style={{ minHeight: layout.heights.header, background: c.headerBg, color: c.headerText }}>
        {layout.header.logo && logoSrc &&
          <img src={logoSrc} alt="" className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-[2px]" />}
        <div className="min-w-0">
          <p className="truncate font-display text-[17px] font-bold leading-tight">{title}</p>
          {layout.header.examName && examName && <p className="truncate text-[12px] opacity-80">{examName}</p>}
        </div>
      </header>
      <div style={{ background: c.headerBg, color: c.headerText }}>
        <Bar items={bars.top} color={c.headerText} />
      </div>

      <main className="flex-1 p-4">
        {(layout.header.mainTitle && mainTitle) || layout.header.instruction ?
          <div className="mb-3 text-center">
            {layout.header.mainTitle && mainTitle && <h2 className="font-display text-[18px] font-bold" style={{ color: c.headerBg }}>{mainTitle}</h2>}
            {layout.header.instruction && layout.subTitle && <p className="text-[12.5px] text-slate-600">{layout.subTitle}</p>}
          </div> : null}
        {hindiBanner}
        <div className={`grid gap-4 ${showCandidate ? (preview ? 'grid-cols-[minmax(0,1fr)_130px]' : 'lg:grid-cols-[1fr_220px]') : ''}`}>
          <div className="min-w-0 space-y-3">
            {showText &&
              <div className="overflow-y-auto border p-4 leading-relaxed" style={{ height: layout.heights.passage, background: c.passageBg, borderColor: c.border, fontSize: fontSize ? `${fontSize}px` : undefined }}>
                {passage}
              </div>
            }
            <div className="relative">
              <textarea
                {...textareaProps}
                onKeyDown={onKeyDown}
                aria-label="Type here"
                className="block w-full resize-none border p-4 leading-relaxed text-navy-800 outline-none"
                style={{ ...(textareaProps.style || {}), height: layout.heights.typing, background: c.typingBg, borderColor: c.border }} />
              {paused &&
                <div className="absolute inset-0 grid place-items-center bg-navy-900/70 text-center text-white">
                  <span><PauseIcon className="mx-auto mb-1 h-7 w-7" aria-hidden="true" /> <b>Test Paused</b><br /><span className="text-[12px] opacity-80">Click Resume to continue</span></span>
                </div>
              }
            </div>
          </div>
          {showCandidate &&
            <aside className="h-fit border bg-white p-4 text-center" style={{ borderColor: c.border }}>
              {layout.candidate.photo &&
                <span className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400"><UserCircle2Icon className="h-9 w-9" aria-hidden="true" /></span>}
              <dl className="space-y-1 text-left text-[12px]">
                {layout.candidate.name && candidate.name && <div><dt className="inline font-semibold text-navy-800">Name: </dt><dd className="inline text-slate-600">{candidate.name}</dd></div>}
                {layout.candidate.rollNo && candidate.rollNo && <div><dt className="inline font-semibold text-navy-800">Roll No: </dt><dd className="inline break-all text-slate-600">{candidate.rollNo}</dd></div>}
              </dl>
            </aside>
          }
        </div>
      </main>

      <div className="border-t" style={{ borderColor: c.border }}>
        <Bar items={bars.bottom} color={c.headerBg} />
      </div>
    </div>
  );
}
