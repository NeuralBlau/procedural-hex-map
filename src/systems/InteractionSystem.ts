// src/systems/InteractionSystem.ts
import { HexUtils } from '../core/HexUtils';
import { BUILDINGS } from '../config/buildings';
import type { GameState } from '../core/GameState';
import type { WorldTileData } from '../config/mapConfig';

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

        // Building tools (road, camp)
        if (this.gameState.activeTool === 'road' || this.gameState.activeTool === 'camp') {
            if (tile.biome.name.includes('WATER')) return false;

            const buildingType = this.gameState.activeTool;
            const cost = BUILDINGS[buildingType].cost.wood;

            if (tile.infrastructure === 'none' && this.gameState.resources.wood >= cost) {
                if (this.gameState.activeTool === 'road') {
                    // Road must be adjacent to existing infrastructure
                    if (HexUtils.getNeighbors(q, r).some(n =>
                        this.hexDataMap.get(`${n.q},${n.r}`)?.infrastructure !== 'none'
                    )) {
                        this.gameState.resources.wood -= cost;
                        tile.infrastructure = 'road';
                        return true;
                    }
                } else if (this.gameState.activeTool === 'camp') {
                    // Camp must be 3+ tiles away from building via roads
                    const d = HexUtils.getPathDistanceToBuilding(q, r, this.hexDataMap);
                    if (d >= 3 && d !== Infinity) {
                        this.gameState.resources.wood -= cost;
                        tile.infrastructure = 'camp';
                        return true;
                    }
                }
            }
        }
        // Add worker
        else if (this.gameState.activeTool === 'worker_add' &&
            !tile.hasWorker &&
            this.gameState.workers.employed < this.gameState.workers.total) {
            // Worker must be adjacent to castle or camp
            if (HexUtils.getNeighbors(q, r).some(n =>
                ['castle', 'camp'].includes(this.hexDataMap.get(`${n.q},${n.r}`)?.infrastructure || '')
            )) {
                tile.hasWorker = true;
                return true;
            }
        }
        // Remove worker
        else if (this.gameState.activeTool === 'worker_remove') {
            tile.hasWorker = false;
            return true;
        }
        // Demolish
        else if (this.gameState.activeTool === 'demolish' && tile.infrastructure !== 'castle') {
            tile.infrastructure = 'none';
            tile.hasWorker = false;
            return true;
        }

        return false;
    }
}
