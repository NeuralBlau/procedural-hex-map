// src/core/TextureBaker.ts
import * as PIXI from 'pixi.js';
import { BAKE_OFFSETS, EXTRA_COVER } from '../config/mapConfig';

/**
 * Berechnet die Breite und Höhe eines Hexagons basierend auf der Größe (Radius).
 */
export function getHexDimensions(hexSize: number) {
    return { w: Math.sqrt(3) * hexSize, h: 2 * hexSize };
}

/**
 * Erstellt eine hexagonale Maske als PIXI Graphics Objekt.
 */
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

/**
 * Nimmt eine quadratische Asset-Textur und schneidet sie hexagonal zu.
 * Wendet dabei Offsets und Skalierungen aus der Config an.
 */
export function bakeHexMaskedTexture(
    renderer: PIXI.Renderer,
    sourceTexture: PIXI.Texture,
    hexSize: number,
    alias: string
): PIXI.Texture {
    const { w, h } = getHexDimensions(hexSize);
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

    // 3. Maske anwenden
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