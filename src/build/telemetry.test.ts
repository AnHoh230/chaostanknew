import { describe, it, expect } from 'vitest';
import {
  createRunTelemetry, tickTelemetry, markMeilenstein, zaehleFinisher, avgBoardScore,
} from './telemetry';
import { effektiverImpuls } from './evolutionTuning';

describe('telemetry (Gate 8, Spec 5 §12)', () => {
  it('startet leer (alle Meilensteine null, Zähler 0)', () => {
    const t = createRunTelemetry();
    expect(t.meilenstein.kompassFrei).toBeNull();
    expect(t.ewmaRaw).toBe(0);
    expect(t.finisherZuendungen).toBe(0);
  });

  it('EWMA konvergiert gegen die konstante Roh-Rate (30/min)', () => {
    const t = createRunTelemetry();
    for (let i = 0; i < 600; i++) tickTelemetry(t, 1, 0.5); // 0,5 Impuls/s = 30/min
    expect(t.ewmaRaw).toBeGreaterThan(29);
    expect(t.ewmaRaw).toBeLessThan(31);
    expect(t.rawGesamt).toBeCloseTo(300, 0);
  });

  it('die gemessene EWMA füttert den normalisiert-Modus korrekt', () => {
    const t = createRunTelemetry();
    for (let i = 0; i < 600; i++) tickTelemetry(t, 1, 1); // 60/min
    // bei ~60/min → Multiplikator clamp(30/60)=0.5 → roher Impuls 10 wird zu ~5
    expect(effektiverImpuls(10, t.ewmaRaw, 'normalisiert')).toBeCloseTo(5, 0);
    expect(effektiverImpuls(10, t.ewmaRaw, 'roh')).toBe(10);
  });

  it('markMeilenstein ist idempotent (erste Erreichung zählt)', () => {
    const t = createRunTelemetry();
    tickTelemetry(t, 5, 0);
    markMeilenstein(t, 'kompassFrei');
    const erst = t.meilenstein.kompassFrei;
    tickTelemetry(t, 5, 0);
    markMeilenstein(t, 'kompassFrei'); // zweiter Versuch ändert nichts
    expect(t.meilenstein.kompassFrei).toBe(erst);
    expect(erst).toBeCloseTo(5, 1);
  });

  it('zählt Finisher-Zündungen (gesamt + wirksam) und Ø-BoardScore', () => {
    const t = createRunTelemetry();
    zaehleFinisher(t, true, 12);
    zaehleFinisher(t, false, 0); // leer → zählt nicht für Ø
    zaehleFinisher(t, true, 20);
    expect(t.finisherZuendungen).toBe(3);
    expect(t.finisherWirksam).toBe(2);
    expect(avgBoardScore(t)).toBeCloseTo(16, 6); // (12+20)/2
  });
});
