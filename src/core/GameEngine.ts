// src/core/GameEngine.ts
import * as PIXI from 'pixi.js';
import { GameState } from './GameState';
import { HUD } from '../ui/HUD';
import { Toolbar } from '../ui/Toolbar.ts';
import { WorldManager } from './WorldManager';
import { AssetManager } from './AssetManager';
import { EconomySystem } from '../systems/EconomySystem';
import { VisibilitySystem } from '../systems/VisibilitySystem';
import { InfrastructureRenderer } from '../systems/InfrastructureRenderer';
import { InteractionSystem } from '../systems/InteractionSystem';
import { CameraController } from '../systems/CameraController';
import { VirusSystem } from '../systems/VirusSystem';
import { TOOLS } from '../config/toolsConfig';
import { MAP_SETTINGS } from '../config/mapConfig';

export class GameEngine {
    private app: PIXI.Application;
    private gameState: GameState;
    private hud: HUD;
    private worldManager: WorldManager;
    private assetManager: AssetManager;

    private systems!: {
        economy: EconomySystem;
        visibility: VisibilitySystem;
        infraRenderer: InfrastructureRenderer;
        interaction: InteractionSystem;
        camera: CameraController;
        virus: VirusSystem;
    };

    private layers: {
        world: PIXI.Container;
        ground: PIXI.Container;
        infra: PIXI.Container;
        interaction: PIXI.Container;
        ui: PIXI.Container;
    };

    private currentHoverText: string = "";

    constructor() {
        this.app = new PIXI.Application();
        this.gameState = new GameState();
        this.hud = new HUD();
        this.worldManager = new WorldManager();
        this.assetManager = AssetManager.getInstance();

        this.layers = {
            world: new PIXI.Container(),
            ground: new PIXI.Container(),
            infra: new PIXI.Container(),
            interaction: new PIXI.Container(),
            ui: new PIXI.Container()
        };
    }

    public async init() {
        await this.app.init({ background: '#050505', resizeTo: window, antialias: false });
        document.body.appendChild(this.app.canvas);

        // Setup layers
        this.layers.world.addChild(this.layers.ground, this.layers.infra, this.layers.interaction);
        this.app.stage.addChild(this.layers.world);
        this.app.stage.addChild(this.layers.ui);
        this.layers.ui.addChild(this.hud.getContainer(), this.hud.getStatusOverlay());

        // Load Assets
        const assets = await this.assetManager.loadAssets();

        // Generate World
        this.worldManager.generateWorld(this.app.renderer as PIXI.Renderer, assets);

        // Add tile sprites to layer
        this.worldManager.getTileSprites().forEach(sprite => {
            this.layers.ground.addChild(sprite);
        });

        // Initialize Systems
        const hexDataMap = this.worldManager.getHexDataMap();
        this.systems = {
            economy: new EconomySystem(hexDataMap, this.gameState),
            visibility: new VisibilitySystem(hexDataMap, this.worldManager.getTileSprites()),
            infraRenderer: new InfrastructureRenderer(hexDataMap, this.layers.infra, assets),
            interaction: new InteractionSystem(hexDataMap, this.gameState),
            camera: new CameraController(this.layers.world, this.app),
            virus: new VirusSystem(hexDataMap, this.gameState)
        };

        this.systems.virus.initialize();

        // Setup Toolbar
        const toolbar = new Toolbar(TOOLS, this.gameState, this.hud, this.currentHoverText);
        this.layers.ui.addChild(toolbar.getContainer());
        toolbar.positionAt(this.app.screen.width / 2, this.app.screen.height - 70);

        this.setupEventHandlers(toolbar);
        this.setupTickers();

        // Initial update
        this.systems.visibility.update();
        this.systems.infraRenderer.update();

        // Center camera
        const castle = this.worldManager.getCastleTile();
        if (castle) this.systems.camera.centerOn(castle.x, castle.y);

        this.hud.update(this.gameState, "Willkommen in Hex Castle!");
    }

    private setupEventHandlers(toolbar: Toolbar) {
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.gameState.activeTool = 'none';
            this.hud.update(this.gameState, this.currentHoverText);
        });

        this.app.stage.eventMode = 'static';
        this.app.stage.on('pointertap', (e) => {
            if (e.button !== 0) return;
            const localPos = this.layers.world.toLocal(e.global);
            const q = Math.round((Math.sqrt(3) / 3 * localPos.x - 1 / 3 * localPos.y) / MAP_SETTINGS.hexSize);
            const r = Math.round((2 / 3 * localPos.y) / MAP_SETTINGS.hexSize);

            if (this.systems.interaction.handleTileClick(q, r)) {
                this.systems.visibility.update();
                this.systems.infraRenderer.update();
                this.hud.update(this.gameState, this.currentHoverText);
            }
        });

        this.systems.camera.setupControls(this.app.stage, () => this.gameState.activeTool !== 'none');

        window.addEventListener('resize', () => {
            toolbar.positionAt(this.app.screen.width / 2, this.app.screen.height - 70);
        });
    }

    private setupTickers() {
        setInterval(() => {
            if (this.gameState.gameStatus !== 'playing') return;
            this.systems.economy.tick();
            this.hud.update(this.gameState, this.currentHoverText);
        }, 1000);

        this.app.ticker.add(() => {
            if (this.gameState.gameStatus !== 'playing') return;

            if (this.gameState.victoryPoints >= this.gameState.winThreshold) {
                this.gameState.gameStatus = 'won';
                this.hud.update(this.gameState, this.currentHoverText);
                return;
            }

            if (this.systems.virus.update(this.app.ticker.lastTime)) {
                this.systems.visibility.update();
                this.systems.infraRenderer.update();
                this.hud.update(this.gameState, this.currentHoverText);
            }
        });
    }
}
