// src/systems/interaction/WorkerHandler.ts
import { HexUtils } from '../../core/HexUtils';
import type { GameState } from '../../core/GameState';
import type { WorldTileData } from '../../config/mapConfig';

export class WorkerHandler {
    public static handle(tile: WorldTileData, q: number, r: number, hexDataMap: Map<string, WorldTileData>, gameState: GameState): boolean {
        if (gameState.activeTool === 'worker_add') {
            if (!tile.hasWorker && gameState.workers.employed < gameState.workers.total) {
                if (HexUtils.getNeighbors(q, r).some(n =>
                    ['castle', 'camp'].includes(hexDataMap.get(`${n.q},${n.r}`)?.infrastructure || '')
                )) {
                    tile.hasWorker = true;
                    return true;
                }
            }
        } else if (gameState.activeTool === 'worker_remove') {
            tile.hasWorker = false;
            return true;
        }
        return false;
    }
}
