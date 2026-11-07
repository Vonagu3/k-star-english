import { useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { motion, type TargetAndTransition } from 'framer-motion';
import { FURNITURE, type Surface } from '../game/catalog';
import { FLOOR_TOP, descendants, depth, en, heightOf, meta, surfaceBg, type Effect, type Placed } from '../game/dorm';

const EMOJI = new Map(FURNITURE.map((f) => [f.id, f.emoji]));

/** A one-off animation on an item (n changes every tap so the same effect can replay). */
export type Burst = { item: string; effect: Effect; pop?: string; n: number };

type Props = {
  items: Placed[];
  wall: Surface;
  floor: Surface;
  garden?: boolean;
  night: boolean;
  /** Items switched on (lamp, TV…). */
  lit: Set<string>;
  burst?: Burst | null;
  selected?: string | null;
  /** Newly placed item: it drops in from above. */
  fresh?: string | null;
  interactive?: boolean;
  onDrop?: (item: string, fx: number, fy: number) => void;
  onTap?: (item: string) => void;
  onWindow?: () => void;
  onBackground?: () => void;
};

type Drag = { item: string; sx: number; sy: number; w: number; h: number; dx: number; dy: number; moved: boolean };

/** Side view of one room of the dollhouse: wall with a window, floor, and freely placed things you can drag and tap. */
export default function DormScene({ items, wall, floor, garden, night, lit, burst, selected, fresh, interactive, onDrop, onTap, onWindow, onBackground }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const kids = drag ? descendants(drag.item, items) : new Set<string>();
  const sorted = [...items].sort((a, b) => depth(a, items) - depth(b, items));

  const down = (e: RPointerEvent, item: string) => {
    if (!interactive || !ref.current) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const r = ref.current.getBoundingClientRect();
    setDrag({ item, sx: e.clientX, sy: e.clientY, w: r.width, h: r.height, dx: 0, dy: 0, moved: false });
  };
  const move = (e: RPointerEvent) => {
    if (!drag) return;
    const px = e.clientX - drag.sx, py = e.clientY - drag.sy;
    setDrag({ ...drag, dx: (px / drag.w) * 100, dy: (py / drag.h) * 100, moved: drag.moved || Math.hypot(px, py) > 7 });
  };
  const up = () => {
    if (!drag) return;
    const p = items.find((o) => o.item === drag.item);
    if (p && drag.moved) onDrop?.(drag.item, p.fx + drag.dx, p.fy + drag.dy);
    else if (p) onTap?.(drag.item);
    setDrag(null);
  };

  return (
    <div ref={ref} className="dorm-scene" style={{ containerType: 'inline-size', pointerEvents: interactive ? undefined : 'none' } as CSSProperties} onClick={() => onBackground?.()}>
      {/* wall / sky */}
      <div style={{ position: 'absolute', inset: `0 0 ${100 - FLOOR_TOP}% 0`, background: garden ? (night ? 'linear-gradient(#141a3a, #3b2d6b)' : 'linear-gradient(#8fd3ff, #d9f2ff)') : surfaceBg(wall) }} />
      {garden ? (
        <button className="dorm-sky" aria-label={night ? 'The moon' : 'The sun'} onClick={(e) => { e.stopPropagation(); onWindow?.(); }}
          style={{ left: '78%', top: '6%', fontSize: '9cqw' }} disabled={!interactive}>{night ? '🌙' : '☀️'}</button>
      ) : (
        <button className="dorm-window" aria-label="The window" onClick={(e) => { e.stopPropagation(); onWindow?.(); }} disabled={!interactive}
          style={{ background: night ? 'radial-gradient(circle at 70% 30%, #fff6c9 0 6%, transparent 7%), radial-gradient(#fff 0.5px, transparent 1px) 0 0/9px 9px, #1d2457' : 'radial-gradient(ellipse at 30% 60%, #fff 0 18%, transparent 19%), linear-gradient(#7fcfff, #cdeeff)' }} />
      )}
      {/* floor */}
      <div style={{ position: 'absolute', inset: `${FLOOR_TOP}% 0 0 0`, background: surfaceBg(floor) }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(0,0,0,0.13), transparent 35%)' }} />
        {!garden && <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '1.4cqw', background: '#e2b98f' }} />}
      </div>
      {night && <div style={{ position: 'absolute', inset: 0, background: 'rgba(18, 16, 60, 0.42)', pointerEvents: 'none' }} />}

      {sorted.map((p) => {
        const m = meta(p.item);
        const dragging = drag && (drag.item === p.item || kids.has(p.item));
        const fx = p.fx + (dragging ? drag!.dx : 0), fy = p.fy + (dragging ? drag!.dy : 0);
        const on = lit.has(p.item);
        const b = burst && burst.item === p.item ? burst : null;
        const h = heightOf(p.item);
        return (
          <motion.div key={p.item} className="dorm-item"
            initial={fresh === p.item ? { left: `${fx}%`, top: '4%', opacity: 0 } : false}
            animate={{ left: `${fx}%`, top: `${fy}%`, opacity: 1 }}
            transition={dragging ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 24 }}
            style={{ zIndex: dragging ? 500 : Math.round(depth(p, items) * 2) + 2, cursor: interactive ? (dragging ? 'grabbing' : 'grab') : 'default' }}>
            {on && (m.kind !== 'wall') && (p.item === 'lamp'
              ? <div className="dorm-glow" style={{ width: '46cqw', height: '46cqw', bottom: `${-12}cqw` }} />
              : <div className="dorm-glow" style={{ width: '22cqw', height: '22cqw', bottom: `${h * 0.1}cqw`, background: 'radial-gradient(circle, rgba(140, 200, 255, 0.55), transparent 65%)' }} />)}
            <motion.button type="button" key={b ? `${p.item}-${b.n}` : p.item} aria-label={en(p.item)}
              onPointerDown={(e) => down(e, p.item)} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}
              onClick={(e) => e.stopPropagation()}
              animate={b ? ANIM[b.effect] ?? {} : {}} transition={{ duration: b?.effect === 'eat' ? 2.4 : b?.effect === 'fly' ? 1.8 : 0.7 }}
              className={`dorm-glyph ${selected === p.item ? 'sel' : ''}`}
              style={{ fontSize: `${m.size * 0.86}cqw`, filter: night && !on ? 'brightness(0.78)' : undefined, scaleX: p.flip ? -1 : 1 }}>
              {p.item === 'rug'
                ? <span style={{ display: 'block', width: `${m.size}cqw`, height: '3.4cqw', borderRadius: '50%', background: 'repeating-radial-gradient(ellipse, #c9a8ff 0 6%, #a98bff 6% 12%)', boxShadow: '0 0.4cqw 0 rgba(0,0,0,0.12)' }} />
                : EMOJI.get(p.item) ?? '❓'}
            </motion.button>
            {on && (p.item === 'tv' || p.item === 'computer') && <Particles key={`s${p.item}`} emojis={p.item === 'tv' ? '🎶💃🎤' : '✏️📚'} loop />}
            {b && PARTICLES[b.effect] && <Particles key={b.n} emojis={b.pop ?? PARTICLES[b.effect]!} down={b.effect === 'water'} />}
          </motion.div>
        );
      })}
    </div>
  );
}

const ANIM: Partial<Record<Effect, TargetAndTransition>> = {
  bounce: { y: [0, -28, 0, -10, 0] },
  grow: { scale: [1, 1.3, 1.15, 1] },
  eat: { scale: [1, 0.6, 0, 0, 1], opacity: [1, 1, 0, 0, 1] },
  fly: { y: [0, -120, -90, 0], rotate: [0, -10, 10, 0] },
  sparkle: { rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] },
  notes: { rotate: [0, -6, 6, -6, 0] },
  zzz: { rotate: [0, -3, 0] },
  open: { scale: [1, 1.08, 1] },
};
const PARTICLES: Partial<Record<Effect, string>> = {
  zzz: '💤💤💤', notes: '🎵🎶🎵', bubbles: '🫧🫧🫧', steam: '💨☁️💨', sparkle: '✨⭐✨', water: '💧💧💧', grow: '💧🌱', eat: '😋', open: '✨', glow: '', screen: '',
};

/** Little emoji that float up (or drip down) from an item and fade. */
function Particles({ emojis, down, loop }: { emojis: string; down?: boolean; loop?: boolean }) {
  const list = Array.from(emojis);
  return (
    <div style={{ position: 'absolute', left: '50%', bottom: '90%', pointerEvents: 'none' }}>
      {list.map((e, i) => (
        <motion.span key={i} style={{ position: 'absolute', fontSize: '4cqw', left: 0, top: 0 }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
          animate={{ x: (i - (list.length - 1) / 2) * 22, y: down ? [0, 60] : [0, -70], opacity: [0, 1, 0], scale: [0.6, 1.1, 0.9] }}
          transition={{ duration: 1.6, delay: i * 0.18, repeat: loop ? Infinity : 0, repeatDelay: 0.3 }}>{e}</motion.span>
      ))}
    </div>
  );
}
