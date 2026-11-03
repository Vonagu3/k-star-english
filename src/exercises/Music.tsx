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

// 10. Rhythm chant / karaoke.
export function Chant({ ex, onDone, name }: ExProps<Of<'chant'>>) {
  const lines = useMemo(() => ex.lines.map((l) => subName(l, name)), [ex.lines, name]);
  const [phase, setPhase] = useState<'intro' | 'listen' | 'fill' | 'sing' | 'done'>('intro');
  const [line, setLine] = useState(-1);
  const stopRef = useRef<(() => void) | null>(null);

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
          if (parts.every((p, k) => strip(tokens[li][ti + k]) === p)) {
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
  const [filled, setFilled] = useState<(string | null)[]>([]);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const cur = filled.length;

  const play = (withVoice: boolean, then: () => void) => {
    setLine(-1);
    const beatsPerLine = 4;
    stopRef.current = startBeat(ex.bpm, (b) => {
      if (b < 4) { if (b === 0) sfx.tap(); return; } // count-in bar
      const L = Math.floor((b - 4) / beatsPerLine);
      if ((b - 4) % beatsPerLine === 0) {
        if (L >= lines.length) { stopRef.current?.(); setLine(-1); then(); return; }
        setLine(L);
        if (withVoice) void speak(lines[L], { rate: 1.05 });
      }
    });
  };
  useEffect(() => () => { stopRef.current?.(); stopSpeaking(); }, []);

  const pick = (w: string) => {
    if (cur >= blanks.length) return;
    if (strip(w) === strip(blanks[cur].word)) {
      sfx.correct();
      if (!wrong) setScore((s) => s + 1);
      setWrong(null);
      const next = [...filled, w];
      setFilled(next);
      if (next.length === blanks.length) setTimeout(() => setPhase('sing'), 700);
    } else { sfx.wrong(); setWrong(w); }
  };

  const renderLine = (li: number) => tokens[li].map((t, ti) => {
    const bi = blanks.findIndex((b) => b.line === li && b.idx.includes(ti));
    if (phase === 'fill' && bi >= 0) {
      if (blanks[bi].idx[0] !== ti) return null;
      const val = filled[bi];
      return <span key={ti} className="blank" style={{ color: val ? 'var(--mint)' : bi === cur ? 'var(--pink)' : undefined }}>{val ?? ' '}</span>;
    }
    return <span key={ti}>{t} </span>;
  });

  return (
    <div className="col">
      <Prompt ru={phase === 'fill' ? 'Вставь пропущенные слова' : 'Слушай ритм и пой!'}>🎵 {ex.title ?? 'Chant time!'}</Prompt>
      <div className="card col" style={{ gap: 6, background: 'linear-gradient(160deg, #2a1f5c, #5a2ca0)', borderColor: '#5a2ca0' }}>
        {lines.map((_, li) => (
          <div key={li} className={`karaoke-line ${line === li ? 'on' : ''}`} style={{ color: line === li ? '#fff' : '#d9ccff' }}>{renderLine(li)}</div>
        ))}
      </div>
      {phase === 'intro' && <button className="btn" onClick={() => { setPhase('listen'); play(true, () => setPhase('fill')); }}>▶️ Listen to the chant</button>}
      {phase === 'listen' && <div className="center muted" style={{ fontWeight: 800 }}>🎧 Listen and clap to the beat!</div>}
      {phase === 'fill' && (
        <>
          <div className="row wrap" style={{ justifyContent: 'center', gap: 8 }}>
            {options.map((w, k) => (
              <button key={k} className={`tile ${filled.includes(w) && filled.filter((x) => x === w).length >= options.filter((x) => x === w).length ? 'dim' : ''} ${wrong === w ? 'bad' : ''}`} onClick={() => pick(w)}>{w}</button>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'center' }}><SpeakBtn text={lines.join('. ')} /></div>
        </>
      )}
      {phase === 'sing' && <button className="btn sun" onClick={() => { setPhase('done'); play(false, () => { sfx.win(); confetti({ particleCount: 80, spread: 70 }); setTimeout(() => onDone({ correct: score, total: blanks.length, skill: 'listening', metric: 'chant' }), 800); }); }}>🎤 Now YOU sing it!</button>}
      {phase === 'done' && <div className="center" style={{ fontWeight: 800, fontSize: 20 }}>🎤 Sing! Sing! Sing!</div>}
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
    <div className="col">
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
