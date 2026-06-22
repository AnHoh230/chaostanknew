/**
 * Flow-State-Maschine (Schicht 0): das gemeinsame Primitiv, auf das später Evolution UND
 * Director gaten. Reiner Zustand aus Lebenszustand + Tod-Clustering — keine Engine-Abhängigkeit.
 *
 * FLOW    = normales, absichtliches Spiel → Evolution/Director dürfen werten.
 * RESPAWN = kurz nach Wiederaufbau → Schonfrist, noch nicht werten.
 * BROKEN  = Todesspirale/Kontrollverlust → Evolution pausiert, Director eskaliert nicht,
 *           kein Heat-Anstieg, Spawns ausgesetzt, Notstart-Hilfe erlaubt.
 */
export type FlowState = 'flow' | 'respawn' | 'broken';

export interface FlowInput {
  alive: boolean;
  now: number; // Laufzeit-Uhr (s)
  lastRespawnAt: number; // Zeitpunkt des letzten Respawns (s)
  deathTimes: readonly number[]; // Zeitstempel jüngster Tode (s), aufsteigend
}

export interface FlowConfig {
  respawnGrace: number; // s nach Respawn = RESPAWN-Schonfrist
  twoDeathsWindow: number; // 2 Tode in diesem Fenster → BROKEN
  threeDeathsWindow: number; // 3 Tode in diesem Fenster → BROKEN
}

// Hinweis: Respawn ist sofort (Tod → Respawn im selben Frame), darum subsumiert „2 Tode in 20 s"
// die Regel „Tod < 8 s nach Respawn" — ein Schnell-Wieder-Tod liegt zwangsläufig < 20 s am vorigen.
export const DEFAULT_FLOW_CONFIG: FlowConfig = {
  respawnGrace: 3,
  twoDeathsWindow: 20,
  threeDeathsWindow: 45,
};

/** Wie viele der Tode liegen höchstens `window` Sekunden zurück. */
function deathsWithin(deathTimes: readonly number[], now: number, window: number): number {
  let n = 0;
  for (const t of deathTimes) if (now - t <= window) n += 1;
  return n;
}

/** Erkennt die Todesspirale rein aus dem Tod-Clustering. */
export function isDeathloop(
  deathTimes: readonly number[],
  now: number,
  cfg: FlowConfig = DEFAULT_FLOW_CONFIG,
): boolean {
  return (
    deathsWithin(deathTimes, now, cfg.twoDeathsWindow) >= 2 ||
    deathsWithin(deathTimes, now, cfg.threeDeathsWindow) >= 3
  );
}

/** Aktueller Flow-Zustand. BROKEN schlägt RESPAWN schlägt FLOW. */
export function computeFlowState(i: FlowInput, cfg: FlowConfig = DEFAULT_FLOW_CONFIG): FlowState {
  if (isDeathloop(i.deathTimes, i.now, cfg)) return 'broken';
  if (!i.alive) return 'broken'; // im Sterbe-Frame (vor Sofort-Respawn) nicht werten
  if (i.now - i.lastRespawnAt < cfg.respawnGrace) return 'respawn';
  return 'flow';
}

/** Alte Tode (älter als das größte Fenster) wegwerfen, damit die Liste nicht wächst. */
export function pruneDeathTimes(
  deathTimes: readonly number[],
  now: number,
  cfg: FlowConfig = DEFAULT_FLOW_CONFIG,
): number[] {
  const horizon = Math.max(cfg.twoDeathsWindow, cfg.threeDeathsWindow);
  return deathTimes.filter((t) => now - t <= horizon);
}
