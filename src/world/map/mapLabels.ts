/**
 * Klartext-Beschriftung für Map-Props: ordnet Asset-Id / Kind einen lesbaren Namen
 * mit Symbol zu (für das Nameplate, das beim Annähern über dem Objekt erscheint).
 * Reine Tabelle — getestet, damit jedes Asset eine Beschriftung hat.
 */
const NACH_ASSET: Record<string, string> = {
  fass: '🛢 Fass',
  kiste: '📦 Kiste',
  schrotthaufen: '🗑 Schrotthaufen',
  neonschild: '🪧 Neonschild',
  wrack_auto: '🚗 Wrack',
  container: '🟦 Container',
  rohrstapel: '🛞 Rohrstapel',
  betonblock: '🧱 Betonblock',
  presse: '⚠ Presse',
  stachelgrube: '⚠ Stachelgrube',
  giftpfuetze: '☢ Giftpfütze',
  funkturm: '📡 Funkturm',
  sprungrampe: '▲ Sprungrampe',
  bonusinsel: '✨ Bonus-Insel',
  fund_huhn: '♥ Fund: Heilung',
  fund_schraube: '🔧 Fund: Spielzeug',
  fund_kanister: '🔧 Fund: Spielzeug',
};

const NACH_KIND: Record<string, string> = {
  breakable: 'Zerstörbar',
  obstacle: 'Hindernis',
  hazard: '⚠ Falle',
  landmark: 'Wahrzeichen',
  secretRamp: '▲ Rampe',
  collectible: '♥ Fund',
  dormantNest: '💤 Nest',
};

/** Lesbarer Name eines Props; bevorzugt das konkrete Asset, sonst die Kind-Kategorie. */
export function entityBeschriftung(asset: string, kind: string): string {
  return NACH_ASSET[asset] ?? NACH_KIND[kind] ?? asset;
}
