// src/core/GameState.ts

export interface Resources {
    wood: number;
    stone: number;
    iron: number;
    food: number;
}

export interface Workers {
    total: number;
    employed: number;
}

export type ToolType = 'road' | 'camp' | 'temple' | 'worker_add' | 'worker_remove' | 'demolish' | 'none';
export type GameStatus = 'playing' | 'won' | 'lost';

export class GameState {
    public resources: Resources;
    public workers: Workers;
    public activeTool: ToolType;
    public gameStatus: GameStatus;
    public infectedTileCount: number;
    public victoryPoints: number;
    public winThreshold: number;

    constructor() {
        this.resources = { wood: 200, stone: 50, iron: 20, food: 100 };
        this.workers = { total: 10, employed: 0 };
        this.activeTool = 'none';
        this.gameStatus = 'playing';
        this.infectedTileCount = 0;
        this.victoryPoints = 0;
        this.winThreshold = 100;
    }

    // Resource management
    addResource(type: keyof Resources, amount: number): void {
        this.resources[type] += amount;
    }

    subtractResource(type: keyof Resources, amount: number): boolean {
        if (this.resources[type] >= amount) {
            this.resources[type] -= amount;
            return true;
        }
        return false;
    }

    hasResource(type: keyof Resources, amount: number): boolean {
        return this.resources[type] >= amount;
    }

    // Worker management
    setEmployedWorkers(count: number): void {
        this.workers.employed = count;
    }

    canAddWorker(): boolean {
        return this.workers.employed < this.workers.total;
    }

    // Tool management
    setActiveTool(tool: ToolType): void {
        this.activeTool = tool;
    }

    toggleTool(tool: ToolType): void {
        this.activeTool = this.activeTool === tool ? 'none' : tool;
    }
}
