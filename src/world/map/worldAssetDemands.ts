import type { AssetDemandOccurrence } from './assetDemandTypes';
import {
  buildWorldAssetPlacementPlan,
  deriveWorldAssetDemandsFromTargets,
} from './worldAssetPlacement';
import type { GenerierteWelt } from './worldTypes';

export { buildWorldAssetPlacementPlan };

export function deriveWorldAssetDemands(world: GenerierteWelt): AssetDemandOccurrence[] {
  return deriveWorldAssetDemandsFromTargets(world);
}
