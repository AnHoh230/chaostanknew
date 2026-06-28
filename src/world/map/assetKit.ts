/**
 * Asset-Kit: generische, modulare Teile, aus denen der Generator die Karte komponiert.
 * Start als parametrische Platzhalter-Meshes (Form/Größe/Farbe) — echte Modelle später,
 * ohne Generator-Umbau. Registry-Muster analog biomeRegistry (lauter Fehler statt stiller Fallback).
 */
import type { AssetId, ZoneTheme, Vec3 } from './mapTypes';

export type AssetCategory = 'ground' | 'obstacle' | 'breakable' | 'hazard' | 'setpiece' | 'decor';

export interface AssetDef {
  id: AssetId;
  category: AssetCategory;
  footprint: number; // Radius für Abstands-/Kollisionsprüfung bei der Platzierung
  themes: ZoneTheme[]; // Kohärenz: in welchen Zonen passend
  mesh: { form: 'box' | 'cylinder' | 'cone' | 'sphere'; size: Vec3; color: [number, number, number] };
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

export function assetsByThemeCategory(theme: ZoneTheme, cat: AssetCategory): AssetDef[] {
  return allAssets().filter((a) => a.category === cat && a.themes.includes(theme));
}

// — Generisches Start-Kit (≥3 je Kategorie) —
const ALLE: ZoneTheme[] = ['offenerHof', 'wrackCluster', 'pressWerk', 'funkturmZone'];

function def(
  id: string,
  category: AssetCategory,
  footprint: number,
  themes: ZoneTheme[],
  form: AssetDef['mesh']['form'],
  size: Vec3,
  color: [number, number, number],
  defaultParams?: Record<string, number | string | boolean>,
): AssetDef {
  return { id, category, footprint, themes, mesh: { form, size, color }, defaultParams };
}

[
  // ground
  def('boden_oel', 'ground', 6, ALLE, 'box', { x: 12, y: 0.05, z: 12 }, [0.16, 0.15, 0.14]),
  def('boden_kies', 'ground', 6, ALLE, 'box', { x: 12, y: 0.05, z: 12 }, [0.3, 0.29, 0.26]),
  def('boden_platte', 'ground', 6, ALLE, 'box', { x: 12, y: 0.06, z: 12 }, [0.27, 0.28, 0.31]),
  // obstacle (nicht zerstörbar)
  def('wrack_auto', 'obstacle', 3, ['offenerHof', 'wrackCluster'], 'box', { x: 5, y: 2.2, z: 2.6 }, [0.4, 0.3, 0.24]),
  def('container', 'obstacle', 4, ['offenerHof', 'pressWerk', 'funkturmZone'], 'box', { x: 6, y: 3, z: 2.8 }, [0.32, 0.42, 0.45]),
  def('rohrstapel', 'obstacle', 3, ['pressWerk', 'wrackCluster'], 'cylinder', { x: 3, y: 2, z: 3 }, [0.36, 0.36, 0.38]),
  def('betonblock', 'obstacle', 2.5, ['funkturmZone', 'offenerHof'], 'box', { x: 3.5, y: 2.4, z: 3.5 }, [0.5, 0.5, 0.48]),
  // breakable (zerstörbar)
  def('fass', 'breakable', 1, ALLE, 'cylinder', { x: 1.2, y: 1.6, z: 1.2 }, [0.82, 0.54, 0.22], { hpKey: 'fass' }),
  def('kiste', 'breakable', 1.2, ALLE, 'box', { x: 1.6, y: 1.6, z: 1.6 }, [0.54, 0.48, 0.35], { hpKey: 'kiste' }),
  def('schrotthaufen', 'breakable', 1.6, ['wrackCluster', 'pressWerk'], 'sphere', { x: 2.4, y: 1.6, z: 2.4 }, [0.38, 0.36, 0.34], { hpKey: 'schrotthaufen' }),
  def('neonschild', 'breakable', 1, ['offenerHof', 'funkturmZone'], 'box', { x: 2.4, y: 2.6, z: 0.3 }, [0.2, 0.7, 0.8], { hpKey: 'neonschild' }),
  // hazard (Schaden bei Kontakt)
  def('presse', 'hazard', 3, ['pressWerk'], 'box', { x: 5, y: 0.4, z: 5 }, [0.7, 0.22, 0.18], { dmgKey: 'presse', getaktet: true }),
  def('stachelgrube', 'hazard', 2.5, ['wrackCluster', 'pressWerk'], 'box', { x: 4, y: 0.3, z: 4 }, [0.55, 0.2, 0.18], { dmgKey: 'stachelgrube' }),
  def('giftpfuetze', 'hazard', 2.5, ['wrackCluster', 'offenerHof'], 'cylinder', { x: 4, y: 0.2, z: 4 }, [0.36, 0.62, 0.24], { dmgKey: 'giftpfuetze' }),
  // setpiece (Wahrzeichen / Rampe / Insel)
  def('funkturm', 'setpiece', 4, ['funkturmZone'], 'cone', { x: 5, y: 16, z: 5 }, [0.62, 0.68, 0.74]),
  def('sprungrampe', 'setpiece', 3, ALLE, 'box', { x: 6, y: 2, z: 9 }, [0.86, 0.7, 0.2]),
  def('bonusinsel', 'setpiece', 8, ALLE, 'box', { x: 22, y: 1, z: 16 }, [0.24, 0.26, 0.3]),
  // decor (nicht-interaktiv)
  def('reifenstapel', 'decor', 1, ALLE, 'cylinder', { x: 1.4, y: 1, z: 1.4 }, [0.12, 0.12, 0.12]),
  def('verkehrskegel', 'decor', 0.5, ALLE, 'cone', { x: 0.7, y: 1, z: 0.7 }, [0.85, 0.4, 0.12]),
  def('truemmer', 'decor', 0.8, ALLE, 'box', { x: 1.2, y: 0.5, z: 1 }, [0.34, 0.32, 0.3]),
  def('pfuetze', 'decor', 1, ['wrackCluster', 'pressWerk'], 'box', { x: 2, y: 0.05, z: 2 }, [0.2, 0.22, 0.24]),
].forEach(registerAsset);
