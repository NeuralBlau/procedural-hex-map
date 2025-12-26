// src/ui/components/StatusPanel.ts
import * as PIXI from 'pixi.js';

export class StatusPanel extends PIXI.Container {
    private workerText: PIXI.Text;
    private toolText: PIXI.Text;
    private victoryText: PIXI.Text;
    private virusText: PIXI.Text;
    private castleText: PIXI.Text;
    private hoverText: PIXI.Text;

    private readonly SPACING = 5;

    constructor(baseStyle: PIXI.TextStyleOptions) {
        super();

        this.workerText = new PIXI.Text({ text: '', style: baseStyle });
        this.toolText = new PIXI.Text({ text: '', style: { ...baseStyle, fill: '#ffcc00' } });
        this.victoryText = new PIXI.Text({ text: '', style: { ...baseStyle, fill: '#00FF00', fontWeight: 'bold' } });
        this.virusText = new PIXI.Text({ text: '', style: { ...baseStyle, fill: '#FF4500', fontWeight: 'bold' } });
        this.castleText = new PIXI.Text({ text: '', style: { ...baseStyle, fill: '#00ccff', fontWeight: 'bold' } });
        this.hoverText = new PIXI.Text({ text: '', style: { ...baseStyle, fill: '#aaaaaa', fontSize: 12 } });

        this.addChild(this.workerText, this.toolText, this.victoryText, this.virusText, this.castleText, this.hoverText);
    }

    public update(gameState: any, currentHover: string): void {
        this.workerText.text = `👷 Arbeiter: ${gameState.workers.employed} / ${gameState.workers.total}`;

        const toolNames: Record<string, string> = {
            'none': 'Kamera',
            'road': 'Bau: Straße (10)',
            'camp': 'Bau: Lager (50)',
            'tower': 'Bau: Turm (50H, 50S, 20E)',
            'temple': 'Bau: Tempel (100H, 100S, 50E)',
            'worker_add': 'Arbeiter +',
            'worker_remove': 'Arbeiter -',
            'demolish': 'Abriss'
        };
        this.toolText.text = `🛠️ Tool: ${toolNames[gameState.activeTool] || '---'}`;

        const winProgress = Math.min(100, Math.floor((gameState.victoryPoints / gameState.winThreshold) * 100));
        this.victoryText.text = `🏆 Sieg: ${gameState.victoryPoints} / ${gameState.winThreshold} (${winProgress}%)`;

        const totalTiles = 9600;
        const virusProgress = Math.min(100, Math.floor((gameState.infectedTileCount / (totalTiles * 0.05)) * 100));
        this.virusText.text = `🦠 Seuche: ${gameState.infectedTileCount} / ${Math.floor(totalTiles * 0.05)} (${virusProgress}%)`;

        this.castleText.text = `🏰 Burg Level: ${gameState.castleLevel}`;
        this.hoverText.text = currentHover ? `Info: ${currentHover}` : '';

        // Layout
        this.workerText.y = 0;
        this.toolText.y = this.workerText.y + this.workerText.height + this.SPACING;
        this.victoryText.y = this.toolText.y + this.toolText.height + this.SPACING;
        this.virusText.y = this.victoryText.y + this.victoryText.height + this.SPACING;
        this.castleText.y = this.virusText.y + this.virusText.height + this.SPACING;
        this.hoverText.y = this.castleText.y + this.castleText.height + this.SPACING * 2;
    }

    public getNextY(): number {
        return this.castleText.y + this.castleText.height;
    }

    public getFinalHeight(): number {
        return this.hoverText.y + (this.hoverText.text ? this.hoverText.height : 0);
    }
}
