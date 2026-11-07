import { describe, expect, it } from 'vitest';
import { fmtNum, isRight, parseAnswer } from './maths';

describe('parseAnswer', () => {
  it('reads plain, spaced and decimal-comma numbers', () => {
    expect(parseAnswer('7')).toBe(7);
    expect(parseAnswer('  7 ')).toBe(7);
    expect(parseAnswer('1 000')).toBe(1000);
    expect(parseAnswer('12,5')).toBe(12.5);
    expect(parseAnswer('12.5')).toBe(12.5);
  });
  it('rejects garbage', () => {
    expect(parseAnswer('')).toBeNull();
    expect(parseAnswer('abc')).toBeNull();
    expect(parseAnswer('1,2,3')).toBeNull();
    expect(parseAnswer('5 см')).toBeNull();
  });
});

describe('isRight', () => {
  it('compares numerically', () => {
    expect(isRight('60', 60)).toBe(true);
    expect(isRight('060', 60)).toBe(true);
    expect(isRight('0,3', 0.1 + 0.2)).toBe(true);
    expect(isRight('61', 60)).toBe(false);
  });
});

describe('fmtNum', () => {
  it('groups thousands', () => {
    expect(fmtNum(12500)).toBe('12 500');
    expect(fmtNum(999)).toBe('999');
    expect(fmtNum(2.5)).toBe('2,5');
  });
});
