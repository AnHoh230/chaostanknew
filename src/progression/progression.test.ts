import { describe, it, expect } from 'vitest';
import { xpToNextLevel, unlockedMkForLevel, createProgression } from './progression';

describe('xpToNextLevel (Werte aus der Progressions-Datei)', () => {
  it('passt zur Tabelle', () => {
    expect(xpToNextLevel(1)).toBe(180);
    expect(xpToNextLevel(2)).toBe(350);
    expect(xpToNextLevel(3)).toBe(580);
    expect(xpToNextLevel(19)).toBe(7930);
  });
});

describe('unlockedMkForLevel (alle 2 Level eine Stufe)', () => {
  it('passt zur Tabelle', () => {
    expect(unlockedMkForLevel(1)).toBe(1);
    expect(unlockedMkForLevel(2)).toBe(1);
    expect(unlockedMkForLevel(3)).toBe(2);
    expect(unlockedMkForLevel(5)).toBe(3);
    expect(unlockedMkForLevel(9)).toBe(5);
    expect(unlockedMkForLevel(19)).toBe(10);
    expect(unlockedMkForLevel(20)).toBe(10);
  });
});

describe('createProgression', () => {
  it('steigt ein Level auf, wenn die EXP-Schwelle erreicht ist', () => {
    const p = createProgression();
    const info = p.addXp(180);
    expect(p.level).toBe(2);
    expect(p.xp).toBe(0);
    expect(info.gained).toBe(1);
  });

  it('mehrere Level auf einmal + meldet neue MK-Freischaltungen', () => {
    const p = createProgression();
    const info = p.addXp(180 + 350 + 10); // Level 1->3, Rest 10
    expect(p.level).toBe(3);
    expect(p.xp).toBe(10);
    expect(info.gained).toBe(2);
    expect(info.newMkUnlocks).toContain(2); // MK2 auf Level 3
  });

  it('überläuft am Max-Level nicht', () => {
    const p = createProgression();
    p.addXp(10_000_000);
    expect(p.level).toBe(20);
    expect(p.xpToNext()).toBe(0);
  });
});
