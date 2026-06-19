import type { Part } from '../loot/parts';

export interface ShopHooks {
  parts: readonly Part[];
  getMoney: () => number;
  isOwned: (id: string) => boolean;
  onBuy: (part: Part) => void;
  onToggle?: (open: boolean) => void; // z. B. Sim pausieren
}

export interface Shop {
  toggle(): void;
  isOpen(): boolean;
  refresh(): void;
}

/** Geld-Anzeige (immer) + Werkstatt-Overlay (Taste B). Kauf ruft onBuy. */
export function createShop(h: ShopHooks): Shop {
  const money = document.createElement('div');
  money.id = 'money';
  money.style.cssText =
    'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:19;pointer-events:none;' +
    'font:700 15px system-ui,sans-serif;color:#ffe08a;background:rgba(8,10,12,0.6);' +
    'padding:6px 14px;border-radius:8px;text-shadow:0 1px 2px #000;';
  document.body.appendChild(money);

  const hint = document.createElement('div');
  hint.textContent = '[B] Werkstatt';
  hint.style.cssText =
    'position:fixed;top:46px;left:50%;transform:translateX(-50%);z-index:19;pointer-events:none;' +
    'font:600 11px system-ui,sans-serif;color:#8fa3a0;opacity:0.7;';
  document.body.appendChild(hint);

  const panel = document.createElement('div');
  panel.id = 'shop';
  panel.style.cssText =
    'position:fixed;inset:0;display:none;align-items:center;justify-content:center;' +
    'background:rgba(6,8,10,0.8);z-index:25;font-family:system-ui,sans-serif;';
  const inner = document.createElement('div');
  inner.style.cssText =
    'background:#13171c;border:2px solid #2a343b;border-radius:12px;padding:22px;min-width:440px;';
  panel.appendChild(inner);
  document.body.appendChild(panel);

  let open = false;

  function refresh(): void {
    money.textContent = '💰 ' + h.getMoney();
    if (!open) return;
    inner.innerHTML =
      '<div style="font-size:20px;font-weight:700;color:#f0e6cc;margin-bottom:14px">' +
      'Werkstatt — [B] schließen</div>';
    for (const p of h.parts) {
      const owned = h.isOwned(p.id);
      const afford = h.getMoney() >= p.cost;
      const stat = p.damage ? `+${p.damage} Schaden` : p.maxHp ? `+${p.maxHp} HP` : '';
      const row = document.createElement('button');
      row.disabled = owned || !afford;
      row.style.cssText =
        'display:flex;justify-content:space-between;align-items:center;width:100%;margin:6px 0;' +
        'padding:12px 14px;border-radius:8px;border:1px solid #2a343b;text-align:left;' +
        `background:${owned ? '#10240f' : '#1a1f25'};color:#e8e0c8;` +
        (owned || !afford ? 'opacity:0.55;cursor:not-allowed;' : 'cursor:pointer;');
      row.innerHTML =
        `<span><b>${p.label}</b> <span style="color:#9aa">— ${stat}</span></span>` +
        `<span style="color:${owned ? '#5fd06a' : afford ? '#ffe08a' : '#c66'}">` +
        `${owned ? 'besitzt' : '💰 ' + p.cost}</span>`;
      if (!owned && afford) {
        row.addEventListener('click', () => {
          h.onBuy(p);
          refresh();
        });
      }
      inner.appendChild(row);
    }
  }

  function setOpen(o: boolean): void {
    open = o;
    panel.style.display = o ? 'flex' : 'none';
    h.onToggle?.(o);
    refresh();
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.key.toLowerCase() === 'b') setOpen(!open);
  });

  refresh();
  return { toggle: () => setOpen(!open), isOpen: () => open, refresh };
}
