import { describe, it, expect } from 'vitest';
import { createTunables } from './tunables';

describe('createTunables', () => {
  it('add liefert einen Live-Getter, set ändert den gelesenen Wert', () => {
    const t = createTunables();
    const get = t.add({ label: 'Heat-Anstieg', category: 'Doktrin', value: 25, min: 0, max: 50 });
    expect(get()).toBe(25);
    const key = t.list()[0]!.key;
    t.set(key, 40);
    expect(get()).toBe(40);
  });

  it('set klemmt auf min/max', () => {
    const t = createTunables();
    const get = t.add({ label: 'x', category: 'c', value: 5, min: 0, max: 10 });
    const key = t.list()[0]!.key;
    t.set(key, 99);
    expect(get()).toBe(10);
    t.set(key, -5);
    expect(get()).toBe(0);
  });

  it('onChange wird mit dem geklemmten Wert aufgerufen', () => {
    const t = createTunables();
    let seen = -1;
    t.add({ label: 'y', category: 'c', value: 1, min: 0, max: 3, onChange: (v) => { seen = v; } });
    t.set(t.list()[0]!.key, 9);
    expect(seen).toBe(3);
  });

  it('reset stellt den Ausgangswert wieder her', () => {
    const t = createTunables();
    const get = t.add({ label: 'z', category: 'c', value: 7, min: 0, max: 10 });
    const key = t.list()[0]!.key;
    t.set(key, 2);
    expect(get()).toBe(2);
    t.reset(key);
    expect(get()).toBe(7);
  });

  it('list trägt Kategorie für die HUD-Gruppierung', () => {
    const t = createTunables();
    t.add({ label: 'a', category: 'Kamera', value: 1, min: 0, max: 2 });
    t.add({ label: 'b', category: 'Kampf', value: 1, min: 0, max: 2 });
    expect(new Set(t.list().map((s) => s.category))).toEqual(new Set(['Kamera', 'Kampf']));
  });
});
