/**
 * In-Welt-Wegpunkt: zeigt das auf der Übersichtskarte (M) gewählte Ziel auch WÄHREND des
 * Fahrens an — als Ziel-Ring, wenn es im Bild ist, sonst als Pfeil am Bildschirmrand, der
 * dorthin weist. Plus Live-Distanz. So beantwortet die Karte „wo will ich hin?" nicht nur
 * beim Öffnen, sondern fortlaufend. Reines DOM; die Bildschirm-Projektion macht main.ts.
 */
export interface WaypointView {
  sx: number; // Bildschirm-x (bei off-screen schon an den Rand geklemmt)
  sy: number;
  onScreen: boolean; // Ziel im Sichtfeld? -> Ring statt Randpfeil
  dirRad: number; // Pfeilrichtung in Bildschirm-Koordinaten (0 = nach rechts)
  distanz: number; // Welt-Distanz Spieler -> Ziel
  name: string;
}

export interface WaypointMarker {
  zeige(v: WaypointView): void;
  verstecke(): void;
  dispose(): void;
}

export function createWaypointMarker(): WaypointMarker {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'position:fixed;z-index:24;pointer-events:none;display:none;transform:translate(-50%,-50%);' +
    'font:800 11px system-ui,sans-serif;color:#ffe08a;text-shadow:0 1px 3px #000;text-align:center;line-height:1;';

  const ring = document.createElement('div');
  ring.innerHTML =
    '<svg width="30" height="30" viewBox="0 0 30 30">' +
    '<circle cx="15" cy="15" r="9" fill="none" stroke="#ffe08a" stroke-width="2.5"/>' +
    '<circle cx="15" cy="15" r="2.5" fill="#ffe08a"/></svg>';
  ring.style.cssText = 'filter:drop-shadow(0 0 3px rgba(0,0,0,0.8));';

  const arrow = document.createElement('div');
  arrow.innerHTML =
    '<svg width="34" height="34" viewBox="0 0 34 34">' +
    '<path d="M4 17 H22 M22 17 L15 10 M22 17 L15 24" fill="none" stroke="#ffe08a" ' +
    'stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  arrow.style.cssText = 'filter:drop-shadow(0 0 3px rgba(0,0,0,0.8));';

  const label = document.createElement('div');
  label.style.cssText = 'margin-top:1px;white-space:nowrap;';

  wrap.appendChild(ring);
  wrap.appendChild(arrow);
  wrap.appendChild(label);
  document.body.appendChild(wrap);

  function zeige(v: WaypointView): void {
    wrap.style.display = 'block';
    wrap.style.left = v.sx + 'px';
    wrap.style.top = v.sy + 'px';
    ring.style.display = v.onScreen ? 'block' : 'none';
    arrow.style.display = v.onScreen ? 'none' : 'block';
    if (!v.onScreen) arrow.style.transform = `rotate(${v.dirRad}rad)`;
    label.textContent = `${v.name} · ${Math.round(v.distanz)} m`;
  }
  function verstecke(): void {
    wrap.style.display = 'none';
  }
  function dispose(): void {
    wrap.remove();
  }

  return { zeige, verstecke, dispose };
}
