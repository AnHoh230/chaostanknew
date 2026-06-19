import { describe, it, expect } from 'vitest';
import { revealLine, recognitionLine, archetypStil } from './revealText';
import { generateNamed } from './promotion';
import type { Akte } from './akte';

const named = generateNamed('knapper_sieg', () => 0.3);
const akte: Akte = {
  enemyId: 'e1', begegnungen: 1, siege: 1, niederlagen: 0, knappsterSieg: 0.14, archiviert: false, named,
};

describe('revealText', () => {
  it('Erstkontakt-Spruch enthält Name und den knappen Prozentwert', () => {
    const line = revealLine(named, akte);
    expect(line).toContain(named.name);
    expect(line).toContain('14%');
  });

  it('Wiedererkennung ist textlich verschieden vom Erstkontakt', () => {
    expect(recognitionLine(named, akte)).not.toBe(revealLine(named, akte));
  });

  it('der Rasende bekommt eine rote Charakterfarbe', () => {
    expect(archetypStil('der Rasende').farbe).toBe('#ff5a3c');
  });
});
