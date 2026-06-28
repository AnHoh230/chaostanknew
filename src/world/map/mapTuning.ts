/**
 * Zentrale Tuning-Konstanten des Map-Systems. Keine dieser Zahlen liegt in Gameplay-Dateien.
 * Werte sind Startwerte; Feinschliff über den Mapsmith/Telemetrie.
 */
export const MAP_TUNING = {
  // — Platzierung / Scatter —
  blueNoiseRadius: { breakable: 6, obstacle: 9, decor: 4, collectible: 8 } as Record<string, number>,
  rotJitter: Math.PI, // ± um Y (rad)
  scaleJitter: [0.85, 1.2] as [number, number],
  pathClearance: 2, // zusätzlicher Freiraum links/rechts der Pfade
  maxPlatzierungsVersuche: 40,

  // — Zonen (Radius-Bereich [min,max] je Thema) —
  zoneRadius: {
    offenerHof: [80, 120],
    wrackCluster: [70, 100],
    pressWerk: [70, 110],
    funkturmZone: [80, 110],
  } as Record<string, [number, number]>,

  // — Gameplay-Werte (Invariante: nichts davon gibt Impulse) —
  breakableHp: { fass: 1, kiste: 1, schrotthaufen: 2, neonschild: 1 } as Record<string, number>,
  hazardDmg: { presse: 24, stachelgrube: 14, giftpfuetze: 8 } as Record<string, number>,
  hazardZyklus: { presse: 2.2 } as Record<string, number>, // s pro Aktiv-Takt
  nestGegner: [3, 5] as [number, number],
  nestEntdeckRadius: 22,
  nestLebenProDrop: 12, // HP je gedroptem Leben-Pickup
  nestLebenAnzahl: [2, 3] as [number, number],
  collectibleHeal: 18, // Schrott-Huhn
  rampenSchubSchwelle: 12, // Mindest-Geschwindigkeit für die Sprungrampe
} as const;
