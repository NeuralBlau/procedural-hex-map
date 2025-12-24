// src/ui/HUD.ts

export class HUD {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.setupStyles();
        document.body.appendChild(this.element);
        this.setText('<b>Hex-Explorer</b><br>Initialisiere...');
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
    }

    public updateInfo(biomeName: string, q: number, r: number) {
        this.element.innerHTML = `<b>Biom:</b> ${biomeName}<br><b>Coords:</b> ${q}, ${r}`;
    }

    public setText(text: string) {
        this.element.innerHTML = text;
    }
}