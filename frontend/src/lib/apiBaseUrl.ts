export function resolveApiBaseUrl(value: string | undefined, production: boolean): string {
  const configured = value?.trim()
  if (!configured) {
    if (production) throw new Error('Set VITE_API_BASE_URL to the public HTTPS Railway backend URL.')
    return 'http://localhost:8000'
  }
  // A same-origin development proxy is useful when several apps run locally.
  if (configured === '/' && !production) return ''

  const url = new URL(configured)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('VITE_API_BASE_URL must be an HTTP(S) URL without credentials, query parameters or fragments.')
  }
  const localHost = url.hostname === 'localhost' || url.hostname.endsWith('.localhost')
    || url.hostname === '[::1]' || url.hostname === '0.0.0.0' || /^127\./.test(url.hostname)
  if (production && (url.protocol !== 'https:' || localHost)) {
    throw new Error('Production VITE_API_BASE_URL must use a public HTTPS backend, not localhost.')
  }
  return url.href.replace(/\/+$/, '')
}
