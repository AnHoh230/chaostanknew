export type SocketName = 'chassis' | 'wheels' | 'turret' | 'weapon';

export const SOCKETS: readonly SocketName[] = ['chassis', 'wheels', 'turret', 'weapon'] as const;

export interface TankComposition {
  chassis: string;
  wheels: string;
  turret: string;
  weapon: string;
}
