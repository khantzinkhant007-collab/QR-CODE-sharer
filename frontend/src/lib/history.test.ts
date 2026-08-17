import { afterEach, describe, expect, it } from 'vitest'
import { getUpload, historyDb, listUploads, removeLocalUpload, saveUpload, setUploadStatus } from './history'
import type { UploadRecord } from '../types'

const upload: UploadRecord = {
  id: '01HISTORY', originalName: '履歴.jpg', mimeType: 'image/jpeg', sizeBytes: 42,
  downloadUrl: 'https://files.test/d/token', expiresAt: '2030-01-01T00:00:00Z', maxDownloads: 1,
  downloadCount: 0, managementToken: 'management-secret', createdAt: '2026-01-01T00:00:00Z', localStatus: 'active',
}

afterEach(async () => historyDb.uploads.clear())

describe('IndexedDB upload history', () => {
  it('stores metadata and management access but no file contents', async () => {
    await saveUpload(upload)
    const stored = await getUpload(upload.id)
    expect(stored).toEqual(upload)
    expect(stored).not.toHaveProperty('file')
    expect(await listUploads()).toHaveLength(1)
  })

  it('updates remote status and removes only the local record', async () => {
    await saveUpload(upload)
    await setUploadStatus(upload.id, 'deleted', 1)
    expect(await getUpload(upload.id)).toMatchObject({ localStatus: 'deleted', downloadCount: 1 })
    await removeLocalUpload(upload.id)
    expect(await getUpload(upload.id)).toBeUndefined()
  })
})

