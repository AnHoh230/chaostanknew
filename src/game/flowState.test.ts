import { describe, it, expect } from 'vitest';
import { computeFlowState, isDeathloop, pruneDeathTimes, DEFAULT_FLOW_CONFIG } from './flowState';

describe('computeFlowState', () => {
  it('lebend, lange kein Tod, nach Schonfrist → flow', () => {
    const s = computeFlowState({ alive: true, now: 100, lastRespawnAt: 0, deathTimes: [] });
    expect(s).toBe('flow');
  });

  it('innerhalb der Respawn-Schonfrist → respawn', () => {
    const s = computeFlowState({ alive: true, now: 31, lastRespawnAt: 30, deathTimes: [30] });
    expect(s).toBe('respawn'); // 1 s nach Respawn (< 3 s Grace), nur 1 Tod → kein Loop
  });

  it('im Sterbe-Frame (alive=false) → broken', () => {
    const s = computeFlowState({ alive: false, now: 50, lastRespawnAt: 0, deathTimes: [] });
    expect(s).toBe('broken');
  });

  it('2 Tode in 20 s → broken (auch lebend nach Respawn)', () => {
    const s = computeFlowState({ alive: true, now: 40, lastRespawnAt: 40, deathTimes: [28, 40] });
    expect(s).toBe('broken');
  });

  it('3 Tode in 45 s → broken', () => {
    const s = computeFlowState({ alive: true, now: 50, lastRespawnAt: 50, deathTimes: [10, 30, 50] });
    expect(s).toBe('broken');
  });

  it('2 Tode aber > 20 s auseinander → kein Loop (flow)', () => {
    const s = computeFlowState({ alive: true, now: 100, lastRespawnAt: 70, deathTimes: [70, 95] });
    // 95 und 70 liegen 25 s auseinander → keine 2-in-20; nur 2 Tode, kein 3-in-45 relevant; nach Grace
    expect(s).toBe('flow');
  });

  it('nach dem Abklingen der Tode kehrt der Zustand zu flow zurück', () => {
    const deaths = [10, 12]; // Loop zum Zeitpunkt ~12
    expect(isDeathloop(deaths, 13, DEFAULT_FLOW_CONFIG)).toBe(true);
    expect(isDeathloop(deaths, 60, DEFAULT_FLOW_CONFIG)).toBe(false); // beide > 45 s her
  });
});

describe('pruneDeathTimes', () => {
  it('wirft Tode jenseits des größten Fensters weg', () => {
    const kept = pruneDeathTimes([1, 5, 50], 60, DEFAULT_FLOW_CONFIG); // Horizont 45 s → nur t >= 15 bleibt
    expect(kept).toEqual([50]);
  });
});
