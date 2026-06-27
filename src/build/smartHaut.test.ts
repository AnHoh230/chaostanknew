import { describe, it, expect } from 'vitest';
import { DEFAULT_GARTEN } from './garten';
import {
  darfUebergang, istInfiziert, infiziereMonoton, feldDarfEntstehen,
  createMastery, buildGemeistert, MASTERY_MARKED_KILLS, MASTERY_FIELD_KILLS, MASTERY_MATURE_KILLS,
  naheKandidaten, besserReife, ultKategorie, ultWirksam, ULT_MIN_EFFECT_SCORE,
} from './smartHaut';

describe('smartHaut — Schicht-Status (Gate 1)', () => {
  it('erlaubt nur Schritt-für-Schritt-Übergänge', () => {
    expect(darfUebergang('active', 'progressFull')).toBe(true);
    expect(darfUebergang('progressFull', 'masteryPassed')).toBe(true);
    expect(darfUebergang('masteryPassed', 'signed')).toBe(true);
    expect(darfUebergang('active', 'signed')).toBe(false); // kein Überspringen
    expect(darfUebergang('signed', 'active')).toBe(false); // kein Rückwärts
  });
});

describe('smartHaut — sichere Applies (Gate 2)', () => {
  it('infiziereMonoton senkt die Potenz NIE (additiv)', () => {
    const g = infiziereMonoton(undefined, DEFAULT_GARTEN);
    expect(g.potency).toBe(DEFAULT_GARTEN.saat); // 6
    const g2 = infiziereMonoton(g, DEFAULT_GARTEN);
    expect(g2.potency).toBeGreaterThanOrEqual(g.potency); // nie kleiner
    expect(g2.potency).toBe(DEFAULT_GARTEN.saat * 2); // 12
  });
  it('istInfiziert nur bei potency > 0', () => {
    expect(istInfiziert(undefined)).toBe(false);
    expect(istInfiziert({ potency: 0, tickCd: 0 })).toBe(false);
    expect(istInfiziert({ potency: 1, tickCd: 0 })).toBe(true);
  });
  it('feldDarfEntstehen nur unter dem Cap', () => {
    expect(feldDarfEntstehen(2, 3)).toBe(true);
    expect(feldDarfEntstehen(3, 3)).toBe(false);
  });
});

describe('smartHaut — Mastery (Gate 3)', () => {
  it('buildGemeistert je Build an der richtigen Schwelle', () => {
    const m = createMastery();
    expect(buildGemeistert('befehl', m)).toBe(false);
    m.markedKills = MASTERY_MARKED_KILLS;
    expect(buildGemeistert('befehl', m)).toBe(true);
    expect(buildGemeistert('raum', m)).toBe(false); // andere Spur
    m.fieldKills = MASTERY_FIELD_KILLS;
    expect(buildGemeistert('raum', m)).toBe(true);
    m.matureKills = MASTERY_MATURE_KILLS;
    expect(buildGemeistert('zustand', m)).toBe(true);
  });
});

describe('smartHaut — Signatur-Entscheidungen (Gate 4)', () => {
  it('naheKandidaten: in Reichweite, nach Distanz, gecappt', () => {
    const k = [
      { id: 'a', x: 1, z: 0 }, { id: 'b', x: 3, z: 0 }, { id: 'c', x: 100, z: 0 }, { id: 'd', x: 2, z: 0 },
    ];
    const res = naheKandidaten(0, 0, k, 6, 2);
    expect(res).toEqual(['a', 'd']); // nächste zwei in Reichweite, 'c' raus, max 2
  });
  it('besserReife = max (verschlechtert nie)', () => {
    expect(besserReife(0.8, 0.35)).toBe(0.8);
    expect(besserReife(0.2, 0.35)).toBe(0.35);
  });
});

describe('smartHaut — Ult (Gate 5)', () => {
  it('ultKategorie je Build', () => {
    expect(ultKategorie('befehl')).toBe('zielsalve');
    expect(ultKategorie('raum')).toBe('feldverlagerung');
    expect(ultKategorie('zustand')).toBe('reifeschub');
  });
  it('ultWirksam ab Mindest-Score', () => {
    expect(ultWirksam(ULT_MIN_EFFECT_SCORE - 1)).toBe(false);
    expect(ultWirksam(ULT_MIN_EFFECT_SCORE)).toBe(true);
  });
});
