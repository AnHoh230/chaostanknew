export interface Biome {
  id: string;
  groundColor: [number, number, number]; // 0..1 rgb
}

const registry = new Map<string, Biome>();

export function registerBiome(b: Biome): void {
  registry.set(b.id, b);
}

export function getBiome(id: string): Biome {
  const b = registry.get(id);
  if (!b) {
    // Keine stillen Fallbacks (Leitplanke 3): unbekanntes Biom wirft laut.
    throw new Error('Unknown biome: ' + id);
  }
  return b;
}

// Default-Biom beim Modulladen registrieren (Single Source).
registerBiome({ id: 'steppe', groundColor: [0.36, 0.4, 0.24] });
// Schrott-Spielplatz-Biom (Map-Builder) — staubiges Schrott-Braun.
registerBiome({ id: 'schrottfeld', groundColor: [0.28, 0.26, 0.24] });
