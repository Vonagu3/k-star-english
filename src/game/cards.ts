// Collectible photocards of original fictional trainees.
import type { Look } from './catalog';

export type Rarity = 'common' | 'rare' | 'epic' | 'legend';
export type Card = { id: string; who: string; concept: string; rarity: Rarity; look: Look; line: string };

export const PEOPLE: Record<string, Look> = {
  Hana: { skin: '#ffe6d5', hair: 'long', hairColor: '#111111', eyes: 'sparkle', outfit: 'dress', outfitColor: '#ff8fc4', acc: 'bow', stick: 'heart', bg: 'pink' },
  Jun: { skin: '#ffd9c2', hair: 'short', hairColor: '#3b2a26', eyes: 'smile', outfit: 'jacket', outfitColor: '#222244', acc: 'none', stick: 'star', bg: 'night' },
  Sora: { skin: '#e8b48f', hair: 'buns', hairColor: '#8f7bff', eyes: 'star', outfit: 'track', outfitColor: '#2ec4b6', acc: 'clip', stick: 'round', bg: 'mint' },
  Leo: { skin: '#a8714d', hair: 'wavy', hairColor: '#111111', eyes: 'wink', outfit: 'hoodie', outfitColor: '#ffd23f', acc: 'cap', stick: 'star', bg: 'sunset' },
  Max: { skin: '#ffe6d5', hair: 'short', hairColor: '#c98a4b', eyes: 'sparkle', outfit: 'tee', outfitColor: '#ff4d4d', acc: 'headphones', stick: 'round', bg: 'pink' },
  Mina: { skin: '#ffd9c2', hair: 'pony', hairColor: '#ff7eb6', eyes: 'smile', outfit: 'jacket', outfitColor: '#7c5cff', acc: 'mic', stick: 'bunny', bg: 'galaxy' },
};

const CONCEPTS: { concept: string; rarity: Rarity; bg?: string; line: string }[] = [
  { concept: 'Hello!', rarity: 'common', line: 'Nice to meet you!' },
  { concept: 'School day', rarity: 'common', bg: 'mint', line: 'I love English!' },
  { concept: 'Dorm life', rarity: 'common', bg: 'sunset', line: 'This is my room.' },
  { concept: 'Practice', rarity: 'rare', bg: 'night', line: 'Practice makes perfect!' },
  { concept: 'Stage', rarity: 'epic', bg: 'galaxy', line: 'Thank you, fans!' },
  { concept: 'Paris', rarity: 'rare', bg: 'paris', line: 'Bonjour from Paris!' },
];

export const CARDS: Card[] = [];
for (const [who, look] of Object.entries(PEOPLE)) {
  for (const c of CONCEPTS) {
    CARDS.push({ id: `${who.toLowerCase()}-${c.concept.toLowerCase().replace(/[^a-z]+/g, '-')}`, who, concept: c.concept, rarity: c.rarity, look: { ...look, bg: c.bg ?? look.bg }, line: c.line });
  }
}
CARDS.push({ id: 'mina-debut', who: 'Coach Mina', concept: 'Debut Day', rarity: 'legend', look: { ...PEOPLE.Mina, outfit: 'dress', acc: 'crown', bg: 'galaxy' }, line: 'You did it, superstar!' });
CARDS.push({ id: 'team-debut', who: 'Star Academy', concept: 'Debut Day', rarity: 'legend', look: { ...PEOPLE.Hana, acc: 'crown', bg: 'galaxy', outfit: 'jacket', outfitColor: '#ffffff' }, line: 'Our debut stage!' });

/** Picks a card of the given rarity, preferring ones not yet owned. Epic falls back to rare pool if needed. */
export function pickCard(rarity: Rarity, owned: Record<string, number>, rand: number): Card {
  const pool = CARDS.filter((c) => c.rarity === rarity);
  const fresh = pool.filter((c) => !owned[c.id]);
  const list = fresh.length ? fresh : pool;
  return list[Math.floor(rand * list.length) % list.length];
}

export const RARITY_STYLE: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Common', color: '#9aa5b1' }, rare: { label: 'Rare', color: '#3fa7ff' },
  epic: { label: 'Epic', color: '#a259ff' }, legend: { label: 'Legend', color: '#ffb800' },
};
