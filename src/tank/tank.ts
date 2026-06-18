import type { TankView } from './tankFactory';

export interface Tank {
  id: string;
  view: TankView;
  hp: number;
  maxHp: number;
}

export function createTank(id: string, view: TankView, maxHp: number): Tank {
  return {
    id,
    view,
    hp: maxHp,
    maxHp,
  };
}
