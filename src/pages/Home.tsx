import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import TopBar from '../components/TopBar';
import { useGame } from '../game/store';
import { questsForDay, srsDue, QUEST_REWARD, QUEST_CHEST } from '../game/rules';
import { EPISODE_ORDER, WORLDS } from '../content';
import { RARITY, SHOP_BY_ID, fullLook, rarityOf } from '../game/catalog';
import Avatar from '../components/Avatar';
import EventBanner from '../components/EventBanner';
import { useDailyMission } from './Daily';
import { DAILY_BONUS } from '../game/daily';
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
  const daily = useDailyMission();
  useEffect(() => { void unseenFeedback(userId).then(setFb); }, [userId]);

  const quests = questsForDay(s.daily.day);
  const due = srsDue(s.srs, Date.now()).length;
  const nextRef = EPISODE_ORDER.find((r, i) => !r.world.bonus && unlocked(i) && !(s.progress[r.episode.id]?.stars))
    ?? EPISODE_ORDER.find((r, i) => unlocked(i) && !(s.progress[r.episode.id]?.stars));
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

      <EventBanner />

      {(s.parentTasks ?? []).filter((t) => !t.doneAt).slice(0, 3).map((t) => (
        <button key={t.id} className="card row" onClick={() => nav(`/task/${t.id}`)} style={{ textAlign: 'left', borderColor: 'var(--mint)', background: 'var(--mint-soft)' }}>
          <div style={{ fontSize: 40 }}>📮</div>
          <div className="grow">
            <div className="tiny" style={{ fontWeight: 800, color: '#0d6b61' }}>TASK FROM MUM/DAD · ЗАДАНИЕ ОТ РОДИТЕЛЯ</div>
            <b>{t.prompt}</b>
            <div className="tiny muted">{t.ru}</div>
          </div>
          <span className="btn mint small">❤️ {t.reward}</span>
        </button>
      ))}

      <button className="card row" onClick={() => nav('/daily')}
        style={{ textAlign: 'left', background: s.daily.missionBonus ? '#fff' : 'linear-gradient(120deg, #2b2a6b, #ff6f91)', color: s.daily.missionBonus ? 'var(--ink)' : '#fff', borderColor: '#ff3b4e' }}>
        <div style={{ fontSize: 44 }}>{s.daily.missionBonus ? '✅' : daily.mission.emoji}</div>
        <div className="grow">
          <div className="tiny" style={{ fontWeight: 800, opacity: 0.9 }}>🗼 MISSION OF THE DAY · МИССИЯ ДНЯ</div>
          <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: 20 }}>{daily.mission.title}</div>
          <div className="small" style={{ fontWeight: 700 }}>{s.daily.missionBonus ? 'Done! A new mission comes tomorrow 🌙' : `5 quick tasks · +${DAILY_BONUS} ❤️ bonus`}</div>
        </div>
        {!s.daily.missionBonus && <span className="btn sun small">Go!</span>}
      </button>

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

      {(() => {
        const goal = s.profile?.wish ? SHOP_BY_ID.get(s.profile.wish) : undefined;
        if (!goal || !s.profile) return (
          <Link to="/studio" className="card row" style={{ textDecoration: 'none', color: 'inherit', borderStyle: 'dashed' }}>
            <div style={{ fontSize: 36 }}>🛍️</div>
            <div className="grow"><b>Choose a goal in the Style Studio!</b><div className="tiny muted">Выбери вещь мечты в студии и копи на неё сердечки</div></div>
          </Link>
        );
        const r = RARITY[rarityOf(goal.price)];
        const ready = s.hearts >= goal.price;
        return (
          <Link to="/studio" className="card row" style={{ textDecoration: 'none', color: 'inherit', borderColor: r.color }}>
            <div style={{ lineHeight: 0, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}><Avatar look={{ ...fullLook(s.profile.look), [goal.slot]: goal.value }} size={70} /></div>
            <div className="grow col" style={{ gap: 4 }}>
              <div className="tiny" style={{ fontWeight: 800, color: r.color }}>⭐ MY GOAL · {r.label.toUpperCase()}</div>
              <b>{goal.emoji} {goal.name}</b>
              <div className="bar"><span style={{ width: `${Math.min(100, (s.hearts / goal.price) * 100)}%` }} /></div>
              <div className="tiny muted" style={{ fontWeight: 700 }}>{ready ? 'You can buy it now! Go to the studio 🎉' : `${s.hearts} / ${goal.price} ❤️ · ещё ${goal.price - s.hearts} ❤️`}</div>
            </div>
            {ready && <span className="btn sun small">Buy!</span>}
          </Link>
        );
      })()}

      {WORLDS.filter((w) => w.bonus).map((w) => {
        const eps = EPISODE_ORDER.filter((r) => r.world.id === w.id);
        const done = eps.filter((r) => (s.progress[r.episode.id]?.stars ?? 0) > 0).length;
        const nextBonus = eps.find((r) => unlocked(r.index) && !(s.progress[r.episode.id]?.stars));
        return (
          <button key={w.id} className="card row" style={{ background: `linear-gradient(120deg, ${w.color}, #ff8fa3)`, color: '#fff', borderColor: w.color, textAlign: 'left' }}
            onClick={() => nav(nextBonus ? `/lesson/${nextBonus.episode.id}` : '/map')}>
            <div style={{ fontSize: 44 }}>{w.emoji}</div>
            <div className="grow">
              <div className="tiny" style={{ fontWeight: 800, opacity: 0.9 }}>✨ BONUS WORLD · {done}/{eps.length}</div>
              <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: 21 }}>{w.title}</div>
              <div className="small" style={{ fontWeight: 700 }}>{nextBonus ? `Next mission: ${nextBonus.episode.title}` : w.subtitle}</div>
            </div>
          </button>
        );
      })}

      <div className="card col" style={{ background: 'linear-gradient(135deg, #fff0f7, #efe9ff)' }}>
        <strong style={{ fontFamily: 'var(--font-title)', fontSize: 22 }}>🎉 Fun zone</strong>
        <div className="grid grid-3">
          <Link to="/karaoke" className="card center" style={{ textDecoration: 'none', color: 'inherit', boxShadow: 'none' }}><div style={{ fontSize: 36 }}>🎤</div><b>Karaoke</b><div className="tiny muted">Пой и записывай</div></Link>
          <Link to="/rhythm" className="card center" style={{ textDecoration: 'none', color: 'inherit', boxShadow: 'none' }}><div style={{ fontSize: 36 }}>🎧</div><b>Word Beats</b><div className="tiny muted">{s.games?.rhythmBest ? `Best: ${s.games.rhythmBest}` : 'Лови слова под бит'}</div></Link>
          <Link to="/comics" className="card center" style={{ textDecoration: 'none', color: 'inherit', boxShadow: 'none' }}><div style={{ fontSize: 36 }}>💬</div><b>Comics</b><div className="tiny muted">Сделай комикс</div></Link>
        </div>
      </div>

      <Link to="/notebook" className="card tint-sun row" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ fontSize: 40 }}>📓</div>
        <div className="grow"><b>My Notebook</b><div className="tiny muted">Задания для тетради · print & write</div></div>
        <span className="btn sun small">Open</span>
      </Link>

      <div className="grid grid-3">
        <Link to="/studio" className="card center" style={{ textDecoration: 'none', color: 'inherit' }}><div style={{ fontSize: 40 }}>👗</div><b>Style Studio</b><div className="tiny muted">Аватар и магазин</div></Link>
        <Link to="/dorm" className="card center" style={{ textDecoration: 'none', color: 'inherit' }}><div style={{ fontSize: 40 }}>🛏️</div><b>My Dorm</b><div className="tiny muted">Моя комната</div></Link>
        <Link to="/cards" className="card center" style={{ textDecoration: 'none', color: 'inherit' }}><div style={{ fontSize: 40 }}>🃏</div><b>Photocards</b><div className="tiny muted">{Object.keys(s.cards).length} collected</div></Link>
        <Link to="/words" className="card center" style={{ textDecoration: 'none', color: 'inherit' }}><div style={{ fontSize: 40 }}>📖</div><b>My Words</b><div className="tiny muted">Мой словарик</div></Link>
        <Link to="/badges" className="card center" style={{ textDecoration: 'none', color: 'inherit' }}><div style={{ fontSize: 40 }}>🏅</div><b>Badges</b><div className="tiny muted">{Object.keys(s.badges ?? {}).length} earned</div></Link>
      </div>
    </div>
  );
}
