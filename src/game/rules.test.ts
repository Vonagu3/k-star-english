import { describe, expect, it } from 'vitest';
import { emptyState, mergeStates } from './store';
import { rankFor, starsFor, rewardsFor, isUnlocked, srsUpdate, srsDue, streakOnActive, questsForDay, dayKey, cardDrop } from './rules';

const D = 86400000;
const noon = new Date(2026, 10, 4, 12).getTime();

describe('ranks', () => {
  it('starts at trainee 1 and progresses', () => {
    expect(rankFor(0).rank.id).toBe('trainee1');
    expect(rankFor(999).rank.id).toBe('trainee1');
    expect(rankFor(1000).rank.id).toBe('trainee2');
    expect(rankFor(15000).rank.id).toBe('rookie');
    expect(rankFor(500).progress).toBeCloseTo(0.5);
    expect(rankFor(1e6).next).toBeNull();
  });
});

describe('stars & rewards', () => {
  it('maps accuracy to stars', () => {
    expect(starsFor(9, 10)).toBe(3);
    expect(starsFor(7, 10)).toBe(2);
    expect(starsFor(4, 10)).toBe(1);
    expect(starsFor(3, 10)).toBe(0);
    expect(starsFor(0, 0)).toBe(3);
  });
  it('gives no hearts for a failed run, more for first time', () => {
    expect(rewardsFor('lesson', 2, 0, true).hearts).toBe(0);
    expect(rewardsFor('lesson', 10, 3, true).hearts).toBeGreaterThan(rewardsFor('lesson', 10, 3, false).hearts);
    expect(rewardsFor('showcase', 10, 2, true).fans).toBeGreaterThan(rewardsFor('lesson', 10, 2, true).fans);
  });
  it('drops cards by kind', () => {
    expect(cardDrop('weekly', 1, true, 0.99)).toBe('rare');
    expect(cardDrop('lesson', 0, true, 0)).toBeNull();
    expect(cardDrop('debut', 1, false, 0.99)).toBe('legend');
  });
});

describe('unlocking', () => {
  const order = [
    { id: 'a', worldId: 'w1', kind: 'lesson' as const },
    { id: 'b', worldId: 'w1', kind: 'showcase' as const },
    { id: 'c', worldId: 'w2', kind: 'lesson' as const },
    { id: 'd', worldId: 'w2', kind: 'lesson' as const },
  ];
  it('is sequential', () => {
    expect(isUnlocked(0, order, {}, [])).toBe(true);
    expect(isUnlocked(1, order, {}, [])).toBe(false);
    expect(isUnlocked(1, order, { a: 1 }, [])).toBe(true);
    expect(isUnlocked(2, order, { a: 3 }, [])).toBe(false);
  });
  it('bonus worlds start open', () => {
    expect(isUnlocked(2, order, {}, [], ['w2'])).toBe(true);
    expect(isUnlocked(3, order, {}, [], ['w2'])).toBe(false);
  });
  it('parent can force a world open', () => {
    expect(isUnlocked(2, order, {}, ['w2'])).toBe(true);
    expect(isUnlocked(3, order, {}, ['w2'])).toBe(false);
  });
});

describe('srs', () => {
  it('moves boxes and schedules', () => {
    const e1 = srsUpdate(undefined, true, noon);
    expect(e1.box).toBe(1);
    const e2 = srsUpdate(e1, true, noon);
    expect(e2.box).toBe(2);
    expect(srsUpdate(e2, false, noon).box).toBe(1);
    expect(srsDue({ x: e2, y: { box: 1, due: noon - D } }, noon)).toEqual(['y']);
  });
});

describe('streak', () => {
  it('continues, freezes once a week, resets', () => {
    const y = dayKey(noon - D);
    expect(streakOnActive({ streak: 3, lastActive: y, freezeWeek: null }, noon).streak).toBe(4);
    const two = dayKey(noon - 2 * D);
    const frozen = streakOnActive({ streak: 3, lastActive: two, freezeWeek: null }, noon);
    expect(frozen.streak).toBe(4);
    expect(streakOnActive({ streak: 3, lastActive: two, freezeWeek: frozen.freezeWeek }, noon).streak).toBe(1);
    expect(streakOnActive({ streak: 3, lastActive: dayKey(noon), freezeWeek: null }, noon).streak).toBe(3);
  });
});

describe('quests', () => {
  it('gives 3 distinct quests, first is an episode quest', () => {
    for (const d of ['2026-11-04', '2026-11-05', '2027-01-01']) {
      const q = questsForDay(d);
      expect(q).toHaveLength(3);
      expect(new Set(q.map((x) => x.id)).size).toBe(3);
      expect(q[0].metric).toBe('episodes');
    }
  });
});

describe('merge after reset', () => {
  it('ignores older snapshots after a reset', () => {
    const old = { ...emptyState(), updatedAt: 100, fans: 500, profile: { name: 'Old' } as never };
    const fresh = { ...emptyState(), updatedAt: 200, resetAt: 200 };
    const m = mergeStates(old, fresh);
    expect(m.profile).toBeNull();
    expect(m.fans).toBe(0);
    const later = { ...emptyState(), updatedAt: 300, fans: 10 };
    expect(mergeStates(fresh, later).fans).toBe(10);
  });
});
