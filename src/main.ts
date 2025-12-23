// src/main.ts (Erweiterung)
import * as PIXI from 'pixi.js';
import { HexUtils } from './core/HexUtils';

async function init() {
  const app = new PIXI.Application();
  
  await app.init({ 
    background: '#1a1a1a', 
    resizeTo: window,
    antialias: true 
  });

  document.body.appendChild(app.canvas);

  const worldContainer = new PIXI.Container();
  app.stage.addChild(worldContainer);

  // Einstellungen für unser Gitter
  const hexSize = 30; // Radius eines Hexagons
  const mapRange = 5;  // Wie viele Ringe um das Zentrum

  // Wir zeichnen die Hexagons
  for (let q = -mapRange; q <= mapRange; q++) {
    for (let r = -mapRange; r <= mapRange; r++) {
      
      // In einem axialen Gitter gilt: q + r + s = 0. 
      // Wir müssen s berechnen, um zu prüfen, ob das Hex im Radius liegt.
      const s = -q - r;
      if (Math.abs(q) <= mapRange && Math.abs(r) <= mapRange && Math.abs(s) <= mapRange) {
        
        // Berechne die Pixel-Position mit unserer HexUtils
        const { x, y } = HexUtils.hexToPixel(q, r, hexSize);
        
        // Zeichne das Hexagon
        const graphics = new PIXI.Graphics();
        graphics.lineStyle(2, 0x555555); // Graue Umrandung
        graphics.beginFill(0x222222);    // Dunkler Hintergrund
        
        // Zeichne 6 Ecken
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i + (Math.PI / 6); // + PI/6 für "Pointy Top"
          const cornerX = x + hexSize * Math.cos(angle);
          const cornerY = y + hexSize * Math.sin(angle);
          if (i === 0) graphics.moveTo(cornerX, cornerY);
          else graphics.lineTo(cornerX, cornerY);
        }
        
        graphics.closePath();
        graphics.endFill();
        
        worldContainer.addChild(graphics);
      }
    }
  }

  // Zentriere das Gitter im Viewport
  worldContainer.x = app.screen.width / 2;
  worldContainer.y = app.screen.height / 2;
}

init();