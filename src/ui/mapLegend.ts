/**
 * Karten-Legende: kompaktes, immer sichtbares HUD-Panel, das die Farb-/Symbol-Codes
 * der Props erklärt — passend zu den Minimap-Blip-Farben. Beantwortet "was ist was?"
 * auf einen Blick, ergänzend zum In-Welt-Nameplate.
 */
export interface MapLegend {
  el: HTMLElement;
  setSichtbar(v: boolean): void;
  dispose(): void;
}

const EINTRAEGE: { farbe: string; text: string }[] = [
  { farbe: '#c9a06a', text: 'Zerstörbar (beschießen → Loot)' },
  { farbe: '#8b94a0', text: 'Hindernis (blockiert)' },
  { farbe: '#d2483f', text: 'Falle (ausweichen!)' },
  { farbe: '#9fb0c4', text: 'Wahrzeichen' },
  { farbe: '#e8b53a', text: 'Sprungrampe' },
  { farbe: '#c77dff', text: 'Schlafendes Nest' },
  { farbe: '#9be36b', text: 'Fund (Heilung/Spielzeug)' },
];

export function createMapLegend(parent: HTMLElement = document.body): MapLegend {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;left:12px;top:50%;transform:translateY(-50%);z-index:38;' +
    'background:#0d141cdd;border:1px solid #2a3a4a;border-radius:8px;padding:8px 10px;' +
    'font:600 11px system-ui,sans-serif;color:#bcd0e0;pointer-events:none;user-select:none;';

  const titel = document.createElement('div');
  titel.textContent = 'KARTE';
  titel.style.cssText = 'font-weight:800;letter-spacing:1px;color:#7f93a6;margin-bottom:5px;font-size:10px;';
  el.appendChild(titel);

  for (const e of EINTRAEGE) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:7px;margin:2px 0;';
    const dot = document.createElement('span');
    dot.style.cssText =
      `width:10px;height:10px;border-radius:2px;background:${e.farbe};` +
      'box-shadow:0 0 4px ' + e.farbe + '88;flex:0 0 auto;';
    const txt = document.createElement('span');
    txt.textContent = e.text;
    row.appendChild(dot);
    row.appendChild(txt);
    el.appendChild(row);
  }

  parent.appendChild(el);

  return {
    el,
    setSichtbar(v: boolean): void {
      el.style.display = v ? 'block' : 'none';
    },
    dispose(): void {
      el.remove();
    },
  };
}
