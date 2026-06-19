export interface ChassisState {
  heading: number; // Radiant; 0 = +Z (Wanne zeigt nach vorn)
  velocity: number; // Welt-Einheiten/s; >0 vorwärts, <0 rückwärts
}

export interface ChassisInput {
  throttle: number; // +1 W, -1 S, 0 keins/beide (W+S = bremsen)
  steer: number; // +1 D, -1 A, 0 keins/beide
}

export interface ChassisConfig {
  maxForward: number;
  maxReverse: number;
  accel: number;
  reverseAccel: number;
  brake: number;
  friction: number;
  deadzone: number; // Geschwindigkeitsband um 0, in dem Richtungswechsel erlaubt ist
  turnStanding: number; // Drehrate (rad/s) im Stand
  turnSlow: number;
  turnFast: number;
  reverseTurnMod: number;
  brakeTurnMod: number;
  slowSpeed: number; // |v| Schwelle Stand→langsam
  fastSpeed: number; // |v| Schwelle langsam→schnell
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}
function moveToward(v: number, target: number, maxDelta: number): number {
  const d = target - v;
  if (Math.abs(d) <= maxDelta) return target;
  return v + Math.sign(d) * maxDelta;
}

/**
 * Ein Schritt schwere Panzer-Steuerung (Spec): erst bremsen, dann Gegenrichtung
 * (kein Sofort-Flip); Lenkung schwächer bei hoher Geschwindigkeit und beim Bremsen.
 */
export function stepChassis(
  s: ChassisState,
  input: ChassisInput,
  cfg: ChassisConfig,
  dt: number,
): ChassisState {
  let v = s.velocity;
  const th = input.throttle;
  let directionChanging = false;

  // Richtungswechsel nur über Bremsen.
  if (th > 0 && v < -cfg.deadzone) {
    v += cfg.brake * dt;
    directionChanging = true;
  } else if (th < 0 && v > cfg.deadzone) {
    v -= cfg.brake * dt;
    directionChanging = true;
  } else if (th > 0) {
    v += cfg.accel * dt;
  } else if (th < 0) {
    v -= cfg.reverseAccel * dt;
  } else {
    v = moveToward(v, 0, cfg.friction * dt); // ausrollen
  }
  v = clamp(v, -cfg.maxReverse, cfg.maxForward);

  // Drehrate nach Geschwindigkeitszustand.
  const av = Math.abs(v);
  let turn = av < cfg.slowSpeed ? cfg.turnStanding : av < cfg.fastSpeed ? cfg.turnSlow : cfg.turnFast;
  if (v < -cfg.deadzone) turn *= cfg.reverseTurnMod;
  if (directionChanging) turn *= cfg.brakeTurnMod;

  return { heading: s.heading + input.steer * turn * dt, velocity: v };
}

/** Vorwärts-Vektor der Wanne (XZ) aus dem Heading. */
export function chassisForward(heading: number): { x: number; z: number } {
  return { x: Math.sin(heading), z: Math.cos(heading) };
}
