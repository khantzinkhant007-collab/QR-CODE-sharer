import QRCode from 'qrcode'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generatePayloadQr, MAX_QR_BYTES, qrPayload } from './payloadQr'

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr') } }))
beforeEach(() => vi.clearAllMocks())

describe('direct text and link QR payloads', () => {
  it('preserves Unicode, line breaks, and leading spaces in text', async () => {
    const text = '  こんにちは\nBring your notebook 📚'
    expect(qrPayload(text, 'text')).toBe(text)
    await generatePayloadQr(text)
    expect(QRCode.toDataURL).toHaveBeenCalledWith(text, expect.objectContaining({ margin: 4, width: 1024, errorCorrectionLevel: 'M' }))
  })

  it('normalizes a website link and supplies HTTPS if omitted', () => {
    expect(qrPayload(' example.com/events?q=hello ', 'link')).toBe('https://example.com/events?q=hello')
    expect(qrPayload('http://example.com', 'link')).toBe('http://example.com/')
  })

  it.each(['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', 'ftp://example.com', 'https://user:secret@example.com', 'https://example.com/hi there', 'https://', 'not a url'])('rejects unsafe or malformed links: %s', (value) => {
    expect(() => qrPayload(value, 'link')).toThrow('invalid_link')
  })

  it('rejects empty content and applies the limit in UTF-8 bytes, not characters', () => {
    expect(() => qrPayload(' \n ', 'text')).toThrow('empty')
    expect(qrPayload('a'.repeat(MAX_QR_BYTES), 'text')).toHaveLength(MAX_QR_BYTES)
    expect(() => qrPayload('a'.repeat(MAX_QR_BYTES + 1), 'text')).toThrow('too_long')
    expect(() => qrPayload('あ'.repeat(334), 'text')).toThrow('too_long')
    expect(() => generatePayloadQr('a'.repeat(MAX_QR_BYTES + 1))).toThrow('too_long')
    expect(QRCode.toDataURL).not.toHaveBeenCalled()
  })
})
