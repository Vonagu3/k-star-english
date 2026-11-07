// Tiny synthesised sound effects and a K-pop style beat using WebAudio (no audio files).
let ctx: AudioContext | null = null;
let muted = false;
export const setMuted = (m: boolean) => { muted = m; };

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  const c = ac(); if (!c || muted) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
}

export const sfx = {
  tap: () => tone(660, 0, 0.06, 'triangle', 0.08),
  correct: () => { tone(784, 0, 0.12, 'triangle'); tone(1175, 0.09, 0.2, 'triangle'); },
  wrong: () => { tone(220, 0, 0.18, 'sawtooth', 0.07); tone(196, 0.12, 0.22, 'sawtooth', 0.06); },
  coin: () => { tone(988, 0, 0.08, 'square', 0.06); tone(1319, 0.07, 0.18, 'square', 0.06); },
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle', 0.14)),
  levelUp: () => [392, 523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.22, 'square', 0.07)),
  card: () => [1568, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.06, 0.2, 'sine', 0.1)),
  /** A short tune (dorm instruments). */
  melody: () => [523, 659, 784, 659, 880, 784].forEach((f, i) => tone(f, i * 0.16, 0.3, 'triangle', 0.12)),
  pop: () => { tone(880, 0, 0.05, 'sine', 0.12); tone(1320, 0.04, 0.08, 'sine', 0.08); },
  boing: () => { tone(330, 0, 0.12, 'sine', 0.14); tone(494, 0.08, 0.14, 'sine', 0.1); },
  splash: () => { const c = ac(); if (c && !muted) noise(c, c.currentTime, 0.6, 0.12, 1200); },
};

/** All beat sounds go through this bus, so a recording can take the beat directly (not through the microphone). */
let beatBus: GainNode | null = null;
function bus(c: AudioContext): GainNode {
  if (!beatBus) { beatBus = c.createGain(); beatBus.connect(c.destination); }
  return beatBus;
}

function noise(c: AudioContext, at: number, dur: number, vol: number, hp: number, out: AudioNode = c.destination) {
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = c.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(out); s.start(at);
}

function kick(c: AudioContext, at: number, out: AudioNode) {
  const o = c.createOscillator(); const g = c.createGain();
  o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(40, at + 0.15);
  g.gain.setValueAtTime(0.5, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.2);
  o.connect(g).connect(out); o.start(at); o.stop(at + 0.25);
}

function synth(c: AudioContext, at: number, freq: number, dur: number, out: AudioNode) {
  const o = c.createOscillator(); const g = c.createGain();
  o.type = 'square'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.04, at); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  o.connect(g).connect(out); o.start(at); o.stop(at + dur + 0.02);
}

/** Starts a looping beat. Calls onBeat(beatIndex) on every quarter note. Returns stop(). */
export function startBeat(bpm: number, onBeat: (beat: number) => void): () => void {
  const c = ac();
  const spb = 60 / bpm;
  let beat = 0;
  let stopped = false;
  const chords = [[523, 659, 784], [440, 523, 659], [349, 440, 523], [392, 494, 587]];
  let next = c ? c.currentTime + 0.1 : 0;
  const tick = () => {
    if (stopped) return;
    if (c && !muted) {
      while (next < c.currentTime + 0.2) {
        const b = beat;
        const out = bus(c);
        if (b % 2 === 0) kick(c, next, out);
        if (b % 4 === 2) noise(c, next, 0.12, 0.25, 1500, out);
        noise(c, next + spb / 2, 0.04, 0.08, 7000, out);
        if (b % 4 === 0) chords[Math.floor(b / 4) % 4].forEach((f) => synth(c, next, f / 2, spb * 1.5, out));
        const delay = Math.max(0, (next - c.currentTime) * 1000);
        setTimeout(() => { if (!stopped) onBeat(b); }, delay);
        beat++; next += spb;
      }
    } else {
      onBeat(beat++);
    }
  };
  const id = setInterval(tick, c && !muted ? 50 : spb * 1000);
  tick();
  return () => { stopped = true; clearInterval(id); };
}

/** Records the microphone mixed with the beat (the backing track), for karaoke.
 *  The beat is taken straight from the sound engine: the browser's echo cancellation removes
 *  speaker sound from the microphone, so it would never get into the recording otherwise.
 *  The beat is delayed by the device's audio latency so it lines up with what the child heard and sang to. */
export async function recordWithBeat(maxMs = 5 * 60 * 1000): Promise<{ stop: () => Promise<Blob> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const c = ac();
  if (!c || typeof c.createMediaStreamDestination !== 'function') return plainRecorder(stream, stream, maxMs, () => {});
  const dest = c.createMediaStreamDestination();
  const mic = c.createMediaStreamSource(stream);
  mic.connect(dest);
  const delay = c.createDelay(1);
  delay.delayTime.value = Math.min(0.9, (c.outputLatency || 0) + (c.baseLatency || 0) + 0.05);
  const level = c.createGain();
  level.gain.value = 0.5; // the voice stays on top of the beat
  const b = bus(c);
  b.connect(delay).connect(level).connect(dest);
  return plainRecorder(dest.stream, stream, maxMs, () => {
    try { b.disconnect(delay); } catch { /* already disconnected */ }
    mic.disconnect(); level.disconnect();
  });
}

function plainRecorder(recStream: MediaStream, micStream: MediaStream, maxMs: number, cleanup: () => void): { stop: () => Promise<Blob> } {
  const rec = new MediaRecorder(recStream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.start();
  let resolveStop: (b: Blob) => void;
  const stopped = new Promise<Blob>((r) => { resolveStop = r; });
  rec.onstop = () => {
    micStream.getTracks().forEach((t) => t.stop());
    cleanup();
    resolveStop(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
  };
  const timer = setTimeout(() => rec.state !== 'inactive' && rec.stop(), maxMs);
  return { stop: () => { clearTimeout(timer); if (rec.state !== 'inactive') rec.stop(); return stopped; } };
}
