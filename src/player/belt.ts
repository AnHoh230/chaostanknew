/**
 * Usable-Gürtel: feste Anzahl Slots, die Verbrauchs-Ladungen (Booster/Einsatz-
 * Items) halten. Im Kampf per Hotkey gezündet (trigger verbraucht die Ladung).
 * Generisch über den Ladungstyp — gleiche Mechanik für Spieler und Gegner.
 */
export interface Belt<T> {
  add(item: T): boolean; // nächster freier Slot; false wenn voll
  trigger(i: number): T | null; // Ladung zurückgeben + Slot leeren
  slots(): (T | null)[];
  count(): number;
}

export function createBelt<T>(size: number): Belt<T> {
  const slots: (T | null)[] = new Array(size).fill(null);

  return {
    add(item) {
      const free = slots.indexOf(null);
      if (free < 0) return false;
      slots[free] = item;
      return true;
    },
    trigger(i) {
      if (i < 0 || i >= slots.length) return null;
      const it = slots[i];
      if (!it) return null;
      slots[i] = null;
      return it;
    },
    slots: () => [...slots],
    count: () => slots.reduce((n, s) => n + (s ? 1 : 0), 0),
  };
}
