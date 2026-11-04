import { describe, expect, it } from 'vitest';
import { checkSpeech, normalise } from './speech';

describe('checkSpeech', () => {
  it('rejects a different name', () => {
    expect(checkSpeech('My name is Anna.', ['my name is Kolya'], ['Anna']).ok).toBe(false);
    expect(checkSpeech('My name is Anna.', ['my name is Nikolai'], ['Anna']).ok).toBe(false);
  });
  it('accepts small recogniser misspellings of the name', () => {
    expect(checkSpeech('My name is Anna.', ['my name is Annie'], ['Anna']).ok).toBe(true);
    expect(checkSpeech('My name is Anna.', ['my name is Ana'], ['Anna']).ok).toBe(true);
    expect(checkSpeech('M, A, R, I, A.', ['m a r i a'], []).ok).toBe(true);
  });
  it('compares a Cyrillic name with its Latin spelling', () => {
    expect(checkSpeech('My name is Анна.', ['my name is Anna'], ['Анна']).ok).toBe(true);
    expect(checkSpeech('My name is Анна.', ['my name is Sasha'], ['Анна']).ok).toBe(false);
  });
  it('needs every word in short phrases and keeps order', () => {
    expect(checkSpeech("Hello! I'm a trainee.", ['hello I am a trainee']).ok).toBe(true);
    expect(checkSpeech("Hello! I'm a trainee.", ['hello']).ok).toBe(false);
    expect(checkSpeech('I have got a cat.', ['I have got a dog']).ok).toBe(false);
    expect(checkSpeech('She is ten.', ['she is 10']).ok).toBe(true);
  });
  it('checks spelling of letters in several forms', () => {
    expect(checkSpeech('M, A, R, I, A.', ['m a r i a']).ok).toBe(true);
    expect(checkSpeech('M, A, R, I, A.', ['MARIA']).ok).toBe(true);
    expect(checkSpeech('M, A, R, I, A.', ['em ay ar eye ay']).ok).toBe(true);
    expect(checkSpeech('M, A, R, I, A.', ['m a r k']).ok).toBe(false);
  });
  it('accepts counting however the recogniser writes numbers', () => {
    for (const heard of ['one two three four five', '1 2 3 4 5', '12345', '1, 2, 3, 4, 5', '1 2 3 45']) {
      expect(checkSpeech('One, two, three, four, five.', [heard]).ok).toBe(true);
    }
    expect(checkSpeech('One, two, three, four, five.', ['1 2 3 4']).ok).toBe(false);
    expect(checkSpeech('One, two, three, four, five.', ['1 2 3 4 6']).ok).toBe(false);
    expect(checkSpeech("I'm ten.", ["I'm 10"]).ok).toBe(true);
    expect(checkSpeech('Six, seven, eight, nine, ten!', ['678910']).ok).toBe(true);
    expect(checkSpeech("It's half past seven.", ["it's 7:30"]).ok).toBe(true);
    expect(checkSpeech("It's seven o'clock.", ["it's 7:00"]).ok).toBe(true);
    expect(checkSpeech("It's seven o'clock.", ["it's 7 o'clock"]).ok).toBe(true);
    expect(checkSpeech("It's seven o'clock.", ["it's 8 o'clock"]).ok).toBe(false);
    expect(checkSpeech('There are twenty-one stars.', ['there are 21 stars']).ok).toBe(true);
    expect(checkSpeech('One hundred!', ['100']).ok).toBe(true);
    const m = checkSpeech('One, two, three. Go!', ['one two three']);
    expect(m.matched).toEqual([true, true, true, false]);
  });
  it('rejects long unrelated speech that happens to contain the words', () => {
    expect(checkSpeech('I like pizza.', ['i really really like to eat a big pizza with my mum and dad every day']).ok).toBe(false);
  });
  it('allows one missed word in longer sentences', () => {
    expect(checkSpeech('There is a big red lamp on my desk.', ['there is a big lamp on my desk']).ok).toBe(true);
    expect(checkSpeech('There is a big red lamp on my desk.', ['there is a lamp']).ok).toBe(false);
  });
  it('judges only the top transcript, not the recogniser guesses', () => {
    expect(checkSpeech("What's your name?", ["what's his name", "what's your name"]).ok).toBe(false);
    expect(checkSpeech("What's your name?", ["what's his name"]).ok).toBe(false);
    expect(checkSpeech('I like cats.', ['eye like hats', 'I like cats']).ok).toBe(false);
  });
  it('lets another guess supply only the name', () => {
    expect(checkSpeech('My name is Anna.', ['my name is Hannah banana', 'my name is Anna'], ['Anna']).ok).toBe(true);
    expect(checkSpeech('My name is Anna.', ['my game is fun', 'my name is Anna'], ['Anna']).ok).toBe(false);
  });
  it('marks words', () => {
    const r = checkSpeech('I like cats.', ['I like cats']);
    expect(r.ok).toBe(true);
    expect(r.matched).toEqual([true, true, true]);
    const bad = checkSpeech('I like cats.', ['I like dogs']);
    expect(bad.matched).toEqual([true, true, false]);
  });
  it('normalises contractions and punctuation', () => {
    expect(normalise("He's got a cat, isn't it?")).toBe('he has got a cat is not it');
    expect(normalise('One, two, three!')).toBe('1 2 3');
    expect(normalise('Oh no!')).toBe('oh no');
  });
});

import world1 from '../content/stage1/world1.json';
import world2 from '../content/stage1/world2.json';
import world3 from '../content/stage1/world3.json';
import paris from '../content/stage1/world-paris.json';
import { subName } from './util';

describe('every Say it! phrase in the content can be passed', () => {
  const DIGITS: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', twenty: '20' };
  const texts: string[] = [];
  for (const w of [world1, world2, world3, paris] as { weeks: { episodes: { exercises: { type: string; items?: { text: string }[] }[] }[] }[]; showcase: { exercises: { type: string; items?: { text: string }[] }[] }; finale?: { exercises: { type: string; items?: { text: string }[] }[] } }[]) {
    const eps = [...w.weeks.flatMap((wk) => wk.episodes), w.showcase, ...(w.finale ? [w.finale] : [])];
    for (const ep of eps) for (const ex of ep.exercises) if (ex.type === 'speak') for (const it of ex.items ?? []) texts.push(subName(it.text, 'Anna'));
  }
  it(`passes all ${texts.length} phrases said exactly, and with numbers as digits`, () => {
    const failed: string[] = [];
    for (const t of texts) {
      const plain = t.replace(/[!?.,]/g, '');
      const digits = plain.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty)\b/gi, (m) => DIGITS[m.toLowerCase()]);
      if (!checkSpeech(t, [plain], ['Anna']).ok) failed.push(`exact: ${t}`);
      if (!checkSpeech(t, [digits], ['Anna']).ok) failed.push(`digits: ${t} <- ${digits}`);
    }
    expect(failed).toEqual([]);
  });
});
