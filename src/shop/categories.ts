import type { Category } from './itemTypes';

export interface CategoryDef {
  id: Category;
  name: string;
  desc: string;
}

/** Die Shop-Reiter in Anzeige-Reihenfolge. */
export const CATEGORIES: CategoryDef[] = [
  { id: 'equipment', name: 'Ausrüstung', desc: 'Rüstung, Räder, Waffe, Wanne, Turm und mehr.' },
  { id: 'instant', name: 'Sofort-Booster', desc: 'Kurzzeitige Kampfboni, im Gefecht gezündet.' },
  { id: 'usables', name: 'Einsatz-Items', desc: 'Werkzeuge für die Tasche, später bewusst ausgelöst.' },
  { id: 'garage', name: 'Garage', desc: 'Dauerhafte Verbesserungen für Werkstatt und Loadout.' },
  { id: 'nemesis', name: 'Feindakten', desc: 'Rivalität, Promotion-Risiko und Nemesis-Belohnungen.' },
  { id: 'contracts', name: 'Verträge', desc: 'Riskante Abmachungen mit starken Belohnungen.' },
];
