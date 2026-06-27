/**
 * Gate 2 — Pacing-Simulation (Spec 5 §4/§12). Reiner Vorwärtslauf des echten Kompass-Moduls, um die
 * 5–10-Minuten-Häute MESSBAR zu machen — und um zu zeigen, ob der `roh`-Modus durchrauscht (→ Flip
 * auf `normalisiert`). Kein Gameplay, kein Zufall.
 */
import {
  createKompassState, kompassFreischalten, waehlePol, speiseImpuls, istPolGemaxt, verbrauche,
} from './kompass';
import { effektiverImpuls, FINISHER_EFFECTIVE_USES_TO_HARDEN, type ImpulsModus } from './evolutionTuning';

const LIMIT_S = 60 * 60; // 60-min-Sicherheitsabbruch

export interface PacingErgebnis {
  minutenBisPaarMax: number;
  minutenBisFuelFuerHaertung: number; // Fuel für FINISHER_EFFECTIVE_USES_TO_HARDEN T2-Zündungen
}

/**
 * Konstante Roh-Impulsrate. Steuerung: erst Befehl, dann Raum maxen (Pol-Paar); danach Fuel für
 * N wirksame T2-Zündungen (je 1 Fuel in beiden Polen), abwechselnd gefüllt + gefeuert (Cap-schonend).
 */
export function simuliere(rawRateProMin: number, modus: ImpulsModus = 'roh', dt = 1): PacingErgebnis {
  const s = createKompassState();
  kompassFreischalten(s);
  const ewma = rawRateProMin; // konstante Rate → EWMA == Rate
  const effProStep = effektiverImpuls((rawRateProMin / 60) * dt, ewma, modus);

  let t = 0;
  waehlePol(s, 'befehl');
  while (!istPolGemaxt(s, 'befehl') && t < LIMIT_S) { speiseImpuls(s, effProStep); t += dt; }
  waehlePol(s, 'raum');
  while (!istPolGemaxt(s, 'raum') && t < LIMIT_S) { speiseImpuls(s, effProStep); t += dt; }
  const minutenBisPaarMax = t / 60;

  const tFuelStart = t;
  let zuendungen = 0;
  let toggle = 0;
  while (zuendungen < FINISHER_EFFECTIVE_USES_TO_HARDEN && t < LIMIT_S) {
    waehlePol(s, toggle % 2 === 0 ? 'befehl' : 'raum');
    speiseImpuls(s, effProStep);
    t += dt; toggle += 1;
    if (s.pole.befehl.fuel >= 1 && s.pole.raum.fuel >= 1) {
      verbrauche(s, 'befehl', 1);
      verbrauche(s, 'raum', 1);
      zuendungen += 1;
    }
  }
  return { minutenBisPaarMax, minutenBisFuelFuerHaertung: (t - tFuelStart) / 60 };
}

/** Linear steigende Roh-Rate (start→end über 10 min). Liefert die Pol-Paar-Max-Zeit in Minuten. */
export function simuliereRampe(startRate: number, endRate: number, modus: ImpulsModus = 'roh', dt = 1): number {
  const s = createKompassState();
  kompassFreischalten(s);
  const rampeSek = 10 * 60;
  const rateBei = (tt: number): number => startRate + (endRate - startRate) * Math.min(1, tt / rampeSek);
  const schritt = (tt: number): number => effektiverImpuls((rateBei(tt) / 60) * dt, rateBei(tt), modus);

  let t = 0;
  waehlePol(s, 'befehl');
  while (!istPolGemaxt(s, 'befehl') && t < LIMIT_S) { speiseImpuls(s, schritt(t)); t += dt; }
  waehlePol(s, 'raum');
  while (!istPolGemaxt(s, 'raum') && t < LIMIT_S) { speiseImpuls(s, schritt(t)); t += dt; }
  return t / 60;
}
