// src/ui/components/UpgradePanel.ts
import * as PIXI from 'pixi.js';
import { CASTLE_UPGRADES } from '../../config/buildings';

export class UpgradePanel extends PIXI.Container {
    private upgradeBtn: PIXI.Graphics;
    private upgradeBtnText: PIXI.Text;
    private lastGameState: any;

    constructor(baseStyle: PIXI.TextStyleOptions, onUpgrade: (cost: any, boost: number) => void) {
        super();

        this.upgradeBtn = new PIXI.Graphics();
        this.upgradeBtn.eventMode = 'static';
        this.upgradeBtn.cursor = 'pointer';
        this.upgradeBtn.hitArea = new PIXI.Rectangle(0, 0, 190, 25);

        this.upgradeBtnText = new PIXI.Text({
            text: '',
            style: { ...baseStyle, fontSize: 12, fontWeight: 'bold' }
        });
        this.upgradeBtnText.anchor.set(0.5);
        this.upgradeBtnText.eventMode = 'none';

        this.addChild(this.upgradeBtn, this.upgradeBtnText);

        this.upgradeBtn.on('pointertap', (e) => {
            e.stopPropagation();
            if (!this.lastGameState) return;

            const nextUpgrade = CASTLE_UPGRADES.find(u => u.level === this.lastGameState.castleLevel + 1);
            if (nextUpgrade && this.lastGameState.canUpgradeCastle(nextUpgrade.cost)) {
                onUpgrade(nextUpgrade.cost, nextUpgrade.workerBoost);
            }
        });

        this.upgradeBtn.on('pointerover', () => {
            if (this.lastGameState) {
                const nextUpgrade = CASTLE_UPGRADES.find(u => u.level === this.lastGameState.castleLevel + 1);
                if (nextUpgrade && this.lastGameState.canUpgradeCastle(nextUpgrade.cost)) {
                    this.upgradeBtn.alpha = 0.8;
                }
            }
        });
        this.upgradeBtn.on('pointerout', () => this.upgradeBtn.alpha = 1.0);
    }

    public update(gameState: any): void {
        this.lastGameState = gameState;

        const nextUpgrade = CASTLE_UPGRADES.find(u => u.level === gameState.castleLevel + 1);
        if (nextUpgrade) {
            this.visible = true;
            const canAfford = gameState.canUpgradeCastle(nextUpgrade.cost);
            const costStr = Object.entries(nextUpgrade.cost).map(([k, v]) => `${v}${k[0].toUpperCase()}`).join(' ');
            this.upgradeBtnText.text = `UPGRADE Lvl ${nextUpgrade.level} (${costStr})`;

            this.upgradeBtn.clear();
            this.upgradeBtn.beginFill(canAfford ? 0x00aa00 : 0x444444);
            this.upgradeBtn.drawRoundedRect(0, 0, 190, 25, 3);
            this.upgradeBtn.endFill();

            this.upgradeBtnText.position.set(95, 12.5);
            this.upgradeBtn.alpha = canAfford ? 1.0 : 0.5;
        } else {
            this.visible = false;
        }
    }
}
