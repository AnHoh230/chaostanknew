/** Aggregierte Modifikatoren aus allen aktiven Buffs. Muls neutral=1, Adds=0. */
export interface BuffMods {
  damageMul: number;
  speedMul: number;
  fireRateMul: number;
  turretSlewMul: number;
  armorAdd: number;
  accuracyAdd: number;
  dodgeAdd: number;
}

/** Ein zeitlich begrenzter Buff. Gleiche id refresht (kein Doppelstapel). */
export interface BuffSpec {
  id: string;
  duration: number;
  label?: string;
  icon?: string;
  damageMul?: number;
  speedMul?: number;
  fireRateMul?: number;
  turretSlewMul?: number;
  armorAdd?: number;
  accuracyAdd?: number;
  dodgeAdd?: number;
}

export interface ActiveBuff {
  id: string;
  remaining: number;
  duration: number;
  label?: string;
  icon?: string;
}

export interface BuffStack {
  add(spec: BuffSpec): void;
  tick(dt: number): void;
  aggregate(): BuffMods;
  active(): ActiveBuff[];
}

interface Entry extends BuffSpec {
  remaining: number;
}

function neutral(): BuffMods {
  return {
    damageMul: 1, speedMul: 1, fireRateMul: 1, turretSlewMul: 1,
    armorAdd: 0, accuracyAdd: 0, dodgeAdd: 0,
  };
}

/** Stapel zeitlich begrenzter Buffs — geteilt von Spieler und Gegnern. */
export function createBuffStack(): BuffStack {
  const entries: Entry[] = [];

  return {
    add(spec) {
      const existing = entries.find((e) => e.id === spec.id);
      if (existing) {
        Object.assign(existing, spec, { remaining: spec.duration });
      } else {
        entries.push({ ...spec, remaining: spec.duration });
      }
    },
    tick(dt) {
      for (let i = entries.length - 1; i >= 0; i--) {
        entries[i]!.remaining -= dt;
        if (entries[i]!.remaining <= 0) entries.splice(i, 1);
      }
    },
    aggregate() {
      const m = neutral();
      for (const e of entries) {
        if (e.damageMul != null) m.damageMul *= e.damageMul;
        if (e.speedMul != null) m.speedMul *= e.speedMul;
        if (e.fireRateMul != null) m.fireRateMul *= e.fireRateMul;
        if (e.turretSlewMul != null) m.turretSlewMul *= e.turretSlewMul;
        if (e.armorAdd != null) m.armorAdd += e.armorAdd;
        if (e.accuracyAdd != null) m.accuracyAdd += e.accuracyAdd;
        if (e.dodgeAdd != null) m.dodgeAdd += e.dodgeAdd;
      }
      return m;
    },
    active() {
      return entries.map((e) => ({
        id: e.id, remaining: e.remaining, duration: e.duration, label: e.label, icon: e.icon,
      }));
    },
  };
}
