// src/config/mapConfig.ts

export const MAP_SETTINGS = {
    hexSize: 30,
    mapWidth: 120,
    mapHeight: 80,
    noiseScale: 0.06,
    overlap: 1.02 // Der kleine Puffer gegen Seams
};

export const BAKE_OFFSETS: Record<string, { x: number; y: number }> = {
    'tile_water.png': { x: 1, y: 1 },
};

export const EXTRA_COVER: Record<string, number> = {
    'tile_water.png': 1.7,
    'tile_ocean.png': 1.5,
    'tile_snow.png': 1.5,
    'tile_sand.png': 1.5,
    'tile_mountain.png': 1.5,
    'tile_grass.png': 1.5,
    'tile_forest.png': 1.5,
};