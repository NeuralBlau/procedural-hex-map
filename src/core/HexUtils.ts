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

  // Get all 6 neighbors of a hex tile
  static getNeighbors(q: number, r: number): AxialCoord[] {
    return [
      { q: q + 1, r: r }, { q: q - 1, r: r },
      { q: q, r: r + 1 }, { q: q, r: r - 1 },
      { q: q + 1, r: r - 1 }, { q: q - 1, r: r + 1 }
    ];
  }

  // Get all tiles within a given radius from a center point
  static getTilesInRadius(centerQ: number, centerR: number, radius: number): AxialCoord[] {
    const results: AxialCoord[] = [];
    for (let q = -radius; q <= radius; q++) {
      for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
        results.push({ q: centerQ + q, r: centerR + r });
      }
    }
    return results;
  }

  // Find shortest path distance to nearest building (castle or camp) via roads
  static getPathDistanceToBuilding(
    startQ: number,
    startR: number,
    hexDataMap: Map<string, any>
  ): number {
    let queue = [{ q: startQ, r: startR, dist: 0 }];
    let visited = new Set<string>();
    visited.add(`${startQ},${startR}`);

    while (queue.length > 0) {
      let current = queue.shift()!;
      for (const n of this.getNeighbors(current.q, current.r)) {
        const key = `${n.q},${n.r}`;
        const tile = hexDataMap.get(key);
        if (!tile || visited.has(key)) continue;
        if (tile.infrastructure === 'castle' || tile.infrastructure === 'camp') {
          return current.dist + 1;
        }
        if (tile.infrastructure === 'road') {
          visited.add(key);
          queue.push({ q: n.q, r: n.r, dist: current.dist + 1 });
        }
      }
    }
    return Infinity;
  }
}
