import { describe, expect, it } from 'vitest';
import { compileRequiredAssetCatalog, REQUIRED_ASSET_CATALOG } from './assetDemandCompiler';
import { GENERATOR_CAPABILITY_SPEC } from './generatorCapabilitySpec';

describe('assetDemandCompiler', () => {
  it('kompiliert dieselbe Grammatik unabhaengig von ihrer Eingabereihenfolge bytegleich', () => {
    const forward = compileRequiredAssetCatalog(GENERATOR_CAPABILITY_SPEC);
    const reversed = compileRequiredAssetCatalog([...GENERATOR_CAPABILITY_SPEC].reverse());

    expect(forward).toEqual(reversed);
    expect(forward.signature).toMatch(/^[0-9a-f]{8}$/);
    expect(JSON.stringify(forward)).toBe(JSON.stringify(reversed));
  });

  it('deckt Landschaft, alle Biom-Boeden und parametrische Fahrgeometrie mathematisch ab', () => {
    const byClass = new Map(REQUIRED_ASSET_CATALOG.families.map((family) => [family.demandClass, family]));

    expect(byClass.get('industrial.linearBarrier')).toMatchObject({
      source: 'landscape',
      geometryMode: 'bounded',
      biomes: ['industrial'],
    });
    expect(byClass.get('ground.industrial')).toMatchObject({
      source: 'ground',
      geometryMode: 'tileable',
    });
    expect(byClass.get('corridor.surface')).toMatchObject({
      source: 'corridor',
      geometryMode: 'parametric',
    });
    expect(byClass.get('ground.transition')?.connectorProfiles).toEqual(['biome-boundary-v1']);
    expect(byClass.get('site.wastelandOutpost')).toMatchObject({ source: 'site', biomes: ['wasteland'] });
    expect(byClass.get('site.mudBasin')).toMatchObject({ source: 'site', biomes: ['mud'] });
    expect(byClass.get('site.ruinsComplex')).toMatchObject({ source: 'site', biomes: ['ruins'] });
    expect(byClass.get('site.craterStation')).toMatchObject({ source: 'site', biomes: ['crater'] });
    expect(byClass.get('environment.dryBrush')).toMatchObject({ source: 'environment', biomes: ['ruins', 'scrap', 'wasteland'] });
    expect(byClass.get('environment.wetBrush')).toMatchObject({ source: 'environment', biomes: ['mud', 'wasteland'] });
    expect(byClass.get('environment.rockOutcrop')).toMatchObject({ source: 'environment', geometryMode: 'bounded' });
    expect(REQUIRED_ASSET_CATALOG.families).toHaveLength(39);
  });

  it('verwirft widerspruechliche Regeln fuer dieselbe Demand-Class', () => {
    const rule = GENERATOR_CAPABILITY_SPEC.find((entry) => entry.demandClass === 'industrial.linearBarrier')!;

    expect(() => compileRequiredAssetCatalog([
      rule,
      { ...rule, requiredVariants: rule.requiredVariants + 1 },
    ])).toThrow('conflicting-capability-rule:industrial.linearBarrier');
  });
});
