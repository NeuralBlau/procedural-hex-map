// src/core/AssetManager.ts
import * as PIXI from 'pixi.js';
import { BIOMES } from '../config/biomes';

export class AssetManager {
    private static instance: AssetManager;
    private loadedAssets: Record<string, any> = {};

    private constructor() { }

    public static getInstance(): AssetManager {
        if (!AssetManager.instance) {
            AssetManager.instance = new AssetManager();
        }
        return AssetManager.instance;
    }

    public async loadAssets(): Promise<Record<string, any>> {
        const assetAliases = new Set<string>();

        // Add Biome assets
        BIOMES.forEach(b => {
            if (b.tileAsset) assetAliases.add(b.tileAsset);
            if (b.decoAsset) assetAliases.add(b.decoAsset);
        });

        // Add System assets
        const coreAssets = [
            'castle_main.png',
            'worker.png',
            'fisher.png',
            'camp.png',
            'node.png',
            'road.png',
            'tower.png',
            'temple.png'
        ];
        coreAssets.forEach(a => assetAliases.add(a));

        // Add Deco assets explicitly just in case
        const decoAssets = [
            'deco_cactus.png',
            'deco_oak.png',
            'deco_pine.png',
            'deco_rock.png',
            'deco_peak.png'
        ];
        decoAssets.forEach(a => assetAliases.add(a));

        for (const alias of assetAliases) {
            PIXI.Assets.add({ alias, src: `/assets/${alias}` });
        }

        this.loadedAssets = await PIXI.Assets.load([...assetAliases]);
        return this.loadedAssets;
    }

    public getAssets(): Record<string, any> {
        return this.loadedAssets;
    }

    public getAsset(name: string): any {
        return this.loadedAssets[name];
    }
}
