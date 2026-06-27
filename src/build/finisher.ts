/**
 * Gate 4 — Finisher (Spec 2 + Spec 5 §7/§8/§9). Reine Logik, kein Engine-Bezug.
 * Die Def-Matrix (alle 7) ist Daten; die Logik (boardScore / powerMultiplier / schmiede / feuere /
 * Auto-Feuer-Dispatcher) ist GENERISCH. Bewiesene Scheibe in den Tests: `bombardement` (B+R) end-to-end.
 * Finisher entladen den HERGERICHTETEN Board-State (mark/feld/gift), keine fixe Schadenszahl.
 */
import type { Pol } from './buildModell';
import type { KompassState } from './kompass';
import { verbrauche } from './kompass';
import type { BlueprintId } from './blueprints';
import {
  BOARD_WEIGHT_MARK, BOARD_WEIGHT_FIELD, BOARD_WEIGHT_POISON_STACK, BOARD_POISON_STACK_CAP,
  BOARD_WEIGHT_TWO_MATCHING_STATES, BOARD_WEIGHT_THREE_MATCHING_STATES,
  MIN_EFFECTIVE_BOARDSCORE_TIER_1, MIN_EFFECTIVE_BOARDSCORE_TIER_2, MIN_EFFECTIVE_BOARDSCORE_TIER_3,
  TIER_POWER, FINISHER_EFFECTIVE_USES_TO_HARDEN,
} from './evolutionTuning';

export type FinisherId =
  | 'generalbefehl' | 'einsturz' | 'seuchenausbruch' // Tier 1 (auto bei Pol-Max)
  | 'bombardement' | 'sporenfeld' | 'urteil' // Tier 2 (Bauplan)
  | 'systembruch'; // Tier 3 (Bauplan/Combo)

export type BoardZustand = 'mark' | 'feld' | 'gift';

export interface GegnerBoard {
  mark?: boolean;
  feld?: boolean;
  giftStacks?: number;
}

export interface FinisherDef {
  id: FinisherId;
  tier: 1 | 2 | 3;
  bedarf: Pol[]; // diese Pole müssen gemaxt sein
  liest: BoardZustand[]; // welchen hergerichteten Zustand er entlädt
  treibstoff: Partial<Record<Pol, number>>; // Fuel-Kosten je Zündung (Spec 5 §5)
  name: string;
  icon: string;
}

export const FINISHER_DEFS: readonly FinisherDef[] = [
  { id: 'generalbefehl', tier: 1, bedarf: ['befehl'], liest: ['mark'], treibstoff: { befehl: 1 }, name: 'Generalbefehl', icon: '⚔' },
  { id: 'einsturz', tier: 1, bedarf: ['raum'], liest: ['feld'], treibstoff: { raum: 1 }, name: 'Einsturz', icon: '▦' },
  { id: 'seuchenausbruch', tier: 1, bedarf: ['zustand'], liest: ['gift'], treibstoff: { zustand: 1 }, name: 'Seuchenausbruch', icon: '☣' },
  { id: 'bombardement', tier: 2, bedarf: ['befehl', 'raum'], liest: ['mark', 'feld'], treibstoff: { befehl: 1, raum: 1 }, name: 'Bombardement', icon: '✸' },
  { id: 'sporenfeld', tier: 2, bedarf: ['raum', 'zustand'], liest: ['feld', 'gift'], treibstoff: { raum: 1, zustand: 1 }, name: 'Sporenfeld', icon: '✿' },
  { id: 'urteil', tier: 2, bedarf: ['befehl', 'zustand'], liest: ['mark', 'gift'], treibstoff: { befehl: 1, zustand: 1 }, name: 'Urteil', icon: '⚖' },
  { id: 'systembruch', tier: 3, bedarf: ['befehl', 'raum', 'zustand'], liest: ['mark', 'feld', 'gift'], treibstoff: { befehl: 2, raum: 2, zustand: 2 }, name: 'Systembruch', icon: '✷' },
];

export function finisherDef(id: FinisherId): FinisherDef {
  return FINISHER_DEFS.find((d) => d.id === id)!;
}

export function minEffectiveBoardScore(tier: 1 | 2 | 3): number {
  return tier === 1 ? MIN_EFFECTIVE_BOARDSCORE_TIER_1
    : tier === 2 ? MIN_EFFECTIVE_BOARDSCORE_TIER_2
      : MIN_EFFECTIVE_BOARDSCORE_TIER_3;
}

/** BoardScore: nur die vom Finisher GELESENEN Zustände zählen; Synergiebonus bei mehreren je Gegner. */
export function boardScore(def: FinisherDef, gegner: readonly GegnerBoard[]): number {
  let total = 0;
  for (const g of gegner) {
    let einzel = 0;
    let treffer = 0;
    if (def.liest.includes('mark') && g.mark) { einzel += BOARD_WEIGHT_MARK; treffer += 1; }
    if (def.liest.includes('feld') && g.feld) { einzel += BOARD_WEIGHT_FIELD; treffer += 1; }
    if (def.liest.includes('gift') && (g.giftStacks ?? 0) > 0) {
      einzel += Math.min(g.giftStacks ?? 0, BOARD_POISON_STACK_CAP) * BOARD_WEIGHT_POISON_STACK;
      treffer += 1;
    }
    if (treffer === 0) continue;
    const syn = treffer >= 3 ? BOARD_WEIGHT_THREE_MATCHING_STATES : treffer === 2 ? BOARD_WEIGHT_TWO_MATCHING_STATES : 0;
    total += einzel + syn;
  }
  return total;
}

/** Wucht-Multiplikator: tierBase × sqrt(readiness), gedeckelt [base, max] (Spec 5 §7). */
export function powerMultiplier(tier: 1 | 2 | 3, score: number): number {
  const { base, max } = TIER_POWER[tier];
  const readiness = score / minEffectiveBoardScore(tier);
  return Math.max(base, Math.min(max, base * Math.sqrt(readiness)));
}

export interface FinisherState {
  aktiv: FinisherId[]; // geschmiedet (Reihenfolge = Schmiede-Reihenfolge, für Tiebreak)
  zuendungen: Record<FinisherId, number>; // WIRKSAME Zündungen (Verhärtung)
}

export function createFinisherState(): FinisherState {
  const z = {} as Record<FinisherId, number>;
  for (const d of FINISHER_DEFS) z[d.id] = 0;
  return { aktiv: [], zuendungen: z };
}

export function istVerhaertet(s: FinisherState, id: FinisherId): boolean {
  return s.zuendungen[id] >= FINISHER_EFFECTIVE_USES_TO_HARDEN;
}

/**
 * Schmiedet alle noch nicht aktiven Finisher, deren Bedarf gemaxt ist:
 * Tier 1 automatisch (kein Bauplan), Tier 2/3 nur mit besessenem Bauplan. Gibt die NEU geschmiedeten zurück.
 */
export function schmiede(s: FinisherState, gemaxte: readonly Pol[], besessene: readonly BlueprintId[]): FinisherId[] {
  const neu: FinisherId[] = [];
  for (const def of FINISHER_DEFS) {
    if (s.aktiv.includes(def.id)) continue;
    const bedarfErfuellt = def.bedarf.every((p) => gemaxte.includes(p));
    if (!bedarfErfuellt) continue;
    const bekannt = def.tier === 1 || besessene.includes(def.id as BlueprintId);
    if (!bekannt) continue;
    s.aktiv.push(def.id);
    neu.push(def.id);
  }
  return neu;
}

function kannTreibstoff(kompass: KompassState, treibstoff: Partial<Record<Pol, number>>): boolean {
  return (Object.entries(treibstoff) as [Pol, number][]).every(([pol, amt]) => kompass.pole[pol].fuel >= amt);
}

function ziehTreibstoff(kompass: KompassState, treibstoff: Partial<Record<Pol, number>>): void {
  for (const [pol, amt] of Object.entries(treibstoff) as [Pol, number][]) verbrauche(kompass, pol, amt);
}

export interface FeuerErgebnis {
  wirksam: boolean;
  grund?: 'inaktiv' | 'leer' | 'fuel';
  power: number;
}

/**
 * Feuert einen Finisher. Wirksam nur bei aktiv + BoardScore ≥ Tier-Minimum + genug Fuel.
 * Leere Zündung (zu wenig Board) kostet KEIN Fuel und zählt nicht (Spec 5 §8). Fuel wird atomar gezogen.
 */
export function feuere(s: FinisherState, kompass: KompassState, id: FinisherId, gegner: readonly GegnerBoard[]): FeuerErgebnis {
  if (!s.aktiv.includes(id)) return { wirksam: false, grund: 'inaktiv', power: 0 };
  const def = finisherDef(id);
  const score = boardScore(def, gegner);
  if (score < minEffectiveBoardScore(def.tier)) return { wirksam: false, grund: 'leer', power: 0 };
  if (!kannTreibstoff(kompass, def.treibstoff)) return { wirksam: false, grund: 'fuel', power: 0 };
  ziehTreibstoff(kompass, def.treibstoff);
  s.zuendungen[id] += 1;
  return { wirksam: true, power: powerMultiplier(def.tier, score) };
}

/**
 * Auto-Feuer-Dispatcher (Spec 5 §9): pro Tick höchstens EIN verhärteter Finisher. Auswahl nach
 * Readiness, deterministischer Tiebreak (Tier → BoardScore → Schmiede-Reihenfolge → Id). Gibt den
 * gefeuerten Finisher zurück oder null.
 */
/**
 * Wählt den besten feuerbaren Finisher (Readiness → Tier → BoardScore → Schmiede-Reihenfolge → Id),
 * OHNE zu feuern. `nurVerhaertet` true = Auto-Feuer (nur verhärtete), false = manuelle Wahl (alle aktiven).
 * So kann der Aufrufer (Engine) den Effekt selbst anwenden. null, wenn keiner feuerbar ist.
 */
export function naechsterAutoFinisher(
  s: FinisherState, kompass: KompassState, gegner: readonly GegnerBoard[], nurVerhaertet = true,
): FinisherId | null {
  const readiness = (id: FinisherId): number => {
    const def = finisherDef(id);
    return boardScore(def, gegner) / minEffectiveBoardScore(def.tier);
  };
  const kandidaten = s.aktiv.filter((id) => {
    const def = finisherDef(id);
    if (nurVerhaertet && !istVerhaertet(s, id)) return false;
    return boardScore(def, gegner) >= minEffectiveBoardScore(def.tier) && kannTreibstoff(kompass, def.treibstoff);
  });
  if (kandidaten.length === 0) return null;

  kandidaten.sort((a, b) => {
    const ra = readiness(a), rb = readiness(b);
    if (rb !== ra) return rb - ra;
    const da = finisherDef(a), db = finisherDef(b);
    if (db.tier !== da.tier) return db.tier - da.tier;
    const sa = boardScore(da, gegner), sb = boardScore(db, gegner);
    if (sb !== sa) return sb - sa;
    const ia = s.aktiv.indexOf(a), ib = s.aktiv.indexOf(b);
    if (ia !== ib) return ia - ib;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return kandidaten[0]!;
}

/** Auto-Feuer-Dispatcher (Spec 5 §9): höchstens EIN verhärteter Finisher pro Tick. Feuert direkt. */
export function dispatchAutoFeuer(s: FinisherState, kompass: KompassState, gegner: readonly GegnerBoard[]): FinisherId | null {
  const ziel = naechsterAutoFinisher(s, kompass, gegner, true);
  if (!ziel) return null;
  feuere(s, kompass, ziel, gegner);
  return ziel;
}
