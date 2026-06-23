/**
 * Übersetzt die Heat-Lage (pro Richtung) in einen Schwarm-Plan: WIE VIELE Gegner gleichzeitig
 * leben sollen (Dichte) und mit WELCHEM Typ-Mix sie spawnen. Heißere Richtung → mehr ihrer Typen;
 * mehrere heiße Richtungen → gemischter Schwarm. Reine Funktion (TDD).
 */
export interface SwarmDirection {
  id: string;
  heat: number; // 0..100
  stufe: number; // 0..3
  typesByStufe: string[][]; // aus der Richtungs-Config: Stufe → aktive Typ-IDs
}

export interface SwarmTuning {
  base(): number; // Grunddichte auch bei kalter Lage (Welt ist nie leer)
  perHeat(): number; // zusätzliche Gegner je Heat-Punkt (Summe über alle Richtungen)
}

export interface SwarmPlan {
  targetCount: number; // Auffüll-Modus: so viele gleichzeitig. Batch-Modus: nur Safety-Obergrenze.
  weights: Record<string, number>; // Typ-ID → relatives Gewicht beim Nachspawnen
  interval?: number; // optional: s zwischen Spawn-Ticks (überschreibt den Spawner-Default)
  batch?: number; // gesetzt = BATCH-Modus: `batch` Gegner pro Tick, KEIN Auffüllen (Timer-Eskalation)
}

/** Heat 0 (alles kalt): nur Allrounder — der Grund-Gegner des Sniper-Setups. */
export const NEUTRAL_TYPES = ['allrounder'];

export function planSwarm(
  dirs: SwarmDirection[],
  tuning: SwarmTuning,
  neutral: string[] = NEUTRAL_TYPES,
): SwarmPlan {
  let heatSum = 0;
  const weights: Record<string, number> = {};
  for (const d of dirs) {
    heatSum += d.heat;
    if (d.heat <= 0) continue;
    const active = d.typesByStufe[d.stufe] ?? [];
    if (active.length === 0) continue;
    // Der Heat einer Richtung ist ihr Gesamtanteil — gleichmäßig auf ihre aktiven Typen verteilt.
    const share = d.heat / active.length;
    for (const t of active) weights[t] = (weights[t] ?? 0) + share;
  }
  // Kalte Lage → neutraler Grund-Mix, damit die Arena von Anfang an lebt.
  if (Object.keys(weights).length === 0) for (const t of neutral) weights[t] = 1;

  const targetCount = Math.max(0, Math.round(tuning.base() + heatSum * tuning.perHeat()));
  return { targetCount, weights };
}

/** Gewichtete Zufallsauswahl eines Typs; r ∈ [0,1). Liefert null bei leerem/0-Gewicht. */
export function pickWeighted(weights: Record<string, number>, r: number): string | null {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return null;
  let x = r * total;
  for (const [k, w] of entries) {
    x -= w;
    if (x < 0) return k;
  }
  return entries[entries.length - 1]![0];
}
