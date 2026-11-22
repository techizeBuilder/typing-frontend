// Qualified / not qualified for a stored result. computeResultMetrics already
// applies the pattern (utils/scoring.js); this keeps the old call shape working.
export function isResultQualified(metrics) {
  return !!metrics?.qualified;
}
