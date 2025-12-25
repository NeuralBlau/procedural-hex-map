// src/systems/CameraController.ts
import * as PIXI from 'pixi.js';

export class CameraController {
    private worldContainer: PIXI.Container;
    private app: PIXI.Application;
    private isDrag: boolean = false;
    private dragStart: { x: number; y: number } = { x: 0, y: 0 };
    private camStart: { x: number; y: number } = { x: 0, y: 0 };

    constructor(worldContainer: PIXI.Container, app: PIXI.Application) {
        this.worldContainer = worldContainer;
        this.app = app;
    }

    // Setup camera controls (pan and zoom)
    setupControls(stage: PIXI.Container, isToolActive: () => boolean): void {
        // Pan controls
        stage.on('pointerdown', (e: any) => {
            if (e.button === 0 && !isToolActive()) {
                this.isDrag = true;
                this.dragStart = { x: e.global.x, y: e.global.y };
                this.camStart = { x: this.worldContainer.x, y: this.worldContainer.y };
            }
        });

        stage.on('pointermove', (e: any) => {
            if (this.isDrag) {
                this.worldContainer.x = this.camStart.x + (e.global.x - this.dragStart.x);
                this.worldContainer.y = this.camStart.y + (e.global.y - this.dragStart.y);
            }
        });

        stage.on('pointerup', () => this.isDrag = false);

        // Zoom controls
        this.app.canvas.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();
            const zoomFactor = Math.pow(1.1, -e.deltaY * 0.001);
            const nextScale = this.worldContainer.scale.x * zoomFactor;

            if (nextScale > 0.1 && nextScale < 3) {
                const mousePos = { x: e.clientX, y: e.clientY };
                const localPos = this.worldContainer.toLocal(mousePos);
                this.worldContainer.scale.set(nextScale);
                const newMousePos = this.worldContainer.toGlobal(localPos);
                this.worldContainer.x += mousePos.x - newMousePos.x;
                this.worldContainer.y += mousePos.y - newMousePos.y;
            }
        }, { passive: false });
    }

    // Center camera on a specific position
    centerOn(x: number, y: number): void {
        this.worldContainer.x = this.app.screen.width / 2 - x * this.worldContainer.scale.x;
        this.worldContainer.y = this.app.screen.height / 2 - y * this.worldContainer.scale.y;
    }
}
