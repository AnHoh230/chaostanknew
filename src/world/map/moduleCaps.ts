/**
 * Globale Slot-Deckelung (Generator-Hirn, Begleiter zu Schritt 2): `n`/`*`/Hazard sind SLOTS,
 * keine garantierten Spawns. Dieses Gate lässt sie nur zu, solange globale Limits Platz haben —
 * verhindert, dass viele Module die Map mit Nestern/Heilung/Gefahr fluten. Rein, getestet.
 *
 * Invariante: Nester droppen Leben (HP), Pickups heilen — NIE Impulse/Skillpunkte. Hier nur Anzahl.
 */
export interface SpawnCaps {
  maxNester: number;
  maxPickups: number;
  maxHazards: number;
}

export interface SlotGate {
  nest(): boolean;
  pickup(): boolean;
  hazard(): boolean;
  stand(): { nester: number; pickups: number; hazards: number };
}

export const STANDARD_CAPS: SpawnCaps = { maxNester: 8, maxPickups: 6, maxHazards: 18 };

export function createGate(caps: SpawnCaps = STANDARD_CAPS): SlotGate {
  let nester = 0, pickups = 0, hazards = 0;
  return {
    nest(): boolean { if (nester >= caps.maxNester) return false; nester++; return true; },
    pickup(): boolean { if (pickups >= caps.maxPickups) return false; pickups++; return true; },
    hazard(): boolean { if (hazards >= caps.maxHazards) return false; hazards++; return true; },
    stand: () => ({ nester, pickups, hazards }),
  };
}
