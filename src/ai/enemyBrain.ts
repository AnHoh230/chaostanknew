import { chooseAction } from './utility';
import type { AiAction, AiWorldView, TraitProfile } from './aiTypes';

export interface EnemyBrain {
  /** Pro Frame aufrufen; entscheidet nur im Takt neu, liefert die aktuelle Aktion. */
  update(w: AiWorldView, simDt: number): AiAction;
  current(): AiAction;
}

export interface BrainOptions {
  decideInterval?: number; // Sekunden zwischen Neu-Entscheidungen (Default 0.5)
  noiseAmp?: number; // Seed-Rauschen bei der Wahl (Default 0.05)
}

/**
 * Hält die Entscheidungs-Taktung: nicht jeder Frame wird neu gewählt (sonst
 * zappelt der Gegner), sondern alle decideInterval Sekunden. Bewegung dazwischen
 * folgt der zuletzt gewählten Aktion (Geometrie macht der Aufrufer).
 */
export function createEnemyBrain(
  traits: TraitProfile,
  rng: () => number,
  opts: BrainOptions = {},
): EnemyBrain {
  const interval = opts.decideInterval ?? 0.5;
  const noiseAmp = opts.noiseAmp ?? 0.05;
  let acc = interval; // erste update() entscheidet sofort
  let action: AiAction = 'Ziel_wählen';

  function update(w: AiWorldView, simDt: number): AiAction {
    acc += simDt;
    if (acc >= interval) {
      acc = 0;
      action = chooseAction(traits, w, rng, noiseAmp);
    }
    return action;
  }

  return { update, current: () => action };
}
