/**
 * Globaler UI-Skalierungsfaktor fürs DOM-HUD. Feste px-Größen werden auf großen/
 * hochauflösenden Displays sonst winzig. Wir setzen eine CSS-Variable `--ui-scale`
 * und skalieren HUD-Elemente per Anker-Klasse (transform: scale(var(--ui-scale))
 * mit passendem transform-origin je Bildschirm-Ecke). Das fasst pointer-events NICHT
 * an (keine toten Klicks) und respektiert welt-projizierte/cursor-gebundene Positionen.
 *
 * Basislinie 1080p Höhe = scale 1 → für Standard-Auflösungen ändert sich nichts,
 * größere Displays werden hochskaliert (4K ≈ 2.0, gegen Extreme geclampt).
 */
export const UI_BASELINE_H = 1080;
export const UI_SCALE_MIN = 1.0;
export const UI_SCALE_MAX = 2.2;

/** Viewport-Höhe (CSS-px) → UI-Skalierungsfaktor. Reine Funktion (TDD). */
export function computeUiScale(viewportHeight: number, baseline = UI_BASELINE_H): number {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return UI_SCALE_MIN;
  const raw = viewportHeight / baseline;
  return Math.max(UI_SCALE_MIN, Math.min(UI_SCALE_MAX, raw));
}

/**
 * Anker-Klassen + `--ui-scale` einmalig in den <head> injizieren und auf die
 * Viewport-Größe binden (Erst-Anwendung + resize). HUD-Elemente bekommen je nach
 * Bildschirm-Ecke eine dieser Klassen:
 *   hud-tl/tr/bl/br  – an einer Ecke verankert (origin = diese Ecke)
 *   hud-tc           – oben zentriert (Toasts)        [ersetzt translateX(-50%)]
 *   hud-cc           – bildschirmmittig / cursor-gebunden [ersetzt translate(-50%,-50%)]
 *   hud-bar          – welt-projizierter Schwebebalken [ersetzt translate(-50%,-100%)]
 * Bei Elementen mit bestehendem inline-`transform` muss dieses entfernt werden
 * (die Klasse enthält es jetzt inkl. scale) — sonst gewinnt der inline-Style.
 */
export function installUiScale(): void {
  if (typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.id = 'ui-scale-styles';
  style.textContent = [
    ':root{--ui-scale:1}',
    '.hud-tl{transform:scale(var(--ui-scale));transform-origin:top left}',
    '.hud-tr{transform:scale(var(--ui-scale));transform-origin:top right}',
    '.hud-bl{transform:scale(var(--ui-scale));transform-origin:bottom left}',
    '.hud-br{transform:scale(var(--ui-scale));transform-origin:bottom right}',
    '.hud-tc{transform:translateX(-50%) scale(var(--ui-scale));transform-origin:top center}',
    '.hud-bc{transform:translateX(-50%) scale(var(--ui-scale));transform-origin:bottom center}',
    '.hud-cc{transform:translate(-50%,-50%) scale(var(--ui-scale));transform-origin:center}',
    '.hud-bar{transform:translate(-50%,-100%) scale(var(--ui-scale));transform-origin:50% 100%}',
    // margin-zentrierte, cursor-gebundene Elemente (Fadenkreuz/Marken): nur skalieren,
    // KEIN translate (die margin zentriert bereits) — origin center hält den Cursor-Punkt fix.
    '.hud-c{transform:scale(var(--ui-scale));transform-origin:center}',
  ].join('\n');
  document.head.appendChild(style);

  const apply = (): void => {
    document.documentElement.style.setProperty('--ui-scale', String(computeUiScale(window.innerHeight)));
  };
  apply();
  window.addEventListener('resize', apply);
}
