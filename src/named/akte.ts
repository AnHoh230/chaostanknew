import type { Named } from './promotion';

export type Ausgang = 'sieg' | 'niederlage'; // aus Spielersicht

export interface DuellEintrag {
  ausgang: Ausgang;
  playerHpFrac: number; // Spieler-HP-Anteil am Ende des Duells
}

/** Duell-Gedächtnis pro Gegner („die Seele", Spec 8). In-Memory ab Slice 1. */
export interface Akte {
  enemyId: string;
  begegnungen: number;
  siege: number; // Spieler-Siege
  niederlagen: number;
  knappsterSieg: number; // kleinster Spieler-HP-Anteil bei einem Sieg (1 = noch keiner)
  named?: Named;
  archiviert: boolean;
}

export interface AkteBuch {
  record(enemyId: string, e: DuellEintrag): Akte;
  get(enemyId: string): Akte | undefined;
  promote(enemyId: string, named: Named): Akte;
  archive(enemyId: string): void;
  all(): Akte[];
}

export function createAkteBuch(): AkteBuch {
  const buch = new Map<string, Akte>();

  function ensure(enemyId: string): Akte {
    let a = buch.get(enemyId);
    if (!a) {
      a = { enemyId, begegnungen: 0, siege: 0, niederlagen: 0, knappsterSieg: 1, archiviert: false };
      buch.set(enemyId, a);
    }
    return a;
  }

  return {
    record(enemyId, e) {
      const a = ensure(enemyId);
      a.begegnungen++;
      if (e.ausgang === 'sieg') {
        a.siege++;
        if (e.playerHpFrac < a.knappsterSieg) a.knappsterSieg = e.playerHpFrac;
      } else {
        a.niederlagen++;
      }
      return a;
    },
    get: (enemyId) => buch.get(enemyId),
    promote(enemyId, named) {
      const a = ensure(enemyId);
      a.named = named;
      return a;
    },
    archive(enemyId) {
      const a = buch.get(enemyId);
      if (a) a.archiviert = true;
    },
    all: () => [...buch.values()],
  };
}
