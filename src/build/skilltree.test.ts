import { describe, it, expect } from 'vitest';
import {
  createSkillState, chooseUlt, spendTalent, applySkills, TALENT_MAX,
  SAAT_PRO_RANG, ERNTEPOT_PRO_RANG, REIFDMG_PRO_RANG,
} from './skilltree';
import { DEFAULT_GARTEN } from './garten';

describe('SkillState', () => {
  it('startet leer (keine Ult, alle Ränge 0, keine Punkte)', () => {
    const st = createSkillState();
    expect(st.ult).toBeNull();
    expect(st.punkte).toBe(0);
    expect(Object.values(st.ranks).every((r) => r === 0)).toBe(true);
  });
});

describe('chooseUlt', () => {
  it('braucht einen Punkt und setzt die Ult (kostet ihn)', () => {
    const st = createSkillState();
    expect(chooseUlt(st, 'naehrboden')).toBe(false); // keine Punkte
    st.punkte = 1;
    expect(chooseUlt(st, 'naehrboden')).toBe(true);
    expect(st.ult).toBe('naehrboden');
    expect(st.punkte).toBe(0);
  });
  it('kann nicht zweimal gewählt werden', () => {
    const st = createSkillState();
    st.punkte = 2;
    chooseUlt(st, 'naehrboden');
    expect(chooseUlt(st, 'ausbruch')).toBe(false);
    expect(st.ult).toBe('naehrboden');
  });
});

describe('spendTalent', () => {
  it('braucht eine gewählte Ult', () => {
    const st = createSkillState();
    st.punkte = 1;
    expect(spendTalent(st, 'saat')).toBe(false); // keine Ult
  });
  it('erhöht den Rang und zieht einen Punkt ab; respektiert das Maximum', () => {
    const st = createSkillState();
    st.punkte = 10;
    chooseUlt(st, 'naehrboden'); // -1
    expect(spendTalent(st, 'saat')).toBe(true);
    expect(st.ranks.saat).toBe(1);
    expect(spendTalent(st, 'saat')).toBe(true);
    expect(spendTalent(st, 'saat')).toBe(true);
    expect(st.ranks.saat).toBe(TALENT_MAX);
    expect(spendTalent(st, 'saat')).toBe(false); // Max erreicht
  });
});

describe('applySkills', () => {
  it('ohne Ränge = Basis-Config', () => {
    const st = createSkillState();
    const a = applySkills(DEFAULT_GARTEN, st);
    expect(a.cfg.saat).toBe(DEFAULT_GARTEN.saat);
    expect(a.cfg.erntePot).toBe(DEFAULT_GARTEN.erntePot);
    expect(a.st1DotBonus).toBe(0);
  });
  it('Talent-Ränge verschieben die echten Werte (saat ↑, erntePot ↓, reifDmg ↑)', () => {
    const st = createSkillState();
    st.ranks.saat = 2;
    st.ranks.reife = 2;
    st.ranks.reifschaden = 1;
    const a = applySkills(DEFAULT_GARTEN, st);
    expect(a.cfg.saat).toBe(DEFAULT_GARTEN.saat + 2 * SAAT_PRO_RANG);
    expect(a.cfg.erntePot).toBe(DEFAULT_GARTEN.erntePot - 2 * ERNTEPOT_PRO_RANG);
    expect(a.cfg.reifDmg).toBe(DEFAULT_GARTEN.reifDmg + 1 * REIFDMG_PRO_RANG);
  });
  it('erntePot fällt nie unter 8 und slow nie über 1', () => {
    const st = createSkillState();
    st.ranks.reife = 99;
    st.ranks.drossel = 99;
    const a = applySkills(DEFAULT_GARTEN, st);
    expect(a.cfg.erntePot).toBeGreaterThanOrEqual(8);
    expect(a.cfg.slow).toBeLessThanOrEqual(1);
  });
});
