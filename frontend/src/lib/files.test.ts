import { describe, expect, it } from 'vitest'
import { formatBytes, previewKind, validateSelectedFile } from './files'

describe('file selection and preview helpers', () => {
  it('accepts supported images and videos', () => {
    expect(validateSelectedFile(new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }), 100)).toBeNull()
    expect(validateSelectedFile(new File(['video'], 'clip.mp4', { type: 'video/mp4' }), 100)).toBeNull()
  })

  it('accepts HEIC by extension when Safari provides no MIME type', () => {
    expect(validateSelectedFile(new File(['heic'], 'photo.HEIC', { type: '' }), 100)).toBeNull()
  })

  it('rejects unsupported and oversized files before the API', () => {
    expect(validateSelectedFile(new File(['x'], 'page.html', { type: 'text/html' }), 100)).toBe('unsupported_type')
    expect(validateSelectedFile(new File(['1234'], 'photo.jpg', { type: 'image/jpeg' }), 3)).toBe('too_large')
  })

  it('selects image and video preview modes without reading file bytes', () => {
    expect(previewKind('image/webp')).toBe('image')
    expect(previewKind('video/quicktime')).toBe('video')
    expect(previewKind('application/pdf')).toBe('unknown')
  })

  it('formats human-readable progress bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB')
  })
})

