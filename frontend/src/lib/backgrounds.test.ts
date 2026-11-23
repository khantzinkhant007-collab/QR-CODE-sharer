import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  backgrounds,
  BACKGROUND_STORAGE_KEY,
  DEFAULT_BACKGROUND,
  readBackground,
  saveBackground,
} from './backgrounds'
import {
  DEFAULT_NEON_SETTINGS,
  LIGHT_MODES,
  NEON_SETTINGS_STORAGE_KEY,
  PALETTES,
  TEXTURE_MODES,
  readNeonSettings,
  saveNeonSettings,
} from './neonWallpaper'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('background preferences', () => {
  it('ships every full-size image and thumbnail as a local asset', () => {
    expect(backgrounds).toHaveLength(8)
    for (const option of backgrounds) {
      for (const path of [option.image, option.thumbnail]) {
        const asset = resolve(process.cwd(), 'public', path.slice(1))
        expect(existsSync(asset), asset).toBe(true)
      }
    }
  })

  it('uses live neon as the default while keeping the original sunset photo available', () => {
    expect(DEFAULT_BACKGROUND).toBe('neon')
    expect(readBackground()).toBe('neon')
    expect(backgrounds[0].image).toBe('/hero-dusk.webp')
  })

  it.each(['neon', 'dusk', 'alpine', 'coast', 'pearl', 'obsidian', 'emerald', 'champagne', 'fluted'] as const)(
    'persists and restores %s',
    (id) => {
      expect(saveBackground(id)).toBe(true)
      expect(localStorage.getItem(BACKGROUND_STORAGE_KEY)).toBe(id)
      expect(readBackground()).toBe(id)
    },
  )

  it('rejects unknown saved values instead of using arbitrary image URLs', () => {
    localStorage.setItem(BACKGROUND_STORAGE_KEY, 'https://untrusted.test/image.jpg')
    expect(readBackground()).toBe('neon')
    expect(backgrounds.every((item) => item.image.startsWith('/') && item.thumbnail.startsWith('/'))).toBe(true)
  })

  it('falls back safely when reading browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readBackground()).toBe('neon')
  })

  it('reports when saving is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(saveBackground('pearl')).toBe(false)
  })
})

describe('neon wallpaper settings', () => {
  it('exposes 10 light modes, 7 palettes, and 4 surface textures with expected defaults', () => {
    expect(LIGHT_MODES).toHaveLength(10)
    expect(PALETTES).toHaveLength(7)
    expect(TEXTURE_MODES).toHaveLength(4)
    expect(readNeonSettings()).toEqual(DEFAULT_NEON_SETTINGS)
    expect(DEFAULT_NEON_SETTINGS).toEqual({
      lightMode: 'prisms',
      paletteId: 'cyberpunk',
      textureMode: 'dots',
      isPlaying: true,
      speed: 0.55,
      intensity: 0.86,
      blurLevel: 85,
    })
  })

  it('persists and restores valid neon settings', () => {
    const custom = {
      lightMode: 'aurora' as const,
      paletteId: 'electric' as const,
      textureMode: 'scanlines' as const,
      isPlaying: false,
      speed: 1.25,
      intensity: 0.65,
      blurLevel: 120,
    }
    expect(saveNeonSettings(custom)).toBe(true)
    expect(localStorage.getItem(NEON_SETTINGS_STORAGE_KEY)).toBe(JSON.stringify(custom))
    expect(readNeonSettings()).toEqual(custom)
  })

  it('sanitizes malformed JSON, invalid enums, non-boolean flags, and out-of-range numbers', () => {
    localStorage.setItem(NEON_SETTINGS_STORAGE_KEY, '{not-json')
    expect(readNeonSettings()).toEqual(DEFAULT_NEON_SETTINGS)

    localStorage.setItem(NEON_SETTINGS_STORAGE_KEY, '[]')
    expect(readNeonSettings()).toEqual(DEFAULT_NEON_SETTINGS)

    localStorage.setItem(
      NEON_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        lightMode: 'invalid-mode',
        paletteId: 'invalid-palette',
        textureMode: 'invalid-texture',
        isPlaying: 'yes',
        speed: 99,
        intensity: -4,
        blurLevel: 500,
      }),
    )
    expect(readNeonSettings()).toEqual({
      lightMode: 'prisms',
      paletteId: 'cyberpunk',
      textureMode: 'dots',
      isPlaying: true,
      speed: 2.0,
      intensity: 0.25,
      blurLevel: 160,
    })

    localStorage.setItem(
      NEON_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        lightMode: 'rings',
        paletteId: 'tokyo',
        textureMode: 'clean',
        isPlaying: false,
        speed: 0.01,
        intensity: 5,
        blurLevel: 10,
      }),
    )
    expect(readNeonSettings()).toEqual({
      lightMode: 'rings',
      paletteId: 'tokyo',
      textureMode: 'clean',
      isPlaying: false,
      speed: 0.15,
      intensity: 1.0,
      blurLevel: 50,
    })
  })

  it('falls back cleanly when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readNeonSettings()).toEqual(DEFAULT_NEON_SETTINGS)
    expect(saveNeonSettings(DEFAULT_NEON_SETTINGS)).toBe(false)
  })
})
