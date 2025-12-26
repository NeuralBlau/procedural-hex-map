// src/systems/interaction/BuildHandler.ts
import { HexUtils } from '../../core/HexUtils';
import { BUILDINGS } from '../../config/buildings';
import type { GameState } from '../../core/GameState';
import type { WorldTileData } from '../../config/mapConfig';

export class BuildHandler {
    public static handle(tile: WorldTileData, q: number, r: number, hexDataMap: Map<string, WorldTileData>, gameState: GameState): boolean {
        if (tile.biome.name.includes('WATER')) return false;

        const buildingType = gameState.activeTool as keyof typeof BUILDINGS;
        const building = BUILDINGS[buildingType];
        if (!building) return false;

        const cost = building.cost;

        // Check costs
        if (cost.wood && gameState.resources.wood < cost.wood) return false;
        if (cost.stone && gameState.resources.stone < cost.stone) return false;
        if (cost.iron && gameState.resources.iron < cost.iron) return false;

        const canBuildOn = tile.infrastructure === 'none' || (gameState.activeTool === 'tower' && tile.infrastructure === 'road');
        if (!canBuildOn) return false;

        if (gameState.activeTool === 'road') {
            if (HexUtils.getNeighbors(q, r).some(n => hexDataMap.get(`${n.q},${n.r}`)?.infrastructure !== 'none')) {
                gameState.subtractResource('wood', cost.wood || 0);
                tile.infrastructure = 'road';
                return true;
            }
        } else if (gameState.activeTool === 'camp') {
            const d = HexUtils.getPathDistanceToBuilding(q, r, hexDataMap);
            if (d >= 3 && d !== Infinity) {
                gameState.subtractResource('wood', cost.wood || 0);
                tile.infrastructure = 'camp';
                return true;
            }
        } else if (gameState.activeTool === 'temple') {
            const d = HexUtils.getPathDistanceToBuilding(q, r, hexDataMap);
            if (d >= 3 && d !== Infinity) {
                if (cost.wood) gameState.subtractResource('wood', cost.wood);
                if (cost.stone) gameState.subtractResource('stone', cost.stone);
                if (cost.iron) gameState.subtractResource('iron', cost.iron);
                tile.infrastructure = 'temple';
                return true;
            }
        } else if (gameState.activeTool === 'tower') {
            if (cost.wood) gameState.subtractResource('wood', cost.wood);
            if (cost.stone) gameState.subtractResource('stone', cost.stone);
            if (cost.iron) gameState.subtractResource('iron', cost.iron);
            tile.infrastructure = 'tower';
            return true;
        }

        return false;
    }
}
