// src/main.ts
import * as PIXI from 'pixi.js';
import { Color, TextureStyle } from 'pixi.js';
import { HexUtils } from './core/HexUtils';
import { createNoise2D } from 'simplex-noise';
import { getBiome, BIOMES } from './config/biomes';

// src/main.ts
import { MAP_SETTINGS, type WorldTileData } from './config/mapConfig';
import { HUD } from './ui/HUD';
import { bakeHexMaskedTexture, getHexDimensions } from './core/TextureBaker';

const noise2D = createNoise2D();
TextureStyle.defaultOptions.scaleMode = 'nearest';

// --- GAME STATE ---
const gameState = {
    resources: { wood: 50, stone: 10, iron: 0 },
    workers: { total: 5, employed: 0 },
    castleLevel: 1
};

async function init() {
    const app = new PIXI.Application();
    await app.init({ background: '#0a0a0a', resizeTo: window, antialias: false });
    document.body.appendChild(app.canvas);

    const hud = new HUD();

    // Assets laden
    const assetAliases = new Set<string>();
    BIOMES.forEach(b => {
        if ((b as any).tileAsset) assetAliases.add((b as any).tileAsset);
        if ((b as any).decoAsset) assetAliases.add((b as any).decoAsset);
    });
    for (const alias of assetAliases) PIXI.Assets.add({ alias, src: `/assets/${alias}` });
    const loadedAssets = await PIXI.Assets.load([...assetAliases]);

    // Baking
    const tileCache = new Map<string, PIXI.Texture>();
    const { w: hexW, h: hexH } = getHexDimensions(MAP_SETTINGS.hexSize);
    BIOMES.forEach(biome => {
        const alias = (biome as any).tileAsset;
        if (alias && !tileCache.has(alias)) {
            tileCache.set(alias, bakeHexMaskedTexture(app.renderer, loadedAssets[alias], MAP_SETTINGS.hexSize, alias));
        }
    });

    const worldContainer = new PIXI.Container();
    const groundLayer = new PIXI.Container();
    const decoLayer = new PIXI.Container();
    decoLayer.sortableChildren = true;
    worldContainer.addChild(groundLayer, decoLayer);
    app.stage.addChild(worldContainer);

    const animatedDecos: PIXI.Sprite[] = [];
    const hexDataMap = new Map<string, WorldTileData>();

    // --- MAP GENERIERUNG ---
    for (let r = 0; r < MAP_SETTINGS.mapHeight; r++) {
        for (let q = 0; q < MAP_SETTINGS.mapWidth; q++) {
            const axialQ = q - Math.floor(r / 2);
            const axialR = r;
            const val = (noise2D(axialQ * MAP_SETTINGS.noiseScale, axialR * MAP_SETTINGS.noiseScale) + 1) / 2;
            const biome = getBiome(val);
            const { x, y } = HexUtils.hexToPixel(axialQ, axialR, MAP_SETTINGS.hexSize);

            // Ressourcen-Typ basierend auf Biom zuweisen
            let res: 'wood' | 'stone' | 'iron' | 'none' = 'none';
            if (biome.name === 'Forest' || biome.name === 'Snowy Forest') res = 'wood';
            else if (biome.name === 'Mountain') res = 'iron';
            else if (biome.name === 'Grassland') res = 'stone';

            // Tile-Logik-Daten
            const tileData: WorldTileData = {
                q: axialQ, r: axialR, x, y,
                biome,
                infrastructure: 'none',
                hasWorker: Math.random() > 0.98, // Testweise ein paar Arbeiter verteilen
                fogStatus: 'visible',
                resourceType: res
            };
            hexDataMap.set(`${axialQ},${axialR}`, tileData);

            // Grafische Darstellung
            const bakedTex = tileCache.get(biome.tileAsset);
            if (bakedTex) {
                const tile = new PIXI.Sprite(bakedTex);
                tile.anchor.set(0.5);
                tile.position.set(x, y);
                tile.width = hexW * MAP_SETTINGS.overlap;
                tile.height = hexH * MAP_SETTINGS.overlap;
                groundLayer.addChild(tile);
            }

            // Dekorationen (wie vorher)
            const decoAsset = (biome as any).decoAsset;
            if (decoAsset && (biome as any).decoratorDensity > 0) {
                const tex = loadedAssets[decoAsset];
                for (let i = 0; i < (biome as any).decoratorDensity; i++) {
                    const deco = new PIXI.Sprite(tex);
                    deco.anchor.set(0.5, 0.95);
                    deco.position.set(x + (Math.random()-0.5)*hexW*0.5, y + (Math.random()-0.5)*hexH*0.3);
                    deco.scale.set(((hexH * 0.45) / tex.height) * (0.8 + Math.random() * 0.4));
                    deco.zIndex = deco.y;
                    animatedDecos.push(deco);
                    decoLayer.addChild(deco);
                }
            }
        }
    }

    // Zentrierung
    worldContainer.x = app.screen.width / 2;
    worldContainer.y = app.screen.height / 2;

    // --- TICK SYSTEM (Das Herz des Spiels) ---
    setInterval(() => {
        let workersCurrentlyActive = 0;
        
        hexDataMap.forEach((tile) => {
            if (tile.hasWorker) {
                workersCurrentlyActive++;
                // Einfache Produktionslogik
                if (tile.resourceType === 'wood') gameState.resources.wood += 1;
                if (tile.resourceType === 'stone') gameState.resources.stone += 0.5;
                if (tile.resourceType === 'iron') gameState.resources.iron += 0.2;
            }
        });

        gameState.workers.employed = workersCurrentlyActive;
        hud.update(gameState);
    }, MAP_SETTINGS.tickRate);

    // --- TICKER & INTERAKTION ---
    let time = 0;
    app.ticker.add((ticker) => {
        time += ticker.deltaTime * 0.04;
        animatedDecos.forEach((d, i) => d.skew.x = Math.sin(time + i * 0.2) * 0.03);
    });

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    let hoverText = '';

    app.stage.on('pointermove', (e) => {
        const localPos = worldContainer.toLocal(e.global);
        const q = Math.round((Math.sqrt(3)/3 * localPos.x - 1/3 * localPos.y) / MAP_SETTINGS.hexSize);
        const r = Math.round((2/3 * localPos.y) / MAP_SETTINGS.hexSize);
        const data = hexDataMap.get(`${q},${r}`);
        
        if (data) {
            hoverText = `Biom: ${data.biome.name} | Resource: ${data.resourceType}`;
            if (data.hasWorker) hoverText += ` | 👷 AKTIV`;
        } else {
            hoverText = '';
        }
        hud.update(gameState, hoverText);
    });

    // Kamera-Controls (Bleiben gleich)
    let isDragging = false, dragStart = { x: 0, y: 0 }, containerStart = { x: 0, y: 0 };
    app.stage.on('pointerdown', (e) => {
        isDragging = true;
        dragStart = { x: e.global.x, y: e.global.y };
        containerStart = { x: worldContainer.x, y: worldContainer.y };
    });
    app.stage.on('pointermove', (e) => {
        if (!isDragging) return;
        worldContainer.x = containerStart.x + (e.global.x - dragStart.x);
        worldContainer.y = containerStart.y + (e.global.y - dragStart.y);
    });
    app.stage.on('pointerup', () => isDragging = false);
    app.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoom = Math.pow(1.1, -e.deltaY / 100);
        const newScale = worldContainer.scale.x * zoom;
        if (newScale > 0.05 && newScale < 4) worldContainer.scale.set(newScale);
    }, { passive: false });
}

init();