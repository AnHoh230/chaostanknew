/**
 * Zentrale Tuning-Konstanten des Map-Systems. Keine dieser Zahlen liegt in Gameplay-Dateien.
 * Werte sind Startwerte; Feinschliff über den Mapsmith/Telemetrie.
 */
export const MAP_TUNING = {
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
  rampenSprungDauer: 1.1, // s Flugzeit des Sprung-Bogens
  rampenSprungHoehe: 14, // Scheitelhöhe des Sprungs
} as const;
