import manifestJson from './ironwasteCandidateManifest.json';
import type { AssetCandidateManifest } from './assetCandidateManifest';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';
import { buildWorldAssetPlacementPlan, type WorldAssetPlacementPlan } from './worldAssetPlacement';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';
import type { GenerierteWelt } from './worldTypes';

const IRONWASTE_MANIFEST = manifestJson as AssetCandidateManifest;

export interface AssetLabStats {
  totalPlacements: number;
  resolvedPlacements: number;
  missingPlacements: number;
  resolvedClasses: string[];
  missingByClass: Record<string, number>;
}

export interface IronwastePreviewModel {
  world: GenerierteWelt;
  plan: WorldAssetPlacementPlan;
  stats: AssetLabStats;
  spriteFamilies: SpriteFamilyPreview[];
}

export interface SpriteFamilyPreview {
  demandClass: string;
  familyId: string;
  file: string;
}

function integerSeed(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`asset-lab-invalid-${label}:${value}`);
  return Math.trunc(value);
}

export function buildIronwastePreview(worldSeed: number, visualSeed: number): IronwastePreviewModel {
  const normalizedWorldSeed = integerSeed(worldSeed, 'world-seed');
  const normalizedVisualSeed = integerSeed(visualSeed, 'visual-seed');
  const world = generiereWelt(DEFAULT_WORLD_OPTIONS, normalizedWorldSeed);
  const plan = buildWorldAssetPlacementPlan(
    world,
    IRONWASTE_V1_PREVIEW_KIT,
    IRONWASTE_MANIFEST,
    normalizedVisualSeed,
  );
  const missingByClass: Record<string, number> = {};
  for (const placement of plan.placements) {
    if (placement.asset.status !== 'missing') continue;
    missingByClass[placement.demandClass] = (missingByClass[placement.demandClass] ?? 0) + 1;
  }
  const resolvedPlacements = plan.placements.filter((placement) => placement.asset.status === 'resolved');
  const spriteFamilies = IRONWASTE_V1_PREVIEW_KIT.families.flatMap((family) => {
    const file = family.variants[0]?.files[0];
    if (!file || !/\/sprite_[a-z_]+\.png$/.test(file)) return [];
    return family.fulfills.map((demandClass) => ({ demandClass, familyId: family.id, file }));
  }).sort((a, b) => a.demandClass.localeCompare(b.demandClass));
  return {
    world,
    plan,
    spriteFamilies,
    stats: {
      totalPlacements: plan.placements.length,
      resolvedPlacements: resolvedPlacements.length,
      missingPlacements: plan.placements.length - resolvedPlacements.length,
      resolvedClasses: [...new Set(resolvedPlacements.map((placement) => placement.demandClass))]
        .sort((a, b) => a.localeCompare(b)),
      missingByClass: Object.fromEntries(
        Object.entries(missingByClass).sort(([a], [b]) => a.localeCompare(b)),
      ),
    },
  };
}
