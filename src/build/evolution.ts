/**
 * Gate 5 — Spieler-Evolution (Spec 3 + Spec 5 §10). Reine Logik.
 * Ein gemeistertes Pol-PAAR (beide Pole gemaxt + Tier-2-Finisher aktiv & verhärtet) macht den Spieler
 * zu einem neuen GRUNDTYP. Der erste gemeisterte Typ ist STICKY (wechselt im MVP nicht mehr).
 * Systemform/Fusion (≥2 Paare) wird hier nur erkannt; das Staging baut Gate 7 (fusion.ts).
 */
import type { Pol } from './buildModell';
import { type KompassState, istPolGemaxt } from './kompass';
import { type FinisherState, type FinisherId, istVerhaertet } from './finisher';

export type PaarTyp = 'architekt' | 'alchemist' | 'richter';
export type GrundTyp = 'kommander' | PaarTyp | 'systemform';

interface PaarDef {
  typ: PaarTyp;
  pole: [Pol, Pol];
  finisher: FinisherId; // der Tier-2-Finisher dieses Paares
}

// Reihenfolge = fester Tiebreak (Spec 5 §10.3)
const PAARE: readonly PaarDef[] = [
  { typ: 'architekt', pole: ['befehl', 'raum'], finisher: 'bombardement' },
  { typ: 'alchemist', pole: ['raum', 'zustand'], finisher: 'sporenfeld' },
  { typ: 'richter', pole: ['befehl', 'zustand'], finisher: 'urteil' },
];

function paarDef(typ: PaarTyp): PaarDef {
  return PAARE.find((p) => p.typ === typ)!;
}

/** Grundtyp zu einem Pol-Paar (reihenfolge-unabhängig). */
export function paarTyp(a: Pol, b: Pol): PaarTyp {
  return PAARE.find((p) => p.pole.includes(a) && p.pole.includes(b))!.typ;
}

/** Die zwei Pole eines Grundtyps (für Fusion: dritter Pol = der übrige). */
export function paarPole(typ: PaarTyp): [Pol, Pol] {
  return [...paarDef(typ).pole];
}

export interface EvolutionState {
  typ: GrundTyp; // Start 'kommander'
  gemeistertePaare: PaarTyp[];
}

export function createEvolutionState(): EvolutionState {
  return { typ: 'kommander', gemeistertePaare: [] };
}

/** Paar gemeistert: beide Pole gemaxt UND der Tier-2-Finisher aktiv + verhärtet (Spec 5 §10). */
export function paarGemeistert(typ: PaarTyp, kompass: KompassState, fin: FinisherState): boolean {
  const d = paarDef(typ);
  return d.pole.every((p) => istPolGemaxt(kompass, p)) && fin.aktiv.includes(d.finisher) && istVerhaertet(fin, d.finisher);
}

/**
 * Wertet die Evolution aus: setzt den Grundtyp aus dem ersten gemeisterten Paar (sticky), verbucht alle
 * neu gemeisterten Paare. Gleichzeitigkeit deterministisch (Spec 5 §10.3): mehr wirksame Zündungen →
 * Hauptbuild → feste Reihenfolge. Gibt den aktiven Grundtyp zurück.
 */
export function evolviere(s: EvolutionState, kompass: KompassState, fin: FinisherState, hauptBuild?: Pol): GrundTyp {
  const neu = PAARE.map((p) => p.typ).filter((t) => paarGemeistert(t, kompass, fin) && !s.gemeistertePaare.includes(t));
  if (neu.length === 0) return s.typ;

  neu.sort((a, b) => {
    const za = fin.zuendungen[paarDef(a).finisher];
    const zb = fin.zuendungen[paarDef(b).finisher];
    if (zb !== za) return zb - za; // mehr wirksame Zündungen
    if (hauptBuild) {
      const ah = paarDef(a).pole.includes(hauptBuild) ? 0 : 1;
      const bh = paarDef(b).pole.includes(hauptBuild) ? 0 : 1;
      if (ah !== bh) return ah - bh; // Paar mit Hauptbuild
    }
    return PAARE.findIndex((p) => p.typ === a) - PAARE.findIndex((p) => p.typ === b); // feste Reihenfolge
  });

  if (s.typ === 'kommander') s.typ = neu[0]!; // sticky: nur setzen, solange noch Kommander
  for (const t of neu) s.gemeistertePaare.push(t);
  return s.typ;
}

/** Reif für Fusion/Systemform: ≥ 2 gemeisterte Paare (Detail-Staging in fusion.ts, Gate 7). */
export function istSystemformReif(s: EvolutionState): boolean {
  return s.gemeistertePaare.length >= 2;
}

export function aktiverGrundTyp(s: EvolutionState): GrundTyp {
  return s.typ;
}
