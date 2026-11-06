import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { sha256, useGame } from '../game/store';
import { dayKey } from '../game/rules';
import { sfx } from '../lib/sfx';
import { speak } from '../lib/tts';
import { useTimeStatus } from './TimerChip';

const TICK = 5; // seconds
const FLUSH = 30; // seconds
const IDLE = 180; // stop counting after 3 minutes without any touch / key

/**
 * Counts active study time (tab visible, child active), shows warnings at 10 and 2 minutes left,
 * lets an episode started in time be finished, then locks the portal until tomorrow or a parent extension.
 */
export default function TimeKeeper() {
  const addSeconds = useGame((g) => g.addSeconds);
  const t = useTimeStatus();
  const loc = useLocation();
  const lastInput = useRef(Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const warned = useRef<string>('');

  // Count time.
  useEffect(() => {
    const touch = () => { lastInput.current = Date.now(); };
    window.addEventListener('pointerdown', touch, { passive: true });
    window.addEventListener('keydown', touch);
    const id = setInterval(() => {
      const active = document.visibilityState === 'visible' && Date.now() - lastInput.current < IDLE * 1000;
      if (!active) return;
      const live = useGame.getState().liveSec + TICK;
      if (live >= FLUSH) { useGame.setState({ liveSec: 0 }); addSeconds(live); } else useGame.setState({ liveSec: live });
    }, TICK * 1000);
    const flush = () => { const live = useGame.getState().liveSec; if (live) { useGame.setState({ liveSec: 0 }); addSeconds(live); } };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      clearInterval(id); flush();
      window.removeEventListener('pointerdown', touch); window.removeEventListener('keydown', touch);
      document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', flush);
    };
  }, [addSeconds]);

  // Warnings, once per level per day.
  useEffect(() => {
    const key = `${dayKey(Date.now())}:${t.level}`;
    if (warned.current === key) return;
    const msg = t.level === 'warn10' ? '⏱ 10 minutes left today!' : t.level === 'warn2' ? '⏱ 2 minutes left! Finish your task 💪'
      : t.level === 'grace' ? "⏰ Time's up! Finish this episode, then rest." : null;
    if (!msg) return;
    warned.current = key;
    sfx.coin(); setToast(msg);
    void speak(t.level === 'warn10' ? 'Ten minutes left!' : t.level === 'warn2' ? 'Two minutes left!' : "Time's up! Finish this episode.");
    const h = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(h);
  }, [t.level]);

  const onParent = loc.pathname.startsWith('/parent');
  return (
    <>
      <AnimatePresence>
        {toast && (
          <div style={{ position: 'fixed', top: 12, left: 12, right: 12, zIndex: 70, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <motion.div className="card tint-sun" initial={{ y: -90 }} animate={{ y: 0 }} exit={{ y: -90 }}
              style={{ fontWeight: 800, fontSize: 18, maxWidth: 440, textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', pointerEvents: 'auto' }} onClick={() => setToast(null)}>
              {toast}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {t.level === 'locked' && !onParent && <LockScreen usedSec={t.used} />}
    </>
  );
}

function LockScreen({ usedSec }: { usedSec: number }) {
  const pinHash = useGame((g) => g.s.profile?.pinHash);
  const update = useGame((g) => g.update);
  const fans = useGame((g) => g.s.fans);
  const [pin, setPin] = useState('');
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const extend = (min: number) => {
    update((s) => ({ ...s, daily: { ...s.daily, extraMin: (s.daily.extraMin ?? 0) + min } }));
    setOk(false); setPin('');
  };
  return (
    <div role="dialog" aria-label="Time for a break" style={{ position: 'fixed', inset: 0, zIndex: 65, background: 'linear-gradient(160deg, #2b2a6b, #7c5cff)', display: 'grid', placeItems: 'center', padding: 16, overflowY: 'auto' }}>
      <div className="card center col" style={{ maxWidth: 440, alignItems: 'center' }}>
        <div style={{ fontSize: 72 }}>🌙</div>
        <h2 className="title-l">Time for a break, star!</h2>
        <div className="muted">Сегодня ты занималась {Math.round(usedSec / 60)} мин — отличная работа! Отдохни, завтра продолжим 💖</div>
        <div className="chip">💖 {fans.toLocaleString()} fans</div>
        <div className="card col" style={{ width: '100%', boxShadow: 'none', marginTop: 8 }}>
          <div className="small" style={{ fontWeight: 800 }}>🔐 Для родителя: продлить на сегодня</div>
          {!ok ? (
            <div className="row">
              <input className="field" type="password" inputMode="numeric" placeholder="PIN" value={pin} maxLength={8}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErr(''); }} style={{ textAlign: 'center' }} />
              <button className="btn violet small" disabled={pin.length < 4} onClick={async () => { if (!pinHash || (await sha256(pin)) === pinHash) setOk(true); else setErr('Неверный PIN'); }}>OK</button>
            </div>
          ) : (
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn mint small" onClick={() => extend(15)}>+15 мин</button>
              <button className="btn mint small" onClick={() => extend(30)}>+30 мин</button>
            </div>
          )}
          {err && <div style={{ color: 'var(--red)', fontWeight: 800 }}>{err}</div>}
        </div>
      </div>
    </div>
  );
}
