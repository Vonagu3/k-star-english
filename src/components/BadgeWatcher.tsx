import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGame } from '../game/store';
import { newBadges, type Badge } from '../game/badges';
import { sfx } from '../lib/sfx';
import { speak } from '../lib/tts';

/** Awards newly earned badges (+hearts) and celebrates them one by one. */
export default function BadgeWatcher() {
  const s = useGame((g) => g.s);
  const update = useGame((g) => g.update);
  const [queue, setQueue] = useState<Badge[]>([]);
  const busy = useGame((g) => g.episodeStartSec !== null);

  useEffect(() => {
    if (!s.profile) return;
    const fresh = newBadges(s);
    if (!fresh.length) return;
    const now = Date.now();
    update((x) => ({
      ...x,
      hearts: x.hearts + fresh.reduce((a, bd) => a + bd.reward, 0),
      badges: { ...x.badges, ...Object.fromEntries(fresh.map((bd) => [bd.id, now])) },
    }));
    setQueue((q) => [...q, ...fresh]);
  }, [s, update]);

  const cur = !busy ? queue[0] : undefined;
  useEffect(() => {
    if (!cur) return;
    sfx.levelUp(); confetti({ particleCount: 120, spread: 90, origin: { y: 0.3 } });
    void speak(`New badge! ${cur.name}!`);
  }, [cur]);

  return (
    <AnimatePresence>
      {cur && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 75, display: 'grid', placeItems: 'center', background: 'rgba(43,33,64,0.45)', padding: 16 }} onClick={() => setQueue((q) => q.slice(1))}>
          <motion.div key={cur.id} className="card center col" initial={{ scale: 0.5, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.5, opacity: 0 }} style={{ alignItems: 'center', maxWidth: 360 }}>
            <div className="tiny" style={{ fontWeight: 800, color: 'var(--violet)' }}>🏅 NEW BADGE · НОВЫЙ БЕЙДЖ</div>
            <motion.div style={{ fontSize: 88 }} animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: 2, duration: 0.6 }}>{cur.emoji}</motion.div>
            <h2 className="title-l">{cur.name}</h2>
            <div className="muted">{cur.ru}</div>
            <div className="chip" style={{ fontSize: 18 }}>❤️ +{cur.reward}</div>
            <button className="btn">Yay! 🎉</button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
