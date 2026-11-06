// Seasonal events: a themed banner and limited shop items that can only be bought while the event runs.
import { SHOP, SHOP_BY_ID, type ShopItem, type Look } from './catalog';

export type GameEvent = {
  id: string; name: string; ru: string; emoji: string; from: string; to: string; // MM-DD, inclusive; may wrap the year
  colors: [string, string]; greeting: string; items: ShopItem[];
};

const it = (slot: keyof Look, value: string, name: string, price: number, emoji: string): ShopItem => ({ id: `${slot}:${value}`, slot, value, name, price, emoji });

export const EVENTS: GameEvent[] = [
  { id: 'autumn', name: 'Autumn Leaves Festival', ru: 'Осенний фестиваль', emoji: '🍂', from: '11-04', to: '12-14', colors: ['#ff9a5a', '#c65d1e'],
    greeting: 'The leaves are red and yellow. Let’s collect autumn treasures!',
    items: [it('bg', 'autumn', 'Autumn park', 220, '🍁'), it('acc', 'scarf', 'Cosy scarf', 140, '🧣'), it('pet', '🦔', 'Hedgehog', 320, '🦔'), it('fx', '🍂', 'Falling leaves', 260, '🍂')] },
  { id: 'winter', name: 'Winter Festival', ru: 'Зимний фестиваль и Новый год', emoji: '🎄', from: '12-15', to: '01-10', colors: ['#2a9d8f', '#1d3557'],
    greeting: 'Happy New Year! It’s snowing in Seoul and Paris!',
    items: [it('bg', 'xmas', 'Christmas tree', 300, '🎄'), it('acc', 'santa', 'Santa hat', 180, '🎅'), it('outfit', 'cosy', 'Snowflake jumper', 260, '🧶'), it('pet', '🦌', 'Little reindeer', 450, '🦌'), it('fx', '🎁', 'Gift rain', 380, '🎁')] },
  { id: 'valentine', name: 'Friendship Week', ru: 'Неделя дружбы (Валентинов день)', emoji: '💌', from: '02-07', to: '02-14', colors: ['#ff5f8f', '#ffb3cf'],
    greeting: 'Write a kind message to a friend this week!',
    items: [it('bg', 'love', 'Hearts room', 200, '💕'), it('acc', 'heartband', 'Heart headband', 150, '💗'), it('fx', '💌', 'Love letters', 260, '💌')] },
  { id: 'spring', name: 'Cherry Blossom Spring', ru: 'Весна и сакура', emoji: '🌸', from: '03-20', to: '04-20', colors: ['#ff9ec7', '#9be3c5'],
    greeting: 'Spring is here! The cherry trees are pink in Seoul!',
    items: [it('bg', 'spring', 'Spring garden', 220, '🌷'), it('acc', 'flowerpin', 'Blossom pin', 120, '🌸'), it('pet', '🐣', 'Little chick', 260, '🐣'), it('fx', '🌷', 'Tulip rain', 240, '🌷')] },
  { id: 'summer', name: 'Summer Splash', ru: 'Летний фестиваль', emoji: '🏖️', from: '06-20', to: '08-20', colors: ['#3fa7ff', '#ffd36e'],
    greeting: 'Sun, sea and ice cream! Let’s have a summer party!',
    items: [it('bg', 'pool', 'Pool party', 240, '🏊'), it('acc', 'sunhat', 'Sun hat', 160, '👒'), it('pet', '🦀', 'Little crab', 280, '🦀'), it('fx', '🍉', 'Watermelon fun', 220, '🍉')] },
  { id: 'chuseok', name: 'Chuseok Moon Festival', ru: 'Чусок — корейский праздник урожая', emoji: '🌕', from: '09-20', to: '10-10', colors: ['#2b2a6b', '#ffd36e'],
    greeting: 'Chuseok is a Korean harvest festival. Families eat songpyeon and look at the full moon!',
    items: [it('bg', 'moon', 'Full moon night', 260, '🌕'), it('pet', '🐇', 'Moon rabbit', 380, '🐇'), it('fx', '🏮', 'Lanterns', 300, '🏮')] },
  { id: 'halloween', name: 'Halloween Night', ru: 'Хэллоуин', emoji: '🎃', from: '10-20', to: '11-03', colors: ['#ff7b00', '#2b1a3d'],
    greeting: 'Trick or treat! Spooky but cute!',
    items: [it('bg', 'spooky', 'Spooky castle', 260, '🏰'), it('acc', 'pumpkin', 'Pumpkin hat', 160, '🎃'), it('outfit', 'witch', 'Little witch', 320, '🧙‍♀️'), it('pet', '🦇', 'Tiny bat', 300, '🦇'), it('fx', '👻', 'Friendly ghosts', 280, '👻')] },
];

export const BIRTHDAY_ITEMS: ShopItem[] = [it('acc', 'partyhat', 'Party hat', 100, '🥳'), it('bg', 'party', 'Birthday party', 180, '🎈'), it('fx', '🎉', 'Confetti', 200, '🎉')];

const md = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inRange = (x: string, from: string, to: string) => (from <= to ? x >= from && x <= to : x >= from || x <= to);

/** Event running on `date`, if any. */
export function activeEvent(date = new Date()): GameEvent | null {
  return EVENTS.find((e) => inRange(md(date), e.from, e.to)) ?? null;
}

/** Next event after `date` and days until it starts. */
export function nextEvent(date = new Date()): { event: GameEvent; days: number } {
  for (let i = 1; i <= 366; i++) {
    const d = new Date(date.getTime() + i * 86400000);
    const e = EVENTS.find((x) => x.from === md(d));
    if (e) return { event: e, days: i };
  }
  return { event: EVENTS[0], days: 0 };
}

/** Birthday week: 3 days before to 3 days after the date (MM-DD). */
export function isBirthdayWeek(birthday: string | null | undefined, date = new Date()) {
  if (!birthday) return false;
  const [m, d] = birthday.split('-').map(Number);
  const bd = new Date(date.getFullYear(), m - 1, d).getTime();
  return Math.abs(date.getTime() - bd) <= 3.5 * 86400000;
}
export const isBirthdayToday = (birthday: string | null | undefined, date = new Date()) => !!birthday && md(date) === birthday;

/** Every event / birthday item, so owned ones can be worn all year. */
export const ALL_EVENT_ITEMS = [...EVENTS.flatMap((e) => e.items), ...BIRTHDAY_ITEMS];
// Make them known to the shop catalogue (looked up by id for ownership and goals), marked as not normally sold.
for (const i of ALL_EVENT_ITEMS) {
  if (SHOP.some((x) => x.id === i.id)) continue;
  const item: ShopItem = { ...i, event: true };
  SHOP.push(item);
  SHOP_BY_ID.set(item.id, item);
}
