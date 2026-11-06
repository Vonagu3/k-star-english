import { useMemo, useState } from 'react';
import TopBar from '../components/TopBar';
import { DORM_COLS, DORM_ROWS, FLOORS, FURNITURE, ROOMS, WALLS, type DormPlacement, type Surface } from '../game/catalog';
import { useGame } from '../game/store';
import { speak } from '../lib/tts';
import { sfx } from '../lib/sfx';

const F = new Map(FURNITURE.map((f) => [f.id, f]));
const R = new Map(ROOMS.map((r) => [r.id, r]));
const roomOf = (p: DormPlacement) => p.room ?? 'bedroom';
const en = (id: string) => F.get(id)?.en ?? id;
const plural = (w: string) => /s$/.test(w) && !/(bus|glass)$/.test(w);
const the = (id: string) => `the ${en(id)}`;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Where an item is, relative to its neighbours in the same room (A1 grammar: next to, between, in front of, behind, in). */
function describe(p: DormPlacement, all: DormPlacement[]): string {
  const same = all.filter((o) => roomOf(o) === roomOf(p));
  const at = (x: number, y: number) => same.find((o) => o.x === x && o.y === y);
  const be = plural(en(p.item)) ? 'are' : 'is';
  const room = R.get(roomOf(p))!.en;
  const l = at(p.x - 1, p.y); const r = at(p.x + 1, p.y);
  if (l && r) return `${cap(the(p.item))} ${be} between ${the(l.item)} and ${the(r.item)}.`;
  if (l || r) return `${cap(the(p.item))} ${be} next to ${the((l ?? r)!.item)}.`;
  const back = at(p.x, p.y - 1); const front = at(p.x, p.y + 1);
  if (back) return `${cap(the(p.item))} ${be} in front of ${the(back.item)}.`;
  if (front) return `${cap(the(p.item))} ${be} behind ${the(front.item)}.`;
  const a = plural(en(p.item)) ? 'some' : /^[aeiou]/.test(en(p.item)) ? 'an' : 'a';
  return `There ${be} ${a} ${en(p.item)} in the ${room}.`;
}

function surfaceStyle(s: Surface) { return s.pattern ? `${s.pattern}, ${s.color}` : s.color; }

/** Trainee dorm: several rooms to unlock, walls and floors, furniture; every move is described in English. */
export default function Dorm() {
  const s = useGame((g) => g.s);
  const update = useGame((g) => g.update);
  const buy = useGame((g) => g.buy);
  const [room, setRoom] = useState('bedroom');
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'things' | 'walls' | 'floors'>('things');
  const dorm = useMemo(() => s.profile?.dorm ?? [], [s.profile?.dorm]);
  const style = s.profile?.dormStyle?.[room] ?? { wall: 'cream', floor: room === 'garden' ? 'grass' : 'wood' };
  const wall = WALLS.find((w) => w.id === style.wall) ?? WALLS[0];
  const floor = FLOORS.find((f) => f.id === style.floor) ?? FLOORS[0];
  const owns = (id: string) => s.furniture.includes(id);
  const roomOpen = (id: string) => R.get(id)!.price === 0 || owns(`room:${id}`);
  const setDorm = (d: DormPlacement[]) => update((x) => ({ ...x, profile: { ...x.profile!, dorm: d } }));
  const here = dorm.filter((d) => roomOf(d) === room);
  const say = (t: string) => { setMsg(t); void speak(t); };

  const tapCell = (x: number, y: number) => {
    const item = here.find((d) => d.x === x && d.y === y);
    if (sel) {
      sfx.tap();
      const next = dorm.filter((d) => d.item !== sel && !(roomOf(d) === room && d.x === x && d.y === y));
      const placed = [...next, { item: sel, x, y, room }];
      setDorm(placed); say(describe({ item: sel, x, y, room }, placed)); setSel(null);
    } else if (item) { say(describe(item, dorm)); setSel(item.item); }
  };
  const describeAll = () => {
    const r = R.get(room)!;
    const parts = [`This is my ${r.en}.`, here.length ? `There ${here.length === 1 ? 'is one thing' : `are ${here.length} things`} in the ${r.en}.` : `The ${r.en} is empty.`, ...here.map((d) => describe(d, dorm))];
    say(parts.join(' '));
  };
  const setStyle = (kind: 'wall' | 'floor', sf: Surface) => {
    const id = `${kind}:${sf.id}`;
    if (sf.price > 0 && !owns(id)) {
      if (!buy(id, sf.price, 'furniture')) { sfx.wrong(); setMsg(`${sf.name} costs ${sf.price} ❤️. Play more to earn hearts!`); return; }
      sfx.coin();
    }
    update((x) => ({ ...x, profile: { ...x.profile!, dormStyle: { ...x.profile!.dormStyle, [room]: { ...style, [kind]: sf.id } } } }));
  };

  return (
    <div className="page col">
      <TopBar />
      <h1 className="title-xl">🏠 My Trainee Dorm</h1>
      <div className="row wrap" style={{ gap: 6 }}>
        {ROOMS.map((r) => (
          <button key={r.id} className="chip" style={{ borderColor: room === r.id ? 'var(--pink)' : undefined, background: room === r.id ? 'var(--pink-soft)' : undefined, opacity: roomOpen(r.id) ? 1 : 0.7 }}
            onClick={() => { setRoom(r.id); setSel(null); setMsg(''); void speak(`the ${r.en}`); }}>
            {roomOpen(r.id) ? r.emoji : '🔒'} {r.en}
          </button>
        ))}
      </div>
      {!roomOpen(room) ? (
        <div className="card center col" style={{ alignItems: 'center' }}>
          <div style={{ fontSize: 64 }}>{R.get(room)!.emoji}</div>
          <h2 className="title-l">The {R.get(room)!.en} is locked</h2>
          <div className="muted">{cap(R.get(room)!.ru)} — открой её за сердечки и обставь как хочешь!</div>
          <button className="btn sun" onClick={() => { if (buy(`room:${room}`, R.get(room)!.price, 'furniture')) { sfx.levelUp(); say(`Welcome to your new ${R.get(room)!.en}!`); } else { sfx.wrong(); setMsg(`You need ${R.get(room)!.price} ❤️.`); } }}>
            🔓 Open for {R.get(room)!.price} ❤️
          </button>
          {msg && <div className="small" style={{ fontWeight: 800 }}>{msg}</div>}
        </div>
      ) : (
        <>
          <div className="muted small">Выбери вещь внизу и нажми на место в комнате — послушай, где она стоит!</div>
          <div className="dorm-grid" style={{ gridTemplateColumns: `repeat(${DORM_COLS}, 1fr)`, background: `linear-gradient(transparent 0 0), ${surfaceStyle(floor)}`, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '26%', background: surfaceStyle(wall), borderRadius: '20px 20px 0 0' }} />
            {Array.from({ length: DORM_ROWS * DORM_COLS }, (_, k) => {
              const x = k % DORM_COLS; const y = Math.floor(k / DORM_COLS);
              const it = here.find((d) => d.x === x && d.y === y);
              return <button key={k} className={`dorm-cell ${it && sel === it.item ? 'sel' : ''}`} style={{ position: 'relative' }} onClick={() => tapCell(x, y)} aria-label={it ? en(it.item) : 'empty'}>{it ? F.get(it.item)?.emoji : ''}</button>;
            })}
          </div>
          {msg && <div className="card tint-violet row" style={{ fontWeight: 800, fontSize: 19 }}><div className="grow">{msg}</div><button className="icon-btn" onClick={() => void speak(msg)}>🔊</button></div>}
          <div className="row wrap">
            <button className="btn violet small" onClick={describeAll}>🗣️ Describe my {R.get(room)!.en}</button>
            {sel && dorm.some((d) => d.item === sel) && <button className="btn ghost small" onClick={() => { setDorm(dorm.filter((d) => d.item !== sel)); setSel(null); setMsg(''); }}>📦 Put away</button>}
          </div>
          <div className="row" style={{ gap: 6 }}>
            {(['things', 'walls', 'floors'] as const).map((t) => <button key={t} className="chip" style={{ borderColor: tab === t ? 'var(--pink)' : undefined }} onClick={() => setTab(t)}>{t === 'things' ? '🧸 Things' : t === 'walls' ? '🎨 Walls' : '🟫 Floors'}</button>)}
          </div>
          {tab === 'things' && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
              {FURNITURE.map((f) => {
                const placed = dorm.find((d) => d.item === f.id);
                return (
                  <button key={f.id} className={`tile ${sel === f.id ? 'selected' : ''}`} style={{ minHeight: 92, fontSize: 14 }}
                    onClick={() => {
                      void speak(plural(f.en) ? f.en : `a ${f.en}`);
                      if (owns(f.id) || f.price === 0) { setSel(f.id); setMsg(`Where do you want the ${f.en}? Tap the room!`); }
                      else if (buy(f.id, f.price, 'furniture')) { sfx.coin(); setSel(f.id); setMsg(`You bought ${plural(f.en) ? 'some' : 'a'} ${f.en}! Now put it in your room.`); }
                      else { sfx.wrong(); setMsg(`The ${f.en} costs ${f.price} ❤️. Play more to earn hearts!`); }
                    }}>
                    <span style={{ fontSize: 34 }}>{f.emoji}</span>{f.en}
                    <span className="tiny muted">{owns(f.id) || f.price === 0 ? (placed ? `in the ${R.get(roomOf(placed))!.en}` : 'owned') : `${f.price} ❤️`}</span>
                  </button>
                );
              })}
            </div>
          )}
          {tab !== 'things' && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
              {(tab === 'walls' ? WALLS : FLOORS).map((sf) => {
                const kind = tab === 'walls' ? 'wall' : 'floor';
                const on = style[kind] === sf.id;
                const owned = sf.price === 0 || owns(`${kind}:${sf.id}`);
                return (
                  <button key={sf.id} className={`tile ${on ? 'good' : ''}`} style={{ minHeight: 92, fontSize: 14 }} onClick={() => setStyle(kind, sf)}>
                    <span style={{ width: 44, height: 30, borderRadius: 8, background: surfaceStyle(sf), border: '2px solid #ddd' }} />
                    {sf.name}
                    <span className="tiny muted">{on ? '✓' : owned ? 'owned' : `${sf.price} ❤️`}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
