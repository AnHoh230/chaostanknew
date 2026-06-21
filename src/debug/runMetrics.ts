/**
 * Run-Diagnostik: sammelt während eines Runs die Kennzahlen, an denen man Schieflagen
 * SIEHT, und liefert pro Intervall einen kompakten Snapshot fürs Log. Damit lässt sich
 * nach dem Spielen ablesen, WAS schiefläuft + ob die reaktive Taktik zum Spielverhalten passt:
 *  - „stirbt zu schnell" → dpsIn, hpPct, surv, deaths
 *  - „killt nix"         → kills, kpm, dpsOut, acc, shots/sps (Angriffsrate)
 *  - „zu langsam"        → spd; „wo steht er?" → px/pz
 *  - „zu viele Gegner"   → alive, peak, target, spawns
 *  - Konter passt?       → types{} je Typ: lebend/gespawnt/gekillt/Ø-Leben/Schaden-am-Spieler
 * Reine Logik (keine Zeit-/DOM-Abhängigkeit): Zeit kommt über die summierten dt.
 */
export interface MetricsState {
  alive: number;
  target: number;
  hp: number;
  hpMax: number;
  geld: number;
  level: number;
  mk: number;
  px: number; // Spieler-Position (wo wird gekämpft)
  pz: number;
  heat: Record<string, number>; // Richtung → Heat
  mix: Record<string, number>; // Typ → lebende Anzahl
}

/** Pro Gegner-Typ: n=lebend, sp=gespawnt(kum), k=gekillt(kum), life=Ø-Lebensdauer s, dmg=Schaden am Spieler(kum). */
export interface TypeStat {
  n: number;
  sp: number;
  k: number;
  life: number;
  dmg: number;
}

export interface RunSnapshot {
  t: number;
  alive: number;
  peak: number;
  target: number;
  spawns: number;
  hp: number;
  hpPct: number;
  spd: number;
  px: number;
  pz: number;
  surv: number;
  deaths: number;
  kills: number;
  kpm: number;
  shots: number; // Schüsse im Intervall
  sps: number; // Schüsse/s (Intervall) — Angriffsrate
  dpsOut: number;
  dpsIn: number;
  acc: number;
  geld: number;
  level: number;
  mk: number;
  heat: Record<string, number>;
  types: Record<string, TypeStat>;
}

export interface RunMetrics {
  onShot(): void;
  onHitDealt(dmg: number): void;
  onDamageTaken(dmg: number, byType?: string): void;
  onKill(typeId: string, lifeSec: number): void;
  onDeath(): void;
  onSpawn(typeId: string): void;
  frame(dt: number, speed: number, alive: number): void;
  takeSnapshot(state: MetricsState): RunSnapshot;
  /** Typ, der dem Spieler zuletzt Schaden zufügte (für die Tod-Ursache). */
  lastDamager(): string;
}

const r1 = (v: number): number => Math.round(v * 10) / 10;
const inc = (m: Record<string, number>, k: string, v = 1): void => { m[k] = (m[k] ?? 0) + v; };

export function createRunMetrics(): RunMetrics {
  // kumuliert über den ganzen Run
  let totalTime = 0, totalKills = 0, totalDeaths = 0, totalShots = 0, totalHits = 0;
  let sinceDeath = 0;
  let lastDamagerType = '';
  const spawnsByType: Record<string, number> = {};
  const killsByType: Record<string, number> = {};
  const lifeSumByType: Record<string, number> = {};
  const dmgInByType: Record<string, number> = {};
  // pro Intervall (Reset bei takeSnapshot)
  let iTime = 0, iSpeedSum = 0, iPeak = 0, iSpawns = 0, iKills = 0, iShots = 0, iDmgOut = 0, iDmgIn = 0;

  return {
    onShot() { totalShots += 1; iShots += 1; },
    onHitDealt(dmg) { totalHits += 1; iDmgOut += dmg; },
    onDamageTaken(dmg, byType) { iDmgIn += dmg; if (byType) { inc(dmgInByType, byType, dmg); lastDamagerType = byType; } },
    onKill(typeId, lifeSec) { totalKills += 1; iKills += 1; inc(killsByType, typeId); inc(lifeSumByType, typeId, lifeSec); },
    onDeath() { totalDeaths += 1; sinceDeath = 0; },
    onSpawn(typeId) { iSpawns += 1; inc(spawnsByType, typeId); },
    frame(dt, speed, alive) {
      if (dt <= 0) return;
      totalTime += dt; iTime += dt; sinceDeath += dt;
      iSpeedSum += speed * dt;
      if (alive > iPeak) iPeak = alive;
    },
    lastDamager: () => lastDamagerType,
    takeSnapshot(state) {
      const keys = new Set<string>([
        ...Object.keys(state.mix), ...Object.keys(spawnsByType),
        ...Object.keys(killsByType), ...Object.keys(dmgInByType),
      ]);
      const types: Record<string, TypeStat> = {};
      for (const k of keys) {
        const killed = killsByType[k] ?? 0;
        types[k] = {
          n: state.mix[k] ?? 0,
          sp: spawnsByType[k] ?? 0,
          k: killed,
          life: killed > 0 ? r1((lifeSumByType[k] ?? 0) / killed) : 0,
          dmg: Math.round(dmgInByType[k] ?? 0),
        };
      }
      const snap: RunSnapshot = {
        t: Math.round(totalTime),
        alive: state.alive,
        peak: Math.max(iPeak, state.alive),
        target: state.target,
        spawns: iSpawns,
        hp: Math.round(state.hp),
        hpPct: state.hpMax > 0 ? Math.round((state.hp / state.hpMax) * 100) : 0,
        spd: iTime > 0 ? r1(iSpeedSum / iTime) : 0,
        px: Math.round(state.px),
        pz: Math.round(state.pz),
        surv: Math.round(sinceDeath),
        deaths: totalDeaths,
        kills: iKills,
        kpm: totalTime > 0 ? r1((totalKills / totalTime) * 60) : 0,
        shots: iShots,
        sps: iTime > 0 ? r1(iShots / iTime) : 0,
        dpsOut: iTime > 0 ? r1(iDmgOut / iTime) : 0,
        dpsIn: iTime > 0 ? r1(iDmgIn / iTime) : 0,
        acc: totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0,
        geld: state.geld,
        level: state.level,
        mk: state.mk,
        heat: state.heat,
        types,
      };
      // Intervall zurücksetzen (Peak startet beim aktuellen Stand)
      iTime = 0; iSpeedSum = 0; iPeak = state.alive; iSpawns = 0; iKills = 0; iShots = 0; iDmgOut = 0; iDmgIn = 0;
      return snap;
    },
  };
}
