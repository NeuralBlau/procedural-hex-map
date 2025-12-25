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

export type ToolType = 'road' | 'camp' | 'worker_add' | 'worker_remove' | 'demolish' | 'none';

export class GameState {
    public resources: Resources;
    public workers: Workers;
    public activeTool: ToolType;

    constructor() {
        this.resources = { wood: 200, stone: 50, iron: 20, food: 100 };
        this.workers = { total: 10, employed: 0 };
        this.activeTool = 'none';
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
