import { NullEngine, Scene } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import manifestJson from './ironwasteCandidateManifest.json';
import type { AssetCandidateManifest } from './assetCandidateManifest';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';
import { buildWorldAssetPlacementPlan, type WorldAssetPlacementPlan } from './worldAssetPlacement';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';
import { createWorldStylePreview } from './worldStylePreviewRenderer';

const MANIFEST = manifestJson as AssetCandidateManifest;

function planFixture(): WorldAssetPlacementPlan {
  const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 17);
  return buildWorldAssetPlacementPlan(world, IRONWASTE_V1_PREVIEW_KIT, MANIFEST, 2);
}

describe('worldStylePreviewRenderer', () => {
  it('materialisiert echte Familien und jede fehlende Familie als sichtbaren Diagnose-Marker', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const plan = planFixture();

    const handle = createWorldStylePreview(scene, plan, IRONWASTE_V1_PREVIEW_KIT);

    expect(handle.meshCount).toBe(scene.meshes.length);
    expect(handle.meshCount).toBeGreaterThan(0);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('style_ground_'))).toBe(true);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('style_road_'))).toBe(true);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('style_sprite_'))).toBe(true);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('style_missing_'))).toBe(true);
    expect(scene.meshes.filter((mesh) => mesh.name.startsWith('style_missing_')))
      .toHaveLength(plan.placements.filter((placement) => placement.asset.status === 'missing').length);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('style_primitive_'))).toBe(false);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('map_'))).toBe(false);
    handle.dispose();
    expect(scene.meshes).toHaveLength(0);
    engine.dispose();
  }, 30_000);

  it('weist sichtbare Script-Geometrie im Preview hart zurueck', () => {
    const plan = planFixture();
    const index = plan.placements.findIndex((placement) => (
      placement.kind === 'landscape' && placement.asset.status === 'resolved'
    ));
    const placement = plan.placements[index]!;
    if (placement.asset.status !== 'resolved') throw new Error('test-fixture-needs-resolved-landscape');
    const invalid: WorldAssetPlacementPlan = {
      ...plan,
      placements: plan.placements.map((entry, entryIndex) => entryIndex === index
        ? { ...placement, asset: { ...placement.asset, geometryRecipe: 'industrial-wall-and-hall-shell' } }
        : entry),
    };
    const engine = new NullEngine();
    const scene = new Scene(engine);

    expect(() => createWorldStylePreview(scene, invalid, IRONWASTE_V1_PREVIEW_KIT))
      .toThrow('style-preview-scripted-geometry-forbidden');
    engine.dispose();
  }, 30_000);

});
