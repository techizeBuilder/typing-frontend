import React, { useState, useEffect } from 'react';
import { TrophyIcon, TargetIcon, XIcon } from 'lucide-react';
import { resultService, settingService } from '../services/api';
import { computeResultMetrics } from '../utils/resultMetrics';
import { LoadingState, EmptyState } from '../features/exams/ExamUI';

// "21:00" → "9:00 PM" for display.
const to12h = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ampm}`;
};

const Leaderboard = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examFilter, setExamFilter] = useState('All');
  const [rankUpdateTime, setRankUpdateTime] = useState('21:00');

  useEffect(() => {
    fetchLeaderboard();
    settingService.getAll()
      .then((s) => { if (s && s.live_rank_update_time) setRankUpdateTime(s.live_rank_update_time); })
      .catch(() => {});
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await resultService.getLeaderboard();
      setRawData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Unique exam names for dropdown
  const examOptions = Array.from(
    new Set(rawData.map(r => r.exam_name || 'Self Practice'))
  ).sort();

  // Logged-in student's identifiers. user_id is unique, so it's the reliable key for
  // locating this student in the ranking; name is only a display fallback for legacy
  // rows that predate user_id being returned by the leaderboard query.
  const myUserId = localStorage.getItem('user_id') || '';
  const myName   = localStorage.getItem('name') || localStorage.getItem('username') || '';

  // True when a ranking row belongs to the logged-in student.
  const rowIsMe = (row) => (myUserId && row.user_id)
    ? row.user_id === myUserId
    : (!!myName && row.username === myName);

  // Filter → recompute the CANONICAL nwpm/gwpm/accuracy for each row (the engine-
  // stored columns can drift from the true value for typing results — the same
  // reason ResultScreen and the admin results table re-derive them; see
  // resultMetrics.js) → re-sort by the recomputed metric → deduplicate per student
  // (first seen = best, now that the sort is trustworthy).
  // Keep the FULL ranking so we can compute the logged-in student's rank even when
  // they fall outside the visible top 10.
  const fullRanking = (() => {
    const filtered = examFilter === 'All'
      ? rawData
      : rawData.filter(r => (r.exam_name || 'Self Practice') === examFilter);

    const withMetrics = filtered.map(r => ({ ...r, _metrics: computeResultMetrics(r) }));

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
    return result;
  })();

  const leaderboard = fullRanking.slice(0, 10);

  // The logged-in student's position in the full ranking (1-based) and their best row.
  const myIndex = fullRanking.findIndex(rowIsMe);
  const myRank  = myIndex >= 0 ? myIndex + 1 : null;
  const myEntry = myIndex >= 0 ? fullRanking[myIndex] : null;

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[22px] font-bold text-navy-800">
            <TrophyIcon className="h-5 w-5 text-amber-500" aria-hidden="true" /> Top Performers
          </h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            Global Live Test Rank Leaderboard · Rankings update daily at {to12h(rankUpdateTime)}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-semibold text-navy-800">Exam</span>
            <select
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              className="w-[220px] rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-slate-700 outline-none focus:border-primary">
              <option value="All">All Exams</option>
              {examOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          {examFilter !== 'All' && (
            <button
              type="button"
              onClick={() => setExamFilter('All')}
              className="flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-600 transition-colors duration-150 hover:bg-rose-100">
              <XIcon className="h-3.5 w-3.5" aria-hidden="true" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Logged-in student's own rank — always shown on top */}
      {!loading && (
        <section className={`mb-4 flex flex-wrap items-center gap-4 rounded-xl border p-4 shadow-card ${myRank ? 'border-primary-100 bg-primary-50' : 'border-slate-200 bg-white'}`}>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-primary shadow-card">
            <TargetIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Your Rank</p>
            {myRank ? (
              <p className="font-display text-[22px] font-extrabold text-primary-700">
                #{myRank} {myRank === 1 && '🥇'}{myRank === 2 && '🥈'}{myRank === 3 && '🥉'}
                <span className="ml-1 text-[13px] font-semibold text-slate-500">of {fullRanking.length}</span>
              </p>
            ) : (
              <p className="text-[14px] font-semibold text-slate-600">
                No ranked Live Test{examFilter !== 'All' ? ` for "${examFilter}"` : ''} yet
              </p>
            )}
          </div>
          {myEntry && (
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-[11px] font-bold text-slate-500">GWPM</p>
                <p className="font-display text-[17px] font-bold text-slate-700">{Math.round(myEntry._metrics.gwpm)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500">NWPM</p>
                <p className="font-display text-[17px] font-extrabold text-primary">{Math.round(myEntry._metrics.nwpm)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500">Accuracy</p>
                <p className="font-display text-[17px] font-bold text-navy-800">{myEntry._metrics.accuracy.toFixed(2)}%</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Top three */}
      {!loading && leaderboard.length > 0 && (
        <ul className="mb-4 grid gap-4 md:grid-cols-3">
          {leaderboard.slice(0, 3).map((row, index) => (
            <li
              key={index}
              className={`flex items-center gap-3 rounded-xl border p-4 shadow-card ${
                ['border-amber-200 bg-amber-50', 'border-slate-200 bg-slate-50', 'border-orange-200 bg-orange-50'][index]}`}>
              <span className="text-[32px] leading-none" aria-hidden="true">{['🥇', '🥈', '🥉'][index]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Rank #{index + 1}</p>
                <p className="truncate font-display text-[15px] font-bold text-navy-800">
                  {row.username}{rowIsMe(row) && <span className="ml-1.5 rounded-full bg-primary px-2 py-[1px] text-[10px] font-bold text-white">You</span>}
                </p>
                <p className="text-[12px] text-slate-500">{row.exam_name || 'Self Practice'}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-[20px] font-extrabold text-primary">{Math.round(row._metrics.nwpm)}</p>
                <p className="text-[10.5px] font-semibold text-slate-400">NWPM</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <h3 className="border-b border-slate-100 px-4 py-3 font-display text-[15px] font-bold text-navy-800">Current Rankings</h3>
        {loading ? (
          <LoadingState>Loading leaderboard...</LoadingState>
        ) : leaderboard.length === 0 ? (
          <EmptyState>No test records found{examFilter !== 'All' ? ` for "${examFilter}"` : ''} yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="bg-slate-50 text-[12px] font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="px-5 py-3">Rank</th>
                  <th scope="col" className="px-5 py-3">Student Name</th>
                  <th scope="col" className="px-5 py-3">Gross Speed (GWPM)</th>
                  <th scope="col" className="px-5 py-3">Net Speed (NWPM)</th>
                  <th scope="col" className="px-5 py-3">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {leaderboard.map((row, index) => {
                  const isMe = rowIsMe(row);
                  return (
                    <tr
                      key={index}
                      className={`transition-colors duration-150 ${isMe ? 'bg-primary-50' : index < 3 ? 'bg-amber-50/40' : 'hover:bg-slate-50'}`}>
                      <td className={`px-5 py-3 font-bold ${index < 3 ? 'text-amber-700' : 'text-slate-500'}`}>
                        #{index + 1} {index === 0 && '🥇'} {index === 1 && '🥈'} {index === 2 && '🥉'}
                      </td>
                      <td className="px-5 py-3 font-semibold text-navy-800">
                        {row.username}
                        {isMe && <span className="ml-2 rounded-full bg-primary px-2 py-[1px] text-[10.5px] font-bold text-white">You</span>}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-600">{Math.round(row._metrics.gwpm)} WPM</td>
                      <td className="px-5 py-3 font-bold text-primary">{Math.round(row._metrics.nwpm)} WPM</td>
                      <td className="px-5 py-3 text-navy-800">{row._metrics.accuracy.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Leaderboard;
