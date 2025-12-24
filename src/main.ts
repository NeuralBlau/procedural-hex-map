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
    
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        gameState.activeTool = 'none';
        hud.update(gameState, currentHoverText);
    });

    const hud = new HUD();

    // --- ASSETS ---
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

    // --- GENERATION MIT FIX FÜR DEINE NAMEN ---
    const startQ = MAP_SETTINGS.castleStart.q - Math.floor(MAP_SETTINGS.castleStart.r / 2);
    const startR = MAP_SETTINGS.castleStart.r;

    for (let r = 0; r < MAP_SETTINGS.mapHeight; r++) {
        for (let q = 0; q < MAP_SETTINGS.mapWidth; q++) {
            const axialQ = q - Math.floor(r / 2);
            const axialR = r;
            
            let val = (noise2D(axialQ * MAP_SETTINGS.noiseScale, axialR * MAP_SETTINGS.noiseScale) + 1) / 2;
            let biome = getBiome(val);

            // 1. BURG-SICHERUNG: Nutzt deine Namen 'DEEP_WATER', 'WATER' und 'GRASS'
            const dq = axialQ - startQ;
            const dr = axialR - startR;
            const dist = (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
            
            if (dist <= 3) {
                if (biome.name === 'DEEP_WATER' || biome.name === 'WATER') {
                    // Erzwinge Land (GRASS) aus deiner BIOMES Liste
                    biome = BIOMES.find(b => b.name === 'GRASS') || biome;
                }
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

    // --- VISUAL UPDATES ---
    function updateVisibility() {
        hexDataMap.forEach(tile => { if (tile.fogStatus === 'visible') tile.fogStatus = 'seen'; });
        hexDataMap.forEach(tile => {
            if (tile.infrastructure !== 'none' || tile.hasWorker) {
                let visR = 1;
                if (tile.infrastructure === 'castle') visR = 5;
                else if (tile.infrastructure === 'camp') visR = 3;
                else if (tile.hasWorker) visR = 2;
                getTilesInRadius(tile.q, tile.r, visR).forEach(pos => {
                    const t = hexDataMap.get(`${pos.q},${pos.r}`);
                    if (t) t.fogStatus = 'visible';
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
                const isWater = tile.biome.name === 'WATER' || tile.biome.name === 'DEEP_WATER';
                const w = new Graphics().beginFill(isWater ? 0x00FFFF : 0xFFD700).lineStyle(2, 0x000000).drawCircle(0, 0, 10).endFill();
                w.position.set(tile.x, tile.y); infraLayer.addChild(w);
            }
        });
    }

    updateVisibility(); updateInfraView();

    // --- INTERACTION MIT FIX FÜR WASSER-SPERRE ---
    app.stage.eventMode = 'static';
    app.stage.on('pointertap', (e) => {
        if (e.button !== 0) return;
        const localPos = worldContainer.toLocal(e.global);
        const q = Math.round((Math.sqrt(3)/3 * localPos.x - 1/3 * localPos.y) / MAP_SETTINGS.hexSize);
        const r = Math.round((2/3 * localPos.y) / MAP_SETTINGS.hexSize);
        const tile = hexDataMap.get(`${q},${r}`);
        
        if (!tile || (tile.fogStatus === 'unseen' && gameState.activeTool !== 'none')) return;

        // 2. WASSER-CHECK: Nutzt exakt DEEP_WATER und WATER
        const isWater = (tile.biome.name === 'WATER' || tile.biome.name === 'DEEP_WATER');

        if (gameState.activeTool === 'road' || gameState.activeTool === 'camp') {
            if (isWater) {
                console.warn("BAU VERBOTEN auf " + tile.biome.name);
                return; 
            }
            
            const cost = gameState.activeTool === 'road' ? BUILDINGS.road.cost.wood : BUILDINGS.camp.cost.wood;
            if (tile.infrastructure === 'none' && gameState.resources.wood >= cost) {
                if (gameState.activeTool === 'road') {
                    if (getNeighbors(q, r).some(n => hexDataMap.get(`${n.q},${n.r}`)?.infrastructure !== 'none')) {
                        gameState.resources.wood -= cost; tile.infrastructure = 'road';
                    }
                } else {
                    const d = getPathDistanceToBuilding(q, r, hexDataMap);
                    if (d >= 3 && d !== Infinity) { 
                        gameState.resources.wood -= cost; tile.infrastructure = 'camp'; 
                    }
                }
            }
        } else if (gameState.activeTool === 'worker_add') {
            if (!tile.hasWorker && gameState.workers.employed < gameState.workers.total) {
                if (getNeighbors(q, r).some(n => {
                    const nt = hexDataMap.get(`${n.q},${n.r}`);
                    return nt && (nt.infrastructure === 'castle' || nt.infrastructure === 'camp');
                })) { tile.hasWorker = true; }
            }
        } else if (gameState.activeTool === 'worker_remove') { tile.hasWorker = false; }
        else if (gameState.activeTool === 'demolish' && tile.infrastructure !== 'castle') { 
            tile.infrastructure = 'none'; tile.hasWorker = false; 
        }

        updateVisibility(); updateInfraView();
        hud.update(gameState, currentHoverText);
    });

    // --- RESOURCE TICKER ---
    setInterval(() => {
        let count = 0;
        let foodGen = 0;
        hexDataMap.forEach(tile => {
            if (tile.hasWorker) {
                count++;
                const b = tile.biome.name;
                if (b === 'WATER' || b === 'DEEP_WATER') foodGen += 2;
                else if (b === 'FOREST') { gameState.resources.wood += 1; foodGen += 0.2; }
                else if (b === 'MOUNTAIN') { gameState.resources.iron += 0.5; gameState.resources.stone += 0.5; }
                else if (b === 'GRASS') { foodGen += 1; }
            }
        });
        gameState.resources.food += (foodGen - (count * 0.5));
        if (gameState.resources.food < 0) gameState.resources.food = 0;
        gameState.workers.employed = count;
        hud.update(gameState, currentHoverText);
    }, 1000);

    // --- CAMERA ---
    let isDrag = false, dS = { x: 0, y: 0 }, cS = { x: 0, y: 0 };
    app.stage.on('pointerdown', (e) => { 
        if(e.button === 0 && gameState.activeTool === 'none') { 
            isDrag = true; dS = { x: e.global.x, y: e.global.y }; cS = { x: worldContainer.x, y: worldContainer.y }; 
        }
    });
    app.stage.on('pointermove', (e) => { if (isDrag) { worldContainer.x = cS.x + (e.global.x - dS.x); worldContainer.y = cS.y + (e.global.y - dS.y); }});
    app.stage.on('pointerup', () => isDrag = false);
    app.canvas.addEventListener('wheel', (e: WheelEvent) => {
        e.preventDefault();
        const zoom = Math.pow(1.1, -e.deltaY * 0.001);
        const next = worldContainer.scale.x * zoom;
        if (next > 0.1 && next < 3) {
            const lp = worldContainer.toLocal({x: e.clientX, y: e.clientY});
            worldContainer.scale.set(next);
            const ng = worldContainer.toGlobal(lp);
            worldContainer.x += e.clientX - ng.x; worldContainer.y += e.clientY - ng.y;
        }
    }, { passive: false });
}

init();