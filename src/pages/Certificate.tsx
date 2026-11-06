import { useNavigate, useParams } from 'react-router-dom';
import { EPISODES } from '../content';
import { useGame } from '../game/store';
import Avatar from '../components/Avatar';

const LEVEL: Record<string, string> = { world1: 'Pre-A1 · Starters', world2: 'Pre-A1 · Starters', world3: 'Pre-A1 → A1 · Starters / Movers', paris: 'Pre-A1 → A1' };

/** Printable certificate for a finished Showcase or the Debut Stage. */
export default function Certificate() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const ref = EPISODES.get(id);
  const s = useGame((g) => g.s);
  const p = s.progress[id];
  if (!ref || !p?.stars || !s.profile) return <div className="page center"><h2>No certificate yet</h2><button className="btn" onClick={() => nav('/badges')}>Back</button></div>;
  const debut = ref.episode.kind === 'debut';
  const date = new Date(p.completedAt ?? Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="page col" style={{ alignItems: 'center' }}>
      <div className="row no-print" style={{ width: '100%' }}>
        <button className="icon-btn" onClick={() => nav(-1)}>⬅️</button><div className="grow" />
        <button className="btn violet small" onClick={() => window.print()}>🖨️ Print</button>
      </div>
      <div className="certificate" style={{ width: 'min(100%, 760px)', aspectRatio: '1.414', background: 'linear-gradient(135deg, #fff7fb, #f3efff)', border: '10px double #c7a6ff', borderRadius: 24, padding: '4% 6%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', textAlign: 'center', boxShadow: '0 10px 30px rgba(124,92,255,0.15)' }}>
        <div style={{ fontFamily: 'var(--font-title)', color: 'var(--violet)', fontSize: 'clamp(14px, 2.4vw, 20px)', letterSpacing: 3, fontWeight: 800 }}>★ STAR ACADEMY ★</div>
        <div style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(26px, 6vw, 52px)', fontWeight: 800, color: 'var(--pink)', lineHeight: 1 }}>{debut ? 'Debut Certificate' : 'Certificate of Achievement'}</div>
        <div className="row" style={{ gap: 16, justifyContent: 'center' }}>
          <div style={{ borderRadius: 16, overflow: 'hidden', lineHeight: 0 }}><Avatar look={s.profile.look} size={90} /></div>
          <div>
            <div className="muted" style={{ fontSize: 'clamp(12px, 2vw, 16px)' }}>This certificate is proudly given to</div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: 800 }}>{s.profile.name}</div>
          </div>
        </div>
        <div style={{ fontSize: 'clamp(13px, 2.2vw, 18px)', fontWeight: 700 }}>
          for completing <b>{ref.episode.title}</b> · {ref.world.title}<br />
          English level: <b>{LEVEL[ref.world.id] ?? 'Pre-A1'}</b> · {'⭐'.repeat(p.stars)}
        </div>
        <div className="row" style={{ width: '100%', justifyContent: 'space-between', fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
          <div><div style={{ fontFamily: '"Brush Script MT", cursive', fontSize: 'clamp(18px, 3vw, 26px)' }}>Coach Mina</div><div className="muted">Coach, Star Academy</div></div>
          <div style={{ fontSize: 'clamp(36px, 7vw, 60px)' }}>{debut ? '🌟' : '🏅'}</div>
          <div><div style={{ fontWeight: 800 }}>{date}</div><div className="muted">Date</div></div>
        </div>
      </div>
    </div>
  );
}
