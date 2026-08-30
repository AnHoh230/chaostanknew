/**
 * Kuratierte Karten-Bibliothek: NUR von Hand gepflegte, im Mapsmith für gut befundene
 * Hybrid-Seed-Paare. Der Run baut daraus deterministisch — kein Runtime-Zufall.
 * Neue Einträge liefert der Mapsmith (Taste C) als fertige Zeile zum Einfügen.
 */
export interface KuratierteKarte {
  id: string;
  generatorId: 'hybrid';
  seed: number;
}

export const CURATED: KuratierteKarte[] = [
  { id: 'hybrid_1337', generatorId: 'hybrid', seed: 1337 },
];

export function waehleKarte(index = 0): KuratierteKarte {
  const n = CURATED.length;
  return CURATED[(((index % n) + n) % n)];
}
