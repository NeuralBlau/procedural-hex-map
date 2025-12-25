// src/ui/Toolbar.ts
import * as PIXI from 'pixi.js';
import type { ToolConfig } from '../config/toolsConfig';
import type { GameState } from '../core/GameState';
import type { HUD } from './HUD';

export class Toolbar {
    private container: PIXI.Container;
    private gameState: GameState;
    private hud: HUD;
    private currentHoverText: string;

    constructor(tools: ToolConfig[], gameState: GameState, hud: HUD, currentHoverText: string) {
        this.container = new PIXI.Container();
        this.gameState = gameState;
        this.hud = hud;
        this.currentHoverText = currentHoverText;

        tools.forEach((t, i) => {
            const btn = new PIXI.Container();
            btn.position.set(i * 125, 0);
            btn.eventMode = 'static';
            btn.cursor = 'pointer';

            const bg = new PIXI.Graphics()
                .beginFill(0x222222)
                .lineStyle(2, t.color)
                .drawRoundedRect(0, 0, 110, 40, 5)
                .endFill();

            const txt = new PIXI.Text({
                text: t.label,
                style: { fill: 0xffffff, fontSize: 12, fontWeight: 'bold' }
            });
            txt.anchor.set(0.5);
            txt.position.set(55, 20);

            btn.addChild(bg, txt);
            btn.on('pointertap', (e) => {
                e.stopPropagation();
                this.gameState.activeTool = (this.gameState.activeTool === t.id) ? 'none' : (t.id as any);
                this.hud.update(this.gameState, this.currentHoverText);
            });

            this.container.addChild(btn);
        });
    }

    getContainer(): PIXI.Container {
        return this.container;
    }

    positionAt(centerX: number, y: number): void {
        this.container.position.set(centerX - this.container.width / 2, y);
    }
}
