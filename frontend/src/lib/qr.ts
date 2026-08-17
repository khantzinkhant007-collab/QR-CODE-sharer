import QRCode from 'qrcode'

export function generateQrDataUrl(downloadUrl: string): Promise<string> {
  const parsed = new URL(downloadUrl)
  const localDevelopment = ['localhost', '127.0.0.1'].includes(parsed.hostname)
    || /^10\./.test(parsed.hostname)
    || /^192\.168\./.test(parsed.hostname)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(parsed.hostname)
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && localDevelopment)) {
    throw new Error('Download URLs must use HTTPS outside local development.')
  }

  return QRCode.toDataURL(parsed.toString(), {
    errorCorrectionLevel: 'M',
    margin: 4,
    width: 1024,
    color: { dark: '#102a43', light: '#ffffff' },
  })
}
