import { describe, it, expect } from 'vitest';
import {
  channelsForBaseMode,
  channelWeight,
  CHANNEL_DISPLAY,
  type EvolutionChannelId,
} from './channels';

describe('channelsForBaseMode', () => {
  it('liefert Kern + zwei Routen je Grundmodus', () => {
    expect(channelsForBaseMode('sniper')).toEqual(['sniper_core', 'sniper_aoe_dot', 'sniper_dot_aoe']);
    expect(channelsForBaseMode('aoe')).toEqual(['aoe_core', 'aoe_sniper_dot', 'aoe_dot_sniper']);
    expect(channelsForBaseMode('dot')).toEqual(['dot_core', 'dot_sniper_aoe', 'dot_aoe_sniper']);
  });
});

describe('channelWeight', () => {
  const w = { sniper: 0.1, aoe: 0.7, dot: 0.2 };

  it('Kern hängt am eigenen Pol', () => {
    expect(channelWeight('sniper_core', w)).toBe(0.1);
    expect(channelWeight('aoe_core', w)).toBe(0.7);
    expect(channelWeight('dot_core', w)).toBe(0.2);
  });

  it('Route hängt am Fremd-Pol (Mittelstil der Route)', () => {
    expect(channelWeight('sniper_aoe_dot', w)).toBe(0.7); // Richtung AoE
    expect(channelWeight('sniper_dot_aoe', w)).toBe(0.2); // Richtung DoT
    expect(channelWeight('aoe_sniper_dot', w)).toBe(0.1); // Richtung Sniper
    expect(channelWeight('dot_aoe_sniper', w)).toBe(0.7); // Richtung AoE
  });

  it('Sniper-Spieler Richtung AoE speist genau sniper_aoe_dot, nicht den Kern', () => {
    expect(channelWeight('sniper_aoe_dot', w)).toBeGreaterThan(channelWeight('sniper_core', w));
  });
});

describe('CHANNEL_DISPLAY', () => {
  it('hat für jeden der 9 Kanäle einen Lore-Namen', () => {
    const ids: EvolutionChannelId[] = [
      'sniper_core', 'sniper_aoe_dot', 'sniper_dot_aoe',
      'aoe_core', 'aoe_sniper_dot', 'aoe_dot_sniper',
      'dot_core', 'dot_sniper_aoe', 'dot_aoe_sniper',
    ];
    for (const id of ids) {
      expect(CHANNEL_DISPLAY[id].displayName.length).toBeGreaterThan(0);
      expect(CHANNEL_DISPLAY[id].shortText.length).toBeGreaterThan(0);
    }
  });
});
