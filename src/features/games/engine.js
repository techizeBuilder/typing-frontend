import { useEffect, useRef } from 'react';
import { computeStats } from './gameData';

// requestAnimationFrame loop that only runs while `active`; passes the frame
// time (ms, capped so a background tab doesn't jump the game forward).
export function useFrameLoop(onFrame, active) {
  const cb = useRef(onFrame);
  useEffect(() => { cb.current = onFrame; });
  useEffect(() => {
    if (!active) return undefined;
    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(now - last, 100);
      last = now;
      cb.current(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

// Typing counters shared by every game.
export function newStats() {
  return { correctChars: 0, keystrokes: 0, errors: 0, elapsedMs: 0, words: 0 };
}
export const statsSummary = (s) => ({ ...computeStats(s), words: s.words, seconds: Math.round(s.elapsedMs / 1000) });
