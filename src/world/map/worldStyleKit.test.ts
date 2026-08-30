import { describe, expect, it } from 'vitest';
import { REQUIRED_ASSET_CATALOG } from './assetDemandCompiler';
import type { AssetDemandOccurrence, WorldStyleKit } from './assetDemandTypes';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';
import { resolveAssetFamily, validateWorldStyleKit } from './worldStyleKit';

const INDUSTRIAL_LINE: AssetDemandOccurrence = {
  id: 'feature_line_7',
  demandClass: 'industrial.linearBarrier',
  source: 'landscape',
  biomes: ['industrial'],
  footprint: { halfX: 14, halfZ: 14 },
  connectorProfiles: [],
};

describe('worldStyleKit', () => {
  it('akzeptiert den geschlossenen Vorschauumfang des Industrie-Schrott-Kits', () => {
    const validation = validateWorldStyleKit(IRONWASTE_V1_PREVIEW_KIT, REQUIRED_ASSET_CATALOG);

    expect(validation.activation).toBe('preview');
    expect(validation.missingDemandClasses).toEqual([]);
    expect(validation.coveredDemandClasses).toEqual([...IRONWASTE_V1_PREVIEW_KIT.previewScope].sort());
  });

  it('verwirft Preview-Kits ohne expliziten Biom-Scope', () => {
    const invalid = { ...IRONWASTE_V1_PREVIEW_KIT, previewBiomes: [] } as WorldStyleKit;

    expect(() => validateWorldStyleKit(invalid, REQUIRED_ASSET_CATALOG))
      .toThrow(`preview-kit-has-no-biomes:${invalid.id}`);
  });

  it('blockiert eine Runtime-Aktivierung solange der Gesamtkatalog nicht gedeckt ist', () => {
    const runtimeKit: WorldStyleKit = { ...IRONWASTE_V1_PREVIEW_KIT, activation: 'runtime' };

    expect(() => validateWorldStyleKit(runtimeKit, REQUIRED_ASSET_CATALOG))
      .toThrow(/runtime-kit-incomplete/);
  });

  it('verwirft Familien aus einem anderen WorldStyleKit', () => {
    const first = IRONWASTE_V1_PREVIEW_KIT.families[0]!;
    const crossKit: WorldStyleKit = {
      ...IRONWASTE_V1_PREVIEW_KIT,
      families: [{ ...first, styleKitId: 'foreign-kit' }, ...IRONWASTE_V1_PREVIEW_KIT.families.slice(1)],
    };

    expect(() => validateWorldStyleKit(crossKit, REQUIRED_ASSET_CATALOG))
      .toThrow(`cross-kit-family:${first.id}`);
  });

  it('waehlt eine passende Variante innerhalb derselben Kitversion deterministisch', () => {
    const first = resolveAssetFamily(IRONWASTE_V1_PREVIEW_KIT, INDUSTRIAL_LINE, 99);
    const second = resolveAssetFamily(IRONWASTE_V1_PREVIEW_KIT, INDUSTRIAL_LINE, 99);

    expect(first).toEqual(second);
    expect(first.family.fulfills).toContain('industrial.linearBarrier');
    expect(first.variant.familyId).toBe(first.family.id);
  });

  it('verwirft Varianten ausserhalb der autoritativen Kataloghuelle', () => {
    const familyIndex = IRONWASTE_V1_PREVIEW_KIT.families.findIndex((family) => (
      family.fulfills.includes('industrial.linearBarrier')
    ));
    const family = IRONWASTE_V1_PREVIEW_KIT.families[familyIndex]!;
    const invalid: WorldStyleKit = {
      ...IRONWASTE_V1_PREVIEW_KIT,
      families: IRONWASTE_V1_PREVIEW_KIT.families.map((entry, index) => index === familyIndex
        ? { ...family, variants: [{ ...family.variants[0]!, footprint: { halfX: 99, halfZ: 99 } }, ...family.variants.slice(1)] }
        : entry),
    };

    expect(() => validateWorldStyleKit(invalid, REQUIRED_ASSET_CATALOG))
      .toThrow(/asset-variant-envelope-exceeded/);
  });
});
