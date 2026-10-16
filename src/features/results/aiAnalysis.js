// AI Deep Analysis helpers. The numbers, levels and charts are always computed
// here from the result; Claude (via the backend) writes the coaching text. When
// AI isn't available the same text sections come from the rules below.

export const MISTAKE_TYPES = [
  { key: 'spelling', label: 'Spelling / Wrong Word', color: '#EC4899', full: true },
  { key: 'omission', label: 'Omission', color: '#F59E0B', full: true },
  { key: 'addition', label: 'Addition', color: '#0D6EFD', full: true },
  { key: 'repetition', label: 'Repetition', color: '#7C3AED', full: true },
  { key: 'capitalisation', label: 'Capitalisation', color: '#0EA5E9', full: false },
  { key: 'punctuation', label: 'Punctuation', color: '#14B8A6', full: false },
  { key: 'extraSpace', label: 'Extra Space', color: '#64748B', full: false },
];

const ADVICE = {
  spelling: ['Practise Difficult Words', 'Drill the words you typed wrongly until each one is automatic, then retype the passage they came from.'],
  omission: ['Stop Skipping Words', 'Keep your eyes one word ahead of your fingers and practise with Show Text off, so you track every word.'],
  addition: ['Avoid Extra Words', 'Slow down slightly on familiar phrases; most additions come from typing what you expect rather than what is written.'],
  repetition: ['Stop Repeating Words', 'When you lose your place, find it before typing again instead of retyping the last few words.'],
  capitalisation: ['Watch Capital Letters', 'Practise Shift-key accuracy with passages full of names and sentence starts.'],
  punctuation: ['Focus on Punctuation', 'Practise punctuation-heavy passages; commas and full stops count as half mistakes that add up quickly.'],
  extraSpace: ['Fix Extra Spaces', 'Press Space exactly once between words; practise short passages focusing only on clean spacing.'],
};

const round = (n) => Math.round(n * 10) / 10;

const level = (value, steps) => steps.find(([min]) => value >= min)?.slice(1) || steps[steps.length - 1].slice(1);

export function buildAnalysis(input, history = []) {
  const counts = input.counts || {};
  const totalMistakes = MISTAKE_TYPES.reduce((n, t) => n + (counts[t.key] || 0), 0);
  const words = Math.max(1, input.total_words || 0);
  const per100 = (totalMistakes / words) * 100;
  const target = input.target_wpm || 30;
  const targetAcc = input.target_accuracy || 95;
  const net = input.net_wpm || 0;

  const speed = level(net / target, [[1.1, 'Excellent', 'success'], [1, 'Good', 'primary'], [0.8, 'Fair', 'warning'], [-1, 'Needs Practice', 'danger']]);
  const acc = level(input.accuracy || 0, [[98, 'Excellent', 'success'], [targetAcc, 'Good', 'primary'], [90, 'Fair', 'warning'], [-1, 'Needs Attention', 'danger']]);
  const ctrl = level(-per100, [[-2, 'Excellent', 'success'], [-5, 'Good', 'primary'], [-10, 'Needs Attention', 'warning'], [-Infinity, 'Weak', 'danger']]);

  const speeds = history.map((h) => Number(h.nwpm) || 0).filter((n) => n > 0).slice(0, 6);
  let consistency = ['Not enough tests', 'muted', 'Take a few more tests'];
  if (speeds.length >= 3) {
    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const sd = Math.sqrt(speeds.reduce((a, b) => a + (b - mean) ** 2, 0) / speeds.length);
    const cv = mean ? sd / mean : 1;
    consistency = cv <= 0.08 ? ['Excellent', 'success', 'Very steady speed'] : cv <= 0.15 ? ['Good', 'primary', 'Stable performance'] : ['Uneven', 'warning', 'Speed varies a lot'];
    consistency[2] += ` (last ${speeds.length} tests)`;
  }

  const metrics = [
    { key: 'speed', label: 'Speed Level', value: speed[0], tone: speed[1], sub: `${net} WPM (target ${target})` },
    { key: 'accuracy', label: 'Accuracy Level', value: acc[0], tone: acc[1], sub: `${input.accuracy}%` },
    { key: 'mistakes', label: 'Mistake Control', value: ctrl[0], tone: ctrl[1], sub: `${totalMistakes} mistake${totalMistakes === 1 ? '' : 's'}` },
    { key: 'consistency', label: 'Consistency', value: consistency[0], tone: consistency[1], sub: consistency[2] },
  ];

  const pattern = MISTAKE_TYPES.map((t) => ({ ...t, count: counts[t.key] || 0, pct: totalMistakes ? round(((counts[t.key] || 0) / totalMistakes) * 100) : 0 }));
  const quick = [
    ['Words Typed', input.total_words],
    ['Correct Words', input.correct_words],
    ['Mistakes', totalMistakes],
    ['Accuracy', `${input.accuracy}%`],
    ['Net Speed', `${net} WPM`],
    ['Gross Speed', `${input.gross_wpm} WPM`],
  ];
  return { metrics, pattern, totalMistakes, quick, target, targetAcc, net };
}

// Rule-based text (used when AI analysis is unavailable).
export function ruleText(input, a) {
  const gap = Math.max(0, a.target - a.net);
  const top = a.pattern.filter((p) => p.count > 0).sort((x, y) => y.count - x.count);
  const strengths = [];
  if (input.accuracy >= a.targetAcc) strengths.push(`your accuracy of ${input.accuracy}% meets the ${a.targetAcc}% requirement`);
  if (a.net >= a.target) strengths.push(`your net speed of ${a.net} WPM meets the ${a.target} WPM target`);
  const summary = [
    strengths.length ? `Good work — ${strengths.join(' and ')}.` : `You typed at ${a.net} WPM net with ${input.accuracy}% accuracy.`,
    top.length ? `Most of your mistakes were ${top[0].label.toLowerCase()} (${top[0].count} of ${a.totalMistakes}).` : 'You made no mistakes in this test.',
    gap > 0 ? `You are ${round(gap)} WPM below the target, so the next step is steady speed building.` : 'Keep practising to hold this level under exam pressure.',
  ].join(' ');

  const recs = top.slice(0, 2).map((p) => ({ title: ADVICE[p.key][0], text: `${ADVICE[p.key][1]} (${p.count} this test.)` }));
  recs.push(gap > 0
    ? { title: 'Take Timed Speed Drills', text: `Do 15–20 minutes of timed drills daily and raise your target gradually from ${a.net} WPM towards ${a.target} WPM.` }
    : { title: 'Practise Longer Passages', text: 'Move to full-length timed passages to keep this speed and accuracy for the whole exam duration.' });
  while (recs.length < 3) recs.push({ title: 'Keep Accuracy High', text: 'Read each word fully before typing it; accuracy first, speed follows.' });

  const step = (f) => Math.round(a.net + gap * f);
  const plan = [
    { title: 'Accuracy Focus', items: ['Review the words you got wrong', top[0] ? `Practise ${top[0].label.toLowerCase()} control` : 'Practise punctuation passages', '10 minutes of daily drills'], goal: `${Math.max(a.targetAcc, Math.min(99, Math.round(input.accuracy) + 1))}%+ accuracy` },
    { title: 'Speed Building', items: ['Short timed drills', '15 minutes daily practice', 'Use speed tests'], goal: `${gap > 0 ? step(0.35) : a.net + 2} WPM` },
    { title: 'Mixed Practice', items: ['Full paragraph practice', 'Work on weak areas', 'Keep accuracy steady'], goal: `${gap > 0 ? step(0.7) : a.net + 4} WPM` },
    { title: 'Mock Tests', items: ['Take full-length tests', 'Track your results', 'Build consistency'], goal: `${gap > 0 ? a.target : a.net + 5}+ WPM` },
  ];
  const coach = gap > 0
    ? `You are ${round(gap)} WPM away from your target. ${top[0] ? `Cut down ${top[0].label.toLowerCase()} mistakes, ` : ''}practise a little every day and you will get there.`
    : `You have reached your target speed. Keep your accuracy high and practise full-length tests to stay exam-ready.`;
  return { executive_summary: summary, recommendations: recs.slice(0, 3), plan, coach_message: coach };
}
