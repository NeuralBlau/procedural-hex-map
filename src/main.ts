// src/main.ts
import * as PIXI from 'pixi.js';
import { TextureStyle, Graphics, Text, Container } from 'pixi.js';
import { HexUtils } from './core/HexUtils';
import { createNoise2D } from 'simplex-noise';
import { getBiome, BIOMES } from './config/biomes';
import { MAP_SETTINGS, type WorldTileData } from './config/mapConfig';
import { BUILDINGS } from './config/buildings';
import { HUD } from './ui/HUD';
import { bakeHexMaskedTexture, getHexDimensions } from './core/TextureBaker';

const noise2D = createNoise2D();
TextureStyle.defaultOptions.scaleMode = 'nearest';

// --- GAME STATE ---
const gameState = {
    resources: { wood: 200, stone: 50, iron: 20, food: 100 },
    workers: { total: 10, employed: 0 },
    activeTool: 'none' as 'road' | 'camp' | 'worker_add' | 'worker_remove' | 'demolish' | 'none'
};

let currentHoverText = "";

// --- HELPERS ---
function getNeighbors(q: number, r: number) {
    return [
        { q: q + 1, r: r }, { q: q - 1, r: r },
        { q: q, r: r + 1 }, { q: q, r: r - 1 },
        { q: q + 1, r: r - 1 }, { q: q - 1, r: r + 1 }
    ];
}

function getTilesInRadius(centerQ: number, centerR: number, radius: number) {
    const results = [];
    for (let q = -radius; q <= radius; q++) {
        for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
            results.push({ q: centerQ + q, r: centerR + r });
        }
    }
    return results;
}

function getPathDistanceToBuilding(startQ: number, startR: number, hexDataMap: Map<string, WorldTileData>) {
    let queue = [{ q: startQ, r: startR, dist: 0 }];
    let visited = new Set<string>();
    visited.add(`${startQ},${startR}`);
    while (queue.length > 0) {
        let current = queue.shift()!;
        for (const n of getNeighbors(current.q, current.r)) {
            const key = `${n.q},${n.r}`;
            const tile = hexDataMap.get(key);
            if (!tile || visited.has(key)) continue;
            if (tile.infrastructure === 'castle' || tile.infrastructure === 'camp') return current.dist + 1;
            if (tile.infrastructure === 'road') {
                visited.add(key);
                queue.push({ q: n.q, r: n.r, dist: current.dist + 1 });
            }
        }
    }
    return Infinity;
}

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
    // UI Layer nach dem World Container hinzufügen, damit es oben liegt
    app.stage.addChild(worldContainer);
    app.stage.addChild(uiLayer);
    uiLayer.addChild(hud.getContainer());

    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        gameState.activeTool = 'none';
        hud.update(gameState, currentHoverText);
    });

    // --- 2. ASSETS LADEN ---
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

    // --- 3. WELT GENERIERUNG ---
    const startQ = MAP_SETTINGS.castleStart.q - Math.floor(MAP_SETTINGS.castleStart.r / 2);
    const startR = MAP_SETTINGS.castleStart.r;

    for (let r = 0; r < MAP_SETTINGS.mapHeight; r++) {
        for (let q = 0; q < MAP_SETTINGS.mapWidth; q++) {
            const axialQ = q - Math.floor(r / 2);
            const axialR = r;
            let val = (noise2D(axialQ * MAP_SETTINGS.noiseScale, axialR * MAP_SETTINGS.noiseScale) + 1) / 2;
            let biome = getBiome(val);

            // Startbereich sichern (kein Wasser unter der Burg)
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

    // --- 4. TOOLBAR ---
    function createToolbar() {
        const toolbar = new Container();
        const tools = [
            { id: 'road', label: 'STRASSE', color: 0x999999 },
            { id: 'camp', label: 'LAGER', color: 0xFFA500 },
            { id: 'worker_add', label: '+ ARBEITER', color: 0xFFD700 },
            { id: 'worker_remove', label: '- ARBEITER', color: 0xFF4500 },
            { id: 'demolish', label: 'ABRISS', color: 0xaa0000 }
        ];
        tools.forEach((t, i) => {
            const btn = new Container();
            btn.position.set(i * 125, 0);
            btn.eventMode = 'static'; btn.cursor = 'pointer';
            const bg = new Graphics().beginFill(0x222222).lineStyle(2, t.color).drawRoundedRect(0, 0, 110, 40, 5).endFill();
            const txt = new Text({ text: t.label, style: { fill: 0xffffff, fontSize: 12, fontWeight: 'bold' } });
            txt.anchor.set(0.5); txt.position.set(55, 20);
            btn.addChild(bg, txt);
            btn.on('pointertap', (e) => { 
                e.stopPropagation(); 
                gameState.activeTool = (gameState.activeTool === t.id) ? 'none' : (t.id as any);
                hud.update(gameState, currentHoverText);
            });
            toolbar.addChild(btn);
        });
        toolbar.position.set(app.screen.width / 2 - toolbar.width / 2, app.screen.height - 70);
        uiLayer.addChild(toolbar);
    }
    createToolbar();

    // --- 5. VISUAL UPDATES ---
    function updateVisibility() {
        hexDataMap.forEach(tile => { if (tile.fogStatus === 'visible') tile.fogStatus = 'seen'; });
        hexDataMap.forEach(tile => {
            if (tile.infrastructure !== 'none' || tile.hasWorker) {
                let visR = tile.infrastructure === 'castle' ? 5 : (tile.infrastructure === 'camp' ? 3 : 2);
                getTilesInRadius(tile.q, tile.r, visR).forEach(pos => {
                    const t = hexDataMap.get(`${pos.q},${pos.r}`);
                    if (t) t.fogStatus = 'visible';
                });
            }
        });
        hexDataMap.forEach(tile => {
            const s = tileSprites.get(`${tile.q},${tile.r}`);
            if (s) s.tint = tile.fogStatus === 'visible' ? 0xffffff : (tile.fogStatus === 'seen' ? 0x333333 : 0x000000);
        });
    }

    function updateInfraView() {
        infraLayer.removeChildren();
        hexDataMap.forEach(tile => {
            if (tile.fogStatus === 'unseen') return;
            if (tile.infrastructure === 'road') {
                const r = new Graphics().beginFill(0x444444).drawCircle(0, 0, 6).endFill();
                r.position.set(tile.x, tile.y); infraLayer.addChild(r);
            } else if (tile.infrastructure === 'camp') {
                const b = new Graphics().beginFill(0xFFA500).lineStyle(2, 0xffffff).drawRect(-12, -12, 24, 24).endFill();
                b.position.set(tile.x, tile.y); infraLayer.addChild(b);
            } else if (tile.infrastructure === 'castle') {
                const c = new PIXI.Sprite(loadedAssets['castle_main.png']);
                c.anchor.set(0.5, 0.8); c.position.set(tile.x, tile.y);
                c.height = 60; c.scale.x = c.scale.y; infraLayer.addChild(c);
            }
            if (tile.hasWorker) {
                const isWater = tile.biome.name === 'WATER' || tile.biome.name === 'DEEP_WATER';
                const w = new Graphics().beginFill(isWater ? 0x00FFFF : 0xFFD700).lineStyle(2, 0x000000).drawCircle(0, 0, 10).endFill();
                w.position.set(tile.x, tile.y); infraLayer.addChild(w);
            }
        });
    }

    // --- 6. INTERACTION & INPUT ---
    app.stage.eventMode = 'static';
    app.stage.on('pointertap', (e) => {
        if (e.button !== 0) return;
        const localPos = worldContainer.toLocal(e.global);
        const q = Math.round((Math.sqrt(3)/3 * localPos.x - 1/3 * localPos.y) / MAP_SETTINGS.hexSize);
        const r = Math.round((2/3 * localPos.y) / MAP_SETTINGS.hexSize);
        const tile = hexDataMap.get(`${q},${r}`);
        if (!tile || (tile.fogStatus === 'unseen' && gameState.activeTool === 'none')) return;

        if (gameState.activeTool === 'road' || gameState.activeTool === 'camp') {
            if (tile.biome.name.includes('WATER')) return;
            const cost = gameState.activeTool === 'road' ? 10 : 50;
            if (tile.infrastructure === 'none' && gameState.resources.wood >= cost) {
                if (gameState.activeTool === 'road' && getNeighbors(q, r).some(n => hexDataMap.get(`${n.q},${n.r}`)?.infrastructure !== 'none')) {
                    gameState.resources.wood -= cost; tile.infrastructure = 'road';
                } else if (gameState.activeTool === 'camp') {
                    const d = getPathDistanceToBuilding(q, r, hexDataMap);
                    if (d >= 3 && d !== Infinity) { gameState.resources.wood -= cost; tile.infrastructure = 'camp'; }
                }
            }
        } else if (gameState.activeTool === 'worker_add' && !tile.hasWorker && gameState.workers.employed < gameState.workers.total) {
            if (getNeighbors(q, r).some(n => ['castle', 'camp'].includes(hexDataMap.get(`${n.q},${n.r}`)?.infrastructure || ''))) tile.hasWorker = true;
        } else if (gameState.activeTool === 'worker_remove') tile.hasWorker = false;
        else if (gameState.activeTool === 'demolish' && tile.infrastructure !== 'castle') { tile.infrastructure = 'none'; tile.hasWorker = false; }

        updateVisibility(); updateInfraView();
        hud.update(gameState, currentHoverText);
    });

    // --- 7. RESSOURCEN TICKER (Wirtschaftssystem Prio 2) ---
    setInterval(() => {
        let activeWorkers = 0;
        let income = { wood: 0, stone: 0, iron: 0, food: 0 };
        hexDataMap.forEach(tile => {
            if (tile.hasWorker) {
                activeWorkers++;
                switch (tile.biome.name) {
                    case 'GRASS': income.food += 1.0; gameState.resources.stone += 0.2; break;
                    case 'FOREST': gameState.resources.wood += 1.0; income.food += 0.2; break;
                    case 'MOUNTAIN': gameState.resources.iron += 0.5; gameState.resources.stone += 0.8; break;
                    case 'SAND': gameState.resources.stone += 0.1; break;
                    case 'WATER': case 'DEEP_WATER': income.food += 2.0; break;
                }
            }
        });
        gameState.resources.wood += income.wood;
        gameState.resources.stone += income.stone;
        gameState.resources.iron += income.iron;
        gameState.resources.food += (income.food - (activeWorkers * 0.5));
        if (gameState.resources.food < 0) gameState.resources.food = 0;
        gameState.workers.employed = activeWorkers;
        hud.update(gameState, currentHoverText);
    }, 1000);

    // --- 8. KAMERA & ZOOM ---
    let isDrag = false, dragStart = { x: 0, y: 0 }, camStart = { x: 0, y: 0 };
    app.stage.on('pointerdown', (e) => { 
        if(e.button === 0 && gameState.activeTool === 'none') { 
            isDrag = true; dragStart = { x: e.global.x, y: e.global.y }; camStart = { x: worldContainer.x, y: worldContainer.y }; 
        }
    });
    app.stage.on('pointermove', (e) => { if (isDrag) { worldContainer.x = camStart.x + (e.global.x - dragStart.x); worldContainer.y = camStart.y + (e.global.y - dragStart.y); }});
    app.stage.on('pointerup', () => isDrag = false);

    app.canvas.addEventListener('wheel', (e: WheelEvent) => {
        e.preventDefault();
        const zoomFactor = Math.pow(1.1, -e.deltaY * 0.01);
        const nextScale = worldContainer.scale.x * zoomFactor;
        if (nextScale > 0.1 && nextScale < 3) {
            const mousePos = { x: e.clientX, y: e.clientY };
            const localPos = worldContainer.toLocal(mousePos);
            worldContainer.scale.set(nextScale);
            const newMousePos = worldContainer.toGlobal(localPos);
            worldContainer.x += mousePos.x - newMousePos.x;
            worldContainer.y += mousePos.y - newMousePos.y;
        }
    }, { passive: false });

    updateVisibility(); updateInfraView();
    hud.update(gameState, "Willkommen!");
}

init();