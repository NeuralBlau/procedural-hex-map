import * as PIXI from 'pixi.js';

export class HUD {
    private container: PIXI.Container;
    private background: PIXI.Graphics;
    
    private titleText: PIXI.Text;
    private resourceText: PIXI.Text;
    private divider: PIXI.Graphics;
    private workerText: PIXI.Text;
    private toolText: PIXI.Text;
    private hoverText: PIXI.Text;

    private readonly PADDING = 15;
    private readonly SPACING = 10;

    constructor() {
        this.container = new PIXI.Container();
        this.container.position.set(20, 20);

        const baseStyle: PIXI.TextStyleOptions = {
            fill: '#ffffff',
            fontSize: 14,
            fontFamily: 'monospace',
            lineHeight: 20, // Mehr Platz zwischen den Zeilen
            dropShadow: { alpha: 0.5, blur: 2, color: '#000000', distance: 1, angle: Math.PI / 4 }
        };

        // 1. Hintergrund
        this.background = new PIXI.Graphics();
        this.container.addChild(this.background);

        // 2. Titel
        this.titleText = new PIXI.Text({ 
            text: 'HEX CASTLE', 
            style: { ...baseStyle, fill: '#ffcc00', fontWeight: 'bold', fontSize: 16 } 
        });
        this.titleText.position.set(this.PADDING, this.PADDING);

        // 3. Ressourcen
        this.resourceText = new PIXI.Text({ text: '', style: baseStyle });
        this.resourceText.position.set(this.PADDING, this.titleText.y + this.titleText.height + this.SPACING);

        // 4. Trenner
        this.divider = new PIXI.Graphics();
        this.container.addChild(this.divider);

        // 5. Arbeiter
        this.workerText = new PIXI.Text({ text: '', style: baseStyle });
        
        // 6. Tool
        this.toolText = new PIXI.Text({ text: '', style: { ...baseStyle, fill: '#ffcc00' } });

        // 7. Hover Info
        this.hoverText = new PIXI.Text({ text: '', style: { ...baseStyle, fill: '#aaaaaa', fontSize: 12 } });

        this.container.addChild(this.titleText, this.resourceText, this.workerText, this.toolText, this.hoverText);
    }

    private drawUIFrame(width: number, height: number, dividerY: number) {
        this.background.clear();
        this.background.beginFill(0x000000, 0.85);
        this.background.lineStyle(1, 0x444444, 1);
        this.background.drawRoundedRect(0, 0, width, height, 5);
        this.background.endFill();

        this.divider.clear();
        this.divider.lineStyle(1, 0x444444, 0.8);
        this.divider.moveTo(this.PADDING, dividerY);
        this.divider.lineTo(width - this.PADDING, dividerY);
    }

    public update(gameState: any, currentHover: string) {
        const res = gameState.resources;

        // Content setzen
        this.resourceText.text = 
            `🪵 Holz:   ${Math.floor(res.wood)}\n` +
            `🪨 Stein:  ${Math.floor(res.stone)}\n` +
            `⛏️ Eisen:  ${Math.floor(res.iron)}\n` +
            `🍎 Nahrung:${Math.floor(res.food)}`;

        // Dynamische Positionierung nach den Ressourcen
        const dividerY = this.resourceText.y + this.resourceText.height + this.SPACING;
        this.divider.y = 0; // Wir zeichnen ihn absolut via drawUIFrame
        
        this.workerText.text = `👷 Arbeiter: ${gameState.workers.employed} / ${gameState.workers.total}`;
        this.workerText.position.set(this.PADDING, dividerY + this.SPACING);

        const toolNames: Record<string, string> = {
            'none': 'Kamera',
            'road': 'Bau: Straße (10)',
            'camp': 'Bau: Lager (50)',
            'worker_add': 'Arbeiter +',
            'worker_remove': 'Arbeiter -',
            'demolish': 'Abriss'
        };
        this.toolText.text = `🛠️ Tool: ${toolNames[gameState.activeTool] || '---'}`;
        this.toolText.position.set(this.PADDING, this.workerText.y + this.workerText.height + 5);

        this.hoverText.text = currentHover ? `Info: ${currentHover}` : '';
        this.hoverText.position.set(this.PADDING, this.toolText.y + this.toolText.height + this.SPACING);

        // Frame Größe berechnen
        const finalHeight = this.hoverText.y + (this.hoverText.text ? this.hoverText.height + this.PADDING : 0) + (this.hoverText.text ? 0 : this.PADDING);
        this.drawUIFrame(220, finalHeight, dividerY);
    }

    public getContainer() {
        return this.container;
    }
}