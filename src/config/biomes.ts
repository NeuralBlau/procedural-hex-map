// src/config/biomes.ts

export interface Biome {
  name: string;
  threshold: number;
  color: number;
  decoratorColor?: number;
  decoratorDensity?: number;
}

export const BIOMES: Biome[] = [
  { name: 'DEEP_WATER', threshold: 0,    color: 0x1a365d },
  { name: 'WATER',      threshold: 0.35, color: 0x2b6cb0 },
  { name: 'SAND',       threshold: 0.45, color: 0xed8936 },
  { name: 'GRASS',      threshold: 0.52, color: 0x48bb78, decoratorColor: 0x2f855a, decoratorDensity: 1 },
  { name: 'FOREST',     threshold: 0.65, color: 0x2f855a, decoratorColor: 0x1a4731, decoratorDensity: 3 },
  { name: 'MOUNTAIN',   threshold: 0.82, color: 0x718096, decoratorColor: 0x4a5568, decoratorDensity: 2 },
  { name: 'SNOW',       threshold: 0.92, color: 0xffffff, decoratorColor: 0xa0aec0, decoratorDensity: 1 },
];

export function getBiome(value: number): Biome {
  for (let i = BIOMES.length - 1; i >= 0; i--) {
    if (value >= BIOMES[i].threshold) {
      return BIOMES[i];
    }
  }
  return BIOMES[0];
}