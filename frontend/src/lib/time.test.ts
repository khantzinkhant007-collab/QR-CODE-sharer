import { describe, expect, it } from 'vitest'
import { effectiveUploadStatus } from './history'
import { expirationCountdown } from './time'
import type { UploadRecord } from '../types'

const record: UploadRecord = {
  id: '01TEST', originalName: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 10,
  downloadUrl: 'https://files.test/d/token', expiresAt: '2026-01-01T00:00:00Z',
  maxDownloads: null, downloadCount: 0, managementToken: 'secret', createdAt: '2025-12-31T00:00:00Z', localStatus: 'active',
}

describe('expiration state', () => {
  it('produces a live countdown label', () => {
    expect(expirationCountdown('2026-01-02T01:02:03Z', Date.parse('2026-01-01T00:00:00Z'))).toEqual({ expired: false, label: '1d 1h' })
    expect(expirationCountdown('2026-01-01T00:01:02Z', Date.parse('2026-01-01T00:00:00Z')).label).toBe('1m 2s')
  })

  it('marks elapsed records expired without changing explicit deleted status', () => {
    expect(effectiveUploadStatus(record, Date.parse('2026-01-02T00:00:00Z'))).toBe('expired')
    expect(effectiveUploadStatus({ ...record, localStatus: 'deleted' }, Date.parse('2026-01-02T00:00:00Z'))).toBe('deleted')
  })
})

