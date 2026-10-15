// One word at a time: Key Jungle, Aqua Typing, Typing Birds and Blink.
// Type the word and press Space; each game turns correct words into progress.
// Game state lives in a ref; every frame publishes a snapshot for rendering.
import { useRef, useState } from 'react';
import { BananaIcon, BirdIcon, CloudIcon, EyeIcon, FishIcon, TimerIcon, TreePineIcon } from 'lucide-react';
import { randomWord } from './gameData';
import { newStats, statsSummary, useFrameLoop } from './engine';
import TypingInput from './TypingInput';

const ROUND_MS = 60000;
const BIRD_FALL = { easy: 7, medium: 10, hard: 13 }; // altitude % per second
const BLINK_MS = { easy: 1000, medium: 700, hard: 450 };

const initial = (level) => {
  const word = randomWord(level);
  return {
    word, next: randomWord(level, [word]), typed: '', score: 0, streak: 0, bestStreak: 0,
    stats: newStats(), over: false, flash: null, shownFor: 0, bananas: 0, depth: 0, altitude: 70, flapT: 0,
  };
};
const snapshot = (s) => ({ ...s, stats: { ...s.stats }, flash: s.flash && { ...s.flash } });

export default function WordStream({ mode, level, paused, onEnd, inputRef, hud }) {
  const g = useRef(null);
  const [view, setView] = useState(() => initial(level));
  const state = () => { if (!g.current) g.current = snapshot(view); return g.current; };
  const timed = mode !== 'birds';

  const finish = (s) => {
    if (s.over) return;
    s.over = true;
    onEnd({ score: s.score, bestStreak: s.bestStreak, ...statsSummary(s.stats),
      extra: mode === 'jungle' ? `${s.bananas} bananas collected` : mode === 'aqua' ? `${Math.round(s.depth)} m deep` : mode === 'birds' ? `Flew for ${Math.round(s.stats.elapsedMs / 1000)} s` : `${s.stats.words} words remembered` });
  };

  useFrameLoop((dt) => {
    const s = state();
    if (s.over) return;
    s.stats.elapsedMs += dt;
    s.shownFor += dt;
    if (s.flash) { s.flash.ttl -= dt; if (s.flash.ttl <= 0) s.flash = null; }
    s.flapT = Math.max(0, s.flapT - dt);
    if (mode === 'birds') {
      const fall = BIRD_FALL[level] * (1 + Math.min(s.stats.elapsedMs / 60000, 1) * 0.6);
      s.altitude -= (fall * dt) / 1000;
      s.score = s.stats.words * 10 + Math.floor(s.stats.elapsedMs / 1000);
      if (s.altitude <= 0) { s.altitude = 0; finish(s); }
    }
    const left = Math.max(0, ROUND_MS - s.stats.elapsedMs);
    hud({ score: s.score, timeLeft: timed ? Math.ceil(left / 1000) : null, ...statsSummary(s.stats) });
    if (timed && left <= 0) finish(s);
    setView(snapshot(s));
  }, !paused);

  const submit = (s) => {
    if (!s.typed) return;
    if (s.typed === s.word) {
      s.stats.words += 1;
      s.stats.correctChars += s.word.length + 1;
      s.streak += 1;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      const bonus = s.streak >= 5 ? 2 : 1;
      if (mode === 'jungle') { const b = (s.word.length >= 7 ? 3 : s.word.length >= 5 ? 2 : 1) * bonus; s.bananas += b; s.score = s.bananas * 10; s.flash = { ok: true, text: `+${b} banana${b > 1 ? 's' : ''}`, ttl: 600 }; }
      if (mode === 'aqua') { const d = s.word.length * 2 * bonus; s.depth += d; s.score = Math.round(s.depth * 10); s.flash = { ok: true, text: `+${d} m`, ttl: 600 }; }
      if (mode === 'birds') { s.altitude = Math.min(100, s.altitude + 16); s.flapT = 300; s.flash = { ok: true, text: 'Flap!', ttl: 500 }; }
      if (mode === 'blink') { s.score += s.word.length * 10 * bonus; s.flash = { ok: true, text: 'Correct', ttl: 500 }; }
    } else {
      s.stats.errors += 1;
      s.streak = 0;
      if (mode === 'aqua') { s.depth = Math.max(0, s.depth - 3); s.score = Math.round(s.depth * 10); }
      if (mode === 'birds') s.altitude = Math.max(0, s.altitude - 5);
      s.flash = { ok: false, text: mode === 'blink' ? `It was "${s.word}"` : 'Miss', ttl: 900 };
    }
    s.word = s.next;
    s.next = randomWord(level, [s.word]);
    s.typed = '';
    s.shownFor = 0;
  };

  const onChars = (chars) => {
    const s = state();
    if (s.over) return;
    for (const ch of chars) {
      if (ch === ' ') { submit(s); continue; }
      s.stats.keystrokes += 1;
      if (s.word[s.typed.length] !== ch) s.stats.errors += 1;
      s.typed += ch;
    }
    setView(snapshot(s));
  };
  const onBackspace = () => { const s = state(); s.typed = s.typed.slice(0, -1); setView(snapshot(s)); };

  const v = view;
  const hidden = mode === 'blink' && v.shownFor > BLINK_MS[level];
  const timeLeft = Math.max(0, Math.ceil((ROUND_MS - v.stats.elapsedMs) / 1000));
  const backgrounds = {
    jungle: 'linear-gradient(180deg, #A3E635 0%, #4D7C0F 55%, #14532D 100%)',
    aqua: `linear-gradient(180deg, hsl(199 89% ${Math.max(14, 55 - v.depth / 6)}%) 0%, hsl(205 85% ${Math.max(6, 28 - v.depth / 8)}%) 100%)`,
    birds: 'linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 70%, #86EFAC 100%)',
    blink: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
  };

  return (
    <div onClick={() => inputRef.current?.focus()} className="relative h-full w-full overflow-hidden" style={{ background: backgrounds[mode] }}>
      {mode === 'jungle' && <>
        {[8, 26, 70, 88].map((x, i) => <TreePineIcon key={x} className="absolute bottom-0 h-40 w-40 text-green-900/60" style={{ left: `${x - 8}%`, transform: `scale(${1 + (i % 2) * 0.3})` }} aria-hidden="true" />)}
        <div className="absolute bottom-6 left-0 right-0 h-2 bg-amber-900/60" />
        <div className="absolute bottom-8 transition-all duration-300" style={{ left: `${8 + ((v.stats.words * 9) % 80)}%` }}>
          <span className="relative block h-11 w-11 rounded-full bg-amber-800 shadow-lg" aria-label="Monkey">
            <span className="absolute -left-1.5 top-1 h-4 w-4 rounded-full bg-amber-800" /><span className="absolute -right-1.5 top-1 h-4 w-4 rounded-full bg-amber-800" />
            <span className="absolute inset-x-2 bottom-1.5 top-3 rounded-full bg-amber-200" />
            <span className="absolute left-3 top-4 h-1.5 w-1.5 rounded-full bg-navy-900" /><span className="absolute right-3 top-4 h-1.5 w-1.5 rounded-full bg-navy-900" />
          </span>
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 font-display text-[15px] font-bold text-amber-700 shadow"><BananaIcon className="h-5 w-5 fill-yellow-300 text-amber-500" aria-hidden="true" /> {v.bananas}</div>
      </>}
      {mode === 'aqua' && <>
        {Array.from({ length: 14 }, (_, i) => <span key={i} className="absolute rounded-full border border-white/40" style={{ width: 6 + (i % 4) * 4, height: 6 + (i % 4) * 4, left: `${(i * 23) % 95}%`, top: `${(i * 41 + v.stats.elapsedMs / 40) % 100}%` }} />)}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-300"><FishIcon className="h-12 w-12" aria-hidden="true" /></div>
        <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 font-display text-[15px] font-bold text-sky-800 shadow">{Math.round(v.depth)} m</div>
      </>}
      {mode === 'birds' && <>
        {[12, 48, 78].map((x, i) => <CloudIcon key={x} className="absolute h-16 w-16 fill-white text-white" style={{ left: `${((((x - v.stats.elapsedMs / (300 + i * 150)) % 110) + 110) % 110) - 10}%`, top: `${10 + i * 12}%` }} aria-hidden="true" />)}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-green-600" />
        <div className="absolute left-[18%] transition-[bottom] duration-200" style={{ bottom: `calc(${v.altitude * 0.78}% + 32px)` }}>
          <BirdIcon className={`h-12 w-12 text-rose-500 ${v.flapT ? '-rotate-12' : 'rotate-12'}`} aria-hidden="true" />
        </div>
        <div className="absolute left-3 top-3 h-32 w-3 overflow-hidden rounded-full bg-white/60" role="meter" aria-label="Altitude" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v.altitude)}><div className="absolute bottom-0 w-full rounded-full bg-emerald-500" style={{ height: `${v.altitude}%` }} /></div>
      </>}
      {timed && <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 font-display text-[15px] font-bold text-navy-800 shadow"><TimerIcon className="h-4 w-4" aria-hidden="true" /> {timeLeft}s</div>}
      <div className="absolute inset-0 grid place-items-center px-4">
        <div className="flex flex-col items-center">
          <div className="rounded-xl bg-white/95 px-6 py-3 font-mono text-[34px] font-extrabold tracking-wide text-navy-900 shadow-lg sm:text-[40px]" data-word={v.word}>
            {hidden ?
              <span className="flex items-center gap-2 text-slate-300"><EyeIcon className="h-8 w-8" aria-hidden="true" /> ? ? ?</span> :
              v.word.split('').map((c, i) => {
                const t = v.typed[i];
                return <span key={i} className={t === undefined ? '' : t === c ? 'text-emerald-600' : 'text-rose-500 underline'}>{c}</span>;
              })}
          </div>
          <div className="mt-3 min-w-[220px] rounded-lg border-2 border-white/70 bg-white/95 px-4 py-2 text-center font-mono text-[20px] font-bold text-navy-800 shadow">
            {v.typed || <span className="font-sans text-[13px] font-normal text-slate-400">Type the word, then Space</span>}
          </div>
          {mode !== 'blink' && <p className="mt-2 text-[12px] font-medium text-white/90 drop-shadow">Next: {v.next}</p>}
          {v.streak >= 3 && <p className="mt-1 text-[12px] font-bold text-amber-300 drop-shadow">{v.streak} in a row{v.streak >= 5 ? ' · double points!' : ''}</p>}
          {v.flash && <p className={`mt-2 font-display text-[18px] font-extrabold drop-shadow ${v.flash.ok ? 'text-lime-300' : 'text-rose-300'}`}>{v.flash.text}</p>}
        </div>
      </div>
      <TypingInput inputRef={inputRef} onChars={onChars} onBackspace={onBackspace} disabled={paused} />
    </div>
  );
}
