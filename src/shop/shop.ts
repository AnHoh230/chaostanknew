import type { ShopItem, Slot } from './catalog';
import { sellValue } from './buyLogic';

export interface ShopHooks {
  items: readonly ShopItem[]; // voller Katalog
  getMoney: () => number;
  getUnlockedMk: () => number;
  getSlot: (slot: Slot) => ShopItem | null; // ausgerüstetes Item eines Slots
  getBag: () => ShopItem[]; // Inventar-Tasche
  onBuy: (item: ShopItem) => void;
  onEquip: (item: ShopItem) => void; // aus Tasche anlegen
  onUnequip: (slot: Slot) => void; // Slot → Tasche
  onSell: (item: ShopItem) => void;
  onToggle?: (open: boolean) => void;
}

export interface Shop {
  toggle(): void;
  isOpen(): boolean;
  refresh(): void; // baut das Panel neu (nur bei Bedarf!)
  updateMoney(): void; // nur die Geld-Anzeige (pro Frame ok)
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
function cmpVs(it: ShopItem, cur: ShopItem | null): string {
  if (!cur) return ' <span style="color:#7bd">neu</span>';
  const d = primary(it) - primary(cur);
  if (d > 0) return ` <span style="color:#5fd06a">▲ +${d}</span>`;
  if (d < 0) return ` <span style="color:#e06a6a">▼ ${d}</span>`;
  return ' <span style="color:#9aa">=</span>';
}

function colTitle(text: string): HTMLElement {
  const d = document.createElement('div');
  d.textContent = text;
  d.style.cssText = 'color:#f0e6cc;font-weight:700;margin:0 0 8px;font-size:15px;';
  return d;
}

function btn(label: string, color: string, enabled: boolean, onClick: () => void): HTMLElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.disabled = !enabled;
  b.style.cssText =
    `padding:5px 10px;border-radius:6px;border:1px solid #2a343b;font:600 11px system-ui;` +
    `color:${enabled ? color : '#667'};background:#1a1f25;${enabled ? 'cursor:pointer;' : 'cursor:default;opacity:0.6;'}`;
  if (enabled) b.addEventListener('click', onClick);
  return b;
}

/** Werkstatt: Ausrüstung (Slots) · Inventar (Tasche) · Kaufen. */
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
    'width:1000px;max-width:96vw;max-height:88vh;overflow:auto;';
  panel.appendChild(inner);
  document.body.appendChild(panel);

  let open = false;
  let slotFilter: SlotFilter = 'alle';

  function updateMoney(): void {
    money.textContent = `💰 ${h.getMoney()}   ·   MK ${h.getUnlockedMk()}`;
  }

  function refresh(): void {
    updateMoney();
    if (!open) return;
    const mk = h.getUnlockedMk();

    inner.innerHTML =
      `<div style="font-size:20px;font-weight:700;color:#f0e6cc">Werkstatt</div>` +
      `<div style="color:#9aa;margin:2px 0 14px">💰 ${h.getMoney()} · MK ${mk} freigeschaltet · [B] schließen</div>` +
      `<div style="display:flex;gap:18px;align-items:flex-start">` +
      `<div id="sh-equip" style="flex:1"></div>` +
      `<div id="sh-bag" style="flex:1"></div>` +
      `<div id="sh-buy" style="flex:1.15"></div></div>`;
    const equipCol = inner.querySelector('#sh-equip')!;
    const bagCol = inner.querySelector('#sh-bag')!;
    const buyCol = inner.querySelector('#sh-buy')!;

    // ---------- AUSRÜSTUNG (Slots) ----------
    equipCol.appendChild(colTitle('Ausrüstung'));
    for (const slot of SLOT_ORDER) {
      const it = h.getSlot(slot);
      const row = document.createElement('div');
      row.style.cssText =
        'border:1px solid #2a343b;border-radius:8px;padding:9px 11px;margin:6px 0;background:#1a1f25;';
      if (it) {
        row.innerHTML =
          `<div style="font-size:11px;color:#8aa">${SLOT_LABELS[slot]}</div>` +
          `<div><b>${it.name}</b> <span style="color:#9aa;font-size:12px">— ${statText(it)}</span></div>`;
        const ab = btn('Ablegen → Tasche', '#cdd6dd', true, () => {
          h.onUnequip(slot);
          refresh();
        });
        ab.style.marginTop = '6px';
        row.appendChild(ab);
      } else {
        row.style.borderStyle = 'dashed';
        row.innerHTML =
          `<div style="font-size:11px;color:#8aa">${SLOT_LABELS[slot]}</div>` +
          `<div style="color:#677">— leer —</div>`;
      }
      equipCol.appendChild(row);
    }

    // ---------- INVENTAR (Tasche) ----------
    const bag = h.getBag();
    bagCol.appendChild(colTitle(`Inventar (${bag.length})`));
    if (!bag.length) {
      const e = document.createElement('div');
      e.textContent = 'Tasche leer. Beute landet hier.';
      e.style.cssText = 'color:#778;padding:8px';
      bagCol.appendChild(e);
    }
    for (const it of bag) {
      const cur = h.getSlot(it.slot);
      const row = document.createElement('div');
      row.style.cssText =
        'border:1px solid #2a343b;border-radius:8px;padding:9px 11px;margin:6px 0;background:#1a1f25;';
      row.innerHTML =
        `<div><b>${it.name}</b></div>` +
        `<div style="color:#9aa;font-size:12px">${SLOT_LABELS[it.slot]} · ${statText(it)}${cmpVs(it, cur)}</div>`;
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
      actions.appendChild(btn('Anlegen', '#5fd06a', true, () => {
        h.onEquip(it);
        refresh();
      }));
      actions.appendChild(btn(`Verkaufen +💰${sellValue(it)}`, '#ffe08a', true, () => {
        h.onSell(it);
        refresh();
      }));
      row.appendChild(actions);
      bagCol.appendChild(row);
    }

    // ---------- KAUFEN ----------
    buyCol.appendChild(colTitle('Kaufen (Normale)'));
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
    for (const f of ['alle', ...SLOT_ORDER] as SlotFilter[]) {
      const active = slotFilter === f;
      bar.appendChild(
        btn(f === 'alle' ? 'Alle' : SLOT_LABELS[f], active ? '#1a1d22' : '#cdd6dd', true, () => {
          slotFilter = f;
          refresh();
        }),
      );
      if (active) (bar.lastChild as HTMLElement).style.background = '#d8b04a';
    }
    buyCol.appendChild(bar);

    const list = h.items
      .filter(
        (it) =>
          it.rarity === 'normal' &&
          it.mk <= mk + 1 &&
          (slotFilter === 'alle' || it.slot === slotFilter),
      )
      .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.mk - b.mk);

    for (const it of list) {
      const locked = it.mk > mk;
      const afford = h.getMoney() >= it.cost;
      const cur = h.getSlot(it.slot);
      const row = document.createElement('button');
      row.disabled = locked || !afford;
      row.style.cssText =
        'display:flex;justify-content:space-between;align-items:center;width:100%;margin:5px 0;' +
        'padding:9px 12px;border-radius:8px;border:1px solid #2a343b;text-align:left;color:#e8e0c8;' +
        `background:#1a1f25;${!locked && afford ? 'cursor:pointer;' : 'opacity:0.55;cursor:default;'}`;
      const right = locked ? `🔒 MK ${it.mk}` : `💰 ${it.cost}`;
      const rightColor = locked ? '#c98' : afford ? '#ffe08a' : '#e06a6a';
      row.innerHTML =
        `<span><b>${it.name}</b><br><span style="color:#9aa;font-size:12px">${statText(it)}${cmpVs(it, cur)}</span></span>` +
        `<span style="color:${rightColor};white-space:nowrap;margin-left:10px">${right}</span>`;
      if (!locked && afford) {
        row.addEventListener('click', () => {
          h.onBuy(it);
          refresh();
        });
      }
      buyCol.appendChild(row);
    }
    if (!list.length) {
      const none = document.createElement('div');
      none.textContent = 'Nichts in diesem Filter.';
      none.style.cssText = 'color:#778;padding:8px';
      buyCol.appendChild(none);
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
  return { toggle: () => setOpen(!open), isOpen: () => open, refresh, updateMoney };
}
