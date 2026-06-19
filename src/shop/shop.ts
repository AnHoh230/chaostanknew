import type { ShopItem, Slot } from './catalog';
import { sellValue } from './buyLogic';

export interface ShopHooks {
  items: readonly ShopItem[]; // voller Katalog
  getMoney: () => number;
  getUnlockedMk: () => number;
  isEquipped: (id: string) => boolean;
  getEquipped: () => ShopItem[];
  onBuy: (item: ShopItem) => void;
  onSell: (item: ShopItem) => void;
  onToggle?: (open: boolean) => void;
}

export interface Shop {
  toggle(): void;
  isOpen(): boolean;
  refresh(): void;
}

const SLOT_ORDER: Slot[] = ['waffe', 'wanne', 'turm', 'raeder', 'ruestung'];
const SLOT_LABELS: Record<Slot, string> = {
  waffe: 'Waffe', wanne: 'Wanne', turm: 'Turm', raeder: 'Räder', ruestung: 'Rüstung',
};
type SlotFilter = Slot | 'alle';

function statText(it: ShopItem): string {
  if (it.damage) return `+${it.damage} Schaden`;
  if (it.hp) return `+${it.hp} HP`;
  if (it.armor) return `+${it.armor} Rüstung`;
  if (it.speed) return `+${it.speed} Tempo`;
  return '';
}

/** Geld/MK-Anzeige + Werkstatt: Kaufen (nur Normale ≤ MK) und Verkaufen (verbaut). */
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
    'background:rgba(6,8,10,0.82);z-index:25;font-family:system-ui,sans-serif;';
  const inner = document.createElement('div');
  inner.style.cssText =
    'background:#13171c;border:2px solid #2a343b;border-radius:12px;padding:20px;' +
    'width:760px;max-width:92vw;max-height:84vh;overflow:auto;';
  panel.appendChild(inner);
  document.body.appendChild(panel);

  let open = false;
  let slotFilter: SlotFilter = 'alle';

  function row(label: string, sub: string, right: string, enabled: boolean, color: string, onClick?: () => void): HTMLElement {
    const b = document.createElement('button');
    b.disabled = !enabled;
    b.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;width:100%;margin:5px 0;' +
      'padding:9px 12px;border-radius:8px;border:1px solid #2a343b;text-align:left;color:#e8e0c8;' +
      `background:#1a1f25;${enabled ? 'cursor:pointer;' : 'opacity:0.5;cursor:not-allowed;'}`;
    b.innerHTML =
      `<span><b>${label}</b> <span style="color:#9aa">— ${sub}</span></span>` +
      `<span style="color:${color}">${right}</span>`;
    if (enabled && onClick) b.addEventListener('click', onClick);
    return b;
  }

  function refresh(): void {
    const mk = h.getUnlockedMk();
    money.textContent = `💰 ${h.getMoney()}   ·   MK ${mk}`;
    if (!open) return;

    const buyable = h.items
      .filter((it) => it.rarity === 'normal' && it.mk <= mk && !h.isEquipped(it.id))
      .filter((it) => slotFilter === 'alle' || it.slot === slotFilter)
      .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.mk - b.mk);
    const equipped = h.getEquipped();

    inner.innerHTML =
      `<div style="font-size:20px;font-weight:700;color:#f0e6cc;margin-bottom:6px">` +
      `Werkstatt — MK ${mk} freigeschaltet — [B] schließen</div>` +
      `<div style="display:flex;gap:18px">` +
      `<div style="flex:1" id="shop-buy"><div style="color:#9aa;margin:6px 0">Kaufen (nur Normale ≤ MK${mk})</div></div>` +
      `<div style="flex:1" id="shop-sell"><div style="color:#9aa;margin:6px 0">Verkaufen (verbaut)</div></div>` +
      `</div>`;
    const buyCol = inner.querySelector('#shop-buy')!;
    const sellCol = inner.querySelector('#shop-sell')!;

    // Slot-Filter-Leiste.
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;';
    const filters: SlotFilter[] = ['alle', ...SLOT_ORDER];
    for (const f of filters) {
      const active = slotFilter === f;
      const fb = document.createElement('button');
      fb.textContent = f === 'alle' ? 'Alle' : SLOT_LABELS[f];
      fb.style.cssText =
        'padding:5px 11px;border-radius:6px;border:1px solid #2a343b;cursor:pointer;font:600 12px system-ui;' +
        (active ? 'background:#d8b04a;color:#1a1d22;' : 'background:#1a1f25;color:#cdd6dd;');
      fb.addEventListener('click', () => {
        slotFilter = f;
        refresh();
      });
      bar.appendChild(fb);
    }
    buyCol.appendChild(bar);

    for (const it of buyable) {
      const afford = h.getMoney() >= it.cost;
      buyCol.appendChild(
        row(it.name, statText(it), `💰 ${it.cost}`, afford, afford ? '#ffe08a' : '#c66', () => {
          h.onBuy(it);
          refresh();
        }),
      );
    }
    if (!equipped.length) {
      const empty = document.createElement('div');
      empty.textContent = 'Noch nichts verbaut.';
      empty.style.cssText = 'color:#778;padding:8px';
      sellCol.appendChild(empty);
    }
    for (const it of equipped) {
      sellCol.appendChild(
        row(it.name, statText(it), `+💰 ${sellValue(it)}`, true, '#5fd06a', () => {
          h.onSell(it);
          refresh();
        }),
      );
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
