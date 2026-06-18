export interface GameEvents {
  'tank.fired': { tankId: string };
  'projectile.spawned': { id: string };
  'projectile.consumed': { id: string };
}

export interface Bus {
  emit<K extends keyof GameEvents>(k: K, payload: GameEvents[K]): void;
  on<K extends keyof GameEvents>(k: K, fn: (p: GameEvents[K]) => void): () => void;
}

// Intern speichern wir typ-gelöschte Handler in einer Map; die Korrektheit
// wird an der öffentlichen, generischen API (emit/on) garantiert. Das umgeht
// die TS-Varianz-Grenze bei indexierten Mapped-Types mit generischem K.
type AnyHandler = (p: never) => void;

export function createBus(): Bus {
  const listeners = new Map<keyof GameEvents, Set<AnyHandler>>();

  return {
    emit<K extends keyof GameEvents>(k: K, payload: GameEvents[K]): void {
      const set = listeners.get(k);
      if (!set) return;
      for (const fn of set) {
        (fn as (p: GameEvents[K]) => void)(payload);
      }
    },
    on<K extends keyof GameEvents>(k: K, fn: (p: GameEvents[K]) => void): () => void {
      let set = listeners.get(k);
      if (!set) {
        set = new Set<AnyHandler>();
        listeners.set(k, set);
      }
      const handler = fn as AnyHandler;
      set.add(handler);
      return () => {
        set!.delete(handler);
      };
    },
  };
}
