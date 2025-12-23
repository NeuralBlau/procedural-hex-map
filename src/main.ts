// src/main.ts
import * as PIXI from 'pixi.js';
import { Color, TextureStyle } from 'pixi.js';
import { HexUtils } from './core/HexUtils';
import { createNoise2D } from 'simplex-noise';
import { getBiome, BIOMES } from './config/biomes';

const noise2D = createNoise2D();
TextureStyle.defaultOptions.scaleMode = 'nearest';

// --- DEINE KORREKTUR-WERTE ---
const BAKE_OFFSETS: Record<string, { x: number; y: number }> = {
    'tile_water.png': { x: 1, y: 1 },
    // Hier kannst du weitere Offsets hinzufügen, falls Assets verschoben sind
};

const EXTRA_COVER: Record<string, number> = {
    'tile_water.png': 1.7,
    'tile_ocean.png': 1.5,
    'tile_snow.png': 1.5,
    'tile_sand.png': 1.5,
    'tile_mountain.png': 1.5,
    'tile_grass.png': 1.5,
    'tile_forest.png': 1.5,
};

// --- HUD ELEMENT ---
const hud = document.createElement('div');
hud.style.position = 'absolute';
hud.style.top = '20px';
hud.style.left = '20px';
hud.style.padding = '15px';
hud.style.background = 'rgba(0, 0, 0, 0.8)';
hud.style.color = '#fff';
hud.style.fontFamily = 'monospace';
hud.style.borderRadius = '5px';
hud.style.pointerEvents = 'none';
hud.style.border = '1px solid #444';
hud.style.zIndex = '100';
hud.innerHTML = '<b>Hex-Explorer</b><br>Lade Welt...';
document.body.appendChild(hud);

// --- HILFSFUNKTIONEN ---
function hexDimensions(hexSize: number) {
    return { w: Math.sqrt(3) * hexSize, h: 2 * hexSize };
}

function createHexMask(hexSize: number, inflate = 1.25): PIXI.Graphics {
    const r = hexSize + inflate;
    const g = new PIXI.Graphics();
    g.beginFill(0xffffff);
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
    }
    g.closePath();
    g.endFill();
    return g;
}

function bakeHexMaskedTexture(
    renderer: PIXI.Renderer,
    sourceTexture: PIXI.Texture,
    hexSize: number,
    alias: string
): PIXI.Texture {
    const { w, h } = hexDimensions(hexSize);
    const container = new PIXI.Container();
    const sprite = new PIXI.Sprite(sourceTexture);
    sprite.anchor.set(0.5);

    // 1. Offsets anwenden
    if (BAKE_OFFSETS[alias]) {
        sprite.position.x += BAKE_OFFSETS[alias].x;
        sprite.position.y += BAKE_OFFSETS[alias].y;
    }

    // 2. Skalierung mit Extra-Cover berechnen
    let cover = Math.max(w / sourceTexture.width, h / sourceTexture.height);
    if (EXTRA_COVER[alias]) {
        cover *= EXTRA_COVER[alias];
    }
    sprite.scale.set(cover);

    // 3. Maske anwenden (inflate 1.25 für saubere Kanten)
    const mask = createHexMask(hexSize, 1.25); 
    sprite.mask = mask;
    container.addChild(sprite, mask);

    const baked = renderer.generateTexture({
        target: container,
        resolution: 1,
        antialias: false,
    });

    container.destroy({ children: true });
    return baked;
}

async function init() {
    const app = new PIXI.Application();
    await app.init({ 
        background: '#0a0a0a', 
        resizeTo: window, 
        antialias: false 
    });
    document.body.appendChild(app.canvas);

    // --- ASSETS LADEN ---
    const assetAliases = new Set<string>();
    BIOMES.forEach(b => {
        if ((b as any).tileAsset) assetAliases.add((b as any).tileAsset);
        if ((b as any).decoAsset) assetAliases.add((b as any).decoAsset);
    });

    for (const alias of assetAliases) {
        PIXI.Assets.add({ alias, src: `/assets/${alias}` });
    }
    const loadedAssets = await PIXI.Assets.load([...assetAliases]);

    // --- PRE-BAKING ---
    const tileCache = new Map<string, PIXI.Texture>();
    const hexSize = 30;
    const { w: hexW, h: hexH } = hexDimensions(hexSize);

    BIOMES.forEach(biome => {
        const alias = (biome as any).tileAsset;
        if (alias && !tileCache.has(alias)) {
            tileCache.set(alias, bakeHexMaskedTexture(app.renderer, loadedAssets[alias], hexSize, alias));
        }
    });

    const worldContainer = new PIXI.Container();
    const groundLayer = new PIXI.Container();
    const decoLayer = new PIXI.Container();
    decoLayer.sortableChildren = true;
    
    worldContainer.addChild(groundLayer, decoLayer);
    app.stage.addChild(worldContainer);

    // --- MAP SETTINGS (Rechteck) ---
    const mapWidth = 80;
    const mapHeight = 50;
    const noiseScale = 0.06;
    const animatedDecos: PIXI.Sprite[] = [];
    const hexDataMap = new Map<string, any>();

    for (let r = 0; r < mapHeight; r++) {
        for (let q = 0; q < mapWidth; q++) {
            const axialQ = q - Math.floor(r / 2);
            const axialR = r;

            const val = (noise2D(axialQ * noiseScale, axialR * noiseScale) + 1) / 2;
            const biome = getBiome(val);
            const { x, y } = HexUtils.hexToPixel(axialQ, axialR, hexSize);

            // Boden
            const tileAsset = (biome as any).tileAsset;
            const bakedTex = tileCache.get(tileAsset);
            if (bakedTex) {
                const tile = new PIXI.Sprite(bakedTex);
                tile.anchor.set(0.5);
                tile.position.set(x, y);
                tile.width = hexW * 1.02; // Minimaler Overlap gegen Seams
                tile.height = hexH * 1.02;
                groundLayer.addChild(tile);
            }

            hexDataMap.set(`${axialQ},${axialR}`, { biome, x, y });

            // Dekorationen
            const decoAsset = (biome as any).decoAsset;
            const density = (biome as any).decoratorDensity;
            if (decoAsset && density > 0) {
                const tex = loadedAssets[decoAsset];
                for (let i = 0; i < density; i++) {
                    const deco = new PIXI.Sprite(tex);
                    deco.anchor.set(0.5, 0.95);
                    deco.position.set(
                        x + (Math.random() - 0.5) * hexW * 0.5,
                        y + (Math.random() - 0.5) * hexH * 0.3
                    );
                    const scaleBase = (hexH * 0.45) / tex.height;
                    deco.scale.set(scaleBase * (0.8 + Math.random() * 0.4));
                    deco.zIndex = deco.y;
                    
                    const tone = 0.9 + Math.random() * 0.1;
                    deco.tint = new Color([tone, tone, tone]).toNumber();

                    animatedDecos.push(deco);
                    decoLayer.addChild(deco);
                }
            }
        }
    }

    // Zentrierung
    worldContainer.x = app.screen.width / 2 - (mapWidth * hexW * 0.3);
    worldContainer.y = app.screen.height / 2 - (mapHeight * hexH * 0.3);

    // --- ANIMATION TICKER ---
    let time = 0;
    app.ticker.add((ticker) => {
        time += ticker.deltaTime * 0.04;
        animatedDecos.forEach((d, i) => {
            d.skew.x = Math.sin(time + i * 0.2) * 0.03;
        });
    });

    // --- INTERAKTION ---
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

    app.stage.on('pointermove', (e) => {
        const localPos = worldContainer.toLocal(e.global);
        const q = Math.round((Math.sqrt(3)/3 * localPos.x - 1/3 * localPos.y) / hexSize);
        const r = Math.round((2/3 * localPos.y) / hexSize);
        
        const data = hexDataMap.get(`${q},${r}`);
        if (data) {
            hud.innerHTML = `<b>Biom:</b> ${data.biome.name}<br><b>Coords:</b> ${q}, ${r}`;
        }
    });

    // --- KAMERA ---
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