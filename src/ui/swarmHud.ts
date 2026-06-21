/**
 * Kleine Live-Anzeige der Schwarm-Lage: wie viele Gegner je Typ gerade leben + Zieldichte.
 * Macht sichtbar, was die Dichte-/Mix-Regler und der Spielstil bewirken (reine Info).
 */
export interface SwarmHudRow {
  label: string;
  color: string;
  count: number; // lebende Gegner dieses Typs
  weight: number; // aktuelles Spawn-Gewicht (0 = kommt gerade nicht)
}

export interface SwarmHudInfo {
  alive: number;
  targetCount: number;
  rows: SwarmHudRow[];
}

export interface SwarmHud {
  update(info: SwarmHudInfo): void;
}

export function createSwarmHud(): SwarmHud {
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;left:12px;top:64px;z-index:18;min-width:140px;pointer-events:none;' +
    'background:rgba(13,17,22,0.82);border:1px solid #2a343b;border-radius:8px;padding:7px 9px;' +
    'font:700 11px system-ui,sans-serif;color:#cdd6dd;';
  const head = document.createElement('div');
  head.style.cssText = 'color:#7fd1c0;font-weight:800;margin-bottom:4px;';
  const body = document.createElement('div');
  panel.appendChild(head);
  panel.appendChild(body);
  document.body.appendChild(panel);

  function update(info: SwarmHudInfo): void {
    head.textContent = `Schwarm ${info.alive}/${info.targetCount}`;
    const rows = info.rows.filter((r) => r.count > 0 || r.weight > 0);
    body.innerHTML = rows
      .map((r) => {
        const dim = r.count === 0 ? 'opacity:0.5;' : '';
        return (
          `<div style="display:flex;justify-content:space-between;gap:10px;${dim}">` +
          `<span style="color:${r.color}">■ ${r.label}</span>` +
          `<span>${r.count}</span></div>`
        );
      })
      .join('');
  }

  return { update };
}
