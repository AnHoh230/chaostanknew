/**
 * Mapsmith — Autoren-Werkzeug-Zustand (rein). Der Entwickler würfelt im Spiel Seeds durch,
 * fährt die Karte zur Beurteilung und speichert gute Seeds. Engine-Anbindung (Reroll/Reload/HUD)
 * macht main.ts; hier nur Seed-Verwaltung + die kuratierte Zeile zum Einfügen.
 */
export interface MapsmithState {
  aktiv: boolean;
  rezeptId: string;
  seed: number;
}

export function createMapsmith(rezeptId: string, seed: number): MapsmithState {
  return { aktiv: false, rezeptId, seed };
}

/** Deterministischer Seed-Schritt (LCG) — kein Math.random in der Engine-Loop nötig. */
export function naechsterSeed(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
}

/** Fertige curatedMaps.ts-Zeile zum Einfügen (Browser kann die Datei nicht schreiben). */
export function kuratierteZeile(s: MapsmithState): string {
  return `{ id: '${s.rezeptId}_${s.seed}', rezeptId: '${s.rezeptId}', seed: ${s.seed} },`;
}
