import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Exercise, Question } from '../content/schema';
import { speak } from '../lib/tts';
import { sfx } from '../lib/sfx';
import { checkSpeech, listenOnce, normalise, recognitionAvailable, recordAudio, type SpeechCheck } from '../lib/speech';
import { submitWork } from '../lib/submissions';
import { useGame } from '../game/store';
import { sample, shuffle, subName } from '../lib/util';
import { Counter, Feedback, Prompt, SpeakBtn, WordPic, word, type ExProps } from './common';

type Of<T extends Exercise['type']> = Extract<Exercise, { type: T }>;

/** Multiple-choice questions shared by read / watch / kculture. */
function Questions({ qs, name, onDone }: { qs: Question[]; name: string; onDone: (correct: number) => void }) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const q = qs[i];
  const choose = (k: number) => {
    if (pick !== null) return;
    setPick(k);
    if (k === q.answer) { sfx.correct(); setScore((s) => s + 1); } else sfx.wrong();
  };
  const next = () => {
    setPick(null);
    if (i + 1 >= qs.length) onDone(score);
    else setI(i + 1);
  };
  return (
    <div className="col">
      <Counter i={i} n={qs.length} />
      <div className="row" style={{ justifyContent: 'center' }}>
        <h3 className="title-l center">{subName(q.q, name)}</h3>
        <SpeakBtn text={subName(q.q, name)} />
      </div>
      <div className="grid grid-2" data-no-tr="recall">
        {q.options.map((o, k) => (
          <button key={k} className={`tile ${pick === null ? '' : k === q.answer ? 'good' : k === pick ? 'bad' : 'dim'}`} onClick={() => choose(k)}>{subName(o, name)}</button>
        ))}
      </div>
      {pick !== null && <Feedback ok={pick === q.answer} text={pick === q.answer ? undefined : `Answer: ${subName(q.options[q.answer], name)}`} onNext={next} />}
    </div>
  );
}

// 7. Read & answer.
export function Read({ ex, onDone, name }: ExProps<Of<'read'>>) {
  const [stage, setStage] = useState<'read' | 'q'>('read');
  const paras = ex.story.paragraphs.map((p) => subName(p, name));
  if (stage === 'q') return <Questions qs={ex.questions} name={name} onDone={(c) => onDone({ correct: c, total: ex.questions.length, skill: 'reading' })} />;
  return (
    <div className="col">
      <Prompt ru="Прочитай историю. Нажми на предложение, чтобы послушать">{ex.story.emoji} {subName(ex.story.title, name)}</Prompt>
      <div className="card" style={{ fontSize: 'clamp(19px, 4.4vw, 23px)', lineHeight: 1.7, fontWeight: 700 }}>
        {paras.map((p, k) => (
          <p key={k} style={{ margin: '0 0 12px' }}>
            {p.split(/(?<=[.!?])\s+/).map((s, j) => (
              <span key={j} onClick={() => void speak(s)} style={{ cursor: 'pointer', borderRadius: 8, padding: '0 2px' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--sun-soft)')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>{s} </span>
            ))}
          </p>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn violet" onClick={() => void speak(paras.join(' '), { rate: 0.85 })}>🔊 Read it to me</button>
        <button className="btn" onClick={() => setStage('q')}>I read it! →</button>
      </div>
    </div>
  );
}

// 8. Speak it.
export function Speak({ ex, onDone, name, lessonId }: ExProps<Of<'speak'>>) {
  const userId = useGame((g) => g.userId);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [state, setState] = useState<'idle' | 'listening' | 'good' | 'retry' | 'recording' | 'saved' | 'self'>('idle');
  const [heard, setHeard] = useState('');
  const [check, setCheck] = useState<SpeechCheck | null>(null);
  const [tries, setTries] = useState(0);
  const rec = useRef<{ stop: () => Promise<Blob> } | null>(null);
  const it = ex.items[i];
  const text = subName(it.text, name);
  const canRecognise = recognitionAvailable();
  useEffect(() => { setState('idle'); setHeard(''); setCheck(null); setTries(0); const t = setTimeout(() => void speak(text), 300); return () => clearTimeout(t); }, [text]);

  const tryRecognise = async () => {
    setState('listening');
    try {
      const alts = await listenOnce();
      const c = checkSpeech(text, alts, name ? [name] : []);
      setCheck(c);
      setHeard(alts[0] ?? '');
      if (c.ok) { sfx.correct(); setScore((s) => s + 1); setState('good'); }
      else { sfx.wrong(); setTries((t) => t + 1); setState('retry'); }
    } catch {
      setTries((t) => t + 1); setState('retry');
    }
  };
  const startRecording = async () => {
    try { rec.current = await recordAudio(); setState('recording'); } catch { setState('saved'); setScore((s) => s + 1); }
  };
  const stopRecording = async () => {
    const blob = await rec.current?.stop();
    if (blob) void submitWork(userId, { kind: 'audio', lessonId, prompt: text, blob });
    sfx.correct(); setScore((s) => s + 1); setState('saved');
  };
  const next = () => {
    if (i + 1 >= ex.items.length) onDone({ correct: score, total: ex.items.length, skill: 'speaking', metric: 'spoken', metricN: ex.items.length });
    else setI(i + 1);
  };
  return (
    <div className="col" style={{ alignItems: 'center' }}>
      <Prompt ru={it.ru}>{ex.title ?? 'Say it!'}</Prompt>
      <Counter i={i} n={ex.items.length} />
      {it.emoji && <div style={{ fontSize: 72 }}>{it.emoji}</div>}
      <div className="card say-text" style={{ width: '100%' }}>
        {check && (state === 'retry' || state === 'good')
          ? (() => {
            // Map each displayed word to its normalised tokens ("I'm" → "i am") and colour it by whether they were heard.
            let pos = 0;
            return text.split(/\s+/).map((w, k) => {
              const n = normalise(w).split(' ').filter(Boolean).length;
              const hit = n === 0 || check.matched.slice(pos, pos + n).every(Boolean);
              pos += n;
              return <span key={k} style={{ color: hit ? 'var(--mint)' : 'var(--red)', textDecoration: hit ? 'none' : 'underline wavy' }}>{w} </span>;
            });
          })()
          : text}
      </div>
      <div className="row">
        <SpeakBtn text={text} big />
        <button className="icon-btn" onClick={() => void speak(text, { rate: 0.6 })} aria-label="Slowly">🐢</button>
      </div>
      {canRecognise ? (
        <motion.button className="btn" style={{ minHeight: 84, minWidth: 200, fontSize: 24 }} disabled={state === 'listening' || state === 'good' || state === 'self' || state === 'saved'}
          animate={state === 'listening' ? { scale: [1, 1.08, 1] } : {}} transition={{ repeat: Infinity, duration: 0.8 }} onClick={() => void tryRecognise()}>
          {state === 'listening' ? '🎙️ Listening…' : '🎤 Tap and speak'}
        </motion.button>
      ) : state === 'recording' ? (
        <button className="btn" style={{ minHeight: 84, minWidth: 200, fontSize: 24 }} onClick={() => void stopRecording()}>⏹ Stop</button>
      ) : (
        <button className="btn" style={{ minHeight: 84, minWidth: 200, fontSize: 24 }} disabled={state === 'saved'} onClick={() => void startRecording()}>🎤 Record</button>
      )}
      {state === 'retry' && (
        <div className="center col" style={{ gap: 6 }}>
          <div style={{ fontWeight: 800 }}>{heard ? `I heard: "${heard}"` : "I didn't hear you."} Try again! 💪</div>
          {check && heard && <div className="small muted">Красные слова не услышаны — скажи их чётче · Say the red words clearly</div>}
          {tries >= 2 && <button className="btn ghost small" onClick={() => setState('self')}>Skip for now →</button>}
        </div>
      )}
      {(state === 'good' || state === 'saved' || state === 'self') && <Feedback ok={state !== 'self'} text={state === 'saved' ? 'Saved for your parent to listen 🎧' : state === 'self' ? "Let's practise it again later 💪" : heard && `"${heard}"`} onNext={next} />}
    </div>
  );
}

// 9. Draw it.
const COLORS = ['#2b2140', '#ff4d4d', '#ff8c1a', '#ffd23f', '#2ec4b6', '#3fa7ff', '#7c5cff', '#ff5fa2', '#8b5a2b', '#ffffff'];
export function Draw({ ex, onDone, name, lessonId }: ExProps<Of<'draw'>>) {
  const userId = useGame((g) => g.userId);
  const ref = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(8);
  const [saved, setSaved] = useState(false);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const prompt = subName(ex.prompt, name);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    const t = setTimeout(() => void speak(prompt), 300);
    return () => clearTimeout(t);
  }, [prompt]);
  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * ref.current!.width, y: ((e.clientY - r.top) / r.height) * ref.current!.height };
  };
  const draw = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext('2d')!;
    const p = pos(e);
    ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(last.current!.x, last.current!.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  };
  const clear = () => { const c = ref.current!; const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); };
  const finish = () => {
    ref.current!.toBlob((b) => { if (b) void submitWork(userId, { kind: 'draw', lessonId, prompt, blob: b }); }, 'image/png');
    sfx.win(); setSaved(true);
  };
  return (
    <div className="col">
      <Prompt ru={ex.ru}>{ex.emoji ?? '🎨'} Draw it!</Prompt>
      <div className="card tint-sun row" data-no-tr="recall" style={{ fontWeight: 800, fontSize: 20 }}>
        <div className="grow">{prompt}</div><SpeakBtn text={prompt} />
      </div>
      <div className="canvas-wrap">
        <canvas ref={ref} width={900} height={600} style={{ width: '100%', display: 'block', touchAction: 'none' }}
          onPointerDown={(e) => { drawing.current = true; last.current = pos(e); (e.target as HTMLElement).setPointerCapture(e.pointerId); draw(e); }}
          onPointerMove={draw} onPointerUp={() => { drawing.current = false; }} onPointerLeave={() => { drawing.current = false; }} />
      </div>
      <div className="row wrap" style={{ justifyContent: 'center', gap: 8 }}>
        {COLORS.map((c) => (
          <button key={c} aria-label={c} onClick={() => setColor(c)} style={{ width: 38, height: 38, borderRadius: '50%', background: c, border: color === c ? '4px solid var(--violet)' : '2px solid var(--line)' }} />
        ))}
        {[4, 8, 16, 28].map((s) => <button key={s} className="chip" style={{ borderColor: size === s ? 'var(--violet)' : undefined }} onClick={() => setSize(s)}>●{s}</button>)}
        <button className="chip" onClick={() => setColor('#ffffff')}>🧽 Eraser</button>
        <button className="chip" onClick={clear}>🗑️ Clear</button>
      </div>
      <button className="btn mint" onClick={finish} disabled={saved}>✅ I finished my picture!</button>
      {saved && <Feedback ok text="Your picture goes to your gallery for Mum or Dad to see 🖼️" onNext={() => onDone({ correct: 1, total: 1, skill: 'reading', metric: 'draw' })} />}
    </div>
  );
}

// 12. Write it.
export function Write({ ex, onDone, name, lessonId }: ExProps<Of<'write'>>) {
  const userId = useGame((g) => g.userId);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const count = text.trim() ? text.trim().split(/\s+/).length : 0;
  const prompt = subName(ex.prompt, name);
  const add = (s: string) => setText((t) => (t && !/\s$/.test(t) ? `${t} ` : t) + subName(s, name) + ' ');
  const send = () => { void submitWork(userId, { kind: 'text', lessonId, prompt, text }); sfx.win(); setSent(true); };
  return (
    <div className="col">
      <Prompt ru={ex.ru}>✍️ Write!</Prompt>
      <div className="card tint-violet row" style={{ fontWeight: 800, fontSize: 20 }}><div className="grow">{prompt}</div><SpeakBtn text={prompt} /></div>
      <div className="row wrap" style={{ gap: 8 }}>
        {ex.starters.map((s) => <button key={s} className="chip" onClick={() => add(s)}>➕ {subName(s, name)}</button>)}
      </div>
      <textarea className="field" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write here…" spellCheck autoCapitalize="sentences" />
      <div className="bar"><span style={{ width: `${Math.min(100, (count / ex.minWords) * 100)}%` }} /></div>
      <div className="muted small center">{count} / {ex.minWords} words</div>
      <button className="btn mint" disabled={count < ex.minWords || sent} onClick={send}>📨 Send to my diary</button>
      {sent && <Feedback ok text="Great writing! Your parent will read it 💌" onNext={() => onDone({ correct: 1, total: 1, skill: 'writing' })} />}
    </div>
  );
}

// 13. Watch & quiz.
export function Watch({ ex, onDone, name }: ExProps<Of<'watch'>>) {
  const [opened, setOpened] = useState(false);
  const [q, setQ] = useState(false);
  if (q) return <Questions qs={ex.questions} name={name} onDone={(c) => onDone({ correct: c, total: ex.questions.length, skill: 'listening' })} />;
  return (
    <div className="col" style={{ alignItems: 'center' }}>
      <Prompt ru="Посмотри видео, потом вернись и ответь на вопросы">📺 Watch time!</Prompt>
      <div className="card tint-mint center col" style={{ width: '100%' }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{subName(ex.videoTitle, name)}</div>
        <div className="muted small">{ex.source}</div>
        <a className="btn violet" href={ex.url} target="_blank" rel="noreferrer" onClick={() => setOpened(true)}>▶️ Open the video</a>
      </div>
      <button className="btn" disabled={!opened} onClick={() => setQ(true)}>I watched it! →</button>
    </div>
  );
}

// 14. Idol Quiz Show — timed speed round.
export function Quiz({ ex, onDone }: ExProps<Of<'quiz'>>) {
  const [left, setLeft] = useState(ex.seconds);
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [asked, setAsked] = useState(0);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const results = useRef<{ id: string; correct: boolean }[]>([]);
  const makeQ = () => {
    const id = ex.words[Math.floor(Math.random() * ex.words.length)];
    const others = sample(ex.words.filter((x) => x !== id && word(x).en !== word(id).en && word(x).emoji !== word(id).emoji), 3);
    const mode = Math.random() < 0.5 ? 'pic' : 'text';
    return { id, mode, options: shuffle([id, ...others]) };
  };
  const [q, setQ] = useState(makeQ);
  const finished = useRef(false);
  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [started]);
  useEffect(() => {
    if (started && left <= 0 && !finished.current) {
      finished.current = true;
      sfx.win();
      onDone({ correct: score, total: Math.max(asked, 8), skill: 'reading', words: results.current });
    }
  }, [left, started, score, asked, onDone]);
  const answer = (id: string) => {
    const ok = id === q.id;
    results.current.push({ id: q.id, correct: ok });
    setAsked((a) => a + 1);
    if (ok) { sfx.coin(); setScore((s) => s + 1); } else sfx.wrong();
    setFlash(ok ? 'good' : 'bad');
    setTimeout(() => { setFlash(null); setQ(makeQ()); }, 350);
  };
  if (!started) {
    return (
      <div className="col center" style={{ alignItems: 'center' }}>
        <div style={{ fontSize: 80 }}>⏱️</div>
        <h2 className="title-xl">Idol Quiz Show!</h2>
        <div className="muted">Answer as many as you can in {ex.seconds} seconds! · Отвечай как можно быстрее!</div>
        <button className="btn sun" onClick={() => setStarted(true)}>Start!</button>
      </div>
    );
  }
  const w = word(q.id);
  return (
    <div className="col" data-no-tr="recall">
      <div className="row"><div className="chip">⏱️ {left}s</div><div className="grow" /><div className="chip">⭐ {score}</div></div>
      <div className="bar"><span style={{ width: `${(left / ex.seconds) * 100}%` }} /></div>
      <motion.div key={asked} className={`card center ${flash === 'good' ? 'tint-mint' : flash === 'bad' ? 'tint-pink' : ''}`} initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ minHeight: 140, display: 'grid', placeItems: 'center' }}>
        {q.mode === 'pic' ? <WordPic w={w} size={90} /> : <div className="say-text">{w.en}</div>}
      </motion.div>
      <div className="grid grid-2">
        {q.options.map((id) => (
          <button key={id} className="tile" onClick={() => answer(id)} style={{ minHeight: 76 }}>
            {q.mode === 'pic' ? word(id).en : <WordPic w={word(id)} size={44} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// 15. K-Culture corner.
export function KCulture({ ex, onDone, name }: ExProps<Of<'kculture'>>) {
  const [q, setQ] = useState(false);
  const text = useMemo(() => ex.text.map((t) => subName(t, name)), [ex.text, name]);
  if (q) return <Questions qs={ex.questions} name={name} onDone={(c) => onDone({ correct: c, total: ex.questions.length, skill: 'reading' })} />;
  const sayKo = () => {
    if (typeof speechSynthesis === 'undefined' || !ex.korean) return;
    const u = new SpeechSynthesisUtterance(ex.korean.ko);
    u.lang = 'ko-KR'; u.rate = 0.8;
    const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('ko'));
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  };
  return (
    <div className="col">
      <Prompt ru="Уголок корейской культуры">🇰🇷 K-Culture</Prompt>
      <div className="card tint-pink" style={{ fontSize: 21, lineHeight: 1.6, fontWeight: 700 }}>
        <div style={{ fontSize: 64, textAlign: 'center' }}>{ex.emoji}</div>
        {text.map((t, k) => <p key={k} style={{ margin: '0 0 10px' }} onClick={() => void speak(t)}>{t}</p>)}
        <div className="row" style={{ justifyContent: 'center' }}><SpeakBtn text={text.join(' ')} big /></div>
      </div>
      {ex.korean && (
        <motion.div className="card tint-violet center" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <div className="muted small">Bonus Korean word · Бонусное корейское слово</div>
          <div style={{ fontSize: 44, fontWeight: 800 }}>{ex.korean.ko}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{ex.korean.roman} = {ex.korean.en}</div>
          <button className="btn ghost small" onClick={sayKo}>🔊 Listen in Korean</button>
        </motion.div>
      )}
      <button className="btn" onClick={() => setQ(true)}>Quiz time! →</button>
    </div>
  );
}
