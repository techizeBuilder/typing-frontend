import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecksIcon, DumbbellIcon, BrainIcon } from 'lucide-react';
import { aiAnalysisState, collectMistakes, practiceWordsOf } from './mistakes';

// Mistake breakdown for a typing result. Purely presentational: the category
// counts are the values ResultScreen already computed for the score, and the
// per-word list walks wordStatuses with the same rules ResultScreen uses
// (error = spelling, half-error = capitalisation if only case differs else
// punctuation, pending = omission unless trailing and omissions not counted).
const CATEGORIES = [
  { key: 'spelling', label: 'Spelling / Wrong Word', color: '#EC4899', weight: 'Full' },
  { key: 'omission', label: 'Omission', color: '#F59E0B', weight: 'Full' },
  { key: 'addition', label: 'Addition', color: '#0D6EFD', weight: 'Full' },
  { key: 'repetition', label: 'Repetition', color: '#7C3AED', weight: 'Full' },
  { key: 'capitalisation', label: 'Capitalisation', color: '#0EA5E9', weight: 'Half' },
  { key: 'punctuation', label: 'Punctuation', color: '#14B8A6', weight: 'Half' },
  { key: 'extraSpace', label: 'Extra Space', color: '#64748B', weight: 'Half' },
];

const TYPE_TONE = {
  'Spelling / Wrong Word': 'bg-pink-50 text-pink-700',
  Omission: 'bg-amber-50 text-amber-700',
  Addition: 'bg-primary-50 text-primary-700',
  Capitalisation: 'bg-sky-50 text-sky-700',
  Punctuation: 'bg-teal-50 text-teal-700',
};

const LIST_LIMIT = 60;

export default function DetailedAnalysis({
  counts,
  referenceWords,
  wordStatuses,
  wordAt,
  lastTypedIndex,
  countOmissions,
  extraTypedWords,
  halfMistakeEnabled,
  mode,
  examName,
  passageFontFamily,
  aiInput,
}) {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const mistakes = collectMistakes({ referenceWords, wordStatuses, wordAt, lastTypedIndex, countOmissions, extraTypedWords });

  const total = CATEGORIES.reduce((sum, c) => sum + (counts[c.key] || 0), 0);
  const shown = showAll ? mistakes : mistakes.slice(0, LIST_LIMIT);

  const practiceWords = practiceWordsOf(mistakes);

  return (
    <section className="nd rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3 className="flex items-center gap-2 font-display text-[14px] font-semibold text-navy-800">
          <ListChecksIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Detailed Analysis
        </h3>
        {aiInput &&
          <button
            type="button"
            onClick={() => navigate('/ai-analysis', { state: aiAnalysisState({ aiInput, counts, mistakes, passageFontFamily }) })}
            className="no-print ml-auto inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-primary px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-90">
            <BrainIcon className="h-3.5 w-3.5" aria-hidden="true" /> AI Deep Analysis
          </button>
        }
        {practiceWords.length > 0 &&
          <button
            type="button"
            onClick={() => navigate('/practice-words', { state: { words: practiceWords, mode, examName, passageFontFamily } })}
            className={`no-print ${aiInput ? '' : 'ml-auto '}inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white transition-colors duration-150 hover:bg-primary-700`}>
            <DumbbellIcon className="h-3.5 w-3.5" aria-hidden="true" /> Practise These Words ({practiceWords.length})
          </button>
        }
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div>
          <p className="mb-2 text-[12px] font-semibold text-slate-500">Mistake Analysis</p>
          <ul className="space-y-2.5">
            {CATEGORIES.map((c) => {
              const n = counts[c.key] || 0;
              const pct = total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
              return (
                <li key={c.key}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-600">
                      {c.label}
                      <span className="ml-1 text-[10.5px] text-slate-400">
                        ({c.weight === 'Half' && halfMistakeEnabled ? '½' : '1'} each)
                      </span>
                    </span>
                    <span className="font-semibold text-navy-800">{n} <span className="font-normal text-slate-400">({pct}%)</span></span>
                  </div>
                  <span className="mt-1 block h-1.5 w-full rounded-full bg-slate-100">
                    <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-[12px] font-semibold text-slate-500">Mistakes List ({mistakes.length})</p>
          {mistakes.length === 0 ?
            <p className="rounded-lg bg-emerald-50 px-3 py-4 text-center text-[12.5px] font-medium text-emerald-700">No word-level mistakes — well done!</p> :
            <div className="max-h-[360px] overflow-auto rounded-lg border border-slate-100">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2">Word #</th>
                    <th scope="col" className="px-3 py-2">Expected</th>
                    <th scope="col" className="px-3 py-2">You Typed</th>
                    <th scope="col" className="px-3 py-2">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100" style={passageFontFamily ? { fontFamily: passageFontFamily } : undefined}>
                  {shown.map((m, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-1.5 text-slate-400">{m.no ?? '—'}</td>
                      <td className="px-3 py-1.5 font-medium text-emerald-700">{m.expected || '—'}</td>
                      <td className="px-3 py-1.5 font-medium text-rose-700">{m.typed || '—'}</td>
                      <td className="px-3 py-1.5">
                        <span className={`rounded px-1.5 py-[1px] text-[10.5px] font-semibold ${TYPE_TONE[m.type] || 'bg-slate-100 text-slate-600'}`}>{m.type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
          {mistakes.length > LIST_LIMIT &&
            <button type="button" onClick={() => setShowAll((v) => !v)} className="no-print mt-2 text-[12px] font-semibold text-primary hover:underline">
              {showAll ? 'Show fewer' : `Show all ${mistakes.length} mistakes`}
            </button>
          }
          <p className="mt-2 text-[11px] text-slate-400">
            Repeated words are listed in the Repeated Lines table when present. Extra spaces are counted from the typed text and are not tied to a single word.
          </p>
        </div>
      </div>
    </section>
  );
}
