import type { Buyer } from './itemTypes';
import type { BuffSpec } from '../combat/buffs';

/** Was ein gezündeter Booster bewirkt. */
export type BoosterEffect =
  | { kind: 'buff'; buff: BuffSpec; onlyLowHp?: boolean } // zeitlich begrenzter Selbst-Buff
  | { kind: 'tempHp'; amount: number } // sofortige Zusatz-HP
  | { kind: 'nextShots'; shots: number; damageMul: number }; // nächste N Schüsse stärker

export interface BoosterDef {
  id: string;
  name: string;
  desc: string; // Klartext „Was tut es" (Gate Menschenverständlichkeit)
  kind: 'consumable';
  consumableType: 'booster';
  category: 'instant';
  buyer: Buyer;
  cost: number;
  effect: BoosterEffect;
}

function buff(id: string, spec: Omit<BuffSpec, 'id'>): BoosterEffect {
  return { kind: 'buff', buff: { id, ...spec } };
}

/** Sofort-Booster — Gürtel-Ladungen, im Kampf per Hotkey gezündet. */
export const BOOSTERS: BoosterDef[] = [
  {
    id: 'notstrom_zuender', name: 'Notstrom-Zünder',
    desc: '8 s deutlich schneller — bricht aus tödlichen Situationen aus.',
    kind: 'consumable', consumableType: 'booster', category: 'instant', buyer: 'both', cost: 120,
    effect: buff('notstrom_zuender', { duration: 8, speedMul: 1.5 }),
  },
  {
    id: 'panzerhaut_schaum', name: 'Panzerhaut-Schaum',
    desc: 'Sofort +80 Zusatz-HP — rettet knapp vor dem Tod.',
    kind: 'consumable', consumableType: 'booster', category: 'instant', buyer: 'both', cost: 140,
    effect: { kind: 'tempHp', amount: 80 },
  },
  {
    id: 'ueberdruck_munition', name: 'Überdruck-Munition',
    desc: 'Die nächsten 3 Schüsse machen +60 % Schaden.',
    kind: 'consumable', consumableType: 'booster', category: 'instant', buyer: 'both', cost: 110,
    effect: { kind: 'nextShots', shots: 3, damageMul: 1.6 },
  },
  {
    id: 'kuehlmittel_injektion', name: 'Kühlmittel-Injektion',
    desc: '6 s höhere Feuerrate — aggressives Zeitfenster.',
    kind: 'consumable', consumableType: 'booster', category: 'instant', buyer: 'both', cost: 130,
    effect: buff('kuehlmittel_injektion', { duration: 6, fireRateMul: 1.5 }),
  },
  {
    id: 'turmservo_boost', name: 'Turmservo-Boost',
    desc: '12 s schnellere Turmdrehung — gut gegen flinke Gegner.',
    kind: 'consumable', consumableType: 'booster', category: 'instant', buyer: 'both', cost: 100,
    effect: buff('turmservo_boost', { duration: 12, turretSlewMul: 2 }),
  },
  {
    id: 'letzte_schicht', name: 'Letzte-Schicht-Panzerung',
    desc: 'Nur unter 20 % HP: 8 s viel mehr Rüstung — Drama für knappe Kämpfe.',
    kind: 'consumable', consumableType: 'booster', category: 'instant', buyer: 'both', cost: 150,
    effect: { kind: 'buff', buff: { id: 'letzte_schicht', duration: 8, armorAdd: 120 }, onlyLowHp: true },
  },
];

const BY_ID = new Map(BOOSTERS.map((b) => [b.id, b]));

export function boosterDef(id: string): BoosterDef {
  const b = BY_ID.get(id);
  if (!b) throw new Error('Unbekannter Booster: ' + id);
  return b;
}
