/**
 * Debug-Overlay des Mapsmith (Phase 7): zeigt Rezept, Seed, Validität, Warnungen und Tastenhinweise.
 * Nur im Mapsmith-Modus sichtbar.
 */
export interface MapsmithHud {
  setSichtbar(v: boolean): void;
  update(info: { rezeptId: string; seed: number; valid: boolean; warnungen: string[]; entities: number }): void;
}

export function createMapsmithHud(): MapsmithHud {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;left:12px;bottom:12px;z-index:70;min-width:240px;max-width:360px;' +
    'background:#0d141cf2;border:1px solid #e8b53a;border-radius:8px;padding:10px 12px;' +
    'font:600 12px system-ui,sans-serif;color:#ffe0a8;display:none;';
  document.body.appendChild(el);

  return {
    setSichtbar(v: boolean): void {
      el.style.display = v ? 'block' : 'none';
    },
    update(info): void {
      const warn = info.warnungen.length
        ? `<div style="color:#ff9f43;margin-top:4px">⚠ ${info.warnungen.slice(0, 4).join('<br>⚠ ')}</div>`
        : '<div style="color:#9be36b;margin-top:4px">✓ valide</div>';
      el.innerHTML =
        '<div style="color:#e8b53a">🛠 MAPSMITH</div>' +
        `<div>Rezept: ${info.rezeptId}</div>` +
        `<div>Seed: ${info.seed}</div>` +
        `<div>Entities: ${info.entities} · valid: ${info.valid}</div>` +
        warn +
        '<div style="color:#8a9aa8;margin-top:6px">[G] reroll · [C] speichern · [M] schließen</div>';
    },
  };
}
