export type PreviewKind = 'image' | 'video' | 'unknown'

export const FILE_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm,.jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.mov,.webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.csv,.json,.zip,.7z,.rar,.gz,.tar,.mp3,.m4a,.wav,.ogg,.flac,.aac'
const unsafeExtension = /\.(exe|com|msi|dll|scr|bat|cmd|ps1|sh|bash|vbs|vbe|js|mjs|cjs|jse|wsf|wsh|hta|html?|xhtml|svg|php\d*|phtml|phar|py|pl|rb|jar|apk|app|dmg|iso|lnk|url|docm|xlsm|pptm)(?:[.\s]|$)/i
const mediaExtension = /\.(jpe?g|png|webp|heic|heif|mp4|mov|webm)$/i
const attachmentExtension = /\.(pdf|docx?|xlsx?|pptx?|odt|ods|odp|rtf|txt|csv|json|zip|7z|rar|gz|tar|mp3|m4a|wav|ogg|flac|aac)$/i

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

export function validateSelectedFile(file: File, maxBytes: number, mediaOnly = false): string | null {
  if (unsafeExtension.test(file.name) || ['text/html', 'image/svg+xml', 'application/javascript', 'text/javascript'].includes(file.type)) return 'unsupported_type'
  const media = file.type.startsWith('image/') || file.type.startsWith('video/') || (file.type === '' && mediaExtension.test(file.name))
  if (!media && (mediaOnly || !attachmentExtension.test(file.name))) return 'unsupported_type'
  if (file.size > maxBytes) return 'too_large'
  return null
}

export function validateSelectedFiles(files: File[], maxBytes: number, mediaOnly = false): string | null {
  let totalBytes = 0
  for (const file of files) {
    const error = validateSelectedFile(file, maxBytes, mediaOnly)
    if (error) return error
    totalBytes += file.size
  }
  if (totalBytes > maxBytes) return 'too_large'
  return null
}
