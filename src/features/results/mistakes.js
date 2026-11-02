// Mistake list + AI-analysis input shared by the result page and its Detailed
// Analysis panel. Display only: walks wordStatuses with the same rules ResultScreen
// uses for its counts.

// Word-level mistakes in passage order, then the additions.
export function collectMistakes({ referenceWords, wordStatuses, wordAt, lastTypedIndex, countOmissions, extraTypedWords }) {
  const mistakes = [];
  referenceWords.forEach((ref, i) => {
    const s = wordStatuses[i] || 'pending';
    const typed = wordAt(i);
    if (s === 'error') mistakes.push({ no: i + 1, expected: ref, typed, type: 'Spelling / Wrong Word' });
    else if (s === 'half-error') {
      mistakes.push({ no: i + 1, expected: ref, typed, type: typed.toLowerCase() === ref.toLowerCase() ? 'Capitalisation' : 'Punctuation' });
    } else if (s === 'pending' && (i <= lastTypedIndex || countOmissions)) {
      mistakes.push({ no: i + 1, expected: ref, typed: '', type: 'Omission' });
    }
  });
  (Array.isArray(extraTypedWords) ? extraTypedWords : []).forEach((w) => {
    mistakes.push({ no: null, expected: '', typed: w, type: 'Addition' });
  });
  return mistakes;
}

// Words worth drilling: the expected form of every spelling, half and omission mistake.
export const practiceWordsOf = (mistakes) => Array.from(new Set(
  mistakes.filter((m) => m.expected).map((m) => m.expected),
));

// Navigation state for /ai-analysis.
export const aiAnalysisState = ({ aiInput, counts, mistakes, passageFontFamily }) => ({
  input: {
    ...aiInput,
    counts,
    mistake_words: mistakes.filter((m) => m.expected || m.typed).slice(0, 20).map((m) => ({ expected: m.expected, typed: m.typed })),
  },
  practiceWords: practiceWordsOf(mistakes),
  passageFontFamily,
});
