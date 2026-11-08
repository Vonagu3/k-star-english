import { describe, expect, it } from 'vitest';
import { Exercise } from '../content/schema';
import { WORDS } from '../content';
import { dailyCase, plural } from './dailyCase';
import { buildKey } from '../lib/mystery';

describe('daily mystery case', () => {
  it('is the same all day and different on other days', () => {
    expect(JSON.stringify(dailyCase('2026-11-08', []))).toBe(JSON.stringify(dailyCase('2026-11-08', [])));
    expect(JSON.stringify(dailyCase('2026-11-08', []).episode)).not.toBe(JSON.stringify(dailyCase('2026-11-09', []).episode));
  });

  it('builds valid, solvable cases for many days', () => {
    for (let d = 0; d < 200; d++) {
      const c = dailyCase(`2027-${d}`, d % 2 ? ['cat', 'dog', 'bed', 'mum'] : []);
      expect(c.episode.exercises.length).toBe(3);
      for (const ex of c.episode.exercises) {
        const parsed = Exercise.safeParse(ex);
        if (!parsed.success) throw new Error(`${c.id}: ${JSON.stringify(parsed.error.issues)}`);
        if (ex.type === 'spell') { expect(ex.words).toHaveLength(2); ex.words.forEach((w) => expect(WORDS.has(w)).toBe(true)); }
        if (ex.type === 'listen') ex.items.forEach((it) => expect(new Set(it.options.map((o) => o.text)).size).toBe(it.options.length));
        if (ex.type !== 'mystery') continue;
        for (const st of ex.steps) {
          const probs = st.kind === 'cipher' ? st.problems : [st];
          for (const p of probs) {
            expect(Number.isInteger(p.answer) && p.answer > 0).toBe(true);
            (p.terms ?? []).forEach((t) => expect(WORDS.has(t), t).toBe(true));
            const f = p.figure;
            if (f?.kind === 'cuboid' && f.cubes) expect(f.a * f.b * f.c).toBe(p.answer);
            expect(p.q).not.toMatch(/undefined|NaN/);
          }
          if (st.kind === 'cipher') {
            expect(st.problems).toHaveLength(st.word.length);
            const nums = st.problems.map((p) => p.answer);
            expect(new Set(nums).size).toBe(nums.length);
            (st.decoys ?? []).forEach((x) => expect(nums).not.toContain(x));
            expect(st.meaning.options[st.meaning.answer]).toBe(WORDS.get(st.word.toLowerCase())!.ru);
            expect(new Set(st.meaning.options).size).toBe(3);
            const key = buildKey(st.word, nums, st.decoys, c.id);
            expect(key).toHaveLength(nums.length + (st.decoys ?? []).length);
          }
        }
      }
    }
  });
});

describe('plural', () => {
  it('picks Russian forms', () => {
    expect([1, 2, 5, 11, 21, 22, 25, 112].map((k) => plural(k, 'монета', 'монеты', 'монет')))
      .toEqual(['монета', 'монеты', 'монет', 'монет', 'монета', 'монеты', 'монет', 'монет']);
  });
});

describe('daily case texts', () => {
  it('has no double dots', () => {
    for (let d = 0; d < 200; d++) {
      const m = dailyCase(`2028-${d}`, []).episode.exercises[1];
      if (m.type !== 'mystery') throw new Error('no mystery');
      for (const st of m.steps) for (const p of st.kind === 'cipher' ? st.problems : [st]) expect(p.q).not.toMatch(/\.\./);
    }
  });
});
