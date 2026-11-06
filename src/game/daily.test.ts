import { describe, expect, it } from 'vitest';
import { Exercise } from '../content/schema';
import { dailyMission } from './daily';
import { WORDS } from '../content';

describe('daily Paris mission', () => {
  it('is the same all day and different on other days', () => {
    const a = dailyMission('2026-11-06', [], new Set());
    const b = dailyMission('2026-11-06', [], new Set());
    const c = dailyMission('2026-11-07', [], new Set());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a.episode.exercises)).not.toBe(JSON.stringify(c.episode.exercises));
  });
  it('builds valid exercises with known words for many days', () => {
    for (let d = 1; d <= 60; d++) {
      const day = `2026-12-${String((d % 28) + 1).padStart(2, '0')}-${d}`;
      const m = dailyMission(day, ['mum', 'dad', 'cat', 'dog', 'red', 'bed'], new Set(['w1-e01', 'w1-e02']));
      expect(m.episode.exercises.length).toBeGreaterThanOrEqual(4);
      for (const ex of m.episode.exercises) {
        expect(Exercise.safeParse(ex).success).toBe(true);
        if (ex.type === 'memory' || ex.type === 'spell') ex.words.forEach((w) => expect(WORDS.has(w)).toBe(true));
        if (ex.type === 'listen') ex.items.forEach((it) => {
          expect(it.answer).toBeGreaterThanOrEqual(0);
          expect(new Set(it.options.map((o) => o.emoji)).size).toBe(it.options.length);
        });
        if (ex.type === 'memory') expect(new Set(ex.words).size).toBe(ex.words.length);
      }
    }
  });
});
