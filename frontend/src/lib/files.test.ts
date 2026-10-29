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

  it.each(['handout.pdf', 'notes.txt', 'data.csv', 'report.docx', 'budget.xlsx', 'slides.pptx', 'files.zip', 'recording.mp3'])('accepts common attachments even without a browser MIME: %s', (name) => {
    expect(validateSelectedFile(new File(['attachment'], name), 100)).toBeNull()
  })

  it.each(['program.exe', 'invoice.php.jpg', 'shortcut.url', 'page.svg', 'macro.docm', 'script.js', 'script.ps1'])('rejects active files even with a misleading media MIME: %s', (name) => {
    expect(validateSelectedFile(new File(['x'], name, { type: 'image/jpeg' }), 100)).toBe('unsupported_type')
  })

  it('keeps collaborative event galleries media-only', () => {
    expect(validateSelectedFile(new File(['pdf'], 'handout.pdf', { type: 'application/pdf' }), 100, true)).toBe('unsupported_type')
    expect(validateSelectedFile(new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' }), 100, true)).toBeNull()
  })

  it('rejects unsupported and oversized files before the API', () => {
    expect(validateSelectedFile(new File(['x'], 'page.html', { type: 'text/html' }), 100)).toBe('unsupported_type')
    expect(validateSelectedFile(new File(['1234'], 'photo.jpg', { type: 'image/jpeg' }), 3)).toBe('too_large')
  })

  it('accepts the 2 GiB boundary and rejects the next byte', () => {
    const maxBytes = 2048 * 1024 * 1024
    const atLimit = new File(['x'], 'video.mp4', { type: 'video/mp4' })
    const overLimit = new File(['x'], 'video.mp4', { type: 'video/mp4' })
    Object.defineProperty(atLimit, 'size', { value: maxBytes })
    Object.defineProperty(overLimit, 'size', { value: maxBytes + 1 })

    expect(validateSelectedFile(atLimit, maxBytes)).toBeNull()
    expect(validateSelectedFile(overLimit, maxBytes)).toBe('too_large')
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
