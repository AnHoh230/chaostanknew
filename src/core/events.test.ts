import { describe, it, expect, vi } from 'vitest';
import { createBus } from './events';

describe('createBus', () => {
  it('liefert typisiertes Payload DIREKT (kein Wrapping)', () => {
    const bus = createBus();
    const fn = vi.fn();
    bus.on('tank.fired', fn);
    bus.emit('tank.fired', { tankId: 't1' });
    expect(fn).toHaveBeenCalledWith({ tankId: 't1' });
  });

  it('ruft mehrere Listener desselben Events auf', () => {
    const bus = createBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('projectile.spawned', a);
    bus.on('projectile.spawned', b);
    bus.emit('projectile.spawned', { id: 'p1' });
    expect(a).toHaveBeenCalledWith({ id: 'p1' });
    expect(b).toHaveBeenCalledWith({ id: 'p1' });
  });

  it('liefert nur an passenden Event-Key aus', () => {
    const bus = createBus();
    const spawned = vi.fn();
    const consumed = vi.fn();
    bus.on('projectile.spawned', spawned);
    bus.on('projectile.consumed', consumed);
    bus.emit('projectile.spawned', { id: 'p2' });
    expect(spawned).toHaveBeenCalledTimes(1);
    expect(consumed).not.toHaveBeenCalled();
  });

  it('on gibt eine unsubscribe-Funktion zurück', () => {
    const bus = createBus();
    const fn = vi.fn();
    const off = bus.on('tank.fired', fn);
    off();
    bus.emit('tank.fired', { tankId: 't2' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('unsubscribe entfernt nur den eigenen Listener', () => {
    const bus = createBus();
    const a = vi.fn();
    const b = vi.fn();
    const offA = bus.on('tank.fired', a);
    bus.on('tank.fired', b);
    offA();
    bus.emit('tank.fired', { tankId: 't3' });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith({ tankId: 't3' });
  });

  it('emit ohne Listener ist ein No-Op', () => {
    const bus = createBus();
    expect(() => bus.emit('projectile.consumed', { id: 'p3' })).not.toThrow();
  });
});
