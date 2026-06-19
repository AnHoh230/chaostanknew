/** Geschlossene Trait-Liste (Spec 7.1), Wertebereich 0..1. */
export type Trait = 'mut' | 'stolz' | 'gier' | 'geselligkeit' | 'vorsicht' | 'fortschrittsdrang';

export type TraitProfile = Record<Trait, number>;

/** Geschlossener Aktionsraum (Spec 7.1). Schnittstelle fix, Gewichte offen. */
export type AiAction =
  | 'annähern'
  | 'fliehen'
  | 'looten'
  | 'anwerben'
  | 'einkaufen'
  | 'Revier_halten'
  | 'Ziel_wählen'
  | 'sich_aufrüsten';

export const ACTIONS: readonly AiAction[] = [
  'annähern',
  'fliehen',
  'looten',
  'anwerben',
  'einkaufen',
  'Revier_halten',
  'Ziel_wählen',
  'sich_aufrüsten',
] as const;

/** Welt-Inputs, die die KI liest (Spec 7.1), normalisiert für den Slice. */
export interface AiWorldView {
  selfHpFrac: number; // 0..1
  targetVisible: boolean;
  distance: number; // Welt-Einheiten zum Ziel
  homeDistance: number; // Welt-Einheiten zum eigenen Revier-Anker
  groupSize: number; // verbündete Panzer in der Nähe (Slice: 0)
  lootValue: number; // sichtbarer Beutewert des Ziels, 0..1 (Slice: grob)
}
