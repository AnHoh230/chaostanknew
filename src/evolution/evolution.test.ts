import { describe, it, expect } from 'vitest';
import { createEvolutionState, applyImpulse, tryTriggerEvolution, NOISE_FLOOR } from './evolution';

const FLOW = (now: number, dom?: string) => ({
  now,
  flow: 'flow',
  minSecondsBeforeFirst: 20,
  minSecondsBetween: 25,
  dominantChannel: dom as never,
});

describe('applyImpulse', () => {
  it('verteilt Fortschritt nach Kompassgewicht; unter Noise-Floor nichts', () => {
    const s = createEvolutionState('sniper');
    // Kompass stark auf AoE → sniper_aoe_dot wächst, Kern (0.1 < Floor) nicht.
    applyImpulse(s, 10, { weights: { sniper: 0.1, aoe: 0.7, dot: 0.2 }, profile: 'LOOP_TEST', flow: 1, repetition: 1 });
    expect(s.progressByChannel.sniper_aoe_dot).toBeCloseTo(7, 5);
    expect(s.progressByChannel.sniper_dot_aoe).toBeCloseTo(2, 5);
    expect(s.progressByChannel.sniper_core).toBe(0); // 0.1 < 0.2 Floor
    expect(NOISE_FLOOR).toBe(0.2);
  });

  it('kein Fortschritt bei flow=0 (Bruch/Respawn)', () => {
    const s = createEvolutionState('sniper');
    applyImpulse(s, 10, { weights: { sniper: 1, aoe: 0, dot: 0 }, profile: 'LOOP_TEST', flow: 0, repetition: 1 });
    expect(s.progressByChannel.sniper_core).toBe(0);
  });

  it('merkt Evolution vor, sobald die Schwelle erreicht ist', () => {
    const s = createEvolutionState('sniper');
    // Kern, voll auf Sniper. LOOP_TEST Stufe-1-Schwelle = 25.
    applyImpulse(s, 25, { weights: { sniper: 1, aoe: 0, dot: 0 }, profile: 'LOOP_TEST', flow: 1, repetition: 1 });
    expect(s.pendingEvolution).toEqual({ channelId: 'sniper_core', stage: 1 });
    expect(s.unlockedStagesByChannel.sniper_core).toBe(0); // noch nicht ausgelöst
  });
});

describe('tryTriggerEvolution', () => {
  it('löst im sicheren Fenster aus und räumt das Pending weg', () => {
    const s = createEvolutionState('sniper');
    applyImpulse(s, 25, { weights: { sniper: 1, aoe: 0, dot: 0 }, profile: 'LOOP_TEST', flow: 1, repetition: 1 });
    const ev = tryTriggerEvolution(s, FLOW(30));
    expect(ev).toEqual({ channelId: 'sniper_core', stage: 1 });
    expect(s.unlockedStagesByChannel.sniper_core).toBe(1);
    expect(s.pendingEvolution).toBeUndefined();
  });

  it('löst NICHT aus bei Bruch/Respawn oder zu früh', () => {
    const s = createEvolutionState('sniper');
    applyImpulse(s, 25, { weights: { sniper: 1, aoe: 0, dot: 0 }, profile: 'LOOP_TEST', flow: 1, repetition: 1 });
    expect(tryTriggerEvolution(s, { ...FLOW(30), flow: 'broken' })).toBeNull();
    expect(tryTriggerEvolution(s, FLOW(10))).toBeNull(); // vor minSecondsBeforeFirst
    expect(s.pendingEvolution).toBeDefined(); // bleibt vorgemerkt
  });

  it('Routen brauchen Dominanz, Kern nicht', () => {
    const s = createEvolutionState('sniper');
    // Route sniper_aoe_dot auf Schwelle bringen.
    applyImpulse(s, 25, { weights: { sniper: 0, aoe: 1, dot: 0 }, profile: 'LOOP_TEST', flow: 1, repetition: 1 });
    // anderer Kanal dominant → Route darf nicht auslösen
    expect(tryTriggerEvolution(s, FLOW(30, 'sniper_dot_aoe'))).toBeNull();
    // eigener Kanal dominant → löst aus
    expect(tryTriggerEvolution(s, FLOW(30, 'sniper_aoe_dot'))).toEqual({ channelId: 'sniper_aoe_dot', stage: 1 });
  });
});
