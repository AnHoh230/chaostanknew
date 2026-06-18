import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, logConfig } from './log';

describe('createLogger gate', () => {
  beforeEach(() => {
    logConfig.enabled = true;
    logConfig.minLevel = 'debug';
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routet auf natives console.* mit Format [level][channel] msg', () => {
    const log = createLogger('net');
    log.info('hello');
    expect(console.info).toHaveBeenCalledWith('[info][net] hello');
  });

  it('reicht optionale Daten durch', () => {
    const log = createLogger('net');
    const data = { x: 1 };
    log.warn('oops', data);
    expect(console.warn).toHaveBeenCalledWith('[warn][net] oops', data);
  });

  it('gibt nichts aus wenn enabled=false', () => {
    logConfig.enabled = false;
    const log = createLogger('net');
    log.error('nope');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('unterdrückt Level unterhalb minLevel', () => {
    logConfig.minLevel = 'warn';
    const log = createLogger('net');
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('[warn][net] w');
    expect(console.error).toHaveBeenCalledWith('[error][net] e');
  });

  it('Default-Config ist enabled=true, minLevel=debug', () => {
    expect(logConfig.enabled).toBe(true);
    expect(logConfig.minLevel).toBe('debug');
  });
});
