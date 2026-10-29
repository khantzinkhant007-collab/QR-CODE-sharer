import QRCode from 'qrcode'

// Keep directly encoded content small enough to remain practical to scan on phones.
export const MAX_QR_BYTES = 1000

export function qrPayload(value: string, kind: 'text' | 'link'): string {
  if (!value.trim()) throw new Error('empty')
  let payload = value
  if (kind === 'link') {
    const input = value.trim()
    try {
      if (Array.from(input).some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)) throw new Error('invalid_link')
      const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`)
      if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('invalid_link')
      payload = url.href
    } catch {
      throw new Error('invalid_link')
    }
  }
  if (new TextEncoder().encode(payload).byteLength > MAX_QR_BYTES) throw new Error('too_long')
  return payload
}

export function generatePayloadQr(payload: string): Promise<string> {
  qrPayload(payload, 'text')
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M', margin: 4, width: 1024,
    color: { dark: '#102a43', light: '#ffffff' },
  })
}
