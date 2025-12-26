// src/systems/InteractionSystem.ts
import type { GameState } from '../core/GameState';
import type { WorldTileData } from '../config/mapConfig';
import { BuildHandler } from './interaction/BuildHandler';
import { WorkerHandler } from './interaction/WorkerHandler';
import { DemolishHandler } from './interaction/DemolishHandler';

export class InteractionSystem {
    private hexDataMap: Map<string, WorldTileData>;
    private gameState: GameState;

    constructor(hexDataMap: Map<string, WorldTileData>, gameState: GameState) {
        this.hexDataMap = hexDataMap;
        this.gameState = gameState;
    }

    // Handle tile click interaction
    handleTileClick(q: number, r: number): boolean {
        const tile = this.hexDataMap.get(`${q},${r}`);
        if (!tile || (tile.fogStatus === 'unseen' && this.gameState.activeTool === 'none')) {
            return false;
        }

        const tool = this.gameState.activeTool;

        // 1. Building tools
        if (['road', 'camp', 'temple', 'tower'].includes(tool)) {
            return BuildHandler.handle(tile, q, r, this.hexDataMap, this.gameState);
        }

        // 2. Worker tools
        if (['worker_add', 'worker_remove'].includes(tool)) {
            return WorkerHandler.handle(tile, q, r, this.hexDataMap, this.gameState);
        }

        // 3. Demolish tool
        if (tool === 'demolish') {
            return DemolishHandler.handle(tile);
        }

        return false;
    }
}
