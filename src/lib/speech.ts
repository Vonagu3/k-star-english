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
/** Number words → digits, so "one two three" and "1 2 3" / "123" compare equal. */
const NUM_WORDS: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19',
  twenty: '20', thirty: '30', forty: '40', fifty: '50', sixty: '60', seventy: '70', eighty: '80', ninety: '90', hundred: '100',
};

export function normalise(s: string): string {
  let t = translit(s).replace(/[’']/g, "'")
    // clock times as recognisers write them: 7:30 → half past 7, 7:00 → 7 o'clock, 7:15 → quarter past 7
    .replace(/\b(\d{1,2}):30\b/g, 'half past $1').replace(/\b(\d{1,2}):15\b/g, 'quarter past $1')
    .replace(/\b(\d{1,2}):00\b/g, "$1 o'clock").replace(/\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)/g, '$1')
    .replace(/[^a-z0-9' ]+/g, ' ');
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  // "oh" is only a number inside a run of numbers; elsewhere keep it as a word.
  const words = t.replace(/'/g, '').split(/\s+/).filter(Boolean);
  const mapped = words.map((w, i) => {
    if (w === 'oh') return /^\d+$/.test(NUM_WORDS[words[i - 1]] ?? words[i - 1] ?? '') ? '0' : w;
    return NUM_WORDS[w] ?? w;
  });
  // compound numbers: "twenty one" (20 1) → 21, "one hundred" (1 100) → 100
  const out: string[] = [];
  for (const w of mapped) {
    const prev = out[out.length - 1];
    if (prev && /^[2-9]0$/.test(prev) && /^[1-9]$/.test(w)) out[out.length - 1] = String(Number(prev) + Number(w));
    else if (prev === '1' && w === '100') out[out.length - 1] = '100';
    else out.push(w);
  }
  return out.join(' ');
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

/** Aligns one transcript with the target (fuzzy longest common subsequence, in order). */
function scoreOne(T0: string[], h: string, names: Set<string>, nameWildcard: boolean): SpeechCheck {
  const isNum = (t: string) => /^\d+$/.test(t);
  const H0 = normalise(h).split(' ').filter(Boolean);
  if (!H0.length) return { ok: false, score: 0, matched: T0.map(() => false), words: T0 };
  // Numbers are compared as one digit sequence, however the recogniser splits or joins them
  // ("16 17 18" = "161718" = "sixteen seventeen 18"); an extra "and" between them is ignored.
  const DT = T0.filter(isNum).join('');
  const DH = H0.filter(isNum).join('');
  const numbersOk = DT === DH;
  const T = T0.map((t, i) => ({ t, i })).filter((x) => !isNum(x.t));
  const allowAnd = T.some((x) => x.t === 'and');
  const H = H0.filter((x) => !isNum(x) && (allowAnd || x !== 'and' || !DT));
  const eq = (t: string, x: string) => (names.has(t) ? nameWildcard || sim(t, x) >= 0.5 : sim(t, x) >= (t.length <= 4 ? 1 : 0.8));
  const L = Array.from({ length: T.length + 1 }, () => Array(H.length + 1).fill(0));
  for (let i = T.length - 1; i >= 0; i--) for (let j = H.length - 1; j >= 0; j--) {
    L[i][j] = eq(T[i].t, H[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  }
  const matched0 = T0.map((t) => isNum(t) && numbersOk);
  for (let i = 0, j = 0; i < T.length && j < H.length;) {
    if (eq(T[i].t, H[j]) && L[i][j] === L[i + 1][j + 1] + 1) { matched0[T[i].i] = true; i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  const units = T.length + (DT ? 1 : 0);
  const heardUnits = H.length + (DH ? 1 : 0);
  const m = L[0][0] + (DT && numbersOk ? 1 : 0);
  const recall = units ? m / units : 0;
  const precision = heardUnits ? m / heardUnits : 0;
  const ok = (!DT || numbersOk) && (units <= 4 ? m === units : recall >= 0.85) && precision >= 0.6;
  return { ok, score: recall * Math.min(1, precision / 0.6), matched: matched0, words: T0 };
}

/**
 * Compares what was heard with the target phrase, in order.
 * Short phrases (≤ 4 words) need every word; longer ones ≥ 85%. Extra unrelated words also fail it.
 * Only the recogniser's top transcript (heard[0]) is judged: its other guesses are biased towards
 * common phrases and would accept wrong answers ("what's his name" → "what's your name").
 * The one exception is the child's name (`nameWords`), which recognisers often misspell:
 * if everything except the name matches in the top transcript, another guess may supply the name.
 */
export function checkSpeech(target: string, heard: string[], nameWords: string[] = []): SpeechCheck {
  const T = normalise(target).split(' ').filter(Boolean);
  const names = new Set(nameWords.flatMap((n) => normalise(n).split(' ')).filter(Boolean));
  if (!T.length || !heard.length) return { ok: false, score: 0, matched: T.map(() => false), words: T };
  const letters = checkLetters(T, heard.slice(0, 1));
  if (letters) return letters;
  const top = scoreOne(T, heard[0], names, false);
  if (top.ok || !T.some((t) => names.has(t))) return top;
  if (!scoreOne(T, heard[0], names, true).ok) return top;
  for (const alt of heard.slice(1)) {
    const r = scoreOne(T, alt, names, false);
    if (r.ok) return r;
  }
  return top;
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
