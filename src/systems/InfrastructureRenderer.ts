// src/systems/InfrastructureRenderer.ts
import * as PIXI from 'pixi.js';
import type { WorldTileData } from '../config/mapConfig';
import { HexUtils } from '../core/HexUtils';

export class InfrastructureRenderer {
    private hexDataMap: Map<string, WorldTileData>;
    private infraLayer: PIXI.Container;
    private loadedAssets: Record<string, any>;

    constructor(
        hexDataMap: Map<string, WorldTileData>,
        infraLayer: PIXI.Container,
        loadedAssets: Record<string, any>
    ) {
        this.hexDataMap = hexDataMap;
        this.infraLayer = infraLayer;
        this.loadedAssets = loadedAssets;
    }

    // Update infrastructure rendering (roads, camps, castle, workers)
    update(): void {
        this.infraLayer.removeChildren();

        // First pass: Render road connections (behind everything)
        this.hexDataMap.forEach(tile => {
            if (tile.fogStatus === 'unseen') return;
            if (tile.infrastructure === 'road' || tile.infrastructure === 'camp' || tile.infrastructure === 'castle') {
                this.renderRoadConnections(tile);
            }
        });

        // Second pass: Render infrastructure nodes
        this.hexDataMap.forEach(tile => {
            if (tile.fogStatus === 'unseen') return;

            if (tile.infrastructure === 'road') {
                const node = new PIXI.Sprite(this.loadedAssets['camp.png']);
                node.anchor.set(0.5);
                node.position.set(tile.x, tile.y);
                node.height = 24;
                node.scale.x = node.scale.y;
                this.infraLayer.addChild(node);
            } else if (tile.infrastructure === 'camp') {
                const camp = new PIXI.Sprite(this.loadedAssets['node.png']);
                camp.anchor.set(0.5);
                camp.position.set(tile.x, tile.y);
                camp.height = 36;
                camp.scale.x = camp.scale.y;
                this.infraLayer.addChild(camp);
            } else if (tile.infrastructure === 'castle') {
                const castle = new PIXI.Sprite(this.loadedAssets['castle_main.png']);
                castle.anchor.set(0.5, 0.8);
                castle.position.set(tile.x, tile.y);
                castle.height = 60;
                castle.scale.x = castle.scale.y;
                this.infraLayer.addChild(castle);
            }

            // Render workers on top
            if (tile.hasWorker) {
                const isWater = tile.biome.name.includes('WATER');
                const workerAsset = isWater ? 'fisher.png' : 'road.png';
                const worker = new PIXI.Sprite(this.loadedAssets[workerAsset]);
                worker.anchor.set(0.5);
                worker.position.set(tile.x, tile.y);
                worker.height = 22;
                worker.scale.x = worker.scale.y;
                this.infraLayer.addChild(worker);
            }
        });
    }

    private renderRoadConnections(tile: WorldTileData): void {
        const neighbors = HexUtils.getNeighbors(tile.q, tile.r);

        neighbors.forEach((neighbor) => {
            const neighborKey = `${neighbor.q},${neighbor.r}`;
            const neighborTile = this.hexDataMap.get(neighborKey);

            // Only render connection if neighbor exists and has infrastructure
            if (!neighborTile || neighborTile.fogStatus === 'unseen') return;
            if (neighborTile.infrastructure === 'none') return;

            // Avoid rendering the same connection twice
            // Only render if current tile's key is "less than" neighbor's key (lexicographically)
            const currentKey = `${tile.q},${tile.r}`;
            if (currentKey >= neighborKey) return;

            // Calculate midpoint between tiles
            const midX = (tile.x + neighborTile.x) / 2;
            const midY = (tile.y + neighborTile.y) / 2;

            // Calculate rotation angle based on actual positions
            const dx = neighborTile.x - tile.x;
            const dy = neighborTile.y - tile.y;
            const angle = Math.atan2(dy, dx);

            // Create road sprite
            const road = new PIXI.Sprite(this.loadedAssets['worker.png']);
            road.anchor.set(0.5);
            road.position.set(midX, midY);
            road.rotation = angle;
            road.height = 12;
            road.scale.x = road.scale.y;

            this.infraLayer.addChild(road);
        });
    }
}
