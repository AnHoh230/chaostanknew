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

function primary(it: ShopItem): number {
  return it.damage || it.hp || it.armor || it.speed;
}
function statText(it: ShopItem): string {
  if (it.damage) return `${it.damage} Schaden`;
  if (it.hp) return `${it.hp} HP`;
  if (it.armor) return `${it.armor} Rüstung`;
  if (it.speed) return `${it.speed} Tempo`;
  return '';
}

/**
 * Werkstatt: links Kaufen (mit Slot-Filter, klaren Sperr-Gründen + Vergleichspfeil
 * zum verbauten Teil), rechts das Inventar des Panzers pro Slot mit Verkaufen.
 */
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
    'width:860px;max-width:94vw;max-height:86vh;overflow:auto;';
  panel.appendChild(inner);
  document.body.appendChild(panel);

  let open = false;
  let slotFilter: SlotFilter = 'alle';

  function makeRow(
    label: string,
    sub: string,
    right: string,
    enabled: boolean,
    rightColor: string,
    onClick?: () => void,
  ): HTMLElement {
    const b = document.createElement('button');
    b.disabled = !enabled;
    b.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;width:100%;margin:5px 0;' +
      'padding:9px 12px;border-radius:8px;border:1px solid #2a343b;text-align:left;color:#e8e0c8;' +
      `background:#1a1f25;${enabled ? 'cursor:pointer;' : 'opacity:0.5;cursor:default;'}`;
    b.innerHTML =
      `<span><b>${label}</b><br><span style="color:#9aa;font-size:12px">${sub}</span></span>` +
      `<span style="color:${rightColor};white-space:nowrap;margin-left:10px">${right}</span>`;
    if (enabled && onClick) b.addEventListener('click', onClick);
    return b;
  }

  function refresh(): void {
    const mk = h.getUnlockedMk();
    money.textContent = `💰 ${h.getMoney()}   ·   MK ${mk}`;
    if (!open) return;

    const equippedBySlot: Partial<Record<Slot, ShopItem>> = {};
    for (const it of h.getEquipped()) equippedBySlot[it.slot] = it;

    inner.innerHTML =
      `<div style="font-size:20px;font-weight:700;color:#f0e6cc;margin-bottom:4px">Werkstatt</div>` +
      `<div style="color:#9aa;margin-bottom:12px">💰 ${h.getMoney()} · MK ${mk} freigeschaltet · [B] schließen</div>` +
      `<div style="display:flex;gap:20px">` +
      `<div id="shop-buy" style="flex:1.25"></div>` +
      `<div id="shop-inv" style="flex:1"></div></div>`;
    const buyCol = inner.querySelector('#shop-buy')!;
    const invCol = inner.querySelector('#shop-inv')!;

    // ---- KAUFEN ----
    const buyHead = document.createElement('div');
    buyHead.textContent = 'Kaufen (nur Normale)';
    buyHead.style.cssText = 'color:#9aa;margin:2px 0 8px';
    buyCol.appendChild(buyHead);

    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
    for (const f of ['alle', ...SLOT_ORDER] as SlotFilter[]) {
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

    const list = h.items
      .filter(
        (it) =>
          it.rarity === 'normal' &&
          it.mk <= mk + 1 && // aktuelle Stufe + nächste als Vorschau
          !h.isEquipped(it.id) &&
          (slotFilter === 'alle' || it.slot === slotFilter),
      )
      .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.mk - b.mk);

    for (const it of list) {
      const locked = it.mk > mk;
      const afford = h.getMoney() >= it.cost;
      const cur = equippedBySlot[it.slot];
      let cmp = '';
      if (cur) {
        const d = primary(it) - primary(cur);
        cmp =
          d > 0
            ? ` <span style="color:#5fd06a">▲ +${d}</span>`
            : d < 0
              ? ` <span style="color:#e06a6a">▼ ${d}</span>`
              : ` <span style="color:#9aa">=</span>`;
      } else {
        cmp = ` <span style="color:#7bd">neu</span>`;
      }
      const right = locked ? `🔒 MK ${it.mk}` : `💰 ${it.cost}`;
      const rightColor = locked ? '#c98' : afford ? '#ffe08a' : '#e06a6a';
      buyCol.appendChild(
        makeRow(it.name, statText(it) + cmp, right, !locked && afford, rightColor, () => {
          h.onBuy(it);
          refresh();
        }),
      );
    }
    if (!list.length) {
      const none = document.createElement('div');
      none.textContent = 'Nichts in diesem Filter.';
      none.style.cssText = 'color:#778;padding:8px';
      buyCol.appendChild(none);
    }

    // ---- DEIN PANZER (INVENTAR) ----
    const invHead = document.createElement('div');
    invHead.textContent = 'Dein Panzer';
    invHead.style.cssText = 'color:#9aa;margin:2px 0 8px';
    invCol.appendChild(invHead);

    for (const slot of SLOT_ORDER) {
      const it = equippedBySlot[slot];
      if (it) {
        invCol.appendChild(
          makeRow(
            `${SLOT_LABELS[slot]}: ${it.name}`,
            statText(it),
            `Verkaufen +💰 ${sellValue(it)}`,
            true,
            '#5fd06a',
            () => {
              h.onSell(it);
              refresh();
            },
          ),
        );
      } else {
        const empty = document.createElement('div');
        empty.innerHTML = `<b style="color:#cdd6dd">${SLOT_LABELS[slot]}:</b> <span style="color:#677">— leer —</span>`;
        empty.style.cssText =
          'padding:11px 12px;margin:5px 0;border:1px dashed #2a343b;border-radius:8px;font-size:13px;';
        invCol.appendChild(empty);
      }
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
