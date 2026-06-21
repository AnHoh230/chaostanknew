import { describe, it, expect } from 'vitest';
import { createDoctrineDirector } from './doctrineDirector';
import { DOCTRINES } from './doctrineConfig';
import { emptyProfile, type PlayerStyleProfile } from './styleProfile';

const empty = emptyProfile();
const strongTurret: PlayerStyleProfile = { ...empty, autoTurretDamageRatio: 0.6 };
const strongStationary: PlayerStyleProfile = { ...empty, stationaryRatio: 0.7, timeInSameArea: 50 };

function freshActive() {
  const d = createDoctrineDirector(DOCTRINES);
  for (let i = 0; i < 3; i++) d.evaluate(strongTurret); // 25 → 50 → 75
  return d;
}

describe('DoctrineDirector', () => {
  it('starker Stil über 3 Pulse → Doktrin wird aktiv', () => {
    const d = freshActive();
    const s = d.states().find((x) => x.id === 'stoerkrieg')!;
    expect(s.heat).toBe(75);
    expect(s.stage).toBe('active');
    expect(d.activeId()).toBe('stoerkrieg');
  });

  it('immer höchstens EINE Doktrin aktiv (Commitment deckelt die anderen)', () => {
    const d = freshActive(); // stoerkrieg aktiv, commitmentLeft=2 (ohne tick bleibt es)
    for (let i = 0; i < 4; i++) d.evaluate(strongStationary); // Belagerung-Hitze hoch
    const bel = d.states().find((x) => x.id === 'belagerung')!;
    expect(bel.heat).toBeGreaterThanOrEqual(75);
    expect(bel.stage).toBe('preparing'); // gedeckelt, NICHT aktiv
    expect(d.activeId()).toBe('stoerkrieg');
    expect(d.states().filter((s) => s.stage === 'active' || s.stage === 'escalated')).toHaveLength(1);
  });

  it('Commitment hält die Doktrin trotz Stilwechsel ≥2 Pulse aktiv', () => {
    const d = freshActive();
    d.evaluate(empty); d.tickCommitment(); // Puls 1 ohne Turret
    expect(d.states().find((s) => s.id === 'stoerkrieg')!.stage).toBe('active');
    d.evaluate(empty); d.tickCommitment(); // Puls 2 → Commitment läuft ab
    d.evaluate(empty); // Neubewertung
    expect(d.states().find((s) => s.id === 'stoerkrieg')!.stage).not.toBe('active');
    expect(d.activeId()).toBeNull();
  });

  it('Sabotage senkt Heat (-30) und gibt die Festlegung frei', () => {
    const d = freshActive();
    d.sabotage('stoerkrieg');
    const s = d.states().find((x) => x.id === 'stoerkrieg')!;
    expect(s.heat).toBe(45);
    expect(s.stage).not.toBe('active');
    expect(d.activeId()).toBeNull();
  });

  it('Provokation hebt die Heat (+25)', () => {
    const d = createDoctrineDirector(DOCTRINES);
    d.evaluate(empty);
    d.provoke('nebel');
    expect(d.states().find((x) => x.id === 'nebel')!.heat).toBe(25);
  });
});
