// src/systems/interaction/DemolishHandler.ts
import type { WorldTileData } from '../../config/mapConfig';

export class DemolishHandler {
    public static handle(tile: WorldTileData): boolean {
        if (tile.infrastructure !== 'castle') {
            tile.infrastructure = 'none';
            tile.hasWorker = false;
            return true;
        }
        return false;
    }
}
