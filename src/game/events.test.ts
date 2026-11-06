import { describe, expect, it } from 'vitest';
import { activeEvent, nextEvent, isBirthdayWeek, isBirthdayToday, EVENTS } from './events';

describe('seasonal events', () => {
  it('finds the running event, including ones over New Year', () => {
    expect(activeEvent(new Date(2026, 10, 7))?.id).toBe('autumn');
    expect(activeEvent(new Date(2026, 11, 31))?.id).toBe('winter');
    expect(activeEvent(new Date(2027, 0, 5))?.id).toBe('winter');
    expect(activeEvent(new Date(2026, 9, 31))?.id).toBe('halloween');
    expect(activeEvent(new Date(2026, 4, 10))).toBeNull();
  });
  it('knows the next event', () => {
    const n = nextEvent(new Date(2026, 10, 7));
    expect(n.event.id).toBe('winter');
    expect(n.days).toBe(38);
  });
  it('event ranges do not overlap', () => {
    for (let d = 0; d < 366; d++) {
      const date = new Date(2026, 0, 1 + d);
      const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const n = EVENTS.filter((e) => (e.from <= e.to ? md >= e.from && md <= e.to : md >= e.from || md <= e.to)).length;
      expect(n).toBeLessThanOrEqual(1);
    }
  });
  it('birthday week', () => {
    expect(isBirthdayWeek('11-09', new Date(2026, 10, 7))).toBe(true);
    expect(isBirthdayWeek('11-20', new Date(2026, 10, 7))).toBe(false);
    expect(isBirthdayToday('11-07', new Date(2026, 10, 7))).toBe(true);
  });
});
