import { Link } from 'react-router-dom';
import { useGame } from '../game/store';
import { rankFor } from '../game/rules';
import Avatar from './Avatar';

export default function TopBar() {
  const s = useGame((g) => g.s);
  const syncing = useGame((g) => g.syncing);
  if (!s.profile) return null;
  const { rank, next, progress } = rankFor(s.fans);
  return (
    <div className="card row" style={{ gap: 12, padding: 12 }}>
      <Link to="/studio" style={{ borderRadius: 18, overflow: 'hidden', flexShrink: 0, lineHeight: 0 }}><Avatar look={s.profile.look} size={64} /></Link>
      <div className="grow col" style={{ gap: 4 }}>
        <div className="row" style={{ gap: 8 }}>
          <strong style={{ fontFamily: 'var(--font-title)', fontSize: 22 }}>{s.profile.name}</strong>
          <span className="badge">{rank.name}</span>
          {syncing === 'offline' && <span className="tiny muted" title="Offline: saved on this device">📴</span>}
          {syncing === 'error' && <span className="tiny muted" title="Sync error">⚠️</span>}
        </div>
        <div className="bar"><span style={{ width: `${progress * 100}%` }} /></div>
        <div className="tiny muted" style={{ fontWeight: 700 }}>{next ? `${s.fans.toLocaleString()} / ${next.fans.toLocaleString()} fans to ${next.name}` : 'Top rank!'}</div>
      </div>
      <div className="col" style={{ gap: 6, alignItems: 'flex-end' }}>
        <span className="chip" title="Fans">💖 {s.fans.toLocaleString()}</span>
        <span className="chip" title="Hearts">❤️ {s.hearts}</span>
        <span className="chip" title="Streak">🔥 {s.streak.streak}</span>
      </div>
    </div>
  );
}
