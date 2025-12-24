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
    resources: { wood: 200, stone: 50, iron: 20 },
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

/**
 * BFS-Suche: Findet die Distanz zum nächsten festen Gebäude über Straßen.
 */
function getPathDistanceToBuilding(startQ: number, startR: number, hexDataMap: Map<string, WorldTileData>) {
    let queue = [{ q: startQ, r: startR, dist: 0 }];
    let visited = new Set<string>();
    visited.add(`${startQ},${startR}`);

    while (queue.length > 0) {
        let current = queue.shift()!;
        const neighbors = getNeighbors(current.q, current.r);

        for (const n of neighbors) {
            const key = `${n.q},${n.r}`;
            const tile = hexDataMap.get(key);
            if (!tile || visited.has(key)) continue;

            // Ziel: Burg oder Lager
            if (tile.infrastructure === 'castle' || tile.infrastructure === 'camp') {
                return current.dist + 1;
            }

            // Weg nur über Straßen
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
    
    // Rechtsklick zum Abwählen
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        gameState.activeTool = 'none';
        hud.update(gameState, currentHoverText);
    });

    const hud = new HUD();

    // --- ASSETS ---
    const assetAliases = new Set<string>();
    BIOMES.forEach(b => { if ((b as any).tileAsset) assetAliases.add((b as any).tileAsset); });
    assetAliases.add('castle_main.png'); 
    for (const alias of assetAliases) PIXI.Assets.add({ alias, src: `/assets/${alias}` });
    const loadedAssets = await PIXI.Assets.load([...assetAliases]);

    // --- BAKING ---
    const tileCache = new Map<string, PIXI.Texture>();
    const { w: hexW, h: hexH } = getHexDimensions(MAP_SETTINGS.hexSize);
    BIOMES.forEach(biome => {
        const alias = (biome as any).tileAsset;
        if (alias && !tileCache.has(alias)) {
            tileCache.set(alias, bakeHexMaskedTexture(app.renderer, loadedAssets[alias], MAP_SETTINGS.hexSize, alias));
        }
    });

    // --- LAYERS ---
    const worldContainer = new PIXI.Container();
    const groundLayer = new PIXI.Container();
    const infraLayer = new PIXI.Container();
    const interactionLayer = new PIXI.Container();
    const uiLayer = new PIXI.Container();

    worldContainer.addChild(groundLayer, infraLayer, interactionLayer);
    app.stage.addChild(worldContainer, uiLayer);

    const hoverHighlight = new Graphics();
    hoverHighlight.lineStyle(2, 0xffffff, 0.5).drawCircle(0, 0, MAP_SETTINGS.hexSize * 0.8);
    hoverHighlight.visible = false;
    interactionLayer.addChild(hoverHighlight);

    const hexDataMap = new Map<string, WorldTileData>();
    const tileSprites = new Map<string, PIXI.Sprite>();

    // --- GENERATION ---
    for (let r = 0; r < MAP_SETTINGS.mapHeight; r++) {
        for (let q = 0; q < MAP_SETTINGS.mapWidth; q++) {
            const axialQ = q - Math.floor(r / 2);
            const axialR = r;
            const val = (noise2D(axialQ * MAP_SETTINGS.noiseScale, axialR * MAP_SETTINGS.noiseScale) + 1) / 2;
            const biome = getBiome(val);
            const { x, y } = HexUtils.hexToPixel(axialQ, axialR, MAP_SETTINGS.hexSize);
            const startQ = MAP_SETTINGS.castleStart.q - Math.floor(MAP_SETTINGS.castleStart.r / 2);
            const isCastleStart = (axialQ === startQ && axialR === MAP_SETTINGS.castleStart.r);

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

    // --- TOOLBAR ---
    function createToolbar() {
        uiLayer.removeChildren();
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

    // --- LOGIC UPDATES ---
    function updateVisibility() {
        hexDataMap.forEach(tile => { if (tile.fogStatus === 'visible') tile.fogStatus = 'seen'; });
        hexDataMap.forEach(tile => {
            if (tile.infrastructure !== 'none' || tile.hasWorker) {
                let visR = 1, seenR = 1;
                if (tile.infrastructure === 'castle') { visR = 5; seenR = 2; }
                else if (tile.infrastructure === 'camp') { visR = 3; seenR = 2; }
                else if (tile.hasWorker) { visR = 2; seenR = 1; }
                else if (tile.infrastructure === 'road') { visR = 1; seenR = 1; }

                getTilesInRadius(tile.q, tile.r, visR).forEach(pos => {
                    const t = hexDataMap.get(`${pos.q},${pos.r}`);
                    if (t) t.fogStatus = 'visible';
                });
                getTilesInRadius(tile.q, tile.r, visR + seenR).forEach(pos => {
                    const t = hexDataMap.get(`${pos.q},${pos.r}`);
                    if (t && t.fogStatus === 'unseen') t.fogStatus = 'seen';
                });
            }
        });
        hexDataMap.forEach(tile => {
            const s = tileSprites.get(`${tile.q},${tile.r}`);
            if (s) {
                if (tile.fogStatus === 'visible') s.tint = 0xffffff;
                else if (tile.fogStatus === 'seen') s.tint = 0x333333;
                else s.tint = 0x000000;
            }
        });
    }

    function updateInfraView() {
        infraLayer.removeChildren();
        hexDataMap.forEach(tile => {
            if (tile.fogStatus === 'unseen') return;
            if (tile.infrastructure === 'road') {
                const r = new Graphics().beginFill(0x444444).drawCircle(0, 0, 6).endFill();
                r.position.set(tile.x, tile.y); infraLayer.addChild(r);
            }
            if (tile.infrastructure === 'camp') {
                const b = new Graphics().beginFill(0xFFA500).lineStyle(2, 0xffffff).drawRect(-12, -12, 24, 24).endFill();
                b.position.set(tile.x, tile.y); infraLayer.addChild(b);
            }
            if (tile.infrastructure === 'castle') {
                const c = new PIXI.Sprite(loadedAssets['castle_main.png']);
                c.anchor.set(0.5, 0.8); c.position.set(tile.x, tile.y);
                c.height = 60; c.scale.x = c.scale.y; infraLayer.addChild(c);
            }
            if (tile.hasWorker) {
                const w = new Graphics().beginFill(0xFFD700).lineStyle(2, 0x000000).drawCircle(0, 0, 10).endFill();
                w.position.set(tile.x, tile.y); infraLayer.addChild(w);
            }
        });
    }

    updateVisibility(); updateInfraView();

    // --- INTERACTION ---
    app.stage.eventMode = 'static';
    app.stage.on('pointertap', (e) => {
        if (e.button !== 0) return;
        const localPos = worldContainer.toLocal(e.global);
        const q = Math.round((Math.sqrt(3)/3 * localPos.x - 1/3 * localPos.y) / MAP_SETTINGS.hexSize);
        const r = Math.round((2/3 * localPos.y) / MAP_SETTINGS.hexSize);
        const tile = hexDataMap.get(`${q},${r}`);
        
        if (gameState.activeTool === 'none' || !tile) return;
        if (tile.fogStatus === 'unseen' && (gameState.activeTool as string) !== 'none') return;

        if (gameState.activeTool === 'road') {
            const roadCost = BUILDINGS.road.cost.wood;
            if (tile.infrastructure === 'none' && gameState.resources.wood >= roadCost) {
                const conn = getNeighbors(q, r).some(n => {
                    const nt = hexDataMap.get(`${n.q},${n.r}`);
                    return nt && nt.infrastructure !== 'none';
                });
                if (conn) { gameState.resources.wood -= roadCost; tile.infrastructure = 'road'; }
            }
        } else if (gameState.activeTool === 'camp') {
            const campCost = BUILDINGS.camp.cost.wood;
            if (tile.infrastructure === 'none' && gameState.resources.wood >= campCost) {
                const dist = getPathDistanceToBuilding(q, r, hexDataMap);
                if (dist >= 3 && dist !== Infinity) {
                    gameState.resources.wood -= campCost;
                    tile.infrastructure = 'camp';
                }
            }
        } else if (gameState.activeTool === 'worker_add') {
            if (tile.infrastructure === 'none' && !tile.hasWorker && gameState.workers.employed < gameState.workers.total) {
                const nearBase = getNeighbors(q, r).some(n => {
                    const nt = hexDataMap.get(`${n.q},${n.r}`);
                    return nt && (nt.infrastructure === 'castle' || nt.infrastructure === 'camp');
                });
                if (nearBase) { tile.hasWorker = true; }
            }
        } else if (gameState.activeTool === 'worker_remove') {
            tile.hasWorker = false;
        } else if (gameState.activeTool === 'demolish') {
            if (tile.infrastructure !== 'castle') { tile.infrastructure = 'none'; tile.hasWorker = false; }
        }

        updateVisibility(); updateInfraView();
        hud.update(gameState, currentHoverText);
    });

    app.stage.on('pointermove', (e) => {
        const localPos = worldContainer.toLocal(e.global);
        const q = Math.round((Math.sqrt(3)/3 * localPos.x - 1/3 * localPos.y) / MAP_SETTINGS.hexSize);
        const r = Math.round((2/3 * localPos.y) / MAP_SETTINGS.hexSize);
        const data = hexDataMap.get(`${q},${r}`);
        if (data && data.fogStatus !== 'unseen') {
            hoverHighlight.visible = true; hoverHighlight.position.set(data.x, data.y);
            currentHoverText = `${data.biome.name} | Tool: ${gameState.activeTool}`;
        } else { hoverHighlight.visible = false; }
        hud.update(gameState, currentHoverText);
    });

    setInterval(() => {
        let count = 0;
        hexDataMap.forEach(tile => {
            if (tile.hasWorker) {
                count++;
                const bName = tile.biome.name;
                if (bName.includes('Forest')) gameState.resources.wood += 1;
                else if (bName === 'Mountain') gameState.resources.iron += 0.2;
                else if (bName === 'Grassland') gameState.resources.stone += 0.5;
            }
        });
        gameState.workers.employed = count;
        hud.update(gameState, currentHoverText);
    }, 1000);

    // --- CAMERA (DRAG & ZOOM) ---
    let isDrag = false;
    let dragStart = { x: 0, y: 0 };
    let containerStart = { x: 0, y: 0 };

    app.stage.on('pointerdown', (e) => { 
        if(e.button === 0 && gameState.activeTool === 'none') { 
            isDrag = true; 
            dragStart = { x: e.global.x, y: e.global.y }; 
            containerStart = { x: worldContainer.x, y: worldContainer.y }; 
        }
    });

    app.stage.on('pointermove', (e) => { 
        if (isDrag) { 
            worldContainer.x = containerStart.x + (e.global.x - dragStart.x); 
            worldContainer.y = containerStart.y + (e.global.y - dragStart.y); 
        }
    });

    app.stage.on('pointerup', () => isDrag = false);
    app.stage.on('pointerupoutside', () => isDrag = false);

    app.canvas.addEventListener('wheel', (e: WheelEvent) => {
        e.preventDefault();
        const zoomSpeed = 0.01;
        const zoomFactor = Math.pow(1.1, -e.deltaY * zoomSpeed);
        const newScale = worldContainer.scale.x * zoomFactor;

        if (newScale > 0.1 && newScale < 3) {
            const localPos = worldContainer.toLocal({ x: e.clientX, y: e.clientY });
            worldContainer.scale.set(newScale);
            const newGlobalPos = worldContainer.toGlobal(localPos);
            worldContainer.x += e.clientX - newGlobalPos.x;
            worldContainer.y += e.clientY - newGlobalPos.y;
        }
    }, { passive: false });
}

init();