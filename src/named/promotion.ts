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

const SILBEN = ['va', 'rok', 'thar', 'gru', 'mor', 'dak', 'sen', 'val', 'korr', 'zur', 'bran', 'hex'];

function silbe(rng: () => number): string {
  return SILBEN[Math.floor(rng() * SILBEN.length)] ?? 'rok';
}

/**
 * Origin → Generator → Ergebnis-Paket. Slice kennt EINEN Origin: 'knapper_sieg'
 * → "der Rasende" (rachsüchtig, flieht nie, Lebensschub kurz vorm Tod).
 * Unbekannter Origin = lauter Fehler (kein stiller Fallback).
 */
export function generateNamed(origin: string, rng: () => number): Named {
  if (origin !== 'knapper_sieg') throw new Error('Unbekannter Origin: ' + origin);
  const eigenname = silbe(rng) + silbe(rng);
  const name = eigenname.charAt(0).toUpperCase() + eigenname.slice(1) + ', der Rasende';
  return {
    archetyp: 'der Rasende',
    name,
    traitOverlay: { vorsicht: 0, stolz: 1, mut: 1 }, // rachsüchtig, flieht nie
    perks: ['lebensschub_vor_tod'],
    signaturTeil: 'turm_rasend',
  };
}
