import Dexie, { type EntityTable } from 'dexie'
import type { UploadRecord, UploadStatus } from '../types'

class ScanSendDatabase extends Dexie {
  uploads!: EntityTable<UploadRecord, 'id'>

  constructor() {
    super('scansend')
    this.version(1).stores({ uploads: 'id, createdAt, expiresAt, localStatus' })
  }
}

export const historyDb = new ScanSendDatabase()

export async function saveUpload(record: UploadRecord): Promise<void> {
  await historyDb.uploads.put(record)
}

export async function getUpload(id: string): Promise<UploadRecord | undefined> {
  return historyDb.uploads.get(id)
}

export async function listUploads(): Promise<UploadRecord[]> {
  return historyDb.uploads.orderBy('createdAt').reverse().toArray()
}

export async function setUploadStatus(id: string, status: UploadStatus, downloadCount?: number): Promise<void> {
  const patch: Partial<UploadRecord> = { localStatus: status }
  if (downloadCount !== undefined) patch.downloadCount = downloadCount
  await historyDb.uploads.update(id, patch)
}

export async function removeLocalUpload(id: string): Promise<void> {
  await historyDb.uploads.delete(id)
}

export function effectiveUploadStatus(record: UploadRecord, now = Date.now()): UploadStatus {
  if (record.localStatus === 'active' && new Date(record.expiresAt).getTime() <= now) return 'expired'
  return record.localStatus
}

