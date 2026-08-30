import type {
  AssetCoverageReport,
  ObservedFootprintRange,
  RequiredAssetCatalog,
} from './assetDemandTypes';
import { deriveWorldAssetDemands } from './worldAssetDemands';
import type { GenerierteWelt } from './worldTypes';

export interface AssetCoverageAccumulator {
  addWorld(world: GenerierteWelt): void;
  report(): AssetCoverageReport;
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function includeFootprint(
  ranges: Record<string, ObservedFootprintRange>,
  demandClass: string,
  halfX: number,
  halfZ: number,
): void {
  const current = ranges[demandClass];
  if (!current) {
    ranges[demandClass] = {
      min: { halfX, halfZ },
      max: { halfX, halfZ },
    };
    return;
  }
  current.min.halfX = Math.min(current.min.halfX, halfX);
  current.min.halfZ = Math.min(current.min.halfZ, halfZ);
  current.max.halfX = Math.max(current.max.halfX, halfX);
  current.max.halfZ = Math.max(current.max.halfZ, halfZ);
}

export function measureSeedDemandCoverage(
  worlds: readonly GenerierteWelt[],
  catalog: RequiredAssetCatalog,
): AssetCoverageReport {
  const accumulator = createAssetCoverageAccumulator(catalog);
  worlds.forEach((world) => accumulator.addWorld(world));
  return accumulator.report();
}

export function createAssetCoverageAccumulator(
  catalog: RequiredAssetCatalog,
): AssetCoverageAccumulator {
  const counts: Record<string, number> = {};
  const observedFootprints: Record<string, ObservedFootprintRange> = {};
  return {
    addWorld(world): void {
      for (const demand of deriveWorldAssetDemands(world)) {
        counts[demand.demandClass] = (counts[demand.demandClass] ?? 0) + 1;
        includeFootprint(observedFootprints, demand.demandClass, demand.footprint.halfX, demand.footprint.halfZ);
      }
    },
    report(): AssetCoverageReport {
      const orderedCounts = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
      const orderedFootprints = Object.fromEntries(Object.entries(observedFootprints)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([demandClass, range]) => [demandClass, {
          min: { ...range.min },
          max: { ...range.max },
        }]));
      const known = new Set<string>(catalog.families.map((family) => family.demandClass));
      const unknownDemandClasses = Object.keys(orderedCounts).filter((demandClass) => !known.has(demandClass));
      const missingCatalogClasses = catalog.families
        .filter((family) => !family.reserved && !orderedCounts[family.demandClass])
        .map((family) => family.demandClass)
        .sort((a, b) => a.localeCompare(b));
      const data = { counts: orderedCounts, observedFootprints: orderedFootprints, missingCatalogClasses, unknownDemandClasses };
      return { ...data, signature: fnv1a(JSON.stringify(data)) };
    },
  };
}
