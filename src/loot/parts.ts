import type { SocketName } from '../tank/sockets';

/** Ein Beute-Teil: tauscht eine Socket-Variante UND verändert Stats. */
export interface Part {
  id: string;
  label: string;
  socket: SocketName;
  variantId: string;
  damage?: number; // additiver Schadens-Bonus
  maxHp?: number; // additiver HP-Bonus
}

/** Teile-Katalog. Jedes Teil ist sichtbar (Variante) + spürbar (Stat). */
export const PARTS: readonly Part[] = [
  { id: 'lange_kanone', label: 'Lange Kanone', socket: 'weapon', variantId: 'g_long', damage: 10 },
  { id: 'schwerer_turm', label: 'Schwerer Turm', socket: 'turret', variantId: 't_big', maxHp: 30 },
  { id: 'breite_wanne', label: 'Breite Wanne', socket: 'chassis', variantId: 'c_wide', maxHp: 40 },
  { id: 'ketten', label: 'Ketten', socket: 'wheels', variantId: 'w_tread', maxHp: 15 },
];

export function getPart(id: string): Part {
  const p = PARTS.find((x) => x.id === id);
  if (!p) throw new Error('Unbekanntes Teil: ' + id);
  return p;
}
