// Nitro Type: type the passage to drive your car; three computer cars race at
// fixed speeds. A wrong key does not move you forward.
// Game state lives in a ref; every frame publishes a snapshot for rendering.
import { useRef, useState } from 'react';
import { CarFrontIcon, FlagIcon } from 'lucide-react';
import { randomPassage } from './gameData';
import { newStats, statsSummary, useFrameLoop } from './engine';
import TypingInput from './TypingInput';

const BOTS = {
  easy: [{ name: 'Rookie', wpm: 18 }, { name: 'Cruiser', wpm: 24 }, { name: 'Sprinter', wpm: 30 }],
  medium: [{ name: 'Cruiser', wpm: 28 }, { name: 'Sprinter', wpm: 36 }, { name: 'Racer', wpm: 44 }],
  hard: [{ name: 'Racer', wpm: 40 }, { name: 'Turbo', wpm: 50 }, { name: 'Champion', wpm: 60 }],
};
const COLORS = ['text-sky-400', 'text-amber-400', 'text-violet-400'];
const ordinal = (n) => ['1st', '2nd', '3rd', '4th'][n - 1];

const botProgress = (s, wpm) => Math.min(1, ((s.stats.elapsedMs / 60000) * wpm * 5) / s.passage.length);
const snapshot = (s) => ({ ...s, stats: { ...s.stats }, botFinish: [...s.botFinish] });

export default function NitroRace({ level, paused, onEnd, inputRef, hud }) {
  const bots = BOTS[level];
  const g = useRef(null);
  const [view, setView] = useState(() => ({ passage: randomPassage(level), pos: 0, wrong: false, stats: newStats(), botFinish: [], over: false }));
  const state = () => { if (!g.current) g.current = snapshot(view); return g.current; };

  useFrameLoop((dt) => {
    const s = state();
    if (s.over) return;
    s.stats.elapsedMs += dt;
    bots.forEach((b, i) => { if (!s.botFinish.includes(i) && botProgress(s, b.wpm) >= 1) s.botFinish.push(i); });
    const sum = statsSummary(s.stats);
    hud({ score: sum.wpm, place: 1 + bots.filter((b) => botProgress(s, b.wpm) > s.pos / s.passage.length).length, ...sum });
    setView(snapshot(s));
  }, !paused);

  const onChars = (chars) => {
    const s = state();
    if (s.over) return;
    for (const ch of chars) {
      s.stats.keystrokes += 1;
      if (ch === s.passage[s.pos]) {
        s.pos += 1;
        s.stats.correctChars += 1;
        s.wrong = false;
        if (s.passage[s.pos - 1] === ' ' || s.pos === s.passage.length) s.stats.words += 1;
      } else {
        s.stats.errors += 1;
        s.wrong = true;
      }
      if (s.pos === s.passage.length) {
        s.over = true;
        const place = 1 + s.botFinish.length;
        const sum = statsSummary(s.stats);
        onEnd({ score: sum.wpm, place, ...sum, extra: `Finished ${ordinal(place)} of 4` });
        break;
      }
    }
    setView(snapshot(s));
  };

  const v = view;
  const lanes = [
    { name: 'You', progress: v.pos / v.passage.length, color: 'text-rose-500', you: true },
    ...bots.map((b, i) => ({ name: `${b.name} · ${b.wpm} WPM`, progress: botProgress(v, b.wpm), color: COLORS[i] })),
  ];

  return (
    <div onClick={() => inputRef.current?.focus()} className="flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="relative flex-1 space-y-2 overflow-hidden p-4">
        {lanes.map((l) => (
          <div key={l.name} className={`relative h-14 rounded-lg border ${l.you ? 'border-rose-500/60 bg-slate-700/80' : 'border-slate-600 bg-slate-700/50'}`} data-lane={l.you ? 'you' : 'bot'} data-progress={l.progress.toFixed(3)}>
            <div className="absolute inset-y-0 right-10 border-r-4 border-dashed border-white/40" />
            <FlagIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/70" aria-hidden="true" />
            <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `calc(${l.progress * 100}% * 0.86 + 4px)` }}>
              <CarFrontIcon className={`h-9 w-9 ${l.color}`} aria-hidden="true" />
            </div>
            <span className={`absolute left-14 top-1 text-[11px] font-semibold ${l.you ? 'text-rose-300' : 'text-slate-300'}`}>{l.name}</span>
          </div>
        ))}
      </div>
      <div className="m-4 mt-0 rounded-xl bg-white p-4 shadow-lg">
        <p className="font-mono text-[17px] leading-relaxed text-slate-400" data-passage={v.passage}>
          <span className="text-emerald-600">{v.passage.slice(0, v.pos)}</span>
          <span className={`rounded-sm ${v.wrong ? 'bg-rose-200 text-rose-700' : 'bg-amber-200 text-navy-900'}`}>{v.passage[v.pos] === ' ' ? ' ' : v.passage[v.pos]}</span>
          <span className="text-navy-800">{v.passage.slice(v.pos + 1)}</span>
        </p>
        <p className="mt-2 text-[11.5px] text-slate-500">{v.wrong ? 'Wrong key — type the highlighted character.' : 'Type the highlighted character to move forward.'}</p>
      </div>
      <TypingInput inputRef={inputRef} onChars={onChars} disabled={paused} />
    </div>
  );
}
