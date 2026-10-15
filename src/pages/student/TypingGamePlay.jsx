import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, GaugeIcon, PauseIcon, PlayIcon, RotateCcwIcon, TargetIcon, TrophyIcon } from 'lucide-react';
import { LEVELS, gameById, getBest, saveBest } from '../../features/games/gameData';
import FallingWords from '../../features/games/FallingWords';
import WordStream from '../../features/games/WordStream';
import NitroRace from '../../features/games/NitroRace';

// Remount per game so switching games always starts from the start screen.
export default function TypingGamePlayRoute() {
  const { gameId } = useParams();
  return <TypingGamePlay key={gameId} gameId={gameId} />;
}

// Full-screen game: start screen → 3-2-1 → play (pause with Esc) → results.
function TypingGamePlay({ gameId }) {
  const navigate = useNavigate();
  const game = gameById(gameId);
  const [level, setLevel] = useState('easy');
  const [phase, setPhase] = useState('start'); // start | countdown | playing | paused | over
  const [count, setCount] = useState(3);
  const [round, setRound] = useState(0);
  const [live, setLive] = useState({});
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (phase !== 'countdown') return undefined;
    const t = setTimeout(() => {
      if (count <= 1) setPhase('playing');
      else setCount(count - 1);
    }, 700);
    return () => clearTimeout(t);
  }, [phase, count]);

  useEffect(() => { if (phase === 'playing') setTimeout(() => inputRef.current?.focus(), 30); }, [phase]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setPhase((p) => (p === 'playing' ? 'paused' : p === 'paused' ? 'playing' : p));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const start = () => { setResult(null); setLive({}); setCount(3); setRound((r) => r + 1); setPhase('countdown'); };
  const onEnd = useCallback((r) => {
    const isBest = saveBest(game.id, level, r);
    setResult({ ...r, isBest });
    setPhase('over');
  }, [game, level]);
  const hud = useCallback((h) => setLive(h), []);

  if (!game) {
    return <div className="nd grid min-h-screen place-items-center bg-slate-50 p-6 text-center text-[13px] text-slate-600">Game not found. <Link to="/typing-games" className="font-semibold text-primary hover:underline">Back to Typing Games</Link></div>;
  }

  const best = getBest(game.id, level);
  const running = phase === 'playing' || phase === 'paused';
  const props = { level, paused: phase !== 'playing', onEnd, inputRef, hud };
  const scoreLabel = game.id === 'nitro' ? 'WPM' : 'Score';

  return (
    <div className="nd flex h-screen flex-col bg-slate-900">
      <header className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-white" style={{ background: `linear-gradient(90deg, ${game.from}, ${game.to})` }}>
        <button type="button" onClick={() => navigate('/typing-games')} className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12.5px] font-semibold hover:bg-white/25">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Games
        </button>
        <h1 className="font-display text-[17px] font-extrabold italic tracking-wide">{game.title}</h1>
        {running &&
          <div className="ml-auto flex flex-wrap items-center gap-2 text-[12.5px] font-semibold">
            {game.id !== 'nitro' && <span className="rounded-md bg-white/15 px-2.5 py-1">{scoreLabel}: {live.score ?? 0}</span>}
            {live.place && <span className="rounded-md bg-white/15 px-2.5 py-1">Place: {live.place}/4</span>}
            <span className="rounded-md bg-white/15 px-2.5 py-1">{live.wpm ?? 0} WPM</span>
            <span className="rounded-md bg-white/15 px-2.5 py-1">{live.accuracy ?? 100}%</span>
            <button type="button" onClick={() => setPhase((p) => (p === 'playing' ? 'paused' : 'playing'))} className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1 text-navy-900 hover:bg-slate-100">
              {phase === 'paused' ? <PlayIcon className="h-3.5 w-3.5" aria-hidden="true" /> : <PauseIcon className="h-3.5 w-3.5" aria-hidden="true" />} {phase === 'paused' ? 'Resume' : 'Pause'}
            </button>
          </div>
        }
      </header>

      <main className="relative min-h-0 flex-1">
        {(running || phase === 'over' || (phase === 'countdown' && round > 0)) && (
          game.id === 'nitro' ? <NitroRace key={round} {...props} /> :
            game.id === 'bubble' || game.id === 'space' ? <FallingWords key={round} theme={game.id} {...props} /> :
              <WordStream key={round} mode={game.id} {...props} />
        )}

        {phase === 'start' &&
          <Overlay>
            <h2 className="font-display text-[24px] font-extrabold text-navy-800">{game.title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{game.how}</p>
            <p className="mt-4 text-[12px] font-semibold text-navy-800">Choose a level</p>
            <div className="mt-2 flex justify-center gap-2" role="radiogroup" aria-label="Level">
              {LEVELS.map((l) => (
                <button key={l.id} type="button" role="radio" aria-checked={level === l.id} onClick={() => setLevel(l.id)}
                  className={`rounded-md border px-4 py-2 text-[13px] font-semibold ${level === l.id ? 'border-primary bg-primary text-white' : 'border-slate-300 text-slate-600 hover:border-primary'}`}>{l.label}</button>
              ))}
            </div>
            {best && <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-amber-700"><TrophyIcon className="h-4 w-4" aria-hidden="true" /> Your best: {best.score} {scoreLabel === 'WPM' ? 'WPM' : 'points'} · {best.wpm} WPM · {best.accuracy}%</p>}
            <button type="button" onClick={start} autoFocus className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-[14px] font-bold text-white hover:bg-primary-700"><PlayIcon className="h-4 w-4 fill-current" aria-hidden="true" /> Start Game</button>
            <p className="mt-3 text-[11px] text-slate-400">Press Esc to pause. Practice only — scores don&apos;t affect your results or rank.</p>
          </Overlay>
        }
        {phase === 'countdown' && <div className="absolute inset-0 grid place-items-center bg-slate-900/60"><span className="font-display text-[96px] font-extrabold text-white drop-shadow-lg" aria-live="assertive">{count}</span></div>}
        {phase === 'paused' &&
          <Overlay>
            <h2 className="font-display text-[22px] font-extrabold text-navy-800">Paused</h2>
            <div className="mt-4 flex justify-center gap-2">
              <button type="button" onClick={() => setPhase('playing')} autoFocus className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2.5 text-[13px] font-bold text-white hover:bg-primary-700"><PlayIcon className="h-4 w-4" aria-hidden="true" /> Resume</button>
              <button type="button" onClick={() => setPhase('start')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-5 py-2.5 text-[13px] font-semibold text-navy-800 hover:bg-slate-50"><RotateCcwIcon className="h-4 w-4" aria-hidden="true" /> Quit round</button>
            </div>
          </Overlay>
        }
        {phase === 'over' && result &&
          <Overlay>
            <h2 className="font-display text-[22px] font-extrabold text-navy-800">{result.isBest ? 'New best score!' : 'Game over'}</h2>
            {result.extra && <p className="mt-1 text-[13px] font-semibold text-primary">{result.extra}</p>}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat icon={TrophyIcon} label={scoreLabel} value={result.score} />
              <Stat icon={GaugeIcon} label="Speed" value={`${result.wpm} WPM`} />
              <Stat icon={TargetIcon} label="Accuracy" value={`${result.accuracy}%`} />
            </div>
            <p className="mt-3 text-[12px] text-slate-500">{result.words} words · {result.seconds} s{result.bestStreak ? ` · best streak ${result.bestStreak}` : ''}</p>
            {best && !result.isBest && <p className="mt-1 text-[12px] text-amber-700">Your best on {LEVELS.find((l) => l.id === level).label}: {best.score}</p>}
            <div className="mt-5 flex justify-center gap-2">
              <button type="button" onClick={start} autoFocus className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2.5 text-[13px] font-bold text-white hover:bg-primary-700"><RotateCcwIcon className="h-4 w-4" aria-hidden="true" /> Play Again</button>
              <button type="button" onClick={() => setPhase('start')} className="rounded-lg border border-slate-300 px-5 py-2.5 text-[13px] font-semibold text-navy-800 hover:bg-slate-50">Change Level</button>
            </div>
          </Overlay>
        }
      </main>
    </div>
  );
}

function Overlay({ children }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">{children}</div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <Icon className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
      <p className="mt-1 font-display text-[18px] font-extrabold text-navy-800">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
