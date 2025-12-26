// src/ui/components/ResourcePanel.ts
import * as PIXI from 'pixi.js';

export class ResourcePanel extends PIXI.Container {
    private resourceText: PIXI.Text;

    constructor(style: PIXI.TextStyleOptions) {
        super();
        this.resourceText = new PIXI.Text({ text: '', style });
        this.addChild(this.resourceText);
    }

    public update(resources: any): void {
        this.resourceText.text =
            `🪵 Holz:   ${Math.floor(resources.wood)}\n` +
            `🪨 Stein:  ${Math.floor(resources.stone)}\n` +
            `⛏️ Eisen:  ${Math.floor(resources.iron)}\n` +
            `🍎 Nahrung:${Math.floor(resources.food)}`;
    }

    public getHeight(): number {
        return this.resourceText.height;
    }
}
