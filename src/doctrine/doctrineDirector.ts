import type { PlayerStyleProfile } from './styleProfile';
import {
  type DoctrineConfig, type DoctrineStage, type DoctrineTrigger,
  HEAT_STRONG, HEAT_MID, HEAT_LIGHT, HEAT_DECAY, SABOTAGE, PROVOKE, COMMITMENT,
  ACTIVE, STAGE_ORDER, stageFromHeat,
} from './doctrineConfig';

export interface DoctrineState {
  id: string;
  heat: number; // 0..100
  stage: DoctrineStage;
  commitmentLeft: number; // Pulse, die diese Doktrin noch festgelegt aktiv bleibt
  productionLevel: number; // 0..3 (aus der Stufe abgeleitet)
  timesActivated: number;
}

export interface DoctrineDirector {
  evaluate(profile: PlayerStyleProfile): void;
  tickCommitment(): void;
  sabotage(id: string): void;
  provoke(id: string): void;
  states(): readonly DoctrineState[];
  activeId(): string | null;
}

const clamp = (v: number): number => (v < 0 ? 0 : v > 100 ? 100 : v);
const stageRank = (s: DoctrineStage): number => STAGE_ORDER.indexOf(s);
const maxStage = (a: DoctrineStage, b: DoctrineStage): DoctrineStage =>
  stageRank(a) >= stageRank(b) ? a : b;
const capStage = (s: DoctrineStage, max: DoctrineStage): DoctrineStage =>
  stageRank(s) <= stageRank(max) ? s : max;

function prodFromStage(s: DoctrineStage): number {
  switch (s) {
    case 'escalated': return 3;
    case 'active': return 2;
    case 'preparing': return 1;
    default: return 0;
  }
}

/** Heat-Zuwachs aus dem stärksten passenden Trigger (Spec §7.1). */
function heatDelta(profile: PlayerStyleProfile, triggers: DoctrineTrigger[]): number {
  let level = 0; // 0 keine, 1 leicht, 2 mittel, 3 stark
  for (const t of triggers) {
    const v = profile[t.field];
    if (v >= t.strong) level = Math.max(level, 3);
    else if (v >= t.mid) level = Math.max(level, 2);
    else if (v >= t.mid * 0.5) level = Math.max(level, 1);
  }
  return level === 3 ? HEAT_STRONG : level === 2 ? HEAT_MID : level === 1 ? HEAT_LIGHT : HEAT_DECAY;
}

export function createDoctrineDirector(configs: DoctrineConfig[]): DoctrineDirector {
  const byId = new Map(configs.map((c) => [c.id, c]));
  const st: DoctrineState[] = configs.map((c) => ({
    id: c.id, heat: 0, stage: 'inactive', commitmentLeft: 0, productionLevel: 0, timesActivated: 0,
  }));
  let active: string | null = null;

  function assignStages(): void {
    for (const s of st) s.stage = stageFromHeat(s.heat);

    const committed = active != null ? st.find((s) => s.id === active && s.commitmentLeft > 0) : undefined;
    if (committed) {
      // Festgelegte Doktrin bleibt mindestens aktiv (auch wenn die Hitze sinkt).
      committed.stage = maxStage(stageFromHeat(committed.heat), 'active');
      for (const s of st) if (s !== committed) s.stage = capStage(s.stage, 'preparing');
    } else {
      active = null;
      // Höchste Hitze, die die Aktiv-Schwelle erreicht, wird neu festgelegt.
      const cand = st.filter((s) => s.heat >= ACTIVE).sort((a, b) => b.heat - a.heat)[0];
      if (cand) {
        active = cand.id;
        cand.commitmentLeft = COMMITMENT;
        cand.timesActivated++;
        cand.stage = stageFromHeat(cand.heat);
        for (const s of st) if (s !== cand) s.stage = capStage(s.stage, 'preparing');
      }
    }
    for (const s of st) s.productionLevel = prodFromStage(s.stage);
  }

  return {
    evaluate(profile) {
      for (const s of st) s.heat = clamp(s.heat + heatDelta(profile, byId.get(s.id)!.triggers));
      assignStages();
    },
    tickCommitment() {
      const s = active != null ? st.find((x) => x.id === active) : undefined;
      if (s && s.commitmentLeft > 0) {
        s.commitmentLeft--;
        if (s.commitmentLeft <= 0) active = null; // Neubewertung beim nächsten evaluate erlaubt
      }
    },
    sabotage(id) {
      const s = st.find((x) => x.id === id);
      if (!s) return;
      s.heat = clamp(s.heat + SABOTAGE);
      if (active === id) { s.commitmentLeft = 0; active = null; }
      assignStages();
    },
    provoke(id) {
      const s = st.find((x) => x.id === id);
      if (!s) return;
      s.heat = clamp(s.heat + PROVOKE);
      assignStages();
    },
    states: () => st.map((s) => ({ ...s })),
    activeId: () => active,
  };
}
