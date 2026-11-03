import { useState } from 'react';
import Avatar from '../components/Avatar';
import TopBar from '../components/TopBar';
import { SHOP, type Look, type ShopItem } from '../game/catalog';
import { useGame } from '../game/store';
import { sfx } from '../lib/sfx';
import { DANCE_MOVES, type DanceMove } from '../content/schema';

const TABS: { slot: keyof Look; label: string; emoji: string }[] = [
  { slot: 'hair', label: 'Hair', emoji: '💇‍♀️' }, { slot: 'hairColor', label: 'Hair colour', emoji: '🎨' }, { slot: 'eyes', label: 'Eyes', emoji: '👀' },
  { slot: 'outfit', label: 'Clothes', emoji: '👗' }, { slot: 'outfitColor', label: 'Colour', emoji: '🌈' }, { slot: 'acc', label: 'Accessories', emoji: '🎀' },
  { slot: 'stick', label: 'Lightstick', emoji: '🪄' }, { slot: 'bg', label: 'Background', emoji: '🌌' }, { slot: 'skin', label: 'Skin', emoji: '🙂' },
];

export default function Studio() {
  const s = useGame((g) => g.s);
  const update = useGame((g) => g.update);
  const buy = useGame((g) => g.buy);
  const [tab, setTab] = useState<keyof Look>('hair');
  const [preview, setPreview] = useState<Look | null>(null);
  const [move, setMove] = useState<DanceMove | 'idle'>('idle');
  const [mk, setMk] = useState(0);
  const [msg, setMsg] = useState('');
  if (!s.profile) return null;
  const look = preview ?? s.profile.look;

  const select = (it: ShopItem) => {
    const owned = s.inventory.includes(it.id);
    if (owned) {
      sfx.tap();
      update((x) => ({ ...x, profile: { ...x.profile!, look: { ...x.profile!.look, [it.slot]: it.value } } }));
      setPreview(preview ? { ...preview, [it.slot]: it.value } : null); setMsg('');
    } else {
      setPreview({ ...(preview ?? s.profile!.look), [it.slot]: it.value });
      setMsg(`${it.name}: ${it.price} ❤️`);
    }
  };
  const purchase = (it: ShopItem) => {
    if (buy(it.id, it.price, 'look')) {
      sfx.coin();
      update((x) => ({ ...x, profile: { ...x.profile!, look: { ...x.profile!.look, [it.slot]: it.value } } }));
      setPreview(preview ? { ...preview, [it.slot]: it.value } : null); setMsg(`You got ${it.name}! 🎉`);
      setMove('pose'); setMk((k) => k + 1);
    } else { sfx.wrong(); setMsg('Not enough hearts yet — play episodes to earn more! · Пока не хватает сердечек'); }
  };
  const items = SHOP.filter((i) => i.slot === tab);
  const previewing = preview ? items.find((i) => preview[tab] === i.value && !s.inventory.includes(i.id)) : undefined;
  const trying = preview && SHOP.some((i) => preview[i.slot] === i.value && !s.inventory.includes(i.id));
  return (
    <div className="page col">
      <TopBar />
      <h1 className="title-xl">👗 Style Studio</h1>
      <div className="row wrap" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div className="col" style={{ alignItems: 'center', flex: '0 0 auto', margin: '0 auto' }}>
          <Avatar look={look} size={200} move={move} moveKey={mk} />
          <div className="row wrap" style={{ justifyContent: 'center', gap: 4, maxWidth: 240 }}>
            {DANCE_MOVES.slice(0, 12).map((m) => <button key={m} className="chip" style={{ padding: '4px 8px' }} onClick={() => { setMove(m); setMk((k) => k + 1); }}>{m.replace('-', ' ')}</button>)}
          </div>
        </div>
        <div className="col grow" style={{ minWidth: 260 }}>
          <div className="row wrap" style={{ gap: 6 }}>
            {TABS.map((t) => <button key={t.slot} className="chip" style={{ borderColor: tab === t.slot ? 'var(--pink)' : undefined, background: tab === t.slot ? 'var(--pink-soft)' : undefined }} onClick={() => setTab(t.slot)}>{t.emoji} {t.label}</button>)}
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
            {items.map((it) => {
              const owned = s.inventory.includes(it.id);
              const on = s.profile!.look[it.slot] === it.value;
              return (
                <button key={it.id} className={`tile ${on ? 'good' : preview?.[tab] === it.value ? 'selected' : ''}`} onClick={() => select(it)} style={{ minHeight: 96, fontSize: 14 }}>
                  <span style={{ fontSize: 30 }}>{it.slot.endsWith('olor') || it.slot === 'skin' ? <span style={{ display: 'inline-block', width: 30, height: 30, borderRadius: '50%', background: it.value, border: '2px solid #ddd' }} /> : it.emoji}</span>
                  {it.name}
                  <span className="tiny muted">{owned ? (on ? 'wearing' : 'owned') : `${it.price} ❤️`}</span>
                </button>
              );
            })}
          </div>
          {msg && <div className="card tint-sun small" style={{ fontWeight: 800 }}>{msg}</div>}
          {trying && <button className="btn ghost small" onClick={() => { setPreview(null); setMsg(''); }}>↩️ Take off the try-on</button>}
          {previewing && <button className="btn sun" onClick={() => purchase(previewing)}>Buy {previewing.name} for {previewing.price} ❤️</button>}
        </div>
      </div>
    </div>
  );
}
