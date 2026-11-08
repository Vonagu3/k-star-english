import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Exercise } from '../content/schema';
import { speak } from '../lib/tts';
import { sfx } from '../lib/sfx';
import { subName } from '../lib/util';
import { fmtNum, isRight } from '../lib/maths';
import { Counter, Feedback, Prompt, word, type ExProps } from './common';
import { FigureView } from './figures';

type Of<T extends Exercise['type']> = Extract<Exercise, { type: T }>;

// Maths problem: Russian text + English term chips, a figure, a number pad (or choices).
// Number pad: first wrong try → hint (the first solution step) and one more go; second wrong → full solution.
export function Solve({ ex, onDone, name }: ExProps<Of<'solve'>>) {
  const [i, setI] = useState(0);
  const [input, setInput] = useState('');
  const [tries, setTries] = useState(0);
  const [result, setResult] = useState<'good' | 'bad' | null>(null);
  const [shake, setShake] = useState(0);
  const [score, setScore] = useState(0);
  const it = ex.items[i];

  const check = useCallback((raw: string) => {
    if (result || !raw.trim()) return;
    if (isRight(raw, it.answer)) {
      sfx.correct();
      if (tries === 0) setScore((s) => s + 1);
      setResult('good');
    } else {
      sfx.wrong();
      setShake((x) => x + 1);
      // Choices get one try: a second go with a hint would just give the answer away.
      if (tries === 0 && !it.options) { setTries(1); setInput(''); } else setResult('bad');
    }
  }, [result, it.answer, it.options, tries]);

  const next = () => {
    if (i + 1 >= ex.items.length) { onDone({ correct: score, total: ex.items.length, skill: 'maths' }); return; }
    setI(i + 1); setInput(''); setTries(0); setResult(null);
  };

  useEffect(() => {
    if (it.options || result) return;
    const h = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) setInput((s) => (s.length < 9 ? s + e.key : s));
      else if (e.key === ',' || e.key === '.') setInput((s) => (s.includes(',') ? s : s + ','));
      else if (e.key === 'Backspace') setInput((s) => s.slice(0, -1));
      else if (e.key === 'Enter') { e.preventDefault(); check(input); } // no default: the same Enter must not also press the Continue button that appears
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [it.options, result, input, check]);

  const answerText = `${fmtNum(it.answer)}${it.unit ? ` ${it.unit}` : ''}`;
  return (
    <div className="col" style={{ paddingBottom: result ? 120 : 0 }}>
      <Prompt ru="Реши задачу">{ex.title ?? 'Maths time!'}</Prompt>
      <Counter i={i} n={ex.items.length} />
      <div className="card col" style={{ gap: 10 }}>
        <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.45, whiteSpace: 'pre-line' }}>{subName(it.q, name)}</div>
        {it.terms && it.terms.length > 0 && <Terms ids={it.terms} />}
        {it.figure && <div className="center"><FigureView f={it.figure} /></div>}
      </div>

      {tries > 0 && !result && (
        <motion.div className="card tint-sun small" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ fontWeight: 700 }}>
          💡 Подсказка: {it.solution[0]}
        </motion.div>
      )}

      {it.options ? (
        <div className="grid grid-2">
          {it.options.map((o, k) => {
            const picked = result && Number(input) === o;
            const cls = !result ? '' : o === it.answer ? 'good' : picked ? 'bad' : 'dim';
            return (
              <button key={k} className={`tile ${cls}`} style={{ minHeight: 80, fontSize: 26, fontWeight: 800 }}
                onClick={() => { if (result) return; setInput(String(o)); check(String(o)); }}>
                {fmtNum(o)}{it.unit ? ` ${it.unit}` : ''}
              </button>
            );
          })}
        </div>
      ) : (
        <NumPad value={input} unit={it.unit} shake={shake} locked={!!result} onChange={setInput} onCheck={() => check(input)} />
      )}

      {result === 'bad' && <Solution steps={it.solution} answer={answerText} />}
      {result && (
        <Feedback ok={result === 'good'} onNext={next}
          text={result === 'good' ? (tries > 0 ? 'Со второй попытки — отлично!' : undefined) : `Ответ: ${answerText}`} />
      )}
    </div>
  );
}

export function Terms({ ids }: { ids: string[] }) {
  return (
    <div className="row wrap" style={{ gap: 6 }} data-no-tr="recall">
      {ids.map((id) => {
        const w = word(id);
        return (
          <button key={id} className="chip" onClick={() => void speak(w.en)} aria-label={`Listen: ${w.en}`} style={{ background: 'var(--violet-soft)' }}>
            🔊 <span>{w.en}</span><span className="muted" style={{ fontWeight: 700 }}>— {w.ru}</span>
          </button>
        );
      })}
    </div>
  );
}

export function NumPad({ value, unit, shake, locked, onChange, onCheck }: {
  value: string; unit?: string; shake: number; locked: boolean; onChange: (v: string) => void; onCheck: () => void;
}) {
  const press = (k: string) => {
    if (locked) return;
    sfx.tap();
    if (k === '⌫') onChange(value.slice(0, -1));
    else if (k === ',') { if (!value.includes(',')) onChange((value || '0') + ','); }
    else if (value.length < 9) onChange(value + k);
  };
  return (
    <div className="col" style={{ alignItems: 'center', gap: 10 }}>
      <motion.div key={shake} animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.35 }}
        className="row" style={{ justifyContent: 'center', gap: 8, minHeight: 64, minWidth: 220, padding: '8px 18px', borderRadius: 18,
          border: '3px solid var(--violet)', background: '#fff', fontFamily: 'var(--font-title)', fontSize: 34, fontWeight: 800 }}
        aria-live="polite">
        <span style={{ color: value ? 'var(--ink)' : 'var(--ink-2)' }}>{value || '?'}</span>
        {unit && <span className="muted" style={{ fontSize: 24 }}>{unit}</span>}
      </motion.div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 72px)', gap: 10 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'].map((k) => (
          <button key={k} className="tile" style={{ minHeight: 60, padding: 0, fontSize: 26, fontWeight: 800 }} onClick={() => press(k)}
            aria-label={k === '⌫' ? 'Стереть' : k}>{k}</button>
        ))}
      </div>
      <button className="btn mint" disabled={locked || !value} style={{ opacity: !value ? 0.5 : 1 }} onClick={onCheck}>Check ✓</button>
    </div>
  );
}

export function Solution({ steps, answer }: { steps: string[]; answer: string }) {
  return (
    <div className="card tint-violet col" style={{ gap: 6 }}>
      <strong>📝 Решение</strong>
      {steps.map((s, k) => (
        <motion.div key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + k * 0.45 }}
          style={{ fontWeight: 700 }}>{k + 1}) {s}</motion.div>
      ))}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + steps.length * 0.45 }}
        style={{ fontWeight: 800, color: 'var(--violet)' }}>Ответ: {answer}</motion.div>
    </div>
  );
}
