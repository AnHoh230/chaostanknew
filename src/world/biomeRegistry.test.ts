import { describe, it, expect } from 'vitest';
import { registerBiome, getBiome } from './biomeRegistry';

describe('biomeRegistry', () => {
  it('Default-Biom "steppe" ist beim Modulladen registriert', () => {
    const b = getBiome('steppe');
    expect(b.id).toBe('steppe');
    expect(b.groundColor).toEqual([0.36, 0.4, 0.24]);
  });

  it('getBiome wirft bei unbekanntem Biom (§21.6 Negativtest, keine stillen Fallbacks)', () => {
    expect(() => getBiome('does_not_exist')).toThrowError('Unknown biome: does_not_exist');
  });

  it('registerBiome fügt ein Biom hinzu, das danach abrufbar ist', () => {
    registerBiome({ id: 'arctic', groundColor: [0.8, 0.85, 0.9] });
    expect(getBiome('arctic').groundColor).toEqual([0.8, 0.85, 0.9]);
  });

  it('registerBiome überschreibt ein bestehendes Biom', () => {
    registerBiome({ id: 'steppe', groundColor: [0.36, 0.4, 0.24] });
    expect(getBiome('steppe').groundColor).toEqual([0.36, 0.4, 0.24]);
  });
});
