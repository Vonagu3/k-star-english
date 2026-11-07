/** Parses a typed numeric answer: "1 000", "12,5", " 7 " → number; anything else → null. */
export function parseAnswer(raw: string): number | null {
  const s = raw.replace(/\s/g, '').replace(',', '.'); // \s also covers the no-break space
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/** True when the typed answer equals the expected number (tolerates float noise). */
export function isRight(raw: string, answer: number): boolean {
  const n = parseAnswer(raw);
  return n !== null && Math.abs(n - answer) < 1e-9;
}

/** 12500 → "12 500" (Russian-style thousands separator). */
export const fmtNum = (n: number) => String(n).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
