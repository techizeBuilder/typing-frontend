// Bubble Typing / Space Defender: words fall; type one to pop / shoot it.
// Game state lives in a ref (mutated by the loop and key handlers); every frame
// publishes a snapshot to React state for rendering.
import { useRef, useState } from 'react';
import { HeartIcon, RocketIcon } from 'lucide-react';
import { randomWord } from './gameData';
import { newStats, statsSummary, useFrameLoop } from './engine';
import TypingInput from './TypingInput';

const SETTINGS = {
  easy: { spawn: 2300, speed: 38, mult: 1 },
  medium: { spawn: 1800, speed: 52, mult: 1.5 },
  hard: { spawn: 1350, speed: 66, mult: 2 },
};
const LIVES = 3;
let nextId = 1;

const initial = (cfg) => ({ words: [], effects: [], typed: '', score: 0, lives: LIVES, sinceSpawn: cfg.spawn - 400, stats: newStats(), over: false, shake: 0, height: 420 });
const snapshot = (s) => ({ ...s, words: s.words.map((w) => ({ ...w })), effects: [...s.effects], stats: { ...s.stats } });
const targetOf = (s) => (s.typed ? s.words.filter((w) => w.text.startsWith(s.typed)).sort((a, b) => b.y - a.y)[0] : null);

export default function FallingWords({ theme, level, paused, onEnd, inputRef, hud }) {
  const cfg = SETTINGS[level];
  const field = useRef(null);
  const g = useRef(null);
  const [view, setView] = useState(() => initial(cfg));
  const state = () => { if (!g.current) g.current = snapshot(view); return g.current; };
  const space = theme === 'space';

  useFrameLoop((dt) => {
    const s = state();
    if (s.over) return;
    s.height = field.current?.clientHeight || s.height;
    s.stats.elapsedMs += dt;
    // Difficulty rises slowly with every word cleared.
    const ramp = 1 + Math.min(s.stats.words, 60) * 0.015;
    s.sinceSpawn += dt;
    if (s.sinceSpawn >= cfg.spawn / ramp && s.words.length < 9) {
      s.sinceSpawn = 0;
      s.words.push({ id: nextId++, text: randomWord(level, s.words.map((w) => w.text)), x: 6 + Math.random() * 78, y: -30 });
    }
    for (const w of s.words) w.y += (cfg.speed * ramp * dt) / 1000;
    const missed = s.words.filter((w) => w.y > s.height - 34);
    if (missed.length) {
      s.lives -= missed.length;
      s.words = s.words.filter((w) => !missed.includes(w));
      if (missed.some((w) => w.text.startsWith(s.typed))) s.typed = '';
      for (const w of missed) s.effects.push({ id: nextId++, kind: 'miss', x: w.x, y: s.height - 40, ttl: 700, text: space ? 'Hit!' : 'Missed' });
    }
    s.effects = s.effects.map((e) => ({ ...e, ttl: e.ttl - dt })).filter((e) => e.ttl > 0);
    s.shake = Math.max(0, s.shake - dt);
    hud({ score: s.score, lives: Math.max(0, s.lives), ...statsSummary(s.stats) });
    if (s.lives <= 0) {
      s.over = true;
      onEnd({ score: s.score, ...statsSummary(s.stats) });
    }
    setView(snapshot(s));
  }, !paused);

  const onChars = (chars) => {
    const s = state();
    if (s.over) return;
    for (const ch of chars) {
      if (ch === ' ') continue;
      s.stats.keystrokes += 1;
      const next = s.typed + ch;
      const candidates = s.words.filter((w) => w.text.startsWith(next));
      if (!candidates.length) { s.stats.errors += 1; s.shake = 250; continue; }
      s.typed = next;
      const done = candidates.filter((w) => w.text === next).sort((a, b) => b.y - a.y)[0];
      if (done) {
        s.words = s.words.filter((w) => w !== done);
        const pts = Math.round(done.text.length * 10 * cfg.mult);
        s.score += pts;
        s.stats.words += 1;
        s.stats.correctChars += done.text.length + 1;
        s.effects.push({ id: nextId++, kind: 'pop', x: done.x, y: done.y, ttl: 650, text: `+${pts}` });
        if (space) s.effects.push({ id: nextId++, kind: 'laser', x: done.x, y: done.y, ttl: 160 });
        s.typed = '';
      }
    }
    setView(snapshot(s));
  };
  const onBackspace = () => { const s = state(); s.typed = s.typed.slice(0, -1); setView(snapshot(s)); };

  const v = view;
  const t = targetOf(v);

  return (
    <div
      ref={field}
      onClick={() => inputRef.current?.focus()}
      className={`relative h-full w-full overflow-hidden ${v.shake ? 'animate-[shake_0.25s]' : ''}`}
      style={{ background: space ? 'radial-gradient(ellipse at bottom, #312E81 0%, #0F172A 70%)' : 'linear-gradient(180deg, #E0F2FE 0%, #C7D2FE 100%)' }}>
      {space && Array.from({ length: 40 }, (_, i) => (
        <span key={i} className="absolute h-[2px] w-[2px] rounded-full bg-white/70" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }} />
      ))}
      {v.words.map((w) => {
        const isTarget = t && t.id === w.id;
        const typed = isTarget ? v.typed.length : 0;
        return (
          <div key={w.id} className="absolute -translate-x-1/2" style={{ left: `${w.x}%`, top: w.y }} data-word={w.text}>
            {space ?
              <div className={`flex flex-col items-center ${isTarget ? 'scale-110' : ''}`}>
                <span className="mb-1 grid h-8 w-10 place-items-center rounded-b-lg rounded-t-full bg-gradient-to-b from-fuchsia-400 to-violet-700 shadow-[0_0_12px_rgba(192,132,252,0.8)]">
                  <span className="flex gap-1"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" /><span className="h-1.5 w-1.5 rounded-full bg-lime-300" /></span>
                </span>
                <span className={`rounded px-2 py-0.5 font-mono text-[15px] font-bold ${isTarget ? 'bg-amber-300 text-navy-900' : 'bg-slate-900/80 text-white'}`}>
                  <span className="text-emerald-600">{w.text.slice(0, typed)}</span>{w.text.slice(typed)}
                </span>
              </div> :
              <span className={`grid min-h-[52px] min-w-[52px] place-items-center rounded-full border-2 px-4 py-3 font-mono text-[15px] font-bold shadow-lg ${
                isTarget ? 'border-amber-400 bg-white/95 text-navy-900' : 'border-white/80 bg-gradient-to-br from-white/80 to-sky-200/70 text-navy-800'}`}>
                <span><span className="text-emerald-600">{w.text.slice(0, typed)}</span>{w.text.slice(typed)}</span>
              </span>
            }
          </div>
        );
      })}
      {v.effects.map((e) => (e.kind === 'laser' ?
        <svg key={e.id} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <line x1="50%" y1={v.height - 40} x2={`${e.x}%`} y2={e.y + 16} stroke="#F472B6" strokeWidth="3" />
        </svg> :
        <span key={e.id} className={`pointer-events-none absolute -translate-x-1/2 font-display text-[16px] font-extrabold ${e.kind === 'pop' ? (space ? 'text-amber-300' : 'text-emerald-600') : 'text-rose-500'}`}
          style={{ left: `${e.x}%`, top: e.y - (650 - e.ttl) / 12, opacity: Math.min(1, e.ttl / 300) }}>{e.text}</span>
      ))}
      {space ?
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sky-300"><RocketIcon className="h-9 w-9 -rotate-45" aria-hidden="true" /></div> :
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-indigo-300/80 to-transparent" />
      }
      <div className="pointer-events-none absolute right-3 top-3 flex gap-1" aria-label={`${Math.max(0, v.lives)} lives left`}>
        {Array.from({ length: LIVES }, (_, i) => <HeartIcon key={i} className={`h-5 w-5 ${i < v.lives ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} aria-hidden="true" />)}
      </div>
      <TypingInput inputRef={inputRef} onChars={onChars} onBackspace={onBackspace} disabled={paused} />
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/85 px-3 py-1 font-mono text-[14px] font-bold text-navy-800 shadow">{v.typed || <span className="font-sans text-[12px] font-normal text-slate-400">Start typing…</span>}</div>
    </div>
  );
}
