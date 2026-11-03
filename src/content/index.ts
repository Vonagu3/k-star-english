import type { Episode, World, Word } from './schema';

const modules = import.meta.glob<{ default: World }>('./stage1/world*.json', { eager: true });
export const WORLDS: World[] = Object.values(modules).map((m) => m.default).sort((a, b) => a.n - b.n);

export const WORDS = new Map<string, Word>();
for (const w of WORLDS) for (const word of w.words) if (!WORDS.has(word.id)) WORDS.set(word.id, word);

export type EpisodeRef = { episode: Episode; world: World; week?: number; index: number };

/** Linear order of all episodes in Stage 1 (used for unlocking). */
export const EPISODE_ORDER: EpisodeRef[] = [];
for (const world of WORLDS) {
  for (const wk of world.weeks) for (const ep of wk.episodes) EPISODE_ORDER.push({ episode: ep, world, week: wk.n, index: EPISODE_ORDER.length });
  EPISODE_ORDER.push({ episode: world.showcase, world, index: EPISODE_ORDER.length });
  if (world.finale) EPISODE_ORDER.push({ episode: world.finale, world, index: EPISODE_ORDER.length });
}
export const EPISODES = new Map(EPISODE_ORDER.map((r) => [r.episode.id, r]));

/** Word ids introduced (via flashcards) in an episode. */
export function episodeWords(ep: Episode): string[] {
  const ids = new Set<string>();
  for (const ex of ep.exercises) if (ex.type === 'flashcards') ex.words.forEach((w) => ids.add(w));
  return [...ids];
}
