import { Link } from 'react-router-dom';
import { BirdIcon, CarIcon, CircleIcon, EyeIcon, FishIcon, Gamepad2Icon, PlayIcon, RocketIcon, TreePineIcon, TrophyIcon, ZapIcon } from 'lucide-react';
import { Breadcrumbs } from '../../ui/PageHeading';
import { GAMES, bestOverall } from '../../features/games/gameData';

const ICONS = { bubble: CircleIcon, space: RocketIcon, nitro: CarIcon, jungle: TreePineIcon, birds: BirdIcon, aqua: FishIcon };

export default function TypingGames() {
  const games = GAMES.filter((g) => g.id !== 'blink');
  const blinkBest = bestOverall('blink');
  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-3"><Breadcrumbs crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Typing Games' }]} /></div>
      <section className="relative mb-5 overflow-hidden rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2.5 font-display text-[28px] font-bold text-navy-800"><Gamepad2Icon className="h-7 w-7 text-primary" aria-hidden="true" /> Typing Games</h2>
            <p className="mt-0.5 text-[13px] font-semibold text-primary">Play • Improve • Beat Your Best</p>
            <p className="mt-2 max-w-md text-[12.5px] text-slate-500">Make your typing practice fun! Choose a game, type fast, and track your progress.</p>
          </div>
          <div className="relative hidden shrink-0 items-center gap-3 sm:flex">
            <span className="rotate-[-6deg] rounded-2xl bg-primary px-4 py-3 text-center font-display text-[15px] font-extrabold italic leading-tight text-white shadow-lg">Type<br />Play<br />Improve</span>
            <RocketIcon className="h-14 w-14 rotate-45 text-primary-700" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><EyeIcon className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <p className="flex items-center gap-2 font-display text-[14.5px] font-bold text-emerald-800">Play with Blink <span className="rounded bg-danger px-1.5 py-[1px] text-[9px] font-bold text-white">NEW</span></p>
            <p className="text-[12px] text-emerald-700">Each word blinks on screen for a moment — type it from memory. Builds focus and speed.{blinkBest ? ` Your best: ${blinkBest.score}.` : ''}</p>
          </div>
        </div>
        <Link to="/typing-games/blink" className="flex shrink-0 items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-[12.5px] font-semibold text-white hover:bg-emerald-700"><PlayIcon className="h-4 w-4 fill-current" aria-hidden="true" /> Start Now</Link>
      </section>

      <h3 className="mb-3 flex items-center gap-2 font-display text-[18px] font-bold text-navy-800"><Gamepad2Icon className="h-5 w-5 text-primary" aria-hidden="true" /> Choose Your Game</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {games.map((g) => {
          const Icon = ICONS[g.id];
          const best = bestOverall(g.id);
          return (
            <article key={g.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
              <div className="flex h-28 items-center justify-center gap-2.5" style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
                <Icon className="h-8 w-8 text-white/90" aria-hidden="true" />
                <span className="font-display text-[22px] font-extrabold uppercase italic tracking-wide text-white drop-shadow">{g.title}</span>
              </div>
              <div className="p-4">
                <h4 className="flex items-center justify-between gap-2 font-display text-[15px] font-bold text-navy-800">
                  {g.title}
                  {best && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-[2px] text-[11px] font-semibold text-amber-700"><TrophyIcon className="h-3 w-3" aria-hidden="true" /> Best {best.score}{g.id === 'nitro' ? ' WPM' : ''}</span>}
                </h4>
                <p className="mt-1 text-[12px] text-slate-500">{g.desc}</p>
                <Link to={`/typing-games/${g.id}`} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-[12.5px] font-semibold text-white hover:bg-primary-700"><PlayIcon className="h-4 w-4 fill-current" aria-hidden="true" /> Play Now</Link>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-5 flex items-center gap-2 rounded-lg bg-primary-50 p-3 text-[11.5px] text-primary-700">
        <ZapIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        These games are for practice only — scores here do not affect your exam results or leaderboard rank. Best scores are kept on this device.
      </p>
    </div>
  );
}
