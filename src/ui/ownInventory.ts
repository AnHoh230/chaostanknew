/**
 * Live-Inventar des Spielers (Taste „I" ohne anvisierten Gegner). Öffnet OHNE Pause —
 * die Welt läuft weiter („on the fly"). Anlegen aus der Tasche, Ablegen in die Tasche.
 * Bewusst getrennt vom Shop (kein Kaufen/Verkaufen, kein Shop-Feld nötig).
 */
export interface OwnInvItem {
  id: string;
  name: string;
  stat: string; // Klartext-Hauptwert ("29 Schaden", "Auto: 16 Schaden", …)
  rarity: string; // 'normal' | 'selten' (für Farbe)
}

export interface OwnInvSlot {
  slot: string;
  label: string;
  item: OwnInvItem | null;
}

export interface OwnInvStats {
  damage: number;
  maxHp: number;
  armor: number;
  speed: number;
  dodge: number;
}

export interface OwnInvHandlers {
  slots: () => OwnInvSlot[]; // ausgerüstete Slots (in Anzeige-Reihenfolge)
  bag: () => OwnInvItem[]; // Tasche
  stats: () => OwnInvStats;
  onEquip: (id: string) => void; // Tasche → Slot
  onUnequip: (slot: string) => void; // Slot → Tasche
}

export interface OwnInventory {
  toggle(): void;
  isOpen(): boolean;
  refresh(): void;
}

function rarityColor(r: string): string {
  return r === 'selten' ? '#c9a0ff' : '#cdd6dd';
}

export function createOwnInventory(h: OwnInvHandlers): OwnInventory {
  let open = false;

  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;left:14px;top:54px;z-index:21;width:300px;max-height:78vh;overflow:auto;' +
    'background:rgba(8,12,16,0.93);border:1px solid #2a343b;border-radius:10px;padding:12px 14px;' +
    'font:13px system-ui,sans-serif;color:#e8edf1;display:none;box-shadow:0 8px 30px #000a;';
  document.body.appendChild(panel);

  function btn(label: string, color: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText =
      `margin-left:auto;background:${color};color:#10161b;border:none;border-radius:5px;` +
      'padding:2px 8px;font:700 11px system-ui,sans-serif;cursor:pointer;flex:none;';
    b.onclick = (e) => { e.stopPropagation(); onClick(); };
    return b;
  }

  function row(): HTMLElement {
    const r = document.createElement('div');
    r.style.cssText = 'display:flex;align-items:center;gap:8px;padding:3px 0;min-height:24px;';
    return r;
  }

  function header(text: string): HTMLElement {
    const h2 = document.createElement('div');
    h2.textContent = text;
    h2.style.cssText = 'font-weight:800;color:#9fb0c0;margin:10px 0 2px;font-size:11px;letter-spacing:0.5px;';
    return h2;
  }

  function render(): void {
    panel.innerHTML = '';

    const title = document.createElement('div');
    title.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;font-weight:800;font-size:15px;';
    title.innerHTML = '<span>🎒 Inventar</span><span style="color:#7f8c98;font-size:11px">[I] schließen · läuft weiter</span>';
    panel.appendChild(title);

    const s = h.stats();
    const stats = document.createElement('div');
    stats.style.cssText = 'color:#9aa;font-size:11px;margin:4px 0 2px';
    stats.textContent =
      `❤ ${s.maxHp}  ·  ⚔ ${s.damage}  ·  🛡 ${s.armor}  ·  💨 ${s.speed.toFixed(1)}` +
      (s.dodge > 0 ? `  ·  Ausweichen ${Math.round(s.dodge * 100)} %` : '');
    panel.appendChild(stats);

    panel.appendChild(header('AUSGERÜSTET'));
    for (const sl of h.slots()) {
      const r = row();
      const lab = document.createElement('span');
      lab.style.cssText = 'color:#7f8c98;width:74px;flex:none;font-size:11px';
      lab.textContent = sl.label;
      r.appendChild(lab);
      if (sl.item) {
        const it = document.createElement('span');
        it.style.color = rarityColor(sl.item.rarity);
        it.innerHTML = `${sl.item.name} <span style="color:#8aa">(${sl.item.stat})</span>`;
        r.appendChild(it);
        r.appendChild(btn('Ablegen', '#e0a85a', () => { h.onUnequip(sl.slot); render(); }));
      } else {
        const it = document.createElement('span');
        it.style.cssText = 'color:#566';
        it.textContent = '— leer —';
        r.appendChild(it);
      }
      panel.appendChild(r);
    }

    const bag = h.bag();
    panel.appendChild(header(`TASCHE (${bag.length})`));
    if (!bag.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#566;font-size:12px';
      empty.textContent = 'leer — Beute aufsammeln oder im Shop kaufen';
      panel.appendChild(empty);
    }
    for (const it of bag) {
      const r = row();
      const span = document.createElement('span');
      span.style.color = rarityColor(it.rarity);
      span.innerHTML = `${it.name} <span style="color:#8aa">(${it.stat})</span>`;
      r.appendChild(span);
      r.appendChild(btn('Anlegen', '#6fd1a0', () => { h.onEquip(it.id); render(); }));
      panel.appendChild(r);
    }
  }

  return {
    toggle(): void {
      open = !open;
      panel.style.display = open ? 'block' : 'none';
      if (open) render();
    },
    isOpen: () => open,
    refresh(): void {
      if (open) render();
    },
  };
}
