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

// Persistenz: Reglerwerte überleben einen Spiel-Neustart. Schlüssel über Kategorie+Label
// (stabil gegen Registrierungsreihenfolge). In Umgebungen ohne localStorage (Tests) no-op.
const storeKey = (category: string, label: string): string => `tune:${category}::${label}`;

function loadStored(category: string, label: string): number | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(storeKey(category, label));
    if (raw == null) return null;
    const v = Number(raw);
    return Number.isFinite(v) ? v : null;
  } catch { return null; }
}

function saveStored(category: string, label: string, v: number): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(storeKey(category, label), String(v));
  } catch { /* Speicher voll/blockiert → still ignorieren */ }
}

export function createTunables(): Tunables {
  const specs: TunableSpec[] = [];
  const cbs = new Map<string, (v: number) => void>();
  let seq = 0;

  function apply(key: string, v: number, persist = true): void {
    const s = specs.find((x) => x.key === key);
    if (!s) return;
    s.value = Math.max(s.min, Math.min(s.max, v));
    if (persist) saveStored(s.category, s.label, s.value);
    cbs.get(key)?.(s.value);
  }

  return {
    add(input) {
      const key = `${input.category}::${input.label}::${seq++}`;
      const stored = loadStored(input.category, input.label);
      const clamp = (v: number) => Math.max(input.min, Math.min(input.max, v));
      const initial = stored != null ? clamp(stored) : input.value;
      const s: TunableSpec = {
        key, label: input.label, category: input.category,
        value: initial, def: input.value, // def = Code-Standard (Ziel von „zurücksetzen")
        min: input.min, max: input.max, step: input.step ?? 1,
      };
      specs.push(s);
      if (input.onChange) {
        cbs.set(key, input.onChange);
        if (stored != null) input.onChange(initial); // gespeicherten Wert beim Laden anwenden
      }
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
