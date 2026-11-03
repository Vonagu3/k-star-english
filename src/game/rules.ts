// Pure game rules: ranks, stars, rewards, unlocking, spaced repetition, streaks, quests.

export const RANKS = [
  { id: 'trainee1', name: 'Trainee ★1', fans: 0, cefr: 'Pre-A1' },
  { id: 'trainee2', name: 'Trainee ★2', fans: 1000, cefr: 'Pre-A1' },
  { id: 'trainee3', name: 'Trainee ★3', fans: 2500, cefr: 'Pre-A1' },
  { id: 'trainee4', name: 'Trainee ★4', fans: 5000, cefr: 'Pre-A1+' },
  { id: 'trainee5', name: 'Trainee ★5', fans: 9000, cefr: 'Pre-A1+' },
  { id: 'rookie', name: 'Rookie', fans: 15000, cefr: 'A1' },
  { id: 'idol', name: 'Idol', fans: 45000, cefr: 'A1+' },
  { id: 'superstar', name: 'Superstar', fans: 100000, cefr: 'A2' },
] as const;
export type Rank = (typeof RANKS)[number];

export function rankFor(fans: number): { rank: Rank; next: Rank | null; progress: number } {
  let i = 0;
  while (i + 1 < RANKS.length && fans >= RANKS[i + 1].fans) i++;
  const rank = RANKS[i];
  const next = RANKS[i + 1] ?? null;
  const progress = next ? (fans - rank.fans) / (next.fans - rank.fans) : 1;
  return { rank, next, progress };
}

export function starsFor(correct: number, total: number): 0 | 1 | 2 | 3 {
  if (total <= 0) return 3;
  const p = correct / total;
  if (p >= 0.9) return 3;
  if (p >= 0.7) return 2;
  if (p >= 0.4) return 1;
  return 0;
}

export type EpisodeKind = 'lesson' | 'weekly' | 'showcase' | 'debut';

export function rewardsFor(kind: EpisodeKind, correct: number, stars: number, firstTime: boolean) {
  const mult = { lesson: 1, weekly: 2, showcase: 3, debut: 5 }[kind];
  const bonus = { lesson: 50, weekly: 150, showcase: 400, debut: 1500 }[kind];
  const fans = correct * 10 * mult + (stars > 0 ? bonus : 0);
  const hearts = stars === 0 ? 0 : (firstTime ? { lesson: 10, weekly: 30, showcase: 80, debut: 200 }[kind] : 3) + stars * 3;
  return { fans, hearts };
}

/** Photocard rarity drop for a finished episode. `rand` is 0..1. */
export function cardDrop(kind: EpisodeKind, stars: number, firstTime: boolean, rand: number): 'common' | 'rare' | 'epic' | 'legend' | null {
  if (stars === 0) return null;
  if (kind === 'debut') return 'legend';
  if (kind === 'showcase' && firstTime) return 'epic';
  if (kind === 'weekly' && firstTime) return 'rare';
  if (kind === 'lesson' && stars === 3 && rand < 0.4) return 'common';
  if (rand < 0.15) return 'common';
  return null;
}

/** Unlocking: each episode needs the previous one in order done with ≥1 star; a new world needs the previous showcase ≥1 star, or a parent override. */
export function isUnlocked(
  index: number,
  order: { id: string; worldId: string; kind: EpisodeKind }[],
  stars: Record<string, number>,
  forcedWorlds: string[],
  bonusWorlds: string[] = [],
): boolean {
  if (index === 0) return true;
  const cur = order[index];
  const prev = order[index - 1];
  if (prev.worldId !== cur.worldId && bonusWorlds.includes(cur.worldId)) return true;
  if ((stars[prev.id] ?? 0) >= 1) return true;
  // First episode of a world opened by the parent.
  if (prev.worldId !== cur.worldId && forcedWorlds.includes(cur.worldId)) return true;
  // Inside a forced world, keep sequential rule (handled above).
  return false;
}

// ---- Spaced repetition (Leitner, 5 boxes) ----
export const BOX_DAYS = [0, 1, 2, 4, 7, 14];
export type SrsEntry = { box: number; due: number };
const DAY = 86400000;

export function srsUpdate(e: SrsEntry | undefined, correct: boolean, now: number): SrsEntry {
  const box = correct ? Math.min(5, (e?.box ?? 0) + 1) : 1;
  return { box, due: startOfDay(now) + BOX_DAYS[box] * DAY };
}
export const srsDue = (srs: Record<string, SrsEntry>, now: number) =>
  Object.entries(srs).filter(([, e]) => e.due <= now).sort((a, b) => a[1].box - b[1].box || a[1].due - b[1].due).map(([id]) => id);

export function startOfDay(ts: number) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
export const dayKey = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Monday-based ISO-ish week key, for the weekly streak freeze. */
export function weekKey(ts: number) {
  const d = new Date(startOfDay(ts));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(d.getTime());
}

/** Streak update when the child is active today. */
export function streakOnActive(s: { streak: number; lastActive: string | null; freezeWeek: string | null }, now: number) {
  const today = dayKey(now);
  if (s.lastActive === today) return s;
  const yesterday = dayKey(now - DAY);
  const dayBefore = dayKey(now - 2 * DAY);
  const wk = weekKey(now);
  if (s.lastActive === yesterday) return { streak: s.streak + 1, lastActive: today, freezeWeek: s.freezeWeek };
  if (s.lastActive === dayBefore && s.freezeWeek !== wk) return { streak: s.streak + 1, lastActive: today, freezeWeek: wk };
  return { streak: 1, lastActive: today, freezeWeek: s.freezeWeek };
}

// ---- Daily quests ----
export const QUEST_POOL = [
  { id: 'lesson1', text: 'Finish 1 episode', ru: 'Пройди 1 эпизод', goal: 1, metric: 'episodes' },
  { id: 'lesson2', text: 'Finish 2 episodes', ru: 'Пройди 2 эпизода', goal: 2, metric: 'episodes' },
  { id: 'warmup', text: 'Review 10 words in Warm-up', ru: 'Повтори 10 слов в разминке', goal: 10, metric: 'reviewed' },
  { id: 'stars3', text: 'Get 3 stars in an episode', ru: 'Получи 3 звезды за эпизод', goal: 1, metric: 'threeStars' },
  { id: 'sing', text: 'Sing a chant', ru: 'Спой речёвку', goal: 1, metric: 'chant' },
  { id: 'dance', text: 'Do a dance practice', ru: 'Потанцуй', goal: 1, metric: 'dance' },
  { id: 'draw', text: 'Draw a picture', ru: 'Нарисуй картинку', goal: 1, metric: 'draw' },
  { id: 'speak', text: 'Say 5 phrases aloud', ru: 'Скажи вслух 5 фраз', goal: 5, metric: 'spoken' },
  { id: 'notebook', text: 'Do a notebook mission', ru: 'Выполни задание в тетради', goal: 1, metric: 'notebook' },
  { id: 'fans', text: 'Earn 300 fans', ru: 'Набери 300 фанатов', goal: 300, metric: 'fans' },
] as const;
export type QuestMetric = (typeof QUEST_POOL)[number]['metric'];

/** Deterministic 3 quests for a given day (always includes an episode quest). */
export function questsForDay(day: string) {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const first = QUEST_POOL[h % 2];
  const rest = QUEST_POOL.slice(2);
  const a = rest[(h >>> 3) % rest.length];
  let b = rest[(h >>> 7) % rest.length];
  if (b.id === a.id) b = rest[((h >>> 7) + 1) % rest.length];
  return [first, a, b];
}
export const QUEST_REWARD = 20;
export const QUEST_CHEST = 50;
