import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, usedToday } from '../game/store';
import { srsDue } from '../game/rules';
import { WORDS } from '../content';
import { sample, shuffle } from '../lib/util';
import { speak } from '../lib/tts';
import { sfx } from '../lib/sfx';
import { Feedback, WordPic, word } from '../exercises/common';
import confetti from 'canvas-confetti';
import TimerChip from '../components/TimerChip';

type Q = { id: string; mode: 'listen' | 'pic' | 'ru'; options: string[] };

export default function Warmup() {
  const nav = useNavigate();
  const srs = useGame((g) => g.s.srs);
  const reviewWords = useGame((g) => g.reviewWords);
  const questions = useMemo<Q[]>(() => {
    const due = srsDue(srs, Date.now());
    const known = Object.keys(srs);
    let pool = due.slice(0, 12);
    if (pool.length < 8) pool = [...pool, ...sample(known.filter((k) => !pool.includes(k)), 8 - pool.length)];
    if (pool.length < 4) pool = [...pool, ...sample([...WORDS.keys()].slice(0, 30), 8 - pool.length)];
    const all = [...WORDS.keys()];
    return pool.map((id, k) => {
      const others = sample(all.filter((x) => x !== id && WORDS.get(x)!.en !== WORDS.get(id)!.en && WORDS.get(x)!.emoji !== WORDS.get(id)!.emoji), 3);
      return { id, mode: (['listen', 'pic', 'ru'] as const)[k % 3], options: shuffle([id, ...others]) };
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [res, setRes] = useState<{ id: string; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);
  const q = questions[i];
  useEffect(() => {
    if (done) return;
    useGame.setState((g) => ({ episodeStartSec: g.episodeStartSec ?? usedToday(g) }));
    return () => useGame.setState({ episodeStartSec: null });
  }, [done]);

  if (done) {
    const c = res.filter((r) => r.correct).length;
    return (
      <div className="page col center" style={{ alignItems: 'center' }}>
        <div style={{ fontSize: 80 }}>🔥</div>
        <h1 className="title-xl">Warm-up done!</h1>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{c} / {res.length} · +{c * 5} 💖</div>
        <button className="btn" onClick={() => nav('/')}>Home</button>
      </div>
    );
  }
  const w = word(q.id);
  const choose = (id: string) => {
    if (pick) return;
    setPick(id);
    const ok = id === q.id;
    if (ok) sfx.correct(); else sfx.wrong();
    void speak(w.en);
    setRes((r) => [...r, { id: q.id, correct: ok }]);
  };
  const next = () => {
    setPick(null);
    if (i + 1 >= questions.length) { reviewWords(res); confetti({ particleCount: 100 }); setDone(true); }
    else { setI(i + 1); if (questions[i + 1].mode === 'listen') setTimeout(() => void speak(word(questions[i + 1].id).en), 300); }
  };
  return (
    <div className="page col" data-no-tr="recall" style={{ paddingBottom: 140 }}>
      <div className="row"><button className="icon-btn" onClick={() => nav('/')}>✖️</button><div className="bar grow"><span style={{ width: `${(i / questions.length) * 100}%` }} /></div><TimerChip /></div>
      <h2 className="title-l center">🔥 Daily Warm-up</h2>
      <div className="card center" style={{ minHeight: 150, display: 'grid', placeItems: 'center' }}>
        {q.mode === 'listen' && <button className="btn violet" onClick={() => void speak(w.en)}>🔊 Listen</button>}
        {q.mode === 'pic' && <WordPic w={w} size={90} />}
        {q.mode === 'ru' && <div className="say-text">{w.ru}</div>}
      </div>
      <div className="grid grid-2">
        {q.options.map((id) => (
          <button key={id} className={`tile ${pick ? (id === q.id ? 'good' : id === pick ? 'bad' : 'dim') : ''}`} onClick={() => choose(id)}>
            {q.mode === 'listen' ? <><WordPic w={word(id)} size={40} /><span className="small">{word(id).en}</span></> : word(id).en}
          </button>
        ))}
      </div>
      {pick && <Feedback ok={pick === q.id} text={`${w.en} — ${w.ru}`} onNext={next} />}
    </div>
  );
}
