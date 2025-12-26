// src/ui/components/StatusOverlay.ts
import * as PIXI from 'pixi.js';

export class StatusOverlay extends PIXI.Container {
    private overlayBg: PIXI.Graphics;
    private statusText: PIXI.Text;

    constructor(baseStyle: PIXI.TextStyleOptions) {
        super();
        this.visible = false;

        this.overlayBg = new PIXI.Graphics();
        this.overlayBg.beginFill(0x000000, 0.7);
        this.overlayBg.drawRect(-5000, -5000, 10000, 10000);
        this.overlayBg.endFill();

        this.statusText = new PIXI.Text({
            text: '',
            style: { ...baseStyle, fontSize: 48, fontWeight: 'bold', align: 'center', lineHeight: 60 }
        });
        this.statusText.anchor.set(0.5);

        this.addChild(this.overlayBg, this.statusText);
    }

    public update(gameStatus: string, centerX: number, centerY: number): void {
        if (gameStatus !== 'playing') {
            this.visible = true;
            this.position.set(centerX, centerY);

            if (gameStatus === 'won') {
                this.statusText.text = "SIEG!\nDer Tempel hat uns gerettet!";
                this.statusText.style.fill = '#FFD700';
            } else {
                this.statusText.text = "NIEDERLAGE!\nDie Seuche hat alles verzehrt...";
                this.statusText.style.fill = '#FF4500';
            }
        } else {
            this.visible = false;
        }
    }
}
