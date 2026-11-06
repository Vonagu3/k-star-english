import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { EPISODES, EPISODE_ORDER } from '../content';
import { ExerciseView, TYPE_LABEL } from '../exercises';
import type { ExResult } from '../exercises/common';
import { useGame, type EpisodeResult, type FinishOutcome } from '../game/store';
import { sfx } from '../lib/sfx';
import { stopSpeaking } from '../lib/tts';
import Avatar from '../components/Avatar';
import PhotoCard from '../components/PhotoCard';

export default function Lesson() {
  const { id = '' } = useParams();
  const ref = EPISODES.get(id);
  const nav = useNavigate();
  const name = useGame((g) => g.s.profile?.name ?? '');
  const trMode = useGame((g) => g.s.profile?.settings.hoverTranslate ?? 'practice');
  const finishEpisode = useGame((g) => g.finishEpisode);
  const [k, setK] = useState(0);
  /** Index of an earlier exercise being re-watched (review mode), or null. */
  const [review, setReview] = useState<number | null>(null);
  const acc = useRef<ExResult[]>([]);
  const [outcome, setOutcome] = useState<(FinishOutcome & { correct: number; total: number }) | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const exs = ref?.episode.exercises ?? [];
  const startedAt = useMemo(() => Date.now(), []);

  useEffect(() => () => stopSpeaking(), []);

  const onDone = useCallback((r: ExResult) => {
    acc.current.push(r);
    stopSpeaking();
    if (k + 1 < exs.length) { setK(k + 1); setReview(null); window.scrollTo({ top: 0 }); return; }
    const all = acc.current;
    const result: EpisodeResult = {
      correct: all.reduce((s, x) => s + x.correct, 0),
      total: all.reduce((s, x) => s + x.total, 0),
      skills: {}, words: all.flatMap((x) => x.words ?? []), metrics: {},
    };
    for (const x of all) {
      const sk = result.skills[x.skill] ?? { c: 0, t: 0 };
      result.skills[x.skill] = { c: sk.c + x.correct, t: sk.t + x.total };
      if (x.metric) result.metrics[x.metric] = (result.metrics[x.metric] ?? 0) + (x.metricN ?? 1);
    }
    const out = finishEpisode(id, ref!.episode.kind, result);
    setOutcome({ ...out, correct: result.correct, total: result.total });
    if (out.stars > 0) { sfx.win(); setTimeout(() => confetti({ particleCount: 160, spread: 100, origin: { y: 0.3 } }), 300); }
    if (out.rankUp) setTimeout(() => sfx.levelUp(), 1200);
  }, [k, exs.length, finishEpisode, id, ref]);

  if (!ref) return <div className="page center"><h2>Episode not found</h2><button className="btn" onClick={() => nav('/map')}>Back to map</button></div>;
  if (outcome) return <Results ep={ref.episode} outcome={outcome} minutes={Math.round((Date.now() - startedAt) / 60000)} onRetry={() => { acc.current = []; setOutcome(null); setK(0); }} />;

  const ex = exs[k];
  return (
    <div className="page" style={{ paddingBottom: 140 }}>
      <div className="lesson-top row">
        <button className="icon-btn" aria-label="Exit" onClick={() => setConfirmExit(true)}>✖️</button>
        <div className="row grow" style={{ gap: 4 }} role="tablist" aria-label="Tasks in this episode">
          {exs.map((e, j) => {
            const state = j < k ? 'done' : j === k ? 'current' : 'next';
            const viewing = (review ?? k) === j;
            return (
              <button key={j} role="tab" aria-selected={viewing} disabled={j > k} title={`${j + 1}. ${TYPE_LABEL[e.type].name}`}
                onClick={() => { stopSpeaking(); setReview(j === k ? null : j); window.scrollTo({ top: 0 }); }}
                style={{ flex: 1, height: viewing ? 16 : 12, borderRadius: 999, cursor: j > k ? 'default' : 'pointer', transition: 'height 0.15s',
                  background: state === 'done' ? 'var(--mint)' : state === 'current' ? 'var(--pink)' : '#eadcf0',
                  outline: viewing ? '3px solid var(--violet)' : 'none', outlineOffset: 1 }} />
            );
          })}
        </div>
        <div className="chip">{TYPE_LABEL[exs[review ?? k].type].emoji} {(review ?? k) + 1}/{exs.length}</div>
      </div>
      {review !== null && (
        <div className="card tint-violet row" style={{ padding: 10, marginBottom: 8 }}>
          <div className="grow small" style={{ fontWeight: 800 }}>👀 Review: {TYPE_LABEL[exs[review].type].name} · повторение, баллы не меняются</div>
          <button className="btn small" onClick={() => { stopSpeaking(); setReview(null); }}>Back to task {k + 1} →</button>
        </div>
      )}
      <div className="tiny muted center" style={{ marginTop: -6, marginBottom: 6 }}>
        {trMode !== 'all' && (ref.episode.kind === 'showcase' || ref.episode.kind === 'debut') ? '🔒 Check time: no translation hints' : trMode !== 'off' ? (matchMedia('(hover: none)').matches ? '👆 Hold a word to see it in Russian' : '🖱️ Point at a word to see it in Russian') : ''}
      </div>
      {review !== null && (
        <div key={`review-${review}`} data-no-tr={ref.episode.kind === 'showcase' || ref.episode.kind === 'debut' ? 'check' : undefined}>
          <ExerciseView ex={exs[review]} onDone={() => { stopSpeaking(); setReview(null); window.scrollTo({ top: 0 }); }} name={name} lessonId={`${id}#review`} />
        </div>
      )}
      <div style={{ display: review !== null ? 'none' : undefined }}>
      <AnimatePresence mode="wait">
        <motion.div key={k} data-no-tr={ref.episode.kind === 'showcase' || ref.episode.kind === 'debut' ? 'check' : undefined} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.2 }}>
          <ExerciseView ex={ex} onDone={onDone} name={name} lessonId={id} />
        </motion.div>
      </AnimatePresence>
      </div>
      {confirmExit && (
        <div className="feedback bad"><div className="inner">
          <div className="grow" style={{ fontWeight: 800 }}>Leave the episode? Progress in it will be lost. · Выйти из эпизода?</div>
          <button className="btn ghost small" onClick={() => setConfirmExit(false)}>Stay</button>
          <button className="btn small" onClick={() => nav('/map')}>Leave</button>
        </div></div>
      )}
    </div>
  );
}

const MINA_LINES = ['Coach Mina: "Your English is getting so good!"', 'Coach Mina: "Practice makes perfect, trainee!"', 'Coach Mina: "Wow! Your fans love you!"', 'Coach Mina: "I\'m so proud of you!"'];

function Results({ ep, outcome, minutes, onRetry }: { ep: { id: string; title: string; kind: string }; outcome: FinishOutcome & { correct: number; total: number }; minutes: number; onRetry: () => void }) {
  const nav = useNavigate();
  const look = useGame((g) => g.s.profile?.look);
  const [showCard, setShowCard] = useState(false);
  const pass = outcome.stars > 0;
  return (
    <div className="page col" style={{ alignItems: 'center', textAlign: 'center' }}>
      {look && <Avatar look={look} size={170} move={pass ? 'cheer' : 'idle'} />}
      <h1 className="title-xl">{pass ? (ep.kind === 'showcase' ? 'Showcase complete!' : ep.kind === 'debut' ? 'DEBUT! You are a star!' : 'Episode complete!') : 'Nice try!'}</h1>
      <div style={{ fontSize: 56, letterSpacing: 4 }}>
        {[1, 2, 3].map((s) => (
          <motion.span key={s} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3 + s * 0.25, type: 'spring' }} style={{ filter: s <= outcome.stars ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</motion.span>
        ))}
      </div>
      <div className="muted">{outcome.correct} / {outcome.total} correct · {Math.max(1, minutes)} min</div>
      <div className="row wrap" style={{ justifyContent: 'center' }}>
        <div className="chip" style={{ fontSize: 20 }}>💖 +{outcome.fans} fans</div>
        <div className="chip" style={{ fontSize: 20 }}>❤️ +{outcome.hearts} hearts</div>
      </div>
      {outcome.rankUp && (
        <motion.div className="card tint-sun" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: 'spring' }}>
          <div style={{ fontSize: 40 }}>🏆</div>
          <h2>New rank: {outcome.rankUp}!</h2>
        </motion.div>
      )}
      {!pass && <div className="card tint-violet">Get 40% or more to pass. You can do it! · Набери хотя бы 40%, и эпизод засчитается.</div>}
      {pass && <div className="muted" style={{ fontWeight: 700 }}>{MINA_LINES[Math.floor(Math.random() * MINA_LINES.length)]}</div>}
      {outcome.card && !showCard && <button className="btn sun" onClick={() => { setShowCard(true); sfx.card(); }}>🎁 Open your photocard!</button>}
      {outcome.card && showCard && (
        <motion.div initial={{ rotateY: 180, scale: 0.6 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: 'spring', duration: 0.9 }}>
          <PhotoCard card={outcome.card} />
        </motion.div>
      )}
      <div className="row wrap" style={{ justifyContent: 'center', marginTop: 8 }}>
        {outcome.stars < 3 && <button className="btn ghost" onClick={onRetry}>🔁 Try again</button>}
        {pass && EPISODE_ORDER[(EPISODES.get(ep.id)?.index ?? -2) + 1]
          ? <button className="btn" onClick={() => nav(`/lesson/${EPISODE_ORDER[EPISODES.get(ep.id)!.index + 1].episode.id}`)}>Next episode →</button>
          : null}
        <button className={pass ? 'btn ghost' : 'btn'} onClick={() => nav('/map')}>🗺️ Map</button>
      </div>
    </div>
  );
}
