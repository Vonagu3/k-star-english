// Dollhouse dorm: free placement in a side-view room, items fall onto the floor or onto other furniture,
// and every position is described in simple English (on, under, next to, between, in front of, behind, above).
import { FURNITURE, ROOMS, type DormPlacement, type Surface } from './catalog';

export const surfaceBg = (s: Surface) => (s.pattern ? `${s.pattern}, ${s.color}` : s.color);

/** Scene geometry, in % of the room scene (width for x, height for y). The scene is ASPECT times wider than tall. */
export const ASPECT = 1.6;
export const FLOOR_TOP = 64; // wall above, floor band below
export const FLOOR_BOTTOM = 96;

export type ItemKind = 'floor' | 'wall' | 'air';
/** size: glyph width in % of scene width; surface: where its top is, as a fraction of its height (furniture you can put things on);
 *  legs: small things on the floor below it are "under" it. */
export type ItemMeta = { size: number; kind: ItemKind; surface?: number; legs?: boolean };

const M: Record<string, Partial<ItemMeta>> = {
  bed: { size: 24, surface: 0.5, legs: true }, desk: { size: 15, surface: 0.92, legs: true }, chair: { size: 11, surface: 0.5 },
  sofa: { size: 24, surface: 0.55 }, table: { size: 17, surface: 0.8, legs: true }, piano: { size: 19, surface: 0.95, legs: true },
  tv: { size: 15, surface: 0.95 }, fridge: { size: 15, surface: 1 }, cooker: { size: 14, surface: 0.95 }, sink: { size: 12, surface: 0.85 },
  bath: { size: 22, surface: 0.55 }, toilet: { size: 12, surface: 0.6 }, shower: { size: 14 }, books: { size: 8, surface: 1 },
  computer: { size: 10 }, guitar: { size: 11 }, microphone: { size: 8 }, plant: { size: 11 }, teddy: { size: 9 }, cat: { size: 10 },
  dog: { size: 11 }, rabbit: { size: 9 }, ball: { size: 7 }, headphones: { size: 7 }, cake: { size: 8 }, lightstick: { size: 7 },
  rug: { size: 22 }, eiffel: { size: 11 }, croissant: { size: 7 }, ladybird: { size: 6 }, kettle: { size: 7 }, fruit: { size: 7 },
  pizza: { size: 8 }, cupcakes: { size: 7 }, toothbrush: { size: 6 }, soap: { size: 6 }, duck: { size: 7 }, lamp: { size: 8 },
  tree: { size: 30 }, flowers: { size: 10 }, sunflower: { size: 12 }, bike: { size: 18 }, swing: { size: 22 }, tent: { size: 24 },
  poster: { size: 12, kind: 'wall' }, clock: { size: 9, kind: 'wall' }, mirror: { size: 10, kind: 'wall' }, balloon: { size: 9, kind: 'air' },
};
export const meta = (id: string): ItemMeta => ({ size: 9, kind: 'floor', ...M[id] });
/** Glyph height in % of scene height. */
export const heightOf = (id: string) => (id === 'rug' ? 4 : meta(id).size * ASPECT * 0.92); // the rug lies flat

/** A placement with free coordinates filled in: fx = centre x (% of width), fy = bottom y (% of height). */
export type Placed = DormPlacement & { fx: number; fy: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const roomOf = (p: DormPlacement) => p.room ?? 'bedroom';

/** Old saves only have grid cells (6 × 4): map them into the scene. Wall items go onto the wall. */
export function normalize(p: DormPlacement): Placed {
  if (p.fx !== undefined && p.fy !== undefined) return p as Placed;
  const fx = ((p.x + 0.5) / 6) * 88 + 6;
  const k = meta(p.item).kind;
  const fy = k === 'wall' ? 30 + Math.min(p.y, 1) * 12 : k === 'air' ? 40 : FLOOR_TOP + 6 + p.y * 8;
  return { ...p, fx, fy };
}

/** Grid cell kept in sync with free coordinates, so older app versions can still show the item. */
export const toCell = (fx: number, fy: number) => ({
  x: clamp(Math.round(((fx - 6) / 88) * 6 - 0.5), 0, 5),
  y: clamp(Math.round((fy - FLOOR_TOP - 6) / 8), 0, 3),
});

/** Top of a support's surface (y, % of height), or null if you can't put things on it. */
export function surfaceTop(p: Placed): number | null {
  const s = meta(p.item).surface;
  return s === undefined ? null : p.fy - heightOf(p.item) * s;
}

/** Items resting on `id`, directly or on top of each other. */
export function descendants(id: string, all: Placed[]): Set<string> {
  const out = new Set<string>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of all) if (p.on && (p.on === id || out.has(p.on)) && !out.has(p.item)) { out.add(p.item); grew = true; }
  }
  return out;
}

/** Where a dropped item comes to rest: wall items stay on the wall, others fall onto the highest
 *  surface below the drop point, or onto the floor. `others` are the items in the same room. */
export function settle(item: string, fx: number, fy: number, others: Placed[]): { fx: number; fy: number; on?: string } {
  const m = meta(item);
  const h = heightOf(item);
  fx = clamp(fx, m.size / 2, 100 - m.size / 2);
  if (m.kind === 'wall') return { fx, fy: clamp(fy, h + 2, FLOOR_TOP - 2) };
  if (m.kind === 'air') return { fx, fy: clamp(fy, h + 2, FLOOR_BOTTOM) };
  const skip = descendants(item, others);
  let best: { top: number; id: string } | null = null;
  for (const o of others) {
    if (o.item === item || skip.has(o.item)) continue;
    const top = surfaceTop(o);
    if (top === null || Math.abs(fx - o.fx) > meta(o.item).size * 0.42) continue;
    if (top < fy - 6) continue; // surface is above where we let go
    if (!best || top < best.top) best = { top, id: o.item };
  }
  if (best && (fy < FLOOR_TOP + 2 || best.top <= fy + 1)) return { fx, fy: best.top, on: best.id };
  return { fx, fy: clamp(fy, FLOOR_TOP + 4, FLOOR_BOTTOM) };
}

/** Drawing order: wall things at the back, floor things by depth, things on furniture just above it. */
export function depth(p: Placed, all: Placed[], guard = 0): number {
  const k = meta(p.item).kind;
  if (k === 'wall') return 0;
  if (meta(p.item).size >= 20 && p.item === 'rug') return 1; // the rug lies flat under everything
  if (p.on && guard < 8) {
    const s = all.find((o) => o.item === p.on);
    if (s) return depth(s, all, guard + 1) + 0.5;
  }
  return p.fy + (k === 'air' ? 100 : 0);
}

// ---------------- English descriptions ----------------
const F = new Map(FURNITURE.map((f) => [f.id, f]));
export const en = (id: string) => F.get(id)?.en ?? id;
const plural = (w: string) => /s$/.test(w) && !/(bus|glass)$/.test(w);
const the = (id: string) => `the ${en(id)}`;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
export const roomName = (id: string) => ROOMS.find((r) => r.id === id)?.en ?? id;

export function describe(p: Placed, all: Placed[]): string {
  const same = all.filter((o) => roomOf(o) === roomOf(p) && o.item !== p.item);
  const be = plural(en(p.item)) ? 'are' : 'is';
  const X = cap(the(p.item));
  const m = meta(p.item);
  if (p.on) return `${X} ${be} on ${the(p.on)}.`;
  if (m.kind === 'wall') {
    const below = same.filter((o) => meta(o.item).kind === 'floor' && !o.on && Math.abs(o.fx - p.fx) < (meta(o.item).size + m.size) / 2);
    return below.length ? `${X} ${be} on the wall above ${the(below[0].item)}.` : `${X} ${be} on the wall.`;
  }
  if (m.kind === 'air') return `${X} ${be} in the air!`;
  const floor = same.filter((o) => meta(o.item).kind === 'floor' && !o.on && o.item !== 'rug');
  const over = floor.find((o) => meta(o.item).legs && m.size <= 11 && Math.abs(p.fx - o.fx) < meta(o.item).size * 0.38 && Math.abs(p.fy - o.fy) < 7);
  if (over) return `${X} ${be} under ${the(over.item)}.`;
  const level = floor.filter((o) => Math.abs(o.fy - p.fy) < 8);
  const gap = (o: Placed) => Math.abs(o.fx - p.fx) - (meta(o.item).size + m.size) / 2;
  const near = (o: Placed) => gap(o) < 9;
  const left = level.filter((o) => o.fx < p.fx && near(o)).sort((a, b) => b.fx - a.fx)[0];
  const right = level.filter((o) => o.fx > p.fx && near(o)).sort((a, b) => a.fx - b.fx)[0];
  if (left && right) return `${X} ${be} between ${the(left.item)} and ${the(right.item)}.`;
  const overlapX = floor.filter((o) => Math.abs(o.fx - p.fx) < (meta(o.item).size + m.size) * 0.35 && Math.abs(o.fy - p.fy) >= 8);
  const behindOf = overlapX.find((o) => o.fy > p.fy);
  if (behindOf) return `${X} ${be} behind ${the(behindOf.item)}.`;
  const frontOf = overlapX.find((o) => o.fy < p.fy);
  if (frontOf) return `${X} ${be} in front of ${the(frontOf.item)}.`;
  if (left || right) return `${X} ${be} next to ${the((left ?? right)!.item)}.`;
  const rug = same.find((o) => o.item === 'rug' && Math.abs(o.fx - p.fx) < meta('rug').size / 2 && Math.abs(o.fy - p.fy) < 6);
  if (rug) return `${X} ${be} on the rug.`;
  const a = plural(en(p.item)) ? 'some' : /^[aeiou]/i.test(en(p.item)) ? 'an' : 'a';
  return `There ${be} ${a} ${en(p.item)} in the ${roomName(roomOf(p))}.`;
}

// ---------------- House layout (dollhouse cross-section) ----------------
/** Column / row of each room: two floors of the house, the garden next to it on the ground floor. */
export const LAYOUT: Record<string, { col: number; row: number }> = {
  bedroom: { col: 0, row: 0 }, bathroom: { col: 1, row: 0 },
  living: { col: 0, row: 1 }, kitchen: { col: 1, row: 1 }, garden: { col: 2, row: 1 },
};
export type Dir = 'left' | 'right' | 'up' | 'down';
export function neighbour(room: string, dir: Dir): string | null {
  const at = LAYOUT[room];
  if (!at) return null;
  const want = { col: at.col + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0), row: at.row + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0) };
  return Object.entries(LAYOUT).find(([, v]) => v.col === want.col && v.row === want.row)?.[0] ?? null;
}

// ---------------- Things to do with items (tap) ----------------
export type Effect = 'glow' | 'zzz' | 'notes' | 'bubbles' | 'steam' | 'bounce' | 'grow' | 'eat' | 'open' | 'sparkle' | 'water' | 'screen' | 'fly';
/** Tapping an item: an effect and an English sentence. `toggle` items stay on/off; `off` is said when switching off. */
export type Action = { effect: Effect; say: string; off?: string; toggle?: boolean; pop?: string };
export const ACTIONS: Record<string, Action> = {
  lamp: { effect: 'glow', say: 'I turn on the lamp.', off: 'I turn off the lamp.', toggle: true },
  tv: { effect: 'screen', say: 'The TV is on. It is a K-pop video!', off: 'I turn off the TV.', toggle: true },
  computer: { effect: 'screen', say: 'I do my homework on the computer.', off: 'I turn off the computer.', toggle: true },
  fridge: { effect: 'open', say: 'I open the fridge. There is milk, cheese and juice.', pop: '🥛🧀🧃' },
  bed: { effect: 'zzz', say: 'Time to sleep. Good night!' },
  sofa: { effect: 'bounce', say: 'I sit on the sofa and relax.' },
  chair: { effect: 'bounce', say: 'I sit on the chair.' },
  cat: { effect: 'bounce', say: 'The cat says meow!' }, dog: { effect: 'bounce', say: 'The dog says woof woof!' },
  rabbit: { effect: 'bounce', say: 'The rabbit can jump!' }, teddy: { effect: 'bounce', say: 'I love my teddy!' },
  ladybird: { effect: 'fly', say: 'The ladybird can fly!' }, duck: { effect: 'bounce', say: 'Quack quack! The duck is yellow.' },
  piano: { effect: 'notes', say: 'I play the piano.' }, guitar: { effect: 'notes', say: 'I play the guitar.' },
  microphone: { effect: 'notes', say: 'I sing a song!' }, headphones: { effect: 'notes', say: 'I listen to music.' },
  lightstick: { effect: 'sparkle', say: 'I wave my lightstick at the concert!' }, mirror: { effect: 'sparkle', say: 'I look in the mirror. I am a star!' },
  cooker: { effect: 'steam', say: 'I cook breakfast.', pop: '🍳' }, kettle: { effect: 'steam', say: 'I make a cup of tea.' },
  sink: { effect: 'water', say: 'I wash the dishes.' }, shower: { effect: 'water', say: 'I have a shower.' },
  bath: { effect: 'bubbles', say: 'I have a bath. Bubbles!' }, soap: { effect: 'bubbles', say: 'I wash my hands.' },
  toothbrush: { effect: 'bubbles', say: 'I brush my teeth.' }, toilet: { effect: 'water', say: 'Flush!' },
  cake: { effect: 'eat', say: 'Yummy! I eat the cake.' }, cupcakes: { effect: 'eat', say: 'Yummy cupcakes!' }, pizza: { effect: 'eat', say: 'I eat a slice of pizza.' },
  croissant: { effect: 'eat', say: 'I eat a croissant for breakfast.' }, fruit: { effect: 'eat', say: 'I eat an apple. Apples are healthy.' },
  plant: { effect: 'grow', say: 'I water the plant.' }, flowers: { effect: 'grow', say: 'I water the flowers.' },
  sunflower: { effect: 'grow', say: 'The sunflower is tall and yellow.' }, tree: { effect: 'grow', say: 'The tree is big and green.' },
  ball: { effect: 'bounce', say: 'I kick the ball.' }, balloon: { effect: 'fly', say: 'The balloon flies up!' },
  books: { effect: 'open', say: 'I read a book.', pop: '📖' }, bike: { effect: 'bounce', say: 'I ride my bike.' },
  swing: { effect: 'bounce', say: 'Wheee! I go down the slide.' }, tent: { effect: 'open', say: 'I sleep in the tent.', pop: '🔦' },
  poster: { effect: 'sparkle', say: 'This is a poster of my favourite band.' }, eiffel: { effect: 'sparkle', say: 'This is the Eiffel Tower. It is in Paris.' },
  desk: { effect: 'open', say: 'I do my homework at the desk.', pop: '✏️' }, table: { effect: 'open', say: 'We have dinner at the table.', pop: '🍽️' },
  rug: { effect: 'sparkle', say: 'The rug is soft.' },
};
const HOURS = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
/** "It's half past three." — the clock says the real time, to the nearest quarter. */
export function clockSay(d: Date): string {
  let h = d.getHours() % 12; const q = Math.round(d.getMinutes() / 15) % 4;
  if (d.getMinutes() >= 53) h = (h + 1) % 12;
  const H = HOURS[h], next = HOURS[(h + 1) % 12];
  return q === 0 ? `It's ${H} o'clock.` : q === 1 ? `It's quarter past ${H}.` : q === 2 ? `It's half past ${H}.` : `It's quarter to ${next}.`;
}
export const actionFor = (id: string): Action => (id === 'clock' ? { effect: 'bounce', say: clockSay(new Date()) } : ACTIONS[id] ?? { effect: 'bounce', say: `This is my ${en(id)}.` });
