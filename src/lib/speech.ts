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

export const normalise = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ')
  .replace(/\bi'm\b/g, 'i am').replace(/\bit's\b/g, 'it is').replace(/\bhe's\b/g, 'he is').replace(/\bshe's\b/g, 'she is')
  .replace(/\bwhat's\b/g, 'what is').replace(/\bthere's\b/g, 'there is').replace(/\bi've\b/g, 'i have').replace(/\bdon't\b/g, 'do not')
  .replace(/\s+/g, ' ').trim();

/** Share of target words heard (0..1), best over alternatives. */
export function speechScore(target: string, heard: string[]): number {
  const t = normalise(target).split(' ').filter(Boolean);
  if (!t.length) return 0;
  let best = 0;
  for (const h of heard) {
    const hw = normalise(h).split(' ');
    const bag = [...hw];
    let hit = 0;
    for (const w of t) {
      const i = bag.findIndex((x) => x === w || (w.length > 3 && x.startsWith(w.slice(0, -1))));
      if (i >= 0) { hit++; bag.splice(i, 1); }
    }
    best = Math.max(best, hit / t.length);
  }
  return best;
}

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
