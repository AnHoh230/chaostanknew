import {
  emptyProfile, type PlayerStyleProfile,
  LONG_DIST, CLOSE_DIST, STATIONARY_SPEED, SAME_AREA_RADIUS,
} from './styleProfile';

/** Sammelt Kampfdaten über das aktuelle Puls-Fenster und liefert ein PlayerStyleProfile. */
export interface StyleTracker {
  onDamageDealt(d: { amount: number; fromAutoTurret: boolean }): void;
  onKill(d: { dist: number }): void;
  onMove(d: { speed: number; x: number; z: number; dt: number }): void;
  onDamageTaken(d: { amount: number; stationary: boolean }): void;
  onBoosterUsed(): void;
  /** Profil des Fensters berechnen UND alle Zähler zurücksetzen (Beginn nächstes Fenster). */
  snapshotAndReset(): PlayerStyleProfile;
}

export function createStyleTracker(): StyleTracker {
  let totalDmg = 0;
  let autoTurretDmg = 0;
  let kills = 0;
  let longKills = 0;
  let closeKills = 0;
  let totalTime = 0;
  let stationaryTime = 0;
  let speedTimeSum = 0;
  let boosterUsage = 0;
  let dmgTakenStationary = 0;
  let anchorX = 0;
  let anchorZ = 0;
  let hasAnchor = false;
  let areaTime = 0;
  let maxAreaTime = 0;

  function reset(): void {
    totalDmg = 0; autoTurretDmg = 0;
    kills = 0; longKills = 0; closeKills = 0;
    totalTime = 0; stationaryTime = 0; speedTimeSum = 0;
    boosterUsage = 0; dmgTakenStationary = 0;
    hasAnchor = false; areaTime = 0; maxAreaTime = 0;
  }

  return {
    onDamageDealt({ amount, fromAutoTurret }) {
      totalDmg += amount;
      if (fromAutoTurret) autoTurretDmg += amount;
    },
    onKill({ dist }) {
      kills++;
      if (dist > LONG_DIST) longKills++;
      if (dist < CLOSE_DIST) closeKills++;
    },
    onMove({ speed, x, z, dt }) {
      totalTime += dt;
      speedTimeSum += speed * dt;
      if (speed < STATIONARY_SPEED) stationaryTime += dt;
      // „in derselben Zone": Anker halten, Verweilzeit zählen, beim Verlassen neu ankern.
      if (!hasAnchor) { anchorX = x; anchorZ = z; hasAnchor = true; areaTime = 0; }
      if (Math.hypot(x - anchorX, z - anchorZ) <= SAME_AREA_RADIUS) {
        areaTime += dt;
        if (areaTime > maxAreaTime) maxAreaTime = areaTime;
      } else {
        anchorX = x; anchorZ = z; areaTime = 0;
      }
    },
    onDamageTaken({ amount, stationary }) {
      if (stationary) dmgTakenStationary += amount;
    },
    onBoosterUsed() {
      boosterUsage++;
    },
    snapshotAndReset(): PlayerStyleProfile {
      const p = emptyProfile();
      p.autoTurretDamageRatio = totalDmg > 0 ? autoTurretDmg / totalDmg : 0;
      p.stationaryRatio = totalTime > 0 ? stationaryTime / totalTime : 0;
      p.timeInSameArea = maxAreaTime;
      p.longRangeKillRatio = kills > 0 ? longKills / kills : 0;
      p.closeRangeKillRatio = kills > 0 ? closeKills / kills : 0;
      p.avgSpeed = totalTime > 0 ? speedTimeSum / totalTime : 0;
      p.boosterUsage = boosterUsage;
      p.damageTakenWhileStationary = dmgTakenStationary;
      reset();
      return p;
    },
  };
}
