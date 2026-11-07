import { describe as group, expect, it } from 'vitest';
import { FLOOR_TOP, clockSay, describe, descendants, neighbour, normalize, settle, surfaceTop, toCell, type Placed } from './dorm';

const P = (item: string, fx: number, fy: number, on?: string): Placed => ({ item, x: 0, y: 0, room: 'bedroom', fx, fy, on });

group('normalize (old grid saves)', () => {
  it('maps grid cells onto the floor and wall items onto the wall', () => {
    const bed = normalize({ item: 'bed', x: 0, y: 2 });
    expect(bed.fy).toBeGreaterThan(FLOOR_TOP);
    expect(normalize({ item: 'poster', x: 3, y: 0 }).fy).toBeLessThan(FLOOR_TOP);
    expect(toCell(bed.fx, bed.fy)).toEqual({ x: 0, y: 2 });
  });
  it('keeps free coordinates', () => {
    expect(normalize(P('cat', 40, 80))).toMatchObject({ fx: 40, fy: 80 });
  });
});

group('settle', () => {
  const table = P('table', 50, 80);
  it('drops a cake onto the table under it', () => {
    const at = settle('cake', 51, 40, [table]);
    expect(at.on).toBe('table');
    expect(at.fy).toBeCloseTo(surfaceTop(table)!);
  });
  it('falls to the floor when nothing is below', () => {
    const at = settle('cake', 10, 30, [table]);
    expect(at.on).toBeUndefined();
    expect(at.fy).toBeGreaterThan(FLOOR_TOP);
  });
  it('lets a small thing go under the table if dropped low', () => {
    const at = settle('cat', 50, 85, [table]);
    expect(at.on).toBeUndefined();
    expect(at.fy).toBe(85);
  });
  it('keeps posters on the wall', () => {
    const at = settle('poster', 50, 90, []);
    expect(at.fy).toBeLessThan(FLOOR_TOP);
  });
  it('stacks things and never puts an item onto what rests on it', () => {
    const books = P('books', 50, surfaceTop(table)!, 'table');
    expect(settle('cake', 50, 30, [table, books]).on).toBe('books');
    expect(settle('table', 50, 30, [books]).on).toBeUndefined();
    expect([...descendants('table', [table, books])]).toEqual(['books']);
  });
});

group('describe', () => {
  it('uses on / under / between / next to', () => {
    const table = P('table', 50, 80);
    const cake = P('cake', 50, surfaceTop(table)!, 'table');
    const cat = P('cat', 50, 80);
    expect(describe(cake, [table, cake])).toBe('The cake is on the table.');
    expect(describe(cat, [table, cat])).toBe('The cat is under the table.');
    const a = P('plant', 20, 80), b = P('teddy', 31, 80), c = P('ball', 41, 80);
    expect(describe(b, [a, b, c])).toBe('The teddy is between the plant and the ball.');
    expect(describe(a, [a, b])).toBe('The plant is next to the teddy.');
    expect(describe(P('poster', 30, 40), [P('poster', 30, 40), P('bed', 30, 85)])).toBe('The poster is on the wall above the bed.');
    expect(describe(P('guitar', 80, 80), [P('guitar', 80, 80)])).toBe('There is a guitar in the bedroom.');
  });
});

group('house', () => {
  it('knows which room is next door', () => {
    expect(neighbour('bedroom', 'down')).toBe('living');
    expect(neighbour('kitchen', 'right')).toBe('garden');
    expect(neighbour('bedroom', 'up')).toBeNull();
  });
  it('tells the time to the nearest quarter', () => {
    expect(clockSay(new Date(2026, 0, 1, 15, 0))).toBe("It's three o'clock.");
    expect(clockSay(new Date(2026, 0, 1, 15, 31))).toBe("It's half past three.");
    expect(clockSay(new Date(2026, 0, 1, 15, 44))).toBe("It's quarter to four.");
    expect(clockSay(new Date(2026, 0, 1, 23, 58))).toBe("It's twelve o'clock.");
  });
});
