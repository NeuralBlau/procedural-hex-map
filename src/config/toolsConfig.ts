// src/config/toolsConfig.ts

export interface ToolConfig {
    id: string;
    label: string;
    color: number;
}

export const TOOLS: ToolConfig[] = [
    { id: 'road', label: 'STRASSE', color: 0x999999 },
    { id: 'camp', label: 'LAGER', color: 0xFFA500 },
    { id: 'tower', label: 'TURM', color: 0xA020F0 },
    { id: 'temple', label: 'TEMPEL', color: 0x00FF00 },
    { id: 'worker_add', label: '+ ARBEITER', color: 0xFFD700 },
    { id: 'worker_remove', label: '- ARBEITER', color: 0xFF4500 },
    { id: 'demolish', label: 'ABRISS', color: 0xaa0000 }
];
