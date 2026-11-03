import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { Word } from '../content/schema';
import { WORDS } from '../content';
import { speak } from '../lib/tts';
import { numberFor } from '../lib/util';
import type { Skill } from '../game/store';
import type { QuestMetric } from '../game/rules';

export type ExResult = {
  correct: number; total: number; skill: Skill;
  words?: { id: string; correct: boolean }[];
  metric?: QuestMetric; metricN?: number;
};
export type ExProps<T> = { ex: T; onDone: (r: ExResult) => void; name: string; lessonId: string };

export const word = (id: string): Word => WORDS.get(id) ?? { id, en: id.replace(/-/g, ' '), ru: '', emoji: '❓', level: 'extra' };

export function WordPic({ w, size = 64 }: { w: Word; size?: number }) {
  const n = numberFor(w.en);
  if (n) return <span style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: size * 0.8, color: 'var(--violet)', lineHeight: 1 }}>{n}</span>;
  return <span style={{ fontSize: size, lineHeight: 1 }}>{w.emoji}</span>;
}

export function SpeakBtn({ text, big = false, rate }: { text: string; big?: boolean; rate?: number }) {
  return (
    <button className={big ? 'btn violet' : 'icon-btn'} onClick={() => void speak(text, { rate })} aria-label={`Listen: ${text}`}>
      🔊{big && ' Listen'}
    </button>
  );
}

export function Prompt({ children, ru }: { children: ReactNode; ru?: string }) {
  return (
    <div className="center col" style={{ gap: 4, marginBottom: 12 }}>
      <h2 className="title-l">{children}</h2>
      {ru && <div className="muted small">{ru}</div>}
    </div>
  );
}

/** Bottom bar after an answer. */
export function Feedback({ ok, text, onNext, nextLabel = 'Continue' }: { ok: boolean; text?: ReactNode; onNext: () => void; nextLabel?: string }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Enter') onNext(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onNext]);
  return (
    <motion.div className={`feedback ${ok ? 'good' : 'bad'}`} initial={{ y: 120 }} animate={{ y: 0 }}>
      <div className="inner">
        <div style={{ fontSize: 36 }}>{ok ? '🎉' : '💪'}</div>
        <div className="grow">
          <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: 22 }}>{ok ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : 'Almost! Keep going!'}</div>
          {text && <div style={{ fontWeight: 700 }}>{text}</div>}
        </div>
        <button className={`btn ${ok ? 'mint' : ''}`} onClick={onNext} autoFocus>{nextLabel}</button>
      </div>
    </motion.div>
  );
}
const PRAISE = ['Amazing!', 'Daebak! Great!', 'Super star!', 'Perfect!', 'Brilliant!', 'Well done!', 'Fantastic!', 'You rock!'];

export function Counter({ i, n }: { i: number; n: number }) {
  return <div className="muted small center" style={{ fontWeight: 800 }}>{i + 1} / {n}</div>;
}

export function useItemStepper<T>(items: T[]) {
  const [i, setI] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  return {
    i, item: items[i], last: i >= items.length - 1, results,
    record: (ok: boolean) => setResults((r) => { const c = [...r]; c[i] = ok; return c; }),
    next: () => setI((x) => x + 1),
  };
}
