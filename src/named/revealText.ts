import type { Named } from './promotion';
import type { Akte } from './akte';

export interface RevealStyle {
  farbe: string; // CSS-Farbe, mit der Spruch/Highlight eingefärbt werden
}

/** Charakterfarbe je Archetyp (rein datengetrieben). */
export function archetypStil(archetyp: string): RevealStyle {
  switch (archetyp) {
    case 'der Rasende':
      return { farbe: '#ff5a3c' }; // wütendes Rot-Orange
    default:
      return { farbe: '#e8e0c8' };
  }
}

/** Erstkontakt-Spruch — Template aus Archetyp + Akte (kein LLM). */
export function revealLine(named: Named, akte: Akte): string {
  switch (named.archetyp) {
    case 'der Rasende': {
      const knapp = Math.round(akte.knappsterSieg * 100);
      return `${named.name}: „Bei ${knapp}% hast du mich verschont. Das wirst du bereuen."`;
    }
    default:
      return `${named.name} erscheint.`;
  }
}

/** Wiedererkennungs-Spruch — vom Erstkontakt verschieden, aus der Akte gespeist. */
export function recognitionLine(named: Named, akte: Akte): string {
  switch (named.archetyp) {
    case 'der Rasende': {
      const n = akte.begegnungen;
      return `${named.name}: „Begegnung ${n}. Diesmal überlebst du nicht."`;
    }
    default:
      return `${named.name} ist zurück.`;
  }
}
