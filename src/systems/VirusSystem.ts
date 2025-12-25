// src/systems/VirusSystem.ts
import { HexUtils } from '../core/HexUtils';
import type { WorldTileData } from '../config/mapConfig';
import type { GameState } from '../core/GameState';

const VIRUS_CONFIG = {
    SPREAD_INTERVAL_MS: 1000,        // 1 second
    LOSE_THRESHOLD_PERCENT: 0.05,    // 5% of map
    MIN_SPAWN_DISTANCE: 20,          // Distance from castle
    WATER_BLOCKS_SPREAD: true
};

export class VirusSystem {
    private hexDataMap: Map<string, WorldTileData>;
    private gameState: GameState;
    private lastSpreadTime: number = 0;

    constructor(hexDataMap: Map<string, WorldTileData>, gameState: GameState) {
        this.hexDataMap = hexDataMap;
        this.gameState = gameState;
    }

    public initialize(): void {
        // Find castle position
        let castleTile: WorldTileData | undefined;
        for (const tile of this.hexDataMap.values()) {
            if (tile.infrastructure === 'castle') {
                castleTile = tile;
                break;
            }
        }

        if (!castleTile) return;

        // Find potential spawn points far from castle
        const candidates: WorldTileData[] = [];
        for (const tile of this.hexDataMap.values()) {
            if (tile.biome.name === 'WATER' || tile.biome.name === 'DEEP_WATER') continue;

            const dq = tile.q - castleTile.q;
            const dr = tile.r - castleTile.r;
            const distance = (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;

            if (distance >= VIRUS_CONFIG.MIN_SPAWN_DISTANCE) {
                candidates.push(tile);
            }
        }

        if (candidates.length > 0) {
            const spawnTile = candidates[Math.floor(Math.random() * candidates.length)];
            spawnTile.virusStatus = 'infected';
            spawnTile.infrastructure = 'none';
            spawnTile.hasWorker = false;
            this.gameState.infectedTileCount = 1;
        }
    }

    public update(time: number): boolean {
        if (this.gameState.gameStatus !== 'playing') return false;

        if (time - this.lastSpreadTime > VIRUS_CONFIG.SPREAD_INTERVAL_MS) {
            this.lastSpreadTime = time;
            this.spreadVirus();
            return true;
        }
        return false;
    }

    private spreadVirus(): void {
        const infectedTiles: WorldTileData[] = [];
        for (const tile of this.hexDataMap.values()) {
            if (tile.virusStatus === 'infected') {
                infectedTiles.push(tile);
            }
        }

        if (infectedTiles.length === 0) return;

        // Pick a random infected tile to spread from
        const sourceIndex = Math.floor(Math.random() * infectedTiles.length);
        const sourceTile = infectedTiles[sourceIndex];

        // Get neighbors and find clean ones
        const neighbors = HexUtils.getNeighbors(sourceTile.q, sourceTile.r);
        const cleanNeighbors: WorldTileData[] = [];

        for (const pos of neighbors) {
            const neighbor = this.hexDataMap.get(`${pos.q},${pos.r}`);
            if (neighbor && neighbor.virusStatus === 'clean') {
                if (VIRUS_CONFIG.WATER_BLOCKS_SPREAD && (neighbor.biome.name === 'WATER' || neighbor.biome.name === 'DEEP_WATER')) {
                    continue;
                }
                cleanNeighbors.push(neighbor);
            }
        }

        if (cleanNeighbors.length > 0) {
            const targetTile = cleanNeighbors[Math.floor(Math.random() * cleanNeighbors.length)];
            targetTile.virusStatus = 'infected';
            targetTile.infrastructure = 'none';
            targetTile.hasWorker = false;
            this.gameState.infectedTileCount++;

            this.checkLoseCondition();
        }
    }

    private checkLoseCondition(): void {
        const totalTiles = this.hexDataMap.size;
        const infectionPercent = this.gameState.infectedTileCount / totalTiles;

        if (infectionPercent >= VIRUS_CONFIG.LOSE_THRESHOLD_PERCENT) {
            this.gameState.gameStatus = 'lost';
        }
    }
}
