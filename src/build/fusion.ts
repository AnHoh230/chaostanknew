/**
 * Gate 7 — Fusion / Systemform (Spec 4 + Spec 5 §11). Reine Logik.
 * Fusion ist 3-stufig, getaktet am Level des DRITTEN Pols (nicht an "≥2 Paare" — das wäre identisch
 * mit "alle 3 gemaxt"). Systemform = alle 3 Pole gemaxt + Systembruch geschmiedet. Das System-Edikt
 * läuft über ein Puls-BUDGET (max EDIKT_MAX_PULSES je Fenster), nie pro Frame.
 */
import type { Pol } from './buildModell';
import { ALLE_POLE } from './buildModell';
import type { KompassState } from './kompass';
import { type EvolutionState, paarPole } from './evolution';
import type { FinisherState } from './finisher';
import { EDIKT_DAUER_SECONDS, EDIKT_COOLDOWN_SECONDS, EDIKT_TICK_SECONDS, EDIKT_MAX_PULSES } from './evolutionTuning';

export type FusionStufe = 'keine' | 'preview' | 'phase' | 'systemform';

/** Systemform reif: alle drei Pole gemaxt UND Systembruch geschmiedet (Spec 5 §11). */
export function systemformReif(kompass: KompassState, finisher: FinisherState): boolean {
  return ALLE_POLE.every((p) => kompass.pole[p].reachedMax) && finisher.aktiv.includes('systembruch');
}

/** Der dritte Pol = der, der NICHT im ersten gemeisterten Paar steckt. null ohne gemeistertes Paar. */
function dritterPol(evo: EvolutionState): Pol | null {
  if (evo.gemeistertePaare.length === 0) return null;
  const paar = paarPole(evo.gemeistertePaare[0]!);
  return ALLE_POLE.find((p) => !paar.includes(p)) ?? null;
}

/** Fusionsstufe — getaktet am Level des dritten Pols (Spec 5 §11). */
export function fusionStufe(evo: EvolutionState, kompass: KompassState, finisher: FinisherState): FusionStufe {
  if (systemformReif(kompass, finisher)) return 'systemform';
  const dritter = dritterPol(evo);
  if (!dritter) return 'keine';
  const lvl = kompass.pole[dritter].level;
  if (lvl >= 3) return 'phase';
  if (lvl >= 1) return 'preview';
  return 'keine';
}

export interface EdiktState {
  fenster: number; // s offen (0 = zu)
  cd: number; // s bis zum nächsten Auto-Edikt
  pulse: number; // verbrauchte Pulse im laufenden Fenster
  pulsTimer: number;
}

export function createEdiktState(): EdiktState {
  return { fenster: 0, cd: 0, pulse: 0, pulsTimer: 0 };
}

export function ediktOffen(s: EdiktState): boolean {
  return s.fenster > 0;
}

/** Edikt manuell öffnen — nur wenn zu UND kein Cooldown läuft. */
export function invoziere(s: EdiktState): boolean {
  if (s.fenster > 0 || s.cd > 0) return false;
  s.fenster = EDIKT_DAUER_SECONDS;
  s.pulse = 0;
  s.pulsTimer = 0;
  return true;
}

/**
 * Edikt um dt weiterzählen. Liefert die Anzahl FÄLLIGER Pulse diesen Tick (gedeckelt auf
 * EDIKT_MAX_PULSES je Fenster). Schließt nach EDIKT_DAUER (setzt Cooldown). `autoLoop` (nach
 * Verhärtung) öffnet nach Ablauf des Cooldowns automatisch erneut.
 */
export function tickEdikt(s: EdiktState, dt: number, autoLoop = false): number {
  let faellig = 0;
  if (s.fenster > 0) {
    s.pulsTimer += dt;
    while (s.pulsTimer >= EDIKT_TICK_SECONDS && s.pulse < EDIKT_MAX_PULSES) {
      s.pulsTimer -= EDIKT_TICK_SECONDS;
      s.pulse += 1;
      faellig += 1;
    }
    s.fenster = Math.max(0, s.fenster - dt);
    if (s.fenster === 0) s.cd = EDIKT_COOLDOWN_SECONDS;
  } else if (s.cd > 0) {
    s.cd = Math.max(0, s.cd - dt);
    if (s.cd === 0 && autoLoop) invoziere(s);
  }
  return faellig;
}
