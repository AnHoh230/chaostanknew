import { describe, it, expect } from 'vitest';
import {
  createRaumState, legeFeld, feldRadius, feldAn, naechstesFeld, feldSchaden, feldSlow, zugZurMitte,
  ernteFeldKill, tickFeld, DEFAULT_RAUM as C, type FeldTreffer,
} from './raum';

describe('Raum-Build (Felder)', () => {
  it('startet ohne Felder und ohne Buff', () => {
    expect(createRaumState()).toEqual({ felder: [], buff: 0 });
  });

  describe('legeFeld (R, FIFO bei max)', () => {
    it('legt Felder bis zum Maximum ohne Verdrängung', () => {
      const s = createRaumState();
      for (let i = 0; i < C.maxFelder; i++) expect(legeFeld(s, i, 0)).toBeNull();
      expect(s.felder.length).toBe(C.maxFelder);
    });

    it('das (maxFelder+1)-te Feld schiebt nach FIFO das älteste weg', () => {
      const s = createRaumState();
      legeFeld(s, 1, 1); // ältestes
      for (let i = 0; i < C.maxFelder - 1; i++) legeFeld(s, 10 + i, 0);
      const weg = legeFeld(s, 99, 99);
      expect(weg).toEqual({ x: 1, z: 1 }); // ältestes umgelagert
      expect(s.felder.length).toBe(C.maxFelder);
      expect(s.felder.some((f) => f.x === 1 && f.z === 1)).toBe(false);
      expect(s.felder.some((f) => f.x === 99 && f.z === 99)).toBe(true);
    });

    it('maxFelder-Override gilt statt cfg.maxFelder (mehr Munition = mehr Felder)', () => {
      const s = createRaumState();
      for (let i = 0; i < 5; i++) expect(legeFeld(s, i, 0, C, 5)).toBeNull(); // Override 5 → kein Verdrängen bis 5
      expect(s.felder.length).toBe(5);
      const weg = legeFeld(s, 99, 0, C, 5); // das 6. verdrängt FIFO das älteste
      expect(weg).toEqual({ x: 0, z: 0 });
      expect(s.felder.length).toBe(5);
    });
  });

  describe('feldSchaden (Kalibrierung aufs ANFANGS-Leben)', () => {
    it('tötet einen Gegner mit Anfangs-HP in genau ticksZumTod Ticks (Buff 0)', () => {
      const basisHp = 100;
      const dmg = feldSchaden(basisHp, 0);
      expect(dmg).toBe(basisHp / C.ticksZumTod); // 100/4 = 25
      expect(dmg * C.ticksZumTod).toBeGreaterThanOrEqual(basisHp); // 4 Ticks decken das Anfangsleben
    });

    it('hängt NUR am Anfangs-HP, nicht an der aktuellen (skalierten) HP', () => {
      // derselbe Typ auf Level 10 hätte mehr aktuelle HP — der Feld-Schaden bleibt gleich (fest):
      expect(feldSchaden(75, 0)).toBe(feldSchaden(75, 0));
      // ein zäher Typ (höheres Basis-HP) kassiert proportional mehr:
      expect(feldSchaden(220, 0)).toBeGreaterThan(feldSchaden(75, 0));
    });

    it('der Ernte-Buff (RRR) erhöht den Schaden additiv', () => {
      const basis = feldSchaden(100, 0);
      expect(feldSchaden(100, 10)).toBe(basis + 10 * C.dmgProBuff);
      expect(feldSchaden(100, 10)).toBeGreaterThan(basis);
    });
  });

  describe('feldRadius (RRR-Wachstum)', () => {
    it('ohne Buff der Basisradius', () => {
      expect(feldRadius(C, 0)).toBe(C.radius);
    });
    it('mit genug Buff verdoppelt sich der Radius (+wachstumProBuff je Buff)', () => {
      const buffFuerDoppelt = 1 / C.wachstumProBuff; // +100 %
      expect(feldRadius(C, buffFuerDoppelt)).toBeCloseTo(C.radius * 2);
    });
    it('die Größe ist bei wachstumCap gedeckelt (mehr Buff = nicht größer)', () => {
      expect(feldRadius(C, C.wachstumCap + 100)).toBeCloseTo(feldRadius(C, C.wachstumCap));
      expect(feldRadius(C, C.wachstumCap + 100)).toBeGreaterThan(C.radius); // bis zum Cap aber gewachsen
    });
    it('sizeMul vergrößert den Radius multiplikativ (Großfeld-Ult ×3)', () => {
      expect(feldRadius(C, 0, 3)).toBeCloseTo(C.radius * 3);
      expect(feldRadius(C, 0)).toBe(C.radius); // Default-sizeMul 1 = unverändert
    });
  });

  describe('feldAn', () => {
    it('findet das Feld, in dem ein Punkt liegt; null außerhalb', () => {
      const s = createRaumState();
      legeFeld(s, 0, 0);
      expect(feldAn(s, C.radius * 0.5, 0)).toEqual({ x: 0, z: 0 }); // innerhalb des Radius
      expect(feldAn(s, 100, 0)).toBeNull();
    });
    it('größere Felder (Buff) fangen weiter entfernte Punkte', () => {
      const s = createRaumState();
      legeFeld(s, 0, 0);
      const knappDraussen = C.radius * 1.2; // knapp außerhalb; der Buff (×1.5) holt ihn rein
      expect(feldAn(s, knappDraussen, 0)).toBeNull();
      s.buff = 0.5 / C.wachstumProBuff; // genug Buff, dass der gewachsene Radius knappDraussen einschließt
      expect(feldAn(s, knappDraussen, 0)).not.toBeNull();
    });
    it('sizeMul vergrößert die Fang-Reichweite (Großfeld-Ult ×3)', () => {
      const s = createRaumState();
      legeFeld(s, 0, 0);
      const draussen = C.radius * 2; // normal außerhalb
      expect(feldAn(s, draussen, 0)).toBeNull();
      expect(feldAn(s, draussen, 0, C, 3)).not.toBeNull(); // mit ×3 drin
    });
  });

  describe('naechstesFeld (RR-Zug)', () => {
    it('findet das nächstgelegene Feld, auch von außerhalb', () => {
      const s = createRaumState();
      legeFeld(s, 0, 0);
      legeFeld(s, 100, 0);
      expect(naechstesFeld(s, 90, 0)).toEqual({ x: 100, z: 0 });
      expect(naechstesFeld(s, 5, 0)).toEqual({ x: 0, z: 0 });
    });
    it('null ohne Felder', () => {
      expect(naechstesFeld(createRaumState(), 0, 0)).toBeNull();
    });
  });

  describe('zugZurMitte (RR)', () => {
    it('liefert einen normierten Vektor Richtung Feld-Mitte', () => {
      const v = zugZurMitte({ x: 0, z: 0 }, 10, 0);
      expect(v).toEqual({ dx: -1, dz: 0 }); // von rechts nach links zur Mitte
      expect(Math.hypot(v.dx, v.dz)).toBeCloseTo(1);
    });
  });

  describe('ernteFeldKill (RRR)', () => {
    it('jeder Feld-Kill gibt +1 Buff', () => {
      const s = createRaumState();
      ernteFeldKill(s); ernteFeldKill(s);
      expect(s.buff).toBe(2);
    });
  });

  it('feldSlow ist ein gültiger Tempo-Anteil 0..1', () => {
    expect(feldSlow()).toBe(C.slow);
    expect(feldSlow()).toBeGreaterThan(0);
    expect(feldSlow()).toBeLessThanOrEqual(1);
  });

  describe('tickFeld', () => {
    const mk = (): FeldTreffer => ({ tickCd: 0, gefangen: false });

    it('außerhalb des Feldes: kein Schaden, Cooldown zurückgesetzt', () => {
      const t = mk(); t.tickCd = 0.3;
      expect(tickFeld(t, false, 100, 0, 0.1)).toEqual({ dmg: 0, ticked: false });
      expect(t.tickCd).toBe(0); // beim Wiedereintritt sofort ein Tick
    });

    it('im Feld tickt es alle tickEvery und teilt Feld-Schaden aus', () => {
      const t = mk();
      const erster = tickFeld(t, true, 100, 0, 0.1); // tickCd war 0 → sofort fällig
      expect(erster.ticked).toBe(true);
      expect(erster.dmg).toBe(feldSchaden(100, 0));
      const gleich = tickFeld(t, true, 100, 0, 0.1); // noch nicht fällig
      expect(gleich.ticked).toBe(false);
    });

    it('markiert den Gegner als gefangen, sobald er im Feld ist (RR)', () => {
      const t = mk();
      expect(t.gefangen).toBe(false);
      tickFeld(t, true, 100, 0, 0.1);
      expect(t.gefangen).toBe(true);
    });
  });
});
