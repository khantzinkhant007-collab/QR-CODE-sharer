export const BACKGROUND_STORAGE_KEY = 'scansend-background'

export const backgrounds = [
  { id: 'dusk', image: '/hero-dusk.webp', thumbnail: '/backgrounds/dusk-thumb.webp' },
  { id: 'alpine', image: '/backgrounds/alpine.webp', thumbnail: '/backgrounds/alpine-thumb.webp' },
  { id: 'coast', image: '/backgrounds/coast.webp', thumbnail: '/backgrounds/coast-thumb.webp' },
  { id: 'pearl', image: '/backgrounds/pearl.webp', thumbnail: '/backgrounds/pearl-thumb.webp' },
] as const

export type BackgroundId = typeof backgrounds[number]['id']

export function readBackground(): BackgroundId {
  try {
    const saved = window.localStorage.getItem(BACKGROUND_STORAGE_KEY)
    return backgrounds.find((background) => background.id === saved)?.id ?? 'dusk'
  } catch {
    return 'dusk'
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
