// src/main.ts
import { GameEngine } from './core/GameEngine';

const engine = new GameEngine();
engine.init().catch(console.error);