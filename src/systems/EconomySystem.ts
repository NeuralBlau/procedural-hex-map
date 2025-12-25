// src/systems/EconomySystem.ts
import type { GameState } from '../core/GameState';
import type { WorldTileData } from '../config/mapConfig';

export class EconomySystem {
    private hexDataMap: Map<string, WorldTileData>;
    private gameState: GameState;

    constructor(hexDataMap: Map<string, WorldTileData>, gameState: GameState) {
        this.hexDataMap = hexDataMap;
        this.gameState = gameState;
    }

    // Process one economy tick (called every second)
    tick(): void {
        let activeWorkers = 0;
        let temples = 0;
        let income = { wood: 0, stone: 0, iron: 0, food: 0 };

        this.hexDataMap.forEach(tile => {
            if (tile.infrastructure === 'temple') {
                temples++;
            }
            if (tile.hasWorker) {
                activeWorkers++;
                switch (tile.biome.name) {
                    case 'GRASS':
                        income.food += 1.0;
                        this.gameState.resources.stone += 0.2;
                        break;
                    case 'FOREST':
                        this.gameState.resources.wood += 1.0;
                        income.food += 0.2;
                        break;
                    case 'MOUNTAIN':
                        this.gameState.resources.iron += 0.5;
                        this.gameState.resources.stone += 0.8;
                        break;
                    case 'SAND':
                        this.gameState.resources.stone += 0.1;
                        break;
                    case 'WATER':
                    case 'DEEP_WATER':
                        income.food += 2.0;
                        break;
                }
            }
        });

        this.gameState.resources.wood += income.wood;
        this.gameState.resources.stone += income.stone;
        this.gameState.resources.iron += income.iron;
        this.gameState.resources.food += (income.food - (activeWorkers * 0.5));

        if (this.gameState.resources.food < 0) {
            this.gameState.resources.food = 0;
        }

        this.gameState.victoryPoints += temples * 2;
        this.gameState.workers.employed = activeWorkers;
    }
}
