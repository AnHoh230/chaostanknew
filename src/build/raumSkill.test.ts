import { describe, it, expect } from 'vitest';
import {
  RAUM_ULTS, raumUltDef, createRaumSkillState, chooseRaumUlt, spendRaumTalent,
  RAUM_TALENTS, RAUM_TALENT_MAX, type RaumUltId,
} from './raumSkill';

// Raum-Build (RRR) Skill: drei Pol-Ults (Befehl/Raum/Zustand), Auswahl wie bei befehlSkill.
// Reine Defs/State; die Effekte (freie Verlegung / ×3 Größe / ansteckender DoT) setzt main.ts um.
describe('Raum-Skill (RRR Pol-Ults)', () => {
  it('hat genau drei Pol-Ults, je einen pro Pol (Befehl/Raum/Zustand)', () => {
    expect(RAUM_ULTS.length).toBe(3);
    expect(RAUM_ULTS.map((u) => u.pol).sort()).toEqual(['Befehl', 'Raum', 'Zustand']);
  });

  it('jede Ult hat 20 s Dauer', () => {
    for (const u of RAUM_ULTS) expect(u.dauer).toBe(20);
  });

  describe('raumUltDef', () => {
    it('findet die Def zur Id', () => {
      for (const u of RAUM_ULTS) expect(raumUltDef(u.id).id).toBe(u.id);
    });
    it('fällt bei null auf die erste Ult zurück', () => {
      expect(raumUltDef(null)).toBe(RAUM_ULTS[0]);
    });
  });

  describe('createRaumSkillState / chooseRaumUlt', () => {
    it('startet ohne Ult, ohne Ränge und ohne Punkte', () => {
      expect(createRaumSkillState()).toEqual({ ult: null, ranks: { dauer: 0, cooldown: 0, beute: 0, schaden: 0, munition: 0 }, punkte: 0 });
    });

    it('wählt eine Ult nur mit freiem Punkt und nur einmal', () => {
      const st = createRaumSkillState();
      expect(chooseRaumUlt(st, 'grossfeld')).toBe(false); // kein Punkt
      st.punkte = 1;
      expect(chooseRaumUlt(st, 'grossfeld')).toBe(true);
      expect(st.ult).toBe('grossfeld');
      expect(st.punkte).toBe(0);
      st.punkte = 1;
      expect(chooseRaumUlt(st, 'verseuchung')).toBe(false); // schon gewählt
      expect(st.ult).toBe('grossfeld');
    });
  });

  describe('Talente (5 Slots, je RAUM_TALENT_MAX Ränge)', () => {
    it('hat 5 Talente', () => {
      expect(RAUM_TALENTS.length).toBe(5);
      expect(RAUM_TALENTS.map((t) => t.id).sort()).toEqual(['beute', 'cooldown', 'dauer', 'munition', 'schaden']);
    });
    it('spendRaumTalent nur mit gewählter Ult + freiem Punkt + Rang < Max', () => {
      const st = createRaumSkillState();
      expect(spendRaumTalent(st, 'dauer')).toBe(false); // noch keine Ult
      st.punkte = 1; chooseRaumUlt(st, 'grossfeld');
      st.punkte = 5;
      expect(spendRaumTalent(st, 'dauer')).toBe(true);
      expect(st.ranks.dauer).toBe(1);
      expect(st.punkte).toBe(4);
      st.ranks.dauer = RAUM_TALENT_MAX;
      expect(spendRaumTalent(st, 'dauer')).toBe(false); // Max erreicht
    });
  });

  it('die Ids decken die drei Effekte ab', () => {
    const ids = RAUM_ULTS.map((u) => u.id);
    const erwartet: RaumUltId[] = ['umlagerung', 'grossfeld', 'verseuchung'];
    for (const id of erwartet) expect(ids).toContain(id);
  });
});
