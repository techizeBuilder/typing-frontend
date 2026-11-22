// Copies the scoring formula to the backend so the server's stats, ranks and
// delete rules score results exactly like the app. Run after editing
// src/utils/scoring.js or src/utils/resultMetrics.js:  node scripts/sync-scoring.cjs
// (the frontend test suite fails while the copies differ).
const fs = require('fs');
const path = require('path');

const FILES = [
  ['src/utils/scoring.js', '../../backend/src/results/scoring.ts'],
  ['src/utils/resultMetrics.js', '../../backend/src/results/result-metrics.ts'],
];
const HEADER = '// GENERATED from Electron-desktop/frontend/%SRC% by scripts/sync-scoring.cjs.\n// Do not edit here: edit the frontend file and run the script.\n// @ts-nocheck\n/* eslint-disable */\n';

const backendText = (src) => HEADER.replace('%SRC%', src) +
  fs.readFileSync(path.join(__dirname, '..', src), 'utf8').replace(/\r\n/g, '\n').replace("from './scoring';", "from './scoring';");

module.exports = { FILES, backendText };

if (require.main === module) {
  for (const [src, dest] of FILES) {
    fs.writeFileSync(path.join(__dirname, '..', dest), backendText(src));
    console.log('wrote', dest);
  }
}
