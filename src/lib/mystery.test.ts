import { describe, expect, it } from 'vitest';
import { buildKey, lockText } from './mystery';
import { tallyResults } from '../game/tally';

describe('buildKey', () => {
  it('maps every answer to its letter and keeps decoys off the word letters', () => {
    const key = buildKey('GOLD', [30, 35, 16, 8], [24, 40], 'seed');
    expect(key).toHaveLength(6);
    const byN = new Map(key.map((c) => [c.n, c.letter]));
    expect([30, 35, 16, 8].map((n) => byN.get(n)).join('')).toBe('GOLD');
    for (const d of [24, 40]) expect('GOLD').not.toContain(byN.get(d));
  });
  it('is the same for the same seed', () => {
    expect(buildKey('KEY', [36, 20, 72], [21, 45], 'a')).toEqual(buildKey('KEY', [36, 20, 72], [21, 45], 'a'));
  });
  it('shows a repeated answer once (same letter)', () => {
    const key = buildKey('MOON', [21, 20, 20, 5], [25], 's');
    expect(key.filter((c) => c.n === 20)).toEqual([expect.objectContaining({ letter: 'O' })]);
    expect(key).toHaveLength(4);
  });
  it('formats big numbers', () => {
    expect(buildKey('AB', [1000, 2], [], 'x').find((c) => c.n === 1000)?.label).toBe('1 000');
  });
});

describe('lockText', () => {
  it('shows opened letters only', () => expect(lockText('OWL', [true, false, true])).toBe('O _ L'));
});

describe('tallyResults', () => {
  it('adds extra skills from one task', () => {
    const r = tallyResults([
      { correct: 5, total: 7, skill: 'maths', also: [{ skill: 'reading', correct: 1, total: 2 }], words: [{ id: 'owl', correct: true }] },
      { correct: 3, total: 4, skill: 'reading', metric: 'gap' as never },
    ]);
    expect(r.correct).toBe(9);
    expect(r.total).toBe(13);
    expect(r.skills).toEqual({ maths: { c: 5, t: 7 }, reading: { c: 4, t: 6 } });
    expect(r.words).toEqual([{ id: 'owl', correct: true }]);
  });
});
