export const VENDOR_COLOR: Record<string, string> = { nvidious: 'oklch(0.55 0.16 140)', amdude: 'oklch(0.56 0.19 30)', intellect: 'oklch(0.52 0.15 255)', player: 'oklch(0.55 0.2 300)' }

/** sRGB hex twins of the vendor colours, for three.js (which can't parse oklch). */
export const VENDOR_HEX: Record<string, string> = { nvidious: '#5e9a3c', amdude: '#c4452f', intellect: '#3a6cc0', nicosoft: '#2f9aa6', player: '#8a4fd0' }
