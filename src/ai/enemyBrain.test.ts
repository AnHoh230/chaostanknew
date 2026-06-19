import { describe, it, expect } from 'vitest';
import { createEnemyBrain } from './enemyBrain';
import { MOTIVE_PRESETS } from './motives';
import type { AiWorldView } from './aiTypes';

const rng = () => 0.5;
const base: AiWorldView = {
  selfHpFrac: 1, targetVisible: true, distance: 6, homeDistance: 0, groupSize: 0, lootValue: 0.3,
};

describe('createEnemyBrain', () => {
  it('entscheidet sofort bei der ersten update()', () => {
    const brain = createEnemyBrain(MOTIVE_PRESETS.aasgeier!, rng, { noiseAmp: 0 });
    expect(brain.update(base, 0.016)).toBe('annähern');
  });

  it('entscheidet innerhalb des Intervalls NICHT neu (kein Zappeln)', () => {
    const brain = createEnemyBrain(MOTIVE_PRESETS.aasgeier!, rng, { decideInterval: 0.5, noiseAmp: 0 });
    brain.update(base, 0.016); // -> annähern
    // Welt kippt (verletzt + Ziel nah), aber noch im selben Takt:
    const a = brain.update({ ...base, selfHpFrac: 0.1 }, 0.1);
    expect(a).toBe('annähern');
    expect(brain.current()).toBe('annähern');
  });

  it('entscheidet nach Ablauf des Intervalls neu', () => {
    const brain = createEnemyBrain(MOTIVE_PRESETS.angsthase!, rng, { decideInterval: 0.5, noiseAmp: 0 });
    brain.update(base, 0.016); // gesund -> nicht fliehen
    const a = brain.update({ ...base, selfHpFrac: 0.1, distance: 6 }, 0.6); // Intervall um
    expect(a).toBe('fliehen');
  });
});
