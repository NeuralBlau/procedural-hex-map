// src/ui/HUD.ts
import * as PIXI from 'pixi.js';
import { ResourcePanel } from './components/ResourcePanel';
import { StatusPanel } from './components/StatusPanel';
import { UpgradePanel } from './components/UpgradePanel';
import { StatusOverlay } from './components/StatusOverlay';

export class HUD {
    private container: PIXI.Container;
    private background: PIXI.Graphics;
    private divider: PIXI.Graphics;
    private titleText: PIXI.Text;

    private resourcePanel: ResourcePanel;
    private statusPanel: StatusPanel;
    private upgradePanel: UpgradePanel;
    private statusOverlay: StatusOverlay;

    private readonly PADDING = 15;
    private readonly SPACING = 10;

    constructor() {
        this.container = new PIXI.Container();
        this.container.position.set(20, 20);

        const baseStyle: PIXI.TextStyleOptions = {
            fill: '#ffffff',
            fontSize: 14,
            fontFamily: 'monospace',
            lineHeight: 20,
            dropShadow: { alpha: 0.5, blur: 2, color: '#000000', distance: 1, angle: Math.PI / 4 }
        };

        // 1. Background
        this.background = new PIXI.Graphics();
        this.container.addChild(this.background);

        // 2. Title
        this.titleText = new PIXI.Text({
            text: 'HEX CASTLE',
            style: { ...baseStyle, fill: '#ffcc00', fontWeight: 'bold', fontSize: 16 }
        });
        this.titleText.position.set(this.PADDING, this.PADDING);

        // 3. Panels
        this.resourcePanel = new ResourcePanel(baseStyle);
        this.resourcePanel.position.set(this.PADDING, this.titleText.y + this.titleText.height + this.SPACING);

        this.divider = new PIXI.Graphics();

        this.statusPanel = new StatusPanel(baseStyle);

        this.upgradePanel = new UpgradePanel(baseStyle, () => {
            // Upgrade logic is handled by internal State/Interaction
        });

        this.statusOverlay = new StatusOverlay(baseStyle);

        this.container.addChild(
            this.titleText,
            this.resourcePanel,
            this.divider,
            this.statusPanel,
            this.upgradePanel
        );
    }

    public getContainer(): PIXI.Container {
        return this.container;
    }

    public getStatusOverlay(): PIXI.Container {
        return this.statusOverlay;
    }

    public update(gameState: any, currentHover: string) {
        // 1. Update Components
        this.resourcePanel.update(gameState.resources);

        const dividerY = this.resourcePanel.y + this.resourcePanel.getHeight() + this.SPACING;

        this.statusPanel.update(gameState, currentHover);
        this.statusPanel.position.set(this.PADDING, dividerY + this.SPACING);

        this.upgradePanel.update(gameState);
        this.upgradePanel.position.set(this.PADDING, this.statusPanel.y + this.statusPanel.getNextY() + this.SPACING);

        // 2. Dynamic Layout
        const panelBottom = this.upgradePanel.visible ? this.upgradePanel.y + 25 : this.statusPanel.y + this.statusPanel.getNextY();
        this.statusPanel.getChildByName('hoverText')?.position.set(0, panelBottom - this.statusPanel.y + this.SPACING);
        // Wait, StatusPanel handles its own layout for hoverText inside. 
        // Let's adjust HUD to be simpler.

        const finalHeight = this.statusPanel.y + this.statusPanel.getFinalHeight() + this.PADDING;

        // 3. Redraw Frame
        this.drawUIFrame(220, finalHeight, dividerY);

        // 4. Update Win/Loss Overlay
        this.statusOverlay.update(gameState.gameStatus, window.innerWidth / 2 - this.container.x, window.innerHeight / 2 - this.container.y);
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
}