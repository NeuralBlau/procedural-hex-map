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
            if (this.shouldSkipTile(tile)) return;
            if (['road', 'camp', 'castle'].includes(tile.infrastructure)) {
                this.renderRoadConnections(tile);
            }
        });

        // Second pass: Render nodes, buildings, and workers
        this.hexDataMap.forEach(tile => {
            if (this.shouldSkipTile(tile)) return;

            this.renderInfrastructureNode(tile);
            this.renderWorker(tile);
        });
    }

    private shouldSkipTile(tile: WorldTileData): boolean {
        return tile.fogStatus === 'unseen' || tile.virusStatus === 'infected';
    }

    private renderInfrastructureNode(tile: WorldTileData): void {
        const infra = tile.infrastructure;
        if (infra === 'none') return;

        let sprite: PIXI.Sprite;

        switch (infra) {
            case 'road':
                sprite = new PIXI.Sprite(this.loadedAssets['node.png']);
                sprite.height = 24;
                break;
            case 'camp':
                sprite = new PIXI.Sprite(this.loadedAssets['camp.png']);
                sprite.height = 36;
                break;
            case 'castle':
                sprite = new PIXI.Sprite(this.loadedAssets['castle_main.png']);
                sprite.anchor.set(0.5, 0.8);
                sprite.height = 60;
                break;
            case 'temple':
                sprite = new PIXI.Sprite(this.loadedAssets['temple.png']);
                sprite.anchor.set(0.5, 0.7);
                sprite.height = 50;
                break;
            case 'tower':
                sprite = new PIXI.Sprite(this.loadedAssets['tower.png']);
                sprite.anchor.set(0.5, 0.8);
                sprite.height = 55;
                break;
            default:
                return;
        }

        if (infra !== 'castle' && infra !== 'temple' && infra !== 'tower') {
            sprite.anchor.set(0.5);
        }

        sprite.position.set(tile.x, tile.y);
        sprite.scale.x = sprite.scale.y;
        this.infraLayer.addChild(sprite);
    }

    private renderWorker(tile: WorldTileData): void {
        if (!tile.hasWorker) return;

        const isWater = tile.biome.name.includes('WATER');
        const workerAsset = isWater ? 'fisher.png' : 'worker.png';
        const worker = new PIXI.Sprite(this.loadedAssets[workerAsset]);
        worker.anchor.set(0.5);
        worker.position.set(tile.x, tile.y);
        worker.height = 22;
        worker.scale.x = worker.scale.y;
        this.infraLayer.addChild(worker);
    }

    private renderRoadConnections(tile: WorldTileData): void {
        const neighbors = HexUtils.getNeighbors(tile.q, tile.r);

        neighbors.forEach((neighbor) => {
            const neighborKey = `${neighbor.q},${neighbor.r}`;
            const neighborTile = this.hexDataMap.get(neighborKey);

            if (!neighborTile || neighborTile.fogStatus === 'unseen' || neighborTile.infrastructure === 'none') return;

            const currentKey = `${tile.q},${tile.r}`;
            if (currentKey >= neighborKey) return;

            const midX = (tile.x + neighborTile.x) / 2;
            const midY = (tile.y + neighborTile.y) / 2;
            const dx = neighborTile.x - tile.x;
            const dy = neighborTile.y - tile.y;
            const angle = Math.atan2(dy, dx);

            const road = new PIXI.Sprite(this.loadedAssets['road.png']);
            road.anchor.set(0.5);
            road.position.set(midX, midY);
            road.rotation = angle;
            road.height = 12;
            road.scale.x = road.scale.y;

            this.infraLayer.addChild(road);
        });
    }
}
