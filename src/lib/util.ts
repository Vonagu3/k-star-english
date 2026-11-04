export function shuffle<T>(arr: readonly T[], seed?: number): T[] {
  const a = [...arr];
  let r = seed ?? Math.random() * 1e9;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor((seed === undefined ? Math.random() : rnd()) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const sample = <T,>(arr: readonly T[], n: number) => shuffle(arr).slice(0, n);
export const subName = (text: string, name: string) => text.replaceAll('{name}', name || 'Star');
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const tidy = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const NUMBERS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19',
  twenty: '20', thirty: '30', forty: '40', fifty: '50', sixty: '60', seventy: '70', eighty: '80', ninety: '90', 'one hundred': '100', 'a hundred': '100',
};
const DAYS: Record<string, string> = { monday: 'MON', tuesday: 'TUE', wednesday: 'WED', thursday: 'THU', friday: 'FRI', saturday: 'SAT', sunday: 'SUN' };
/** Short calendar label for days of the week (they have no distinct emoji). */
export const dayFor = (en: string) => DAYS[en.toLowerCase()];
/** Digits for number words, so they show as numbers instead of stand-in emoji. */
export const numberFor = (en: string) => NUMBERS[en.toLowerCase()];
