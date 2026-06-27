import { describe, it, expect } from 'vitest';
import type { Pol } from './buildModell';
import { createKompassState, kompassFreischalten, type KompassState } from './kompass';
import { createFinisherState, schmiede, type FinisherState, type FinisherId } from './finisher';
import { FINISHER_EFFECTIVE_USES_TO_HARDEN } from './evolutionTuning';
import {
  createEvolutionState, paarTyp, paarGemeistert, evolviere, istSystemformReif, aktiverGrundTyp,
} from './evolution';

const kompassMit = (polsMax: Pol[]): KompassState => {
  const k = createKompassState();
  kompassFreischalten(k);
  for (const p of polsMax) { k.pole[p].level = 5; k.pole[p].reachedMax = true; k.pole[p].fuel = 99; }
  return k;
};
const finisherMit = (polsMax: Pol[], hart: FinisherId[]): FinisherState => {
  const f = createFinisherState();
  schmiede(f, polsMax, ['bombardement', 'sporenfeld', 'urteil', 'systembruch']);
  for (const id of hart) f.zuendungen[id] = FINISHER_EFFECTIVE_USES_TO_HARDEN;
  return f;
};

describe('evolution (Gate 5, Spec 3 + Spec 5 §10)', () => {
  it('paarTyp ist reihenfolge-unabhängig', () => {
    expect(paarTyp('befehl', 'raum')).toBe('architekt');
    expect(paarTyp('raum', 'befehl')).toBe('architekt');
    expect(paarTyp('raum', 'zustand')).toBe('alchemist');
    expect(paarTyp('befehl', 'zustand')).toBe('richter');
  });

  it('paarGemeistert: beide Pole gemaxt UND Tier-2-Finisher verhärtet', () => {
    const k = kompassMit(['befehl', 'raum']);
    expect(paarGemeistert('architekt', k, finisherMit(['befehl', 'raum'], []))).toBe(false); // nicht verhärtet
    expect(paarGemeistert('architekt', k, finisherMit(['befehl', 'raum'], ['bombardement']))).toBe(true);
    expect(paarGemeistert('architekt', kompassMit(['befehl']), finisherMit(['befehl'], ['bombardement']))).toBe(false); // raum fehlt
  });

  it('ohne Meisterschaft bleibt Kommander', () => {
    const s = createEvolutionState();
    expect(evolviere(s, kompassMit([]), finisherMit([], []))).toBe('kommander');
  });

  it('erstes gemeistertes Paar (B+R) → Architekt', () => {
    const s = createEvolutionState();
    expect(evolviere(s, kompassMit(['befehl', 'raum']), finisherMit(['befehl', 'raum'], ['bombardement']))).toBe('architekt');
    expect(s.gemeistertePaare).toEqual(['architekt']);
    expect(aktiverGrundTyp(s)).toBe('architekt');
  });

  it('Grundtyp ist sticky: zweites Paar ändert ihn nicht, wird aber verbucht', () => {
    const s = createEvolutionState();
    evolviere(s, kompassMit(['befehl', 'raum']), finisherMit(['befehl', 'raum'], ['bombardement'])); // Architekt
    const typ = evolviere(s, kompassMit(['befehl', 'raum', 'zustand']), finisherMit(['befehl', 'raum', 'zustand'], ['bombardement', 'sporenfeld']));
    expect(typ).toBe('architekt'); // unverändert
    expect(s.gemeistertePaare).toContain('alchemist');
  });

  it('Gleichzeitigkeit: mehr wirksame Zündungen gewinnt', () => {
    const s = createEvolutionState();
    const f = finisherMit(['befehl', 'raum', 'zustand'], ['bombardement', 'sporenfeld', 'urteil']);
    f.zuendungen.sporenfeld = FINISHER_EFFECTIVE_USES_TO_HARDEN + 5; // Alchemist vorne
    expect(evolviere(s, kompassMit(['befehl', 'raum', 'zustand']), f)).toBe('alchemist');
    expect(s.gemeistertePaare.length).toBe(3);
    expect(istSystemformReif(s)).toBe(true);
  });

  it('Gleichzeitigkeit: bei Gleichstand entscheidet der Hauptbuild', () => {
    const s = createEvolutionState();
    const f = finisherMit(['befehl', 'raum', 'zustand'], ['bombardement', 'sporenfeld', 'urteil']); // alle gleich
    expect(evolviere(s, kompassMit(['befehl', 'raum', 'zustand']), f, 'zustand')).toBe('alchemist');
  });

  it('istSystemformReif erst ab zwei gemeisterten Paaren', () => {
    const s = createEvolutionState();
    evolviere(s, kompassMit(['befehl', 'raum']), finisherMit(['befehl', 'raum'], ['bombardement']));
    expect(istSystemformReif(s)).toBe(false);
  });
});
