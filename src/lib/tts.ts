// British English text-to-speech via the Web Speech API.
const PREFERRED = ['Google UK English Female', 'Serena', 'Kate', 'Martha', 'Stephanie', 'Google UK English Male', 'Daniel', 'Arthur'];
let voice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  const gb = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('en-gb'));
  for (const name of PREFERRED) {
    const v = gb.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return gb[0] ?? voices.find((v) => v.lang.toLowerCase().startsWith('en')) ?? null;
}

if (typeof speechSynthesis !== 'undefined') {
  voice = pickVoice();
  speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };
}

export const ttsAvailable = () => typeof speechSynthesis !== 'undefined';

export function speak(text: string, opts: { rate?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsAvailable()) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (!voice) voice = pickVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-GB';
    u.rate = opts.rate ?? 0.9;
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
