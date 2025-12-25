export const BUILDINGS: Record<string, any> = {
    road: {
        name: 'Straße',
        cost: { wood: 10 },
        color: 0x555555
    },
    camp: {
        name: 'Arbeiter-Lager',
        cost: { wood: 50 },
        color: 0xFFA500
    },
    temple: {
        name: 'Tempel',
        cost: { wood: 100, stone: 100, iron: 50 },
        color: 0x00FF00
    },
    tower: {
        name: 'Turm',
        cost: { wood: 50, stone: 50, iron: 20 },
        color: 0xA020F0
    }
};

export const CASTLE_UPGRADES = [
    { level: 2, cost: { wood: 200, stone: 100 }, workerBoost: 5 },
    { level: 3, cost: { wood: 400, stone: 200, iron: 50 }, workerBoost: 5 },
    { level: 4, cost: { wood: 800, stone: 400, iron: 150 }, workerBoost: 5 },
    { level: 5, cost: { wood: 1500, stone: 800, iron: 400 }, workerBoost: 5 }
];