import Avatar from './Avatar';
import { RARITY_STYLE, type Card } from '../game/cards';

export default function PhotoCard({ card, small = false, locked = false }: { card: Card; small?: boolean; locked?: boolean }) {
  const r = RARITY_STYLE[card.rarity];
  const w = small ? 130 : 220;
  return (
    <div style={{ width: w, borderRadius: 18, padding: 8, background: locked ? '#eee' : `linear-gradient(135deg, ${r.color}, #fff 60%, ${r.color})`, boxShadow: '0 6px 0 rgba(0,0,0,0.08)', position: 'relative' }}>
      <div style={{ borderRadius: 12, overflow: 'hidden', background: '#fff', filter: locked ? 'grayscale(1) brightness(1.6) opacity(0.5)' : 'none' }}>
        <Avatar look={card.look} size={w - 16} showStick={!small} />
      </div>
      <div style={{ padding: '6px 4px 2px', textAlign: 'left' }}>
        <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: small ? 14 : 18 }}>{locked ? '???' : card.who}</div>
        <div className="row" style={{ justifyContent: 'space-between', gap: 4 }}>
          <span className="tiny muted" style={{ fontWeight: 800 }}>{locked ? 'Collect me!' : card.concept}</span>
          <span className="badge" style={{ background: r.color, fontSize: 10 }}>{r.label}</span>
        </div>
        {!small && !locked && <div className="small" style={{ fontStyle: 'italic', marginTop: 4 }}>“{card.line}”</div>}
      </div>
    </div>
  );
}
