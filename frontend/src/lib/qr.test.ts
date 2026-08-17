import QRCode from 'qrcode'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateQrDataUrl } from './qr'

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr') } }))

describe('QR generation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('encodes only the HTTPS download URL at high resolution with quiet zone and level M', async () => {
    const url = 'https://files.test/d/public-token'
    await expect(generateQrDataUrl(url)).resolves.toBe('data:image/png;base64,qr')
    expect(QRCode.toDataURL).toHaveBeenCalledWith(url, expect.objectContaining({ errorCorrectionLevel: 'M', margin: 4, width: 1024 }))
  })

  it('rejects insecure non-local download URLs', () => {
    expect(() => generateQrDataUrl('http://example.com/d/token')).toThrow(/HTTPS/)
  })
})
