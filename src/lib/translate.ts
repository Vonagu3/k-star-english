import DICT from '../content/dictionary.json';
import { WORLDS } from '../content';

const dict = DICT as Record<string, string>;

/** Lesson vocabulary first (exact meaning used in the app), including multi-word phrases. */
const VOCAB = new Map<string, string>();
for (const w of WORLDS) for (const word of w.words) {
  const k = word.en.toLowerCase();
  if (!VOCAB.has(k)) VOCAB.set(k, word.ru);
}
const MAX_PHRASE = Math.max(1, ...[...VOCAB.keys()].map((k) => k.split(' ').length));

const norm = (t: string) => t.toLowerCase().replace(/’/g, "'");

function single(tok: string): string | null {
  const t = norm(tok);
  const direct = VOCAB.get(t) ?? dict[t];
  if (direct) return direct;
  if (t.endsWith("'s")) return single(t.slice(0, -2));
  const stems = [
    t.endsWith('ies') ? `${t.slice(0, -3)}y` : null,
    t.endsWith('es') ? t.slice(0, -2) : null,
    t.endsWith('s') ? t.slice(0, -1) : null,
    t.endsWith('ed') ? t.slice(0, -2) : null,
    t.endsWith('ed') ? t.slice(0, -1) : null,
    t.endsWith('ing') ? t.slice(0, -3) : null,
    t.endsWith('ing') ? `${t.slice(0, -3)}e` : null,
  ].filter(Boolean) as string[];
  for (const s of stems) { const r = VOCAB.get(s) ?? dict[s]; if (r) return r; }
  return null;
}

/**
 * Translate the word at `index` in `tokens`, preferring the longest vocabulary phrase that contains it
 * (so "living" inside "living room" shows "гостиная").
 */
export function translateAt(tokens: string[], index: number): { en: string; ru: string } | null {
  for (let len = Math.min(MAX_PHRASE, tokens.length); len >= 2; len--) {
    for (let start = Math.max(0, index - len + 1); start <= index && start + len <= tokens.length; start++) {
      const phrase = tokens.slice(start, start + len).map(norm).join(' ');
      const ru = VOCAB.get(phrase);
      if (ru) return { en: tokens.slice(start, start + len).join(' '), ru };
    }
  }
  const ru = single(tokens[index]);
  return ru ? { en: tokens[index], ru } : null;
}
