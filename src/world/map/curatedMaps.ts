/**
 * Kuratierte Karten-Bibliothek: NUR von Hand gepflegte, im Mapsmith für gut befundene
 * (Rezept, Seed)-Paare. Der Run baut daraus deterministisch — kein Runtime-Zufall.
 * Neue Einträge liefert der Mapsmith (Taste C) als fertige Zeile zum Einfügen.
 */
export interface KuratierteKarte {
  id: string;
  rezeptId: string;
  seed: number;
}

export const CURATED: KuratierteKarte[] = [
  { id: 'schrottfeld_1337', rezeptId: 'schrottfeld', seed: 1337 },
];

export function waehleKarte(index = 0): KuratierteKarte {
  const n = CURATED.length;
  return CURATED[(((index % n) + n) % n)];
}
