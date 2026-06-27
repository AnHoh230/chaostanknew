import { describe, it, expect } from 'vitest';
import type { Pol } from './buildModell';
import {
  createBlueprintState, tickBlueprint, istRelevant, mussErstenErzwingen, mussRelevantenErzwingen,
  zieheBauplan, nimmBauplan, ersetzeBauplan, BLUEPRINT_POOL,
} from './blueprints';
import { BLUEPRINT_SLOTS } from './evolutionTuning';

const lvl = (befehl: number, raum: number, zustand: number): Record<Pol, number> => ({ befehl, raum, zustand });
// deterministischer RNG aus einer Wertefolge
const seq = (vals: number[]): (() => number) => { let i = 0; return () => vals[i++ % vals.length]!; };
const defOf = (id: string) => BLUEPRINT_POOL.find((b) => b.id === id)!;

describe('blueprints (Gate 3, Spec 5 §6)', () => {
  it('istRelevant: Bedarf trifft einen der zwei höchsten Pole', () => {
    const levels = lvl(5, 5, 0); // top2 = befehl, raum
    expect(istRelevant(defOf('bombardement'), levels)).toBe(true); // B+R
    expect(istRelevant(defOf('sporenfeld'), levels)).toBe(true); // R+Z (raum top)
    // im 3-Pol-MVP ist alles relevant (jedes Paar schneidet jede Top-2):
    expect(istRelevant(defOf('urteil'), levels)).toBe(true); // B+Z (befehl top)
  });

  it('Pity: erster Bauplan spätestens nach 120 s', () => {
    const s = createBlueprintState();
    tickBlueprint(s, 119);
    expect(mussErstenErzwingen(s)).toBe(false);
    tickBlueprint(s, 2); // 121 s
    expect(mussErstenErzwingen(s)).toBe(true);
    const a = zieheBauplan(s, lvl(5, 5, 0), seq([0, 0]), true);
    expect(a).not.toBeNull();
    expect(s.ersterGezogen).toBe(true);
    expect(mussErstenErzwingen(s)).toBe(false); // erledigt
  });

  it('Pity: relevanter Bauplan spätestens nach 180 s, Timer wird zurückgesetzt', () => {
    const s = createBlueprintState();
    tickBlueprint(s, 180);
    expect(mussRelevantenErzwingen(s)).toBe(true);
    const a = zieheBauplan(s, lvl(5, 5, 0), seq([0.99, 0]));
    expect(a!.relevant).toBe(true);
    expect(s.sekSeitLetztemRelevanten).toBe(0);
    expect(mussRelevantenErzwingen(s)).toBe(false);
  });

  it('Duplikatschutz: besessene Baupläne werden nie angeboten', () => {
    const s = createBlueprintState();
    nimmBauplan(s, 'bombardement');
    nimmBauplan(s, 'sporenfeld');
    for (let i = 0; i < 20; i++) {
      const a = zieheBauplan(s, lvl(5, 5, 5), seq([0.1 * (i % 10), 0.3 * (i % 3)]));
      if (a) expect(['urteil', 'systembruch']).toContain(a.id);
    }
  });

  it('Slot-Limit: voll → nimmBauplan false (Replace-Pfad), ersetzeBauplan tauscht', () => {
    const s = createBlueprintState();
    expect(nimmBauplan(s, 'bombardement')).toBe(true);
    expect(nimmBauplan(s, 'sporenfeld')).toBe(true);
    expect(nimmBauplan(s, 'urteil')).toBe(true);
    expect(s.besessen.length).toBe(BLUEPRINT_SLOTS);
    expect(nimmBauplan(s, 'systembruch')).toBe(false); // voll
    expect(ersetzeBauplan(s, 'bombardement', 'systembruch')).toBe(true);
    expect(s.besessen).toContain('systembruch');
    expect(s.besessen).not.toContain('bombardement');
    expect(nimmBauplan(s, 'bombardement')).toBe(false); // immer noch voll
  });

  it('kein doppeltes Annehmen; leerer Pool gibt null', () => {
    const s = createBlueprintState();
    expect(nimmBauplan(s, 'bombardement')).toBe(true);
    expect(nimmBauplan(s, 'bombardement')).toBe(false); // schon besessen
    // alle 4 besessen → zieheBauplan null
    const s2 = createBlueprintState();
    s2.besessen = ['bombardement', 'sporenfeld', 'urteil', 'systembruch'];
    expect(zieheBauplan(s2, lvl(1, 1, 1), seq([0, 0]))).toBeNull();
  });

  it('Gewichtung: Klasse-A-Wurf liefert einen Bauplan mit beiden Top-Polen', () => {
    const s = createBlueprintState();
    const levels = lvl(5, 5, 0); // top2 = befehl, raum → Klasse A = bombardement
    const a = zieheBauplan(s, levels, seq([0.0, 0.0])); // r<0.6 → Klasse A
    expect(a!.id).toBe('bombardement');
  });
});
