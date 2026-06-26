import { describe, it, expect } from 'vitest';
import {
  ALLE_POLE, archetyp, primaerPol, slotPol, polKernKanal, KOMMANDER_MODE,
  type BuildFolge,
} from './buildModell';

// Reiner Kern für „eine Klasse (Kommander) + Build = Slot-Folge". Ersetzt die alte
// combatStyle/GIFT_BUILD-Gleichsetzung: der Build ist eine Folge aus drei Polen B/Z/R,
// und dieser Modul-Kern ist die EINZIGE Stelle, die Build-Sprache (Pol) auf die
// bestehende Evolution-Engine (BaseMode/Kanal) abbildet.
describe('Build-Modell (Pol / Slot-Folge / Brücke zur Evolution-Engine)', () => {
  it('kennt genau die drei Build-Pole Befehl/Zustand/Raum', () => {
    expect([...ALLE_POLE].sort()).toEqual(['befehl', 'raum', 'zustand']);
  });

  describe('archetyp — reine Diagonale (BBB/ZZZ/RRR)', () => {
    it('füllt alle drei Slots mit demselben Pol', () => {
      expect(archetyp('befehl')).toEqual(['befehl', 'befehl', 'befehl']);
      expect(archetyp('zustand')).toEqual(['zustand', 'zustand', 'zustand']);
      expect(archetyp('raum')).toEqual(['raum', 'raum', 'raum']);
    });
  });

  describe('primaerPol — Slot 1 bestimmt das Grundverhalten des Apparats', () => {
    it('liefert den ersten Slot', () => {
      expect(primaerPol(['zustand', 'befehl', 'raum'])).toBe('zustand');
      expect(primaerPol(archetyp('raum'))).toBe('raum');
    });
  });

  describe('slotPol — welcher Pol in Slot i (0..2) sitzt', () => {
    it('liest den Pol je Slot', () => {
      const f: BuildFolge = ['befehl', 'zustand', 'raum'];
      expect(slotPol(f, 0)).toBe('befehl');
      expect(slotPol(f, 1)).toBe('zustand');
      expect(slotPol(f, 2)).toBe('raum');
    });
  });

  it('KOMMANDER_MODE — es gibt nur EINE Klasse (Kommander = BaseMode "sniper"); jeder Build läuft auf ihr', () => {
    expect(KOMMANDER_MODE).toBe('sniper');
  });

  describe('polKernKanal — Build → Kommander-EIGENER Kanal (nicht der Kern anderer Klassen)', () => {
    it('alle drei Builds liegen auf der Kommander-Familie (sniper_*), NIE auf dot_core/aoe_core', () => {
      // Falle: Zustand→dot_core "fühlt sich natürlich an", ist aber der Kern der DoT-KLASSE.
      // Unter "immer Kommander" sind Z/R die dot-/aoe-ROUTEN DES KOMMANDERS.
      expect(polKernKanal('befehl')).toBe('sniper_core');
      expect(polKernKanal('zustand')).toBe('sniper_dot_aoe');
      expect(polKernKanal('raum')).toBe('sniper_aoe_dot');
    });
  });
});
