import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { WORDS, WORLDS } from '../content';
import { useGame } from '../game/store';
import { sample, shuffle } from '../lib/util';
import { sfx, startBeat } from '../lib/sfx';
import { speak } from '../lib/tts';
import { WordPic } from '../exercises/common';
import TimerChip from '../components/TimerChip';

const LANES = 3;
const GAME_SEC = 60;
type Drop = { id: number; word: string; lane: number; y: number; hit?: 'good' | 'bad' };
type Round = { target: string; mode: 'pic' | 'ru' };

/** "Word Beats": words fall to a K-pop beat; tap the one that matches the picture (or the Russian word) before it lands. */
export default function Rhythm() {
  const nav = useNavigate();
  const s = useGame((g) => g.s);
  const update = useGame((g) => g.update);
  const best = s.games?.rhythmBest ?? 0;
  const pool = useMemo(() => {
    const known = [...new Set([...Object.keys(s.srs), ...Object.keys(s.wordsSeen ?? {})])].filter((id) => WORDS.has(id) && !WORDS.get(id)!.en.includes(' '));
    return known.length >= 8 ? known : WORLDS[0].words.slice(0, 20).map((w) => w.id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro');
  const [round, setRound] = useState<Round | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [left, setLeft] = useState(GAME_SEC);
  const [hits, setHits] = useState(0);
  const [beat, setBeat] = useState(0);
  const state = useRef({ speed: 0.22, nextId: 1, lives: 3, over: false });

  const newRound = () => {
    const target = pool[Math.floor(Math.random() * pool.length)];
    const others = sample(pool.filter((x) => x !== target && WORDS.get(x)!.emoji !== WORDS.get(target)!.emoji), LANES - 1);
    const words = shuffle([target, ...others]);
    setRound({ target, mode: Math.random() < 0.6 ? 'pic' : 'ru' });
    setDrops(words.map((w, lane) => ({ id: state.current.nextId++, word: w, lane, y: -10 })));
  };

  const finish = () => {
    if (state.current.over) return;
    state.current.over = true;
    setPhase('over');
    const hearts = Math.min(20, Math.floor(hits / 2));
    update((x) => ({ ...x, hearts: x.hearts + hearts, fans: x.fans + Math.round(score / 2), games: { ...x.games, rhythmBest: Math.max(score, x.games?.rhythmBest ?? 0) } }));
    sfx.win(); if (score > best) confetti({ particleCount: 140, spread: 100 });
  };

  // Game loop: move drops down; a correct word reaching the floor costs a life.
  useEffect(() => {
    if (phase !== 'play') return;
    let raf = 0; let last = performance.now();
    const loop = (t: number) => {
      const dt = (t - last) / 1000; last = t;
      setDrops((ds) => {
        const moved = ds.map((d) => (d.hit ? d : { ...d, y: d.y + state.current.speed * 100 * dt }));
        const landed = moved.find((d) => !d.hit && d.y >= 100);
        if (landed) {
          // missed the right one
          state.current.lives -= 1; setLives(state.current.lives); setCombo(0); sfx.wrong();
          if (state.current.lives <= 0) { setTimeout(finish, 0); return moved; }
          setTimeout(newRound, 0);
          return [];
        }
        return moved;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const stopBeat = startBeat(108, (b) => setBeat(b));
    const timer = setInterval(() => setLeft((l) => { if (l <= 1) { setTimeout(finish, 0); return 0; } return l - 1; }), 1000);
    return () => { cancelAnimationFrame(raf); stopBeat(); clearInterval(timer); };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (d: Drop) => {
    if (!round || d.hit || phase !== 'play') return;
    if (d.word === round.target) {
      const c = combo + 1;
      setCombo(c); setHits((h) => h + 1);
      setScore((sc) => sc + 10 * Math.min(4, 1 + Math.floor(c / 3)));
      state.current.speed = Math.min(0.55, state.current.speed + 0.012);
      sfx.coin(); void speak(WORDS.get(d.word)!.en, { rate: 1.1 });
      setDrops((ds) => ds.map((x) => (x.id === d.id ? { ...x, hit: 'good' } : x)));
      setTimeout(newRound, 280);
    } else {
      setCombo(0); sfx.wrong();
      setDrops((ds) => ds.map((x) => (x.id === d.id ? { ...x, hit: 'bad' } : x)));
    }
  };

  const start = () => {
    state.current = { speed: 0.22, nextId: 1, lives: 3, over: false };
    setScore(0); setCombo(0); setLives(3); setLeft(GAME_SEC); setHits(0);
    setPhase('play'); newRound();
  };

  if (phase === 'intro' || phase === 'over') {
    return (
      <div className="page col center" style={{ alignItems: 'center' }}>
        <div style={{ fontSize: 80 }}>{phase === 'over' ? '🏁' : '🎧'}</div>
        <h1 className="title-xl">Word Beats</h1>
        {phase === 'intro'
          ? <div className="muted">Слова падают под музыку. Лови то, что подходит к картинке или русскому слову, пока оно не упало! 3 жизни, 60 секунд.</div>
          : <><div style={{ fontSize: 28, fontWeight: 800 }}>Score: {score}</div><div className="muted">Best: {Math.max(best, score)} · ❤️ +{Math.min(20, Math.floor(hits / 2))} · 💖 +{Math.round(score / 2)}</div></>}
        <div className="row"><button className="btn ghost" onClick={() => nav('/')}>🏠 Home</button><button className="btn sun" onClick={start}>{phase === 'over' ? '🔁 Play again' : '▶️ Start!'}</button></div>
      </div>
    );
  }
  const target = round ? WORDS.get(round.target)! : null;
  return (
    <div className="page col" data-no-tr="recall" style={{ paddingBottom: 20, userSelect: 'none' }}>
      <div className="row">
        <button className="icon-btn" onClick={finish}>✖️</button>
        <span className="chip">⭐ {score}</span>
        {combo >= 3 && <motion.span key={combo} className="chip" initial={{ scale: 1.4 }} animate={{ scale: 1 }} style={{ color: 'var(--pink)' }}>🔥 x{Math.min(4, 1 + Math.floor(combo / 3))}</motion.span>}
        <div className="grow" />
        <span className="chip">{'❤️'.repeat(Math.max(0, lives))}</span>
        <span className="chip">⏳ {left}s</span>
        <TimerChip />
      </div>
      <motion.div key={round?.target} className="card center" initial={{ scale: 0.8 }} animate={{ scale: [1, beat % 2 ? 1.04 : 1] }} style={{ minHeight: 110, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #2a1f5c, #7c5cff)', color: '#fff' }}>
        {target && (round!.mode === 'pic' ? <WordPic w={target} size={70} /> : <div className="say-text" style={{ color: '#fff' }}>{target.ru}</div>)}
      </motion.div>
      <div style={{ position: 'relative', height: 'min(56vh, 480px)', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(#1a0b2e, #3b1d7a)', display: 'grid', gridTemplateColumns: `repeat(${LANES}, 1fr)` }}>
        {Array.from({ length: LANES }, (_, i) => <div key={i} style={{ borderRight: i < LANES - 1 ? '2px dashed rgba(255,255,255,0.12)' : 'none' }} />)}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: beat % 2 ? '#ff7eb6' : '#c7a6ff' }} />
        {drops.map((d) => (
          <button key={d.id} onPointerDown={() => tap(d)}
            style={{ position: 'absolute', left: `calc(${(d.lane * 100) / LANES}% + 6px)`, width: `calc(${100 / LANES}% - 12px)`, top: `calc(${Math.min(d.y, 100)}% - 54px)`,
              minHeight: 50, borderRadius: 16, fontWeight: 800, fontSize: 'clamp(15px, 4vw, 20px)', color: '#2b2140',
              background: d.hit === 'good' ? '#7ee0c3' : d.hit === 'bad' ? '#ff9aa2' : '#fff', boxShadow: '0 5px 0 rgba(0,0,0,0.25)', transition: 'background 0.15s' }}>
            {WORDS.get(d.word)!.en}
          </button>
        ))}
      </div>
    </div>
  );
}
