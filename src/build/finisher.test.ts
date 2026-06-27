import { describe, it, expect } from 'vitest';
import type { Pol } from './buildModell';
import { createKompassState, kompassFreischalten, type KompassState } from './kompass';
import {
  FINISHER_EFFECTIVE_USES_TO_HARDEN, TIER_POWER, MIN_EFFECTIVE_BOARDSCORE_TIER_2,
} from './evolutionTuning';
import {
  createFinisherState, finisherDef, boardScore, powerMultiplier, schmiede, feuere,
  istVerhaertet, dispatchAutoFeuer, naechsterAutoFinisher, finisherRang, FINISHER_RANG_PRO, type GegnerBoard,
} from './finisher';

// Kompass mit gemaxten Polen + Fuel direkt aufbauen (isoliert von der Ökonomie)
const kompassMit = (polsMax: Pol[], fuelEach = 10): KompassState => {
  const k = createKompassState();
  kompassFreischalten(k);
  for (const p of polsMax) { k.pole[p].level = 5; k.pole[p].reachedMax = true; k.pole[p].fuel = fuelEach; }
  return k;
};
const bomb = finisherDef('bombardement');
const markFeld = (n: number): GegnerBoard[] => Array.from({ length: n }, () => ({ mark: true, feld: true }));

describe('finisher — BoardScore (Gate 4, Spec 5 §7)', () => {
  it('bombardement liest nur mark+feld; Synergie bei beidem auf einem Gegner', () => {
    expect(boardScore(bomb, [{ mark: true }])).toBeCloseTo(1.0, 6);
    expect(boardScore(bomb, [{ feld: true }])).toBeCloseTo(1.2, 6);
    expect(boardScore(bomb, [{ mark: true, feld: true }])).toBeCloseTo(4.2, 6); // 1.0+1.2+2.0 Synergie
    expect(boardScore(bomb, [{ giftStacks: 5 }])).toBe(0); // Gift wird nicht gelesen
  });

  it('summiert über Gegner', () => {
    expect(boardScore(bomb, [{ mark: true }, { feld: true }, { mark: true, feld: true }, { giftStacks: 5 }]))
      .toBeCloseTo(6.4, 6);
  });
});

describe('finisher — powerMultiplier (Spec 5 §7)', () => {
  it('am Tier-Minimum = base, skaliert mit sqrt, deckelt bei max', () => {
    expect(powerMultiplier(2, MIN_EFFECTIVE_BOARDSCORE_TIER_2)).toBeCloseTo(TIER_POWER[2].base, 6);
    expect(powerMultiplier(2, 40)).toBeCloseTo(4, 6); // 2*sqrt(4)
    expect(powerMultiplier(2, 100000)).toBeCloseTo(TIER_POWER[2].max, 6); // gedeckelt
  });
});

describe('finisher — schmieden (Spec 5 §3/§10)', () => {
  it('bombardement: nur mit beiden Polen gemaxt UND Bauplan', () => {
    const s1 = createFinisherState();
    expect(schmiede(s1, ['befehl'], ['bombardement'])).not.toContain('bombardement'); // raum fehlt
    const s2 = createFinisherState();
    expect(schmiede(s2, ['befehl', 'raum'], [])).not.toContain('bombardement'); // kein Bauplan
    const s3 = createFinisherState();
    expect(schmiede(s3, ['befehl', 'raum'], ['bombardement'])).toContain('bombardement');
    expect(s3.aktiv).toContain('bombardement');
  });

  it('Tier-1 ist bei Pol-Max automatisch bekannt (kein Bauplan)', () => {
    const s = createFinisherState();
    const neu = schmiede(s, ['befehl'], []);
    expect(neu).toContain('generalbefehl');
  });

  it('schmiedet nicht doppelt', () => {
    const s = createFinisherState();
    schmiede(s, ['befehl', 'raum'], ['bombardement']);
    expect(schmiede(s, ['befehl', 'raum'], ['bombardement'])).toEqual([]);
  });
});

describe('finisher — feuern (Spec 5 §8)', () => {
  it('inaktiv → nicht wirksam', () => {
    const s = createFinisherState();
    expect(feuere(s, kompassMit(['befehl', 'raum']), 'bombardement', markFeld(3)).grund).toBe('inaktiv');
  });

  it('zu wenig Board → leer, KEIN Fuel verbraucht', () => {
    const s = createFinisherState();
    schmiede(s, ['befehl', 'raum'], ['bombardement']);
    const k = kompassMit(['befehl', 'raum']);
    const r = feuere(s, k, 'bombardement', markFeld(2)); // 8.4 < 10
    expect(r.grund).toBe('leer');
    expect(k.pole.befehl.fuel).toBe(10); // unverbraucht
    expect(s.zuendungen.bombardement).toBe(0);
  });

  it('kein Fuel → grund fuel, nichts gezogen', () => {
    const s = createFinisherState();
    schmiede(s, ['befehl', 'raum'], ['bombardement']);
    const k = kompassMit(['befehl', 'raum'], 0);
    expect(feuere(s, k, 'bombardement', markFeld(3)).grund).toBe('fuel');
  });

  it('wirksam: zieht je 1 Fuel aus beiden Polen, zählt + liefert power', () => {
    const s = createFinisherState();
    schmiede(s, ['befehl', 'raum'], ['bombardement']);
    const k = kompassMit(['befehl', 'raum']);
    const r = feuere(s, k, 'bombardement', markFeld(3)); // 12.6 >= 10
    expect(r.wirksam).toBe(true);
    expect(r.power).toBeGreaterThan(TIER_POWER[2].base);
    expect(k.pole.befehl.fuel).toBe(9);
    expect(k.pole.raum.fuel).toBe(9);
    expect(s.zuendungen.bombardement).toBe(1);
  });

  it('verhärtet nach 8 wirksamen Zündungen', () => {
    const s = createFinisherState();
    schmiede(s, ['befehl', 'raum'], ['bombardement']);
    const k = kompassMit(['befehl', 'raum'], 99);
    for (let i = 0; i < FINISHER_EFFECTIVE_USES_TO_HARDEN; i++) feuere(s, k, 'bombardement', markFeld(3));
    expect(istVerhaertet(s, 'bombardement')).toBe(true);
  });

  it('Evolution a) — finisherRang steigt je FINISHER_RANG_PRO wirksame Zündungen', () => {
    const s = createFinisherState();
    expect(finisherRang(s, 'bombardement')).toBe(0);
    s.zuendungen.bombardement = FINISHER_RANG_PRO; // genau 1 Rang
    expect(finisherRang(s, 'bombardement')).toBe(1);
    s.zuendungen.bombardement = FINISHER_RANG_PRO * 2 + 1;
    expect(finisherRang(s, 'bombardement')).toBe(2);
  });
});

describe('finisher — Auto-Feuer-Dispatcher (Spec 5 §9)', () => {
  it('feuert nur verhärtete Finisher', () => {
    const s = createFinisherState();
    schmiede(s, ['befehl', 'raum'], ['bombardement']);
    const k = kompassMit(['befehl', 'raum'], 99);
    expect(dispatchAutoFeuer(s, k, markFeld(3))).toBeNull(); // noch nicht verhärtet
    s.zuendungen.bombardement = FINISHER_EFFECTIVE_USES_TO_HARDEN; // verhärten
    expect(dispatchAutoFeuer(s, k, markFeld(3))).toBe('bombardement');
  });

  it('null ohne tauglichen Board / ohne Fuel', () => {
    const s = createFinisherState();
    schmiede(s, ['befehl', 'raum'], ['bombardement']);
    s.zuendungen.bombardement = FINISHER_EFFECTIVE_USES_TO_HARDEN;
    expect(dispatchAutoFeuer(s, createKompassState(), markFeld(3))).toBeNull(); // gesperrt + kein Fuel
    expect(dispatchAutoFeuer(s, kompassMit(['befehl', 'raum'], 99), markFeld(1))).toBeNull(); // Board zu klein
  });

  it('naechsterAutoFinisher: nurVerhaertet=false bezieht ungehärtete ein (manuelle Wahl)', () => {
    const s = createFinisherState();
    schmiede(s, ['befehl', 'raum'], ['bombardement']); // aktiv, NICHT verhärtet
    const k = kompassMit(['befehl', 'raum'], 99);
    expect(naechsterAutoFinisher(s, k, markFeld(3), true)).toBeNull(); // nichts verhärtet
    expect(naechsterAutoFinisher(s, k, markFeld(3), false)).toBe('bombardement'); // manuell wählbar
    expect(s.zuendungen.bombardement).toBe(0); // hat NICHT gefeuert (nur Auswahl)
  });

  it('wählt bei mehreren den mit höherer Readiness, feuert höchstens einen', () => {
    const s = createFinisherState();
    // generalbefehl (T1, liest mark) + bombardement (T2, liest mark+feld), beide verhärtet
    schmiede(s, ['befehl', 'raum'], ['bombardement']);
    s.zuendungen.generalbefehl = FINISHER_EFFECTIVE_USES_TO_HARDEN;
    s.zuendungen.bombardement = FINISHER_EFFECTIVE_USES_TO_HARDEN;
    const k = kompassMit(['befehl', 'raum'], 99);
    const fuelVorher = k.pole.befehl.fuel;
    const gefeuert = dispatchAutoFeuer(s, k, markFeld(10)); // viel mark+feld → bombardement readier
    expect(gefeuert).toBe('bombardement');
    // genau ein Finisher gefeuert → befehl-Fuel um genau 1 gesunken (bombardement zieht 1 befehl)
    expect(k.pole.befehl.fuel).toBe(fuelVorher - 1);
  });
});
