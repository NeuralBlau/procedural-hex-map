// src/main.ts
import * as PIXI from 'pixi.js';
import { Color, TextureStyle } from 'pixi.js';
import { HexUtils } from './core/HexUtils';
import { createNoise2D } from 'simplex-noise';
import { getBiome, BIOMES } from './config/biomes';

const noise2D = createNoise2D();
TextureStyle.defaultOptions.scaleMode = 'nearest';

type TextureCache = Map<string, PIXI.Texture>;

// ----------------------------------------------------
// Asset-Fixes (nur für Baking!)
//
// Idee: Manche PNGs sind nicht perfekt zentriert / haben Padding.
// Wir korrigieren das beim Baking einmal pro Asset.
// Werte sind in "Texture-Pixeln" nach dem Anchor (0,0) Shift.
// Startwerte: du kannst hier feinjustieren.
// ----------------------------------------------------
const BAKE_OFFSETS: Record<string, { x: number; y: number }> = {
  'tile_water.png': { x: 1, y: 1 },
  // Beispiele – passe die Keys an deine echten Asset-Namen an:
  // 'tile_water.png': { x: 0, y: 6 },
  // 'tile_shallow_water.png': { x: 0, y: 6 },
};

const EXTRA_COVER: Record<string, number> = {
  'tile_water.png': 1.7,
  'tile_ocean.png': 1.5,
  'tile_snow.png': 1.5,
  'tile_sand.png': 1.5,
  'tile_mountain.png': 1.5,
  'tile_grass.png': 1.5,
  'tile_forest.png': 1.5,
 
  // falls ein Asset minimal mehr overdraw braucht:
  // 'tile_water.png': 1.05,
};

// ----------------------------------------------------

function hexDimensions(hexSize: number) {
  return { w: Math.sqrt(3) * hexSize, h: 2 * hexSize }; // pointy top
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
  sprite.position.set(0, 0);

  // Optionaler Offset für problematische Assets (z.B. Water)
  if (alias && BAKE_OFFSETS[alias]) {
    sprite.position.x += BAKE_OFFSETS[alias].x;
    sprite.position.y += BAKE_OFFSETS[alias].y;
  }

  // Cover-Skalierung: Hex-Bounds werden vollständig abgedeckt
  let cover = Math.max(w / sprite.texture.width, h / sprite.texture.height);

  // Optional: extra cover pro Asset
  if (alias && EXTRA_COVER[alias]) {
    cover *= EXTRA_COVER[alias];
  }

  sprite.scale.set(cover);

  const mask = createHexMask(hexSize, 1.25);
  mask.position.set(0, 0);

  sprite.mask = mask;
  container.addChild(sprite);
  container.addChild(mask);

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
    background: '#1a1a1a',
    resizeTo: window,
    antialias: false,
  });
  document.body.appendChild(app.canvas);

  const worldContainer = new PIXI.Container();
  app.stage.addChild(worldContainer);

  const groundLayer = new PIXI.Container();
  const decoLayer = new PIXI.Container();
  decoLayer.sortableChildren = true;

  worldContainer.addChild(groundLayer);
  worldContainer.addChild(decoLayer);

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

  for (const alias of assetAliases) {
    PIXI.Assets.add({ alias, src: `/assets/${alias}` });
  }
  await PIXI.Assets.load([...assetAliases]);

  // --- Caches ---
  const tileCache: TextureCache = new Map();
  const decoCache: TextureCache = new Map();

  function getTileTexture(alias: string): PIXI.Texture | undefined {
    const cached = tileCache.get(alias);
    if (cached) return cached;

    const raw = PIXI.Assets.get(alias) as PIXI.Texture | undefined;
    if (!raw) return undefined;

    const baked = bakeHexMaskedTexture(app.renderer, raw, hexSize, alias);
    tileCache.set(alias, baked);
    return baked;
  }

  function getDecoTexture(alias: string): PIXI.Texture | undefined {
    const cached = decoCache.get(alias);
    if (cached) return cached;

    const tex = PIXI.Assets.get(alias) as PIXI.Texture | undefined;
    if (!tex) return undefined;

    decoCache.set(alias, tex);
    return tex;
  }

  // --- Render grid ---
  for (let q = -mapRange; q <= mapRange; q++) {
    for (let r = -mapRange; r <= mapRange; r++) {
      const s = -q - r;
      if (Math.abs(q) > mapRange || Math.abs(r) > mapRange || Math.abs(s) > mapRange) continue;

      const value = (noise2D(q * noiseScale, r * noiseScale) + 1) / 2;
      const biome = getBiome(value);

      const tileAsset = (biome as any).tileAsset as string | undefined;
      if (!tileAsset) continue;

      const tileTexture = getTileTexture(tileAsset);
      if (!tileTexture) continue;

      const { x, y } = HexUtils.hexToPixel(q, r, hexSize);

      // Tile sprite
      const tile = new PIXI.Sprite(tileTexture);
      tile.anchor.set(0.5);
      tile.position.set(x, y);

      // kleiner Overdraw gegen Seams
      tile.width = hexW * 1.03;
      tile.height = hexH * 1.03;

      groundLayer.addChild(tile);

      // Decorators
      const density = (biome as any).decoratorDensity as number | undefined;
      const decoAsset = (biome as any).decoAsset as string | undefined;

      if (density && density > 0 && decoAsset) {
        const decoTexture = getDecoTexture(decoAsset);
        if (!decoTexture) continue;

        const targetDecoH = hexH * 0.55;
        const baseScale = targetDecoH / decoTexture.height;

        const safeX = hexW * 0.35;
        const safeY = hexH * 0.20;

        for (let i = 0; i < density; i++) {
          const deco = new PIXI.Sprite(decoTexture);
          deco.anchor.set(0.5, 1.0);

          const offsetX = (Math.random() - 0.5) * 2 * safeX;
          const offsetY = (Math.random() - 0.5) * 2 * safeY;

          deco.position.set(x + offsetX, y + offsetY + hexH * 0.15);

          const jitter = 0.85 + Math.random() * 0.25;
          deco.scale.set(baseScale * jitter);

          const tone = 0.92 + Math.random() * 0.08;
          deco.tint = new Color([tone, tone, tone]).toNumber();

          deco.zIndex = deco.y;
          decoLayer.addChild(deco);
        }
      }
    }
  }

  // Center
  worldContainer.x = app.screen.width / 2;
  worldContainer.y = app.screen.height / 2;

  // Camera
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;

  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let containerStart = { x: 0, y: 0 };

  app.stage.on('pointerdown', (e) => {
    isDragging = true;
    dragStart = { x: e.global.x, y: e.global.y };
    containerStart = { x: worldContainer.x, y: worldContainer.y };
  });

  app.stage.on('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.global.x - dragStart.x;
    const dy = e.global.y - dragStart.y;
    worldContainer.x = containerStart.x + dx;
    worldContainer.y = containerStart.y + dy;
  });

  app.stage.on('pointerup', () => (isDragging = false));
  app.stage.on('pointerupoutside', () => (isDragging = false));

  app.canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const delta = -e.deltaY;
      const zoomFactor = Math.pow(1.1, delta / 100);
      const newScale = worldContainer.scale.x * zoomFactor;
      if (newScale > 0.2 && newScale < 6) worldContainer.scale.set(newScale);
    },
    { passive: false }
  );

  console.log('OK: baked tiles + per-asset offsets supported.');
}

init();
// src/config/biomes.ts