import { useMemo, useState } from 'react';
import TopBar from '../components/TopBar';
import { DORM_COLS, DORM_ROWS, FURNITURE, type DormPlacement } from '../game/catalog';
import { useGame } from '../game/store';
import { speak } from '../lib/tts';
import { sfx } from '../lib/sfx';

const F = new Map(FURNITURE.map((f) => [f.id, f]));
const name = (id: string) => { const en = F.get(id)?.en ?? id; return /s$/.test(en) && en !== 'glass' ? `the ${en}` : `the ${en}`; };

/** Describe where an item is, relative to its neighbours (British English, A1 grammar). */
function describe(p: DormPlacement, all: DormPlacement[]): string {
  const at = (x: number, y: number) => all.find((o) => o.x === x && o.y === y);
  const it = F.get(p.item)?.en ?? p.item;
  const be = /s$/.test(it) ? 'are' : 'is';
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  const l = at(p.x - 1, p.y); const r = at(p.x + 1, p.y);
  if (l && r) return `${cap(name(p.item))} ${be} between ${name(l.item)} and ${name(r.item)}.`;
  if (l || r) return `${cap(name(p.item))} ${be} next to ${name((l ?? r)!.item)}.`;
  const back = at(p.x, p.y - 1); const front = at(p.x, p.y + 1);
  if (back) return `${cap(name(p.item))} ${be} in front of ${name(back.item)}.`;
  if (front) return `${cap(name(p.item))} ${be} behind ${name(front.item)}.`;
  return `There ${be} ${/s$/.test(it) ? 'some' : /^[aeiou]/.test(it) ? 'an' : 'a'} ${it} in my room.`;
}

export default function Dorm() {
  const s = useGame((g) => g.s);
  const update = useGame((g) => g.update);
  const buy = useGame((g) => g.buy);
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const dorm = s.profile?.dorm ?? [];
  const setDorm = (d: DormPlacement[]) => update((x) => ({ ...x, profile: { ...x.profile!, dorm: d } }));
  const placedIds = new Set(dorm.map((d) => d.item));

  const tapCell = (x: number, y: number) => {
    const here = dorm.find((d) => d.x === x && d.y === y);
    if (sel) {
      sfx.tap();
      const next = dorm.filter((d) => d.item !== sel && !(d.x === x && d.y === y));
      const placed = [...next, { item: sel, x, y }];
      setDorm(placed);
      const sentence = describe({ item: sel, x, y }, placed);
      setMsg(sentence); void speak(sentence);
      setSel(null);
    } else if (here) {
      const sentence = describe(here, dorm);
      setMsg(sentence); void speak(sentence);
      setSel(here.item);
    }
  };
  const sentences = useMemo(() => dorm.map((d) => describe(d, dorm)), [dorm]);
  const count = dorm.length;
  const describeAll = () => { const t = [`There ${count === 1 ? 'is one thing' : `are ${count} things`} in my room.`, ...sentences].join(' '); setMsg(t); void speak(t); };

  return (
    <div className="page col">
      <TopBar />
      <h1 className="title-xl">🛏️ My Dorm Room</h1>
      <div className="muted small">Pick a thing, then tap a place in the room. Listen where it is! · Выбери предмет и поставь его в комнату — послушай, где он стоит.</div>
      <div className="dorm-grid" style={{ gridTemplateColumns: `repeat(${DORM_COLS}, 1fr)` }}>
        {Array.from({ length: DORM_ROWS * DORM_COLS }, (_, k) => {
          const x = k % DORM_COLS; const y = Math.floor(k / DORM_COLS);
          const here = dorm.find((d) => d.x === x && d.y === y);
          return <button key={k} className={`dorm-cell ${here && sel === here.item ? 'sel' : ''}`} onClick={() => tapCell(x, y)} aria-label={here ? F.get(here.item)?.en : 'empty'}>{here ? F.get(here.item)?.emoji : ''}</button>;
        })}
      </div>
      {msg && <div className="card tint-violet row" style={{ fontWeight: 800, fontSize: 19 }}><div className="grow">{msg}</div><button className="icon-btn" onClick={() => void speak(msg)}>🔊</button></div>}
      <div className="row wrap">
        <button className="btn violet small" disabled={!count} onClick={describeAll}>🗣️ Describe my room</button>
        {sel && placedIds.has(sel) && <button className="btn ghost small" onClick={() => { setDorm(dorm.filter((d) => d.item !== sel)); setSel(null); setMsg(''); }}>📦 Put away</button>}
      </div>
      <h3>My things</h3>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
        {FURNITURE.map((f) => {
          const owned = s.furniture.includes(f.id);
          return (
            <button key={f.id} className={`tile ${sel === f.id ? 'selected' : ''}`} style={{ minHeight: 92, fontSize: 14 }}
              onClick={() => {
                void speak(/s$/.test(f.en) ? f.en : `a ${f.en}`);
                if (owned) { setSel(f.id); setMsg(`Where do you want the ${f.en}? Tap the room!`); }
                else if (buy(f.id, f.price, 'furniture')) { sfx.coin(); setSel(f.id); setMsg(`You bought a ${f.en}! Now put it in your room.`); }
                else { sfx.wrong(); setMsg(`The ${f.en} costs ${f.price} ❤️. Play more to earn hearts!`); }
              }}>
              <span style={{ fontSize: 34 }}>{f.emoji}</span>{f.en}
              <span className="tiny muted">{owned ? (placedIds.has(f.id) ? 'in room' : 'owned') : `${f.price} ❤️`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
