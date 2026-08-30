/**
 * Asset-Kit: generische, modulare Teile, aus denen der Generator die Karte komponiert.
 * Start als parametrische Platzhalter-Meshes (Form/Größe/Farbe) — echte Modelle später,
 * ohne Generator-Umbau. Registry-Muster analog biomeRegistry (lauter Fehler statt stiller Fallback).
 */
import type { Rng } from '../../core/rng';
import type { AssetId, Vec3 } from './mapTypes';
import type {
  BiomeId,
  Footprint,
  LandscapeFeature,
  PlacementMode,
  TraversalType,
} from './worldTypes';

export type AssetCategory = 'ground' | 'obstacle' | 'breakable' | 'hazard' | 'setpiece' | 'decor' | 'pickup';

export interface AssetDef {
  id: AssetId;
  category: AssetCategory;
  footprint: number; // Radius für Abstands-/Kollisionsprüfung bei der Platzierung
  blockingShape: Footprint;
  allowedBiomes: BiomeId[];
  placementModes: PlacementMode[];
  traversal: TraversalType;
  clearance: number;
  allowedRotations: 'any' | number[];
  tags: string[];
  mesh: { form: 'box' | 'cylinder' | 'cone' | 'sphere'; size: Vec3; color: [number, number, number] };
  textur?: string; // flache Tile-Textur (Decal, URL in public/tiles) statt Primitiv-Mesh
  defaultParams?: Record<string, number | string | boolean>;
}

const registry = new Map<AssetId, AssetDef>();

export function registerAsset(def: AssetDef): void {
  registry.set(def.id, def);
}

export function getAsset(id: AssetId): AssetDef {
  const d = registry.get(id);
  if (!d) throw new Error('Unknown asset: ' + id); // kein stiller Fallback
  return d;
}

export function allAssets(): AssetDef[] {
  return [...registry.values()];
}

export function assertAssetFits(feature: LandscapeFeature, asset: AssetDef, scale = 1): void {
  if (
    asset.blockingShape.halfX * scale + asset.clearance > feature.footprint.halfX + 1e-9
    || asset.blockingShape.halfZ * scale + asset.clearance > feature.footprint.halfZ + 1e-9
  ) throw new Error('asset-envelope-exceeded');
}

export function resolveAsset(feature: LandscapeFeature, rng: Rng): AssetDef {
  const candidates = allAssets()
    .filter((asset) => asset.traversal === feature.traversal)
    .filter((asset) => asset.allowedBiomes.includes(feature.biomeId))
    .filter((asset) => asset.placementModes.includes(feature.placementMode))
    .filter((asset) => {
      try { assertAssetFits(feature, asset); return true; } catch { return false; }
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  const preferredCategory: AssetCategory = feature.traversal === 'destructible'
    ? 'breakable'
    : feature.traversal === 'driveable'
      ? 'decor'
      : feature.role === 'landmark' ? 'setpiece' : 'obstacle';
  const preferred = candidates.filter((asset) => asset.category === preferredCategory);
  const pool = preferred.length > 0 ? preferred : candidates;
  if (pool.length === 0) {
    throw new Error(`no-fitting-asset:${feature.id}:${feature.biomeId}:${feature.traversal}:${feature.placementMode}:${feature.footprint.halfX}x${feature.footprint.halfZ}`);
  }
  return pool[rng.int(pool.length)]!;
}

// — Generisches Start-Kit (≥3 je Kategorie) —
const ALLE_BIOME: BiomeId[] = ['wasteland', 'scrap', 'industrial', 'mud', 'ruins', 'crater'];
const ALLE_PLATZIERUNGEN: PlacementMode[] = ['single', 'cluster', 'line', 'border', 'site'];

function traversalForCategory(category: AssetCategory): TraversalType {
  if (category === 'obstacle' || category === 'setpiece') return 'blocking';
  if (category === 'breakable') return 'destructible';
  return 'driveable';
}

function def(
  id: string,
  category: AssetCategory,
  footprint: number,
  allowedBiomes: BiomeId[],
  form: AssetDef['mesh']['form'],
  size: Vec3,
  color: [number, number, number],
  defaultParams?: Record<string, number | string | boolean>,
  textur?: string,
): AssetDef {
  const traversal = traversalForCategory(category);
  return {
    id,
    category,
    footprint,
    blockingShape: { halfX: Math.max(0.1, size.x / 2), halfZ: Math.max(0.1, size.z / 2) },
    allowedBiomes: [...allowedBiomes],
    placementModes: [...ALLE_PLATZIERUNGEN],
    traversal,
    clearance: traversal === 'blocking' ? 0.25 : traversal === 'destructible' ? 0.1 : 0,
    allowedRotations: 'any',
    tags: [category, form],
    mesh: { form, size, color },
    defaultParams,
    textur,
  };
}

[
  // ground
  def('boden_oel', 'ground', 6, ALLE_BIOME, 'box', { x: 12, y: 0.05, z: 12 }, [0.16, 0.15, 0.14]),
  def('boden_kies', 'ground', 6, ALLE_BIOME, 'box', { x: 12, y: 0.05, z: 12 }, [0.3, 0.29, 0.26]),
  def('boden_platte', 'ground', 6, ALLE_BIOME, 'box', { x: 12, y: 0.06, z: 12 }, [0.27, 0.28, 0.31]),
  // obstacle (nicht zerstörbar)
  def('wrack_auto', 'obstacle', 3, ['scrap', 'ruins', 'wasteland'], 'box', { x: 5, y: 2.2, z: 2.6 }, [0.4, 0.3, 0.24]),
  def('container', 'obstacle', 4, ['industrial', 'wasteland', 'ruins', 'crater'], 'box', { x: 6, y: 3, z: 2.8 }, [0.32, 0.42, 0.45]),
  def('rohrstapel', 'obstacle', 3, ['industrial', 'scrap', 'ruins'], 'cylinder', { x: 3, y: 2, z: 3 }, [0.36, 0.36, 0.38]),
  def('betonblock', 'obstacle', 2.5, ['industrial', 'wasteland', 'crater'], 'box', { x: 3.5, y: 2.4, z: 3.5 }, [0.5, 0.5, 0.48]),
  // breakable (zerstörbar)
  def('fass', 'breakable', 1, ALLE_BIOME, 'cylinder', { x: 1.2, y: 1.6, z: 1.2 }, [0.82, 0.54, 0.22], { hpKey: 'fass' }),
  def('kiste', 'breakable', 1.2, ALLE_BIOME, 'box', { x: 1.6, y: 1.6, z: 1.6 }, [0.54, 0.48, 0.35], { hpKey: 'kiste' }),
  def('schrotthaufen', 'breakable', 1.6, ['scrap', 'industrial', 'ruins'], 'sphere', { x: 2.4, y: 1.6, z: 2.4 }, [0.38, 0.36, 0.34], { hpKey: 'schrotthaufen' }),
  def('neonschild', 'breakable', 1, ['industrial', 'wasteland', 'ruins'], 'box', { x: 2.4, y: 2.6, z: 0.3 }, [0.2, 0.7, 0.8], { hpKey: 'neonschild' }),
  // hazard (Schaden bei Kontakt)
  def('presse', 'hazard', 3, ['industrial'], 'box', { x: 5, y: 0.4, z: 5 }, [0.7, 0.22, 0.18], { dmgKey: 'presse', getaktet: true }),
  def('stachelgrube', 'hazard', 2.5, ['scrap', 'industrial', 'ruins'], 'box', { x: 4, y: 0.3, z: 4 }, [0.55, 0.2, 0.18], { dmgKey: 'stachelgrube' }),
  def('giftpfuetze', 'hazard', 2.5, ['scrap', 'mud', 'wasteland'], 'cylinder', { x: 4, y: 0.2, z: 4 }, [0.36, 0.62, 0.24], { dmgKey: 'giftpfuetze' }),
  // setpiece (Wahrzeichen / Rampe / Insel)
  def('funkturm', 'setpiece', 4, ALLE_BIOME, 'cone', { x: 5, y: 16, z: 5 }, [0.62, 0.68, 0.74]),
  def('sprungrampe', 'setpiece', 3, ALLE_BIOME, 'box', { x: 6, y: 2, z: 9 }, [0.86, 0.7, 0.2]),
  def('bonusinsel', 'setpiece', 8, ALLE_BIOME, 'box', { x: 22, y: 1, z: 16 }, [0.24, 0.26, 0.3]),
  // decor (nicht-interaktiv)
  def('reifenstapel', 'decor', 1, ALLE_BIOME, 'cylinder', { x: 1.4, y: 1, z: 1.4 }, [0.12, 0.12, 0.12]),
  def('verkehrskegel', 'decor', 0.5, ALLE_BIOME, 'cone', { x: 0.7, y: 1, z: 0.7 }, [0.85, 0.4, 0.12]),
  def('truemmer', 'decor', 0.8, ALLE_BIOME, 'box', { x: 1.2, y: 0.5, z: 1 }, [0.34, 0.32, 0.3]),
  def('pfuetze', 'decor', 1, ['scrap', 'industrial', 'mud'], 'box', { x: 2, y: 0.05, z: 2 }, [0.2, 0.22, 0.24]),
  // decals — flache Tile-Overlays (echte Sheet-Textur mit Alpha statt Primitiv), liegen am Boden
  def('decal_krater', 'decor', 1.8, ALLE_BIOME, 'box', { x: 6, y: 0.3, z: 6 }, [1, 1, 1], undefined, 'tiles/decal_krater.png'),
  def('decal_schutt', 'decor', 1.2, ALLE_BIOME, 'box', { x: 4, y: 0.3, z: 4 }, [1, 1, 1], undefined, 'tiles/decal_schutt.png'),
  // pickup (Funde — Heilung/Toy; nie Impulse). Eigene Kategorie, vom Scatter als Collectible gestreut.
  def('fund_huhn', 'pickup', 0.8, ALLE_BIOME, 'sphere', { x: 0.9, y: 0.9, z: 0.9 }, [0.9, 0.8, 0.5], { effekt: 'heal' }),
  def('fund_schraube', 'pickup', 0.6, ALLE_BIOME, 'box', { x: 0.6, y: 0.6, z: 0.6 }, [0.85, 0.7, 0.2], { effekt: 'toy' }),
  def('fund_kanister', 'pickup', 0.7, ALLE_BIOME, 'cylinder', { x: 0.7, y: 1, z: 0.7 }, [0.3, 0.7, 0.85], { effekt: 'toy' }),
].forEach(registerAsset);
