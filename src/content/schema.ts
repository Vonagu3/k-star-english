import { z } from 'zod';

/** A vocabulary item. `id` is a lowercase slug, unique across ALL worlds (e.g. "mum", "living-room"). */
export const Word = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  en: z.string().min(1),
  ru: z.string().min(1),
  emoji: z.string().min(1),
  level: z.enum(['starters', 'movers', 'flyers', 'extra']).default('starters'),
});
export type Word = z.infer<typeof Word>;

/** A choice shown as a tile: an emoji, a text, or both. */
export const Option = z.object({ emoji: z.string().optional(), text: z.string().optional() })
  .refine((o) => o.emoji || o.text, 'option needs emoji or text');
export type Option = z.infer<typeof Option>;

const Question = z.object({
  q: z.string(),
  options: z.array(z.string()).min(2).max(4),
  answer: z.number().int().min(0),
});
export type Question = z.infer<typeof Question>;

export const DANCE_MOVES = [
  'hands-up', 'hands-down', 'clap', 'jump', 'turn-left', 'turn-right',
  'step-left', 'step-right', 'wave', 'spin', 'finger-heart', 'pose',
] as const;
export const DanceMove = z.enum(DANCE_MOVES);
export type DanceMove = z.infer<typeof DanceMove>;

const base = { title: z.string().optional() };

export const Exercise = z.discriminatedUnion('type', [
  // Learn new words: picture + British voice. `words` are word ids.
  z.object({ ...base, type: z.literal('flashcards'), words: z.array(z.string()).min(2) }),
  // Hear a word/phrase, tap the right picture/text.
  z.object({ ...base, type: z.literal('listen'), items: z.array(z.object({
    say: z.string(), options: z.array(Option).min(2).max(4), answer: z.number().int().min(0),
  })).min(1) }),
  // Memory pairs: word <-> picture.
  z.object({ ...base, type: z.literal('memory'), words: z.array(z.string()).min(3).max(8) }),
  // Spell a word from letter tiles (picture + voice given).
  z.object({ ...base, type: z.literal('spell'), words: z.array(z.string()).min(1) }),
  // Put word tiles in order. Sentence is split on spaces; punctuation stays attached.
  z.object({ ...base, type: z.literal('sentence'), items: z.array(z.object({
    sentence: z.string(), ru: z.string().optional(), emoji: z.string().optional(),
  })).min(1) }),
  // Choose the word for the gap. `text` contains exactly one "___".
  z.object({ ...base, type: z.literal('gap'), items: z.array(z.object({
    text: z.string().includes('___'), options: z.array(z.string()).min(2).max(4),
    answer: z.number().int().min(0), emoji: z.string().optional(), ru: z.string().optional(),
  })).min(1) }),
  // Read a short original story, answer questions.
  z.object({ ...base, type: z.literal('read'), story: z.object({
    title: z.string(), emoji: z.string(), paragraphs: z.array(z.string()).min(1),
  }), questions: z.array(Question).min(1) }),
  // Say it aloud (speech recognition or recording).
  z.object({ ...base, type: z.literal('speak'), items: z.array(z.object({
    text: z.string(), ru: z.string().optional(), emoji: z.string().optional(),
  })).min(1) }),
  // Draw what you read; drawing goes to the parent.
  z.object({ ...base, type: z.literal('draw'), prompt: z.string(), ru: z.string().optional(), emoji: z.string().optional() }),
  // K-pop style chant on a beat: lines highlighted, then sing with gaps (`blanks` are words removed in round 2).
  z.object({ ...base, type: z.literal('chant'), bpm: z.number().int().min(70).max(140).default(100),
    lines: z.array(z.string()).min(2), blanks: z.array(z.string()).min(1) }),
  // Read dance instructions, build the choreography, avatar performs it.
  z.object({ ...base, type: z.literal('dance'), items: z.array(z.object({
    text: z.string(), moves: z.array(DanceMove).min(1).max(4),
  })).min(1) }),
  // Short writing with sentence starters; goes to the parent.
  z.object({ ...base, type: z.literal('write'), prompt: z.string(), ru: z.string().optional(),
    starters: z.array(z.string()).min(1), minWords: z.number().int().min(3).default(10) }),
  // Watch an external free video, then answer.
  z.object({ ...base, type: z.literal('watch'), videoTitle: z.string(), url: z.string().url(),
    source: z.string(), questions: z.array(Question).min(1) }),
  // Timed speed quiz over these word ids.
  z.object({ ...base, type: z.literal('quiz'), words: z.array(z.string()).min(4), seconds: z.number().int().min(20).max(120).default(45) }),
  // Notebook mission: the child writes on paper, then photographs the page for the parent.
  // `steps` are short English instructions; `model` is an example / text to copy; `lines` is the expected amount (lines in the notebook).
  z.object({ ...base, type: z.literal('notebook'), task: z.string(), ru: z.string().optional(), emoji: z.string().optional(),
    steps: z.array(z.string()).min(1).max(6), model: z.string().optional(), lines: z.number().int().min(1).max(20).default(5) }),
  // K-Culture corner: simple English text about Korea + a bonus Korean word.
  z.object({ ...base, type: z.literal('kculture'), emoji: z.string(), text: z.array(z.string()).min(1),
    korean: z.object({ ko: z.string(), roman: z.string(), en: z.string() }).optional(),
    questions: z.array(Question).min(1) }),
]);
export type Exercise = z.infer<typeof Exercise>;
export type ExerciseType = Exercise['type'];

export const Episode = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  emoji: z.string(),
  kind: z.enum(['lesson', 'weekly', 'showcase', 'debut']),
  exercises: z.array(Exercise).min(3),
});
export type Episode = z.infer<typeof Episode>;

export const Week = z.object({
  n: z.number().int(),
  title: z.string(),
  episodes: z.array(Episode).min(1),
});
export type Week = z.infer<typeof Week>;

export const World = z.object({
  id: z.string(),
  n: z.number().int(),
  title: z.string(),
  subtitle: z.string(),
  ru: z.string(),
  emoji: z.string(),
  color: z.string(),
  grammar: z.array(z.string()),
  words: z.array(Word).min(20),
  weeks: z.array(Week).min(1),
  showcase: Episode,
  finale: Episode.optional(),
  /** Bonus worlds sit outside the main path: open from the start, sequential inside. */
  bonus: z.boolean().optional(),
});
export type World = z.infer<typeof World>;
