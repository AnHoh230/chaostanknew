import { describe, it, expect } from 'vitest';
import type { Pol } from './buildModell';
import { createKompassState, type KompassState } from './kompass';
import { createFinisherState, schmiede, type FinisherState } from './finisher';
import { createEvolutionState, type EvolutionState } from './evolution';
import { EDIKT_MAX_PULSES, EDIKT_DAUER_SECONDS, EDIKT_COOLDOWN_SECONDS } from './evolutionTuning';
import {
  fusionStufe, systemformReif, createEdiktState, ediktOffen, invoziere, tickEdikt,
} from './fusion';

const kompassMit = (level: Partial<Record<Pol, number>>): KompassState => {
  const k = createKompassState();
  for (const p of ['befehl', 'raum', 'zustand'] as Pol[]) {
    const l = level[p] ?? 0;
    k.pole[p].level = l;
    k.pole[p].reachedMax = l >= 5;
  }
  return k;
};
const evoMit = (...paare: ('architekt' | 'alchemist' | 'richter')[]): EvolutionState => {
  const e = createEvolutionState();
  e.gemeistertePaare = [...paare];
  if (paare[0]) e.typ = paare[0];
  return e;
};
const finisherMitSystembruch = (): FinisherState => {
  const f = createFinisherState();
  schmiede(f, ['befehl', 'raum', 'zustand'], ['systembruch']);
  return f;
};

describe('fusion — Stufen (Gate 7, Spec 5 §11)', () => {
  it('ohne gemeistertes Paar: keine', () => {
    expect(fusionStufe(createEvolutionState(), kompassMit({}), createFinisherState())).toBe('keine');
  });

  it('Paar (B+R) + dritter Pol (zustand) Level 1 → preview, Level 3 → phase', () => {
    const evo = evoMit('architekt'); // dritter Pol = zustand
    expect(fusionStufe(evo, kompassMit({ befehl: 5, raum: 5, zustand: 0 }), createFinisherState())).toBe('keine');
    expect(fusionStufe(evo, kompassMit({ befehl: 5, raum: 5, zustand: 1 }), createFinisherState())).toBe('preview');
    expect(fusionStufe(evo, kompassMit({ befehl: 5, raum: 5, zustand: 3 }), createFinisherState())).toBe('phase');
  });

  it('alle 3 gemaxt + Systembruch → systemform', () => {
    const evo = evoMit('architekt');
    const k = kompassMit({ befehl: 5, raum: 5, zustand: 5 });
    expect(systemformReif(k, finisherMitSystembruch())).toBe(true);
    expect(fusionStufe(evo, k, finisherMitSystembruch())).toBe('systemform');
    // ohne Systembruch nicht:
    expect(systemformReif(k, createFinisherState())).toBe(false);
  });
});

describe('fusion — System-Edikt (Spec 5 §11)', () => {
  it('invoziere öffnet nur bei zu + ohne Cooldown', () => {
    const s = createEdiktState();
    expect(invoziere(s)).toBe(true);
    expect(ediktOffen(s)).toBe(true);
    expect(invoziere(s)).toBe(false); // schon offen
  });

  it('schließt nach EDIKT_DAUER und setzt Cooldown; max EDIKT_MAX_PULSES je Fenster', () => {
    const s = createEdiktState();
    invoziere(s);
    const pulse = tickEdikt(s, 100); // ein großer Tick
    expect(pulse).toBe(EDIKT_MAX_PULSES);
    expect(ediktOffen(s)).toBe(false);
    expect(s.cd).toBeCloseTo(EDIKT_COOLDOWN_SECONDS, 6);
  });

  it('autoLoop öffnet nach Ablauf des Cooldowns erneut', () => {
    const s = createEdiktState();
    invoziere(s);
    tickEdikt(s, EDIKT_DAUER_SECONDS); // schließen → cd
    expect(ediktOffen(s)).toBe(false);
    tickEdikt(s, EDIKT_COOLDOWN_SECONDS, true); // Cooldown ab + autoLoop
    expect(ediktOffen(s)).toBe(true);
  });

  it('ohne autoLoop bleibt es nach Cooldown zu', () => {
    const s = createEdiktState();
    invoziere(s);
    tickEdikt(s, EDIKT_DAUER_SECONDS);
    tickEdikt(s, EDIKT_COOLDOWN_SECONDS, false);
    expect(ediktOffen(s)).toBe(false);
  });
});
