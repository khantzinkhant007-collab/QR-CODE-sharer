import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { backgrounds, BACKGROUND_STORAGE_KEY, readBackground, saveBackground } from './backgrounds'

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
  it.each(['alpine', 'coast', 'pearl'] as const)('persists and restores %s', (id) => {
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
