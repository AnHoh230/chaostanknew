import type { SocketName } from '../tank/sockets';

/** Ein Beute-Teil: tauscht eine Socket-Variante UND verändert Stats. */
export interface Part {
  id: string;
  label: string;
  socket: SocketName;
  variantId: string;
  cost: number; // Kaufpreis im Shop (Spielgeld)
  damage?: number; // additiver Schadens-Bonus
  maxHp?: number; // additiver HP-Bonus
}

/** Teile-Katalog. Jedes Teil ist sichtbar (Variante) + spürbar (Stat) + kaufbar. */
export const PARTS: readonly Part[] = [
  { id: 'lange_kanone', label: 'Lange Kanone', socket: 'weapon', variantId: 'g_long', cost: 120, damage: 10 },
  { id: 'schwerer_turm', label: 'Schwerer Turm', socket: 'turret', variantId: 't_big', cost: 90, maxHp: 30 },
  { id: 'breite_wanne', label: 'Breite Wanne', socket: 'chassis', variantId: 'c_wide', cost: 110, maxHp: 40 },
  { id: 'ketten', label: 'Ketten', socket: 'wheels', variantId: 'w_tread', cost: 50, maxHp: 15 },
];

export function getPart(id: string): Part {
  const p = PARTS.find((x) => x.id === id);
  if (!p) throw new Error('Unbekanntes Teil: ' + id);
  return p;
}
