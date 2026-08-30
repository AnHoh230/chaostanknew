/**
 * Schrott-Spielplatz — Map-System: zentrale Typen (Engine-frei, Vitest-testbar).
 * Spec: docs/superpowers/specs/2026-06-28-schrott-spielplatz-map-builder-design.md (Sektion 2).
 */

export interface Vec2 { x: number; z: number } // Babylon X/Z-Ebene, y=0
export interface Vec3 { x: number; y: number; z: number }

export type EntityKind =
  | 'breakable'    // Fass/Kiste/Schrott — zerstörbar
  | 'obstacle'     // Cover/Block, nicht zerstörbar
  | 'hazard'       // Falle — Schaden bei Kontakt, ausweichen
  | 'dormantNest'  // schlafender Gegner-Cluster
  | 'collectible'  // Fund — Heilung/Toy/Deko (nie Impulse)
  | 'landmark'     // Wahrzeichen, Orientierung
  | 'secretRamp'   // Sprungschanze → Bonus-Insel
  | 'bonusIsland'  // die Bonus-Insel selbst
  | 'decor';       // nicht-interaktive Deko

export type AssetId = string;

export interface MapEntity {
  id: string;
  kind: EntityKind;
  asset: AssetId;
  pos: Vec2;
  rotY: number;   // Rotation um Y in rad (Jitter)
  scale: number;  // Uniform-Skalierungs-Jitter
  params?: Record<string, number | string | boolean>; // kind-spezifisch (hp, hazardDmg, nestSize, lootTableId, ...)
}

