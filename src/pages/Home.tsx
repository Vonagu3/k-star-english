import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import TopBar from '../components/TopBar';
import { useGame } from '../game/store';
import { questsForDay, srsDue, QUEST_REWARD, QUEST_CHEST } from '../game/rules';
import { EPISODE_ORDER } from '../content';
import { useUnlocked } from './Map';
import { sfx } from '../lib/sfx';
import { markFeedbackSeen, unseenFeedback, type Submission } from '../lib/submissions';

export default function Home() {
  const s = useGame((g) => g.s);
  const userId = useGame((g) => g.userId);
  const claimQuest = useGame((g) => g.claimQuest);
  const claimChest = useGame((g) => g.claimChest);
  const unlocked = useUnlocked();
  const nav = useNavigate();
  const [fb, setFb] = useState<Submission[]>([]);
  useEffect(() => { void unseenFeedback(userId).then(setFb); }, [userId]);

  const quests = questsForDay(s.daily.day);
  const due = srsDue(s.srs, Date.now()).length;
  const nextRef = EPISODE_ORDER.find((r, i) => unlocked(i) && !(s.progress[r.episode.id]?.stars));
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page col">
      <TopBar />
      <motion.div className="card tint-pink row" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div style={{ fontSize: 48 }}>👩‍🏫</div>
        <div className="grow">
          <div style={{ fontWeight: 800, fontSize: 19 }}>{hello}, {s.profile?.name}! ✨</div>
          <div className="muted small">Coach Mina: {nextRef ? `Ready for "${nextRef.episode.title}"?` : 'You finished Stage 1! Superstar!'}</div>
        </div>
      </motion.div>

      {fb.length > 0 && (
        <div className="card tint-mint col">
          <strong>💌 Messages from Mum/Dad</strong>
          {fb.slice(0, 3).map((x) => (
            <div key={x.id} className="small">{x.status === 'approved' ? '✅' : '🔁'} <b>{x.prompt.slice(0, 50)}</b>{x.comment ? ` — “${x.comment}”` : ''}{x.bonus ? ` (+${x.bonus} ❤️)` : ''}</div>
          ))}
          <button className="btn ghost small" onClick={() => { void markFeedbackSeen(fb.map((x) => x.id)); setFb([]); }}>Thank you! 💖</button>
        </div>
      )}

      <div className="grid grid-2">
        {nextRef && (
          <button className="card tint-violet col" style={{ alignItems: 'flex-start', textAlign: 'left' }} onClick={() => nav(`/lesson/${nextRef.episode.id}`)}>
            <div style={{ fontSize: 40 }}>{nextRef.episode.emoji}</div>
            <div className="muted tiny" style={{ fontWeight: 800 }}>CONTINUE · {nextRef.world.title}</div>
            <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: 20 }}>{nextRef.episode.title}</div>
            <span className="btn small">▶ Play</span>
          </button>
        )}
        <button className="card tint-sun col" style={{ alignItems: 'flex-start', textAlign: 'left' }} onClick={() => nav('/warmup')}>
          <div style={{ fontSize: 40 }}>🔥</div>
          <div className="muted tiny" style={{ fontWeight: 800 }}>DAILY WARM-UP</div>
          <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: 20 }}>{due > 0 ? `${due} words to review` : 'Word practice'}</div>
          <span className="btn sun small">Go!</span>
        </button>
      </div>

      <div className="card col">
        <div className="row"><strong className="grow" style={{ fontFamily: 'var(--font-title)', fontSize: 22 }}>📋 Today's missions</strong><span className="muted tiny">+{QUEST_REWARD} ❤️ each</span></div>
        {quests.map((q) => {
          const v = Math.min(q.goal, s.daily.metrics[q.metric] ?? 0);
          const done = v >= q.goal;
          const claimed = s.daily.claimed.includes(q.id);
          return (
            <div key={q.id} className="row">
              <div className="grow col" style={{ gap: 4 }}>
                <div style={{ fontWeight: 800 }}>{q.text} <span className="muted tiny">· {q.ru}</span></div>
                <div className="bar"><span style={{ width: `${(v / q.goal) * 100}%` }} /></div>
              </div>
              {claimed ? <span style={{ fontSize: 26 }}>✅</span> : (
                <button className="btn small mint" disabled={!done} onClick={() => { sfx.coin(); claimQuest(q.id); }}>{done ? 'Claim' : `${v}/${q.goal}`}</button>
              )}
            </div>
          );
        })}
        <button className="btn sun" disabled={s.daily.claimed.length < 3 || s.daily.chest} onClick={() => { sfx.levelUp(); confetti({ particleCount: 120 }); claimChest(); }}>
          {s.daily.chest ? '🎁 Chest opened!' : `🎁 Open the bonus chest (+${QUEST_CHEST} ❤️)`}
        </button>
      </div>

      <div className="grid grid-3">
        <Link to="/studio" className="card center" style={{ textDecoration: 'none', color: 'inherit' }}><div style={{ fontSize: 40 }}>👗</div><b>Style Studio</b><div className="tiny muted">Аватар и магазин</div></Link>
        <Link to="/dorm" className="card center" style={{ textDecoration: 'none', color: 'inherit' }}><div style={{ fontSize: 40 }}>🛏️</div><b>My Dorm</b><div className="tiny muted">Моя комната</div></Link>
        <Link to="/cards" className="card center" style={{ textDecoration: 'none', color: 'inherit' }}><div style={{ fontSize: 40 }}>🃏</div><b>Photocards</b><div className="tiny muted">{Object.keys(s.cards).length} collected</div></Link>
      </div>
    </div>
  );
}
