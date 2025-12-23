// src/main.ts
import * as PIXI from 'pixi.js';
import { HexUtils } from './core/HexUtils';
import { createNoise2D } from 'simplex-noise';
import { getBiome, BIOMES } from './config/biomes';

const noise2D = createNoise2D();

async function init() {
  const app = new PIXI.Application();
  await app.init({
    background: '#1a1a1a',
    resizeTo: window,
    antialias: true,
  });
  document.body.appendChild(app.canvas);

  const worldContainer = new PIXI.Container();
  app.stage.addChild(worldContainer);

  const hexSize = 30;
  const mapRange = 25; 
  const noiseScale = 0.1;

  // --- TEXTUR-GENERATOR ---
  const biomeTextures: Record<string, PIXI.Texture> = {};
  const decoTextures: Record<string, PIXI.Texture> = {};

  for (const biome of BIOMES) {
    // 1. Basis Hex-Textur
    const g = new PIXI.Graphics();
    g.lineStyle(1, 0x000000, 0.2);
    g.beginFill(biome.color);
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      const cornerX = hexSize * Math.cos(angle);
      const cornerY = hexSize * Math.sin(angle);
      if (i === 0) g.moveTo(cornerX, cornerY);
      else g.lineTo(cornerX, cornerY);
    }
    g.closePath();
    g.endFill();
    biomeTextures[biome.name] = app.renderer.generateTexture(g);

    // 2. Deko-Textur (falls vorhanden)
    if (biome.decoratorColor) {
      const dg = new PIXI.Graphics();
      dg.beginFill(biome.decoratorColor);
      // Zeichne ein kleines Dreieck als Platzhalter für Baum/Berg
      dg.moveTo(0, -8);
      dg.lineTo(6, 4);
      dg.lineTo(-6, 4);
      dg.closePath();
      dg.endFill();
      decoTextures[biome.name] = app.renderer.generateTexture(dg);
    }
  }

  // --- HEX GRID ZEICHNEN ---
  for (let q = -mapRange; q <= mapRange; q++) {
    for (let r = -mapRange; r <= mapRange; r++) {
      const s = -q - r;
      if (Math.abs(q) <= mapRange && Math.abs(r) <= mapRange && Math.abs(s) <= mapRange) {
        
        const nx = q * noiseScale;
        const ny = r * noiseScale;
        const value = (noise2D(nx, ny) + 1) / 2;
        const biome = getBiome(value);
        const { x, y } = HexUtils.hexToPixel(q, r, hexSize);

        // Basis-Hex Sprite
        const sprite = new PIXI.Sprite(biomeTextures[biome.name]);
        sprite.anchor.set(0.5);
        sprite.x = x;
        sprite.y = y;
        worldContainer.addChild(sprite);

        // --- DEKORATIONEN HINZUFÜGEN ---
        if (biome.decoratorDensity && decoTextures[biome.name]) {
          for (let i = 0; i < biome.decoratorDensity; i++) {
            const deco = new PIXI.Sprite(decoTextures[biome.name]);
            deco.anchor.set(0.5);
            
            // Zufälliger Versatz innerhalb des Hexagons (grob begrenzt)
            const offsetX = (Math.random() - 0.5) * (hexSize * 0.8);
            const offsetY = (Math.random() - 0.5) * (hexSize * 0.8);
            
            deco.x = x + offsetX;
            deco.y = y + offsetY;
            
            // Zufällige Skalierung für mehr Abwechslung
            deco.scale.set(0.5 + Math.random() * 0.5);
            
            worldContainer.addChild(deco);
          }
        }
      }
    }
  }

  worldContainer.x = app.screen.width / 2;
  worldContainer.y = app.screen.height / 2;

  // --- KAMERA (PAN & ZOOM) ---
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

  app.canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const zoomFactor = Math.pow(1.1, delta / 100);
    const newScale = worldContainer.scale.x * zoomFactor;
    if (newScale > 0.1 && newScale < 5) worldContainer.scale.set(newScale);
  }, { passive: false });
}

init();