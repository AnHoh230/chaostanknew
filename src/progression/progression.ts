export const MAX_LEVEL = 20;
export const MAX_MK = 10;

/** EXP bis zum nächsten Level (Formel aus der Progressions-Datei, auf 10 gerundet). */
export function xpToNextLevel(level: number): number {
  const raw = 100 + 75 * Math.pow(level, 1.55) + 35 * (level - 1);
  return Math.round(raw / 10) * 10;
}

/** Freigeschaltete MK-Stufe für ein Level: alle 2 Level eine neue Stufe. */
export function unlockedMkForLevel(level: number): number {
  return Math.min(MAX_MK, Math.floor((level + 1) / 2));
}

export interface LevelUpInfo {
  gained: number; // wie viele Level aufgestiegen
  newMkUnlocks: number[]; // neu freigeschaltete MK-Stufen
}

export interface Progression {
  level: number;
  xp: number; // EXP im aktuellen Level
  addXp(n: number): LevelUpInfo;
  xpToNext(): number;
  unlockedMk(): number;
}

export function createProgression(startLevel = 1): Progression {
  const state = {
    level: startLevel,
    xp: 0,
    addXp(n: number): LevelUpInfo {
      let gained = 0;
      const newMkUnlocks: number[] = [];
      state.xp += n;
      while (state.level < MAX_LEVEL && state.xp >= xpToNextLevel(state.level)) {
        const mkBefore = unlockedMkForLevel(state.level);
        state.xp -= xpToNextLevel(state.level);
        state.level += 1;
        gained += 1;
        const mkAfter = unlockedMkForLevel(state.level);
        if (mkAfter > mkBefore) newMkUnlocks.push(mkAfter);
      }
      if (state.level >= MAX_LEVEL) state.xp = 0; // Max: kein Überlauf
      return { gained, newMkUnlocks };
    },
    xpToNext(): number {
      return state.level >= MAX_LEVEL ? 0 : xpToNextLevel(state.level);
    },
    unlockedMk(): number {
      return unlockedMkForLevel(state.level);
    },
  };
  return state;
}
