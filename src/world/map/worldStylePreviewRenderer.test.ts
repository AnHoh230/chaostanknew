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
  it('materialisiert den PlacementPlan ohne Graybox und entsorgt alle Meshes', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);

    const handle = createWorldStylePreview(scene, planFixture(), IRONWASTE_V1_PREVIEW_KIT);

    expect(handle.meshCount).toBe(scene.meshes.length);
    expect(handle.meshCount).toBeGreaterThan(0);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('style_ground_'))).toBe(true);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('style_road_'))).toBe(true);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('map_'))).toBe(false);
    handle.dispose();
    expect(scene.meshes).toHaveLength(0);
    engine.dispose();
  }, 30_000);

  it('bricht bei einem unbekannten Geometrierezept hart ab', () => {
    const plan = planFixture();
    const index = plan.placements.findIndex((placement) => placement.kind === 'landscape');
    const placement = plan.placements[index]!;
    const invalid: WorldAssetPlacementPlan = {
      ...plan,
      placements: plan.placements.map((entry, entryIndex) => entryIndex === index
        ? { ...placement, asset: { ...placement.asset, geometryRecipe: 'unknown' } }
        : entry),
    };
    const engine = new NullEngine();
    const scene = new Scene(engine);

    expect(() => createWorldStylePreview(scene, invalid, IRONWASTE_V1_PREVIEW_KIT))
      .toThrow('unsupported-style-geometry-recipe:unknown');
    engine.dispose();
  }, 30_000);
});
