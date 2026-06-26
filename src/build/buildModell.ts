import type { BaseMode, EvolutionChannelId } from '../evolution/channels';

/**
 * Build-Modell — „eine Klasse (Kommander) + Build = Slot-Folge".
 *
 * Es gibt EINE Klasse (den Apparat: Scope + 3 Munition + Slomo). Was der Apparat TUT,
 * formt der Build: eine Folge aus drei Slots, jeder ein Pol B/Z/R. Reine Diagonale =
 * Archetyp (BBB/ZZZ/RRR). Reihenfolge ist Identität (B-Z-R ≠ Z-B-R), 27 Folgen möglich.
 *
 * Dieser Modul-Kern ist die EINZIGE Stelle, die Build-Sprache (Pol) auf die bestehende
 * Evolution-Engine (BaseMode/Kanal) abbildet — er ersetzt die alte combatStyle/GIFT_BUILD-
 * Gleichsetzung, die Klasse und Build in einen Topf warf.
 */
export type Pol = 'befehl' | 'zustand' | 'raum';

/** Drei Slots, je ein Pol. Vorerst nur die reinen Diagonalen bespielt (Menü-Shortcut). */
export type BuildFolge = readonly [Pol, Pol, Pol];

export const ALLE_POLE: readonly Pol[] = ['befehl', 'zustand', 'raum'];

/** Reiner Archetyp: derselbe Pol in allen drei Slots (BBB/ZZZ/RRR). */
export function archetyp(pol: Pol): BuildFolge {
  return [pol, pol, pol];
}

/** Slot 1 — der Primärpol bestimmt das Grundverhalten des Apparats (Dot/Markierung/Feld). */
export function primaerPol(folge: BuildFolge): Pol {
  return folge[0];
}

/** Welcher Pol sitzt in Slot i (0..2). Außerhalb defensiv auf Slot 1. */
export function slotPol(folge: BuildFolge, i: number): Pol {
  return folge[i] ?? folge[0];
}

/**
 * Es gibt nur EINE Klasse: der Kommander, intern `BaseMode 'sniper'`. JEDER Build läuft auf
 * ihr — `baseMode` ist deshalb diese Konstante, NICHT aus dem Build abgeleitet (das wäre wieder
 * die alte Klasse=Build-Vermischung). Sniper == Kommander == die Klasse.
 */
export const KOMMANDER_MODE: BaseMode = 'sniper';

/**
 * Welcher Kanal des KOMMANDERS trägt den Fortschritt dieses Builds (das ACTIVE_CORE).
 * FALLE: Zustand→`dot_core` / Raum→`aoe_core` wäre der Kern *anderer Klassen* (DoT/AoE) — falsch.
 * Unter „immer Kommander" sind Zustand/Raum die dot-/aoe-ROUTEN DES KOMMANDERS:
 *   Befehl = Eigen-Pol → sniper_core · Zustand = dot-Route → sniper_dot_aoe · Raum = aoe-Route → sniper_aoe_dot.
 */
export function polKernKanal(pol: Pol): EvolutionChannelId {
  switch (pol) {
    case 'befehl': return 'sniper_core';
    case 'zustand': return 'sniper_dot_aoe';
    case 'raum': return 'sniper_aoe_dot';
  }
}
