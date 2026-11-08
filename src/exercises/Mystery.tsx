import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Exercise, MysteryStep } from '../content/schema';
import { WORDS } from '../content';
import { speak } from '../lib/tts';
import { sfx } from '../lib/sfx';
import { subName } from '../lib/util';
import { fmtNum, isRight } from '../lib/maths';
import { buildKey, type KeyCell } from '../lib/mystery';
import { Feedback, Prompt, type ExProps } from './common';
import { FigureView } from './figures';
import { NumPad, Solution, Terms } from './Maths';

type Of<T extends Exercise['type']> = Extract<Exercise, { type: T }>;
type Cipher = Extract<MysteryStep, { kind: 'cipher' }>;
type Clue = Extract<MysteryStep, { kind: 'clue' }>;
type Problem = { q: string; answer: number; unit?: string; options?: number[]; solution: string[]; terms?: string[]; figure?: Clue['figure'] };

// Mystery case from the old journal of Pine Hollow: intro → cipher / clue steps → "case closed".
// Maths answers are scored as `maths`, the "what does the secret word mean?" questions as `reading`.
export function Mystery({ ex, onDone, name, lessonId }: ExProps<Of<'mystery'>>) {
  const [phase, setPhase] = useState<'intro' | number | 'reveal'>('intro');
  const maths = useRef({ c: 0, t: 0 });
  const reading = useRef({ c: 0, t: 0 });
  const words = useRef<{ id: string; correct: boolean }[]>([]);

  const nextStep = (i: number) => { window.scrollTo({ top: 0 }); setPhase(i + 1 < ex.steps.length ? i + 1 : 'reveal'); };
  const finish = () => onDone({
    correct: maths.current.c, total: maths.current.t, skill: 'maths',
    also: reading.current.t ? [{ skill: 'reading', correct: reading.current.c, total: reading.current.t }] : undefined,
    words: words.current.length ? words.current : undefined,
  });

  if (phase === 'intro') {
    return (
      <div className="col">
        <Prompt ru="Новое дело из дневника">{ex.title ?? 'A new mystery!'}</Prompt>
        <JournalPage emoji={ex.intro.emoji} stamp="CASE FILE">
          <p className="journal-text">{subName(ex.intro.en, name)}</p>
          {ex.intro.ru && <p className="muted small" style={{ margin: 0 }}>{subName(ex.intro.ru, name)}</p>}
          <button className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => void speak(subName(ex.intro.en, name))}>🔊 Listen</button>
        </JournalPage>
        <StepTrail steps={ex.steps} at={-1} />
        <button className="btn violet" style={{ alignSelf: 'center' }} onClick={() => { sfx.tap(); setPhase(0); }}>🔦 Open the case</button>
      </div>
    );
  }

  if (phase === 'reveal') {
    return (
      <div className="col">
        <Prompt ru="Дело раскрыто!">Case closed!</Prompt>
        <JournalPage emoji={ex.reveal.emoji ?? '🗝️'} stamp="SOLVED">
          <p className="journal-text">{subName(ex.reveal.en, name)}</p>
          {ex.reveal.ru && <p className="muted small" style={{ margin: 0 }}>{subName(ex.reveal.ru, name)}</p>}
          <button className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => void speak(subName(ex.reveal.en, name))}>🔊 Listen</button>
        </JournalPage>
        <div className="center small muted" style={{ fontWeight: 800 }}>
          🧮 Maths {maths.current.c}/{maths.current.t}{reading.current.t > 0 && ` · 📖 Reading ${reading.current.c}/${reading.current.t}`}
        </div>
        <RevealSound />
        <button className="btn mint" style={{ alignSelf: 'center' }} onClick={finish}>Continue →</button>
      </div>
    );
  }

  const step = ex.steps[phase];
  return (
    <div className="col">
      <StepTrail steps={ex.steps} at={phase} />
      {step.kind === 'cipher' ? (
        <CipherStep key={phase} step={step} name={name} seed={`${lessonId}-${phase}`}
          onFinish={(right, meaningOk) => {
            maths.current.c += right; maths.current.t += step.problems.length;
            reading.current.c += meaningOk ? 1 : 0; reading.current.t += 1;
            const id = step.word.toLowerCase();
            if (WORDS.has(id)) words.current.push({ id, correct: meaningOk });
            nextStep(phase);
          }} />
      ) : (
        <ClueStep key={phase} step={step} name={name}
          onFinish={(ok) => { maths.current.c += ok ? 1 : 0; maths.current.t += 1; nextStep(phase); }} />
      )}
    </div>
  );
}

function RevealSound() {
  useEffect(() => { sfx.win(); }, []);
  return null;
}

function JournalPage({ emoji, stamp, children }: { emoji: string; stamp?: string; children: React.ReactNode }) {
  return (
    <motion.div className="journal col" initial={{ opacity: 0, rotate: -1.5, y: 8 }} animate={{ opacity: 1, rotate: 0, y: 0 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontSize: 44 }}>{emoji}</span>
        {stamp && <span className="journal-stamp">{stamp}</span>}
      </div>
      {children}
    </motion.div>
  );
}

/** Row of step marks: 🔐 cipher, 🔎 clue; done steps get a tick. */
function StepTrail({ steps, at }: { steps: MysteryStep[]; at: number }) {
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 6 }} aria-label="Case steps">
      {steps.map((s, i) => (
        <span key={i} className={`trail-dot ${i < at ? 'done' : i === at ? 'now' : ''}`}>
          {i < at ? '✓' : s.kind === 'cipher' ? '🔐' : '🔎'}
        </span>
      ))}
    </div>
  );
}

// ---------- Cipher: solve → find the answer in the code table → letter opens → read the word ----------

function CipherStep({ step, name, seed, onFinish }: { step: Cipher; name: string; seed: string; onFinish: (right: number, meaningOk: boolean) => void }) {
  const key = useMemo(() => buildKey(step.word, step.problems.map((p) => p.answer), step.decoys, seed), [step, seed]);
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<'solve' | 'decode' | 'meaning'>('solve');
  const [opened, setOpened] = useState<boolean[]>(() => step.problems.map(() => false));
  const [right, setRight] = useState(0);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const p = step.problems[i];

  const tapCell = (c: KeyCell) => {
    if (mode !== 'decode') return;
    if (c.n !== p.answer) { sfx.wrong(); setWrongCell(c.n); setTimeout(() => setWrongCell(null), 400); return; }
    sfx.correct();
    setOpened((o) => o.map((x, k) => (k === i ? true : x)));
    setTimeout(() => {
      if (i + 1 < step.problems.length) { setI(i + 1); setMode('solve'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else { setMode('meaning'); void speak(step.word.toLowerCase()); }
    }, 700);
  };

  return (
    <>
      <Prompt ru="Реши задачи — каждый ответ открывает букву шифра">Crack the code!</Prompt>
      <Lock word={step.word} opened={opened} />
      <CodeTable cells={key} active={mode === 'decode'} target={mode === 'decode' ? p.answer : null} wrong={wrongCell}
        opened={new Set(step.problems.filter((_, k) => opened[k]).map((x) => x.answer))} onTap={tapCell} />

      {mode === 'solve' && (
        <ProblemCard key={i} p={p} name={name} counter={`Letter ${i + 1} of ${step.word.length}`}
          okText="Now find the answer in the code table!"
          onNext={(ok) => { if (ok) setRight((r) => r + 1); setMode('decode'); }} />
      )}
      {mode === 'decode' && (
        <motion.div className="card tint-sun center" initial={{ scale: 0.95 }} animate={{ scale: 1 }} style={{ fontWeight: 800 }}>
          👆 Find <b style={{ fontSize: 22 }}>{fmtNum(p.answer)}</b> in the code table and tap it
          <div className="muted small">Найди число {fmtNum(p.answer)} в таблице шифра и нажми</div>
        </motion.div>
      )}
      {mode === 'meaning' && (
        <div className="card col" style={{ gap: 10 }} data-no-tr="recall">
          <div className="row" style={{ justifyContent: 'center' }}>
            <span className="title-l" style={{ letterSpacing: 3 }}>{step.word}</span>
            <button className="icon-btn" aria-label="Listen" onClick={() => void speak(step.word.toLowerCase())}>🔊</button>
          </div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{subName(step.meaning.q, name)}</div>
          <div className="grid grid-2">
            {step.meaning.options.map((o, k) => {
              const cls = picked === null ? '' : k === step.meaning.answer ? 'good' : k === picked ? 'bad' : 'dim';
              return (
                <button key={k} className={`tile ${cls}`} style={{ minHeight: 64, fontWeight: 800 }}
                  onClick={() => { if (picked !== null) return; setPicked(k); if (k === step.meaning.answer) sfx.correct(); else sfx.wrong(); }}>
                  {o}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <Feedback ok={picked === step.meaning.answer} onNext={() => onFinish(right, picked === step.meaning.answer)}
              text={picked === step.meaning.answer ? undefined : `Answer: ${step.meaning.options[step.meaning.answer]}`} />
          )}
        </div>
      )}
      {picked !== null && <div style={{ height: 110 }} />}
    </>
  );
}

function Lock({ word, opened }: { word: string; opened: boolean[] }) {
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 6, flexWrap: 'wrap' }} aria-label="Secret word" data-no-tr="recall">
      {word.split('').map((c, k) => (
        <motion.span key={k} className={`lock-cell ${opened[k] ? 'open' : ''}`}
          animate={opened[k] ? { rotateY: [90, 0], scale: [1.2, 1] } : {}} transition={{ duration: 0.4 }}>
          {opened[k] ? c : '?'}
        </motion.span>
      ))}
    </div>
  );
}

function CodeTable({ cells, active, target, wrong, opened, onTap }: {
  cells: KeyCell[]; active: boolean; target: number | null; wrong: number | null; opened: Set<number>; onTap: (c: KeyCell) => void;
}) {
  return (
    <div className="journal" style={{ padding: 10 }}>
      <div className="tiny" style={{ fontWeight: 800, textAlign: 'center', marginBottom: 6, letterSpacing: 1 }}>🗝️ CODE TABLE · ТАБЛИЦА ШИФРА</div>
      <div className="code-grid">
        {cells.map((c) => (
          <button key={c.n} className={`code-cell ${opened.has(c.n) ? 'used' : ''} ${wrong === c.n ? 'bad' : ''} ${active ? 'live' : ''}`}
            onClick={() => onTap(c)} disabled={!active} aria-label={`${c.label} — ${c.letter}`}
            data-hint={target === c.n ? 'y' : undefined}>
            <span className="code-n">{c.label}</span>
            <span className="code-l">{c.letter}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Clue: read an English note, solve a problem about it ----------

function ClueStep({ step, name, onFinish }: { step: Clue; name: string; onFinish: (ok: boolean) => void }) {
  const text = step.text.map((t) => subName(t, name));
  return (
    <>
      <Prompt ru="Прочитай улику и реши задачу">Read the clue!</Prompt>
      <JournalPage emoji={step.emoji ?? '📜'} stamp="CLUE">
        {text.map((t, k) => <p key={k} className="journal-text">{t}</p>)}
        {step.ru && <details className="small muted"><summary>Перевод</summary>{subName(step.ru, name)}</details>}
        <button className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => void speak(text.join(' '))}>🔊 Listen</button>
      </JournalPage>
      <ProblemCard p={step} name={name} onNext={onFinish} />
    </>
  );
}

// ---------- One maths problem: number pad (or choices), hint after the first miss, solution after the second ----------

function ProblemCard({ p, name, counter, okText, onNext }: { p: Problem; name: string; counter?: string; okText?: string; onNext: (ok: boolean) => void }) {
  const [input, setInput] = useState('');
  const [tries, setTries] = useState(0);
  const [result, setResult] = useState<'good' | 'bad' | null>(null);
  const [shake, setShake] = useState(0);

  const check = useCallback((raw: string) => {
    if (result || !raw.trim()) return;
    if (isRight(raw, p.answer)) { sfx.correct(); setResult('good'); return; }
    sfx.wrong(); setShake((x) => x + 1);
    if (tries === 0 && !p.options) { setTries(1); setInput(''); } else setResult('bad');
  }, [result, p.answer, p.options, tries]);

  useEffect(() => {
    if (p.options || result) return;
    const h = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) setInput((s) => (s.length < 9 ? s + e.key : s));
      else if (e.key === ',' || e.key === '.') setInput((s) => (s.includes(',') ? s : s + ','));
      else if (e.key === 'Backspace') setInput((s) => s.slice(0, -1));
      else if (e.key === 'Enter') { e.preventDefault(); check(input); } // no default: the same Enter must not also press the Continue button that appears
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [p.options, result, input, check]);

  const answerText = `${fmtNum(p.answer)}${p.unit ? ` ${p.unit}` : ''}`;
  return (
    <div className="col" style={{ paddingBottom: result ? 120 : 0 }}>
      <div className="card col" style={{ gap: 10 }}>
        {counter && <div className="tiny muted" style={{ fontWeight: 800 }}>{counter}</div>}
        <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.45, whiteSpace: 'pre-line' }}>{subName(p.q, name)}</div>
        {p.terms && p.terms.length > 0 && <Terms ids={p.terms} />}
        {p.figure && <div className="center"><FigureView f={p.figure} /></div>}
      </div>
      {tries > 0 && !result && (
        <motion.div className="card tint-sun small" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ fontWeight: 700 }}>
          💡 Подсказка: {p.solution[0]}
        </motion.div>
      )}
      {p.options ? (
        <div className="grid grid-2">
          {p.options.map((o, k) => {
            const cls = !result ? '' : o === p.answer ? 'good' : Number(input) === o ? 'bad' : 'dim';
            return (
              <button key={k} className={`tile ${cls}`} style={{ minHeight: 72, fontSize: 24, fontWeight: 800 }}
                onClick={() => { if (result) return; setInput(String(o)); check(String(o)); }}>
                {fmtNum(o)}{p.unit ? ` ${p.unit}` : ''}
              </button>
            );
          })}
        </div>
      ) : (
        <NumPad value={input} unit={p.unit} shake={shake} locked={!!result} onChange={setInput} onCheck={() => check(input)} />
      )}
      {result === 'bad' && <Solution steps={p.solution} answer={answerText} />}
      {result && (
        <Feedback ok={result === 'good'} onNext={() => onNext(result === 'good' && tries === 0)}
          text={result === 'good' ? (tries > 0 ? `Со второй попытки — отлично! ${okText ?? ''}` : okText) : `Ответ: ${answerText}`} />
      )}
    </div>
  );
}
