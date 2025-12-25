// src/systems/VisibilitySystem.ts
import { HexUtils } from '../core/HexUtils';
import type { WorldTileData } from '../config/mapConfig';

export class VisibilitySystem {
    private hexDataMap: Map<string, WorldTileData>;
    private tileSprites: Map<string, any>;

    constructor(hexDataMap: Map<string, WorldTileData>, tileSprites: Map<string, any>) {
        this.hexDataMap = hexDataMap;
        this.tileSprites = tileSprites;
    }

    // Update fog of war visibility
    update(): void {
        // Reset all visible tiles to seen
        this.hexDataMap.forEach(tile => {
            if (tile.fogStatus === 'visible') tile.fogStatus = 'seen';
        });

        // Calculate new visibility from buildings and workers
        this.hexDataMap.forEach(tile => {
            if (tile.infrastructure !== 'none' || tile.hasWorker) {
                let visR = tile.infrastructure === 'castle' ? 5 :
                    (tile.infrastructure === 'camp' ? 3 : 2);

                HexUtils.getTilesInRadius(tile.q, tile.r, visR).forEach(pos => {
                    const t = this.hexDataMap.get(`${pos.q},${pos.r}`);
                    if (t) t.fogStatus = 'visible';
                });
            }
        });

        // Apply tint to sprites based on visibility
        this.hexDataMap.forEach(tile => {
            const s = this.tileSprites.get(`${tile.q},${tile.r}`);
            if (s) {
                s.tint = tile.fogStatus === 'visible' ? 0xffffff :
                    (tile.fogStatus === 'seen' ? 0x333333 : 0x000000);
            }
        });
    }
}
