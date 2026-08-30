import { assertAssetFits, resolveAsset, type AssetDef } from './assetKit';
import { createSeedStream } from './seedStreams';
import { entityKindForTraversal, type RuntimeKarte } from './runtimeMap';
import type { GenerierteWelt, LandscapeFeature } from './worldTypes';

export { assertAssetFits } from './assetKit';

function fittingScale(feature: LandscapeFeature, asset: AssetDef): number {
  const maxX = (feature.footprint.halfX - asset.clearance) / asset.blockingShape.halfX;
  const maxZ = (feature.footprint.halfZ - asset.clearance) / asset.blockingShape.halfZ;
  return Math.max(0.1, Math.min(2.5, maxX, maxZ) * 0.9);
}

export function resolveGraybox(world: GenerierteWelt): RuntimeKarte {
  const rng = createSeedStream(world.seed, 'visuals');
  const entities = world.features.map((feature, index) => {
    const asset = resolveAsset(feature, rng);
    const scale = fittingScale(feature, asset);
    assertAssetFits(feature, asset, scale);
    const rotation = asset.allowedRotations === 'any'
      ? feature.rotation
      : asset.allowedRotations[rng.int(asset.allowedRotations.length)] ?? 0;
    return {
      id: `runtime_feature_${index}`,
      kind: entityKindForTraversal(feature.traversal, feature.role === 'landmark'),
      asset: asset.id,
      pos: { ...feature.position },
      rotY: rotation,
      scale,
      params: {
        ...asset.defaultParams,
        featureId: feature.id,
        regionId: feature.regionId,
        biomeId: feature.biomeId,
        landscapeRole: feature.role,
      },
    };
  });
  const spawn = world.sites.find((site) => site.id === 'spawn') ?? world.sites[0];
  if (!spawn) throw new Error('graybox-world-has-no-spawn');
  return {
    seed: world.seed,
    extents: { ...world.extents },
    spawn: { ...spawn.center },
    entities,
    regionGrid: { ...world.regions.grid, extents: { ...world.regions.grid.extents } },
    traversalGrid: {
      ...world.reservations[0]!.grid,
      extents: { ...world.reservations[0]!.grid.extents },
    },
    regionCells: world.regions.regionByCell.map((regionId, cell) => ({
      cell,
      regionId,
      biomeId: world.regions.biomeByCell[cell]!,
    })),
    corridors: world.corridors.map((corridor) => ({
      ...corridor,
      centerline: corridor.centerline.map((point) => ({ ...point })),
      cells: [...corridor.cells],
    })),
  };
}
