import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TopBar from '../components/TopBar';
import DormScene, { type Burst } from '../components/DormScene';
import Avatar from '../components/Avatar';
import { FLOORS, FURNITURE, ROOMS, WALLS, type DormPlacement, type Look, type Surface } from '../game/catalog';
import { PEOPLE } from '../game/cards';
import {
  CHAR_SIZE, FLOOR_TOP, FRIENDS, FRIEND_LIKES, FRIEND_PRICE, LAYOUT, actionFor, charAction, describe, descendants, en, handPos, isChar, neighbour, normalize,
  roomName, settle, surfaceBg, toCell, type Dir, type Placed,
} from '../game/dorm';
import { useGame } from '../game/store';
import { speak } from '../lib/tts';
import { sfx } from '../lib/sfx';

const R = new Map(ROOMS.map((r) => [r.id, r]));
const roomOf = (p: DormPlacement) => p.room ?? 'bedroom';
const plural = (w: string) => /s$/.test(w) && !/(bus|glass)$/.test(w);
const ARROW: Record<Dir, string> = { left: '◀️', right: '▶️', up: '🔼', down: '🔽' };
const DIR_SAY: Record<Dir, string> = { left: 'left', right: 'right', up: 'upstairs', down: 'downstairs' };

/** Writes free coordinates together with the grid cell older app versions understand. */
const save = (p: Placed): DormPlacement => {
  const out: DormPlacement = { ...p, ...toCell(p.fx, p.fy) };
  if (!out.on) delete out.on;
  if (!out.flip) delete out.flip;
  return out;
};

/** Trainee dorm as a dollhouse: a side view of the house, rooms you scroll between, things you drag anywhere and tap to use. */
export default function Dorm() {
  const s = useGame((g) => g.s);
  const update = useGame((g) => g.update);
  const buy = useGame((g) => g.buy);
  const [view, setView] = useState<'house' | 'room'>('house');
  const [room, setRoom] = useState('bedroom');
  const [dir, setDir] = useState<Dir>('right');
  const [sel, setSel] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'friends' | 'things' | 'walls' | 'floors'>('things');
  const [night, setNight] = useState(false);
  const [lit, setLit] = useState<Set<string>>(new Set());
  const [burst, setBurst] = useState<Burst | null>(null);
  const [chats, setChats] = useState(0);

  const dorm = useMemo(() => (s.profile?.dorm ?? []).map(normalize), [s.profile?.dorm]);
  const styleOf = (id: string) => s.profile?.dormStyle?.[id] ?? { wall: 'cream', floor: id === 'garden' ? 'grass' : 'wood' };
  const wallOf = (id: string) => WALLS.find((w) => w.id === styleOf(id).wall) ?? WALLS[0];
  const floorOf = (id: string) => FLOORS.find((f) => f.id === styleOf(id).floor) ?? FLOORS[0];
  const owns = (id: string) => s.furniture.includes(id);
  const roomOpen = (id: string) => R.get(id)!.price === 0 || owns(`room:${id}`);
  const setDorm = (d: Placed[]) => update((x) => ({ ...x, profile: { ...x.profile!, dorm: d.map(save) } }));
  const here = dorm.filter((d) => roomOf(d) === room);
  const myName = s.profile?.name || 'me';
  const looks = useMemo(() => {
    const out: Record<string, Look> = Object.fromEntries(Object.entries(PEOPLE).map(([k, v]) => [`char:${k}`, v]));
    if (s.profile?.look) out['char:me'] = s.profile.look;
    return out;
  }, [s.profile?.look]);
  const hasCard = (who: string) => Object.entries(s.cards).some(([k, v]) => v > 0 && k.startsWith(`${who.toLowerCase()}-`));
  const friendOpen = (who: string) => FRIEND_PRICE[who] === 0 || owns(`char:${who}`) || hasCard(who);
  const say = (t: string) => { setMsg(t); void speak(t); };

  /** Things that rested on removed / moved-away items fall down again. */
  const resettle = (list: Placed[], gone: string[]): Placed[] => {
    let out = list;
    for (const p of list) {
      if (!p.on || !gone.includes(p.on)) continue;
      const others = out.filter((o) => roomOf(o) === roomOf(p) && o.item !== p.item);
      const at = settle(p.item, p.fx, p.fy, others);
      out = out.map((o) => (o.item === p.item ? { ...o, fx: at.fx, fy: at.fy, on: at.on } : o));
    }
    return out;
  };

  /** Held things are stored at the holder's hand. */
  const syncHeld = (list: Placed[]): Placed[] => list.map((o) => {
    const c = isChar(o.on) ? list.find((x) => x.item === o.on) : undefined;
    return c ? { ...o, ...handPos(c) } : o;
  });

  const drop = (item: string, fx: number, fy: number) => {
    const p = dorm.find((d) => d.item === item);
    if (!p) return;
    const others = here.filter((o) => o.item !== item);
    const at = settle(item, fx, fy, others);
    const kids = descendants(item, here);
    const dx = at.fx - p.fx, dy = at.fy - p.fy;
    let next = dorm.map((o) => (o.item === item ? { ...o, fx: at.fx, fy: at.fy, on: at.on } : kids.has(o.item) ? { ...o, fx: o.fx + dx, fy: o.fy + dy } : o));
    // One thing per hand: what the character held before falls down next to them.
    if (isChar(at.on)) {
      const old = next.find((o) => o.on === at.on && o.item !== item);
      if (old) {
        const rest = next.filter((o) => roomOf(o) === room && o.item !== old.item && !isChar(o.item));
        const o2 = settle(old.item, at.fx + CHAR_SIZE, FLOOR_TOP + 8, rest);
        next = next.map((o) => (o.item === old.item ? { ...o, ...o2 } : o));
      }
    }
    next = syncHeld(next);
    sfx.pop();
    setDorm(next);
    setSel(item); setFresh(null);
    const moved = next.find((o) => o.item === item)!;
    say(describe(moved, next));
  };

  const tap = (tapped: string) => {
    const holder = here.find((o) => o.item === tapped)?.on;
    const item = isChar(holder) ? holder : tapped; // a thing in someone's hand: they use it
    setSel(tapped);
    if (isChar(item)) {
      const c = here.find((o) => o.item === item);
      if (!c) return;
      const a = charAction(c, here, chats, myName);
      setChats(chats + 1);
      if (a.effect === 'notes') sfx.melody(); else if (a.effect === 'bubbles') sfx.splash(); else sfx.pop();
      setBurst({ item, effect: a.effect, n: Date.now(), say: a.say, move: a.move });
      say(a.say);
      return;
    }
    const a = actionFor(item);
    if (a.toggle) {
      const on = !lit.has(item);
      const n = new Set(lit); if (on) n.add(item); else n.delete(item);
      setLit(n); sfx.tap();
      say(on ? a.say : a.off ?? a.say);
      return;
    }
    if (a.effect === 'notes') sfx.melody();
    else if (a.effect === 'water' || a.effect === 'bubbles') sfx.splash();
    else if (a.effect === 'sparkle') sfx.card();
    else sfx.boing();
    setBurst({ item, effect: a.effect, pop: a.pop, n: Date.now() });
    say(a.say);
  };

  const window_ = () => {
    const n = !night; setNight(n); sfx.card();
    say(n ? (room === 'garden' ? 'It is night. Look at the moon and the stars!' : 'It is night. It is dark outside.') : 'Good morning! The sun is shining.');
  };

  const place = (id: string) => {
    const others = here.filter((o) => o.item !== id);
    const at = settle(id, 35 + Math.random() * 30, FLOOR_TOP + 14, others);
    const old = dorm.find((d) => d.item === id);
    let next = dorm.filter((d) => d.item !== id);
    if (old) next = resettle(next, [id]);
    next = syncHeld([...next, { item: id, x: 0, y: 0, room, fx: at.fx, fy: at.fy, on: at.on }]);
    setDorm(next); setSel(id); setFresh(id); sfx.pop();
    if (isChar(id)) {
      const line = id === 'char:me' ? `I am in the ${roomName(room)}!` : `Hi! I'm ${en(id)}. ${FRIEND_LIKES[en(id)] ?? ''}`;
      setBurst({ item: id, n: Date.now(), say: line, move: 'wave' });
      say(`${line} Drag ${id === 'char:me' ? 'me' : en(id)} to the sofa or to the bed!`);
      return;
    }
    say(`${old && roomOf(old) !== room ? `I move the ${en(id)} to the ${roomName(room)}. ` : ''}Drag the ${en(id)} anywhere you like!`);
  };

  const putAway = () => {
    if (!sel) return;
    setDorm(resettle(dorm.filter((d) => d.item !== sel), [sel]));
    say(isChar(sel) ? (sel === 'char:me' ? 'Bye-bye! See you later!' : `Bye-bye, ${en(sel)}! See you later!`) : `I put the ${en(sel)} in the box.`); setSel(null);
  };
  const flip = () => {
    if (!sel) return;
    sfx.tap();
    setDorm(dorm.map((d) => (d.item === sel ? { ...d, flip: !d.flip } : d)));
  };

  const go = (d: Dir) => {
    const n = neighbour(room, d);
    if (!n) return;
    setDir(d); setRoom(n); setSel(null); setFresh(null); setMsg('');
    void speak(`I go ${DIR_SAY[d]}. This is the ${roomName(n)}.`);
  };
  const openRoom = (id: string) => { setRoom(id); setView('room'); setSel(null); setFresh(null); setMsg(''); void speak(`the ${roomName(id)}`); };

  const describeAll = () => {
    const r = R.get(room)!;
    const things = here.filter((d) => !isChar(d.item)).length;
    const parts = [`This is my ${r.en}.`, things ? `There ${things === 1 ? 'is one thing' : `are ${things} things`} in the ${r.en}.` : `The ${r.en} is empty.`, ...here.map((d) => describe(d, dorm))];
    say(parts.join(' '));
  };
  const setStyle = (kind: 'wall' | 'floor', sf: Surface) => {
    const id = `${kind}:${sf.id}`;
    if (sf.price > 0 && !owns(id)) {
      if (!buy(id, sf.price, 'furniture')) { sfx.wrong(); setMsg(`${sf.name} costs ${sf.price} ❤️. Play more to earn hearts!`); return; }
      sfx.coin();
    }
    update((x) => ({ ...x, profile: { ...x.profile!, dormStyle: { ...x.profile!.dormStyle, [room]: { ...styleOf(room), [kind]: sf.id } } } }));
  };
  const unlock = (id: string) => {
    if (buy(`room:${id}`, R.get(id)!.price, 'furniture')) { sfx.levelUp(); say(`Welcome to your new ${roomName(id)}!`); }
    else { sfx.wrong(); setMsg(`You need ${R.get(id)!.price} ❤️.`); }
  };

  const scene = (id: string, interactive: boolean) => (
    <DormScene items={dorm.filter((d) => roomOf(d) === id)} wall={wallOf(id)} floor={floorOf(id)} garden={id === 'garden'} night={night} lit={lit} looks={looks}
      interactive={interactive} burst={interactive ? burst : null} selected={interactive ? sel : null} fresh={interactive ? fresh : null}
      onDrop={drop} onTap={tap} onWindow={window_} onBackground={() => setSel(null)} />
  );

  // ---------------- House overview ----------------
  if (view === 'house') {
    const cell = (col: number, row: number) => Object.entries(LAYOUT).find(([, v]) => v.col === col && v.row === row)?.[0];
    return (
      <div className="page col">
        <TopBar />
        <h1 className="title-xl">🏠 My Trainee Dorm</h1>
        <div className="muted small">Нажми на комнату, чтобы зайти и обставить её. Тапни на окно — наступит ночь!</div>
        <div className="card" style={{ padding: 10, background: night ? 'linear-gradient(#141a3a, #3b2d6b)' : 'linear-gradient(#bfe6ff, #eef9ff)' }}>
          <div className="dorm-house">
            <div className="dorm-roof">🌟</div>
            <div style={{ display: 'grid', placeItems: 'end center', fontSize: 'clamp(22px, 5vw, 40px)' }}>{night ? '🌙' : '☁️'}</div>
            {[0, 1].flatMap((row) => [0, 1, 2].map((col) => {
              const id = cell(col, row);
              if (!id) return <div key={`${col}-${row}`} />;
              const open = roomOpen(id);
              return (
                <div key={id} role="button" tabIndex={0} className="dorm-room-btn" onClick={() => openRoom(id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openRoom(id); }}
                  aria-label={roomName(id)} style={{ marginLeft: col === 2 ? 6 : 0, cursor: 'pointer' }}>
                  {scene(id, false)}
                  {!open && <div className="lock">🔒 {R.get(id)!.en}<br />{R.get(id)!.price} ❤️</div>}
                  {open && <div className="tiny" style={{ position: 'absolute', left: 6, top: 4, fontWeight: 800, background: 'rgba(255,255,255,0.85)', borderRadius: 999, padding: '0 6px' }}>{R.get(id)!.emoji} {R.get(id)!.en}</div>}
                </div>
              );
            }))}
          </div>
          <div style={{ height: 10, background: '#7bd06c', borderRadius: '0 0 10px 10px' }} />
        </div>
        <div className="row wrap">
          <button className="btn violet small" onClick={window_}>{night ? '☀️ Morning' : '🌙 Night'}</button>
          <button className="btn small" onClick={() => openRoom(room)}>🚪 Go to the {roomName(room)}</button>
        </div>
        {msg && <div className="card tint-violet small" style={{ fontWeight: 800 }}>{msg}</div>}
      </div>
    );
  }

  // ---------------- One room ----------------
  const open = roomOpen(room);
  const r = R.get(room)!;
  const slide = { left: -1, right: 1, up: 0, down: 0 }[dir] * 60;
  const lift = { up: -1, down: 1, left: 0, right: 0 }[dir] * 40;
  return (
    <div className="page col">
      <TopBar />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn ghost small" onClick={() => { setView('house'); setSel(null); }}>🏠 House</button>
        <h1 className="title-l" style={{ margin: 0 }}>{r.emoji} {r.en}</h1>
        <div className="row" style={{ gap: 4 }}>
          {(['up', 'down'] as const).map((d) => neighbour(room, d) && <button key={d} className="icon-btn" aria-label={DIR_SAY[d]} onClick={() => go(d)}>{ARROW[d]}</button>)}
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={room} initial={{ opacity: 0, x: slide, y: lift }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: -slide, y: -lift }} transition={{ duration: 0.22 }}>
            {open ? scene(room, true) : (
              <div className="dorm-scene" style={{ display: 'grid', placeItems: 'center', background: surfaceBg(wallOf(room)) }}>
                <div className="col center" style={{ alignItems: 'center', gap: 6, padding: 8 }}>
                  <div style={{ fontSize: 48 }}>{r.emoji}</div>
                  <strong>The {r.en} is locked</strong>
                  <div className="muted small">{r.ru[0].toUpperCase() + r.ru.slice(1)} — открой её за сердечки!</div>
                  <button className="btn sun small" onClick={() => unlock(room)}>🔓 Open for {r.price} ❤️</button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        {neighbour(room, 'left') && <button className="icon-btn dorm-nav" style={{ left: 4 }} aria-label="left" onClick={() => go('left')}>{ARROW.left}</button>}
        {neighbour(room, 'right') && <button className="icon-btn dorm-nav" style={{ right: 4 }} aria-label="right" onClick={() => go('right')}>{ARROW.right}</button>}
      </div>

      {open && (
        <>
          <div className="muted small">Перетаскивай вещи пальцем: на пол, на стол, на кровать. Тапни на вещь — она оживёт! Друзей можно усадить на диван, уложить спать, дать им в руки торт или гитару.</div>
          {msg && <div className="card tint-violet row" style={{ fontWeight: 800, fontSize: 19 }}><div className="grow">{msg}</div><button className="icon-btn" onClick={() => void speak(msg)}>🔊</button></div>}
          <div className="row wrap">
            <button className="btn violet small" onClick={describeAll}>🗣️ Describe my {r.en}</button>
            {sel && here.some((d) => d.item === sel) && (
              <>
                <button className="btn ghost small" onClick={flip}>🔄 Flip</button>
                <button className="btn ghost small" onClick={putAway}>{isChar(sel) ? '👋 Go home' : '📦 Put away'}</button>
              </>
            )}
          </div>
          <div className="row" style={{ gap: 6 }}>
            {(['friends', 'things', ...(room === 'garden' ? [] : ['walls']), 'floors'] as const).map((t) => (
              <button key={t} className="chip" style={{ borderColor: tab === t ? 'var(--pink)' : undefined }} onClick={() => setTab(t as typeof tab)}>
                {t === 'friends' ? '👫 Friends' : t === 'things' ? '🧸 Things' : t === 'walls' ? '🎨 Walls' : '🟫 Floors'}
              </button>
            ))}
          </div>
          {tab === 'things' && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
              {FURNITURE.map((f) => {
                const placed = dorm.find((d) => d.item === f.id);
                return (
                  <button key={f.id} className={`tile ${sel === f.id ? 'selected' : ''}`} style={{ minHeight: 92, fontSize: 14 }}
                    onClick={() => {
                      void speak(plural(f.en) ? f.en : `a ${f.en}`);
                      if (owns(f.id) || f.price === 0) place(f.id);
                      else if (buy(f.id, f.price, 'furniture')) { sfx.coin(); place(f.id); }
                      else { sfx.wrong(); setMsg(`The ${f.en} costs ${f.price} ❤️. Play more to earn hearts!`); }
                    }}>
                    <span style={{ fontSize: 34 }}>{f.emoji}</span>{f.en}
                    <span className="tiny muted">{owns(f.id) || f.price === 0 ? (placed ? `in the ${roomName(roomOf(placed))}` : 'owned') : `${f.price} ❤️`}</span>
                  </button>
                );
              })}
            </div>
          )}
          {tab === 'friends' && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
              {['me', ...FRIENDS].map((who) => {
                const id = `char:${who}`;
                const open = who === 'me' || friendOpen(who);
                const placed = dorm.find((d) => d.item === id);
                const price = FRIEND_PRICE[who] ?? 0;
                return (
                  <button key={id} className={`tile ${sel === id ? 'selected' : ''}`} style={{ minHeight: 120, fontSize: 14, opacity: open ? 1 : 0.75 }}
                    onClick={() => {
                      if (open) { place(id); return; }
                      if (buy(id, price, 'furniture')) { sfx.coin(); place(id); }
                      else { sfx.wrong(); setMsg(`Get a ${who} card in a lesson, or invite ${who} for ${price} ❤️.`); }
                    }}>
                    <span style={{ lineHeight: 0, filter: open ? undefined : 'grayscale(0.8)' }}>{looks[id] && <Avatar look={{ ...looks[id], pet: 'none', fx: 'none' }} size={48} showBg={false} showStick={false} />}</span>
                    {who === 'me' ? `⭐ ${myName}` : who}
                    <span className="tiny muted">{open ? (placed ? `in the ${roomName(roomOf(placed))}` : 'invite') : `🃏 or ${price} ❤️`}</span>
                  </button>
                );
              })}
            </div>
          )}
          {(tab === 'walls' || tab === 'floors') && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
              {(tab === 'walls' ? WALLS : FLOORS).map((sf) => {
                const kind = tab === 'walls' ? 'wall' : 'floor';
                const on = styleOf(room)[kind] === sf.id;
                const owned = sf.price === 0 || owns(`${kind}:${sf.id}`);
                return (
                  <button key={sf.id} className={`tile ${on ? 'good' : ''}`} style={{ minHeight: 92, fontSize: 14 }} onClick={() => setStyle(kind, sf)}>
                    <span style={{ width: 44, height: 30, borderRadius: 8, background: surfaceBg(sf), border: '2px solid #ddd' }} />
                    {sf.name}
                    <span className="tiny muted">{on ? '✓' : owned ? 'owned' : `${sf.price} ❤️`}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
      {!open && msg && <div className="card tint-violet small" style={{ fontWeight: 800 }}>{msg}</div>}
    </div>
  );
}
