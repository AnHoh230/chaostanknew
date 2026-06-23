import { describe, it, expect } from 'vitest';
import { enemyRelative } from './enemyRel';

describe('enemyRelative', () => {
  it('Davonfahren: Gegner liegen hinten, keiner in Reichweite', () => {
    // Spieler fährt nach +x; Gegner alle bei kleinerem x (hinter ihm), weit weg.
    const enemies = [{ x: -50, z: 0 }, { x: -80, z: 10 }, { x: -120, z: -5 }];
    const r = enemyRelative(100, 0, 12, 0, enemies, 28);
    expect(r.back).toBe(3);
    expect(r.front).toBe(0);
    expect(r.inRange).toBe(0);
  });

  it('Hineinfahren: Gegner vor dem Spieler werden als front gezählt', () => {
    const enemies = [{ x: 40, z: 0 }, { x: 60, z: 5 }]; // vor dem nach +x fahrenden Spieler
    const r = enemyRelative(0, 0, 10, 0, enemies, 28);
    expect(r.front).toBe(2);
    expect(r.back).toBe(0);
  });

  it('Stehen: keine Fahrtrichtung → front/side/back = 0, aber Nahbereich/Reichweite zählen', () => {
    const enemies = [{ x: 10, z: 0 }, { x: 0, z: 20 }, { x: -15, z: -15 }];
    const r = enemyRelative(0, 0, 0, 0, enemies, 28);
    expect(r.front).toBe(0);
    expect(r.side).toBe(0);
    expect(r.back).toBe(0);
    expect(r.near).toBe(3); // alle < 50
    expect(r.inRange).toBe(3); // alle < 28 (10, 20, 21.2)
  });

  it('nearest = Abstand des nächsten Gegners, −1 ohne Gegner', () => {
    expect(enemyRelative(0, 0, 0, 0, [], 28).nearest).toBe(-1);
    expect(enemyRelative(0, 0, 0, 0, [{ x: 30, z: 40 }], 28).nearest).toBe(50);
  });
});
