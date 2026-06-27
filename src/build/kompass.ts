/**
 * Gate 1 — Kompass-Konsole: Level/Fuel-Maschine (Spec 1 + Spec 5 §2/§5).
 * Reiner State, kein Engine-Bezug. KERN (Spec 5 §2): Level und Fuel sind GETRENNT —
 * `level`/`reachedMax` sind dauerhaft (sticky), `fuel` ist verbrauchbar. KEIN System senkt `level`.
 * Der Kompass bekommt bereits EFFEKTIVE Impulse (Politik: evolutionTuning.effektiverImpuls).
 */
import type { Pol } from './buildModell';
import { ALLE_POLE } from './buildModell';
import { POL_MAX_LEVEL, POL_FUEL_CAP, FUEL_IMPULSE_COST, levelKosten } from './evolutionTuning';

export interface PolState {
  level: number; // 0..POL_MAX_LEVEL, dauerhaft
  reachedMax: boolean; // wird einmal true und bleibt true (Spec 5 §2)
  progress: number; // Fortschritt zum nächsten Level
  fuel: number; // verbrauchbarer Treibstoff (Finisher)
  fuelProgress: number; // Fortschritt zur nächsten Fuel-Einheit
  fuelCap: number;
}

export interface KompassState {
  freigeschaltet: boolean; // Skillbaum voll → Konsole an
  aktiverPol: Pol; // 1/2/3
  pole: Record<Pol, PolState>;
  overflowWaste: number; // Telemetrie: verfallene Impulse bei vollem Fuel (Spec 5 §5.3)
}

function createPolState(): PolState {
  return { level: 0, reachedMax: false, progress: 0, fuel: 0, fuelProgress: 0, fuelCap: POL_FUEL_CAP };
}

export function createKompassState(): KompassState {
  return {
    freigeschaltet: false,
    aktiverPol: 'befehl',
    pole: { befehl: createPolState(), raum: createPolState(), zustand: createPolState() },
    overflowWaste: 0,
  };
}

/** Schaltet die Konsole frei (Skillbaum voll). Davor nimmt sie keine Impulse an. */
export function kompassFreischalten(s: KompassState): void {
  s.freigeschaltet = true;
}

/** Aktiven Pol wählen (1/2/3). Teilfortschritt aller Pole bleibt erhalten (je-Pol-State). */
export function waehlePol(s: KompassState, pol: Pol): void {
  s.aktiverPol = pol;
}

/**
 * (Effektive) Impulse in den aktiven Pol speisen. Vor Level-Max → progress/level;
 * ab Level-Max → fuel (gedeckelt bei fuelCap, Überlauf in overflowWaste). Level sinkt nie.
 */
export function speiseImpuls(s: KompassState, menge: number): void {
  if (!s.freigeschaltet || menge <= 0) return;
  const p = s.pole[s.aktiverPol];
  let rest = menge;

  // Phase 1: Leveln bis Max (steigende Kosten je Level)
  while (p.level < POL_MAX_LEVEL && rest > 0) {
    const need = levelKosten(p.level) - p.progress;
    if (rest >= need) {
      rest -= need;
      p.progress = 0;
      p.level += 1;
      if (p.level >= POL_MAX_LEVEL) p.reachedMax = true;
    } else {
      p.progress += rest;
      rest = 0;
    }
  }

  // Phase 2: Fuel — erst NACH Level-Max
  if (p.level >= POL_MAX_LEVEL && rest > 0) {
    p.fuelProgress += rest;
    while (p.fuelProgress >= FUEL_IMPULSE_COST && p.fuel < p.fuelCap) {
      p.fuelProgress -= FUEL_IMPULSE_COST;
      p.fuel += 1;
    }
    if (p.fuel >= p.fuelCap) {
      s.overflowWaste += p.fuelProgress; // Speicher voll → Rest in Telemetrie statt still verfallen
      p.fuelProgress = 0;
    }
  }
}

/** Pol gemaxt? Liest `reachedMax` (sticky), NICHT `fuel` — Meilensteine bleiben (Spec 5 §2). */
export function istPolGemaxt(s: KompassState, pol: Pol): boolean {
  return s.pole[pol].reachedMax;
}

/** Alle gemaxten Pole (Finisher-Schmieden / Evolution, Spec 2/3). */
export function gemaxtePole(s: KompassState): Pol[] {
  return ALLE_POLE.filter((pol) => s.pole[pol].reachedMax);
}

/** Finisher-Feuern verbrennt Fuel eines Pols. Senkt NIE das Level. false bei zu wenig Fuel. */
export function verbrauche(s: KompassState, pol: Pol, menge: number): boolean {
  const p = s.pole[pol];
  if (p.fuel < menge) return false;
  p.fuel -= menge;
  return true;
}
