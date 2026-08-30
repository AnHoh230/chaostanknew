import { describe, it, expect } from 'vitest';
import { getAsset, allAssets, assetsByThemeCategory, assertAssetFits, type AssetCategory } from './assetKit';
import type { ZoneTheme } from './mapTypes';
import type { LandscapeFeature } from './worldTypes';

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

  it('traegt fuer jedes Asset den vollstaendigen Generatorvertrag', () => {
    for (const asset of allAssets()) {
      expect(asset.blockingShape.halfX).toBeGreaterThan(0);
      expect(asset.blockingShape.halfZ).toBeGreaterThan(0);
      expect(asset.allowedBiomes.length).toBeGreaterThan(0);
      expect(asset.placementModes.length).toBeGreaterThan(0);
      expect(asset.clearance).toBeGreaterThanOrEqual(0);
      expect(asset.tags).toBeDefined();
    }
  });

  it('verwirft Assets, deren Blockierform die Feature-Huelle ueberragt', () => {
    const feature: LandscapeFeature = {
      id: 'f', biomeId: 'industrial', regionId: 'r', shape: 'line', size: 'large',
      traversal: 'blocking', role: 'border', placementMode: 'line',
      footprint: { halfX: 8, halfZ: 12 }, clearance: 0,
      position: { x: 0, z: 0 }, rotation: 0,
    };
    const oversized = { ...getAsset('container'), blockingShape: { halfX: 10, halfZ: 15 } };
    expect(() => assertAssetFits(feature, oversized)).toThrow('asset-envelope-exceeded');
  });
});
