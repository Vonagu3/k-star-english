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
  });
});
