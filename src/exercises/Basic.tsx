import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Exercise } from '../content/schema';
import { speak } from '../lib/tts';
import { sfx } from '../lib/sfx';
import { shuffle, subName, tidy } from '../lib/util';
import { Counter, Feedback, Prompt, SpeakBtn, WordPic, word, type ExProps } from './common';

type Of<T extends Exercise['type']> = Extract<Exercise, { type: T }>;

// 1. Flashcards — learn new words with a British voice.
export function Flashcards({ ex, onDone }: ExProps<Of<'flashcards'>>) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const w = word(ex.words[i]);
  useEffect(() => { setFlip(false); void speak(w.en); }, [w.en]);
  const next = () => {
    sfx.tap();
    if (i + 1 >= ex.words.length) onDone({ correct: ex.words.length, total: ex.words.length, skill: 'listening', words: ex.words.map((id) => ({ id, correct: true })) });
    else setI(i + 1);
  };
  return (
    <div className="col" style={{ alignItems: 'center' }}>
      <Prompt ru="Слушай и повторяй вслух">New words!</Prompt>
      <Counter i={i} n={ex.words.length} />
      <motion.button key={w.id} className="card" onClick={() => { setFlip(!flip); void speak(w.en); }}
        initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }}
        style={{ width: 'min(100%, 380px)', minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <WordPic w={w} size={110} />
        <div className="say-text">{w.en}</div>
        <div className="muted" style={{ minHeight: 24, fontWeight: 700 }}>{flip ? w.ru : 'tap to see in Russian'}</div>
      </motion.button>
      <div className="row">
        <SpeakBtn text={w.en} />
        <button className="icon-btn" onClick={() => void speak(w.en, { rate: 0.6 })} aria-label="Slowly">🐢</button>
        <button className="btn" onClick={next}>{i + 1 >= ex.words.length ? 'Got it!' : 'Next'}</button>
      </div>
    </div>
  );
}

// 2. Listen & tap.
export function Listen({ ex, onDone, name }: ExProps<Of<'listen'>>) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const it = ex.items[i];
  const say = subName(it.say, name);
  useEffect(() => { setPick(null); const t = setTimeout(() => void speak(say), 300); return () => clearTimeout(t); }, [say]);
  const ok = pick === it.answer;
  const choose = (k: number) => {
    if (pick !== null) return;
    setPick(k);
    if (k === it.answer) { sfx.correct(); setScore((s) => s + 1); } else sfx.wrong();
  };
  const next = () => {
    if (i + 1 >= ex.items.length) onDone({ correct: score, total: ex.items.length, skill: 'listening' });
    else setI(i + 1);
  };
  return (
    <div className="col">
      <Prompt ru="Послушай и выбери">{ex.title ?? 'Listen and tap!'}</Prompt>
      <Counter i={i} n={ex.items.length} />
      <div className="row" style={{ justifyContent: 'center' }}>
        <SpeakBtn text={say} big />
        <button className="icon-btn" onClick={() => void speak(say, { rate: 0.6 })} aria-label="Slowly">🐢</button>
      </div>
      <div className={`grid ${it.options.length > 2 ? 'grid-2' : 'grid-2'}`} style={{ marginTop: 8 }}>
        {it.options.map((o, k) => (
          <button key={k} className={`tile ${pick === null ? '' : k === it.answer ? 'good' : k === pick ? 'bad' : 'dim'}`} onClick={() => choose(k)} style={{ minHeight: 110 }}>
            {o.emoji && <span className="emo">{o.emoji}</span>}
            {o.text && <span>{subName(o.text, name)}</span>}
          </button>
        ))}
      </div>
      {pick !== null && <Feedback ok={ok} text={ok ? undefined : `"${say}"`} onNext={next} />}
    </div>
  );
}

// 3. Memory pairs.
export function Memory({ ex, onDone }: ExProps<Of<'memory'>>) {
  const cards = useMemo(() => shuffle(ex.words.flatMap((id) => [{ id, side: 'pic' as const }, { id, side: 'text' as const }])), [ex.words]);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [miss, setMiss] = useState(0);
  const tap = (k: number) => {
    if (open.length === 2 || open.includes(k) || done.includes(cards[k].id)) return;
    sfx.tap();
    const c = cards[k];
    if (c.side === 'text') void speak(word(c.id).en);
    const now = [...open, k];
    setOpen(now);
    if (now.length === 2) {
      const [a, b] = now.map((x) => cards[x]);
      if (a.id === b.id) {
        sfx.correct();
        const d = [...done, a.id];
        setTimeout(() => {
          setDone(d); setOpen([]);
          if (d.length === ex.words.length) setTimeout(() => onDone({ correct: Math.max(1, ex.words.length - Math.floor(miss / 3)), total: ex.words.length, skill: 'reading', words: ex.words.map((id) => ({ id, correct: true })) }), 500);
        }, 350);
      } else {
        setMiss((m) => m + 1);
        setTimeout(() => setOpen([]), 900);
      }
    }
  };
  const cols = cards.length > 12 ? 4 : cards.length > 8 ? 4 : 3;
  return (
    <div className="col">
      <Prompt ru="Найди пары: слово и картинка">{ex.title ?? 'Find the pairs!'}</Prompt>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {cards.map((c, k) => {
          const shown = open.includes(k) || done.includes(c.id);
          const w = word(c.id);
          return (
            <motion.button key={k} className={`tile ${done.includes(c.id) ? 'good' : shown ? 'selected' : ''}`} onClick={() => tap(k)}
              animate={{ rotateY: shown ? 0 : 180 }} style={{ aspectRatio: '1', minHeight: 0, fontSize: 'clamp(14px, 3.6vw, 20px)', background: shown ? undefined : 'linear-gradient(135deg, var(--pink-2), var(--violet))' }}>
              {shown ? (c.side === 'pic' ? <WordPic w={w} size={44} /> : <span>{w.en}</span>) : <span style={{ fontSize: 28, transform: 'scaleX(-1)' }}>⭐</span>}
            </motion.button>
          );
        })}
      </div>
      <div className="muted small center">Misses: {miss}</div>
    </div>
  );
}

// 4. Spell it with letter tiles.
export function Spell({ ex, onDone }: ExProps<Of<'spell'>>) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<{ id: string; correct: boolean }[]>([]);
  const w = word(ex.words[i]);
  const target = w.en.toLowerCase();
  const letters = useMemo(() => {
    const ls = target.replace(/[^a-z]/g, '').split('');
    const extra = 'aeioustrnl'.split('').filter((x) => !ls.includes(x)).slice(0, ls.length > 6 ? 1 : 2);
    return shuffle([...ls, ...extra]).map((ch, k) => ({ ch, k }));
  }, [target]);
  const [used, setUsed] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  useEffect(() => { setUsed([]); setChecked(null); void speak(w.en); }, [w.en]);
  const typed = used.map((k) => letters.find((l) => l.k === k)!.ch);
  // Rebuild display with fixed spaces / apostrophes.
  let p = 0;
  const display = target.split('').map((ch) => (/[a-z]/.test(ch) ? typed[p++] ?? '' : ch));
  const need = target.replace(/[^a-z]/g, '').length;
  const check = () => {
    const ok = typed.join('') === target.replace(/[^a-z]/g, '');
    setChecked(ok);
    if (ok) { sfx.correct(); setScore((s) => s + 1); } else sfx.wrong();
    setResults((r) => [...r, { id: w.id, correct: ok }]);
  };
  const next = () => {
    if (i + 1 >= ex.words.length) onDone({ correct: score, total: ex.words.length, skill: 'writing', words: results });
    else setI(i + 1);
  };
  return (
    <div className="col" style={{ alignItems: 'center' }}>
      <Prompt ru="Собери слово из букв">{ex.title ?? 'Spell it!'}</Prompt>
      <Counter i={i} n={ex.words.length} />
      <div className="row"><WordPic w={w} size={80} /><SpeakBtn text={w.en} /></div>
      <div className="row wrap" style={{ justifyContent: 'center', gap: 6, minHeight: 60 }}>
        {display.map((ch, k) => (
          /[a-z]/.test(target[k])
            ? <div key={k} className="tile" style={{ minWidth: 42, minHeight: 52, padding: 4, borderStyle: ch ? 'solid' : 'dashed', borderColor: checked === null ? undefined : checked ? 'var(--mint)' : 'var(--red)' }}>{ch}</div>
            : <div key={k} style={{ width: 14 }}>{ch === ' ' ? '' : ch}</div>
        ))}
      </div>
      <div className="row wrap" style={{ justifyContent: 'center', gap: 8 }}>
        {letters.map((l) => (
          <button key={l.k} className={`tile ${used.includes(l.k) ? 'dim' : ''}`} style={{ minWidth: 52, minHeight: 56 }}
            disabled={used.includes(l.k) || checked !== null} onClick={() => { sfx.tap(); if (typed.length < need) setUsed([...used, l.k]); }}>{l.ch}</button>
        ))}
      </div>
      <div className="row">
        <button className="btn ghost small" disabled={!used.length || checked !== null} onClick={() => setUsed(used.slice(0, -1))}>⌫ Back</button>
        <button className="btn" disabled={typed.length !== need || checked !== null} onClick={check}>Check</button>
      </div>
      {checked !== null && <Feedback ok={checked} text={checked ? undefined : `It's "${w.en}"`} onNext={next} />}
    </div>
  );
}

// 5. Sentence builder.
export function Sentence({ ex, onDone, name }: ExProps<Of<'sentence'>>) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const it = ex.items[i];
  const sentence = subName(it.sentence, name);
  const tiles = useMemo(() => shuffle(sentence.split(/\s+/).map((t, k) => ({ t, k }))), [sentence]);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  useEffect(() => { setPicked([]); setChecked(null); }, [sentence]);
  const built = picked.map((k) => tiles.find((x) => x.k === k)!.t).join(' ');
  const check = () => {
    const ok = tidy(built) === tidy(sentence);
    setChecked(ok);
    if (ok) { sfx.correct(); setScore((s) => s + 1); void speak(sentence); } else sfx.wrong();
  };
  const next = () => {
    if (i + 1 >= ex.items.length) onDone({ correct: score, total: ex.items.length, skill: 'writing' });
    else setI(i + 1);
  };
  return (
    <div className="col">
      <Prompt ru={it.ru ?? 'Составь предложение'}>{ex.title ?? 'Build the sentence!'}</Prompt>
      <Counter i={i} n={ex.items.length} />
      {it.emoji && <div className="center" style={{ fontSize: 64 }}>{it.emoji}</div>}
      <div className="card row wrap" style={{ minHeight: 80, gap: 8, justifyContent: 'center' }}>
        {picked.length === 0 && <span className="muted">Tap the words…</span>}
        {picked.map((k) => (
          <button key={k} className="tile" style={{ minHeight: 48, fontSize: 18, borderColor: checked === null ? undefined : checked ? 'var(--mint)' : 'var(--red)' }}
            onClick={() => checked === null && setPicked(picked.filter((x) => x !== k))}>{tiles.find((x) => x.k === k)!.t}</button>
        ))}
      </div>
      <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
        {tiles.map((x) => (
          <button key={x.k} className={`tile ${picked.includes(x.k) ? 'dim' : ''}`} style={{ minHeight: 52, fontSize: 18 }}
            disabled={picked.includes(x.k) || checked !== null} onClick={() => { sfx.tap(); setPicked([...picked, x.k]); }}>{x.t}</button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn" disabled={picked.length !== tiles.length || checked !== null} onClick={check}>Check</button>
      </div>
      {checked !== null && <Feedback ok={checked} text={checked ? undefined : sentence} onNext={next} />}
    </div>
  );
}

// 6. Fill the gap.
export function Gap({ ex, onDone, name }: ExProps<Of<'gap'>>) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const it = ex.items[i];
  const text = subName(it.text, name);
  const [before, after] = text.split('___');
  const options = useMemo(() => it.options.map((o, k) => ({ o, k })), [it]);
  useEffect(() => setPick(null), [i]);
  const choose = (k: number) => {
    if (pick !== null) return;
    setPick(k);
    const full = `${before}${it.options[it.answer]}${after}`;
    if (k === it.answer) { sfx.correct(); setScore((s) => s + 1); void speak(full); } else sfx.wrong();
  };
  const next = () => {
    if (i + 1 >= ex.items.length) onDone({ correct: score, total: ex.items.length, skill: 'reading' });
    else setI(i + 1);
  };
  return (
    <div className="col">
      <Prompt ru={it.ru ?? 'Выбери слово для пропуска'}>{ex.title ?? 'Fill the gap!'}</Prompt>
      <Counter i={i} n={ex.items.length} />
      {it.emoji && <div className="center" style={{ fontSize: 64 }}>{it.emoji}</div>}
      <div className="card say-text" style={{ lineHeight: 1.5 }}>
        {before}<span className="blank" style={{ color: pick === null ? 'var(--violet)' : pick === it.answer ? 'var(--mint)' : 'var(--red)' }}>{pick !== null ? it.options[it.answer] : ''}</span>{after}
      </div>
      <div className="grid grid-2">
        {options.map(({ o, k }) => (
          <button key={k} className={`tile ${pick === null ? '' : k === it.answer ? 'good' : k === pick ? 'bad' : 'dim'}`} onClick={() => choose(k)}>{o}</button>
        ))}
      </div>
      {pick !== null && <Feedback ok={pick === it.answer} text={pick === it.answer ? undefined : `${before}${it.options[it.answer]}${after}`} onNext={next} />}
    </div>
  );
}
