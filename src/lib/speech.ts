// Speech recognition (where supported) + fuzzy comparison, and a microphone recorder fallback.
type Rec = { lang: string; interimResults: boolean; maxAlternatives: number; start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };

function Ctor(): (new () => Rec) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Rec) | null;
}
export const recognitionAvailable = () => typeof window !== 'undefined' && !!Ctor();

export function listenOnce(timeoutMs = 7000): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const C = Ctor();
    if (!C) return reject(new Error('unsupported'));
    const r = new C();
    r.lang = 'en-GB'; r.interimResults = false; r.maxAlternatives = 5;
    let done = false;
    const finish = (v: string[]) => { if (!done) { done = true; resolve(v); } };
    r.onresult = (e) => {
      const alts: string[] = [];
      const res = e.results[0];
      for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
      finish(alts);
    };
    r.onerror = (e) => { if (!done) { done = true; reject(new Error(e.error)); } };
    r.onend = () => finish([]);
    try { r.start(); } catch { done = true; reject(new Error('start-failed')); return; }
    setTimeout(() => { try { r.stop(); } catch { /* ignore */ } }, timeoutMs);
    // Some browsers never fire onend (no mic / no network): give up so the child is never stuck.
    setTimeout(() => { try { r.abort(); } catch { /* ignore */ } finish([]); }, timeoutMs + 2500);
  });
}

import { translit } from './util';
export { translit };

const CONTRACTIONS: [RegExp, string][] = [
  [/\b(he|she|it)'s got\b/g, '$1 has got'],
  [/\bi'm\b/g, 'i am'], [/\bit's\b/g, 'it is'], [/\bhe's\b/g, 'he is'], [/\bshe's\b/g, 'she is'], [/\bthat's\b/g, 'that is'],
  [/\bwhat's\b/g, 'what is'], [/\bwhere's\b/g, 'where is'], [/\bthere's\b/g, 'there is'], [/\blet's\b/g, 'let us'],
  [/\b(i|you|we|they)'ve\b/g, '$1 have'], [/\b(i|you|we|they)'re\b/g, '$1 are'], [/\b(i|you|he|she|we|they)'ll\b/g, '$1 will'],
[/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bwon't\b/g, 'will not'],
  [/\b(\w+)n't\b/g, '$1 not'],
];
const NUMS: Record<string, string> = { '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten', '11': 'eleven', '12': 'twelve', '20': 'twenty' };

export function normalise(s: string): string {
  let t = translit(s).replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ');
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  return t.replace(/'/g, '').split(/\s+/).filter(Boolean).map((w) => NUMS[w] ?? w).join(' ');
}

function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}
/** 1 = identical, 0 = nothing in common. */
const sim = (a: string, b: string) => (a === b ? 1 : 1 - lev(a, b) / Math.max(a.length, b.length));

const LETTER_NAMES: Record<string, string> = {
  ay: 'a', eh: 'a', bee: 'b', be: 'b', see: 'c', sea: 'c', dee: 'd', ee: 'e', eff: 'f', ef: 'f', gee: 'g', aitch: 'h', haitch: 'h', eye: 'i',
  jay: 'j', kay: 'k', el: 'l', ell: 'l', em: 'm', en: 'n', oh: 'o', owe: 'o', pee: 'p', pea: 'p', queue: 'q', cue: 'q', are: 'r', ar: 'r',
  es: 's', ess: 's', tee: 't', tea: 't', you: 'u', vee: 'v', double: 'w', ex: 'x', why: 'y', zed: 'z', zee: 'z',
};
/** Spelling check ("M, A, R, I, A."): accepts "m a r i a", "MARIA" or letter names ("em ay ar eye ay"). */
function checkLetters(T: string[], heard: string[]): SpeechCheck | null {
  if (T.length < 2 || !T.every((t) => /^[a-z]$/.test(t))) return null;
  const want = T.join('');
  for (const h of heard) {
    const toks = normalise(h).split(' ').map((w) => LETTER_NAMES[w] ?? w);
    const got = toks.join('');
    if (got.includes(want)) return { ok: true, score: 1, matched: T.map(() => true), words: T };
  }
  return { ok: false, score: 0, matched: T.map(() => false), words: T };
}

export type SpeechCheck = { ok: boolean; score: number; matched: boolean[]; words: string[] };

/**
 * Compares what was heard with the target phrase, in order (fuzzy longest common subsequence).
 * Short phrases (≤ 4 words) need every word; longer ones ≥ 85%. Extra unrelated words also fail it.
 * `nameWords` (the child's name) are matched more leniently because recognisers often misspell names.
 */
export function checkSpeech(target: string, heard: string[], nameWords: string[] = []): SpeechCheck {
  const T = normalise(target).split(' ').filter(Boolean);
  const names = new Set(nameWords.flatMap((n) => normalise(n).split(' ')).filter(Boolean));
  const empty: SpeechCheck = { ok: false, score: 0, matched: T.map(() => false), words: T };
  if (!T.length) return empty;
  const letters = checkLetters(T, heard);
  if (letters) return letters;
  let best = empty;
  for (const h of heard) {
    const H = normalise(h).split(' ').filter(Boolean);
    if (!H.length) continue;
    const eq = (t: string, x: string) => sim(t, x) >= (names.has(t) ? 0.5 : t.length <= 3 ? 1 : 0.75);
    // LCS table
    const L = Array.from({ length: T.length + 1 }, () => Array(H.length + 1).fill(0));
    for (let i = T.length - 1; i >= 0; i--) for (let j = H.length - 1; j >= 0; j--) {
      L[i][j] = eq(T[i], H[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
    const matched = T.map(() => false);
    for (let i = 0, j = 0; i < T.length && j < H.length;) {
      if (eq(T[i], H[j]) && L[i][j] === L[i + 1][j + 1] + 1) { matched[i] = true; i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
    }
    const m = L[0][0];
    const recall = m / T.length;
    const precision = m / H.length;
    const ok = (T.length <= 4 ? m === T.length : recall >= 0.85) && precision >= 0.6;
    const score = recall * Math.min(1, precision / 0.6);
    if (ok && !best.ok || (ok === best.ok && score > best.score)) best = { ok, score, matched, words: T };
  }
  return best;
}

/** Back-compat: share of the phrase heard (0..1). */
export const speechScore = (target: string, heard: string[]) => checkSpeech(target, heard).score;

export async function recordAudio(maxMs = 15000): Promise<{ stop: () => Promise<Blob> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.start();
  let resolveStop: (b: Blob) => void;
  const stopped = new Promise<Blob>((r) => { resolveStop = r; });
  rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); resolveStop(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })); };
  const timer = setTimeout(() => rec.state !== 'inactive' && rec.stop(), maxMs);
  return { stop: () => { clearTimeout(timer); if (rec.state !== 'inactive') rec.stop(); return stopped; } };
}
