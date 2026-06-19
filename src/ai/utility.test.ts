import { describe, it, expect } from 'vitest';
import { chooseAction, scoreAction } from './utility';
import { MOTIVE_PRESETS } from './motives';
import type { AiWorldView } from './aiTypes';

const rng = () => 0.5; // ungenutzt bei noiseAmp=0

function world(p: Partial<AiWorldView>): AiWorldView {
  return {
    selfHpFrac: 1,
    targetVisible: true,
    distance: 8,
    homeDistance: 0,
    groupSize: 0,
    lootValue: 0.3,
    ...p,
  };
}

describe('chooseAction (Motiv → Verhalten)', () => {
  it('Aasgeier bei voller HP nahe am Ziel → annähern', () => {
    const a = chooseAction(MOTIVE_PRESETS.aasgeier!, world({ selfHpFrac: 1, distance: 6 }), rng);
    expect(a).toBe('annähern');
  });

  it('Angsthase verletzt + Ziel nah → fliehen', () => {
    const a = chooseAction(MOTIVE_PRESETS.angsthase!, world({ selfHpFrac: 0.2, distance: 6 }), rng);
    expect(a).toBe('fliehen');
  });

  it('Platzhirsch weit vom Revier, kein Ziel → Revier_halten', () => {
    const a = chooseAction(
      MOTIVE_PRESETS.platzhirsch!,
      world({ targetVisible: false, distance: 999, homeDistance: 40 }),
      rng,
    );
    expect(a).toBe('Revier_halten');
  });
});

describe('scoreAction', () => {
  it('einkaufen ist im Slice immer 0 (kein Shop)', () => {
    expect(scoreAction('einkaufen', MOTIVE_PRESETS.schatzjaeger!, world({}))).toBe(0);
  });

  it('fliehen steigt mit sinkender HP (mehr Gefahr)', () => {
    const t = MOTIVE_PRESETS.angsthase!;
    const gesund = scoreAction('fliehen', t, world({ selfHpFrac: 0.9 }));
    const verletzt = scoreAction('fliehen', t, world({ selfHpFrac: 0.1 }));
    expect(verletzt).toBeGreaterThan(gesund);
  });
});
