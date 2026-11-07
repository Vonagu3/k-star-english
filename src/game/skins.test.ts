import { describe, expect, it } from 'vitest';
import { SHOP, SHOP_BY_ID, SKINS, isWearingSkin } from './catalog';

describe('ready-made looks', () => {
  it('have unique ids that do not clash with shop items, and some are free', () => {
    const ids = SKINS.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(SHOP_BY_ID.has(id)).toBe(false);
    expect(SKINS.filter((k) => k.price === 0).length).toBeGreaterThanOrEqual(3);
    expect(SKINS.filter((k) => k.price > 0).length).toBeGreaterThanOrEqual(8);
  });
  it('fill every slot except skin tone, and include parts sold nowhere else', () => {
    for (const k of SKINS) expect(Object.keys(k.look).sort()).toEqual(['acc', 'bg', 'eyes', 'face', 'fx', 'glasses', 'hair', 'hairColor', 'outfit', 'outfitColor', 'pet', 'stick']);
    const exclusive = SKINS.filter((k) => !SHOP.some((i) => i.slot === 'outfit' && i.value === k.look.outfit));
    expect(exclusive.length).toBeGreaterThanOrEqual(8);
  });
  it('wearing a look keeps your skin tone', () => {
    const k = SKINS[3];
    const look = { skin: '#a8714d', ...k.look };
    expect(isWearingSkin(look, k)).toBe(true);
    expect(isWearingSkin({ ...look, acc: 'crown' }, k)).toBe(false);
  });
});
