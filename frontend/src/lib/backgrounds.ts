import {
  LIGHT_MODES,
  PALETTES,
  type LightModeId,
  type PaletteId,
} from './neonWallpaper'

export {
  DEFAULT_NEON_SETTINGS,
  LIGHT_MODES,
  NEON_SETTINGS_STORAGE_KEY,
  PALETTES,
  TEXTURE_MODES,
  readNeonSettings,
  saveNeonSettings,
  type LightModeId,
  type NeonOrb,
  type NeonPalette,
  type NeonSettings,
  type PaletteId,
  type TextureModeId,
} from './neonWallpaper'

export const BACKGROUND_STORAGE_KEY = 'scansend-background'

export const backgrounds = [
  { id: 'dusk', image: '/hero-dusk.webp', thumbnail: '/backgrounds/dusk-thumb.webp' },
  { id: 'alpine', image: '/backgrounds/alpine.webp', thumbnail: '/backgrounds/alpine-thumb.webp' },
  { id: 'coast', image: '/backgrounds/coast.webp', thumbnail: '/backgrounds/coast-thumb.webp' },
  { id: 'pearl', image: '/backgrounds/pearl.webp', thumbnail: '/backgrounds/pearl-thumb.webp' },
  { id: 'obsidian', image: '/backgrounds/obsidian.webp', thumbnail: '/backgrounds/obsidian-thumb.webp' },
  { id: 'emerald', image: '/backgrounds/emerald.webp', thumbnail: '/backgrounds/emerald-thumb.webp' },
  { id: 'champagne', image: '/backgrounds/champagne.webp', thumbnail: '/backgrounds/champagne-thumb.webp' },
  { id: 'fluted', image: '/backgrounds/fluted.webp', thumbnail: '/backgrounds/fluted-thumb.webp' },
] as const

export type PhotoBackgroundId = (typeof backgrounds)[number]['id']
export type BackgroundId = 'neon' | PhotoBackgroundId
export const DEFAULT_BACKGROUND: BackgroundId = 'neon'

export function readBackground(): BackgroundId {
  try {
    const saved = window.localStorage.getItem(BACKGROUND_STORAGE_KEY)
    if (saved === 'neon') return 'neon'
    return backgrounds.find((background) => background.id === saved)?.id ?? DEFAULT_BACKGROUND
  } catch {
    return DEFAULT_BACKGROUND
  }
}

export function saveBackground(id: BackgroundId): boolean {
  try {
    window.localStorage.setItem(BACKGROUND_STORAGE_KEY, id)
    return true
  } catch {
    return false
  }
}

// Legacy aliases retained so existing tests typecheck cleanly until qa-verifier migrates them.
export const NEON_STORAGE_KEY = 'scansend-neon-wallpaper'

export interface NeonWallpaperConfig {
  enabled: boolean
  lightMode: LightModeId
  paletteId: PaletteId
  isPlaying: boolean
  speed: number
  intensity: number
  blurLevel: number
}

export const DEFAULT_NEON_CONFIG: NeonWallpaperConfig = {
  enabled: true,
  lightMode: 'rings',
  paletteId: 'cyberpunk',
  isPlaying: true,
  speed: 0.55,
  intensity: 0.85,
  blurLevel: 85,
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

export function readNeonConfig(): NeonWallpaperConfig {
  try {
    const raw = window.localStorage.getItem(NEON_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_NEON_CONFIG }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEFAULT_NEON_CONFIG }
    }
    const candidate = parsed as Record<string, unknown>
    const lightMode =
      LIGHT_MODES.find((mode) => mode.id === candidate.lightMode)?.id ?? DEFAULT_NEON_CONFIG.lightMode
    const paletteId =
      PALETTES.find((palette) => palette.id === candidate.paletteId)?.id ?? DEFAULT_NEON_CONFIG.paletteId

    return {
      enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : DEFAULT_NEON_CONFIG.enabled,
      lightMode,
      paletteId,
      isPlaying: typeof candidate.isPlaying === 'boolean' ? candidate.isPlaying : DEFAULT_NEON_CONFIG.isPlaying,
      speed: clamp(candidate.speed, 0.15, 2.0, DEFAULT_NEON_CONFIG.speed),
      intensity: clamp(candidate.intensity, 0.25, 1.0, DEFAULT_NEON_CONFIG.intensity),
      blurLevel: clamp(candidate.blurLevel, 50, 160, DEFAULT_NEON_CONFIG.blurLevel),
    }
  } catch {
    return { ...DEFAULT_NEON_CONFIG }
  }
}

export function saveNeonConfig(config: NeonWallpaperConfig): boolean {
  try {
    window.localStorage.setItem(NEON_STORAGE_KEY, JSON.stringify(config))
    return true
  } catch {
    return false
  }
}
