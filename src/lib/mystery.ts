// Mystery cases: the code table for cipher steps (pure, seeded so it never jumps between renders).
import { rng } from '../game/daily';
import { fmtNum } from './maths';

export type KeyCell = { n: number; label: string; letter: string };

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Code table for a cipher: every problem answer → its letter of `word`, plus decoy numbers with
 * letters that are not in the word (so a decoy can never look like a right letter). Shuffled by `seed`.
 */
export function buildKey(word: string, answers: number[], decoys: number[] = [], seed = word): KeyCell[] {
  const r = rng(`mystery-${seed}`);
  const cells: KeyCell[] = [];
  const seen = new Set<number>();
  answers.forEach((n, i) => {
    if (seen.has(n)) return; // same answer twice → same letter (the validator forbids it anyway)
    seen.add(n);
    cells.push({ n, label: fmtNum(n), letter: word[i] });
  });
  const free = ABC.split('').filter((c) => !word.includes(c));
  for (const n of decoys) {
    if (seen.has(n)) continue;
    seen.add(n);
    cells.push({ n, label: fmtNum(n), letter: free.splice(Math.floor(r() * free.length), 1)[0] ?? '?' });
  }
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  return cells;
}

/** Letters opened so far: `opened[i]` true → word[i], else a blank. */
export const lockText = (word: string, opened: boolean[]) => word.split('').map((c, i) => (opened[i] ? c : '_')).join(' ');
