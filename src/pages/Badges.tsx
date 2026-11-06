import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { BADGES } from '../game/badges';
import { useGame } from '../game/store';
import { EPISODE_ORDER } from '../content';

export default function Badges() {
  const s = useGame((g) => g.s);
  const earned = BADGES.filter((bd) => s.badges?.[bd.id]);
  const certs = EPISODE_ORDER.filter((r) => (r.episode.kind === 'showcase' || r.episode.kind === 'debut') && (s.progress[r.episode.id]?.stars ?? 0) > 0);
  return (
    <div className="page col">
      <TopBar />
      <h1 className="title-xl">🏅 My Badges</h1>
      <div className="muted">{earned.length} / {BADGES.length} badges · За каждый бейдж — сердечки!</div>
      <div className="bar"><span style={{ width: `${(earned.length / BADGES.length) * 100}%` }} /></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {BADGES.map((bd) => {
          const got = s.badges?.[bd.id];
          const [cur, goal] = bd.progress(s);
          return (
            <div key={bd.id} className={`card col center ${got ? 'tint-sun' : ''}`} style={{ alignItems: 'center', gap: 4, opacity: got ? 1 : 0.85 }}>
              <div style={{ fontSize: 46, filter: got ? 'none' : 'grayscale(1) opacity(0.45)' }}>{bd.emoji}</div>
              <b>{bd.name}</b>
              <div className="tiny muted">{bd.ru}</div>
              {got ? <div className="tiny" style={{ fontWeight: 800, color: 'var(--mint)' }}>✓ {new Date(got).toLocaleDateString('ru-RU')}</div> : (
                <>
                  <div className="bar" style={{ width: '100%', height: 8 }}><span style={{ width: `${Math.min(100, (cur / goal) * 100)}%` }} /></div>
                  <div className="tiny muted">{Math.min(cur, goal)} / {goal} · ❤️ {bd.reward}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <h2 className="title-l" style={{ marginTop: 12 }}>📜 My Certificates</h2>
      {certs.length === 0 ? <div className="card muted">Finish a Showcase to get your first certificate! · Пройди Showcase — получишь сертификат.</div> : (
        <div className="grid grid-2">
          {certs.map((r) => <Link key={r.episode.id} to={`/certificate/${r.episode.id}`} className="card tint-violet center" style={{ textDecoration: 'none', color: 'inherit' }}><div style={{ fontSize: 40 }}>📜</div><b>{r.episode.title}</b><div className="tiny muted">{r.world.title}</div></Link>)}
        </div>
      )}
    </div>
  );
}
