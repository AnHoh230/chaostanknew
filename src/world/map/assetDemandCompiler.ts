import type {
  AssetDemandRule,
  RequiredAssetCatalog,
  RequiredAssetFamily,
} from './assetDemandTypes';
import { GENERATOR_CAPABILITY_SPEC } from './generatorCapabilitySpec';

function sortStrings(values: readonly string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function normalizeRule(rule: AssetDemandRule): RequiredAssetFamily {
  return {
    ...rule,
    biomes: sortStrings(rule.biomes) as AssetDemandRule['biomes'],
    minFootprint: { ...rule.minFootprint },
    maxFootprint: { ...rule.maxFootprint },
    connectorProfiles: sortStrings(rule.connectorProfiles),
    requiredStates: sortStrings(rule.requiredStates) as AssetDemandRule['requiredStates'],
  };
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function compileRequiredAssetCatalog(rules: readonly AssetDemandRule[]): RequiredAssetCatalog {
  const byDemandClass = new Map<string, RequiredAssetFamily>();
  for (const input of rules) {
    const rule = normalizeRule(input);
    const existing = byDemandClass.get(rule.demandClass);
    if (existing && JSON.stringify(existing) !== JSON.stringify(rule)) {
      throw new Error(`conflicting-capability-rule:${rule.demandClass}`);
    }
    byDemandClass.set(rule.demandClass, rule);
  }
  const families = [...byDemandClass.values()]
    .sort((a, b) => a.demandClass.localeCompare(b.demandClass));
  const generatorVersion = 'hybrid-asset-grammar-v2';
  return {
    schemaVersion: 1,
    generatorVersion,
    families,
    signature: fnv1a(JSON.stringify({ schemaVersion: 1, generatorVersion, families })),
  };
}

export const REQUIRED_ASSET_CATALOG = compileRequiredAssetCatalog(GENERATOR_CAPABILITY_SPEC);
