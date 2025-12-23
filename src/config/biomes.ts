// src/config/biomes.ts

export interface Biome {
  name: string;
  threshold: number;
  color: number;
  tileAsset: string;      // Die Hex-Boden-Textur
  decoAsset?: string;     // Das Deko-Objekt (Baum, Fels, etc.)
  decoratorDensity?: number;
}

export const BIOMES: Biome[] = [
  { 
    name: 'DEEP_WATER', 
    threshold: 0,    
    color: 0x1a365d, 
    tileAsset: 'tile_ocean.png' 
  },
  { 
    name: 'WATER',      
    threshold: 0.35, 
    color: 0x2b6cb0, 
    tileAsset: 'tile_water.png' 
  },
  { 
    name: 'SAND',       
    threshold: 0.45, 
    color: 0xed8936, 
    tileAsset: 'tile_sand.png',
    decoAsset: 'deco_cactus.png',
    decoratorDensity: 1
  },
  { 
    name: 'GRASS',      
    threshold: 0.52, 
    color: 0x48bb78, 
    tileAsset: 'tile_grass.png',
    decoAsset: 'deco_oak.png',
    decoratorDensity: 1
  },
  { 
    name: 'FOREST',     
    threshold: 0.65, 
    color: 0x2f855a, 
    tileAsset: 'tile_forest.png',
    decoAsset: 'deco_pine.png',
    decoratorDensity: 3
  },
  { 
    name: 'MOUNTAIN',   
    threshold: 0.82, 
    color: 0x718096, 
    tileAsset: 'tile_mountain.png',
    decoAsset: 'deco_rock.png',
    decoratorDensity: 2
  },
  { 
    name: 'SNOW',       
    threshold: 0.92, 
    color: 0xffffff, 
    tileAsset: 'tile_snow.png',
    decoAsset: 'deco_peak.png',
    decoratorDensity: 1
  },
];

export function getBiome(value: number): Biome {
  for (let i = BIOMES.length - 1; i >= 0; i--) {
    if (value >= BIOMES[i].threshold) {
      return BIOMES[i];
    }
  }
  return BIOMES[0];
}