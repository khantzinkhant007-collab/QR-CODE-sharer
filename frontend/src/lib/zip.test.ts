import { describe, expect, it } from 'vitest'
import { bundleFilesAsZip, crc32, sanitizeArchiveEntryName } from './zip'

describe('zip bundler', () => {
  it('computes standard CRC-32 checksums', () => {
    const bytes = new TextEncoder().encode('123456789')
    expect(crc32(bytes)).toBe(0xcbf43926)
  })

  it('deduplicates repeated filenames while preserving extensions', () => {
    const used = new Set<string>()
    expect(sanitizeArchiveEntryName('photo.jpg', used)).toBe('photo.jpg')
    expect(sanitizeArchiveEntryName('photo.jpg', used)).toBe('photo (2).jpg')
    expect(sanitizeArchiveEntryName('PHOTO.JPG', used)).toBe('PHOTO (3).JPG')
  })

  it('packages multiple files into a valid ZIP archive with UTF-8 entry names', async () => {
    const files = [
      new File(['hello world'], 'notes.txt', { type: 'text/plain' }),
      new File(['こんにちは'], '案内.txt', { type: 'text/plain' }),
    ]

    const archive = await bundleFilesAsZip(files)
    expect(archive.name).toBe('scansend-2-files.zip')
    expect(archive.type).toBe('application/zip')

    const bytes = new Uint8Array(await archive.arrayBuffer())
    const view = new DataView(bytes.buffer)
    expect(view.getUint32(0, true)).toBe(0x04034b50) // PK\x03\x04
    expect(view.getUint32(bytes.byteLength - 22, true)).toBe(0x06054b50) // PK\x05\x06
    expect(view.getUint16(bytes.byteLength - 14, true)).toBe(2) // 2 entries

    const decoded = new TextDecoder().decode(bytes)
    expect(decoded).toContain('notes.txt')
    expect(decoded).toContain('案内.txt')
    expect(decoded).toContain('hello world')
  })
})
