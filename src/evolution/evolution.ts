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

/**
 * Reibungslos: ein Kampf-Impuls fließt VOLL und DIREKT in den Kanal, auf den der Kompass zeigt
 * (der aktive Kanal). Keine Aufteilung, kein Noise-Floor, keine Wiederholungs-/Wackel-Dämpfung —
 * wohin der Spieler entwickeln will, dahin entwickelt er sich, jede Richtung gleich schnell.
 * Erreicht der Kanal die nächste Stufenschwelle, wird sie VORGEMERKT (Auslösen erst im sicheren
 * Fenster über tryTriggerEvolution).
 */
export function gainProgress(
  state: EvolutionState,
  channel: EvolutionChannelId,
  points: number,
  profile: TuningProfile,
): void {
  if (points <= 0) return;
  state.progressByChannel[channel] += points;
  if (!state.pendingEvolution) {
    const next = state.unlockedStagesByChannel[channel] + 1;
    const thr = thresholdForStage(profile, next);
    if (thr != null && state.progressByChannel[channel] >= thr) {
      state.pendingEvolution = { channelId: channel, stage: next };
    }
  }
}

/** Die „entstehende Form": der Kanal des Grundmodus, auf den der Kompass aktuell am stärksten zeigt. */
export function emergingChannel(state: EvolutionState, weights: CompassWeights): EvolutionChannelId {
  const chans = channelsForBaseMode(state.baseMode);
  let best = chans[0]!;
  let bestW = -1;
  for (const ch of chans) {
    const w = channelWeight(ch, weights);
    if (w > bestW) { bestW = w; best = ch; }
  }
  return best;
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
