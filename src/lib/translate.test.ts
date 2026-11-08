import { describe, expect, it } from 'vitest';
import { translateAt } from './translate';
import { WORLDS } from '../content';
import { CASES, dailyCase } from '../game/dailyCase';

// Keys whose text is Russian or not words (problem text, solutions, units, ids…).
const SKIP = new Set(['ru', 'q', 'solution', 'introRu', 'revealRu', 'unit', 'label', 'total', 'emoji', 'id', 'kind', 'type', 'url', 'source']);
function englishTexts(o: unknown, out: string[] = []): string[] {
  if (typeof o === 'string') { if (!/[а-яё]/i.test(o)) out.push(o); }
  else if (Array.isArray(o)) o.forEach((x) => englishTexts(x, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (!SKIP.has(k)) englishTexts(v, out);
  return out;
}
function untranslated(texts: string[]): string[] {
  const miss = new Set<string>();
  for (const t of texts) {
    const toks = (t.replace(/\{name\}/g, '').match(/[A-Za-z][A-Za-z'’]*/g) ?? []).map((x) => x.replace(/[’']+$/, ''));
    toks.forEach((tk, i) => { if (!translateAt(toks, i)) miss.add(tk.toLowerCase()); });
  }
  return [...miss].sort();
}

describe('right-click translation covers the mystery texts', () => {
  it('Mystery Woods world', () => {
    const w = WORLDS.find((x) => x.id === 'mystery')!;
    expect(untranslated(englishTexts([w.weeks, w.showcase]))).toEqual([]);
  });
  it('daily cases', () => {
    const texts = englishTexts(CASES);
    for (let d = 0; d < 100; d++) englishTexts(dailyCase(`2027-${d}`, []).episode, texts);
    expect(untranslated(texts)).toEqual([]);
  });
});
