import type {
  AssetDemandOccurrence,
  AssetFamily,
  AssetVariant,
  RequiredAssetCatalog,
  ResolvedAssetChoice,
  WorldStyleKit,
  WorldStyleKitValidation,
} from './assetDemandTypes';

function assertUnique(values: readonly string[], prefix: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${prefix}:${value}`);
    seen.add(value);
  }
}

function coversConnectors(family: AssetFamily, required: readonly string[]): boolean {
  return required.every((profile) => family.connectorProfiles.includes(profile));
}

function validateVariant(family: AssetFamily, variant: AssetVariant, maxHalfX: number, maxHalfZ: number): void {
  if (variant.familyId !== family.id) throw new Error(`variant-family-mismatch:${variant.id}`);
  if (variant.files.length === 0) throw new Error(`asset-variant-has-no-files:${variant.id}`);
  if (variant.footprint.halfX < 0 || variant.footprint.halfZ < 0) {
    throw new Error(`asset-variant-negative-footprint:${variant.id}`);
  }
  if (variant.footprint.halfX > maxHalfX || variant.footprint.halfZ > maxHalfZ) {
    throw new Error(`asset-variant-envelope-exceeded:${variant.id}`);
  }
  if (family.connectorProfiles.includes('yard-road-v1')) {
    const validPort = variant.ports.some((port) => port.width > 0 && port.clearance >= 0);
    if (!validPort) throw new Error(`asset-variant-missing-yard-port:${variant.id}`);
  }
}

export function validateWorldStyleKit(
  kit: WorldStyleKit,
  catalog: RequiredAssetCatalog,
): WorldStyleKitValidation {
  if (kit.catalogSignature !== catalog.signature) {
    throw new Error(`style-kit-catalog-signature-mismatch:${kit.id}`);
  }
  assertUnique(kit.families.map((family) => family.id), 'duplicate-family-id');
  assertUnique(kit.families.flatMap((family) => family.variants.map((variant) => variant.id)), 'duplicate-variant-id');
  if (kit.activation === 'preview' && kit.previewBiomes.length === 0) {
    throw new Error(`preview-kit-has-no-biomes:${kit.id}`);
  }
  assertUnique(kit.previewBiomes, 'duplicate-preview-biome');

  const catalogByClass = new Map(catalog.families.map((family) => [family.demandClass, family]));
  for (const family of kit.families) {
    if (family.styleKitId !== kit.id) throw new Error(`cross-kit-family:${family.id}`);
    for (const demandClass of family.fulfills) {
      const requirement = catalogByClass.get(demandClass);
      if (!requirement) throw new Error(`family-fulfills-unknown-demand:${family.id}:${demandClass}`);
      if (!coversConnectors(family, requirement.connectorProfiles)) {
        throw new Error(`family-missing-connector:${family.id}:${demandClass}`);
      }
      for (const variant of family.variants) {
        validateVariant(family, variant, requirement.maxFootprint.halfX, requirement.maxFootprint.halfZ);
      }
    }
  }

  const required = kit.activation === 'runtime'
    ? catalog.families.filter((family) => !family.reserved).map((family) => family.demandClass)
    : [...kit.previewScope];
  const missingDemandClasses: string[] = [];
  const coveredDemandClasses: string[] = [];
  for (const demandClass of required) {
    const requirement = catalogByClass.get(demandClass);
    if (!requirement) throw new Error(`style-kit-scope-unknown-demand:${demandClass}`);
    const families = kit.families.filter((family) => family.fulfills.includes(demandClass));
    const variants = families.flatMap((family) => family.variants);
    const states = new Set(variants.flatMap((variant) => variant.states));
    const covered = variants.length >= requirement.requiredVariants
      && requirement.requiredStates.every((state) => states.has(state));
    if (covered) coveredDemandClasses.push(demandClass);
    else missingDemandClasses.push(demandClass);
  }
  coveredDemandClasses.sort((a, b) => a.localeCompare(b));
  missingDemandClasses.sort((a, b) => a.localeCompare(b));
  if (missingDemandClasses.length > 0) {
    const prefix = kit.activation === 'runtime' ? 'runtime-kit-incomplete' : 'preview-kit-incomplete';
    throw new Error(`${prefix}:${missingDemandClasses.join(',')}`);
  }
  return { activation: kit.activation, coveredDemandClasses, missingDemandClasses };
}

function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function variantFits(variant: AssetVariant, demand: AssetDemandOccurrence): boolean {
  if (variant.geometryRecipe) return true;
  if (demand.footprint.halfX === 0 && demand.footprint.halfZ === 0) return true;
  return variant.footprint.halfX <= demand.footprint.halfX
    && variant.footprint.halfZ <= demand.footprint.halfZ;
}

export function resolveAssetFamily(
  kit: WorldStyleKit,
  demand: AssetDemandOccurrence,
  visualSeed: number,
): ResolvedAssetChoice {
  const families = kit.families
    .filter((family) => family.fulfills.some((entry) => entry === demand.demandClass))
    .filter((family) => demand.biomes.length === 0 || demand.biomes.every((biome) => family.biomes.includes(biome)))
    .filter((family) => coversConnectors(family, demand.connectorProfiles))
    .sort((a, b) => a.id.localeCompare(b.id));
  const choices = families.flatMap((family) => family.variants
    .filter((variant) => variantFits(variant, demand))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((variant) => ({ family, variant })));
  if (choices.length === 0) throw new Error(`no-compatible-style-family:${kit.id}:${demand.id}:${demand.demandClass}`);
  const index = hash32(`${visualSeed}:${kit.id}:${kit.version}:${demand.id}`) % choices.length;
  return choices[index]!;
}
