import { describe, expect, it } from 'vitest'
import { resolveApiBaseUrl } from './apiBaseUrl'

describe('API deployment configuration', () => {
  it('uses a local server or a same-origin proxy only during development', () => {
    expect(resolveApiBaseUrl(undefined, false)).toBe('http://localhost:8000')
    expect(resolveApiBaseUrl('/', false)).toBe('')
    expect(resolveApiBaseUrl('http://127.0.0.1:8011/', false)).toBe('http://127.0.0.1:8011')
  })

  it('normalizes a configured public Railway address', () => {
    expect(resolveApiBaseUrl(' https://scansend-api-production.up.railway.app/ ', true))
      .toBe('https://scansend-api-production.up.railway.app')
    expect(resolveApiBaseUrl('https://another-backend.up.railway.app/', true))
      .toBe('https://another-backend.up.railway.app')
  })

  it.each([undefined, '', '/', 'http://files.example', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://app.localhost'])('refuses unsafe production configuration: %s', (value) => {
    expect(() => resolveApiBaseUrl(value, true)).toThrow()
  })

  it.each(['ftp://files.example', 'https://user:secret@files.example', 'https://files.example?secret=value', 'https://files.example#fragment'])('refuses malformed or credential-bearing configuration: %s', (value) => {
    expect(() => resolveApiBaseUrl(value, false)).toThrow()
  })
})
