/**
 * Schicht 1 — das stabile Rückgrat der Evolution/Director-Architektur.
 *
 * Systemtragende IDs sind KOMPOSITORISCH (Grundmodus_Richtung), nie Lore-nah. Lore-/Anzeige-
 * Namen sind nur Strings daneben — ändert sich die Lore, bleibt die ID gleich (kein Drift mehr,
 * vgl. der frühere scar_colony/Narbenkolonie/Zielnetz-Schlamassel). Dieselbe ID benutzen später
 * Evolution-Fortschritt UND Director-Heat → sie können nicht auseinanderlaufen.
 */
export type BaseMode = 'sniper' | 'aoe' | 'dot';

export type EvolutionChannelId =
  | 'sniper_core'
  | 'sniper_aoe_dot'
  | 'sniper_dot_aoe'
  | 'aoe_core'
  | 'aoe_sniper_dot'
  | 'aoe_dot_sniper'
  | 'dot_core'
  | 'dot_sniper_aoe'
  | 'dot_aoe_sniper';

/** Kompassgewichte (Spielerabsicht). sniper + aoe + dot = 1. */
export interface CompassWeights {
  sniper: number;
  aoe: number;
  dot: number;
}

/** Alle 9 Kanäle (für Record-Initialisierung über alle Grundmodi). */
export const ALL_CHANNELS: readonly EvolutionChannelId[] = [
  'sniper_core', 'sniper_aoe_dot', 'sniper_dot_aoe',
  'aoe_core', 'aoe_sniper_dot', 'aoe_dot_sniper',
  'dot_core', 'dot_sniper_aoe', 'dot_aoe_sniper',
];

/** Die drei Kanäle des aktuellen Grundmodus: eigener Kern + zwei Triadenrouten. */
export function channelsForBaseMode(base: BaseMode): EvolutionChannelId[] {
  if (base === 'sniper') return ['sniper_core', 'sniper_aoe_dot', 'sniper_dot_aoe'];
  if (base === 'aoe') return ['aoe_core', 'aoe_sniper_dot', 'aoe_dot_sniper'];
  return ['dot_core', 'dot_sniper_aoe', 'dot_aoe_sniper'];
}

/**
 * Welches Kompassgewicht speist diesen Kanal: der Kern hängt am EIGENEN Pol, jede Route am
 * jeweiligen FREMD-Pol (Mittelstil der Route). So lenkt ein Schub Richtung „Raum/AoE" beim
 * Sniper genau den Kanal sniper_aoe_dot.
 */
export function channelWeight(channel: EvolutionChannelId, w: CompassWeights): number {
  switch (channel) {
    case 'sniper_core': return w.sniper;
    case 'sniper_aoe_dot': return w.aoe;
    case 'sniper_dot_aoe': return w.dot;
    case 'aoe_core': return w.aoe;
    case 'aoe_sniper_dot': return w.sniper;
    case 'aoe_dot_sniper': return w.dot;
    case 'dot_core': return w.dot;
    case 'dot_sniper_aoe': return w.sniper;
    case 'dot_aoe_sniper': return w.aoe;
  }
}

/** Lore-/Anzeige-Konfig je Kanal — reine Strings, ändern keine Systemlogik. */
export interface ChannelDisplay {
  displayName: string;
  shortText: string;
}

export const CHANNEL_DISPLAY: Record<EvolutionChannelId, ChannelDisplay> = {
  sniper_core: { displayName: 'Kommandanten-Meisterschaft', shortText: 'Das Schlachtfeld von oben lesen, Zielbefehle sauberer auslösen.' },
  sniper_aoe_dot: { displayName: 'Zielnetz-Kontamination', shortText: 'Markierte Zielgruppen werden zu Verbindungen und später zu Kontamination.' },
  sniper_dot_aoe: { displayName: 'Auswahl-Wundbruch', shortText: 'Wiederholt gewählte Ziele werden zu vorbereiteten Bruchkörpern.' },
  aoe_core: { displayName: 'Feldkontrolle', shortText: 'Flächen kontrollierter setzen, Ränder und Rhythmus lesen.' },
  aoe_sniper_dot: { displayName: 'Feldaugen-Seuche', shortText: 'Flächen erzeugen Beobachtungspunkte, die Zustände setzen.' },
  aoe_dot_sniper: { displayName: 'Flächengedächtnis-Jagd', shortText: 'Gegner tragen Flächenhistorie; alte Zonen öffnen Jagdfenster.' },
  dot_core: { displayName: 'Zustandsmeisterschaft', shortText: 'Zustände lesbarer pflegen, verdichten und sauber ernten.' },
  dot_sniper_aoe: { displayName: 'Erntedrohnen-Riss', shortText: 'Reife Zustände werden markiert und als Raumrisse geerntet.' },
  dot_aoe_sniper: { displayName: 'Seuchen-Satelliten-Optik', shortText: 'Wirtzonen bauen Satelliten, die Zielkorridore zeichnen.' },
};
