// src/main.ts
import * as PIXI from 'pixi.js';
import { TextureStyle } from 'pixi.js';
import { HexUtils } from './core/HexUtils';
import { createNoise2D } from 'simplex-noise';
import { getBiome, BIOMES } from './config/biomes';
import { MAP_SETTINGS, type WorldTileData } from './config/mapConfig';
import { TOOLS } from './config/toolsConfig';
import { HUD } from './ui/HUD';
import { bakeHexMaskedTexture, getHexDimensions } from './core/TextureBaker';
import { GameState } from './core/GameState';
import { EconomySystem } from './systems/EconomySystem';
import { VisibilitySystem } from './systems/VisibilitySystem';
import { InfrastructureRenderer } from './systems/InfrastructureRenderer';
import { InteractionSystem } from './systems/InteractionSystem';
import { CameraController } from './systems/CameraController';
import { Toolbar } from './ui/Toolbar.ts';

const noise2D = createNoise2D();
TextureStyle.defaultOptions.scaleMode = 'nearest';

const gameState = new GameState();
let currentHoverText = "";

async function init() {
    const app = new PIXI.Application();
    await app.init({ background: '#050505', resizeTo: window, antialias: false });
    document.body.appendChild(app.canvas);

    // --- 1. HUD & LAYERS SETUP ---
    const hud = new HUD();
    const worldContainer = new PIXI.Container();
    const groundLayer = new PIXI.Container();
    const infraLayer = new PIXI.Container();
    const interactionLayer = new PIXI.Container();
    const uiLayer = new PIXI.Container();

    worldContainer.addChild(groundLayer, infraLayer, interactionLayer);
    app.stage.addChild(worldContainer);
    app.stage.addChild(uiLayer);
    uiLayer.addChild(hud.getContainer());

    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        gameState.activeTool = 'none';
        hud.update(gameState, currentHoverText);
    });

    // --- 2. ASSETS & TEXTURES ---
    const assetAliases = new Set<string>();
    BIOMES.forEach(b => { if (b.tileAsset) assetAliases.add(b.tileAsset); });
    assetAliases.add('castle_main.png');
    for (const alias of assetAliases) PIXI.Assets.add({ alias, src: `/assets/${alias}` });
    const loadedAssets = await PIXI.Assets.load([...assetAliases]);

    const tileCache = new Map<string, PIXI.Texture>();
    const { w: hexW, h: hexH } = getHexDimensions(MAP_SETTINGS.hexSize);
    BIOMES.forEach(biome => {
        if (biome.tileAsset && !tileCache.has(biome.tileAsset)) {
            tileCache.set(biome.tileAsset, bakeHexMaskedTexture(app.renderer, loadedAssets[biome.tileAsset], MAP_SETTINGS.hexSize, biome.tileAsset));
        }
    });

    const hexDataMap = new Map<string, WorldTileData>();
    const tileSprites = new Map<string, PIXI.Sprite>();

    // --- 3. WORLD GENERATION ---
    const startQ = MAP_SETTINGS.castleStart.q - Math.floor(MAP_SETTINGS.castleStart.r / 2);
    const startR = MAP_SETTINGS.castleStart.r;

    for (let r = 0; r < MAP_SETTINGS.mapHeight; r++) {
        for (let q = 0; q < MAP_SETTINGS.mapWidth; q++) {
            const axialQ = q - Math.floor(r / 2);
            const axialR = r;
            let val = (noise2D(axialQ * MAP_SETTINGS.noiseScale, axialR * MAP_SETTINGS.noiseScale) + 1) / 2;
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
                resourceType: 'none'
            };
            hexDataMap.set(`${axialQ},${axialR}`, tileData);

            const sprite = new PIXI.Sprite(tileCache.get(biome.tileAsset));
            sprite.anchor.set(0.5); sprite.position.set(x, y);
            sprite.width = hexW * MAP_SETTINGS.overlap; sprite.height = hexH * MAP_SETTINGS.overlap;
            sprite.tint = 0x000000;
            groundLayer.addChild(sprite);
            tileSprites.set(`${axialQ},${axialR}`, sprite);
        }
    }

    // --- 4. SYSTEMS INITIALIZATION ---
    const economySystem = new EconomySystem(hexDataMap, gameState);
    const visibilitySystem = new VisibilitySystem(hexDataMap, tileSprites);
    const infraRenderer = new InfrastructureRenderer(hexDataMap, infraLayer, loadedAssets);
    const interactionSystem = new InteractionSystem(hexDataMap, gameState);
    const cameraController = new CameraController(worldContainer, app);

    // --- 5. TOOLBAR ---
    const toolbar = new Toolbar(TOOLS, gameState, hud, currentHoverText);
    uiLayer.addChild(toolbar.getContainer());
    toolbar.positionAt(app.screen.width / 2, app.screen.height - 70);

    // --- 6. INPUT & INTERACTION ---
    app.stage.eventMode = 'static';
    app.stage.on('pointertap', (e) => {
        if (e.button !== 0) return;
        const localPos = worldContainer.toLocal(e.global);
        const q = Math.round((Math.sqrt(3) / 3 * localPos.x - 1 / 3 * localPos.y) / MAP_SETTINGS.hexSize);
        const r = Math.round((2 / 3 * localPos.y) / MAP_SETTINGS.hexSize);

        if (interactionSystem.handleTileClick(q, r)) {
            visibilitySystem.update();
            infraRenderer.update();
            hud.update(gameState, currentHoverText);
        }
    });

    // --- 7. ECONOMY TICKER ---
    setInterval(() => {
        economySystem.tick();
        hud.update(gameState, currentHoverText);
    }, 1000);

    // --- 8. CAMERA CONTROLS ---
    cameraController.setupControls(app.stage, () => gameState.activeTool !== 'none');

    // --- 9. INITIALIZATION ---
    visibilitySystem.update();
    infraRenderer.update();

    // Center camera on castle
    const castleTile = Array.from(hexDataMap.values()).find(t => t.infrastructure === 'castle');
    if (castleTile) {
        cameraController.centerOn(castleTile.x, castleTile.y);
    }

    hud.update(gameState, "Willkommen in Hex Castle!");
}

init();