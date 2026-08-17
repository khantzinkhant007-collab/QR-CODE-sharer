export type PreviewKind = 'image' | 'video' | 'unknown'

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** power
  return `${value.toFixed(power === 0 || value >= 10 ? 0 : 1)} ${units[power]}`
}

export function previewKind(mimeType: string): PreviewKind {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'unknown'
}

export function validateSelectedFile(file: File, maxBytes: number): string | null {
  const supportedExtension = /\.(jpe?g|png|webp|heic|heif|mp4|mov|webm)$/i.test(file.name)
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !(file.type === '' && supportedExtension)) return 'unsupported_type'
  if (file.size > maxBytes) return 'too_large'
  return null
}
