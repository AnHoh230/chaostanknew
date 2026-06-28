import { describe, it, expect } from 'vitest';
import { getAsset, allAssets, assetsByThemeCategory, type AssetCategory } from './assetKit';
import type { ZoneTheme } from './mapTypes';

const KATEGORIEN: AssetCategory[] = ['ground', 'obstacle', 'breakable', 'hazard', 'setpiece', 'decor'];

describe('Asset-Kit (Phase 1)', () => {
  it('hat mindestens 3 Teile je Kategorie', () => {
    for (const cat of KATEGORIEN) {
      const n = allAssets().filter((a) => a.category === cat).length;
      expect(n, `Kategorie ${cat}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('getAsset wirft bei unbekannter Id (kein stiller Fallback)', () => {
    expect(() => getAsset('gibtsnicht')).toThrow();
  });

  it('assetsByThemeCategory filtert nach Thema UND Kategorie', () => {
    const theme: ZoneTheme = 'wrackCluster';
    const res = assetsByThemeCategory(theme, 'breakable');
    expect(res.length).toBeGreaterThan(0);
    for (const a of res) {
      expect(a.category).toBe('breakable');
      expect(a.themes).toContain(theme);
    }
  });
});
