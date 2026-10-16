// Qualified / not qualified for a stored result — the same rule as the result
// screen (ResultScreen.jsx isQualified) and GET /results/stats: the pattern's
// speed (NWPM or GWPM) and accuracy, applied to the re-derived metrics.
export function isResultQualified(metrics, pattern) {
  const p = pattern || {};
  const speed = (p.qualify_on ?? 'NWPM') === 'GWPM' ? metrics.gwpm : metrics.nwpm;
  return speed >= (p.required_speed ?? 30) && metrics.accuracy >= (p.required_accuracy ?? 95);
}
