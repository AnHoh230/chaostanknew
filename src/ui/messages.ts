/**
 * Spieler-Meldungen aus EINER Quelle, drei Kanäle — ersetzt den alten Einzel-Toast.
 *
 *  • feedback  – flüchtiges Juice-Feedback (Kills, HP, Ernte …): kurzer Toast,
 *                unten-zentriert, GESTAPELT. Mehrere sind gleichzeitig sichtbar;
 *                keiner wird vom nächsten überschrieben. (Alter Bug: EIN einziges
 *                <div> + je Aufruf ein eigener setTimeout, der spätere Toasts früh
 *                abschoss — gleichzeitige Meldungen waren faktisch unlesbar.)
 *  • teach     – Mechanik/Freischaltung/Entscheidung (neue Steuerung, Evolution,
 *                Bauplan-Fund …): prominentes Banner oben-zentriert, deutlich
 *                länger sichtbar, optional `hold` (bleibt bis zum nächsten Banner
 *                stehen — z. B. der [B]/[N]-Entscheid).
 *  • log       – JEDE Meldung wandert in einen Ring-Puffer; [L] öffnet das
 *                Nachlese-Panel. Schließt genau die Lücke „zu schnell weg, nicht
 *                mehr nachlesbar".
 *
 * Lebensdauer wird per update(dt) in ECHTZEIT-Sekunden getickt (Loop ruft mit
 * realDt). Bei Pause (simSpeed 0 → dt 0) frieren Toasts/Banner ein, statt unter
 * einem offenen Panel davonzulaufen.
 */
export type MsgTier = 'feedback' | 'teach';

export interface Messages {
  /** Meldung zeigen. tier 'teach' → Banner (+ optional hold); sonst Feedback-Toast. Immer geloggt. */
  toast(msg: string, color?: string, opts?: { tier?: MsgTier; hold?: boolean }): void;
  toggleLog(): boolean; // neuer Offen-Zustand
  closeLog(): void;
  isLogOpen(): boolean;
  update(dt: number): void; // dt in Echtzeit-Sekunden
  dispose(): void;
}

const MAX_TOASTS = 4; // gleichzeitig sichtbare Feedback-Toasts; ältester weicht früh
const LOG_MAX = 24; // Tiefe des Nachlese-Puffers
const FADE_MS = 350; // muss zur CSS-opacity-transition unten passen

/**
 * Anzeigedauer in Sekunden, an die Textlänge gekoppelt — kurze Quittungen blitzen,
 * ganze Sätze (gerade Lern-Banner mit Tasten) bleiben lesbar lange stehen. Reine
 * Funktion → testbar ohne DOM.
 */
export function durationFor(len: number, tier: MsgTier): number {
  return tier === 'teach'
    ? Math.min(8.5, Math.max(4.5, 3.5 + len * 0.06))
    : Math.min(4.5, Math.max(2.2, 1.6 + len * 0.05));
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

interface LiveToast {
  el: HTMLElement;
  life: number;
}
interface LogEntry {
  text: string;
  color: string;
  tier: MsgTier;
  at: number;
}

export function createMessages(): Messages {
  // Feedback-Stapel: unten-zentriert, wächst nach oben (neuester unten, nahe am HUD).
  const stack = document.createElement('div');
  stack.id = 'msg-stack';
  stack.className = 'hud-bc'; // UI-Scale: unten-zentriert über Munitions-/Befehls-HUD
  stack.style.cssText =
    'position:fixed;left:50%;bottom:calc(124px * var(--ui-scale));z-index:22;pointer-events:none;' +
    'display:flex;flex-direction:column;align-items:center;gap:6px;width:max-content;max-width:62vw;';
  document.body.appendChild(stack);

  // Teach-Banner: oben-zentriert, prominent, EIN Slot. top:88px hält es unter Scope-Badge + Skill-Hinweis.
  const banner = document.createElement('div');
  banner.id = 'msg-banner';
  banner.className = 'hud-tc'; // UI-Scale: oben-zentriert
  banner.style.cssText =
    'position:fixed;left:50%;top:calc(88px * var(--ui-scale));z-index:24;pointer-events:none;' +
    'font:800 23px system-ui,sans-serif;color:#ffe08a;background:rgba(10,12,16,0.9);' +
    'padding:12px 26px;border-radius:10px;border:2px solid #ffe08a;text-align:center;max-width:70vw;' +
    'opacity:0;transition:opacity 0.3s;text-shadow:0 1px 4px #000;box-shadow:0 0 22px rgba(0,0,0,0.5);';
  document.body.appendChild(banner);

  // Nachlese-Log: rechts angedockt, scrollbar; [L] schaltet sichtbar (Welt pausiert wird im Loop gemacht).
  const logPanel = document.createElement('div');
  logPanel.id = 'msg-log';
  logPanel.className = 'hud-tr'; // UI-Scale: oben-rechts
  logPanel.style.cssText =
    'position:fixed;right:16px;top:calc(72px * var(--ui-scale));z-index:60;display:none;' +
    'width:360px;max-height:62vh;overflow-y:auto;pointer-events:auto;' +
    'background:rgba(6,9,12,0.94);border:1px solid #2a343b;border-radius:10px;padding:10px 12px;' +
    'font:600 13px system-ui,sans-serif;color:#cdd6dd;text-shadow:0 1px 2px #000;box-shadow:0 6px 24px rgba(0,0,0,0.5);';
  document.body.appendChild(logPanel);

  const live: LiveToast[] = [];
  const log: LogEntry[] = [];
  let bannerLife = 0; // >0 sichtbar; Infinity = hold (bleibt bis zum nächsten Banner)
  let now = 0; // Echtzeit-Sekunden seit Start — Basis für „vor Xs" im Log
  let logOpen = false;
  let taughtLog = false; // den [L]-Hinweis genau einmal einblenden

  function renderLog(): void {
    const head =
      '<div style="font:800 14px system-ui,sans-serif;color:#9be36b;margin:-2px 0 8px;position:sticky;top:-10px;' +
      'background:rgba(6,9,12,0.98);padding:4px 0">📜 Meldungen ' +
      '<span style="color:#5d6b6f;font-weight:600;font-size:12px">[L] schließen</span></div>';
    if (!log.length) {
      logPanel.innerHTML = head + '<div style="color:#7a8a86">— noch nichts —</div>';
      return;
    }
    const rows = [...log]
      .reverse()
      .map((e) => {
        const secs = Math.max(0, Math.round(now - e.at));
        const teach = e.tier === 'teach';
        const accent = teach ? `border-left:3px solid ${e.color};padding-left:7px;` : 'padding-left:10px;';
        return (
          `<div style="margin:4px 0;${accent}">` +
          `<span style="color:${e.color};font-weight:${teach ? 800 : 600}">${teach ? '◆ ' : ''}${escapeHtml(e.text)}</span>` +
          ` <span style="color:#5d6b6f;font-weight:600">· vor ${secs}s</span>` +
          `</div>`
        );
      })
      .join('');
    logPanel.innerHTML = head + rows;
  }

  function pushLog(text: string, color: string, tier: MsgTier): void {
    log.push({ text, color, tier, at: now });
    if (log.length > LOG_MAX) log.shift();
    if (logOpen) renderLog();
  }

  function showBanner(msg: string, color: string, hold: boolean): void {
    banner.textContent = msg;
    banner.style.color = color;
    banner.style.borderColor = color;
    banner.style.opacity = '1';
    bannerLife = hold ? Infinity : durationFor(msg.length, 'teach');
  }

  function showFeedback(msg: string, color: string): void {
    if (live.length >= MAX_TOASTS) {
      const old = live.shift()!; // ältesten sichtbaren früh wegnehmen, damit der Stapel atmet
      old.el.remove();
    }
    const el = document.createElement('div');
    el.style.cssText =
      `font:700 19px system-ui,sans-serif;color:${color};background:rgba(8,10,12,0.8);` +
      'padding:7px 16px;border-radius:8px;text-align:center;text-shadow:0 1px 3px #000;' +
      'opacity:0;transition:opacity 0.3s;';
    el.textContent = msg;
    stack.appendChild(el); // neuester landet unten im Stapel (flex column)
    requestAnimationFrame(() => (el.style.opacity = '1')); // im Folgeframe einblenden → Transition greift
    live.push({ el, life: durationFor(msg.length, 'feedback') });
  }

  function toast(msg: string, color = '#ffe08a', opts?: { tier?: MsgTier; hold?: boolean }): void {
    const tier = opts?.tier ?? 'feedback';
    pushLog(msg, color, tier);
    if (tier === 'teach') showBanner(msg, color, opts?.hold ?? false);
    else showFeedback(msg, color);
    if (tier === 'teach' && !taughtLog) {
      taughtLog = true; // beim ersten Lern-Banner den neuen Nachlese-Kanal selbst beibringen
      showFeedback('📜 [L] öffnet das Meldungs-Log zum Nachlesen', '#9be36b');
    }
  }

  function update(dt: number): void {
    if (dt <= 0) return; // Pause: alles friert ein (Log/Inspect/Skill offen oder Tod)
    now += dt;
    if (bannerLife !== Infinity && bannerLife > 0) {
      bannerLife -= dt;
      if (bannerLife <= 0) {
        bannerLife = 0;
        banner.style.opacity = '0';
      }
    }
    for (let i = live.length - 1; i >= 0; i--) {
      const t = live[i]!;
      t.life -= dt;
      if (t.life <= 0) {
        const el = t.el;
        el.style.opacity = '0';
        setTimeout(() => el.remove(), FADE_MS); // nur DOM-Aufräumen nach dem Ausblenden
        live.splice(i, 1);
      }
    }
  }

  function toggleLog(): boolean {
    logOpen = !logOpen;
    logPanel.style.display = logOpen ? 'block' : 'none';
    if (logOpen) {
      logPanel.scrollTop = 0;
      renderLog();
    }
    return logOpen;
  }
  function closeLog(): void {
    logOpen = false;
    logPanel.style.display = 'none';
  }
  function isLogOpen(): boolean {
    return logOpen;
  }
  function dispose(): void {
    stack.remove();
    banner.remove();
    logPanel.remove();
    live.length = 0;
  }

  return { toast, toggleLog, closeLog, isLogOpen, update, dispose };
}
