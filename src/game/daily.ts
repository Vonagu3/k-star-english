// Daily Paris Mission: a new short mission every day, built only from words and phrases the child has met.
import { EPISODE_ORDER, WORDS, WORLDS } from '../content';
import type { Episode, Exercise } from '../content/schema';
import { numberFor, dayFor } from '../lib/util';

export const MISSIONS = [
  { title: "The baker's lost list", emoji: '🥐', story: 'Oh no! Luc the baker lost his shopping list. Help him find the things!', ru: 'Пекарь Люк потерял список покупок. Помоги ему!' },
  { title: 'Kitten on the roof', emoji: '🐱', story: 'A little kitten is on a roof in Montmartre. Answer the questions and save it!', ru: 'Котёнок застрял на крыше. Ответь на вопросы и спаси его!' },
  { title: 'The missing painting', emoji: '🖼️', story: 'A painting is missing from the museum! Find the clues.', ru: 'Из музея пропала картина! Найди подсказки.' },
  { title: 'Kite on the tower', emoji: '🪁', story: "Zoé's kite is stuck on the Eiffel Tower. Let's get it back!", ru: 'Воздушный змей Зоэ застрял на Эйфелевой башне!' },
  { title: 'Secret message', emoji: '✉️', story: 'Pip found a secret message. Spell the words to read it!', ru: 'Пип нашла секретное послание. Расшифруй его!' },
  { title: 'Lost puppy in the park', emoji: '🐶', story: 'A puppy is lost in the park. Listen carefully and find it!', ru: 'В парке потерялся щенок. Слушай внимательно!' },
  { title: 'Hero costume day', emoji: '🦸‍♀️', story: 'Today is costume day for the hero team. Get ready!', ru: 'Сегодня день костюмов команды героев. Готовься!' },
  { title: 'Boat on the river', emoji: '⛵', story: 'A little boat is floating away on the Seine. Quick, help!', ru: 'Лодочка уплывает по Сене. Скорее на помощь!' },
  { title: 'Street lamp rescue', emoji: '🏮', story: 'The street lamps are off! Fix them with the right words.', ru: 'Фонари погасли! Почини их правильными словами.' },
  { title: 'Concert in the square', emoji: '🎤', story: 'There is a concert in the square tonight. Help the singers!', ru: 'Вечером на площади концерт. Помоги певцам!' },
] as const;

/** Small seeded random generator (mulberry32) so a day always gives the same mission. */
export function rng(seedText: string) {
  let h = 1779033703;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pickN = <T,>(arr: readonly T[], n: number, r: () => number): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
};

type Item<T extends Exercise['type']> = Extract<Exercise, { type: T }>;

export type DailyMission = { id: string; day: string; mission: (typeof MISSIONS)[number]; episode: Episode };

/**
 * Builds the mission for `day`.
 * `learned` = word ids the child has met (spaced-repetition list); `doneEpisodes` = episodes finished with a star.
 * Paris world words and phrases are always in the pool, so a brand-new player gets a mission too.
 */
export function dailyMission(day: string, learned: string[], doneEpisodes: Set<string>): DailyMission {
  const r = rng(`kstar-daily-${day}`);
  const mission = MISSIONS[Math.floor(r() * MISSIONS.length)];
  const paris = WORLDS.find((w) => w.id === 'paris');
  const pictureable = (id: string) => { const w = WORDS.get(id); return !!w && !numberFor(w.en) && !dayFor(w.en) && !w.en.includes(' '); };
  const pool = [...new Set([...learned, ...(paris?.words.map((w) => w.id) ?? [])])].filter(pictureable);

  // Phrases from finished episodes + the Paris world.
  const sources = EPISODE_ORDER.filter((r) => doneEpisodes.has(r.episode.id) || r.world.id === 'paris').map((r) => r.episode);
  const sentences: Item<'sentence'>['items'] = [];
  const gaps: Item<'gap'>['items'] = [];
  const speaks: Item<'speak'>['items'] = [];
  for (const ep of sources) for (const ex of ep.exercises) {
    if (ex.type === 'sentence') sentences.push(...ex.items);
    if (ex.type === 'gap') gaps.push(...ex.items);
    if (ex.type === 'speak') speaks.push(...ex.items.filter((i) => !i.text.includes('{spell}')));
  }

  const words = pickN(pool, 10, r);
  const listenWords = words.slice(0, 4);
  const listen: Item<'listen'> = {
    type: 'listen', title: 'Listen and find it!',
    items: listenWords.map((id) => {
      const others = pickN(pool.filter((x) => x !== id && WORDS.get(x)!.emoji !== WORDS.get(id)!.emoji), 3, r);
      const opts = pickN([id, ...others], 4, r);
      return { say: WORDS.get(id)!.en, options: opts.map((o) => ({ emoji: WORDS.get(o)!.emoji })), answer: opts.indexOf(id) };
    }),
  };
  const memory: Item<'memory'> = { type: 'memory', title: 'Find the pairs!', words: words.slice(4, 8) };
  const spellable = words.filter((id) => /^[a-z]{3,8}$/i.test(WORDS.get(id)!.en));
  const spell: Item<'spell'> = { type: 'spell', title: 'Spell the secret words!', words: pickN(spellable.length >= 2 ? spellable : pool.filter((id) => /^[a-z]{3,8}$/i.test(WORDS.get(id)!.en)), 2, r) };
  const exercises: Exercise[] = [listen, memory];
  if (r() < 0.5 && gaps.length >= 2) exercises.push({ type: 'gap', title: 'Fill the gap!', items: pickN(gaps, 3, r) });
  else if (sentences.length >= 2) exercises.push({ type: 'sentence', title: 'Build the sentence!', items: pickN(sentences, 2, r) });
  exercises.push(spell);
  if (speaks.length) exercises.push({ type: 'speak', title: 'Say the hero words!', items: pickN(speaks, 2, r) });

  const id = `daily-${day}`;
  return { id, day, mission, episode: { id, title: mission.title, emoji: mission.emoji, kind: 'lesson', exercises } };
}

export const DAILY_BONUS = 30;
