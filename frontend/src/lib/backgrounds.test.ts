import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  backgrounds,
  BACKGROUND_STORAGE_KEY,
  DEFAULT_NEON_CONFIG,
  LIGHT_MODES,
  NEON_STORAGE_KEY,
  PALETTES,
  readBackground,
  readNeonConfig,
  saveBackground,
  saveNeonConfig,
} from './backgrounds'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('background preferences', () => {
  it('ships every full-size image and thumbnail as a local asset', () => {
    for (const option of backgrounds) {
      for (const path of [option.image, option.thumbnail]) {
        const asset = resolve(process.cwd(), 'public', path.slice(1))
        expect(existsSync(asset), asset).toBe(true)
      }
    }
  })
  it('keeps the original sunset as the default', () => {
    expect(readBackground()).toBe('dusk')
    expect(backgrounds[0].image).toBe('/hero-dusk.webp')
  })
  it.each(['alpine', 'coast', 'pearl', 'obsidian', 'emerald', 'champagne', 'fluted'] as const)('persists and restores %s', (id) => {
    expect(saveBackground(id)).toBe(true)
    expect(localStorage.getItem(BACKGROUND_STORAGE_KEY)).toBe(id)
    expect(readBackground()).toBe(id)
  })
  it('rejects unknown saved values instead of using arbitrary image URLs', () => {
    localStorage.setItem(BACKGROUND_STORAGE_KEY, 'https://untrusted.test/image.jpg')
    expect(readBackground()).toBe('dusk')
    expect(backgrounds.every((item) => item.image.startsWith('/') && item.thumbnail.startsWith('/'))).toBe(true)
  })
  it('falls back safely when reading browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readBackground()).toBe('dusk')
  })
  it('reports when saving is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(saveBackground('pearl')).toBe(false)
  })
})

describe('neon wallpaper configuration', () => {
  it('includes 7 light modes and 7 palettes and defaults to Neon Rings + Cyberpunk Neon', () => {
    expect(LIGHT_MODES).toHaveLength(7)
    expect(PALETTES).toHaveLength(7)
    expect(readNeonConfig()).toEqual(DEFAULT_NEON_CONFIG)
    expect(DEFAULT_NEON_CONFIG).toEqual({
      enabled: true,
      lightMode: 'rings',
      paletteId: 'cyberpunk',
      isPlaying: true,
      speed: 0.55,
      intensity: 0.85,
      blurLevel: 85,
    })
  })

  it('persists and restores valid neon configurations', () => {
    const custom = {
      enabled: true,
      lightMode: 'aurora' as const,
      paletteId: 'electric' as const,
      isPlaying: false,
      speed: 1.25,
      intensity: 0.65,
      blurLevel: 120,
    }
    expect(saveNeonConfig(custom)).toBe(true)
    expect(readNeonConfig()).toEqual(custom)
  })

  it('sanitizes invalid light modes, palettes, malformed JSON, and out-of-range numbers', () => {
    localStorage.setItem(NEON_STORAGE_KEY, '{not-json')
    expect(readNeonConfig()).toEqual(DEFAULT_NEON_CONFIG)

    localStorage.setItem(
      NEON_STORAGE_KEY,
      JSON.stringify({
        enabled: 'yes',
        lightMode: 'invalid-mode',
        paletteId: 'invalid-palette',
        isPlaying: 123,
        speed: 99,
        intensity: -4,
        blurLevel: 500,
      }),
    )
    expect(readNeonConfig()).toEqual({
      enabled: true,
      lightMode: 'rings',
      paletteId: 'cyberpunk',
      isPlaying: true,
      speed: 2.0,
      intensity: 0.25,
      blurLevel: 160,
    })
  })

  it('handles blocked browser storage cleanly', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readNeonConfig()).toEqual(DEFAULT_NEON_CONFIG)
    expect(saveNeonConfig(DEFAULT_NEON_CONFIG)).toBe(false)
  })
})
