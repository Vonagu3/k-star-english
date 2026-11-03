import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EPISODE_ORDER, WORLDS } from '../content';
import { isUnlocked } from '../game/rules';
import { useGame } from '../game/store';
import TopBar from '../components/TopBar';

const ORDER = EPISODE_ORDER.map((r) => ({ id: r.episode.id, worldId: r.world.id, kind: r.episode.kind }));

export function useUnlocked() {
  const progress = useGame((g) => g.s.progress);
  const forced = useGame((g) => g.s.forcedWorlds);
  const stars = useMemo(() => Object.fromEntries(Object.entries(progress).map(([k, v]) => [k, v.stars])), [progress]);
  return useCallback((i: number) => isUnlocked(i, ORDER, stars, forced), [stars, forced]);
}

export default function MapPage() {
  const nav = useNavigate();
  const progress = useGame((g) => g.s.progress);
  const unlocked = useUnlocked();
  let idx = 0;
  return (
    <div className="page col">
      <TopBar />
      {WORLDS.map((w) => {
        const eps = EPISODE_ORDER.filter((r) => r.world.id === w.id);
        const done = eps.filter((r) => (progress[r.episode.id]?.stars ?? 0) > 0).length;
        return (
          <section key={w.id} className="col" style={{ gap: 8 }}>
            <div className="card row" style={{ background: `linear-gradient(120deg, ${w.color}, ${w.color}aa)`, color: '#fff', borderColor: w.color }}>
              <div style={{ fontSize: 48 }}>{w.emoji}</div>
              <div className="grow">
                <div className="tiny" style={{ fontWeight: 800, opacity: 0.9 }}>WORLD {w.n} · {w.ru}</div>
                <h2 className="title-l">{w.title}</h2>
                <div className="small" style={{ fontWeight: 700 }}>{w.subtitle}</div>
              </div>
              <div className="chip" style={{ color: 'var(--ink)' }}>{done}/{eps.length}</div>
            </div>
            {w.weeks.map((wk) => (
              <div key={wk.n} className="col" style={{ gap: 0 }}>
                <div className="center muted" style={{ fontWeight: 800, margin: '8px 0' }}>Week {wk.n}: {wk.title}</div>
                <div className="map-path">
                  {wk.episodes.map((ep) => {
                    const i = idx++;
                    const open = unlocked(i);
                    const st = progress[ep.id]?.stars ?? 0;
                    const offset = Math.sin(i * 1.1) * 90;
                    return (
                      <button key={ep.id} className={`node ${ep.kind === 'weekly' ? 'big' : ''} ${st ? 'done' : open ? 'open' : 'locked'}`}
                        style={{ transform: `translateX(${offset}px)` }} disabled={!open} onClick={() => nav(`/lesson/${ep.id}`)} title={ep.title} aria-label={`${ep.title}${open ? '' : ' (locked)'}`}>
                        {open ? ep.emoji : '🔒'}
                        {st > 0 && <span className="stars">{'⭐'.repeat(st)}</span>}
                        <span className="sr-only">{ep.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {[w.showcase, ...(w.finale ? [w.finale] : [])].map((ep) => {
              const i = idx++;
              const open = unlocked(i);
              const st = progress[ep.id]?.stars ?? 0;
              return (
                <button key={ep.id} className="card col center" disabled={!open} onClick={() => nav(`/lesson/${ep.id}`)}
                  style={{ alignItems: 'center', background: ep.kind === 'debut' ? 'linear-gradient(135deg,#ffe27a,#ff8fc4,#a98bff)' : 'linear-gradient(135deg,#ffd6ea,#ece7ff)', opacity: open ? 1 : 0.55 }}>
                  <div style={{ fontSize: 56 }}>{open ? ep.emoji : '🔒'}</div>
                  <div className="tiny" style={{ fontWeight: 800 }}>{ep.kind === 'debut' ? 'STAGE 1 FINALE' : 'MONTHLY CHECKPOINT'}</div>
                  <h2 className="title-l">{ep.title}</h2>
                  <div style={{ fontSize: 26 }}>{st ? '⭐'.repeat(st) : open ? 'Show what you can do!' : 'Finish all weeks to unlock'}</div>
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
