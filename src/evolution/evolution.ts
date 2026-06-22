/**
 * Schicht 2 — reine Evolutions-Pipeline: Kampf-Impulse → gewichteter Fortschritt je Kanal →
 * Schwelle erreicht → vorgemerkte Evolution → in einem sicheren Fenster freischalten.
 *
 * Kompass = Absicht: er lenkt nur, in WELCHEN Kanal neue Impulse fließen (channelWeight).
 * Diese Pipeline berührt den Director NICHT — Director liest später eigenes beobachtetes
 * Verhalten (Schicht 4). Reine Funktionen, kein Engine-Bezug (TDD).
 */
import {
  ALL_CHANNELS,
  channelsForBaseMode,
  channelWeight,
  type BaseMode,
  type CompassWeights,
  type EvolutionChannelId,
} from './channels';
import { thresholdForStage, type TuningProfile } from './profiles';

/** Gewichte unter diesem Wert bekommen keinen Fortschritt (verhindert, dass alle Routen wachsen). */
export const NOISE_FLOOR = 0.2;

export interface EvolutionState {
  baseMode: BaseMode;
  progressByChannel: Record<EvolutionChannelId, number>;
  unlockedStagesByChannel: Record<EvolutionChannelId, number>;
  pendingEvolution?: { channelId: EvolutionChannelId; stage: number };
  lastEvolutionAt: number; // s
}

function zeroByChannel(): Record<EvolutionChannelId, number> {
  const r = {} as Record<EvolutionChannelId, number>;
  for (const id of ALL_CHANNELS) r[id] = 0;
  return r;
}

export function createEvolutionState(base: BaseMode): EvolutionState {
  return {
    baseMode: base,
    progressByChannel: zeroByChannel(),
    unlockedStagesByChannel: zeroByChannel(),
    lastEvolutionAt: -Infinity,
  };
}

export interface ImpulseContext {
  weights: CompassWeights; // geglätteter Kompass
  profile: TuningProfile;
  flow: number; // flowMultiplier (0 = Bruch/Respawn/Leerlauf → kein Fortschritt)
  repetition: number; // repetitionControl (dämpft Spam)
  routeMatch?: (ch: EvolutionChannelId) => number; // Passung Impuls↔Kanal, Default 1
}

/**
 * Einen Kampf-Impuls auf die aktiven Kanäle verteilen. gain = basePoints × Kompassgewicht ×
 * flow × repetition × routeMatch. Erreicht ein Kanal die nächste Stufenschwelle, wird sie
 * VORGEMERKT (nicht sofort ausgelöst — das macht tryTriggerEvolution im sicheren Fenster).
 */
export function applyImpulse(state: EvolutionState, basePoints: number, ctx: ImpulseContext): void {
  if (ctx.flow <= 0 || basePoints <= 0) return;
  for (const ch of channelsForBaseMode(state.baseMode)) {
    const w = channelWeight(ch, ctx.weights);
    if (w < NOISE_FLOOR) continue;
    const rm = ctx.routeMatch ? ctx.routeMatch(ch) : 1;
    const gain = basePoints * w * ctx.flow * ctx.repetition * rm;
    if (gain <= 0) continue;
    state.progressByChannel[ch] += gain;
    if (!state.pendingEvolution) {
      const next = state.unlockedStagesByChannel[ch] + 1;
      const thr = thresholdForStage(ctx.profile, next);
      if (thr != null && state.progressByChannel[ch] >= thr) {
        state.pendingEvolution = { channelId: ch, stage: next };
      }
    }
  }
}

export interface SafeWindow {
  now: number;
  flow: string; // 'flow' | 'respawn' | 'broken' — Evolution nur bei 'flow'
  minSecondsBeforeFirst: number;
  minSecondsBetween: number;
  dominantChannel?: EvolutionChannelId; // im Dominanzfenster stärkster Kanal (Routen müssen dominant sein)
}

/**
 * Eine vorgemerkte Evolution auslösen, wenn das Fenster sicher ist: Spieler im Flow, genug Zeit
 * seit Start/letzter Evolution, und (für Routen) der Kanal war zuletzt dominant — sonst „Kompass
 * kurz angetippt → falsche Route evolved". Kern-Kanäle brauchen die Dominanz nicht so streng.
 * Gibt die freigeschaltete Evolution zurück (oder null).
 */
export function tryTriggerEvolution(
  state: EvolutionState,
  sw: SafeWindow,
): { channelId: EvolutionChannelId; stage: number } | null {
  const ev = state.pendingEvolution;
  if (!ev) return null;
  if (sw.flow !== 'flow') return null;
  if (sw.now < sw.minSecondsBeforeFirst) return null;
  if (sw.now - state.lastEvolutionAt < sw.minSecondsBetween) return null;
  const isCore = ev.channelId.endsWith('_core');
  if (!isCore && sw.dominantChannel != null && sw.dominantChannel !== ev.channelId) return null;
  state.unlockedStagesByChannel[ev.channelId] = ev.stage;
  state.lastEvolutionAt = sw.now;
  state.pendingEvolution = undefined;
  return ev;
}
