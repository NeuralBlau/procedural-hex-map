// src/core/WorldManager.ts
import * as PIXI from 'pixi.js';
import { createNoise2D } from 'simplex-noise';
import { getBiome, BIOMES } from '../config/biomes';
import { MAP_SETTINGS, type WorldTileData } from '../config/mapConfig';
import { HexUtils } from './HexUtils';
import { bakeHexMaskedTexture, getHexDimensions } from './TextureBaker';

export class WorldManager {
    private noise2D = createNoise2D();
    private hexDataMap = new Map<string, WorldTileData>();
    private tileSprites = new Map<string, PIXI.Sprite>();
    private tileCache = new Map<string, PIXI.Texture>();

    constructor() { }

    public generateWorld(renderer: PIXI.Renderer, loadedAssets: Record<string, any>): void {
        const { w: hexW, h: hexH } = getHexDimensions(MAP_SETTINGS.hexSize);

        // Setup Tile Cache
        BIOMES.forEach(biome => {
            if (biome.tileAsset && !this.tileCache.has(biome.tileAsset)) {
                this.tileCache.set(
                    biome.tileAsset,
                    bakeHexMaskedTexture(renderer, loadedAssets[biome.tileAsset], MAP_SETTINGS.hexSize, biome.tileAsset)
                );
            }
        });

        const startQ = MAP_SETTINGS.castleStart.q - Math.floor(MAP_SETTINGS.castleStart.r / 2);
        const startR = MAP_SETTINGS.castleStart.r;

        for (let r = 0; r < MAP_SETTINGS.mapHeight; r++) {
            for (let q = 0; q < MAP_SETTINGS.mapWidth; q++) {
                const axialQ = q - Math.floor(r / 2);
                const axialR = r;
                let val = (this.noise2D(axialQ * MAP_SETTINGS.noiseScale, axialR * MAP_SETTINGS.noiseScale) + 1) / 2;
                let biome = getBiome(val);

                const dq = axialQ - startQ;
                const dr = axialR - startR;
                const dist = (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;

                if (dist <= 3 && (biome.name === 'DEEP_WATER' || biome.name === 'WATER')) {
                    biome = BIOMES.find(b => b.name === 'GRASS') || biome;
                }

                const { x, y } = HexUtils.hexToPixel(axialQ, axialR, MAP_SETTINGS.hexSize);
                const isCastleStart = (axialQ === startQ && axialR === startR);

                const tileData: WorldTileData = {
                    q: axialQ, r: axialR, x, y,
                    biome,
                    infrastructure: isCastleStart ? 'castle' : 'none',
                    hasWorker: false,
                    fogStatus: 'unseen',
                    resourceType: 'none',
                    virusStatus: 'clean'
                };
                this.hexDataMap.set(`${axialQ},${axialR}`, tileData);

                const sprite = new PIXI.Sprite(this.tileCache.get(biome.tileAsset));
                sprite.anchor.set(0.5);
                sprite.position.set(x, y);
                sprite.width = hexW * MAP_SETTINGS.overlap;
                sprite.height = hexH * MAP_SETTINGS.overlap;
                sprite.tint = 0x000000;

                this.tileSprites.set(`${axialQ},${axialR}`, sprite);
            }
        }
    }

    public getHexDataMap() { return this.hexDataMap; }
    public getTileSprites() { return this.tileSprites; }

    public getCastleTile(): WorldTileData | undefined {
        return Array.from(this.hexDataMap.values()).find(t => t.infrastructure === 'castle');
    }
}
