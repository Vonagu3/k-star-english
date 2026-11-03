import type { Exercise } from '../content/schema';
import type { ExProps } from './common';
import { Flashcards, Gap, Listen, Memory, Sentence, Spell } from './Basic';
import { Draw, KCulture, Quiz, Read, Speak, Watch, Write } from './Skills';
import { Chant, Dance } from './Music';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MAP: Record<Exercise['type'], (p: ExProps<any>) => React.JSX.Element> = {
  flashcards: Flashcards, listen: Listen, memory: Memory, spell: Spell, sentence: Sentence, gap: Gap,
  read: Read, speak: Speak, draw: Draw, chant: Chant, dance: Dance, write: Write, watch: Watch, quiz: Quiz, kculture: KCulture,
};

export function ExerciseView(props: ExProps<Exercise>) {
  const C = MAP[props.ex.type];
  return <C {...props} />;
}

export const TYPE_LABEL: Record<Exercise['type'], { emoji: string; name: string }> = {
  flashcards: { emoji: '🃏', name: 'New words' }, listen: { emoji: '👂', name: 'Listen' }, memory: { emoji: '🧠', name: 'Memory' },
  spell: { emoji: '🔤', name: 'Spell' }, sentence: { emoji: '🧩', name: 'Sentences' }, gap: { emoji: '✏️', name: 'Gaps' },
  read: { emoji: '📖', name: 'Story' }, speak: { emoji: '🎤', name: 'Speak' }, draw: { emoji: '🎨', name: 'Draw' },
  chant: { emoji: '🎵', name: 'Chant' }, dance: { emoji: '💃', name: 'Dance' }, write: { emoji: '✍️', name: 'Write' },
  watch: { emoji: '📺', name: 'Watch' }, quiz: { emoji: '⏱️', name: 'Quiz show' }, kculture: { emoji: '🇰🇷', name: 'K-Culture' },
};
