import TopBar from '../components/TopBar';
import PhotoCard from '../components/PhotoCard';
import { CARDS } from '../game/cards';
import { useGame } from '../game/store';

export default function Cards() {
  const owned = useGame((g) => g.s.cards);
  const n = Object.keys(owned).length;
  return (
    <div className="page col">
      <TopBar />
      <h1 className="title-xl">🃏 Photocard Album</h1>
      <div className="muted">{n} / {CARDS.length} collected · Rare cards come from Weekly Practice, Epic from Showcases, Legend from the Debut Stage!</div>
      <div className="bar"><span style={{ width: `${(n / CARDS.length) * 100}%` }} /></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', justifyItems: 'center' }}>
        {CARDS.map((c) => (
          <div key={c.id} style={{ position: 'relative' }}>
            <PhotoCard card={c} small locked={!owned[c.id]} />
            {owned[c.id] > 1 && <span className="badge" style={{ position: 'absolute', top: -6, right: -6, background: 'var(--pink)' }}>×{owned[c.id]}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
