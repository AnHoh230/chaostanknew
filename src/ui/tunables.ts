/**
 * Zentrale Registry für live-stellbare Zahlen ("Magic Numbers"). Jeder Wert, der erst
 * durch Spielverhalten getestet werden muss, wird hier registriert und erscheint
 * automatisch im Tuning-HUD. `add()` liefert einen Live-Getter — Spielcode liest den
 * aktuellen Wert pro Frame. So skaliert das HUD von selbst mit beliebig vielen Reglern.
 */
export interface TunableSpec {
  key: string;
  label: string;
  category: string;
  value: number;
  def: number; // Ausgangswert (für „zurücksetzen")
  min: number;
  max: number;
  step: number;
}

export interface TunableInput {
  label: string;
  category: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange?: (v: number) => void; // optionaler Seiteneffekt (z. B. Kamera neu setzen)
}

export interface Tunables {
  /** Wert registrieren; gibt einen Live-Getter zurück. */
  add(input: TunableInput): () => number;
  list(): TunableSpec[];
  set(key: string, v: number): void;
  reset(key: string): void;
}

export function createTunables(): Tunables {
  const specs: TunableSpec[] = [];
  const cbs = new Map<string, (v: number) => void>();
  let seq = 0;

  function apply(key: string, v: number): void {
    const s = specs.find((x) => x.key === key);
    if (!s) return;
    s.value = Math.max(s.min, Math.min(s.max, v));
    cbs.get(key)?.(s.value);
  }

  return {
    add(input) {
      const key = `${input.category}::${input.label}::${seq++}`;
      const s: TunableSpec = {
        key, label: input.label, category: input.category,
        value: input.value, def: input.value,
        min: input.min, max: input.max, step: input.step ?? 1,
      };
      specs.push(s);
      if (input.onChange) cbs.set(key, input.onChange);
      return () => s.value;
    },
    list: () => specs.map((s) => ({ ...s })),
    set: (key, v) => apply(key, v),
    reset: (key) => {
      const s = specs.find((x) => x.key === key);
      if (s) apply(key, s.def);
    },
  };
}
