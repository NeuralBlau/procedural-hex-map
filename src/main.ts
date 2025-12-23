// src/main.ts
import * as PIXI from 'pixi.js';
import { Color, TextureStyle } from 'pixi.js';
import { HexUtils } from './core/HexUtils';
import { createNoise2D } from 'simplex-noise';
import { getBiome, BIOMES } from './config/biomes';

const noise2D = createNoise2D();
TextureStyle.defaultOptions.scaleMode = 'nearest';

type TextureCache = Map<string, PIXI.Texture>;

// --- KONFIGURATION FÜR DEN FEINSCHLIFF ---
const BAKE_OFFSETS: Record<string, { x: number; y: number }> = {
  'tile_water.png': { x: 0, y: 0 },
};

const EXTRA_COVER: Record<string, number> = {
  'tile_water.png': 1.5,
  'tile_ocean.png': 1.5,
  'tile_snow.png': 1.5,
  'tile_sand.png': 1.5,
  'tile_mountain.png': 1.5,
  'tile_grass.png': 1.5,
  'tile_forest.png': 1.5,
};

// --- HILFSFUNKTIONEN FÜR DAS BAKING ---
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
  alias?: string
): PIXI.Texture {
  const { w, h } = hexDimensions(hexSize);
  const container = new PIXI.Container();
  const sprite = new PIXI.Sprite(sourceTexture);
  sprite.anchor.set(0.5);

  if (alias && BAKE_OFFSETS[alias]) {
    sprite.position.x += BAKE_OFFSETS[alias].x;
    sprite.position.y += BAKE_OFFSETS[alias].y;
  }

  let cover = Math.max(w / sprite.texture.width, h / sprite.texture.height);
  if (alias && EXTRA_COVER[alias]) cover *= EXTRA_COVER[alias];
  sprite.scale.set(cover);

  const mask = createHexMask(hexSize, 1.25);
  sprite.mask = mask;
  container.addChild(sprite, mask);

  const baked = renderer.generateTexture({ target: container, resolution: 1, antialias: false });
  container.destroy({ children: true });
  return baked;
}

async function init() {
  const app = new PIXI.Application();
  await app.init({ background: '#111', resizeTo: window, antialias: false });
  document.body.appendChild(app.canvas);

  const worldContainer = new PIXI.Container();
  app.stage.addChild(worldContainer);

  const groundLayer = new PIXI.Container();
  const decoLayer = new PIXI.Container();
  decoLayer.sortableChildren = true;
  worldContainer.addChild(groundLayer, decoLayer);

  const hexSize = 30;
  const mapRange = 25;
  const noiseScale = 0.1;
  const { w: hexW, h: hexH } = hexDimensions(hexSize);

  // --- Assets laden ---
  const assetAliases = new Set<string>();
  for (const b of BIOMES) {
    if ((b as any).tileAsset) assetAliases.add((b as any).tileAsset);
    if ((b as any).decoAsset) assetAliases.add((b as any).decoAsset);
  }
  for (const alias of assetAliases) PIXI.Assets.add({ alias, src: `/assets/${alias}` });
  await PIXI.Assets.load([...assetAliases]);

  const tileCache: TextureCache = new Map();
  const decoCache: TextureCache = new Map();
  const animatedDecos: PIXI.Sprite[] = [];

  // --- Grid Generierung ---
  for (let q = -mapRange; q <= mapRange; q++) {
    for (let r = -mapRange; r <= mapRange; r++) {
      const s = -q - r;
      if (Math.abs(q) > mapRange || Math.abs(r) > mapRange || Math.abs(s) > mapRange) continue;

      const value = (noise2D(q * noiseScale, r * noiseScale) + 1) / 2;
      const biome = getBiome(value);
      const tileAsset = (biome as any).tileAsset;
      if (!tileAsset) continue;

      let bakedTile = tileCache.get(tileAsset);
      if (!bakedTile) {
        bakedTile = bakeHexMaskedTexture(app.renderer, PIXI.Assets.get(tileAsset), hexSize, tileAsset);
        tileCache.set(tileAsset, bakedTile);
      }

      const { x, y } = HexUtils.hexToPixel(q, r, hexSize);
      const tile = new PIXI.Sprite(bakedTile);
      tile.anchor.set(0.5);
      tile.position.set(x, y);
      tile.width = hexW * 1.03;
      tile.height = hexH * 1.03;
      groundLayer.addChild(tile);

      // Decorators
      const decoAsset = (biome as any).decoAsset;
      const density = (biome as any).decoratorDensity;
      if (density && decoAsset) {
        const tex = PIXI.Assets.get(decoAsset);
        for (let i = 0; i < density; i++) {
          const deco = new PIXI.Sprite(tex);
          deco.anchor.set(0.5, 1.0);
          deco.position.set(
            x + (Math.random() - 0.5) * hexW * 0.7,
            y + (Math.random() - 0.5) * hexH * 0.4 + hexH * 0.15
          );
          deco.scale.set((hexH * 0.55 / tex.height) * (0.85 + Math.random() * 0.25));
          deco.tint = new Color([0.92 + Math.random() * 0.08, 0.92, 0.92]).toNumber();
          deco.zIndex = deco.y;
          
          // Wir speichern die Bäume/Objekte für die Animation
          animatedDecos.push(deco);
          decoLayer.addChild(deco);
        }
      }
    }
  }

  worldContainer.x = app.screen.width / 2;
  worldContainer.y = app.screen.height / 2;

  // --- ANIMATION TICKER (Wind Effekt) ---
  let time = 0;
  app.ticker.add((ticker) => {
    time += ticker.deltaTime * 0.03;
    animatedDecos.forEach((deco, index) => {
      // Jedes Objekt schwingt leicht versetzt (index * 0.1)
      const wind = Math.sin(time + index * 0.1) * 0.05;
      deco.skew.x = wind;
    });
  });

  // --- INTERACTION (Camera) ---
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
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
    if (newScale > 0.2 && newScale < 6) worldContainer.scale.set(newScale);
  }, { passive: false });
}

init();