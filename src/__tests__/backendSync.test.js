// The server scores results with a generated copy of the frontend formula.
// These tests fail if the copy is stale or behaves differently.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { computeResultMetrics as frontend } from '../utils/resultMetrics';
import { computeResultMetrics as backend } from '../../../../backend/src/results/result-metrics.ts';
import { PATTERNS, typingRow, stenoRow } from './fixtures';

const require = createRequire(import.meta.url);
const { FILES, backendText } = require('../../scripts/sync-scoring.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('backend scoring copy', () => {
  it.each(FILES)('%s is in sync (run node scripts/sync-scoring.cjs)', (src, dest) => {
    const onDisk = fs.readFileSync(path.join(root, dest), 'utf8').replace(/\r\n/g, '\n');
    expect(onDisk).toBe(backendText(src));
  });

  it('gives identical results for every pattern combination', () => {
    for (const p of PATTERNS) {
      for (const row of [typingRow({ pattern_data: p }), stenoRow({ pattern_data: { ...p, transposition_mistake: 'half', transpositions: 1, trailing_omissions: 1 } })]) {
        expect(backend(row)).toEqual(frontend(row));
      }
    }
  });
});
