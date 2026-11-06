import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { DanceMove, Exercise } from '../content/schema';
import { DANCE_MOVES } from '../content/schema';
import { speak, stopSpeaking } from '../lib/tts';
import { sfx, startBeat } from '../lib/sfx';
import { shuffle, subName } from '../lib/util';
import { useGame } from '../game/store';
import Avatar from '../components/Avatar';
import { Counter, Feedback, Prompt, SpeakBtn, type ExProps } from './common';

type Of<T extends Exercise['type']> = Extract<Exercise, { type: T }>;
const strip = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');

// 10. Rhythm chant / karaoke — with a player: previous / play-pause / next line, restart, tap a line to start there.
export type ChantSpeed = 'slow' | 'normal' | 'fast';
const SPEEDS: Record<ChantSpeed, { beat: number; voice: number; label: string; emoji: string }> = {
  slow: { beat: 0.7, voice: 0.75, label: 'Slow', emoji: '🐢' },
  normal: { beat: 0.85, voice: 0.9, label: 'Normal', emoji: '🙂' },
  fast: { beat: 1, voice: 1.05, label: 'Fast', emoji: '🐇' },
};
const SPEED_KEY = 'kstar-chant-speed';
function savedSpeed(): ChantSpeed {
  try { const v = localStorage.getItem(SPEED_KEY); if (v === 'slow' || v === 'normal' || v === 'fast') return v; } catch { /* ignore */ }
  return 'normal';
}

/** Beats a line gets: 4, or 8 when the voice needs longer than one bar to say it. */
function beatsFor(line: string, bpm: number, voiceRate: number) {
  const words = line.split(/\s+/).length;
  const speechSec = (words * 0.33 + 0.2) / voiceRate;
  return speechSec > (4 * 60) / bpm * 0.9 ? 8 : 4;
}

function useChantPlayer(lines: string[], baseBpm: number, speed: ChantSpeed) {
  const bpm = Math.round(baseBpm * SPEEDS[speed].beat);
  const voiceRate = SPEEDS[speed].voice;
  const [line, setLine] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [heardAll, setHeardAll] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const lastLine = useRef(0);
  const stop = () => { stopRef.current?.(); stopRef.current = null; stopSpeaking(); setPlaying(false); };
  const playFrom = (from: number, withVoice: boolean, onEnd?: () => void) => {
    stop();
    const start = Math.max(0, Math.min(from, lines.length - 1));
    setPlaying(true); setLine(-1);
    const COUNT_IN = 2;
    // Beat index at which each line (from `start`) begins.
    const starts: number[] = [];
    let acc = COUNT_IN;
    for (let L = start; L < lines.length; L++) { starts.push(acc); acc += beatsFor(lines[L], bpm, voiceRate); }
    const endBeat = acc;
    stopRef.current = startBeat(bpm, (b) => {
      if (b < COUNT_IN) { sfx.tap(); return; }
      if (b === endBeat) {
        stopRef.current?.(); stopRef.current = null;
        setPlaying(false); setLine(-1); lastLine.current = 0; setHeardAll(true);
        onEnd?.();
        return;
      }
      const k = starts.indexOf(b);
      if (k < 0) return;
      const L = start + k;
      if (L >= lines.length) {
        stopRef.current?.(); stopRef.current = null;
        setPlaying(false); setLine(-1); lastLine.current = 0; setHeardAll(true);
        onEnd?.();
        return;
      }
      setLine(L); lastLine.current = L;
      if (withVoice) void speak(lines[L], { rate: voiceRate });
    });
  };
  useEffect(() => () => { stopRef.current?.(); stopSpeaking(); }, []);
  const pause = () => { if (line >= 0) lastLine.current = line; stop(); };
  return { line, playing, heardAll, playFrom, pause, stop, resumeAt: () => lastLine.current };
}

function PlayerControls({ p, n, voice, onVoice, speed, onSpeed }: { p: ReturnType<typeof useChantPlayer>; n: number; voice: boolean; onVoice?: () => void; speed: ChantSpeed; onSpeed: (s: ChantSpeed) => void }) {
  const cur = p.line >= 0 ? p.line : p.resumeAt();
  return (
    <div className="col" style={{ gap: 8, alignItems: 'center' }}>
    <div className="row" role="radiogroup" aria-label="Speed" style={{ gap: 6 }}>
      {(Object.keys(SPEEDS) as ChantSpeed[]).map((s) => (
        <button key={s} role="radio" aria-checked={speed === s} className="chip"
          style={{ borderColor: speed === s ? 'var(--violet)' : undefined, background: speed === s ? 'var(--violet-soft)' : undefined }}
          onClick={() => onSpeed(s)}>
          {SPEEDS[s].emoji} {SPEEDS[s].label}
        </button>
      ))}
    </div>
    <div className="row wrap" style={{ justifyContent: 'center', gap: 8 }}>
      <button className="icon-btn" aria-label="Start again" title="Start again" onClick={() => p.playFrom(0, voice)}>⏮</button>
      <button className="icon-btn" aria-label="Previous line" title="Previous line" onClick={() => p.playFrom(cur - 1, voice)}>◀️</button>
      {p.playing
        ? <button className="btn violet" style={{ minWidth: 120 }} onClick={p.pause}>⏸ Pause</button>
        : <button className="btn violet" style={{ minWidth: 120 }} onClick={() => p.playFrom(cur, voice)}>▶️ Play</button>}
      <button className="icon-btn" aria-label="Next line" title="Next line" onClick={() => p.playFrom(Math.min(cur + 1, n - 1), voice)}>▶️▶️</button>
      {onVoice && <button className="chip" onClick={onVoice}>{voice ? '🔊 voice on' : '🔇 voice off'}</button>}
    </div>
    </div>
  );
}

export function Chant({ ex, onDone, name }: ExProps<Of<'chant'>>) {
  const lines = useMemo(() => ex.lines.map((l) => subName(l, name)), [ex.lines, name]);
  const [phase, setPhase] = useState<'listen' | 'fill' | 'sing'>('listen');
  const [singVoice, setSingVoice] = useState(false);
  const [sangOnce, setSangOnce] = useState(false);
  const [speed, setSpeedState] = useState<ChantSpeed>(savedSpeed);
  const setSpeed = (s: ChantSpeed) => { setSpeedState(s); try { localStorage.setItem(SPEED_KEY, s); } catch { /* ignore */ } };
  const p = useChantPlayer(lines, ex.bpm, speed);
  // Changing the speed while playing restarts the current line at the new speed.
  const restartRef = useRef<{ line: number; voice: boolean } | null>(null);
  const changeSpeed = (s: ChantSpeed) => {
    if (s === speed) return;
    restartRef.current = p.playing ? { line: p.line >= 0 ? p.line : p.resumeAt(), voice: phase === 'sing' ? singVoice : true } : null;
    p.stop();
    setSpeed(s);
  };
  useEffect(() => {
    const r = restartRef.current;
    restartRef.current = null;
    if (r) p.playFrom(r.line, r.voice);
  }, [speed]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (phase === 'sing' && p.playing) setSangOnce(true); }, [phase, p.playing]);

  // Blank positions: [lineIdx, tokenIdx[]] per blank, in reading order.
  const tokens = useMemo(() => lines.map((l) => l.split(/\s+/)), [lines]);
  const blanks = useMemo(() => {
    const used = new Set<string>();
    const found: { word: string; line: number; idx: number[] }[] = [];
    for (const b of ex.blanks) {
      const parts = b.split(/\s+/).map(strip);
      outer: for (let li = 0; li < tokens.length; li++) {
        for (let ti = 0; ti + parts.length <= tokens[li].length; ti++) {
          const idx = parts.map((_, k) => ti + k);
          if (idx.some((k) => used.has(`${li}:${k}`))) continue;
          if (parts.every((pt, k) => strip(tokens[li][ti + k]) === pt)) {
            idx.forEach((k) => used.add(`${li}:${k}`));
            found.push({ word: b, line: li, idx });
            break outer;
          }
        }
      }
    }
    return found.sort((a, b) => a.line - b.line || a.idx[0] - b.idx[0]);
  }, [ex.blanks, tokens]);
  const options = useMemo(() => shuffle(blanks.map((b) => b.word)), [blanks]);
  const [filled, setFilled] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const cur = filled.length;

  const go = (ph: typeof phase) => { p.stop(); setPhase(ph); };
  const pick = (w: string) => {
    if (cur >= blanks.length) return;
    if (strip(w) === strip(blanks[cur].word)) {
      sfx.correct();
      if (!wrong) setScore((s) => s + 1);
      setWrong(null);
      const next = [...filled, w];
      setFilled(next);
      if (next.length === blanks.length) setTimeout(() => go('sing'), 700);
    } else { sfx.wrong(); setWrong(w); }
  };
  const finish = () => {
    p.stop(); sfx.win(); confetti({ particleCount: 80, spread: 70 });
    setTimeout(() => onDone({ correct: score, total: blanks.length, skill: 'listening', metric: 'chant' }), 700);
  };

  const renderLine = (li: number) => tokens[li].map((t, ti) => {
    const bi = blanks.findIndex((b) => b.line === li && b.idx.includes(ti));
    if (phase === 'fill' && bi >= 0) {
      if (blanks[bi].idx[0] !== ti) return null;
      const val = filled[bi];
      return <span key={ti} className="blank" style={{ color: val ? 'var(--mint)' : bi === cur ? 'var(--pink)' : undefined }}>{val ?? '\u00a0'}</span>;
    }
    return <span key={ti}>{t} </span>;
  });
  const voice = phase === 'sing' ? singVoice : true;

  return (
    <div className="col">
      <Prompt ru={phase === 'fill' ? 'Вставь пропущенные слова. Можно вернуться и послушать ещё' : phase === 'sing' ? 'Теперь пой сама! Нажми на строку, чтобы начать с неё' : 'Слушай и хлопай в ритм. Нажми на строку, чтобы начать с неё'}>
        🎵 {ex.title ?? 'Chant time!'}
      </Prompt>
      <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
        {(['listen', 'fill', 'sing'] as const).map((ph, i) => (
          <button key={ph} className="chip" disabled={(ph === 'fill' && !p.heardAll && filled.length === 0) || (ph === 'sing' && filled.length < blanks.length)}
            style={{ borderColor: phase === ph ? 'var(--pink)' : undefined, background: phase === ph ? 'var(--pink-soft)' : undefined }} onClick={() => go(ph)}>
            {i + 1}. {ph === 'listen' ? '🎧 Listen' : ph === 'fill' ? '✏️ Fill' : '🎤 Sing'}
          </button>
        ))}
      </div>
      <div className="card col" style={{ gap: 6, background: 'linear-gradient(160deg, #2a1f5c, #5a2ca0)', borderColor: '#5a2ca0' }}>
        {lines.map((_, li) => (
          <div key={li} className={`karaoke-line ${p.line === li ? 'on' : ''}`} role="button" tabIndex={0}
            style={{ color: p.line === li ? '#fff' : '#d9ccff', cursor: 'pointer' }}
            onClick={() => p.playFrom(li, voice)}>
            {renderLine(li)}
          </div>
        ))}
      </div>
      {phase !== 'fill' && <PlayerControls p={p} n={lines.length} voice={voice} speed={speed} onSpeed={changeSpeed} onVoice={phase === 'sing' ? () => setSingVoice(!singVoice) : undefined} />}
      {phase === 'listen' && (
        <button className="btn" disabled={!p.heardAll && filled.length === 0} onClick={() => go(filled.length === blanks.length ? 'sing' : 'fill')}>
          {p.heardAll || filled.length ? (filled.length === blanks.length ? 'Sing it! →' : 'Fill the gaps →') : '🎧 Listen to the end first'}
        </button>
      )}
      {phase === 'fill' && (
        <>
          <div className="row wrap" data-no-tr="recall" style={{ justifyContent: 'center', gap: 8 }}>
            {options.map((w, k) => (
              <button key={k} className={`tile ${filled.filter((x) => x === w).length >= options.filter((x) => x === w).length ? 'dim' : ''} ${wrong === w ? 'bad' : ''}`} onClick={() => pick(w)}>{w}</button>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn ghost small" onClick={() => go('listen')}>🎧 Listen again</button>
            <SpeakBtn text={lines.join('. ')} />
          </div>
        </>
      )}
      {phase === 'sing' && (
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          {!sangOnce && !p.playing && <button className="btn sun" onClick={() => { setSangOnce(true); p.playFrom(0, singVoice); }}>🎤 Sing from the start!</button>}
          <button className="btn mint" disabled={!sangOnce} onClick={finish}>✅ I sang it!</button>
        </div>
      )}
    </div>
  );
}

// 11. Dance commands.
export const MOVE_INFO: Record<DanceMove, { emoji: string; label: string }> = {
  'hands-up': { emoji: '🙌', label: 'hands up' }, 'hands-down': { emoji: '👇', label: 'hands down' }, clap: { emoji: '👏', label: 'clap' },
  jump: { emoji: '🦘', label: 'jump' }, 'turn-left': { emoji: '↪️', label: 'turn left' }, 'turn-right': { emoji: '↩️', label: 'turn right' },
  'step-left': { emoji: '⬅️', label: 'step left' }, 'step-right': { emoji: '➡️', label: 'step right' }, wave: { emoji: '👋', label: 'wave' },
  spin: { emoji: '🌀', label: 'spin' }, 'finger-heart': { emoji: '🫰', label: 'finger heart' }, pose: { emoji: '✨', label: 'pose' },
};

export function Dance({ ex, onDone, name }: ExProps<Of<'dance'>>) {
  const look = useGame((g) => g.s.profile?.look);
  const [i, setI] = useState(0);
  const [seq, setSeq] = useState<DanceMove[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [move, setMove] = useState<DanceMove | 'idle' | 'cheer'>('idle');
  const [mk, setMk] = useState(0);
  const [score, setScore] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);
  const it = ex.items[i];
  const text = subName(it.text, name);
  useEffect(() => { setSeq([]); setChecked(null); setMove('idle'); const t = setTimeout(() => void speak(text), 300); return () => clearTimeout(t); }, [text]);
  useEffect(() => () => stopRef.current?.(), []);

  const perform = (moves: DanceMove[]) => {
    stopRef.current?.();
    let k = 0;
    stopRef.current = startBeat(112, (b) => {
      if (b % 2 !== 0) return;
      if (k >= moves.length) { stopRef.current?.(); setMove('cheer'); setMk((x) => x + 1); return; }
      setMove(moves[k]); setMk((x) => x + 1); k++;
    });
  };
  const check = () => {
    const ok = seq.length === it.moves.length && seq.every((m, k) => m === it.moves[k]);
    setChecked(ok);
    if (ok) { sfx.correct(); setScore((s) => s + 1); confetti({ particleCount: 50, spread: 60, origin: { y: 0.4 } }); } else sfx.wrong();
    perform(it.moves);
  };
  const next = () => {
    stopRef.current?.();
    if (i + 1 >= ex.items.length) onDone({ correct: score, total: ex.items.length, skill: 'reading', metric: 'dance' });
    else setI(i + 1);
  };
  return (
    <div className="col" data-no-tr="recall">
      <Prompt ru="Прочитай команду и собери танец. Потом станцуй вместе с аватаром!">💃 {ex.title ?? 'Dance practice!'}</Prompt>
      <Counter i={i} n={ex.items.length} />
      <div className="card tint-pink row" style={{ fontWeight: 800, fontSize: 22 }}><div className="grow">{text}</div><SpeakBtn text={text} /></div>
      <div className="row" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {look && <Avatar look={look} size={150} move={move} moveKey={mk} />}
        <div className="col grow" style={{ minWidth: 240 }}>
          <div className="card row wrap" style={{ minHeight: 70, gap: 6 }}>
            {seq.length === 0 && <span className="muted">Your dance: tap the moves below</span>}
            {seq.map((m, k) => (
              <button key={k} className="chip" disabled={checked !== null} onClick={() => setSeq(seq.filter((_, j) => j !== k))}>{MOVE_INFO[m].emoji} {MOVE_INFO[m].label}</button>
            ))}
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
            {DANCE_MOVES.map((m) => (
              <button key={m} className="tile" style={{ minHeight: 70, fontSize: 14 }} disabled={checked !== null || seq.length >= 4}
                onClick={() => { sfx.tap(); setSeq([...seq, m]); setMove(m); setMk((x) => x + 1); void speak(MOVE_INFO[m].label, { rate: 1 }); }}>
                <span style={{ fontSize: 28 }}>{MOVE_INFO[m].emoji}</span>{MOVE_INFO[m].label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button className="btn" disabled={!seq.length || checked !== null} onClick={check}>💃 Check & dance!</button>
      {checked !== null && (
        <Feedback ok={checked} nextLabel="Next"
          text={<span>Dance with me! {it.moves.map((m) => MOVE_INFO[m].emoji).join(' ')} <button className="chip" onClick={() => perform(it.moves)}>🔁 again</button></span>}
          onNext={next} />
      )}
    </div>
  );
}
