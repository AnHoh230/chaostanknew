import type { TraitProfile } from './aiTypes';

/** Anzeigename des Motivs (für Promotion-Namen "Vorname der ‹Motiv›"). */
export const MOTIV_LABEL: Record<string, string> = {
  aasgeier: 'Aasgeier',
  schatzjaeger: 'Schatzjäger',
  angsthase: 'Angsthase',
  aufruester: 'Aufrüster',
  rudelfuehrer: 'Rudelführer',
  platzhirsch: 'Platzhirsch',
};

/**
 * Motiv-Archetyp-Voreinstellungen (Spec 7.2). Mischungen entstehen aus den
 * Trait-Werten; das hier sind nur Startpunkte, keine harten Klassen.
 */
export const MOTIVE_PRESETS: Record<string, TraitProfile> = {
  aasgeier: { mut: 0.7, stolz: 0.3, gier: 0.8, geselligkeit: 0.2, vorsicht: 0.3, fortschrittsdrang: 0.4 },
  schatzjaeger: { mut: 0.5, stolz: 0.3, gier: 0.95, geselligkeit: 0.3, vorsicht: 0.2, fortschrittsdrang: 0.6 },
  angsthase: { mut: 0.15, stolz: 0.2, gier: 0.3, geselligkeit: 0.7, vorsicht: 0.95, fortschrittsdrang: 0.3 },
  aufruester: { mut: 0.5, stolz: 0.4, gier: 0.6, geselligkeit: 0.3, vorsicht: 0.4, fortschrittsdrang: 0.95 },
  rudelfuehrer: { mut: 0.6, stolz: 0.6, gier: 0.4, geselligkeit: 0.95, vorsicht: 0.4, fortschrittsdrang: 0.5 },
  platzhirsch: { mut: 0.6, stolz: 0.95, gier: 0.3, geselligkeit: 0.3, vorsicht: 0.5, fortschrittsdrang: 0.3 },
};
