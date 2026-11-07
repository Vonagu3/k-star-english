// Avatar parts, shop items and dorm furniture. All original designs.
export type Look = {
  skin: string; hair: string; hairColor: string; eyes: string;
  outfit: string; outfitColor: string; acc: string; stick: string; bg: string;
  /** Added later: optional in saved looks, filled from DEFAULT_LOOK. */
  face?: string; glasses?: string; pet?: string; fx?: string;
};

export const DEFAULT_LOOK: Required<Look> = {
  skin: '#ffd9c2', hair: 'bob', hairColor: '#3b2a26', eyes: 'sparkle',
  outfit: 'hoodie', outfitColor: '#ff8fc4', acc: 'none', stick: 'heart', bg: 'pink',
  face: 'none', glasses: 'none', pet: 'none', fx: 'none',
};
/** A saved look with every slot filled in. */
export const fullLook = (l: Look): Required<Look> => ({ ...DEFAULT_LOOK, ...l });

export type Rarity = 'free' | 'common' | 'rare' | 'epic' | 'legend';
export const rarityOf = (price: number): Rarity => (price === 0 ? 'free' : price < 120 ? 'common' : price < 300 ? 'rare' : price < 800 ? 'epic' : 'legend');
export const RARITY: Record<Rarity, { label: string; color: string }> = {
  free: { label: 'Free', color: '#9aa5b1' }, common: { label: 'Common', color: '#2ec4b6' }, rare: { label: 'Rare', color: '#3fa7ff' },
  epic: { label: 'Epic', color: '#a259ff' }, legend: { label: 'Legend', color: '#ffb800' },
};

export type ShopItem = { id: string; slot: keyof Look; value: string; name: string; price: number; emoji: string; /** Seasonal: sold only during its event. */ event?: boolean };

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
// ---- Big shop expansion: lots of things to save hearts for ----
SHOP.push(
  // hair styles
  s('hair', 'braids', 'Two braids', 110, '🧶'), s('hair', 'curly', 'Curly cloud', 150, '☁️'), s('hair', 'topbun', 'Top bun', 90, '🍙'),
  s('hair', 'side', 'Side ponytail', 130, '🎐'), s('hair', 'pixie', 'Pixie cut', 100, '🧚'), s('hair', 'hime', 'Princess bangs', 220, '👸'),
  s('hair', 'wolf', 'Idol layers', 320, '🐺'), s('hair', 'mega', 'Mega twin tails', 650, '💫'),
  // hair colours (grad: = two-tone ombré)
  s('hairColor', '#7ee0c3', 'Mint', 120, '🌿'), s('hairColor', '#c7a6ff', 'Lavender', 120, '🪻'), s('hairColor', '#d6243c', 'Cherry red', 140, '🍒'),
  s('hairColor', '#1d2a5c', 'Blue-black', 90, '🌑'), s('hairColor', '#b5652b', 'Copper', 100, '🟠'), s('hairColor', '#e7a7a1', 'Rose gold', 260, '🌹'),
  s('hairColor', '#c9ced6', 'Silver', 280, '🪙'), s('hairColor', '#ffe36e', 'Lemon', 140, '🍋'), s('hairColor', '#2bb3b1', 'Ocean teal', 160, '🌊'),
  s('hairColor', 'grad:#ff7eb6:#8f7bff', 'Pink-purple ombré', 450, '🦄'), s('hairColor', 'grad:#5cc8ff:#c7a6ff', 'Sky ombré', 450, '🌤️'),
  s('hairColor', 'grad:#ffd36e:#ff6a3d', 'Sunset ombré', 500, '🌅'), s('hairColor', 'grad:#111111:#ff5fa2', 'Idol pink tips', 600, '🎤'),
  s('hairColor', 'grad:#7ee0c3:#5cc8ff', 'Mermaid ombré', 700, '🧜‍♀️'), s('hairColor', 'grad:#ff7eb6:#ffd36e:#7ee0c3:#5cc8ff:#c7a6ff', 'Rainbow', 1500, '🌈'),
  // eyes
  s('eyes', 'heart', 'Heart eyes', 150, '😍'), s('eyes', 'sleepy', 'Sleepy eyes', 60, '😌'), s('eyes', 'cat', 'Cat-eye liner', 180, '🐱'),
  s('eyes', 'blue', 'Blue sparkle eyes', 220, '💎'), s('eyes', 'happy', 'Happy ^^', 80, '😄'), s('eyes', 'galaxy', 'Galaxy eyes', 700, '🌌'),
  // face
  s('face', 'none', 'Nothing', 0, '➖'), s('face', 'freckles', 'Freckles', 60, '🌰'), s('face', 'hearts', 'Heart blush', 110, '💗'),
  s('face', 'star', 'Star sticker', 90, '⭐'), s('face', 'glitter', 'Glitter cheeks', 240, '✨'), s('face', 'stage', 'Stage gems', 420, '💎'),
  // glasses
  s('glasses', 'none', 'No glasses', 0, '➖'), s('glasses', 'round', 'Round glasses', 80, '👓'), s('glasses', 'heart', 'Heart sunnies', 200, '💕'),
  s('glasses', 'star', 'Star glasses', 220, '🌟'), s('glasses', 'sun', 'Cool sunglasses', 160, '😎'), s('glasses', 'visor', 'Neon visor', 500, '🥽'),
  // outfits
  s('outfit', 'hanbok', 'Hanbok', 480, '🇰🇷'), s('outfit', 'sailor', 'Sailor suit', 180, '⚓'), s('outfit', 'overalls', 'Overalls', 140, '👖'),
  s('outfit', 'puffer', 'Puffer jacket', 200, '🧥'), s('outfit', 'pyjamas', 'Star pyjamas', 110, '🌙'), s('outfit', 'gown', 'Princess gown', 750, '👑'),
  s('outfit', 'tutu', 'Ballet tutu', 260, '🩰'), s('outfit', 'astro', 'Space suit', 900, '🚀'), s('outfit', 'cheer', 'Cheer uniform', 230, '📣'),
  s('outfit', 'sweater', 'Heart sweater', 120, '💝'), s('outfit', 'raincoat', 'Raincoat', 90, '☔'), s('outfit', 'idol', 'Idol stage outfit', 1200, '💃'),
  // outfit colours
  s('outfitColor', '#c7a6ff', 'Lavender', 60, '🪻'), s('outfitColor', '#7ee0c3', 'Mint green', 60, '🌿'), s('outfitColor', '#ffb38a', 'Peach', 60, '🍑'),
  s('outfitColor', '#5cc8ff', 'Sky blue', 70, '🩵'), s('outfitColor', '#ffd700', 'Gold', 400, '🏆'), s('outfitColor', '#c0c0c8', 'Silver', 350, '🥈'),
  s('outfitColor', 'grad:#ff7eb6:#8f7bff', 'Dreamy ombré', 550, '🦋'), s('outfitColor', 'grad:#ff7eb6:#ffd36e:#7ee0c3:#5cc8ff:#c7a6ff', 'Rainbow', 1200, '🌈'),
  // accessories
  s('acc', 'catears', 'Cat ears', 140, '🐈'), s('acc', 'bunnyears', 'Bunny ears', 160, '🐇'), s('acc', 'halo', 'Halo', 380, '😇'),
  s('acc', 'flowers', 'Flower crown', 260, '🌸'), s('acc', 'tiara', 'Star tiara', 600, '💫'), s('acc', 'beanie', 'Beanie', 90, '🧶'),
  s('acc', 'horns', 'Cute devil horns', 220, '😈'), s('acc', 'butterflies', 'Butterfly clips', 120, '🦋'), s('acc', 'idolcrown', 'Superstar crown', 1800, '👑'),
  // lightsticks
  s('stick', 'moon', 'Moon lightstick', 180, '🌙'), s('stick', 'strawberry', 'Strawberry lightstick', 160, '🍓'), s('stick', 'cloud', 'Cloud lightstick', 140, '☁️'),
  s('stick', 'crownstick', 'Crown lightstick', 520, '👑'), s('stick', 'galaxystick', 'Galaxy lightstick', 900, '🌌'),
  // backgrounds
  s('bg', 'seoul', 'Seoul at night', 260, '🏙️'), s('bg', 'cherry', 'Cherry blossoms', 220, '🌸'), s('bg', 'beach', 'Summer beach', 180, '🏖️'),
  s('bg', 'snow', 'Snowy day', 160, '❄️'), s('bg', 'concert', 'Concert stage', 600, '🎆'), s('bg', 'rainbow', 'Rainbow sky', 300, '🌈'),
  s('bg', 'candy', 'Candy land', 340, '🍭'), s('bg', 'ocean', 'Under the sea', 380, '🐠'), s('bg', 'space', 'Outer space', 700, '🪐'),
  // pets
  s('pet', 'none', 'No pet', 0, '➖'), s('pet', '🐱', 'Kitten', 200, '🐱'), s('pet', '🐶', 'Puppy', 200, '🐶'), s('pet', '🐰', 'Bunny', 220, '🐰'),
  s('pet', '🐹', 'Hamster', 150, '🐹'), s('pet', '🐼', 'Panda', 400, '🐼'), s('pet', '🦊', 'Fox', 380, '🦊'), s('pet', '🐧', 'Penguin', 320, '🐧'),
  s('pet', '🦄', 'Unicorn', 950, '🦄'), s('pet', '🐉', 'Little dragon', 2000, '🐉'), s('pet', '🤖', 'Robot buddy', 800, '🤖'),
  // effects
  s('fx', 'none', 'No effect', 0, '➖'), s('fx', '✨', 'Sparkles', 150, '✨'), s('fx', '💗', 'Floating hearts', 180, '💗'), s('fx', '🎵', 'Music notes', 200, '🎵'),
  s('fx', '❄️', 'Snowflakes', 160, '❄️'), s('fx', '🫧', 'Bubbles', 140, '🫧'), s('fx', '⭐', 'Shooting stars', 450, '⭐'), s('fx', '🌸', 'Petal rain', 380, '🌸'),
  s('fx', '👑', 'Superstar aura', 1600, '👑'),
);

// ---- Ready-made looks: a whole trendy outfit in one tap. Some parts exist only in these looks. ----
/** Every slot but skin tone: the learner keeps their own skin colour. */
export type SkinLook = Omit<Required<Look>, 'skin'>;
export type Skin = { id: string; name: string; ru: string; emoji: string; price: number; look: SkinLook };
const base: Omit<SkinLook, 'hair' | 'hairColor' | 'outfit' | 'outfitColor'> = { eyes: 'sparkle', acc: 'none', stick: 'heart', bg: 'pink', face: 'none', glasses: 'none', pet: 'none', fx: 'none' };
const sk = (id: string, name: string, ru: string, emoji: string, price: number, look: Partial<SkinLook> & Pick<SkinLook, 'hair' | 'hairColor' | 'outfit' | 'outfitColor'>): Skin =>
  ({ id: `look:${id}`, name, ru, emoji, price, look: { ...base, ...look } });
export const SKINS: Skin[] = [
  sk('comfy', 'Comfy Hoodie', 'Уютное худи', '🧸', 0, { hair: 'halfup', hairColor: '#3b2a26', outfit: 'oversize', outfitColor: '#c7a6ff', eyes: 'smile' }),
  sk('denim', 'Denim Day', 'Джинсовый день', '👖', 0, { hair: 'curtain', hairColor: '#c98a4b', outfit: 'denim', outfitColor: '#6f9fe0', face: 'freckles', bg: 'mint', stick: 'star' }),
  sk('sporty', 'Sporty Pony', 'Спортивный хвост', '👟', 0, { hair: 'sleekpony', hairColor: '#111111', outfit: 'track', outfitColor: '#ffffff', eyes: 'happy', bg: 'sunset', stick: 'round' }),
  sk('tennis', 'Tennis Club', 'Теннисный клуб', '🎾', 260, { hair: 'sleekpony', hairColor: '#c98a4b', outfit: 'tennis', outfitColor: '#ffffff', eyes: 'smile', face: 'freckles', bg: 'mint' }),
  sk('soft', 'Soft Girl', 'Нежный стиль', '🎀', 300, { hair: 'halfup', hairColor: '#e7a7a1', outfit: 'cardigan', outfitColor: '#c7a6ff', acc: 'coquette', face: 'hearts', bg: 'cherry', stick: 'strawberry' }),
  sk('y2k', 'Y2K Butterfly', 'Стиль 2000-х', '🦋', 320, { hair: 'buns', hairColor: 'grad:#ff7eb6:#8f7bff', outfit: 'y2k', outfitColor: '#ffd6ea', acc: 'butterflies', glasses: 'tinted', face: 'glitter', eyes: 'star', bg: 'candy', stick: 'bunny' }),
  sk('skater', 'Skater Cool', 'Скейтер', '🛹', 340, { hair: 'curtain', hairColor: '#111111', outfit: 'skater', outfitColor: '#e63946', acc: 'bucket', glasses: 'sun', eyes: 'wink', bg: 'sunset' }),
  sk('winter', 'Winter Cosy', 'Зимний уют', '❄️', 360, { hair: 'curtain', hairColor: '#f4f1ea', outfit: 'puffer', outfitColor: '#ffffff', acc: 'beanie', eyes: 'happy', bg: 'snow', fx: '❄️', pet: '🐧' }),
  sk('varsity', 'Varsity Star', 'Студенческая куртка', '⭐', 380, { hair: 'long', hairColor: '#c98a4b', outfit: 'varsity', outfitColor: '#d6243c', bg: 'rainbow', stick: 'star' }),
  sk('dance', 'Dance Practice', 'Танцевальная репетиция', '💃', 420, { hair: 'wolf', hairColor: 'grad:#111111:#ff5fa2', outfit: 'dance', outfitColor: '#7c5cff', acc: 'bandana', eyes: 'star', bg: 'seoul', fx: '🎵', stick: 'star' }),
  sk('gamer', 'Gamer Girl', 'Геймер', '🎮', 450, { hair: 'long', hairColor: '#1d2a5c', outfit: 'gamer', outfitColor: '#2b2140', acc: 'ledcat', eyes: 'cat', bg: 'night', fx: '✨', pet: '🤖' }),
  sk('kawaii', 'Strawberry Kawaii', 'Клубничный каваи', '🍓', 480, { hair: 'twin', hairColor: '#ff7eb6', outfit: 'kawaii', outfitColor: '#ffd6ea', acc: 'strawclips', face: 'hearts', eyes: 'heart', bg: 'candy', pet: '🐰', stick: 'strawberry' }),
  sk('matcha', 'Matcha Café', 'Кафе с матчей', '🍵', 0, { hair: 'curtain', hairColor: '#3b2a26', outfit: 'vest', outfitColor: '#ffffff', acc: 'beret', eyes: 'smile', bg: 'mint' }),
  sk('pyjama', 'Pyjama Party', 'Пижамная вечеринка', '🌙', 0, { hair: 'sidebraid', hairColor: '#c98a4b', outfit: 'pyjamas', outfitColor: '#c7a6ff', acc: 'sleepmask', eyes: 'sleepy', bg: 'night', pet: '🐱' }),
  sk('artist', 'Little Artist', 'Юная художница', '🎨', 0, { hair: 'topbun', hairColor: '#3b2a26', outfit: 'artist', outfitColor: '#ff8fc4', face: 'paint', eyes: 'happy', bg: 'rainbow' }),
  sk('picnic', 'Picnic Day', 'Пикник', '🧺', 280, { hair: 'sidebraid', hairColor: '#c98a4b', outfit: 'picnic', outfitColor: '#ff8fb1', acc: 'daisies', face: 'freckles', bg: 'cherry' }),
  sk('football', 'Football Star', 'Звезда футбола', '⚽', 300, { hair: 'sleekpony', hairColor: '#111111', outfit: 'jersey', outfitColor: '#2ec4b6', acc: 'sweatband', eyes: 'wink', bg: 'sunset', stick: 'star' }),
  sk('chef', 'Little Chef', 'Юный повар', '🧁', 320, { hair: 'bob', hairColor: '#3b2a26', outfit: 'apron', outfitColor: '#ffffff', acc: 'chefhat', eyes: 'happy', face: 'freckles', bg: 'candy' }),
  sk('beach', 'Beach Day', 'День на пляже', '🏖️', 340, { hair: 'wavy', hairColor: '#ffe36e', outfit: 'beach', outfitColor: '#5cc8ff', acc: 'hibiscus', glasses: 'sun', bg: 'beach', fx: '🫧' }),
  sk('ballet', 'Ballet Core', 'Балетный стиль', '🩰', 380, { hair: 'balletbun', hairColor: '#3b2a26', outfit: 'ballet', outfitColor: '#ffd6ea', face: 'glitter', bg: 'pink', fx: '🌸' }),
  sk('skate', 'Ice Skater', 'Фигуристка', '⛸️', 420, { hair: 'sleekpony', hairColor: '#c9ced6', outfit: 'skate', outfitColor: '#5cc8ff', acc: 'earmuffs', eyes: 'blue', face: 'glitter', bg: 'snow', fx: '❄️' }),
  sk('rock', 'Rock Star', 'Рок-звезда', '🎸', 450, { hair: 'wolf', hairColor: 'grad:#111111:#8f7bff', outfit: 'leather', outfitColor: '#1b1b24', glasses: 'star', eyes: 'wink', bg: 'concert', fx: '🎵', stick: 'star' }),
  sk('cyber', 'Cyber Neon', 'Кибер-неон', '💜', 600, { hair: 'sleekpony', hairColor: 'grad:#5cc8ff:#c7a6ff', outfit: 'cyber', outfitColor: '#2b2140', glasses: 'visor', eyes: 'galaxy', bg: 'space', fx: '✨', stick: 'galaxystick' }),
  sk('fairy', 'Fairy Garden', 'Сад фей', '🧚', 900, { hair: 'wavy', hairColor: 'grad:#ffd36e:#ff7eb6', outfit: 'fairy', outfitColor: '#7ee0c3', acc: 'flowers', face: 'glitter', bg: 'cherry', fx: '🌸', pet: '🦋' }),
  sk('debut', 'Debut Stage', 'Сцена дебюта', '🎤', 1500, { hair: 'mega', hairColor: 'grad:#ff7eb6:#ffd36e:#7ee0c3:#5cc8ff:#c7a6ff', outfit: 'idol', outfitColor: 'grad:#ff7eb6:#8f7bff', acc: 'mic', eyes: 'star', face: 'stage', bg: 'concert', fx: '⭐', stick: 'crownstick' }),
];
export const isWearingSkin = (look: Look, skin: Skin) => (Object.keys(skin.look) as (keyof SkinLook)[]).every((k) => fullLook(look)[k] === skin.look[k]);

export const FREE_ITEMS = SHOP.filter((i) => i.price === 0).map((i) => i.id);
export const isOwned = (inventory: string[], it: ShopItem) => it.price === 0 || inventory.includes(it.id);
export const SHOP_BY_ID = new Map(SHOP.map((i) => [i.id, i]));

export const BGS: Record<string, [string, string]> = {
  autumn: ['#ffd8a8', '#ffb067'], xmas: ['#0f4c3a', '#1d3557'], love: ['#ffd1e1', '#ff8fb1'], spring: ['#ffe4f0', '#d7f7e8'], pool: ['#7fd6ff', '#c8f1ff'],
  moon: ['#141a3a', '#2b2a6b'], spooky: ['#2b1a3d', '#5b2a86'], party: ['#ffe9a8', '#ffc2da'],
  seoul: ['#141a3a', '#3b2d6b'], cherry: ['#ffe1ec', '#fff7fa'], beach: ['#8ad8ff', '#ffe9a8'], snow: ['#dbeeff', '#ffffff'],
  concert: ['#1a0b2e', '#6a1b9a'], rainbow: ['#ffd6e8', '#d6f0ff'], candy: ['#ffd1f0', '#d7f9ff'], ocean: ['#1a6fb3', '#7fd6ff'], space: ['#05030f', '#24104a'],
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
  // kitchen
  { id: 'fridge', en: 'fridge', emoji: '🧊', price: 60 }, { id: 'cooker', en: 'cooker', emoji: '🔥', price: 60 }, { id: 'sink', en: 'sink', emoji: '🚰', price: 40 },
  { id: 'kettle', en: 'kettle', emoji: '🫖', price: 25 }, { id: 'table', en: 'table', emoji: '🍽️', price: 40 }, { id: 'fruit', en: 'fruit bowl', emoji: '🍎', price: 20 },
  { id: 'pizza', en: 'pizza', emoji: '🍕', price: 20 }, { id: 'cupcakes', en: 'cupcakes', emoji: '🧁', price: 25 },
  // bathroom
  { id: 'bath', en: 'bath', emoji: '🛁', price: 70 }, { id: 'shower', en: 'shower', emoji: '🚿', price: 60 }, { id: 'toilet', en: 'toilet', emoji: '🚽', price: 50 },
  { id: 'toothbrush', en: 'toothbrush', emoji: '🪥', price: 15 }, { id: 'soap', en: 'soap', emoji: '🧼', price: 15 }, { id: 'duck', en: 'rubber duck', emoji: '🦆', price: 30 },
  // garden
  { id: 'tree', en: 'tree', emoji: '🌳', price: 50 }, { id: 'flowers', en: 'flowers', emoji: '🌷', price: 25 }, { id: 'bike', en: 'bike', emoji: '🚲', price: 70 },
  { id: 'swing', en: 'slide', emoji: '🛝', price: 80 }, { id: 'tent', en: 'tent', emoji: '⛺', price: 90 }, { id: 'rabbit', en: 'rabbit', emoji: '🐇', price: 100 }, { id: 'sunflower', en: 'sunflower', emoji: '🌻', price: 25 },
];

export type Room = { id: string; en: string; ru: string; emoji: string; price: number };
export const ROOMS: Room[] = [
  { id: 'bedroom', en: 'bedroom', ru: 'спальня', emoji: '🛏️', price: 0 }, { id: 'living', en: 'living room', ru: 'гостиная', emoji: '🛋️', price: 100 },
  { id: 'kitchen', en: 'kitchen', ru: 'кухня', emoji: '🍳', price: 120 }, { id: 'bathroom', en: 'bathroom', ru: 'ванная', emoji: '🛁', price: 120 },
  { id: 'garden', en: 'garden', ru: 'сад', emoji: '🌳', price: 180 },
];
export type Surface = { id: string; name: string; color: string; pattern?: string; price: number };
export const WALLS: Surface[] = [
  { id: 'cream', name: 'Cream', color: '#fbe7d4', price: 0 }, { id: 'pink', name: 'Pink', color: '#ffd6ea', price: 30 }, { id: 'mint', name: 'Mint', color: '#d2f5ea', price: 30 },
  { id: 'lilac', name: 'Lilac', color: '#e6dcff', price: 30 }, { id: 'sky', name: 'Sky', color: '#d6efff', price: 30 },
  { id: 'stars', name: 'Stars', color: '#2b2a6b', pattern: 'radial-gradient(#fff 1.2px, transparent 1.6px) 0 0/14px 14px', price: 80 },
  { id: 'stripes', name: 'Candy stripes', color: '#fff', pattern: 'repeating-linear-gradient(90deg, #ffd6ea 0 10px, #fff 10px 20px)', price: 60 },
  { id: 'hearts', name: 'Hearts', color: '#ffe3f0', pattern: 'radial-gradient(#ff8fc4 2px, transparent 2.5px) 0 0/16px 16px', price: 70 },
];
export const FLOORS: Surface[] = [
  { id: 'wood', name: 'Wood', color: '#f6d7b8', price: 0 }, { id: 'darkwood', name: 'Dark wood', color: '#c8946a', price: 30 },
  { id: 'tiles', name: 'Tiles', color: '#eef3f7', pattern: 'linear-gradient(90deg, #d5dde5 1px, transparent 1px) 0 0/24px 24px, linear-gradient(#d5dde5 1px, transparent 1px) 0 0/24px 24px', price: 40 },
  { id: 'check', name: 'Checkerboard', color: '#fff', pattern: 'conic-gradient(#2b2140 25%, #fff 0 50%, #2b2140 0 75%, #fff 0) 0 0/28px 28px', price: 60 },
  { id: 'carpet', name: 'Pink carpet', color: '#ffc2da', price: 50 }, { id: 'grass', name: 'Grass', color: '#9be38f', pattern: 'radial-gradient(#7bd06c 1.5px, transparent 2px) 0 0/10px 10px', price: 40 },
];
export const DORM_COLS = 6;
export const DORM_ROWS = 4;
/** x/y: grid cell (older versions). fx/fy: free position in the side-view room (centre x, bottom y, % of the scene);
 *  on: id of the furniture it rests on; flip: mirrored. */
export type DormPlacement = { item: string; x: number; y: number; room?: string; fx?: number; fy?: number; on?: string; flip?: boolean };
