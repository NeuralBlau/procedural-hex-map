// src/core/HexUtils.ts

export type AxialCoord = { q: number; r: number };
export type Point = { x: number; y: number };

export class HexUtils {
  // size = Abstand von der Mitte zu einer Ecke
  static hexToPixel(q: number, r: number, size: number): Point {
    // Die Mathematik für "Flat-Top" Hexagons (flache Seite oben)
    // Wenn wir "Pointy-Top" (Spitze oben) wollen, ändert sich die Formel leicht.
    // Wir nehmen hier "Pointy-Top", wie im Video zu sehen.
    const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = size * (1.5 * r);
    return { x, y };
  }

  // Für spätere Maus-Interaktionen (Pixel zu Hex)
  static pixelToHex(x: number, y: number, size: number): AxialCoord {
    const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
    const r = ((2 / 3) * y) / size;
    return this.hexRound(q, r);
  }

  private static hexRound(fracQ: number, fracR: number): AxialCoord {
    let q = Math.round(fracQ);
    let r = Math.round(fracR);
    let s = Math.round(-fracQ - fracR);

    const qDiff = Math.abs(q - fracQ);
    const rDiff = Math.abs(r - fracR);
    const sDiff = Math.abs(s - (-fracQ - fracR));

    if (qDiff > rDiff && qDiff > sDiff) {
      q = -r - s;
    } else if (rDiff > sDiff) {
      r = -q - s;
    }
    return { q, r };
  }
}
