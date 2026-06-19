import type { TraitProfile } from '../ai/aiTypes';

/** „Knapper Sieg" (Spec 17): Gegner stirbt, während Spieler-HP ≤ 15 %. */
export const KNAPP_SCHWELLE = 0.15;

export function istKnapperSieg(playerHpFrac: number): boolean {
  return playerHpFrac <= KNAPP_SCHWELLE;
}

/** Ergebnis-Paket einer Promotion (Spec 8): Archetyp + Name + Trait-Verbiegung + Perks + Signatur. */
export interface Named {
  archetyp: string;
  name: string; // prozedural, z. B. "Varokh, der Rasende"
  traitOverlay: Partial<TraitProfile>; // verbiegt das Motiv-Profil
  perks: string[];
  signaturTeil: string;
}

const VORNAMEN = [
  'Garfild', 'Borek', 'Hilde', 'Ragnar', 'Knut', 'Olga', 'Sven', 'Brunhild',
  'Egon', 'Mathilda', 'Torsten', 'Gudrun', 'Helmar', 'Sieglinde', 'Falko', 'Roswita',
];

function vorname(rng: () => number): string {
  return VORNAMEN[Math.floor(rng() * VORNAMEN.length)] ?? 'Garfild';
}

/**
 * Origin → Generator → Ergebnis-Paket. Der Name kombiniert einen Vornamen mit dem
 * MOTIV des Gegners ("Garfild der Aasgeier"); der Origin 'knapper_sieg' liefert
 * Perks/Trait-Verbiegung (rachsüchtig, flieht nie, Lebensschub).
 * Unbekannter Origin = lauter Fehler (kein stiller Fallback).
 */
export function generateNamed(origin: string, motivLabel: string, rng: () => number): Named {
  if (origin !== 'knapper_sieg') throw new Error('Unbekannter Origin: ' + origin);
  return {
    archetyp: 'der Rasende', // Origin-Archetyp steuert Reveal-Stil + Perks
    name: `${vorname(rng)} der ${motivLabel}`,
    traitOverlay: { vorsicht: 0, stolz: 1, mut: 1 }, // rachsüchtig, flieht nie
    perks: ['lebensschub_vor_tod'],
    signaturTeil: 'turm_rasend',
  };
}
