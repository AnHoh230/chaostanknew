/**
 * Live-Anzeige der Heat-Lage pro Stil-Richtung: zeigt, WELCHE Spielweise gerade wie heiß ist
 * (+ Stufe 0..3). Erklärt, WARUM gerade dieser Schwarm-Mix kommt. Reine Info.
 */
export interface HeatHudRow {
  label: string; // spielernahe Richtung (z. B. „Distanz", „Rush")
  heat: number; // 0..100
  stufe: number; // 0..3
}

export interface HeatHud {
  update(rows: HeatHudRow[]): void;
}

function heatColor(heat: number): string {
  const f = Math.max(0, Math.min(1, heat / 100));
  return `hsl(${Math.round((1 - f) * 55 + 5)}, 85%, 55%)`; // kühl-gelb → heiß-rot
}

export function createHeatHud(): HeatHud {
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;left:12px;top:188px;z-index:18;width:150px;pointer-events:none;' +
    'background:rgba(13,17,22,0.82);border:1px solid #2a343b;border-radius:8px;padding:7px 9px;' +
    'font:700 11px system-ui,sans-serif;color:#cdd6dd;';
  const head = document.createElement('div');
  head.textContent = 'Stil-Heat';
  head.style.cssText = 'color:#7fd1c0;font-weight:800;margin-bottom:4px;';
  const body = document.createElement('div');
  panel.appendChild(head);
  panel.appendChild(body);
  document.body.appendChild(panel);

  function update(rows: HeatHudRow[]): void {
    body.innerHTML = rows
      .map((r) => {
        const dim = r.heat <= 0 ? 'opacity:0.45;' : '';
        const w = Math.max(0, Math.min(100, r.heat));
        return (
          `<div style="margin:3px 0;${dim}">` +
          `<div style="display:flex;justify-content:space-between;font-size:10px">` +
          `<span>${r.label}</span><span style="color:#ffcf6b">St${r.stufe}</span></div>` +
          `<div style="height:5px;background:rgba(0,0,0,0.5);border-radius:3px;overflow:hidden">` +
          `<div style="height:100%;width:${w}%;background:${heatColor(r.heat)}"></div></div>` +
          `</div>`
        );
      })
      .join('');
  }

  return { update };
}
