/**
 * Spieler-Level-Boni — die ZWEITE Wachstums-Achse neben dem Build-Aufbau. Bei jedem Level-Up wählt der
 * Spieler eine von drei zufälligen Karten; der Bonus akkumuliert dauerhaft. Antwort auf die steile
 * Gegner-HP-Eskalation: der Spieler braucht eine eigene Survivability/Crit-Achse, sonst zieht ihm die
 * Gegner-Seite davon. Reine Definitionen + Funktionen, kein Engine-Bezug (TDD); main.ts setzt die
 * Werte in playerStats()/Schaden um. Alle Zahlen sind Drehregler.
 */
export type BoniId = 'hp' | 'tempo' | 'critChance' | 'critDmg' | 'dodge';

// — Effekt je Wahl (Startwerte, frei tunebar) —
export const BONI_HP_PRO_WAHL = 20; // +Max-HP (additiv)
export const BONI_SPEED_PRO_WAHL = 0.08; // +Tempo-Anteil (0.08 = +8 %)
export const BONI_CRIT_CHANCE_PRO_WAHL = 0.05; // +Crit-Wahrscheinlichkeit (0.05 = +5 %)
export const BONI_CRIT_DMG_PRO_WAHL = 0.25; // +Crit-Multiplikator (×0.25 obendrauf)
export const BONI_DODGE_PRO_WAHL = 0.04; // +Ausweich-Wahrscheinlichkeit (0.04 = +4 %)
export const CRIT_BASIS_MULT = 1.5; // Basis-Crit = ×1.5 Schaden (Crit-Schaden-Karte hebt es)

/** Akkumulierte Spieler-Boni. maxHp/speed/dodge sind additive Beträge, crit* steuern den Crit-Wurf. */
export interface PlayerBoniState {
  maxHp: number; // additive Max-HP
  speed: number; // additiver Tempo-Anteil (×(1+speed))
  critChance: number; // 0..1 — Wahrscheinlichkeit eines Crits
  critMult: number; // Schaden-Multiplikator bei Crit (Start CRIT_BASIS_MULT)
  dodge: number; // additive Ausweich-Wahrscheinlichkeit
}

export function createPlayerBoni(): PlayerBoniState {
  return { maxHp: 0, speed: 0, critChance: 0, critMult: CRIT_BASIS_MULT, dodge: 0 };
}

export interface BoniDef {
  id: BoniId;
  name: string;
  icon: string;
  text: string;
  apply: (s: PlayerBoniState) => void;
}

const pct = (x: number): string => `${Math.round(x * 100)}`;

export const BONI_POOL: readonly BoniDef[] = [
  { id: 'hp', name: 'Panzerung', icon: '❤', text: `+${BONI_HP_PRO_WAHL} Max-HP`,
    apply: (s) => { s.maxHp += BONI_HP_PRO_WAHL; } },
  { id: 'tempo', name: 'Antrieb', icon: '💨', text: `+${pct(BONI_SPEED_PRO_WAHL)} % Tempo`,
    apply: (s) => { s.speed += BONI_SPEED_PRO_WAHL; } },
  { id: 'critChance', name: 'Zieloptik', icon: '🎯', text: `+${pct(BONI_CRIT_CHANCE_PRO_WAHL)} % Crit-Chance`,
    apply: (s) => { s.critChance += BONI_CRIT_CHANCE_PRO_WAHL; } },
  { id: 'critDmg', name: 'Sprengkraft', icon: '💥', text: `+${pct(BONI_CRIT_DMG_PRO_WAHL)} % Crit-Schaden`,
    apply: (s) => { s.critMult += BONI_CRIT_DMG_PRO_WAHL; } },
  { id: 'dodge', name: 'Ausweichen', icon: '🌀', text: `+${pct(BONI_DODGE_PRO_WAHL)} % Ausweichen`,
    apply: (s) => { s.dodge += BONI_DODGE_PRO_WAHL; } },
];

/** Die Definition zur Boni-Id. */
export function boniDef(id: BoniId): BoniDef | undefined {
  return BONI_POOL.find((d) => d.id === id);
}

/** Eine Karte anwenden (akkumuliert dauerhaft auf den State). */
export function waehleBoni(state: PlayerBoniState, id: BoniId): void {
  boniDef(id)?.apply(state);
}

/** n zufällige, NICHT doppelte Boni-Ids fürs Auswahl-Panel (Fisher-Yates, rng injizierbar für Tests). */
export function randomBoniAuswahl(n = 3, rng: () => number = Math.random): BoniId[] {
  const pool = BONI_POOL.map((d) => d.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, Math.min(n, pool.length));
}

/** Crit-Wurf: bei rng() < critChance ein Crit (×critMult), sonst normal (×1). rng injizierbar (Tests). */
export function rollCrit(state: PlayerBoniState, rng: () => number = Math.random): { dmgMul: number; crit: boolean } {
  if (state.critChance > 0 && rng() < state.critChance) return { dmgMul: state.critMult, crit: true };
  return { dmgMul: 1, crit: false };
}
