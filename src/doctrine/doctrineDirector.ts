import type { PlayerStyleProfile } from './styleProfile';
import {
  type DoctrineConfig, type DoctrineTrigger,
  HEAT_STRONG, HEAT_MID, HEAT_LIGHT, DECAY, BANDS, stufeFromHeat,
} from './doctrineConfig';

/** Zustand einer Richtung: unabhängiger Heat + abgeleitete Stufe (0..3). */
export interface DoctrineState {
  id: string;
  heat: number; // 0..100
  stufe: number; // 0..3 aus den Heat-Bändern
}

/**
 * Live-stellbare Heat-Parameter. Spielcode reicht Getter herein (aus der Tunables-Registry),
 * sodass jeder Wert per Regler korrigierbar bleibt. Tests nutzen die Konstanten-Defaults.
 */
export interface DoctrineTuning {
  heatStrong(): number;
  heatMid(): number;
  heatLight(): number;
  decay(): number; // Betrag der Abkühlung/Puls für ungenutzte Richtungen
  bands(): readonly number[]; // 3 Heat-Schwellen für Stufe 1/2/3
}

export interface DoctrineDirector {
  /** Ein Frontlage-Puls: jede Richtung heizt (bei Signal) oder kühlt (asymmetrisch). */
  evaluate(profile: PlayerStyleProfile): void;
  states(): readonly DoctrineState[];
}

const DEFAULT_TUNING: DoctrineTuning = {
  heatStrong: () => HEAT_STRONG,
  heatMid: () => HEAT_MID,
  heatLight: () => HEAT_LIGHT,
  decay: () => DECAY,
  bands: () => BANDS,
};

const clamp = (v: number): number => (v < 0 ? 0 : v > 100 ? 100 : v);

/** Stärke des Stil-Signals einer Richtung: 0 keins, 1 leicht, 2 mittel, 3 stark. */
function signalLevel(profile: PlayerStyleProfile, triggers: DoctrineTrigger[]): number {
  let level = 0;
  for (const t of triggers) {
    const v = profile[t.field];
    if (v >= t.strong) level = Math.max(level, 3);
    else if (v >= t.mid) level = Math.max(level, 2);
    else if (v >= t.mid * 0.5) level = Math.max(level, 1);
  }
  return level;
}

export function createDoctrineDirector(
  configs: DoctrineConfig[],
  tuning: DoctrineTuning = DEFAULT_TUNING,
): DoctrineDirector {
  const byId = new Map(configs.map((c) => [c.id, c]));
  const st: DoctrineState[] = configs.map((c) => ({ id: c.id, heat: 0, stufe: 0 }));

  return {
    evaluate(profile) {
      const bands = tuning.bands();
      for (const s of st) {
        const lvl = signalLevel(profile, byId.get(s.id)!.triggers);
        // Asymmetrie: genutzte Richtung heizt schnell, ungenutzte kühlt nur langsam.
        const delta =
          lvl === 3 ? tuning.heatStrong()
          : lvl === 2 ? tuning.heatMid()
          : lvl === 1 ? tuning.heatLight()
          : -tuning.decay();
        s.heat = clamp(s.heat + delta);
        s.stufe = stufeFromHeat(s.heat, bands);
      }
    },
    states: () => st.map((s) => ({ ...s })),
  };
}
