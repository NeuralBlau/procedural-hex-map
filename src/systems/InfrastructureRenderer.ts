// src/systems/InfrastructureRenderer.ts
import * as PIXI from 'pixi.js';
import type { WorldTileData } from '../config/mapConfig';

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

        this.hexDataMap.forEach(tile => {
            if (tile.fogStatus === 'unseen') return;

            if (tile.infrastructure === 'road') {
                const r = new PIXI.Graphics()
                    .beginFill(0x444444)
                    .drawCircle(0, 0, 6)
                    .endFill();
                r.position.set(tile.x, tile.y);
                this.infraLayer.addChild(r);
            } else if (tile.infrastructure === 'camp') {
                const b = new PIXI.Graphics()
                    .beginFill(0xFFA500)
                    .lineStyle(2, 0xffffff)
                    .drawRect(-12, -12, 24, 24)
                    .endFill();
                b.position.set(tile.x, tile.y);
                this.infraLayer.addChild(b);
            } else if (tile.infrastructure === 'castle') {
                const c = new PIXI.Sprite(this.loadedAssets['castle_main.png']);
                c.anchor.set(0.5, 0.8);
                c.position.set(tile.x, tile.y);
                c.height = 60;
                c.scale.x = c.scale.y;
                this.infraLayer.addChild(c);
            }

            if (tile.hasWorker) {
                const isWater = tile.biome.name.includes('WATER');
                const w = new PIXI.Graphics()
                    .beginFill(isWater ? 0x00FFFF : 0xFFD700)
                    .lineStyle(2, 0x000000)
                    .drawCircle(0, 0, 10)
                    .endFill();
                w.position.set(tile.x, tile.y);
                this.infraLayer.addChild(w);
            }
        });
    }
}
