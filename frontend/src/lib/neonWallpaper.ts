export const NEON_SETTINGS_STORAGE_KEY = 'scansend-neon-settings'

export const LIGHT_MODES = [
  { id: 'prisms', label: 'Neon Prisms', fullName: '3D Neon Prisms' },
  { id: 'grid3d', label: 'Cyber Grid', fullName: '3D Cyber Grid' },
  { id: 'starfield', label: 'Bokeh Stars', fullName: 'Neon Starfield & Bokeh' },
  { id: 'rings', label: 'Neon Rings', fullName: 'Neon Pulse Rings' },
  { id: 'lasers', label: 'Laser Lines', fullName: 'Neon Laser Lines' },
  { id: 'plasma', label: 'Cyber Plasma', fullName: 'Cyber Neon Plasma' },
  { id: 'orbs', label: 'Orbs', fullName: 'Ambient Orbs' },
  { id: 'aurora', label: 'Aurora', fullName: 'Aurora Ribbons' },
  { id: 'beams', label: 'Beams', fullName: 'Spotlight Beams' },
  { id: 'caustics', label: 'Caustics', fullName: 'Liquid Caustics' },
] as const

export type LightModeId = (typeof LIGHT_MODES)[number]['id']

export const TEXTURE_MODES = [
  { id: 'clean', label: 'Clean OLED' },
  { id: 'dots', label: 'Dot Matrix' },
  { id: 'scanlines', label: 'Scanlines' },
  { id: 'mesh', label: 'Glass Grid' },
] as const

export type TextureModeId = (typeof TEXTURE_MODES)[number]['id']

export interface NeonOrb {
  id: string
  color: string
  size: number
  baseX: number
  baseY: number
  ampX: number
  ampY: number
  freqX: number
  freqY: number
  phase: number
}

export interface NeonPalette {
  id: PaletteId
  name: string
  swatch: string
  hex: readonly string[]
  colors: readonly string[]
  orbs: readonly NeonOrb[]
}

export const PALETTES = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    swatch: 'linear-gradient(135deg, #ff007f, #00f5ff, #9333ea)',
    hex: ['#ff007f', '#00f5ff', '#a855f7', '#2563eb'],
    colors: [
      'rgba(255, 0, 127, 0.92)',
      'rgba(0, 245, 255, 0.90)',
      'rgba(168, 85, 247, 0.85)',
      'rgba(37, 99, 235, 0.80)',
    ],
    orbs: [
      { id: 'cp1', color: 'rgba(255, 0, 127, 0.90)', size: 52, baseX: 25, baseY: 28, ampX: 16, ampY: 14, freqX: 0.22, freqY: 0.17, phase: 0.0 },
      { id: 'cp2', color: 'rgba(0, 245, 255, 0.88)', size: 54, baseX: 74, baseY: 70, ampX: 18, ampY: 15, freqX: 0.18, freqY: 0.23, phase: 1.6 },
      { id: 'cp3', color: 'rgba(168, 85, 247, 0.78)', size: 44, baseX: 52, baseY: 48, ampX: 20, ampY: 16, freqX: 0.15, freqY: 0.21, phase: 3.1 },
      { id: 'cp4', color: 'rgba(37, 99, 235, 0.65)', size: 42, baseX: 78, baseY: 22, ampX: 14, ampY: 18, freqX: 0.19, freqY: 0.14, phase: 4.4 },
    ],
  },
  {
    id: 'tokyo',
    name: 'Tokyo Acid',
    swatch: 'linear-gradient(135deg, #39ff14, #00f0ff, #facc15)',
    hex: ['#39ff14', '#00f0ff', '#facc15', '#7c3aed'],
    colors: [
      'rgba(57, 255, 20, 0.88)',
      'rgba(0, 240, 255, 0.90)',
      'rgba(250, 204, 21, 0.82)',
      'rgba(124, 58, 237, 0.80)',
    ],
    orbs: [
      { id: 'ta1', color: 'rgba(57, 255, 20, 0.85)', size: 50, baseX: 26, baseY: 26, ampX: 17, ampY: 14, freqX: 0.21, freqY: 0.16, phase: 0.4 },
      { id: 'ta2', color: 'rgba(0, 240, 255, 0.88)', size: 56, baseX: 72, baseY: 72, ampX: 18, ampY: 15, freqX: 0.17, freqY: 0.22, phase: 1.9 },
      { id: 'ta3', color: 'rgba(250, 204, 21, 0.72)', size: 42, baseX: 50, baseY: 50, ampX: 20, ampY: 15, freqX: 0.14, freqY: 0.20, phase: 3.3 },
      { id: 'ta4', color: 'rgba(124, 58, 237, 0.75)', size: 44, baseX: 76, baseY: 24, ampX: 14, ampY: 16, freqX: 0.19, freqY: 0.13, phase: 4.8 },
    ],
  },
  {
    id: 'synthwave',
    name: 'Synthwave Laser',
    swatch: 'linear-gradient(135deg, #ff1493, #ff2a5f, #ff6b00)',
    hex: ['#ff1493', '#ff2a5f', '#ff6b00', '#9333ea'],
    colors: [
      'rgba(255, 20, 147, 0.92)',
      'rgba(255, 42, 95, 0.88)',
      'rgba(255, 107, 0, 0.85)',
      'rgba(147, 51, 234, 0.82)',
    ],
    orbs: [
      { id: 'sw1', color: 'rgba(255, 20, 147, 0.90)', size: 54, baseX: 24, baseY: 30, ampX: 16, ampY: 14, freqX: 0.20, freqY: 0.16, phase: 0.2 },
      { id: 'sw2', color: 'rgba(255, 107, 0, 0.84)', size: 52, baseX: 74, baseY: 68, ampX: 18, ampY: 16, freqX: 0.18, freqY: 0.22, phase: 2.1 },
      { id: 'sw3', color: 'rgba(147, 51, 234, 0.80)', size: 46, baseX: 52, baseY: 46, ampX: 19, ampY: 16, freqX: 0.15, freqY: 0.19, phase: 3.7 },
      { id: 'sw4', color: 'rgba(255, 42, 95, 0.78)', size: 40, baseX: 22, baseY: 74, ampX: 15, ampY: 15, freqX: 0.17, freqY: 0.14, phase: 4.9 },
    ],
  },
  {
    id: 'electric',
    name: 'Electric Glow',
    swatch: 'linear-gradient(135deg, #3186ff, #8b5cf6, #22d3ee)',
    hex: ['#3186ff', '#8b5cf6', '#22d3ee', '#3b82f6'],
    colors: [
      'rgba(49, 134, 255, 0.85)',
      'rgba(139, 92, 246, 0.80)',
      'rgba(34, 211, 238, 0.62)',
      'rgba(59, 130, 246, 0.50)',
    ],
    orbs: [
      { id: 'b1', color: 'rgba(49, 134, 255, 0.85)', size: 52, baseX: 24, baseY: 26, ampX: 16, ampY: 14, freqX: 0.22, freqY: 0.17, phase: 0.0 },
      { id: 'v1', color: 'rgba(139, 92, 246, 0.80)', size: 56, baseX: 74, baseY: 72, ampX: 18, ampY: 15, freqX: 0.18, freqY: 0.23, phase: 1.6 },
      { id: 'c1', color: 'rgba(34, 211, 238, 0.58)', size: 42, baseX: 52, baseY: 48, ampX: 20, ampY: 16, freqX: 0.15, freqY: 0.21, phase: 3.1 },
      { id: 'i1', color: 'rgba(59, 130, 246, 0.45)', size: 44, baseX: 78, baseY: 22, ampX: 14, ampY: 18, freqX: 0.19, freqY: 0.14, phase: 4.4 },
    ],
  },
  {
    id: 'sunset',
    name: 'Warm Sunset',
    swatch: 'linear-gradient(135deg, #fb923c, #ec4899, #a855f7)',
    hex: ['#fb923c', '#ec4899', '#a855f7', '#facc15'],
    colors: [
      'rgba(251, 146, 60, 0.82)',
      'rgba(236, 72, 153, 0.80)',
      'rgba(168, 85, 247, 0.60)',
      'rgba(250, 204, 21, 0.42)',
    ],
    orbs: [
      { id: 's1', color: 'rgba(251, 146, 60, 0.80)', size: 52, baseX: 26, baseY: 28, ampX: 16, ampY: 14, freqX: 0.21, freqY: 0.16, phase: 0.3 },
      { id: 's2', color: 'rgba(236, 72, 153, 0.78)', size: 56, baseX: 72, baseY: 70, ampX: 18, ampY: 15, freqX: 0.17, freqY: 0.22, phase: 2.0 },
      { id: 's3', color: 'rgba(168, 85, 247, 0.56)', size: 44, baseX: 50, baseY: 50, ampX: 20, ampY: 15, freqX: 0.14, freqY: 0.20, phase: 3.6 },
      { id: 's4', color: 'rgba(250, 204, 21, 0.36)', size: 38, baseX: 74, baseY: 26, ampX: 14, ampY: 16, freqX: 0.19, freqY: 0.13, phase: 5.0 },
    ],
  },
  {
    id: 'aurora',
    name: 'Emerald Aurora',
    swatch: 'linear-gradient(135deg, #10b981, #22d3ee, #6366f1)',
    hex: ['#10b981', '#6366f1', '#2dd4bf', '#38bdf8'],
    colors: [
      'rgba(16, 185, 129, 0.78)',
      'rgba(99, 102, 241, 0.82)',
      'rgba(45, 212, 191, 0.60)',
      'rgba(56, 189, 248, 0.46)',
    ],
    orbs: [
      { id: 'a1', color: 'rgba(16, 185, 129, 0.76)', size: 54, baseX: 25, baseY: 30, ampX: 17, ampY: 14, freqX: 0.20, freqY: 0.16, phase: 0.5 },
      { id: 'a2', color: 'rgba(99, 102, 241, 0.80)', size: 56, baseX: 74, baseY: 70, ampX: 18, ampY: 16, freqX: 0.18, freqY: 0.22, phase: 2.2 },
      { id: 'a3', color: 'rgba(45, 212, 191, 0.56)', size: 44, baseX: 52, baseY: 46, ampX: 19, ampY: 16, freqX: 0.15, freqY: 0.19, phase: 3.8 },
      { id: 'a4', color: 'rgba(56, 189, 248, 0.42)', size: 40, baseX: 22, baseY: 76, ampX: 15, ampY: 15, freqX: 0.17, freqY: 0.14, phase: 4.9 },
    ],
  },
  {
    id: 'monochrome',
    name: 'Silver Mist',
    swatch: 'linear-gradient(135deg, #e4e4e7, #71717a, #27272a)',
    hex: ['#f4f4f5', '#a1a1aa', '#ffffff', '#71717a'],
    colors: [
      'rgba(228, 228, 231, 0.48)',
      'rgba(148, 163, 184, 0.44)',
      'rgba(255, 255, 255, 0.34)',
      'rgba(161, 161, 170, 0.32)',
    ],
    orbs: [
      { id: 'm1', color: 'rgba(228, 228, 231, 0.44)', size: 54, baseX: 28, baseY: 30, ampX: 16, ampY: 14, freqX: 0.19, freqY: 0.15, phase: 0.2 },
      { id: 'm2', color: 'rgba(148, 163, 184, 0.42)', size: 58, baseX: 72, baseY: 68, ampX: 18, ampY: 16, freqX: 0.16, freqY: 0.21, phase: 1.9 },
      { id: 'm3', color: 'rgba(255, 255, 255, 0.28)', size: 42, baseX: 50, baseY: 50, ampX: 20, ampY: 16, freqX: 0.14, freqY: 0.18, phase: 3.4 },
      { id: 'm4', color: 'rgba(161, 161, 170, 0.26)', size: 46, baseX: 76, baseY: 24, ampX: 14, ampY: 15, freqX: 0.17, freqY: 0.14, phase: 4.7 },
    ],
  },
] as const

export type PaletteId = (typeof PALETTES)[number]['id']

export interface BokehParticle {
  id: string
  baseX: number
  baseY: number
  size: number
  depth: number
  speed: number
  phase: number
  colorIdx: number
  bokeh: boolean
}

export const BOKEH_PARTICLES: readonly BokehParticle[] = [
  { id: 'bk1', baseX: 8, baseY: 14, size: 12, depth: 0.9, speed: 0.24, phase: 0.2, colorIdx: 0, bokeh: true },
  { id: 'bk2', baseX: 18, baseY: 72, size: 18, depth: 1.1, speed: 0.19, phase: 1.1, colorIdx: 1, bokeh: true },
  { id: 'bk3', baseX: 28, baseY: 28, size: 4, depth: 0.5, speed: 0.34, phase: 2.0, colorIdx: 2, bokeh: false },
  { id: 'bk4', baseX: 36, baseY: 84, size: 14, depth: 0.85, speed: 0.22, phase: 2.9, colorIdx: 3, bokeh: true },
  { id: 'bk5', baseX: 44, baseY: 16, size: 5, depth: 0.6, speed: 0.31, phase: 3.7, colorIdx: 0, bokeh: false },
  { id: 'bk6', baseX: 54, baseY: 62, size: 22, depth: 1.25, speed: 0.17, phase: 4.5, colorIdx: 1, bokeh: true },
  { id: 'bk7', baseX: 64, baseY: 24, size: 6, depth: 0.55, speed: 0.36, phase: 5.1, colorIdx: 2, bokeh: false },
  { id: 'bk8', baseX: 74, baseY: 78, size: 16, depth: 1.0, speed: 0.21, phase: 0.7, colorIdx: 0, bokeh: true },
  { id: 'bk9', baseX: 84, baseY: 36, size: 5, depth: 0.65, speed: 0.33, phase: 1.6, colorIdx: 3, bokeh: false },
  { id: 'bk10', baseX: 92, baseY: 66, size: 20, depth: 1.15, speed: 0.18, phase: 2.4, colorIdx: 1, bokeh: true },
  { id: 'bk11', baseX: 14, baseY: 46, size: 4, depth: 0.45, speed: 0.38, phase: 3.2, colorIdx: 2, bokeh: false },
  { id: 'bk12', baseX: 24, baseY: 58, size: 10, depth: 0.8, speed: 0.25, phase: 4.0, colorIdx: 0, bokeh: true },
  { id: 'bk13', baseX: 38, baseY: 42, size: 5, depth: 0.5, speed: 0.35, phase: 4.8, colorIdx: 1, bokeh: false },
  { id: 'bk14', baseX: 48, baseY: 88, size: 6, depth: 0.6, speed: 0.29, phase: 5.5, colorIdx: 3, bokeh: false },
  { id: 'bk15', baseX: 60, baseY: 12, size: 15, depth: 0.95, speed: 0.2, phase: 0.9, colorIdx: 2, bokeh: true },
  { id: 'bk16', baseX: 70, baseY: 48, size: 4, depth: 0.5, speed: 0.37, phase: 1.8, colorIdx: 0, bokeh: false },
  { id: 'bk17', baseX: 80, baseY: 18, size: 11, depth: 0.88, speed: 0.23, phase: 2.7, colorIdx: 1, bokeh: true },
  { id: 'bk18', baseX: 88, baseY: 86, size: 5, depth: 0.58, speed: 0.32, phase: 3.5, colorIdx: 2, bokeh: false },
  { id: 'bk19', baseX: 12, baseY: 88, size: 7, depth: 0.7, speed: 0.28, phase: 4.3, colorIdx: 3, bokeh: false },
  { id: 'bk20', baseX: 66, baseY: 92, size: 13, depth: 0.92, speed: 0.22, phase: 5.2, colorIdx: 0, bokeh: true },
] as const

export interface PrismShape {
  id: string
  kind: 'hexagon' | 'diamond' | 'triangle' | 'square'
  baseX: number
  baseY: number
  size: number
  ampX: number
  ampY: number
  freqX: number
  freqY: number
  rotSpeed: number
  tiltSpeed: number
  phase: number
  colorIdx: number
}

export const PRISM_SHAPES: readonly PrismShape[] = [
  { id: 'pr1', kind: 'hexagon', baseX: 24, baseY: 32, size: 22, ampX: 10, ampY: 8, freqX: 0.22, freqY: 0.17, rotSpeed: 12, tiltSpeed: 0.35, phase: 0.0, colorIdx: 0 },
  { id: 'pr2', kind: 'diamond', baseX: 74, baseY: 28, size: 18, ampX: 12, ampY: 9, freqX: 0.19, freqY: 0.23, rotSpeed: -15, tiltSpeed: 0.42, phase: 1.3, colorIdx: 1 },
  { id: 'pr3', kind: 'triangle', baseX: 52, baseY: 54, size: 24, ampX: 11, ampY: 10, freqX: 0.16, freqY: 0.20, rotSpeed: 10, tiltSpeed: 0.30, phase: 2.6, colorIdx: 2 },
  { id: 'pr4', kind: 'square', baseX: 28, baseY: 74, size: 16, ampX: 9, ampY: 8, freqX: 0.24, freqY: 0.18, rotSpeed: -14, tiltSpeed: 0.38, phase: 3.9, colorIdx: 3 },
  { id: 'pr5', kind: 'hexagon', baseX: 76, baseY: 72, size: 20, ampX: 10, ampY: 9, freqX: 0.20, freqY: 0.16, rotSpeed: 13, tiltSpeed: 0.33, phase: 5.0, colorIdx: 0 },
] as const

export interface NeonSettings {
  lightMode: LightModeId
  paletteId: PaletteId
  textureMode: TextureModeId
  isPlaying: boolean
  speed: number
  intensity: number
  blurLevel: number
}

export const DEFAULT_NEON_SETTINGS: NeonSettings = {
  lightMode: 'prisms',
  paletteId: 'cyberpunk',
  textureMode: 'dots',
  isPlaying: true,
  speed: 0.55,
  intensity: 0.86,
  blurLevel: 85,
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

export function readNeonSettings(): NeonSettings {
  try {
    const raw = window.localStorage.getItem(NEON_SETTINGS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_NEON_SETTINGS }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEFAULT_NEON_SETTINGS }
    }
    const candidate = parsed as Record<string, unknown>
    const lightMode =
      LIGHT_MODES.find((mode) => mode.id === candidate.lightMode)?.id ?? DEFAULT_NEON_SETTINGS.lightMode
    const paletteId =
      PALETTES.find((palette) => palette.id === candidate.paletteId)?.id ?? DEFAULT_NEON_SETTINGS.paletteId
    const textureMode =
      TEXTURE_MODES.find((texture) => texture.id === candidate.textureMode)?.id ?? DEFAULT_NEON_SETTINGS.textureMode

    return {
      lightMode,
      paletteId,
      textureMode,
      isPlaying: typeof candidate.isPlaying === 'boolean' ? candidate.isPlaying : DEFAULT_NEON_SETTINGS.isPlaying,
      speed: clamp(candidate.speed, 0.15, 2.0, DEFAULT_NEON_SETTINGS.speed),
      intensity: clamp(candidate.intensity, 0.25, 1.0, DEFAULT_NEON_SETTINGS.intensity),
      blurLevel: clamp(candidate.blurLevel, 50, 160, DEFAULT_NEON_SETTINGS.blurLevel),
    }
  } catch {
    return { ...DEFAULT_NEON_SETTINGS }
  }
}

export function saveNeonSettings(settings: NeonSettings): boolean {
  try {
    window.localStorage.setItem(NEON_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}
