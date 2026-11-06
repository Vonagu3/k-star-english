import { useState } from 'react';
import Avatar from '../components/Avatar';
import TopBar from '../components/TopBar';
import { RARITY, SHOP, SHOP_BY_ID, fullLook, isOwned, rarityOf, type Look, type ShopItem } from '../game/catalog';
import { activeEvent, isBirthdayWeek, BIRTHDAY_ITEMS } from '../game/events';
import { useGame } from '../game/store';
import { sfx } from '../lib/sfx';
import { DANCE_MOVES, type DanceMove } from '../content/schema';
import confetti from 'canvas-confetti';

const TABS: { slot: keyof Look; label: string; emoji: string }[] = [
  { slot: 'outfit', label: 'Clothes', emoji: '👗' }, { slot: 'hair', label: 'Hair', emoji: '💇‍♀️' }, { slot: 'hairColor', label: 'Hair colour', emoji: '🎨' },
  { slot: 'pet', label: 'Pets', emoji: '🐾' }, { slot: 'fx', label: 'Effects', emoji: '✨' }, { slot: 'acc', label: 'Accessories', emoji: '🎀' },
  { slot: 'glasses', label: 'Glasses', emoji: '👓' }, { slot: 'eyes', label: 'Eyes', emoji: '👀' }, { slot: 'face', label: 'Face', emoji: '💗' },
  { slot: 'outfitColor', label: 'Clothes colour', emoji: '🌈' }, { slot: 'stick', label: 'Lightstick', emoji: '🪄' }, { slot: 'bg', label: 'Background', emoji: '🌌' },
  { slot: 'skin', label: 'Skin', emoji: '🙂' },
];

/** Colour swatch, including two-tone / rainbow gradients ("grad:#a:#b"). */
function Swatch({ value }: { value: string }) {
  const bg = value.startsWith('grad:') ? `linear-gradient(180deg, ${value.slice(5).split(':').join(', ')})` : value;
  return <span style={{ display: 'inline-block', width: 34, height: 34, borderRadius: '50%', background: bg, border: '2px solid #ddd' }} />;
}

export default function Studio() {
  const s = useGame((g) => g.s);
  const update = useGame((g) => g.update);
  const buy = useGame((g) => g.buy);
  const ev = activeEvent();
  const bday = isBirthdayWeek(useGame.getState().s.profile?.settings.birthday);
  const [tab, setTab] = useState<keyof Look | 'event'>(ev || bday ? 'event' : 'outfit');
  const [preview, setPreview] = useState<Look | null>(null);
  const [move, setMove] = useState<DanceMove | 'idle'>('idle');
  const [mk, setMk] = useState(0);
  const [msg, setMsg] = useState('');
  if (!s.profile) return null;
  const myLook = fullLook(s.profile.look);
  const look = preview ? fullLook(preview) : myLook;
  const wish = s.profile.wish ?? null;

  const wear = (it: ShopItem) => update((x) => ({ ...x, profile: { ...x.profile!, look: { ...x.profile!.look, [it.slot]: it.value } } }));
  const select = (it: ShopItem) => {
    if (isOwned(s.inventory, it)) {
      sfx.tap(); wear(it);
      setPreview(preview ? { ...preview, [it.slot]: it.value } : null); setMsg('');
    } else {
      setPreview({ ...(preview ?? myLook), [it.slot]: it.value });
      setMsg('');
    }
  };
  const purchase = (it: ShopItem) => {
    if (buy(it.id, it.price, 'look')) {
      sfx.levelUp();
      if (rarityOf(it.price) === 'epic' || rarityOf(it.price) === 'legend') confetti({ particleCount: 140, spread: 90, origin: { y: 0.3 } });
      wear(it);
      if (wish === it.id) update((x) => ({ ...x, profile: { ...x.profile!, wish: null } }));
      setPreview(preview ? { ...preview, [it.slot]: it.value } : null); setMsg(`You got ${it.name}! 🎉`);
      setMove('pose'); setMk((k) => k + 1);
    } else { sfx.wrong(); setMsg(`You need ${it.price - s.hearts} more ❤️. Play episodes to earn them! · Не хватает ${it.price - s.hearts} ❤️`); }
  };
  const setWish = (it: ShopItem) => {
    sfx.coin();
    update((x) => ({ ...x, profile: { ...x.profile!, wish: it.id } }));
    setMsg(`⭐ ${it.name} is your goal! Earn hearts in episodes. · Это твоя цель — копи сердечки!`);
  };

  const eventItems = [...(ev ? ev.items : []), ...(bday ? BIRTHDAY_ITEMS : [])].map((i) => SHOP_BY_ID.get(i.id) ?? i);
  const items = tab === 'event' ? eventItems
    : SHOP.filter((i) => i.slot === tab && (!i.event || isOwned(s.inventory, i))).sort((a, b) => a.price - b.price);
  const previewing = preview ? items.find((i) => preview[i.slot] === i.value && !isOwned(s.inventory, i)) : undefined;
  const trying = preview && SHOP.some((i) => fullLook(preview)[i.slot] === i.value && !isOwned(s.inventory, i));
  const ownedCount = SHOP.filter((i) => i.price > 0 && s.inventory.includes(i.id)).length;
  const paidCount = SHOP.filter((i) => i.price > 0).length;

  return (
    <div className="page col">
      <TopBar />
      <div className="row wrap">
        <h1 className="title-xl grow">👗 Style Studio</h1>
        <span className="chip">🛍️ {ownedCount} / {paidCount} items</span>
      </div>
      <div className="row wrap" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div className="col studio-avatar" style={{ alignItems: 'center', flex: '0 0 auto', margin: '0 auto' }}>
          <Avatar look={look} size={210} move={move} moveKey={mk} />
          {trying && <div className="badge" style={{ background: 'var(--violet)' }}>👀 Trying on</div>}
          <div className="row wrap" style={{ justifyContent: 'center', gap: 4, maxWidth: 250 }}>
            {DANCE_MOVES.map((m) => <button key={m} className="chip" style={{ padding: '4px 8px' }} onClick={() => { setMove(m); setMk((k) => k + 1); }}>{m.replace('-', ' ')}</button>)}
          </div>
        </div>
        <div className="col grow" style={{ minWidth: 260 }}>
          <div className="row wrap" style={{ gap: 6 }}>
            {(ev || bday) && <button className="chip" style={{ borderColor: tab === 'event' ? 'var(--pink)' : '#ffb800', background: tab === 'event' ? 'var(--pink-soft)' : '#fff3cc' }} onClick={() => setTab('event')}>{bday ? '🎂 Birthday' : ev!.emoji} {ev ? ev.name : 'Birthday'}</button>}
            {TABS.map((t) => <button key={t.slot} className="chip" style={{ borderColor: tab === t.slot ? 'var(--pink)' : undefined, background: tab === t.slot ? 'var(--pink-soft)' : undefined }} onClick={() => setTab(t.slot)}>{t.emoji} {t.label}</button>)}
          </div>
          {tab === 'event' && <div className="card tint-sun small" style={{ fontWeight: 800 }}>{bday && '🎂 Birthday items — only this week! '}{ev && `${ev.emoji} ${ev.name}: limited items, only until ${ev.to.split('-').reverse().join('.')}! · Только во время праздника!`}</div>}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))' }}>
            {items.map((it) => {
              const owned = isOwned(s.inventory, it);
              const on = myLook[it.slot] === it.value;
              const r = RARITY[rarityOf(it.price)];
              const afford = s.hearts >= it.price;
              return (
                <button key={it.id} className={`tile ${on ? 'good' : preview?.[it.slot] === it.value ? 'selected' : ''}`} onClick={() => select(it)}
                  style={{ minHeight: 112, fontSize: 14, position: 'relative', borderColor: !owned && !on && preview?.[it.slot] !== it.value ? `${r.color}88` : undefined }}>
                  {!owned && <span className="badge" style={{ position: 'absolute', top: 4, left: 4, background: r.color, fontSize: 9 }}>{r.label}</span>}
                  {wish === it.id && <span style={{ position: 'absolute', top: 2, right: 6, fontSize: 16 }}>⭐</span>}
                  <span style={{ fontSize: 30, marginTop: 6 }}>{it.slot.endsWith('olor') || it.slot === 'skin' ? <Swatch value={it.value} /> : it.emoji}</span>
                  {it.name}
                  <span className="tiny" style={{ fontWeight: 800, color: owned ? 'var(--mint)' : afford ? 'var(--pink)' : 'var(--ink-2)' }}>
                    {owned ? (on ? '✓ wearing' : 'owned') : `${it.price} ❤️`}
                  </span>
                </button>
              );
            })}
          </div>
          {msg && <div className="card tint-sun small" style={{ fontWeight: 800 }}>{msg}</div>}
          {previewing && (
            <div className="card col" style={{ borderColor: RARITY[rarityOf(previewing.price)].color }}>
              <div className="row">
                <span style={{ fontSize: 30 }}>{previewing.emoji}</span>
                <div className="grow">
                  <b>{previewing.name}</b> <span className="badge" style={{ background: RARITY[rarityOf(previewing.price)].color }}>{RARITY[rarityOf(previewing.price)].label}</span>
                  <div className="bar" style={{ marginTop: 6 }}><span style={{ width: `${Math.min(100, (s.hearts / previewing.price) * 100)}%` }} /></div>
                  <div className="tiny muted">{s.hearts >= previewing.price ? 'You can buy it now!' : `${s.hearts} / ${previewing.price} ❤️ — ${previewing.price - s.hearts} more to go`}</div>
                </div>
              </div>
              <div className="row wrap">
                <button className="btn sun" disabled={s.hearts < previewing.price} onClick={() => purchase(previewing)}>Buy for {previewing.price} ❤️</button>
                {s.hearts < previewing.price && wish !== previewing.id && <button className="btn violet small" onClick={() => setWish(previewing)}>⭐ Make it my goal</button>}
              </div>
            </div>
          )}
          {trying && <button className="btn ghost small" onClick={() => { setPreview(null); setMsg(''); }}>↩️ Take off the try-on</button>}
        </div>
      </div>
    </div>
  );
}
