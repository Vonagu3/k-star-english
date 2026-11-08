// Mystery of the day: a new Pine Hollow case every day, built from a story template, a cipher word the child
// knows and seeded grade-5 maths problems (parts, area/perimeter, volume). Same all day, new tomorrow.
import { WORDS, WORLDS } from '../content';
import type { Episode, Exercise, Figure, MysteryStep } from '../content/schema';
import { fmtNum } from '../lib/maths';
import { dayFor, numberFor } from '../lib/util';
import { pickN, rng } from './daily';

type Problem = { q: string; answer: number; unit?: string; solution: string[]; terms?: string[]; figure?: Figure };
type R = () => number;
const int = (r: R, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const one = <T,>(r: R, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
const n = fmtNum;
/** Russian noun form for a number: plural(21, 'монета', 'монеты', 'монет') → 'монета'. */
export const plural = (k: number, one: string, few: string, many: string) => {
  const t = k % 100, u = k % 10;
  return t >= 11 && t <= 14 ? many : u === 1 ? one : u >= 2 && u <= 4 ? few : many;
};
const parts = (k: number) => plural(k, 'часть', 'части', 'частей');

export const CASES = [
  { title: 'The Midnight Bell', emoji: '🔔',
    intro: 'At midnight the old bell in Pine Hollow rang all by itself! Nobody was in the tower. Who did it, {name}?',
    introRu: 'В полночь старый колокол Пайн-Холлоу зазвонил сам! В башне никого не было. Кто это сделал?',
    reveal: 'It was a family of bats! They live in the bell tower and they love to swing on the rope.',
    revealRu: 'Это была семья летучих мышей! Они живут в башне и обожают качаться на верёвке колокола.', revealEmoji: '🦇' },
  { title: 'The Lost Lantern', emoji: '🏮',
    intro: "Grandpa Otto's old lantern is gone! There are little feathers on the table. Find the lantern before night comes.",
    introRu: 'Пропал старый фонарь дедушки Отто! На столе маленькие пёрышки. Найди фонарь до наступления ночи.',
    reveal: 'Hoot borrowed the lantern! He wanted to read a book in his tree at night. Hoo-hoo, sorry!',
    revealRu: 'Фонарь одолжил Хут! Он хотел почитать книжку ночью на своём дереве. Ху-ху, простите!', revealEmoji: '🦉' },
  { title: 'The Glowing Lake', emoji: '🌌',
    intro: 'Every night the lake behind the forest glows green. People in Pine Hollow are scared. Is it a monster?',
    introRu: 'Каждую ночь озеро за лесом светится зелёным. Жители Пайн-Холлоу боятся. Может, это чудовище?',
    reveal: 'No monster! Thousands of tiny fireflies dance over the water every summer night.',
    revealRu: 'Никакого чудовища! Это тысячи крошечных светлячков танцуют над водой летними ночами.', revealEmoji: '✨' },
  { title: 'The Missing Pies', emoji: '🥧',
    intro: "Mrs Maple's apple pies disappeared from her window! There are small muddy paw prints on the floor.",
    introRu: 'С окна миссис Мейпл пропали яблочные пироги! На полу маленькие грязные следы лапок.',
    reveal: 'A hungry raccoon took the pies... and left a thank-you acorn on the window!',
    revealRu: 'Пироги утащил голодный енот… и оставил на окне жёлудь в благодарность!', revealEmoji: '🦝' },
  { title: 'The Whispering Tree', emoji: '🌳',
    intro: 'An old tree in the forest is whispering your name, {name}! Hoot is a little bit scared. Let\'s find out why.',
    introRu: 'Старое дерево в лесу шепчет твоё имя! Хуту немного страшно. Давай узнаем, в чём дело.',
    reveal: 'Two squirrels in the tree were playing with an old radio from Grandpa\'s attic!',
    revealRu: 'Две белки в дупле играли со старым радио с дедушкиного чердака!', revealEmoji: '🐿️' },
  { title: 'The Backwards Clocks', emoji: '🕰️',
    intro: 'This morning every clock in Pine Hollow runs backwards! Tick, tock, tock, tick... What happened?',
    introRu: 'Сегодня утром все часы в Пайн-Холлоу идут задом наперёд! Тик-так, так-тик… Что случилось?',
    reveal: "The clockmaker's fat cat sat on the big lever in the clock tower. Now all the clocks are fixed!",
    revealRu: 'Толстый кот часовщика сел на большой рычаг в часовой башне. Теперь все часы починены!', revealEmoji: '🐈' },
  { title: 'The Flying Hat', emoji: '🎩',
    intro: "The mayor's hat flew away and now it floats over the town! It goes left, right, up and down.",
    introRu: 'Шляпа мэра улетела и теперь парит над городом! Влево, вправо, вверх и вниз.',
    reveal: 'A little red balloon was tied to the hat. It was a joke from Grandpa Otto! Everybody laughs.',
    revealRu: 'К шляпе был привязан маленький красный шарик. Это шутка дедушки Отто! Все смеются.', revealEmoji: '🎈' },
  { title: 'The Secret Picnic', emoji: '🧺',
    intro: 'You find a strange map under your door. It has an X in the forest and the words: "Come at noon!"',
    introRu: 'Под дверью ты находишь странную карту. На ней крестик в лесу и надпись: «Приходи в полдень!»',
    reveal: 'At the X there is a big picnic! Grandpa Otto, Hoot and the bear made it for you. Surprise!',
    revealRu: 'На месте крестика — большой пикник! Его устроили для тебя дедушка Отто, Хут и медведь. Сюрприз!', revealEmoji: '🎉' },
] as const;

// ---------- Maths problem generators (all answers are whole numbers) ----------

const MIXES = [
  { what: 'зелья', x: 'сока', y: 'воды', xn: 'сок', yn: 'вода', how: 'Сколько граммов', u: 'г', k: [20, 60] },
  { what: 'пирога', x: 'муки', y: 'сахара', xn: 'мука', yn: 'сахар', how: 'Сколько граммов', u: 'г', k: [30, 90] },
  { what: 'совиного корма', x: 'ягод', y: 'орехов', xn: 'ягоды', yn: 'орехи', how: 'Сколько граммов', u: 'г', k: [10, 40] },
  { what: 'костра', x: 'шишек', y: 'веток', xn: 'шишки', yn: 'ветки', how: 'Сколько', u: 'шт.', k: [3, 12] },
] as const;

function partsProblem(r: R): Problem {
  const m = one(r, MIXES);
  const a = int(r, 1, 5);
  let b = int(r, 1, 5);
  if (a === b) b = a === 5 ? 4 : a + 1;
  const k = int(r, m.k[0], m.k[1]);
  const s = a + b, T = s * k;
  const head = `Для ${m.what} взяли ${a} ${parts(a)} ${m.x} и ${b} ${parts(b)} ${m.y}, всего ${n(T)} ${m.u}`;
  const H = `${head}${m.u.endsWith('.') ? '' : '.'} `; // no double dot after «шт.»
  const base = [`Всего частей: ${a} + ${b} = ${s}`, `Одна часть: ${n(T)} : ${s} = ${n(k)} (${m.u})`];
  const figure: Figure = { kind: 'parts', rows: [{ label: m.xn, parts: a }, { label: m.yn, parts: b }], total: `${n(T)} ${m.u}` };
  const ask = int(r, 0, 3);
  if (ask === 0) return { q: `${H}${m.how} в одной части?`, answer: k, unit: m.u, solution: base, terms: ['part', 'total'], figure };
  if (ask === 1) return { q: `${H}${m.how} ${m.x}?`, answer: a * k, unit: m.u, solution: [...base, `${m.xn[0].toUpperCase()}${m.xn.slice(1)}: ${n(k)} · ${a} = ${n(a * k)} (${m.u})`], terms: ['part'], figure };
  if (ask === 2) return { q: `${H}${m.how} ${m.y}?`, answer: b * k, unit: m.u, solution: [...base, `${m.yn[0].toUpperCase()}${m.yn.slice(1)}: ${n(k)} · ${b} = ${n(b * k)} (${m.u})`], terms: ['part'], figure };
  const d = Math.abs(a - b);
  const more = a > b ? m.x : m.y, less = a > b ? m.y : m.x;
  return { q: `${H}На сколько ${m.u === 'г' ? 'граммов ' : ''}${more} больше, чем ${less}?`, answer: d * k, unit: m.u,
    solution: [...base, `Разница: ${Math.max(a, b)} − ${Math.min(a, b)} = ${d} ${parts(d)}`, `${n(k)} · ${d} = ${n(d * k)} (${m.u})`], terms: ['part', 'more-than'], figure };
}

const PLACES = [
  { t: 'Пол тайной комнаты', u: 'м' }, { t: 'Грядка за домом', u: 'м' }, { t: 'Дедушкин ковёр', u: 'дм' },
  { t: 'Окошко в башне', u: 'дм' }, { t: 'Старая карта из дневника', u: 'см' }, { t: 'Фотография в дневнике', u: 'см' },
] as const;

function rectProblem(r: R): Problem {
  let a = int(r, 3, 12);
  const b = int(r, 2, 9);
  if (a === b) a += 1;
  const { t: place, u } = one(r, PLACES);
  const figure: Figure = { kind: 'rect', a, b, unit: u };
  switch (int(r, 0, 3)) {
    case 0: return { q: `${place} — прямоугольник ${a} ${u} на ${b} ${u}. Найди площадь.`, answer: a * b, unit: `${u}²`,
      solution: ['S = a · b', `S = ${a} · ${b} = ${a * b} (${u}²)`], terms: ['area'], figure };
    case 1: return { q: `${place} — прямоугольник ${a} ${u} на ${b} ${u}. Найди периметр.`, answer: 2 * (a + b), unit: u,
      solution: ['P = (a + b) · 2', `P = (${a} + ${b}) · 2 = ${2 * (a + b)} (${u})`], terms: ['perimeter'], figure };
    case 2: return { q: `Периметр квадратной шкатулки ${4 * a} см. Найди длину её стороны.`, answer: a, unit: 'см',
      solution: ['У квадрата 4 равные стороны', `a = P : 4 = ${4 * a} : 4 = ${a} (см)`], terms: ['perimeter', 'side'] };
    default: return { q: `Площадь прямоугольника ${a * b} ${u}², длина ${a} ${u}. Найди ширину.`, answer: b, unit: u,
      solution: ['b = S : a', `b = ${a * b} : ${a} = ${b} (${u})`], terms: ['area', 'length', 'width'] };
  }
}

const BOXES = ['Ящик', 'Сундук', 'Коробка', 'Аквариум'] as const;

function volumeProblem(r: R): Problem {
  const a = int(r, 2, 8), b = int(r, 2, 6), c = int(r, 2, 5);
  switch (int(r, 0, 3)) {
    case 0: {
      const box = one(r, BOXES);
      return { q: `${box} — ${a} дм в длину, ${b} дм в ширину, ${c} дм в высоту. Найди объём.`, answer: a * b * c, unit: 'дм³',
        solution: ['V = a · b · c', `V = ${a} · ${b} · ${c} = ${a * b * c} (дм³)`], terms: ['volume'], figure: { kind: 'cuboid', a, b, c, unit: 'дм' } };
    }
    case 1: {
      const x = int(r, 2, 5), y = int(r, 2, 4), z = int(r, 2, 3);
      return { q: `Фигура из кубиков: ${x} в длину, ${y} в ширину, ${z} в высоту. Сколько кубиков?`, answer: x * y * z,
        solution: [`В одном слое: ${x} · ${y} = ${x * y}`, `Всего: ${x * y} · ${z} = ${x * y * z}`], terms: ['cube'], figure: { kind: 'cuboid', a: x, b: y, c: z, unit: 'см', cubes: true } };
    }
    case 2: {
      const e = int(r, 2, 6);
      return { q: `Найди объём куба с ребром ${e} см.`, answer: e ** 3, unit: 'см³',
        solution: ['V = a · a · a', `V = ${e} · ${e} · ${e} = ${e ** 3} (см³)`], terms: ['cube', 'volume'] };
    }
    default: return { q: `Объём ящика ${a * b * c} дм³, дно — ${a} дм на ${b} дм. Найди высоту ящика.`, answer: c, unit: 'дм',
      solution: [`Площадь дна: ${a} · ${b} = ${a * b} (дм²)`, `h = V : S = ${a * b * c} : ${a * b} = ${c} (дм)`], terms: ['volume', 'height'] };
  }
}

const GENS = [partsProblem, rectProblem, volumeProblem];

// ---------- Clues: a short English note with numbers + a question about it ----------

function clueStep(r: R, kind: number): Extract<MysteryStep, { kind: 'clue' }> {
  if (kind === 0) {
    const a = int(r, 1, 4);
    let b = int(r, 2, 5);
    if (a === b) b += 1;
    const k = int(r, 2, 9), T = (a + b) * k;
    return { kind: 'clue', emoji: '📜', text: [`A note from the journal: "I hid ${T} coins."`, `"${a} ${a === 1 ? 'part is' : 'parts are'} gold and ${b} parts are silver."`],
      ru: `Записка из дневника: «Я спрятал ${T} ${plural(T, 'монету', 'монеты', 'монет')}. Золотых — ${a} ${parts(a)}, серебряных — ${b} ${parts(b)}».`,
      q: 'Сколько золотых монет?', answer: a * k,
      solution: [`Всего частей: ${a} + ${b} = ${a + b}`, `Одна часть: ${T} : ${a + b} = ${k}`, `Золотых: ${k} · ${a} = ${a * k}`],
      terms: ['part', 'total'], figure: { kind: 'parts', rows: [{ label: 'золото', parts: a }, { label: 'серебро', parts: b }], total: String(T) } };
  }
  if (kind === 1) {
    let a = int(r, 4, 12);
    const b = int(r, 3, 9);
    if (a === b) a += 1;
    return { kind: 'clue', emoji: '🚪', text: ['Hoot found a secret room.', `It is ${a} metres long and ${b} metres wide.`],
      ru: `Хут нашёл тайную комнату. Она ${a} м в длину и ${b} м в ширину.`,
      q: 'Найди площадь комнаты.', answer: a * b, unit: 'м²', solution: ['S = a · b', `S = ${a} · ${b} = ${a * b} (м²)`],
      terms: ['area', 'length', 'width'], figure: { kind: 'rect', a, b, unit: 'м' } };
  }
  if (kind === 2) {
    let a = int(r, 5, 20);
    const b = int(r, 3, 12);
    if (a === b) a += 1;
    return { kind: 'clue', emoji: '🌿', text: ['The garden behind the old house is a rectangle.', `It is ${a} metres long and ${b} metres wide.`, 'Hoot wants to walk around it.'],
      ru: `Сад за старым домом — прямоугольник ${a} м на ${b} м. Хут хочет обойти его вокруг.`,
      q: 'Какой путь пройдёт Хут вокруг сада?', answer: 2 * (a + b), unit: 'м', solution: ['Путь вокруг — это периметр: P = (a + b) · 2', `P = (${a} + ${b}) · 2 = ${2 * (a + b)} (м)`],
      terms: ['perimeter', 'length', 'width'], figure: { kind: 'rect', a, b, unit: 'м' } };
  }
  if (kind === 3) {
    const a = int(r, 3, 8), b = int(r, 2, 6), c = int(r, 2, 5);
    return { kind: 'clue', emoji: '🧰', text: ['There is an old chest in the cave.', `It is ${a} dm long, ${b} dm wide and ${c} dm high.`],
      ru: `В пещере стоит старый сундук: ${a} дм в длину, ${b} дм в ширину и ${c} дм в высоту.`,
      q: 'Найди объём сундука.', answer: a * b * c, unit: 'дм³', solution: ['V = a · b · c', `V = ${a} · ${b} · ${c} = ${a * b * c} (дм³)`],
      terms: ['volume'], figure: { kind: 'cuboid', a, b, c, unit: 'дм' } };
  }
  const a = int(r, 2, 5), b = int(r, 2, 4), c = int(r, 2, 3);
  return { kind: 'clue', emoji: '🪙', text: ['The treasure box is full of gold cubes.', `There are ${a} cubes in a row, ${b} rows and ${c} layers.`],
    ru: `Шкатулка полна золотых кубиков: ${a} в ряду, ${b} ${plural(b, 'ряд', 'ряда', 'рядов')} и ${c} ${plural(c, 'слой', 'слоя', 'слоёв')}.`,
    q: 'Сколько золотых кубиков в шкатулке?', answer: a * b * c, solution: [`В одном слое: ${a} · ${b} = ${a * b}`, `Всего: ${a * b} · ${c} = ${a * b * c}`],
    terms: ['cube'], figure: { kind: 'cuboid', a, b, c, unit: 'см', cubes: true } };
}

// ---------- The case ----------

const plain = (id: string) => { const w = WORDS.get(id); return !!w && /^[a-z]{3,5}$/.test(w.en) && !numberFor(w.en) && !dayFor(w.en); };

export type DailyCase = { id: string; day: string; story: (typeof CASES)[number]; episode: Episode };

/** Builds the case for `day`. `learned` = word ids the child has met; Mystery Woods words are always in the pool. */
export function dailyCase(day: string, learned: string[]): DailyCase {
  const r = rng(`kstar-case-${day}`);
  // Stories take turns day by day, so the same one never comes twice in a row.
  const dayNo = Math.floor(Date.parse(day) / 86_400_000);
  const story = Number.isFinite(dayNo) ? CASES[((dayNo % CASES.length) + CASES.length) % CASES.length] : one(r, CASES);
  const woods = WORLDS.find((w) => w.id === 'mystery')?.words.map((w) => w.id) ?? [];
  const pool = [...new Set([...learned, ...woods])].filter(plain);
  const wordId = one(r, pool);
  const secret = WORDS.get(wordId)!;
  const word = secret.en.toUpperCase();

  // One problem per letter; all answers different, so every cell of the code table is unique.
  const start = int(r, 0, GENS.length - 1);
  const problems: Problem[] = [];
  const used = new Set<number>();
  for (let i = 0, guard = 0; i < word.length && guard < 200; guard++) {
    const p = GENS[(start + i) % GENS.length](r); // topics take turns: parts → area → volume → …
    if (used.has(p.answer)) continue;
    used.add(p.answer); problems.push(p); i++;
  }
  const decoys: number[] = [];
  while (decoys.length < 3) {
    const base = one(r, problems).answer;
    const d = Math.max(1, base + one(r, [-6, -4, -2, -1, 1, 2, 3, 5, 10]));
    if (!used.has(d) && !decoys.includes(d)) decoys.push(d);
  }
  const others = pickN(pool.filter((id) => id !== wordId && WORDS.get(id)!.ru !== secret.ru), 2, r).map((id) => WORDS.get(id)!.ru);
  const options = pickN([secret.ru, ...others], 3, r);
  const cipher: MysteryStep = { kind: 'cipher', word, problems, decoys,
    meaning: { q: `What does ${word} mean? · Что значит это слово?`, options, answer: options.indexOf(secret.ru) } };

  const [c1, c2] = pickN([0, 1, 2, 3, 4], 2, r);
  const steps: MysteryStep[] = [clueStep(r, c1), cipher, clueStep(r, c2)];
  const mystery: Exercise = { type: 'mystery', title: story.title,
    // The story itself is on the cover card (DailyCase page), so the journal page just sets the task.
    intro: { en: "Grandpa Otto's journal has a page about strange things like this. Read the clues and crack the code, detective {name}!",
      ru: 'В дневнике дедушки Отто есть страница про такие странности. Читай улики и разгадай шифр, сыщик!', emoji: '📔' }, steps,
    reveal: { en: story.reveal, ru: story.revealRu, emoji: story.revealEmoji } };

  // Warm-up and cool-down with the journal words (not the secret word, so the cipher stays a surprise).
  const rest = pool.filter((id) => id !== wordId);
  const listenIds = pickN(rest, 3, r);
  const listen: Exercise = { type: 'listen', title: 'Journal words: listen!',
    items: listenIds.map((id) => {
      const opts = pickN([id, ...pickN(rest.filter((x) => x !== id && WORDS.get(x)!.ru !== WORDS.get(id)!.ru), 2, r)], 3, r);
      return { say: WORDS.get(id)!.en, options: opts.map((o) => ({ text: WORDS.get(o)!.ru })), answer: opts.indexOf(id) };
    }) };
  const spell: Exercise = { type: 'spell', title: 'Write it in the journal!', words: pickN(rest.filter((id) => !listenIds.includes(id)), 2, r) };

  const id = `case-${day}`;
  return { id, day, story, episode: { id, title: story.title, emoji: story.emoji, kind: 'lesson', exercises: [listen, mystery, spell] } };
}

export const CASE_BONUS = 30;
