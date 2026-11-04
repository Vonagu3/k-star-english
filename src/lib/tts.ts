// British English text-to-speech via the Web Speech API.
// Only en-GB voices are ever used; the best-sounding one on the device is picked automatically
// unless the parent chose a specific voice.

let voice: SpeechSynthesisVoice | null = null;
let preferredName: string | null = null;
let baseRate = 0.9;

const isGB = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase().startsWith('en-gb');

/** Higher is better: neural/online voices first, then premium/enhanced, then known good ones; female voices slightly preferred for kids. */
function score(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/natural|online|neural/.test(n)) s += 50;
  if (/premium|enhanced|siri/.test(n)) s += 40;
  if (n.includes('google uk english female')) s += 35;
  if (/libby|sonia|maisie|serena|kate|stephanie|martha|hazel|susan|female/.test(n)) s += 10;
  if (/daniel|arthur|george|ryan|thomas|oliver|male/.test(n)) s += 5;
  if (v.localService) s += 2;
  return s;
}

export function britishVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return [];
  return speechSynthesis.getVoices().filter(isGB).sort((a, b) => score(b) - score(a));
}

function pickVoice(): SpeechSynthesisVoice | null {
  const gb = britishVoices();
  if (preferredName) {
    const p = gb.find((v) => v.name === preferredName);
    if (p) return p;
  }
  return gb[0] ?? null;
}

if (typeof speechSynthesis !== 'undefined') {
  voice = pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', () => { voice = pickVoice(); });
}

export const ttsAvailable = () => typeof speechSynthesis !== 'undefined';
/** True when the device has at least one British voice installed. */
export const hasBritishVoice = () => britishVoices().length > 0;

export function configureVoice(opts: { name?: string | null; rate?: number }) {
  if (opts.name !== undefined) preferredName = opts.name;
  if (opts.rate) baseRate = opts.rate;
  voice = pickVoice();
}

export function speak(text: string, opts: { rate?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsAvailable()) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (!voice) voice = pickVoice();
    if (voice) u.voice = voice;
    // Always ask for British English, even if no voice object is available yet
    // (Android Chrome picks its own en-GB voice from the lang).
    u.lang = 'en-GB';
    u.rate = (opts.rate ?? 0.9) * (baseRate / 0.9);
    u.pitch = 1.05;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
    // Safari sometimes never fires onend.
    setTimeout(resolve, Math.max(2500, text.length * 120));
  });
}

export function stopSpeaking() {
  if (ttsAvailable()) speechSynthesis.cancel();
}
