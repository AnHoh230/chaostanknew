/**
 * Reine Bewegungs-/Angriffsmuster für Gegner-Panzer. Jedes Muster liefert einen Zielpunkt
 * (wohin der Gegner steuert), einen Tempo-Faktor und einen Standoff (gewünschter Abstand
 * zum Spieler, ab dem er hält und feuert). Der KONTER gegen eine Spielweise entsteht hier —
 * über das Verhalten —, nicht über an den Spieler balancierte Kampfwerte.
 */
export type EnemyBehavior = 'closer' | 'flanker' | 'swarm' | 'disruptor' | 'blocker';

export interface BehaviorInput {
  ex: number; ez: number; // Gegner-Position
  px: number; pz: number; // Spieler-Position
  pvx: number; pvz: number; // Spieler-Geschwindigkeit (für blocker)
  standoff: number; // Bezugsabstand (i. d. R. Schussweite)
  phase: number; // 0..1 per-Gegner-Versatz (Orbit-Richtung / Schwarm-Streuung)
}

export interface BehaviorOutput {
  tx: number; tz: number; // Zielpunkt, zu dem sich der Gegner bewegt
  speedMul: number; // Faktor auf das Basis-Tempo
  standoff: number; // Distanz zum Spieler, ab der er nicht weiter ranfährt
}

/** Live-stellbare Verhaltens-Parameter (aus der Regler-Registry; Tests nutzen Defaults). */
export interface BehaviorTuning {
  closerSpeed(): number;
  flankerSpeed(): number;
  swarmSpeed(): number;
  disruptorSpeed(): number;
  blockerSpeed(): number;
  flankerOrbit(): number; // Orbit-Radius als Faktor auf standoff
  blockerLead(): number; // Vorhalt-Distanz vor dem Spieler
}

export const DEFAULT_BEHAVIOR_TUNING: BehaviorTuning = {
  closerSpeed: () => 1.4,
  flankerSpeed: () => 1.1,
  swarmSpeed: () => 0.9,
  disruptorSpeed: () => 1.8,
  blockerSpeed: () => 1.3,
  flankerOrbit: () => 0.85,
  blockerLead: () => 14,
};

const ORBIT_STEP = 0.25; // rad pro Auswertung, in die der Flanker um den Spieler wandert

export function behaviorTarget(
  b: EnemyBehavior,
  i: BehaviorInput,
  tuning: BehaviorTuning = DEFAULT_BEHAVIOR_TUNING,
): BehaviorOutput {
  switch (b) {
    case 'closer': // drängt auf kurze Distanz heran und hält dort (aggressives Duell)
      return { tx: i.px, tz: i.pz, speedMul: tuning.closerSpeed(), standoff: i.standoff * 0.5 };

    case 'disruptor': // stürmt am dichtesten ran, schnellster Typ — bestraft Stillstand
      return { tx: i.px, tz: i.pz, speedMul: tuning.disruptorSpeed(), standoff: i.standoff * 0.25 };

    case 'swarm': { // konvergiert leicht gestreut auf mittlere Distanz
      const a = i.phase * Math.PI * 2;
      const r = i.standoff * 0.4;
      return { tx: i.px + Math.cos(a) * r, tz: i.pz + Math.sin(a) * r, speedMul: tuning.swarmSpeed(), standoff: i.standoff * 0.7 };
    }

    case 'flanker': { // umkreist den Spieler an festem Radius (Seite/Rücken statt frontal)
      const dir = i.phase < 0.5 ? 1 : -1;
      const ang = Math.atan2(i.ez - i.pz, i.ex - i.px) + dir * ORBIT_STEP;
      const R = i.standoff * tuning.flankerOrbit();
      return { tx: i.px + Math.cos(ang) * R, tz: i.pz + Math.sin(ang) * R, speedMul: tuning.flankerSpeed(), standoff: 0 };
    }

    case 'blocker': { // stellt sich dem Vorstoß in den Weg (vor den Spieler, entlang seiner Bewegung)
      const pv = Math.hypot(i.pvx, i.pvz);
      const lead = tuning.blockerLead();
      if (pv > 0.1) {
        return { tx: i.px + (i.pvx / pv) * lead, tz: i.pz + (i.pvz / pv) * lead, speedMul: tuning.blockerSpeed(), standoff: i.standoff * 0.6 };
      }
      return { tx: i.px, tz: i.pz, speedMul: tuning.blockerSpeed(), standoff: i.standoff * 0.6 };
    }
  }
}
