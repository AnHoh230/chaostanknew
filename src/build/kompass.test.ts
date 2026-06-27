import { describe, it, expect } from 'vitest';
import {
  createKompassState, kompassFreischalten, waehlePol, speiseImpuls,
  istPolGemaxt, gemaxtePole, verbrauche, type KompassState,
} from './kompass';
import { POL_MAX_LEVEL, POL_FUEL_CAP, FUEL_IMPULSE_COST, polGesamtKosten, levelKosten } from './evolutionTuning';

// genau genug Impuls, um den aktiven Pol von 0 auf Max zu bringen
const maxeAktivenPol = (s: KompassState): void => speiseImpuls(s, polGesamtKosten());

describe('Kompass — Level/Fuel (Gate 1, Spec 5 §2/§5)', () => {
  it('vor Freischaltung nimmt der Kompass nichts an', () => {
    const s = createKompassState();
    speiseImpuls(s, 1000);
    expect(s.pole.befehl.level).toBe(0);
    expect(s.pole.befehl.progress).toBe(0);
  });

  it('Impulse leveln den aktiven Pol entlang der steigenden Kosten', () => {
    const s = createKompassState(); kompassFreischalten(s);
    speiseImpuls(s, levelKosten(0));
    expect(s.pole.befehl.level).toBe(1);
    expect(s.pole.befehl.progress).toBeCloseTo(0, 6);
  });

  it('erreicht Level 5 und setzt reachedMax (sticky)', () => {
    const s = createKompassState(); kompassFreischalten(s);
    maxeAktivenPol(s);
    expect(s.pole.befehl.level).toBe(POL_MAX_LEVEL);
    expect(istPolGemaxt(s, 'befehl')).toBe(true);
  });

  it('Fuel füllt ERST nach Level-Max', () => {
    const s = createKompassState(); kompassFreischalten(s);
    speiseImpuls(s, levelKosten(0)); // Level 1, kein Max → kein Fuel
    expect(s.pole.befehl.fuel).toBe(0);
    expect(s.pole.befehl.fuelProgress).toBe(0);
    speiseImpuls(s, polGesamtKosten() - levelKosten(0)); // Restkosten 1→5, exakt gemaxt
    expect(s.pole.befehl.level).toBe(POL_MAX_LEVEL);
    expect(s.pole.befehl.fuel).toBe(0); // exakt gemaxt, noch kein Fuel
    speiseImpuls(s, FUEL_IMPULSE_COST); // jetzt +1 Fuel
    expect(s.pole.befehl.fuel).toBe(1);
  });

  it('Fuel ist bei POL_FUEL_CAP gedeckelt, Überlauf in overflowWaste', () => {
    const s = createKompassState(); kompassFreischalten(s);
    maxeAktivenPol(s);
    speiseImpuls(s, FUEL_IMPULSE_COST * (POL_FUEL_CAP + 3));
    expect(s.pole.befehl.fuel).toBe(POL_FUEL_CAP);
    expect(s.overflowWaste).toBeGreaterThan(0);
  });

  it('verbrauche senkt NIE Level/reachedMax (Spec 5 §2)', () => {
    const s = createKompassState(); kompassFreischalten(s);
    maxeAktivenPol(s);
    speiseImpuls(s, FUEL_IMPULSE_COST * 3); // 3 Fuel
    expect(verbrauche(s, 'befehl', 2)).toBe(true);
    expect(s.pole.befehl.fuel).toBe(1);
    expect(s.pole.befehl.level).toBe(POL_MAX_LEVEL); // Level unberührt
    expect(istPolGemaxt(s, 'befehl')).toBe(true); // bleibt gemaxt
  });

  it('verbrauche scheitert bei zu wenig Fuel', () => {
    const s = createKompassState(); kompassFreischalten(s);
    maxeAktivenPol(s);
    expect(verbrauche(s, 'befehl', 1)).toBe(false);
  });

  it('Pol-Wechsel verliert keinen Teilfortschritt', () => {
    const s = createKompassState(); kompassFreischalten(s);
    speiseImpuls(s, 5); // progress auf befehl
    const pBefehl = s.pole.befehl.progress;
    waehlePol(s, 'raum');
    speiseImpuls(s, 5); // progress auf raum
    waehlePol(s, 'befehl');
    expect(s.pole.befehl.progress).toBe(pBefehl);
    expect(s.pole.raum.progress).toBeGreaterThan(0);
  });

  it('gemaxtePole listet genau die gemaxten Pole', () => {
    const s = createKompassState(); kompassFreischalten(s);
    maxeAktivenPol(s); // befehl
    waehlePol(s, 'raum'); maxeAktivenPol(s); // raum
    expect(gemaxtePole(s).sort()).toEqual(['befehl', 'raum']);
  });
});
