// src/ui/HUD.ts

export class HUD {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.setupStyles();
        document.body.appendChild(this.element);
    }

    private setupStyles() {
        const s = this.element.style;
        s.position = 'absolute';
        s.top = '20px';
        s.left = '20px';
        s.padding = '15px';
        s.background = 'rgba(0, 0, 0, 0.8)';
        s.color = '#fff';
        s.fontFamily = 'monospace';
        s.borderRadius = '5px';
        s.pointerEvents = 'none';
        s.border = '1px solid #444';
        s.zIndex = '100';
        s.lineHeight = '1.5';
    }

    public update(state: any, hoverInfo: string = '') {
        this.element.innerHTML = `
            <div style="color: #ffcc00; font-weight: bold; margin-bottom: 10px;">HEX CASTLE</div>
            <div>🪓 Holz: ${Math.floor(state.resources.wood)}</div>
            <div>🪨 Stein: ${Math.floor(state.resources.stone)}</div>
            <div>⛏️ Eisen: ${Math.floor(state.resources.iron)}</div>
            <hr style="border: 0; border-top: 1px solid #444; margin: 10px 0;">
            <div>👷 Arbeiter: ${state.workers.employed} / ${state.workers.total}</div>
            <div style="margin-top: 10px; color: #aaa; font-size: 0.9em;">${hoverInfo}</div>
        `;
    }
}