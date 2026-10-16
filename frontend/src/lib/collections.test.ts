import { afterEach, describe, expect, it } from 'vitest'
import { collectionDeadline, localDateTime } from './collections'
import { getCollection, historyDb, listCollections, saveCollection } from './history'
import { collectionEn, collectionJa } from '../collectionMessages'

afterEach(async () => historyDb.collections.clear())

describe('event collections', () => {
  it('converts the creator’s local deadline into a precise server timestamp', () => {
    const date = new Date(2030, 5, 20, 15, 30)
    expect(localDateTime(date)).toBe('2030-06-20T15:30')
    expect(collectionDeadline('2030-06-20T15:30', new Date(2030, 5, 19).getTime())).toBe(date.toISOString())
  })

  it('rejects invalid and expired deadlines', () => {
    expect(() => collectionDeadline('')).toThrow('collection.invalidDeadline')
    expect(() => collectionDeadline('2020-01-01T00:00')).toThrow('collection.invalidDeadline')
  })

  it('keeps creator access in IndexedDB, separate from shared links and upload history', async () => {
    const record = { id: 'event', token: 'public-token', title: 'Festival', shareUrl: 'https://app.test/events/public-token', managementToken: 'private-management-token', expiresAt: '2030-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' }
    await saveCollection(record)
    expect(await getCollection(record.token)).toEqual(record)
    expect(await listCollections()).toHaveLength(1)
    expect(record.shareUrl).not.toContain(record.managementToken)
    expect(await getCollection('other-event')).toBeUndefined()
  })

  it('provides both languages for every collection message', () => {
    expect(Object.keys(collectionEn).sort()).toEqual(Object.keys(collectionJa).sort())
  })
})
