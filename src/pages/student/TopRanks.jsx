import { useEffect, useState } from 'react';
import { TrophyIcon, CalendarIcon } from 'lucide-react';
import { resultService } from '../../services/api';
import { computeResultMetrics } from '../../utils/resultMetrics';
import { Breadcrumbs } from '../../ui/PageHeading';
import { LoadingState } from '../../features/exams/ExamUI';

const TOP_N = 10;

// Same ranking rule as the Leaderboard page: canonical metrics, NWPM desc, then
// accuracy desc, then earliest attempt; one row (the best) per student.
function rank(rows) {
  const withMetrics = rows.map((r) => ({ ...r, _metrics: computeResultMetrics(r) }));
  withMetrics.sort((a, b) => {
    if (b._metrics.nwpm !== a._metrics.nwpm) return b._metrics.nwpm - a._metrics.nwpm;
    if (b._metrics.accuracy !== a._metrics.accuracy) return b._metrics.accuracy - a._metrics.accuracy;
    return new Date(a.date_taken) - new Date(b.date_taken);
  });
  const seen = new Set();
  const result = [];
  for (const row of withMetrics) {
    const key = row.user_id || row.username;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  }
  return result.slice(0, TOP_N);
}

const isSteno = (r) => (r.mode || '').toLowerCase().includes('steno');
const isHindi = (r) => (r.mode || '').toLowerCase().includes('hindi');

function RankBadge({ rank: n }) {
  const medal = ['🥇', '🥈', '🥉'][n - 1];
  if (medal) return <span className="text-[18px]" aria-label={`Rank ${n}`}>{medal}</span>;
  return <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[11.5px] font-bold text-slate-600">{n}</span>;
}

function RankTable({ title, badge, tagline, tone, badgeBg, rows }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
        <div className="flex items-center gap-2.5">
          <span className={`grid h-9 w-9 place-items-center rounded-lg font-display text-[12px] font-bold text-white ${badgeBg}`}>{badge}</span>
          <h3 className={`font-display text-[18px] font-bold ${tone}`}>{title}</h3>
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500">{tagline}</span>
      </div>
      {rows.length === 0 ?
        <p className="px-4 py-10 text-center text-[12.5px] text-slate-500">No ranked live tests yet.</p> :
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-2.5">Rank</th>
                <th scope="col" className="px-4 py-2.5">Candidate Name</th>
                <th scope="col" className="px-4 py-2.5">Exam Name</th>
                <th scope="col" className="px-4 py-2.5 text-right">Net Speed</th>
                <th scope="col" className="px-4 py-2.5 text-right">Gross Speed</th>
                <th scope="col" className="px-4 py-2.5 text-right">Total Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {rows.map((r, i) => (
                <tr key={`${r.user_id || r.username}-${i}`} className="transition-colors duration-150 hover:bg-slate-50/70">
                  <td className="px-4 py-2.5"><RankBadge rank={i + 1} /></td>
                  <td className="px-4 py-2.5 font-semibold text-navy-800">{r.username}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.exam_name || 'Self Practice'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-primary">{Math.round(r._metrics.nwpm)} WPM</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-600">{Math.round(r._metrics.gwpm)} WPM</td>
                  <td className="px-4 py-2.5 text-right text-danger">{r._metrics.fullErrors + r._metrics.halfErrors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </section>
  );
}

export default function TopRanks() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    // Student leaderboard data: the most recently published day's live results
    // (published at the admin-set rank update time), never unpublished ones.
    resultService.getLeaderboard()
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }, []);

  const typing = (rows || []).filter((r) => !isSteno(r));
  const hindi = rank(typing.filter(isHindi));
  const english = rank(typing.filter((r) => !isHindi(r)));
  const publishedDay = (rows || []).reduce((d, r) => (!d || new Date(r.date_taken) > d ? new Date(r.date_taken) : d), null);

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-4">
        <Breadcrumbs crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Top Ranks' }]} />
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrophyIcon className="h-9 w-9 text-warn" aria-hidden="true" />
          <div>
            <h2 className="font-display text-[24px] font-bold text-navy-800">Top Ranks</h2>
            <p className="text-[12.5px] text-slate-500">Our Proud Students — Our Real Success</p>
          </div>
        </div>
        {publishedDay &&
          <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-4 py-2.5 text-[12.5px] font-medium text-amber-800">
            <CalendarIcon className="h-4 w-4" aria-hidden="true" />
            Live tests of {publishedDay.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        }
      </div>
      <p className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-center font-display text-[15px] font-semibold leading-relaxed text-navy-800">
        English और Hindi टाइपिंग लाइव टेस्ट में सबसे अच्छा प्रदर्शन करने वाले Balaji Typing के छात्र
      </p>

      {rows === null ? <LoadingState>Loading top ranks...</LoadingState> :
        <div className="grid gap-5 xl:grid-cols-2">
          <RankTable title="Hindi Typing" badge="हिं" tagline="मेहनत + अभ्यास = सफलता" tone="text-danger" badgeBg="bg-danger" rows={hindi} />
          <RankTable title="English Typing" badge="En" tagline="Practice Makes Perfect" tone="text-primary" badgeBg="bg-primary" rows={english} />
        </div>
      }
    </div>
  );
}
