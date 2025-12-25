import * as PIXI from 'pixi.js';

export class HUD {
    private container: PIXI.Container;
    private background: PIXI.Graphics;

    private titleText: PIXI.Text;
    private resourceText: PIXI.Text;
    private divider: PIXI.Graphics;
    private workerText: PIXI.Text;
    private toolText: PIXI.Text;
    private victoryText: PIXI.Text;
    private virusText: PIXI.Text;
    private hoverText: PIXI.Text;
    private statusOverlay: PIXI.Container;
    private statusText: PIXI.Text;

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

        // 7. Victory Points
        this.victoryText = new PIXI.Text({ text: '', style: { ...baseStyle, fill: '#00FF00', fontWeight: 'bold' } });

        // 8. Virus Progress
        this.virusText = new PIXI.Text({ text: '', style: { ...baseStyle, fill: '#FF4500', fontWeight: 'bold' } });

        // 9. Hover Info
        this.hoverText = new PIXI.Text({ text: '', style: { ...baseStyle, fill: '#aaaaaa', fontSize: 12 } });

        // 9. Status Overlay (Win/Lose)
        this.statusOverlay = new PIXI.Container();
        this.statusOverlay.visible = false;

        const overlayBg = new PIXI.Graphics();
        overlayBg.beginFill(0x000000, 0.7);
        overlayBg.drawRect(-5000, -5000, 10000, 10000); // Full screen-ish
        overlayBg.endFill();

        this.statusText = new PIXI.Text({
            text: '',
            style: { ...baseStyle, fontSize: 48, fontWeight: 'bold', align: 'center' }
        });
        this.statusText.anchor.set(0.5);

        this.statusOverlay.addChild(overlayBg, this.statusText);

        this.container.addChild(this.titleText, this.resourceText, this.workerText, this.toolText, this.victoryText, this.virusText, this.hoverText);
        // Do not add statusOverlay to container, it should be relative to screen. We'll handle it in update or main.
    }

    public getStatusOverlay() {
        return this.statusOverlay;
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
            'temple': 'Bau: Tempel (100H, 100S, 50E)',
            'worker_add': 'Arbeiter +',
            'worker_remove': 'Arbeiter -',
            'demolish': 'Abriss'
        };
        this.toolText.text = `🛠️ Tool: ${toolNames[gameState.activeTool] || '---'}`;
        this.toolText.position.set(this.PADDING, this.workerText.y + this.workerText.height + 5);

        const winProgress = Math.min(100, Math.floor((gameState.victoryPoints / gameState.winThreshold) * 100));
        this.victoryText.text = `🏆 Sieg: ${gameState.victoryPoints} / ${gameState.winThreshold} (${winProgress}%)`;
        this.victoryText.position.set(this.PADDING, this.toolText.y + this.toolText.height + 5);

        const totalTiles = 9600; // Hardcoded for now, should ideally come from MAP_SETTINGS
        const virusProgress = Math.min(100, Math.floor((gameState.infectedTileCount / (totalTiles * 0.05)) * 100));
        this.virusText.text = `🦠 Seuche: ${gameState.infectedTileCount} / ${Math.floor(totalTiles * 0.05)} (${virusProgress}%)`;
        this.virusText.position.set(this.PADDING, this.victoryText.y + this.victoryText.height + 5);

        this.hoverText.text = currentHover ? `Info: ${currentHover}` : '';
        this.hoverText.position.set(this.PADDING, this.virusText.y + this.virusText.height + this.SPACING);

        // Update status overlay
        if (gameState.gameStatus !== 'playing') {
            this.statusOverlay.visible = true;
            this.statusOverlay.position.set(window.innerWidth / 2 - this.container.x, window.innerHeight / 2 - this.container.y);

            if (gameState.gameStatus === 'won') {
                this.statusText.text = "SIEG!\nDer Tempel hat uns gerettet!";
                this.statusText.style.fill = '#FFD700';
            } else {
                this.statusText.text = "NIEDERLAGE!\nDie Seuche hat alles verzehrt...";
                this.statusText.style.fill = '#FF4500';
            }
        } else {
            this.statusOverlay.visible = false;
        }

        // Frame Größe berechnen
        const finalHeight = this.hoverText.y + (this.hoverText.text ? this.hoverText.height + this.PADDING : 0) + (this.hoverText.text ? 0 : this.PADDING);
        this.drawUIFrame(220, finalHeight, dividerY);
    }

    public getContainer() {
        return this.container;
    }
}