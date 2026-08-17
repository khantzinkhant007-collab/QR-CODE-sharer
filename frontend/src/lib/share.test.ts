import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText, dataUrlToFile } from './share'

afterEach(() => vi.restoreAllMocks())

describe('copy and share fallbacks', () => {
  it('uses the Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await copyText('https://files.test/d/token')
    expect(writeText).toHaveBeenCalledWith('https://files.test/d/token')
  })

  it('falls back to a temporary textarea for older browsers', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    const execCommand = vi.fn(() => true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })
    await copyText('https://files.test/d/fallback')
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('converts a QR data URL to a shareable PNG File', () => {
    const file = dataUrlToFile('data:image/png;base64,aGVsbG8=', 'qr.png')
    expect(file).toMatchObject({ name: 'qr.png', type: 'image/png', size: 5 })
  })
})
