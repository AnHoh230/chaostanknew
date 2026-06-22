import { describe, it, expect } from 'vitest';
import { createEvolutionState, gainProgress, tryTriggerEvolution, emergingChannel } from './evolution';

const FLOW = (now: number, dom?: string) => ({
  now,
  flow: 'flow',
  minSecondsBeforeFirst: 20,
  minSecondsBetween: 25,
  dominantChannel: dom as never,
});

describe('gainProgress', () => {
  it('voller, direkter Fortschritt in den gewählten Kanal (keine Aufteilung)', () => {
    const s = createEvolutionState('sniper');
    gainProgress(s, 'sniper_core', 10, 'LOOP_TEST');
    expect(s.progressByChannel.sniper_core).toBe(10);
    expect(s.progressByChannel.sniper_aoe_dot).toBe(0);
  });

  it('merkt Evolution vor, sobald die Schwelle erreicht ist (LOOP_TEST Stufe 1 = 25)', () => {
    const s = createEvolutionState('sniper');
    gainProgress(s, 'sniper_core', 25, 'LOOP_TEST');
    expect(s.pendingEvolution).toEqual({ channelId: 'sniper_core', stage: 1 });
    expect(s.unlockedStagesByChannel.sniper_core).toBe(0); // noch nicht ausgelöst
  });
});

describe('emergingChannel', () => {
  it('liefert den Kanal, auf den der Kompass am stärksten zeigt', () => {
    const s = createEvolutionState('sniper');
    expect(emergingChannel(s, { sniper: 0.1, aoe: 0.7, dot: 0.2 })).toBe('sniper_aoe_dot');
    expect(emergingChannel(s, { sniper: 0.8, aoe: 0.1, dot: 0.1 })).toBe('sniper_core');
  });
});

describe('tryTriggerEvolution', () => {
  it('löst im sicheren Fenster aus und räumt das Pending weg', () => {
    const s = createEvolutionState('sniper');
    gainProgress(s, 'sniper_core', 25, 'LOOP_TEST');
    const ev = tryTriggerEvolution(s, FLOW(30));
    expect(ev).toEqual({ channelId: 'sniper_core', stage: 1 });
    expect(s.unlockedStagesByChannel.sniper_core).toBe(1);
    expect(s.pendingEvolution).toBeUndefined();
  });

  it('löst NICHT aus bei Bruch/Respawn oder zu früh', () => {
    const s = createEvolutionState('sniper');
    gainProgress(s, 'sniper_core', 25, 'LOOP_TEST');
    expect(tryTriggerEvolution(s, { ...FLOW(30), flow: 'broken' })).toBeNull();
    expect(tryTriggerEvolution(s, FLOW(10))).toBeNull(); // vor minSecondsBeforeFirst
    expect(s.pendingEvolution).toBeDefined(); // bleibt vorgemerkt
  });

  it('Routen brauchen Dominanz, Kern nicht', () => {
    const s = createEvolutionState('sniper');
    gainProgress(s, 'sniper_aoe_dot', 25, 'LOOP_TEST');
    expect(tryTriggerEvolution(s, FLOW(30, 'sniper_dot_aoe'))).toBeNull();
    expect(tryTriggerEvolution(s, FLOW(30, 'sniper_aoe_dot'))).toEqual({ channelId: 'sniper_aoe_dot', stage: 1 });
  });
});
