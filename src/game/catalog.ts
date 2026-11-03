// Avatar parts, shop items and dorm furniture. All original designs.
export type Look = {
  skin: string; hair: string; hairColor: string; eyes: string;
  outfit: string; outfitColor: string; acc: string; stick: string; bg: string;
};

export const DEFAULT_LOOK: Look = {
  skin: '#ffd9c2', hair: 'bob', hairColor: '#3b2a26', eyes: 'sparkle',
  outfit: 'hoodie', outfitColor: '#ff8fc4', acc: 'none', stick: 'heart', bg: 'pink',
};

export type ShopItem = { id: string; slot: keyof Look; value: string; name: string; price: number; emoji: string };

const s = (slot: keyof Look, value: string, name: string, price: number, emoji: string): ShopItem => ({ id: `${slot}:${value}`, slot, value, name, price, emoji });

export const SHOP: ShopItem[] = [
  s('skin', '#ffe6d5', 'Light', 0, '🙂'), s('skin', '#ffd9c2', 'Peach', 0, '🙂'), s('skin', '#e8b48f', 'Tan', 0, '🙂'), s('skin', '#a8714d', 'Brown', 0, '🙂'),
  s('hair', 'bob', 'Bob', 0, '💇‍♀️'), s('hair', 'long', 'Long hair', 0, '👩'), s('hair', 'pony', 'Ponytail', 40, '🎀'), s('hair', 'buns', 'Space buns', 60, '🍡'),
  s('hair', 'twin', 'Twin tails', 80, '✌️'), s('hair', 'short', 'Short', 30, '🧑'), s('hair', 'wavy', 'Wavy', 90, '🌊'),
  s('hairColor', '#3b2a26', 'Dark brown', 0, '🟫'), s('hairColor', '#111111', 'Black', 0, '⬛'), s('hairColor', '#c98a4b', 'Honey', 30, '🍯'),
  s('hairColor', '#ff7eb6', 'Pink', 70, '🩷'), s('hairColor', '#8f7bff', 'Lilac', 70, '💜'), s('hairColor', '#5cc8ff', 'Sky blue', 80, '💙'),
  s('hairColor', '#f4f1ea', 'Platinum', 100, '🤍'), s('hairColor', '#ff6a3d', 'Sunset', 90, '🧡'),
  s('eyes', 'sparkle', 'Sparkle eyes', 0, '✨'), s('eyes', 'smile', 'Happy eyes', 0, '😊'), s('eyes', 'wink', 'Wink', 40, '😉'), s('eyes', 'star', 'Star eyes', 90, '🤩'),
  s('outfit', 'hoodie', 'Hoodie', 0, '🧥'), s('outfit', 'tee', 'T-shirt', 0, '👕'), s('outfit', 'jacket', 'Stage jacket', 120, '🧥'),
  s('outfit', 'uniform', 'School uniform', 80, '🎒'), s('outfit', 'dress', 'Party dress', 120, '👗'), s('outfit', 'track', 'Dance tracksuit', 100, '🕺'), s('outfit', 'spots', 'Spotty hero suit', 150, '🐞'), s('outfit', 'cape', 'Hero cape', 130, '🦸'),
  s('outfitColor', '#ff8fc4', 'Pink', 0, '🩷'), s('outfitColor', '#7c5cff', 'Purple', 0, '💜'), s('outfitColor', '#2ec4b6', 'Mint', 30, '💚'),
  s('outfitColor', '#ffd23f', 'Yellow', 30, '💛'), s('outfitColor', '#222244', 'Midnight', 50, '🖤'), s('outfitColor', '#ffffff', 'White', 50, '🤍'), s('outfitColor', '#ff4d4d', 'Red', 40, '❤️'),
  s('acc', 'none', 'Nothing', 0, '➖'), s('acc', 'clip', 'Star clip', 30, '⭐'), s('acc', 'bow', 'Big bow', 50, '🎀'), s('acc', 'headphones', 'Headphones', 90, '🎧'),
  s('acc', 'cap', 'Cap', 60, '🧢'), s('acc', 'crown', 'Tiny crown', 200, '👑'), s('acc', 'mic', 'Headset mic', 150, '🎙️'), s('acc', 'mask', 'Hero mask', 80, '🎭'), s('acc', 'beret', 'Paris beret', 70, '🇫🇷'),
  s('stick', 'heart', 'Heart lightstick', 0, '💗'), s('stick', 'star', 'Star lightstick', 60, '🌟'), s('stick', 'round', 'Round lightstick', 60, '🔮'), s('stick', 'bunny', 'Bunny lightstick', 120, '🐰'),
  s('bg', 'pink', 'Pink studio', 0, '🩷'), s('bg', 'night', 'Night stage', 80, '🌃'), s('bg', 'sunset', 'Sunset', 80, '🌅'), s('bg', 'galaxy', 'Galaxy', 150, '🌌'), s('bg', 'mint', 'Mint room', 50, '🍃'), s('bg', 'paris', 'Paris night', 120, '🗼'),
];
export const FREE_ITEMS = SHOP.filter((i) => i.price === 0).map((i) => i.id);

export const BGS: Record<string, [string, string]> = {
  pink: ['#ffd6ea', '#ffeaf4'], night: ['#1d1b4b', '#4b2a7a'], sunset: ['#ff9a8b', '#ffd36e'], galaxy: ['#120c3c', '#5a2ca0'], mint: ['#c9f7ea', '#eafff8'], paris: ['#2b2a6b', '#ff8fa3'],
};

// ---- Dorm furniture (word ids match world2 vocabulary where possible) ----
export type Furniture = { id: string; en: string; emoji: string; price: number };
export const FURNITURE: Furniture[] = [
  { id: 'bed', en: 'bed', emoji: '🛏️', price: 0 }, { id: 'desk', en: 'desk', emoji: '🗄️', price: 0 }, { id: 'chair', en: 'chair', emoji: '🪑', price: 0 },
  { id: 'lamp', en: 'lamp', emoji: '💡', price: 20 }, { id: 'plant', en: 'plant', emoji: '🪴', price: 20 }, { id: 'teddy', en: 'teddy', emoji: '🧸', price: 30 },
  { id: 'computer', en: 'computer', emoji: '💻', price: 60 }, { id: 'guitar', en: 'guitar', emoji: '🎸', price: 60 }, { id: 'microphone', en: 'microphone', emoji: '🎤', price: 50 },
  { id: 'clock', en: 'clock', emoji: '🕰️', price: 25 }, { id: 'mirror', en: 'mirror', emoji: '🪞', price: 40 }, { id: 'poster', en: 'poster', emoji: '🖼️', price: 30 },
  { id: 'sofa', en: 'sofa', emoji: '🛋️', price: 80 }, { id: 'tv', en: 'television', emoji: '📺', price: 90 }, { id: 'cat', en: 'cat', emoji: '🐈', price: 100 },
  { id: 'dog', en: 'dog', emoji: '🐕', price: 100 }, { id: 'books', en: 'books', emoji: '📚', price: 25 }, { id: 'ball', en: 'ball', emoji: '⚽', price: 15 },
  { id: 'piano', en: 'piano', emoji: '🎹', price: 120 }, { id: 'headphones', en: 'headphones', emoji: '🎧', price: 45 }, { id: 'cake', en: 'cake', emoji: '🎂', price: 35 },
  { id: 'lightstick', en: 'lightstick', emoji: '🪄', price: 40 }, { id: 'balloon', en: 'balloon', emoji: '🎈', price: 15 }, { id: 'rug', en: 'rug', emoji: '🟪', price: 30 },
  { id: 'eiffel', en: 'Eiffel Tower model', emoji: '🗼', price: 70 }, { id: 'croissant', en: 'croissant', emoji: '🥐', price: 20 }, { id: 'ladybird', en: 'ladybird toy', emoji: '🐞', price: 50 },
];
export const DORM_COLS = 6;
export const DORM_ROWS = 4;
export type DormPlacement = { item: string; x: number; y: number };
