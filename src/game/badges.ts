// Achievement badges: computed from the saved state, awarded once with a small hearts reward.
import type { GameState } from './store';
import { EPISODE_ORDER } from '../content';
import { SHOP, rarityOf } from './catalog';
import { CARDS } from './cards';

export type Badge = { id: string; emoji: string; name: string; ru: string; reward: number; progress: (s: GameState) => [number, number] };

const doneEps = (s: GameState, kind?: string) => EPISODE_ORDER.filter((r) => (s.progress[r.episode.id]?.stars ?? 0) > 0 && (!kind || r.episode.kind === kind)).length;
const threeStars = (s: GameState) => Object.entries(s.progress).filter(([k, v]) => v.stars === 3 && !k.startsWith('daily-')).length;
const dailies = (s: GameState) => Object.entries(s.progress).filter(([k, v]) => k.startsWith('daily-') && v.stars > 0).length;
const words = (s: GameState) => new Set([...Object.keys(s.srs), ...Object.keys(s.wordsSeen ?? {})]).size;
const known = (s: GameState) => Object.values(s.srs).filter((e) => e.box >= 4).length;
const paid = (s: GameState) => SHOP.filter((i) => i.price > 0 && s.inventory.includes(i.id));
const total = (s: GameState, k: keyof NonNullable<GameState['totals']>) => s.totals?.[k] ?? 0;
const worldDone = (s: GameState, id: string) => { const eps = EPISODE_ORDER.filter((r) => r.world.id === id); return [eps.filter((r) => (s.progress[r.episode.id]?.stars ?? 0) > 0).length, eps.length] as [number, number]; };

const b = (id: string, emoji: string, name: string, ru: string, reward: number, progress: Badge['progress']): Badge => ({ id, emoji, name, ru, reward, progress });

export const BADGES: Badge[] = [
  b('first-step', '👣', 'First step', 'Пройди первый эпизод', 10, (s) => [doneEps(s), 1]),
  b('eps-10', '🎬', 'Busy trainee', 'Пройди 10 эпизодов', 30, (s) => [doneEps(s), 10]),
  b('eps-30', '🎥', 'Hard worker', 'Пройди 30 эпизодов', 60, (s) => [doneEps(s), 30]),
  b('eps-60', '🏆', 'Unstoppable', 'Пройди 60 эпизодов', 120, (s) => [doneEps(s), 60]),
  b('stars-10', '⭐', 'Star collector', '10 эпизодов на 3 звезды', 40, (s) => [threeStars(s), 10]),
  b('stars-30', '🌟', 'Perfectionist', '30 эпизодов на 3 звезды', 100, (s) => [threeStars(s), 30]),
  b('streak-3', '🔥', 'On fire', 'Занимайся 3 дня подряд', 20, (s) => [s.streak.streak, 3]),
  b('streak-7', '🔥', 'One week streak', '7 дней подряд', 50, (s) => [s.streak.streak, 7]),
  b('streak-30', '💎', 'Diamond streak', '30 дней подряд', 200, (s) => [s.streak.streak, 30]),
  b('words-50', '📗', '50 words', 'Узнай 50 слов', 30, (s) => [words(s), 50]),
  b('words-150', '📘', '150 words', 'Узнай 150 слов', 80, (s) => [words(s), 150]),
  b('words-300', '📚', 'Word master', 'Узнай 300 слов', 150, (s) => [words(s), 300]),
  b('known-50', '🧠', 'Big memory', '50 слов выучены «на отлично» в разминке', 80, (s) => [known(s), 50]),
  b('warmup-200', '🏋️', 'Warm-up hero', 'Повтори 200 слов в разминке', 60, (s) => [total(s, 'reviewed'), 200]),
  b('singer-10', '🎤', 'Singer', 'Спой 10 речёвок', 40, (s) => [total(s, 'chant'), 10]),
  b('dancer-10', '💃', 'Dancer', 'Станцуй 10 танцев', 40, (s) => [total(s, 'dance'), 10]),
  b('artist-10', '🎨', 'Artist', 'Нарисуй 10 рисунков', 40, (s) => [total(s, 'draw'), 10]),
  b('speaker-100', '🗣️', 'Chatterbox', 'Скажи вслух 100 фраз', 60, (s) => [total(s, 'spoken'), 100]),
  b('notebook-10', '📓', 'Neat writer', 'Выполни 10 заданий в тетради', 50, (s) => [total(s, 'notebook'), 10]),
  b('daily-7', '🗼', 'Paris regular', 'Выполни 7 миссий дня', 50, (s) => [dailies(s), 7]),
  b('daily-30', '🦸‍♀️', 'Hero of Paris', 'Выполни 30 миссий дня', 150, (s) => [dailies(s), 30]),
  b('showcase-1', '🎪', 'First showcase', 'Пройди первый Showcase', 50, (s) => [doneEps(s, 'showcase'), 1]),
  b('world-1', '🎤', 'Seoul Studio star', 'Пройди весь мир 1', 80, (s) => worldDone(s, 'world1')),
  b('world-2', '🏠', 'Dorm star', 'Пройди весь мир 2', 80, (s) => worldDone(s, 'world2')),
  b('world-3', '💃', 'Practice Room star', 'Пройди весь мир 3', 80, (s) => worldDone(s, 'world3')),
  b('paris', '🐞', 'Paris hero', 'Пройди весь мир Paris', 100, (s) => worldDone(s, 'paris')),
  b('debut', '🌟', 'DEBUT!', 'Пройди Debut Stage', 300, (s) => [doneEps(s, 'debut'), 1]),
  b('cards-10', '🃏', 'Collector', 'Собери 10 фотокарточек', 40, (s) => [Object.keys(s.cards).length, 10]),
  b('cards-all', '💌', 'Complete album', 'Собери все фотокарточки', 300, (s) => [Object.keys(s.cards).length, CARDS.length]),
  b('shop-1', '🛍️', 'First buy', 'Купи первую вещь', 10, (s) => [paid(s).length, 1]),
  b('shop-20', '👗', 'Fashionista', 'Купи 20 вещей', 60, (s) => [paid(s).length, 20]),
  b('legend', '👑', 'Legendary style', 'Купи Legend-вещь', 100, (s) => [paid(s).filter((i) => rarityOf(i.price) === 'legend').length, 1]),
];

export const isEarned = (bd: Badge, s: GameState) => { const [cur, goal] = bd.progress(s); return cur >= goal; };
/** Badges earned now but not yet recorded. */
export const newBadges = (s: GameState) => BADGES.filter((bd) => !s.badges?.[bd.id] && isEarned(bd, s));
